import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection';
import type { CompanyListItem, CompanyListResponse, CompanyMaster, CompanyYearly } from '../lib/types';

const router = Router();

type CompanyQueryRow = CompanyMaster & CompanyYearly & {
  support_total: number | null;
  support_episode_count: number;
  support_missing_amount_count: number;
  valid_patent_count: number | null;
  revenue_growth: number | null;
  debt_ratio: number | null;
};

type ProgramMatchSource = {
  title: string;
  field: string | null;
  target_stage_text: string | null;
  description: string | null;
  keywords_json: string;
};

type ProgramMatch = { score: number; reasons: string[] };

function yearsSince(foundedDate: string | null, asOfFy: number): number | null {
  if (!foundedDate) return null;
  const year = Number(foundedDate.slice(0, 4));
  return Number.isFinite(year) ? Math.max(0, asOfFy - year) : null;
}

function matchProgram(row: CompanyQueryRow, program: ProgramMatchSource, asOfFy: number): ProgramMatch {
  let score = 25;
  const reasons: string[] = [];
  const tenure = yearsSince(row.founded_date, asOfFy);
  const programText = [
    program.title,
    program.field,
    program.target_stage_text,
    program.description,
    ...JSON.parse(program.keywords_json || '[]') as string[],
  ].filter(Boolean).join(' ');
  const companyText = [row.ind_name, row.main_product, row.ksic11].filter(Boolean).join(' ');

  if (/부산/.test(programText)) {
    if (row.region === '부산') {
      score += 25;
      reasons.push('부산 소재 확인');
    } else {
      score -= 35;
      reasons.push(`소재지 ${row.region || '미확인'} · 부산 요건 재검토`);
    }
  }

  const tenureMatch = programText.match(/(?:창업\s*)?(\d+)년\s*이내/);
  if (tenureMatch && tenure !== null) {
    const maximum = Number(tenureMatch[1]);
    if (tenure <= maximum) {
      score += 25;
      reasons.push(`업력 ${tenure}년 · ${maximum}년 이내`);
    } else {
      score -= 35;
      reasons.push(`업력 ${tenure}년 · ${maximum}년 초과`);
    }
  }

  const sizeTerms = ['소상공인', '소기업', '중기업', '중견기업', '대기업'];
  const requestedSizes = sizeTerms.filter(term => programText.includes(term));
  if (requestedSizes.length > 0 && row.size) {
    if (requestedSizes.includes(row.size)) {
      score += 15;
      reasons.push(`${row.size} 대상 부합`);
    } else {
      score -= 20;
      reasons.push(`${row.size} · 대상 규모 재검토`);
    }
  }

  const tokens = [...new Set(programText
    .split(/[^가-힣A-Za-z0-9]+/)
    .map(token => token.trim())
    .filter(token => token.length >= 2 && !/^(지원|사업|기업|부산|모집|공고|대상|이내)$/.test(token)))];
  const matchedTokens = tokens.filter(token => companyText.includes(token)).slice(0, 3);
  if (matchedTokens.length > 0) {
    score += Math.min(15, matchedTokens.length * 5);
    reasons.push(`업종·제품 연관: ${matchedTokens.join('·')}`);
  }

  if (row.closed_flag === 1) {
    score = 0;
    reasons.unshift(`${row.biz_status || '휴·폐업'} 상태`);
  } else {
    score += 5;
    reasons.push('정상 영업 상태');
  }
  if (row.equity !== null && row.equity > 0) score += 3;
  if (row.op_margin_pct !== null && row.op_margin_pct > 0) score += 2;

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons: reasons.slice(0, 3) };
}

const SORT_SQL: Record<string, string> = {
  company_id: 'm.company_id',
  revenue: 'y.revenue',
  revenue_growth: 'revenue_growth',
  operating_margin: 'y.op_margin_pct',
  debt_ratio: 'debt_ratio',
  employees: 'COALESCE(y.pension_enrolled, y.employees)',
  support_total: 'support_total',
  patents: 't.valid_patent_count',
};

