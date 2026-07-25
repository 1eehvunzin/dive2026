import type {
  CompanyMaster,
  CompanyMetric,
  CompanyPercentile,
  CompanyReportResponse,
  CompanyYearly,
  Evidence,
  ExternalBenchmark,
  FinancialPoint,
  NtisSummary,
  ProgramRequirement,
  RegionalContext,
  SupportEpisode,
  TechnologyInfo,
} from './types';
import { getDb } from '../db/connection';
import {
  buildOfficerBrief,
  buildObservedChangesAfterSupport,
  buildReferenceIndicators,
  buildSixBoxChecks,
  buildSupportSummary,
  buildSurvivalIndicators,
  generateFollowUpQuestions,
} from './risk';
import { findSimilarCompanies } from './matching';

export class RoundNotFoundError extends Error {}

type RoundContext = {
  round_id: string;
  program_id: string | null;
  as_of_date: string | null;
  as_of_fy: number;
};

type RequirementRow = {
  requirement_id: string;
  requirement_type: ProgramRequirement['type'];
  label: string;
  rule_json: string | null;
  weight: number | null;
  source_page: number | null;
  source_text: string | null;
  review_status: ProgramRequirement['reviewStatus'];
};

const METRIC_LABELS: Record<string, string> = {
  revenue_growth: '매출액증가율',
  asset_growth: '총자산증가율',
  operating_margin: '매출액영업이익률',
  debt_ratio: '부채비율',
  equity_ratio: '자기자본비율',
  gross_margin: '매출총이익률',
};

export function fiscalYearAvailableAt(dateInput: Date): number {
  const year = dateInput.getUTCFullYear();
  const month = dateInput.getUTCMonth() + 1;
  return month <= 4 ? year - 2 : year - 1;
}

export function resolveAsOfFy(
  yearlies: CompanyYearly[],
  requestedFy?: number | null,
  asOfDate?: Date,
): number {
  if (requestedFy !== null && requestedFy !== undefined) return requestedFy;
  const availableFy = fiscalYearAvailableAt(asOfDate ?? new Date());
  const years = yearlies.map(yearly => yearly.fiscal_year).filter(year => year <= availableFy);
  return years.length > 0 ? Math.max(...years) : availableFy;
}

function aliasName(companyId: number): string {
  return `기업_${companyId}`;
}

function certifications(master: CompanyMaster): string[] {
  const values: Array<[number, string]> = [
    [master.inno_biz, '이노비즈'],
    [master.main_biz, '메인비즈'],
    [master.venture, '벤처기업'],
    [master.material_parts, '소재부품'],
    [master.net_cert, 'NET'],
    [master.nep_cert, 'NEP'],
  ];
  return values.filter(([value]) => value === 1).map(([, label]) => label);
}

