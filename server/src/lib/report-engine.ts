import type {
  CompanyMaster, CompanyYearly, CompanyMetric, CompanyPercentile,
  SupportEpisode, TechnologyInfo, FinancialPoint,
  CompanyReportResponse
} from './types';
import { getDb } from '../db/connection';
import {
  buildSixBoxChecks,
  buildSurvivalIndicators,
  buildReferenceIndicators,
  buildSupportSummary,
  generateFollowUpQuestions,
} from './risk';
import { findSimilarCompanies } from './matching';

// ── 기준 연도 계산 ────────────────────────────────────────────

export function resolveAsOfFy(
  yearlies: CompanyYearly[],
  roundAsOfFy?: number | null
): number {
  if (roundAsOfFy) return roundAsOfFy;
  const years = yearlies.map(y => y.fiscal_year).filter(Boolean);
  return years.length > 0 ? Math.max(...years) : new Date().getFullYear() - 1;
}

// ── 이름 가명화 ───────────────────────────────────────────────

function aliasName(companyId: number): string {
  return `기업_${companyId}`;
}

// ── 인증 목록 ────────────────────────────────────────────────

function certifications(master: CompanyMaster): string[] {
  const certs: string[] = [];
  if (master.inno_biz) certs.push('이노비즈');
  if (master.main_biz) certs.push('메인비즈');
  if (master.venture) certs.push('벤처기업');
  if (master.material_parts) certs.push('소재부품');
  if (master.net_cert) certs.push('NET');
  if (master.nep_cert) certs.push('NEP');
  return certs;
}

// ── 업력 계산 ────────────────────────────────────────────────

function tenureYears(foundedDate: string | null, asOfYear: number): number | null {
  if (!foundedDate) return null;
  const d = new Date(foundedDate);
  if (isNaN(d.getTime())) return null;
  return asOfYear - d.getFullYear();
}

// ── 재무 시계열 변환 ─────────────────────────────────────────

function toFinancialSeries(yearlies: CompanyYearly[]): FinancialPoint[] {
  return yearlies
    .sort((a, b) => a.fiscal_year - b.fiscal_year)
    .map(y => ({
      year: y.fiscal_year,
      revenue: y.revenue !== null ? Math.round(y.revenue / 1000) : null,
      op_profit: y.op_profit !== null ? Math.round(y.op_profit / 1000) : null,
      net_income: y.net_income !== null ? Math.round(y.net_income / 1000) : null,
      assets: y.assets !== null ? Math.round(y.assets / 1000) : null,
      liabilities: y.liabilities !== null ? Math.round(y.liabilities / 1000) : null,
      equity: y.equity !== null ? Math.round(y.equity / 1000) : null,
      op_margin_pct: y.op_margin_pct,
    }));
}

// ── 데이터 품질 경고 ─────────────────────────────────────────

function buildWarnings(
  master: CompanyMaster,
  yearlies: CompanyYearly[],
  asOfFy: number
): string[] {
  const warnings: string[] = [];
  const years = yearlies.map(y => y.fiscal_year);

  if (!years.includes(asOfFy)) {
    warnings.push(`기준연도(${asOfFy}) 재무 데이터 없음 — 직전 연도 데이터 사용`);
  }
  const missingYears = [2022, 2023, 2024].filter(y => !years.includes(y));
  if (missingYears.length >= 3) {
    warnings.push('재무 데이터 전체 미제출 — 지표 계산 불가');
  } else if (missingYears.length > 0) {
    warnings.push(`${missingYears.join(', ')}년 재무 데이터 없음`);
  }
  if (!master.founded_date) {
    warnings.push('설립일자 미확인 — 업력 계산 불가');
  }
  if (master.closed_flag) {
    warnings.push(`${master.biz_status} 기업 — 지원 대상 적정성 확인 필요`);
  }
  return warnings;
}

// ── 메인 리포트 빌드 ─────────────────────────────────────────

