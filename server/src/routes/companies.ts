import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection';
import type { CompanyListItem, CompanyListResponse, CompanyMaster, CompanyYearly } from '../lib/types';

const router = Router();

type CompanyQueryRow = CompanyMaster & CompanyYearly & {
  support_total: number | null;
  support_episode_count: number;
  valid_patent_count: number | null;
  revenue_growth: number | null;
  debt_ratio: number | null;
};

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
  else if (row.debt_ratio !== null && row.debt_ratio > 200) values.push(`부채비율 ${Math.round(row.debt_ratio)}%`);
  if (row.op_margin_pct !== null && row.op_margin_pct < 0) values.push('영업적자');
  if (row.revenue_growth !== null && row.revenue_growth < 0) values.push('매출 감소');
  return values;
}

function toListItem(row: CompanyQueryRow): CompanyListItem {
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
    support_total_million: Math.round((row.support_total ?? 0) / 1000),
    support_episode_count: row.support_episode_count ?? 0,
    valid_patent_count: row.valid_patent_count,
    certifications: certifications(row),
    risk_signals: risks(row),
    data_quality: missing === 0 ? 'high' : missing === 1 ? 'medium' : 'low',
    program_fit_score: null,
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

router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const query = req.query as Record<string, string | undefined>;
  const page = Math.max(0, Number.parseInt(query.page || '0', 10) || 0);
  const pageSize = Math.max(1, Math.min(200, Number.parseInt(query.limit || '50', 10) || 50));
  const asOfFy = Number.parseInt(query.as_of_fy || '', 10) || latestAvailableFy();
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

  const rows = db.prepare(`
    WITH latest AS (
      SELECT company_id, MAX(fiscal_year) AS fiscal_year
      FROM company_yearly
      WHERE fiscal_year <= ?
      GROUP BY company_id
    ),
    support AS (
      SELECT company_id, SUM(total_amount) AS support_total, COUNT(*) AS support_episode_count
      FROM support_episode
      WHERE as_of_fy IS NULL OR as_of_fy <= ?
      GROUP BY company_id
    )
    SELECT
      m.*,
      y.*,
      COALESCE(s.support_total, 0) AS support_total,
      COALESCE(s.support_episode_count, 0) AS support_episode_count,
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
  `).all(asOfFy, asOfFy, ...params, pageSize, page * pageSize) as CompanyQueryRow[];

  const response: CompanyListResponse = {
    items: rows.map(toListItem),
    page,
    page_size: pageSize,
    total,
    sort: sort.canonical,
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
      COALESCE((SELECT SUM(total_amount) FROM support_episode WHERE company_id = m.company_id AND (as_of_fy IS NULL OR as_of_fy <= ?)), 0) AS support_total,
      (SELECT COUNT(*) FROM support_episode WHERE company_id = m.company_id AND (as_of_fy IS NULL OR as_of_fy <= ?)) AS support_episode_count,
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
  `).get(companyId, asOfFy, asOfFy, asOfFy, companyId) as CompanyQueryRow | undefined;
  if (!row) return res.status(404).json({ error: 'Company not found' });
  return res.json(toListItem(row));
});

export default router;