function certifications(master: CompanyMaster): string[] {
  return [
    master.inno_biz ? '이노비즈' : null,
    master.venture ? '벤처기업' : null,
    master.main_biz ? '메인비즈' : null,
    master.material_parts ? '소재부품' : null,
    master.has_corporate_lab ? '기업부설연구소' : null,
  ].filter((value): value is string => Boolean(value));
}

function risks(row: CompanyQueryRow): string[] {
  const values: string[] = [];
  if (row.closed_flag === 1) values.push(`${row.biz_status || '운영상태'} 확인 필요`);
  if (row.equity !== null && row.equity <= 0) values.push('자본총계 0 이하');
  else if (row.equity !== null && row.equity > 0 && row.equity / 1000 < 50) {
    values.push(`자본 소진 임박(${Math.round(row.equity / 100) / 10}백만원)`);
  } else if (row.debt_ratio !== null && row.debt_ratio >= 1000) {
    values.push('자본 여력 확인 필요');
  } else if (row.debt_ratio !== null && row.debt_ratio > 200) {
    values.push(`부채비율 ${Math.round(row.debt_ratio)}%`);
  }
  if (row.op_margin_pct !== null && row.op_margin_pct < 0) values.push('영업적자');
  if (row.revenue_growth !== null && row.revenue_growth <= -30) values.push('매출 급감');
  else if (row.revenue_growth !== null && row.revenue_growth < 0) values.push('매출 감소');
  if (row.support_episode_count >= 5) values.push(`지원대상 ${row.support_episode_count}건`);
  else if (row.support_episode_count >= 3) values.push(`지원대상 ${row.support_episode_count}건`);
  if (row.support_missing_amount_count > 0) values.push(`지원금 미상 ${row.support_missing_amount_count}건`);
  return values;
}

/** 지원대상(선정)만 집계. 탈락·포기는 목록 지원 신호에 섞지 않음. */
const AWARDED_RESULT_SQL = `(result = '지원대상' OR result LIKE '%지원대상%' OR result = '선정')`;

function toListItem(row: CompanyQueryRow, programMatch: ProgramMatch | null = null): CompanyListItem {
  const employeeCount = row.pension_enrolled ?? row.employees ?? null;
  const missing = [row.revenue, row.equity, employeeCount].filter(value => value === null).length;
  return {
    id: String(row.company_id),
    alias_label: `기업_${row.company_id}`,
    industry: row.ind_name || '업종 미상',
    ksic11: row.ksic11,
    size: row.size,
    location: row.region || '지역 미상',
    founded_year: row.founded_date ? Number(row.founded_date.slice(0, 4)) : null,
    employee_count: employeeCount,
    employee_year: row.fiscal_year ?? null,
    latest_revenue_million: row.revenue === null ? null : row.revenue / 1000,
    latest_revenue_year: row.fiscal_year ?? null,
    revenue_growth_pct: row.revenue_growth,
    operating_margin_pct: row.op_margin_pct,
    debt_ratio_pct: row.debt_ratio,
    support_total_million: Math.round(((row.support_total ?? 0) / 1000) * 10) / 10,
    support_episode_count: row.support_episode_count ?? 0,
    support_missing_amount_count: row.support_missing_amount_count ?? 0,
    valid_patent_count: row.valid_patent_count,
    certifications: certifications(row),
    risk_signals: risks(row),
    data_quality: missing === 0 ? 'high' : missing === 1 ? 'medium' : 'low',
    program_fit_score: programMatch?.score ?? null,
    program_fit_reasons: programMatch?.reasons ?? [],
  };
}

function parseSort(value: string | undefined): { key: string; direction: 'ASC' | 'DESC'; canonical: string } {
  const [requestedKey = 'company_id', requestedDirection = 'asc'] = (value || '').split(':');
  const key = SORT_SQL[requestedKey] ? requestedKey : 'company_id';
  const direction = requestedDirection.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  return { key, direction, canonical: `${key}:${direction.toLowerCase()}` };
}

function latestAvailableFy(): number {
  const row = getDb().prepare('SELECT MAX(fiscal_year) AS fy FROM company_yearly').get() as { fy: number | null };
  return row.fy ?? new Date().getUTCFullYear() - 1;
}