export function buildReport(
  companyId: number,
  roundId: string | null = null
): CompanyReportResponse | null {
  const db = getDb();

  // 기업 마스터
  const master = db.prepare(
    'SELECT * FROM company_master WHERE company_id = ?'
  ).get(companyId) as CompanyMaster | undefined;
  if (!master) return null;

  // 연도별 재무
  const yearlies = db.prepare(
    'SELECT * FROM company_yearly WHERE company_id = ? ORDER BY fiscal_year'
  ).all(companyId) as CompanyYearly[];

  // as_of_fy 결정
  let roundAsOfFy: number | null = null;
  if (roundId) {
    const round = db.prepare(
      'SELECT as_of_fy FROM round_master WHERE round_id = ?'
    ).get(roundId) as { as_of_fy: number } | undefined;
    roundAsOfFy = round?.as_of_fy ?? null;
  }
  const asOfFy = resolveAsOfFy(yearlies, roundAsOfFy);

  // 파생지표
  const metrics = db.prepare(
    'SELECT * FROM company_metric WHERE company_id = ? AND as_of_fy = ?'
  ).all(companyId, asOfFy) as CompanyMetric[];

  // 백분위 (최신 as_of_fy 기준)
  const pctls = db.prepare(
    'SELECT * FROM company_percentile WHERE company_id = ? AND as_of_fy = ?'
  ).all(companyId, asOfFy) as CompanyPercentile[];
  const pctlMap = new Map(pctls.map(p => [p.metric_code, p]));

  // 기술 정보
  const tech = db.prepare(
    'SELECT * FROM company_technology WHERE company_id = ?'
  ).get(companyId) as TechnologyInfo | undefined;

  // 지원 이력
  const episodes = db.prepare(
    'SELECT * FROM support_episode WHERE company_id = ? ORDER BY selected_date'
  ).all(companyId) as SupportEpisode[];

  // 최신 연도 재무
  const yMap = new Map(yearlies.map(y => [y.fiscal_year, y]));
  const latestYearly = yMap.get(asOfFy) || (yearlies.length > 0 ? yearlies[yearlies.length - 1] : null);

  // 지원 이력 집계
  const supportSummary = buildSupportSummary(episodes);

  // 30초 판단판
  const summaryChecks = buildSixBoxChecks(master, latestYearly, pctlMap, supportSummary, asOfFy);

  // 생존 지표
  const survivalIndicators = buildSurvivalIndicators(master, yearlies, pctlMap, asOfFy);

  // 참고 지표
  const referenceIndicators = buildReferenceIndicators(latestYearly, pctlMap);

  // 재무 시계열
  const financialSeries = toFinancialSeries(yearlies);

  // 고용 시계열
  const employmentSeries = yearlies
    .sort((a, b) => a.fiscal_year - b.fiscal_year)
    .map(y => ({
      year: y.fiscal_year,
      pension_enrolled: y.pension_enrolled,
      pension_hired: y.pension_hired,
      pension_left: y.pension_left,
      avg_salary_million: y.avg_salary !== null ? Math.round(y.avg_salary / 1_000_000 * 10) / 10 : null,
    }));

  // R&D 집약도 (최신)
  const rdMetric = metrics.find(m => m.metric_code === 'rd_intensity');

  // 기술 역량
  const technologyEvidence = {
    inno_biz: master.inno_biz === 1,
    main_biz: master.main_biz === 1,
    venture: master.venture === 1,
    material_parts: master.material_parts === 1,
    net_cert: master.net_cert === 1,
    nep_cert: master.nep_cert === 1,
    has_corporate_lab: master.has_corporate_lab === 1,
    has_rd_dept: master.has_rd_dept === 1,
    researcher_count: master.researcher_count,
    patent_registered: tech?.patent_registered ?? null,
    patent_applied: tech?.patent_applied ?? null,
    valid_patent_count: tech?.valid_patent_count ?? null,
    rd_intensity_pct: rdMetric?.value ?? null,
  };

  // 유사기업
  const similarCompanies = findSimilarCompanies(master);

  // 데이터 품질 경고
  const dataWarnings = buildWarnings(master, yearlies, asOfFy);

  // 추가 확인 질문
  const followUpQuestions = generateFollowUpQuestions(master, summaryChecks, supportSummary);

  return {
    company_id: companyId,
    as_of_fy: asOfFy,
    round_id: roundId,
    company_profile: {
      name_alias: aliasName(companyId),
      region: master.region,
      founded_date: master.founded_date,
      tenure_years: tenureYears(master.founded_date, asOfFy),
      corp_type: master.corp_type,
      size: master.size,
      ind_name: master.ind_name,
      ksic11: master.ksic11,
      main_product: master.main_product,
      biz_status: master.biz_status,
      certifications: certifications(master),
    },
    summary_checks: summaryChecks,
    survival_indicators: survivalIndicators,
    reference_indicators: referenceIndicators,
    financial_series: financialSeries,
    employment_series: employmentSeries,
    technology_evidence: technologyEvidence,
    support_summary: supportSummary,
    similar_companies: similarCompanies,
    data_warnings: dataWarnings,
    follow_up_questions: followUpQuestions,
  };
}