function tenureYears(foundedDate: string | null, asOfYear: number): number | null {
  if (!foundedDate) return null;
  const parsed = new Date(foundedDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.max(0, asOfYear - parsed.getUTCFullYear());
}

function toFinancialSeries(yearlies: CompanyYearly[]): FinancialPoint[] {
  return [...yearlies]
    .sort((left, right) => left.fiscal_year - right.fiscal_year)
    .map(yearly => ({
      year: yearly.fiscal_year,
      revenue: yearly.revenue === null ? null : yearly.revenue / 1000,
      op_profit: yearly.op_profit === null ? null : yearly.op_profit / 1000,
      net_income: yearly.net_income === null ? null : yearly.net_income / 1000,
      assets: yearly.assets === null ? null : yearly.assets / 1000,
      liabilities: yearly.liabilities === null ? null : yearly.liabilities / 1000,
      equity: yearly.equity === null ? null : yearly.equity / 1000,
      op_margin_pct: yearly.op_margin_pct,
    }));
}

function buildWarnings(
  master: CompanyMaster,
  yearlies: CompanyYearly[],
  cutoffFy: number,
  financialFy: number | null,
  historicalContext: boolean,
): string[] {
  const warnings: string[] = [];
  if (financialFy === null) warnings.push('기준시점 이전 재무 데이터 없음');
  else if (financialFy < cutoffFy) warnings.push(`재무지표 기준: 결산 확정된 ${financialFy}년`);
  if (!master.founded_date) warnings.push('설립일자 미확인 — 업력 계산 불가');
  if (
    master.main_product
    && ['-', '없음', '미상', '홈페이지'].includes(master.main_product.trim())
  ) {
    // 제품·서비스로 해석하기 어려운 원천값은 화면 필드 자체를 만들지 않는다.
  }
  if (master.closed_flag === 1) warnings.push(`${master.biz_status || '비정상'} 상태 — 지원 대상 적정성 확인 필요`);
  const latest = [...yearlies].sort((left, right) => right.fiscal_year - left.fiscal_year)[0];
  if (latest?.liabilities !== null && latest?.liabilities !== undefined && latest.liabilities < 0) {
    warnings.push(
      `${latest.fiscal_year}년 부채총계가 음수로 적재되어 부채비율을 재무 안정 신호로 사용하기 전 원천 부호를 확인해야 함`,
    );
  }
  if (historicalContext) {
    warnings.push(`회차 기준시점 이후 재무·지원 이력은 제외됨`);
    warnings.push('인증·연구소 보유 여부는 관측일 기준 최신값이므로 과거 회차 해석 시 확인 필요');
  }
  return warnings;
}

function companySizeForBok(size: string | null): string {
  if (size === '대기업') return '대기업';
  if (size === '중기업' || size === '소기업' || size === '소상공인' || size === '중견기업') return '중소기업';
  return '전체';
}

function findExternalBenchmark(
  master: CompanyMaster,
  metricCode: string,
  companyValue: number | null,
  asOfFy: number,
): ExternalBenchmark | null {
  if (companyValue === null) return null;
  const db = getDb();
  const ksicCandidates = [
    master.ksic11?.slice(0, 3).toUpperCase(),
    master.ksic11?.slice(0, 1).toUpperCase(),
    'ALL',
  ].filter((value): value is string => Boolean(value));
  const sizeCandidates = [companySizeForBok(master.size), '전체'];

  for (const ksicCode of ksicCandidates) {
    for (const companySize of sizeCandidates) {
      const row = db.prepare(`
        SELECT *
        FROM external_industry_benchmark
        WHERE metric_code = ?
          AND ksic_code = ?
          AND company_size = ?
          AND reference_year <= ?
        ORDER BY reference_year DESC
        LIMIT 1
      `).get(metricCode, ksicCode, companySize, asOfFy) as {
        dataset_id: string;
        reference_year: number;
        metric_code: string;
        metric_value: number;
        unit: string;
        ksic_code: string;
        company_size: string;
        source_locator: string | null;
      } | undefined;
      if (!row) continue;
      return {
        dataset_id: row.dataset_id,
        reference_year: row.reference_year,
        metric_code: row.metric_code,
        metric_label: METRIC_LABELS[row.metric_code] || row.metric_code,
        value: row.metric_value,
        unit: row.unit,
        gap: Math.round((companyValue - row.metric_value) * 100) / 100,
        ksic_code: row.ksic_code,
        company_size: row.company_size,
        source_locator: row.source_locator,
      };
    }
  }
  return null;
}

function buildRegionalContext(
  master: CompanyMaster,
  episodes: SupportEpisode[],
  asOfFy: number,
): RegionalContext {
  const latestSigungu = [...episodes]
    .sort((left, right) => (right.selected_date || '').localeCompare(left.selected_date || ''))
    .find(episode => episode.region_sigungu)?.region_sigungu ?? null;
  if (latestSigungu !== '사상구') {
    return {
      status: 'not_applicable',
      reason: latestSigungu
        ? `확인된 기초지자체가 ${latestSigungu}이므로 사상구 통계를 적용하지 않음`
        : '기업 마스터에 기초지자체가 없어 사상구 통계를 적용하지 않음',
      dataset_id: null,
      reference_year: null,
      region_name: latestSigungu,
      ksic_code: null,
      establishment_count: null,
      employee_count: null,
      employees_per_establishment: null,
    };
  }

  const ksicCode = master.ksic11?.slice(0, 3).toUpperCase() ?? null;
  if (!ksicCode) {
    return {
      status: 'not_available',
      reason: 'KSIC 코드 없음',
      dataset_id: null,
      reference_year: null,
      region_name: '사상구',
      ksic_code: null,
      establishment_count: null,
      employee_count: null,
      employees_per_establishment: null,
    };
  }

  const row = getDb().prepare(`
    SELECT *
    FROM regional_industry_context
    WHERE region_name = '사상구'
      AND ksic_code = ?
      AND reference_year <= ?
      AND employee_band IS NULL
    ORDER BY
      CASE WHEN source_file LIKE '02_%' THEN 0 ELSE 1 END,
      reference_year DESC
    LIMIT 1
  `).get(ksicCode, asOfFy) as {
    dataset_id: string;
    reference_year: number;
    region_name: string;
    ksic_code: string;
    establishment_count: number | null;
    employee_count: number | null;
  } | undefined;

  if (!row) {
    return {
      status: 'not_available',
      reason: `사상구 ${ksicCode} 업종 통계 없음`,
      dataset_id: null,
      reference_year: null,
      region_name: '사상구',
      ksic_code: ksicCode,
      establishment_count: null,
      employee_count: null,
      employees_per_establishment: null,
    };
  }

  return {
    status: 'ok',
    reason: null,
    dataset_id: row.dataset_id,
    reference_year: row.reference_year,
    region_name: row.region_name,
    ksic_code: row.ksic_code,
    establishment_count: row.establishment_count,
    employee_count: row.employee_count,
    employees_per_establishment: row.establishment_count && row.employee_count
      ? Math.round(row.employee_count / row.establishment_count * 10) / 10
      : null,
  };
}

function buildNtisSummary(companyId: number, asOfFy: number): NtisSummary {
  const row = getDb().prepare(`
    SELECT
      COUNT(*) AS project_count,
      SUM(CASE WHEN role = 'lead' THEN 1 ELSE 0 END) AS lead_count,
      COALESCE(SUM(gov_funding), 0) AS government_funding_won,
      MAX(base_year) AS latest_year
    FROM ntis_project
    WHERE company_id = ?
      AND base_year IS NOT NULL
      AND base_year <= ?
  `).get(companyId, asOfFy) as NtisSummary;
  return {
    project_count: row.project_count,
    lead_count: row.lead_count,
    government_funding_won: row.government_funding_won,
    latest_year: row.latest_year,
  };
}

const EVIDENCE_FIELD: Record<string, { sheet: string; field: string; formula: string | null }> = {
  revenue_level: { sheet: '1. 기업정보', field: '매출액', formula: '천원 → 백만원 환산' },
  tenure_years: { sheet: '1. 기업정보', field: '설립일자', formula: '기준연도 − 설립연도' },
  employment_level: { sheet: '1. 기업정보', field: '국민연금 가입자수', formula: null },
  revenue_growth: { sheet: '1. 기업정보', field: '매출액', formula: '(당해 − 전년) / 전년 × 100' },
  debt_ratio: { sheet: '1. 기업정보', field: '부채총계 / 자본총계', formula: '부채총계 ÷ 자본총계 × 100' },
  operating_margin: { sheet: '1. 기업정보', field: '영업이익 / 매출액', formula: '영업이익 ÷ 매출액 × 100' },
  rd_intensity: { sheet: '1. 기업정보', field: '연구개발비 / 매출액', formula: '연구개발비 ÷ 매출액 × 100' },
};

function makeEvidence(
  companyId: number,
  financialFy: number | null,
  indicators: CompanyReportResponse['survival_indicators'],
): Evidence[] {
  return indicators.map(item => {
    const meta = EVIDENCE_FIELD[item.code];
    return {
      evidence_id: item.evidence_ids[0],
      source_file: 'KODATA 기업데이터',
      source_sheet_page: meta?.sheet ?? '1. 기업정보',
      source_row_cell: meta
        ? `${meta.field} · company_id=${companyId}`
        : `company_id=${companyId}`,
      reference_year: item.as_of_year ?? financialFy,
      raw_value: item.value,
      normalized_value: item.value === null
        ? null
        : `${item.value}${item.unit ? ` ${item.unit}` : ''}`,
      formula: meta?.formula ?? (item.formula_version === 'raw-v1' ? null : item.code),
      formula_version: item.formula_version,
      external_dataset_id: item.external_benchmark?.dataset_id ?? null,
    };
  });
}

function evaluateRule(
  requirement: RequirementRow,
  master: CompanyMaster,
  tenure: number | null,
): { matched: boolean | null; reason: string } {
  if (!requirement.rule_json) return { matched: null, reason: '공고 원문 확인 항목' };
  let rule: { field?: string; operator?: string; value?: unknown };
  try {
    rule = JSON.parse(requirement.rule_json) as typeof rule;
  } catch {
    return { matched: null, reason: '규칙 JSON 오류' };
  }
  const fieldAliases: Record<string, string> = {
    창업기간: 'tenure_years',
    업력: 'tenure_years',
    소재지: 'region',
    지역: 'region',
    location: 'region',
    기업규모: 'size',
    업종코드: 'ksic11',
  };
  const normalizedField = rule.field ? (fieldAliases[rule.field] || rule.field) : undefined;
  const values: Record<string, unknown> = {
    region: master.region,
    location: master.region,
    size: master.size,
    ksic11: master.ksic11,
    corp_type: master.corp_type,
    biz_status: master.biz_status,
    tenure_years: tenure,
  };
  const actual = normalizedField ? values[normalizedField] : undefined;
  if (actual === undefined || actual === null) return { matched: null, reason: '신청서·증빙 확인 항목' };
  const expected = rule.value;
  const numericExpected = typeof expected === 'number'
    ? expected
    : typeof expected === 'string' && expected.match(/-?\d+(?:\.\d+)?/)
      ? Number(expected.match(/-?\d+(?:\.\d+)?/)![0])
      : null;
  let matched: boolean | null = null;
  if (rule.operator === 'eq') matched = actual === expected;
  else if (rule.operator === 'in') {
    const expectedValues = Array.isArray(expected)
      ? expected
      : typeof expected === 'string'
        ? expected.split(/[,|]/).map(value => value.trim()).filter(Boolean)
        : [];
    const normalizeRegion = (value: unknown) => String(value)
      .replace(/광역시|특별시|특별자치시|특별자치도|도$/g, '')
      .trim();
    matched = expectedValues.some(value =>
      value === actual || normalizeRegion(value) === normalizeRegion(actual));
  }
  else if (rule.operator === 'starts_with' && typeof actual === 'string' && typeof expected === 'string') {
    matched = actual.startsWith(expected);
  } else if (rule.operator === 'gte' && typeof actual === 'number' && numericExpected !== null) {
    matched = actual >= numericExpected;
  } else if (rule.operator === 'lte' && typeof actual === 'number' && numericExpected !== null) {
    matched = actual <= numericExpected;
  }
  return matched === null
    ? { matched: null, reason: `지원하지 않는 연산자 ${rule.operator || '없음'}` }
    : {
        matched,
        reason: matched
          ? `기업 데이터 ${String(actual)} · 공고 기준 충족`
          : `기업 데이터 ${String(actual)} · 공고 기준 ${String(expected)} 재검토`,
      };
}

function buildProgramContext(
  round: RoundContext | null,
  master: CompanyMaster,
  tenure: number | null,
): CompanyReportResponse['program_context'] {
  if (!round?.program_id) return null;
  const rows = getDb().prepare(`
    SELECT *
    FROM program_requirement
    WHERE program_id = ?
      AND review_status IN ('reviewed', 'active')
    ORDER BY requirement_type, requirement_id
  `).all(round.program_id) as RequirementRow[];

  const results = rows.map(requirement => {
    const evaluation = evaluateRule(requirement, master, tenure);
    const triggeredExclusion = requirement.requirement_type === 'exclusion' && evaluation.matched === true;
    const status = evaluation.matched === null
      ? 'unknown'
      : triggeredExclusion
        ? 'not_met'
        : evaluation.matched
          ? 'met'
          : requirement.requirement_type === 'exclusion'
            ? 'met'
            : 'not_met';
    return {
      requirement_id: requirement.requirement_id,
      label: requirement.label,
      status: status as 'met' | 'not_met' | 'unknown',
      weight: requirement.weight,
      reason: evaluation.reason,
      evidence_ids: [] as string[],
    };
  });

  const gateResults = rows
    .map((row, index) => ({ row, result: results[index] }))
    .filter(({ row }) => row.requirement_type === 'eligibility' || row.requirement_type === 'exclusion');
  const gateStatus = gateResults.some(({ result }) => result.status === 'not_met')
    ? 'ineligible'
    : gateResults.some(({ result }) => result.status === 'unknown')
      ? 'needs_review'
      : 'eligible';

  const scoreRows = rows
    .map((row, index) => ({ row, result: results[index] }))
    .filter(({ row, result }) => row.requirement_type === 'evaluation' && row.weight !== null && result.status !== 'unknown');
  const totalWeight = scoreRows.reduce((sum, item) => sum + (item.row.weight ?? 0), 0);
  const metWeight = scoreRows
    .filter(item => item.result.status === 'met')
    .reduce((sum, item) => sum + (item.row.weight ?? 0), 0);

  return {
    program_id: round.program_id,
    gate_status: gateStatus,
    requirement_results: results,
    program_fit_score: totalWeight > 0 ? Math.round(metWeight / totalWeight * 1000) / 10 : null,
  };
}

export function buildReport(
  companyId: number,
  roundId: string | null = null,
  requestedAsOfDate: string | null = null,
): CompanyReportResponse | null {
  const db = getDb();
  const master = db.prepare('SELECT * FROM company_master WHERE company_id = ?')
    .get(companyId) as CompanyMaster | undefined;
  if (!master) return null;

  const allYearlies = db.prepare(
    'SELECT * FROM company_yearly WHERE company_id = ? ORDER BY fiscal_year'
  ).all(companyId) as CompanyYearly[];

  let round: RoundContext | null = null;
  if (roundId) {
    round = db.prepare('SELECT * FROM round_master WHERE round_id = ?')
      .get(roundId) as RoundContext | undefined ?? null;
    if (!round) throw new RoundNotFoundError(`Round ${roundId} not found`);
  }

  const requestedDate = round?.as_of_date || requestedAsOfDate;
  const parsedDate = requestedDate ? new Date(requestedDate) : new Date();
  if (Number.isNaN(parsedDate.getTime())) throw new Error('Invalid as_of_date');
  const cutoffFy = resolveAsOfFy(allYearlies, round?.as_of_fy, parsedDate);
  const yearlies = allYearlies.filter(yearly => yearly.fiscal_year <= cutoffFy);
  const latestYearly = yearlies.length > 0 ? yearlies[yearlies.length - 1] : null;
  const financialFy = latestYearly?.fiscal_year ?? null;

  const metrics = financialFy === null ? [] : db.prepare(
    'SELECT * FROM company_metric WHERE company_id = ? AND as_of_fy = ?'
  ).all(companyId, financialFy) as CompanyMetric[];
  const percentiles = financialFy === null ? [] : db.prepare(
    'SELECT * FROM company_percentile WHERE company_id = ? AND as_of_fy = ?'
  ).all(companyId, financialFy) as CompanyPercentile[];
  const percentileMap = new Map(percentiles.map(percentile => [percentile.metric_code, percentile]));
  const metricMap = new Map(metrics.map(metric => [metric.metric_code, metric]));

  const tech = db.prepare('SELECT * FROM company_technology WHERE company_id = ?')
    .get(companyId) as TechnologyInfo | undefined;
  const supportCutoffDate = requestedDate || `${cutoffFy + 1}-04-30`;
  const episodes = db.prepare(`
    SELECT *
    FROM support_episode
    WHERE company_id = ?
      AND (
        selected_date <= ?
        OR (
          selected_date IS NULL
          AND COALESCE(as_of_fy, source_year) <= ?
        )
      )
    ORDER BY selected_date
  `).all(companyId, supportCutoffDate, cutoffFy) as SupportEpisode[];

  const effectiveFy = financialFy ?? cutoffFy;
  const supportSummary = buildSupportSummary(episodes, effectiveFy);
  const observedChanges = buildObservedChangesAfterSupport(yearlies, supportSummary);
  const tenure = tenureYears(master.founded_date, effectiveFy);
  const programContext = buildProgramContext(round, master, tenure);
  const programGate = programContext ? programContext.gate_status : 'no_program' as const;

  const summaryChecks = buildSixBoxChecks(
    master,
    latestYearly,
    percentileMap,
    metricMap,
    supportSummary,
    effectiveFy,
    programGate,
    observedChanges,
  );
  const officerBrief = buildOfficerBrief(
    summaryChecks,
    supportSummary,
    latestYearly,
    effectiveFy,
  );
  const survivalIndicators = buildSurvivalIndicators(
    master,
    yearlies,
    percentileMap,
    metrics,
    effectiveFy,
  );
  const referenceIndicators = buildReferenceIndicators(
    companyId,
    latestYearly,
    percentileMap,
    metrics,
    effectiveFy,
  );

  for (const item of [...survivalIndicators, ...referenceIndicators]) {
    const benchmark = findExternalBenchmark(master, item.code, item.value, effectiveFy);
    item.external_benchmark = benchmark;
  }
  const externalBenchmarks = [...survivalIndicators, ...referenceIndicators]
    .map(item => item.external_benchmark)
    .filter((item): item is ExternalBenchmark => Boolean(item));

  const historicalContext = Boolean(
    requestedDate
    && financialFy !== null
    && allYearlies.length > 0
    && financialFy < Math.max(...allYearlies.map(row => row.fiscal_year))
  );
  const rdMetric = metricMap.get('rd_intensity');
  const dataWarnings = buildWarnings(master, allYearlies, cutoffFy, financialFy, historicalContext);
  const ntisUnknownYearCount = (db.prepare(`
    SELECT COUNT(*) AS count
    FROM ntis_project
    WHERE company_id = ? AND base_year IS NULL
  `).get(companyId) as { count: number }).count;
  if (ntisUnknownYearCount > 0) {
    dataWarnings.push(
      `NTIS 기준연도 미상 ${ntisUnknownYearCount}건은 기준시점 과제·연구비 집계에서 제외함`,
    );
  }
  if (latestYearly?.equity !== null && latestYearly?.equity !== undefined) {
    const equityMillion = latestYearly.equity / 1000;
    if (latestYearly.equity > 0 && equityMillion < 50) {
      dataWarnings.push(
        `${financialFy}년 자본총계 ${equityMillion.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}백만원으로 부채비율 절대값이 비정상적으로 커질 수 있음 — 자본 소진 여부를 먼저 확인`,
      );
    }
  }
  if (supportSummary.rejected_or_withdrawn > 0) {
    dataWarnings.push(
      `지원 원장에 탈락·포기 ${supportSummary.rejected_or_withdrawn}건 포함 — 중복수혜·누적 지원금은 지원대상 기준으로 해석`,
    );
  }
  const missingCriticalFields = [
    latestYearly?.revenue === null || latestYearly?.revenue === undefined ? 'revenue' : null,
    latestYearly?.equity === null || latestYearly?.equity === undefined ? 'equity' : null,
    (latestYearly?.pension_enrolled ?? latestYearly?.employees) === null ? 'employees' : null,
  ].filter((value): value is string => Boolean(value));

  return {
    company_id: companyId,
    as_of_fy: cutoffFy,
    round_id: roundId,
    company_profile: {
      name_alias: aliasName(companyId),
      region: master.region,
      founded_date: master.founded_date,
      tenure_years: tenure,
      corp_type: master.corp_type,
      size: master.size,
      ind_name: master.ind_name,
      ksic11: master.ksic11,
      main_product: master.main_product,
      biz_status: master.biz_status,
      certifications: certifications(master),
    },
    summary_checks: summaryChecks,
    officer_brief: officerBrief,
    survival_indicators: survivalIndicators,
    reference_indicators: referenceIndicators,
    financial_series: toFinancialSeries(yearlies),
    employment_series: yearlies.map(yearly => ({
      year: yearly.fiscal_year,
      pension_enrolled: yearly.pension_enrolled,
      pension_hired: yearly.pension_hired,
      pension_left: yearly.pension_left,
      avg_salary_million: yearly.avg_salary === null ? null : Math.round(yearly.avg_salary / 100_000) / 10,
    })),
    technology_evidence: {
      inno_biz: master.inno_biz === 1,
      main_biz: master.main_biz === 1,
      venture: master.venture === 1,
      material_parts: master.material_parts === 1,
      net_cert: master.net_cert === 1,
      nep_cert: master.nep_cert === 1,
      has_corporate_lab: master.has_corporate_lab === 1,
      has_rd_dept: master.has_rd_dept === 1,
      researcher_count: master.researcher_count,
      patent_registered: latestYearly?.patent_reg ?? null,
      patent_applied: latestYearly?.patent_applied ?? null,
      valid_patent_count: historicalContext ? null : tech?.valid_patent_count ?? null,
      rd_intensity_pct: rdMetric?.value ?? null,
    },
    support_summary: supportSummary,
    observed_changes_after_support: observedChanges,
    similar_companies: findSimilarCompanies(master, latestYearly, effectiveFy),
    external_benchmarks: externalBenchmarks,
    regional_context: buildRegionalContext(master, episodes, effectiveFy),
    ntis_summary: buildNtisSummary(companyId, effectiveFy),
    evidence: makeEvidence(companyId, financialFy, [...survivalIndicators, ...referenceIndicators]),
    program_context: programContext,
    data_quality: {
      status: missingCriticalFields.length === 0 ? 'high' : missingCriticalFields.length <= 1 ? 'medium' : 'low',
      latest_financial_year: financialFy,
      missing_critical_fields: missingCriticalFields,
    },
    data_warnings: dataWarnings,
    follow_up_questions: generateFollowUpQuestions(
      master,
      summaryChecks,
      supportSummary,
      observedChanges,
    ),
  };
}
