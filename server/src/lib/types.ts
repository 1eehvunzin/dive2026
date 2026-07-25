// ── 기존 타입 (Program) ─────────────────────────────────────

export type Program = {
  id: string
  title: string
  agency: string
  field: string
  budget: string
  supportPerCompany: string
  deadline: string
  targetStage: string
  keywords: string[]
  description: string
}

// ── DB Row 타입 ──────────────────────────────────────────────

export interface CompanyMaster {
  company_id: number;
  region: string | null;
  founded_date: string | null;
  corp_type: string | null;
  size: string | null;
  ksic11: string | null;
  ksic2: string | null;
  ksic3: string | null;
  ind_name: string | null;
  main_product: string | null;
  closed_flag: number;
  closed_date: string | null;
  biz_status: string | null;
  observed_at: string | null;
  inno_biz: number;
  main_biz: number;
  venture: number;
  material_parts: number;
  net_cert: number;
  nep_cert: number;
  researcher_count: number | null;
  has_corporate_lab: number;
  has_rd_dept: number;
}

export interface CompanyYearly {
  company_id: number;
  fiscal_year: number;
  employees: number | null;
  pension_enrolled: number | null;
  pension_hired: number | null;
  pension_left: number | null;
  avg_salary: number | null;
  revenue: number | null;
  op_profit: number | null;
  cost_of_sales: number | null;
  net_income: number | null;
  op_margin_pct: number | null;
  assets: number | null;
  liabilities: number | null;
  equity: number | null;
  paid_capital: number | null;
  rd_expense: number | null;
  patent_reg: number | null;
  patent_applied: number | null;
}

export interface CompanyMetric {
  company_id: number;
  as_of_fy: number;
  metric_code: string;
  value: number | null;
  unit: string;
  status: string;
}

export interface CompanyPercentile {
  company_id: number;
  metric_code: string;
  as_of_fy: number;
  pctl: number;
  cohort_level: string;
  cohort_n: number;
}

export interface SupportEpisode {
  episode_id: string;
  company_id: number;
  program_code: string | null;
  program_name: string | null;
  biz_type: string | null;
  selected_date: string | null;
  start_date: string | null;
  end_date: string | null;
  result: string | null;
  total_amount: number | null;
  component_count: number;
  region_sido: string | null;
  region_sigungu: string | null;
  source_year: number;
  as_of_fy: number | null;
}

export interface TechnologyInfo {
  company_id: number;
  patent_registered: number | null;
  patent_applied: number | null;
  valid_patent_count: number | null;
  researcher_count: number | null;
  has_corporate_lab: number;
  has_rd_dept: number;
  inno_biz: number;
  main_biz: number;
  venture: number;
  material_parts: number;
}

// ── 리포트 응답 타입 ──────────────────────────────────────────

export interface FinancialPoint {
  year: number;
  revenue: number | null;      // 백만원 (천원 ÷ 1000)
  op_profit: number | null;
  net_income: number | null;
  assets: number | null;
  liabilities: number | null;
  equity: number | null;
  op_margin_pct: number | null;
}

export interface IndicatorRow {
  label: string;
  value: number | null;
  unit: string;
  pctl: number | null;
  cohort_level: string | null;
  cohort_n: number | null;
  status: 'ok' | 'caution' | 'warning' | 'missing' | 'negative_equity';
  flag_reason: string | null;
}

export interface SixBoxCheck {
  label: string;
  status: 'green' | 'yellow' | 'red' | 'gray';
  value: string;
  note: string | null;
}

export interface SupportSummaryItem {
  episode_id: string;
  program_name: string | null;
  biz_type: string | null;
  selected_date: string | null;
  total_amount_million: number;
  component_count: number;
}

export interface SupportSummary {
  total_episodes: number;
  total_amount_million: number;
  years_received: number[];
  is_consecutive_3yr: boolean;
  episode_list: SupportSummaryItem[];
  overlap_pairs: Array<{ ep1_id: string; ep2_id: string; overlap_days: number }>;
}

export interface SimilarCompany {
  company_id: number;
  ind_name: string | null;
  size: string | null;
  region: string | null;
  cohort_level: string;
}

export interface CompanyReportResponse {
  company_id: number;
  as_of_fy: number;
  round_id: string | null;
  company_profile: {
    name_alias: string;
    region: string | null;
    founded_date: string | null;
    tenure_years: number | null;
    corp_type: string | null;
    size: string | null;
    ind_name: string | null;
    ksic11: string | null;
    main_product: string | null;
    biz_status: string | null;
    certifications: string[];
  };
  summary_checks: SixBoxCheck[];
  survival_indicators: IndicatorRow[];
  reference_indicators: IndicatorRow[];
  financial_series: FinancialPoint[];
  employment_series: Array<{
    year: number;
    pension_enrolled: number | null;
    pension_hired: number | null;
    pension_left: number | null;
    avg_salary_million: number | null;
  }>;
  technology_evidence: {
    inno_biz: boolean;
    main_biz: boolean;
    venture: boolean;
    material_parts: boolean;
    net_cert: boolean;
    nep_cert: boolean;
    has_corporate_lab: boolean;
    has_rd_dept: boolean;
    researcher_count: number | null;
    patent_registered: number | null;
    patent_applied: number | null;
    valid_patent_count: number | null;
    rd_intensity_pct: number | null;
  };
  support_summary: SupportSummary;
  similar_companies: SimilarCompany[];
  data_warnings: string[];
  follow_up_questions: string[];
}

// ── 기업 목록 항목 (company-view.tsx 대응) ──────────────────

export interface CompanyListItem {
  id: string;
  name: string;
  logoSeed: string;
  industry: string;
  stage: string;
  location: string;
  founded: number | null;
  employees: number | null;
  matchScore: number;
  fundingTotal: string;
  lastRoundValuation: string;
  ceo: string;
  oneLiner: string;
  tags: string[];
  scoreBreakdown: Array<{ label: string; score: number; maxScore: number }>;
  strengths: string[];
  risks: string[];
  financials: FinancialPoint[];
  patents: number;
  certifications: string[];
  creditGrade: string;
  debtRatio: number | null;
  currentRatio: number | null;
  runwayMonths: number | null;
  report: {
    summary: string;
    market: string;
    technology: string;
    team: string;
    finance: string;
  };
}