router.get('/facets', (_req: Request, res: Response) => {
  const db = getDb();
  const grouped = (column: 'size' | 'region' | 'biz_status') => db.prepare(`
    SELECT ${column} AS value, COUNT(*) AS count
    FROM company_master
    WHERE ${column} IS NOT NULL AND TRIM(${column}) <> ''
    GROUP BY ${column}
    ORDER BY count DESC, value ASC
  `).all() as Array<{ value: string; count: number }>;
  const ksicSections = db.prepare(`
    SELECT SUBSTR(ksic11, 1, 1) AS value, COUNT(*) AS count
    FROM company_master
    WHERE ksic11 IS NOT NULL AND TRIM(ksic11) <> ''
    GROUP BY SUBSTR(ksic11, 1, 1)
    ORDER BY value ASC
  `).all() as Array<{ value: string; count: number }>;
  return res.json({
    sizes: grouped('size'),
    regions: grouped('region'),
    biz_statuses: grouped('biz_status'),
    ksic_sections: ksicSections,
  });
});

router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const query = req.query as Record<string, string | undefined>;
  const page = Math.max(0, Number.parseInt(query.page || '0', 10) || 0);
  const pageSize = Math.max(1, Math.min(200, Number.parseInt(query.limit || '50', 10) || 50));
  const asOfFy = Number.parseInt(query.as_of_fy || '', 10) || latestAvailableFy();
  const program = query.program_id
    ? db.prepare(`
        SELECT title, field, target_stage_text, description, keywords_json
        FROM program_master WHERE program_id = ?
      `).get(query.program_id) as ProgramMatchSource | undefined
    : undefined;
  const sort = parseSort(query.sort);
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (query.size) { conditions.push('m.size = ?'); params.push(query.size); }
  if (query.region) { conditions.push('m.region = ?'); params.push(query.region); }
  if (query.ksic) { conditions.push('m.ksic11 LIKE ?'); params.push(`${query.ksic.toUpperCase()}%`); }
  if (query.biz_status) { conditions.push('m.biz_status = ?'); params.push(query.biz_status); }
  if (query.search) {
    conditions.push('(CAST(m.company_id AS TEXT) LIKE ? OR m.ksic11 LIKE ? OR m.ind_name LIKE ? OR m.main_product LIKE ?)');
    const search = `%${query.search}%`;
    params.push(search, search, search, search);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM company_master m ${where}`).get(...params) as { n: number }).n;

  const programFitSort = Boolean(program) && String(query.sort || '').startsWith('program_fit:');
  const fetchAllForProgram = Boolean(program);
  const rows = db.prepare(`
    WITH latest AS (
      SELECT company_id, MAX(fiscal_year) AS fiscal_year
      FROM company_yearly
      WHERE fiscal_year <= ?
      GROUP BY company_id
    ),
    support AS (
      SELECT
        company_id,
        SUM(total_amount) AS support_total,
        COUNT(*) AS support_episode_count,
        SUM(CASE WHEN total_amount IS NULL THEN 1 ELSE 0 END) AS support_missing_amount_count
      FROM support_episode
      WHERE ${AWARDED_RESULT_SQL}
        AND (
          (selected_date IS NOT NULL AND CAST(substr(selected_date, 1, 4) AS INTEGER) <= ?)
          OR (selected_date IS NULL AND source_year <= ?)
        )
      GROUP BY company_id
    )
    SELECT
      m.*,
      y.*,
      COALESCE(s.support_total, 0) AS support_total,
      COALESCE(s.support_episode_count, 0) AS support_episode_count,
      COALESCE(s.support_missing_amount_count, 0) AS support_missing_amount_count,
      t.valid_patent_count,
      rg.value AS revenue_growth,
      dr.value AS debt_ratio
    FROM company_master m
    LEFT JOIN latest l ON l.company_id = m.company_id
    LEFT JOIN company_yearly y ON y.company_id = l.company_id AND y.fiscal_year = l.fiscal_year
    LEFT JOIN support s ON s.company_id = m.company_id
    LEFT JOIN company_technology t ON t.company_id = m.company_id
    LEFT JOIN company_metric rg
      ON rg.company_id = m.company_id AND rg.as_of_fy = l.fiscal_year AND rg.metric_code = 'revenue_growth'
    LEFT JOIN company_metric dr
      ON dr.company_id = m.company_id AND dr.as_of_fy = l.fiscal_year AND dr.metric_code = 'debt_ratio'
    ${where}
    ORDER BY ${SORT_SQL[sort.key]} ${sort.direction} NULLS LAST, m.company_id ASC
    LIMIT ? OFFSET ?
  `).all(
    asOfFy,
    asOfFy,
    asOfFy,
    ...params,
    fetchAllForProgram ? Math.max(total, 1) : pageSize,
    fetchAllForProgram ? 0 : page * pageSize,
  ) as CompanyQueryRow[];

  const mapped = rows.map(row => toListItem(
    row,
    program ? matchProgram(row, program, asOfFy) : null,
  ));
  const items = programFitSort
    ? mapped
        .sort((left, right) =>
          (right.program_fit_score ?? -1) - (left.program_fit_score ?? -1)
          || Number(left.id) - Number(right.id))
        .slice(page * pageSize, (page + 1) * pageSize)
    : fetchAllForProgram
      ? mapped.slice(page * pageSize, (page + 1) * pageSize)
      : mapped;

  const response: CompanyListResponse = {
    items,
    page,
    page_size: pageSize,
    total,
    sort: programFitSort ? 'program_fit:desc' : sort.canonical,
  };
  return res.json(response);
});

router.get('/:id', (req: Request, res: Response) => {
  const companyId = Number.parseInt(String(req.params.id), 10);
  if (!Number.isFinite(companyId)) return res.status(400).json({ error: 'id must be a number' });
  const asOfFy = Number.parseInt(String(req.query.as_of_fy || ''), 10) || latestAvailableFy();
  const row = getDb().prepare(`
    WITH latest AS (
      SELECT company_id, MAX(fiscal_year) AS fiscal_year
      FROM company_yearly
      WHERE company_id = ? AND fiscal_year <= ?
    )
    SELECT
      m.*,
      y.*,
      COALESCE((
        SELECT SUM(total_amount)
        FROM support_episode
        WHERE company_id = m.company_id
          AND ${AWARDED_RESULT_SQL}
          AND (
            (selected_date IS NOT NULL AND CAST(substr(selected_date, 1, 4) AS INTEGER) <= ?)
            OR (selected_date IS NULL AND source_year <= ?)
          )
      ), 0) AS support_total,
      (
        SELECT COUNT(*)
        FROM support_episode
        WHERE company_id = m.company_id
          AND ${AWARDED_RESULT_SQL}
          AND (
            (selected_date IS NOT NULL AND CAST(substr(selected_date, 1, 4) AS INTEGER) <= ?)
            OR (selected_date IS NULL AND source_year <= ?)
          )
      ) AS support_episode_count,
      (
        SELECT COUNT(*)
        FROM support_episode
        WHERE company_id = m.company_id
          AND ${AWARDED_RESULT_SQL}
          AND total_amount IS NULL
          AND (
            (selected_date IS NOT NULL AND CAST(substr(selected_date, 1, 4) AS INTEGER) <= ?)
            OR (selected_date IS NULL AND source_year <= ?)
          )
      ) AS support_missing_amount_count,
      t.valid_patent_count,
      rg.value AS revenue_growth,
      dr.value AS debt_ratio
    FROM company_master m
    LEFT JOIN latest l ON l.company_id = m.company_id
    LEFT JOIN company_yearly y ON y.company_id = l.company_id AND y.fiscal_year = l.fiscal_year
    LEFT JOIN company_technology t ON t.company_id = m.company_id
    LEFT JOIN company_metric rg
      ON rg.company_id = m.company_id AND rg.as_of_fy = l.fiscal_year AND rg.metric_code = 'revenue_growth'
    LEFT JOIN company_metric dr
      ON dr.company_id = m.company_id AND dr.as_of_fy = l.fiscal_year AND dr.metric_code = 'debt_ratio'
    WHERE m.company_id = ?
  `).get(
    companyId,
    asOfFy,
    asOfFy,
    asOfFy,
    asOfFy,
    asOfFy,
    asOfFy,
    asOfFy,
    companyId,
  ) as CompanyQueryRow | undefined;
  if (!row) return res.status(404).json({ error: 'Company not found' });
  return res.json(toListItem(row));
});

export default router;
