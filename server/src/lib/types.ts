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
  reviewStatus: 'draft' | 'reviewed' | 'active'
  documentId?: string | null
  requirements: ProgramRequirement[]
}

export type ProgramRequirement = {
  id: string
  type: 'eligibility' | 'exclusion' | 'preference' | 'evaluation' | 'document' | 'obligation'
  label: string
  rule: Record<string, unknown> | null
  weight: number | null
  sourcePage: number | null
  sourceText: string | null
  reviewStatus: 'draft' | 'reviewed' | 'active'
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
  code: string;
  label: string;
  value: number | null;
  unit: string;
  pctl: number | null;
  cohort_level: string | null;
  cohort_n: number | null;
  status: 'ok' | 'caution' | 'warning' | 'missing' | 'negative_equity';
  flag_reason: string | null;
  direction: 'higher_is_better' | 'lower_is_better' | 'neutral';
  as_of_year: number | null;
  evidence_ids: string[];
  formula_version: string;
  /** 폐업 예측 AUC. 없으면 규칙형 지표. */
  auc?: number | null;
  /** 생존점수 가중치. 0이면 참고지표. */
  weight?: number | null;
  external_benchmark?: ExternalBenchmark | null;
}

export interface SixBoxCheck {
  /** 스펙 키: survival | capacity | finance | support_focus | duplicate | data_quality | eligibility */
  code: string;
  label: string;
  status: 'green' | 'yellow' | 'red' | 'gray';
  value: string;
  note: string | null;
  /** 담당자 해석 한 줄 (관찰 사실, 추천 아님) */
  interpretation: string | null;
}

export interface SupportSummaryItem {
  episode_id: string;
  program_name: string | null;
  program_code: string | null;
  biz_type: string | null;
  support_purpose: string | null;
  selected_date: string | null;
  start_date: string | null;
  end_date: string | null;
  result: string | null;
  total_amount_million: number | null;
  component_count: number;
  is_awarded: boolean;
  amount_flag: 'ok' | 'missing' | 'zero' | 'mixed';
  components: Array<{
    row_id: number;
    support_type: string | null;
    support_item: string | null;
    amount_million: number | null;
    amount_flag: string | null;
  }>;
}

export interface SupportPurposeRepeat {
  purpose: string;
  episode_count: number;
  years: number[];
  total_amount_million: number;
  program_names: string[];
}

export interface SupportSummary {
  total_episodes: number;
  awarded_episodes: number;
  rejected_or_withdrawn: number;
  recent_3yr_awarded: number;
  total_amount_million: number;
  awarded_amount_million: number;
  missing_amount_count: number;
  zero_amount_count: number;
  years_received: number[];
  is_consecutive_3yr: boolean;
  same_purpose_repeats: SupportPurposeRepeat[];
  badges: string[];
  episode_list: SupportSummaryItem[];
  overlap_pairs: Array<{
    ep1_id: string;
    ep2_id: string;
    overlap_days: number;
    purpose_relation: 'same' | 'similar' | 'different' | 'unknown';
  }>;
}

export interface ObservedChangeAfterSupport {
  episode_id: string;
  program_name: string | null;
  selected_date: string | null;
  pre_fy: number | null;
  post_fy: number | null;
  revenue_change_pct: number | null;
  employment_change: number | null;
  new_patent_count: number | null;
  status: 'improved' | 'partial' | 'unchanged' | 'insufficient' | 'overlapped';
  note: string | null;
}

export interface OfficerBrief {
  lines: string[];
  priority_checks: string[];
  signal_counts: { red: number; yellow: number; green: number; gray: number };
}

export interface SimilarCompany {
  company_id: number;
  ind_name: string | null;
  size: string | null;
  region: string | null;
  cohort_level: string;
  distance: number;
  compared_metrics: string[];
}

export interface Evidence {
  evidence_id: string;
  source_file: string;
  source_sheet_page: string | null;
  source_row_cell: string | null;
  reference_year: number | null;
  raw_value: string | number | null;
  normalized_value: string | number | null;
  formula: string | null;
  formula_version: string;
  external_dataset_id: string | null;
}

export interface ExternalBenchmark {
  dataset_id: string;
  reference_year: number;
  metric_code: string;
  metric_label: string;
  value: number;
  unit: string;
  gap: number;
  ksic_code: string;
  company_size: string;
  source_locator: string | null;
}

export interface RegionalContext {
  status: 'ok' | 'not_applicable' | 'not_available';
  reason: string | null;
  dataset_id: string | null;
  reference_year: number | null;
  region_name: string | null;
  ksic_code: string | null;
  establishment_count: number | null;
  employee_count: number | null;
  employees_per_establishment: number | null;
}

export interface NtisSummary {
  project_count: number;
  lead_count: number;
  government_funding_won: number;
  latest_year: number | null;
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
  officer_brief: OfficerBrief;
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
  observed_changes_after_support: ObservedChangeAfterSupport[];
  similar_companies: SimilarCompany[];
  external_benchmarks: ExternalBenchmark[];
  regional_context: RegionalContext;
  ntis_summary: NtisSummary;
  evidence: Evidence[];
  program_context: {
    program_id: string;
    gate_status: 'eligible' | 'ineligible' | 'needs_review';
    requirement_results: Array<{
      requirement_id: string;
      label: string;
      status: 'met' | 'not_met' | 'unknown';
      weight: number | null;
      reason: string;
      evidence_ids: string[];
    }>;
    program_fit_score: number | null;
  } | null;
  data_quality: {
    status: 'high' | 'medium' | 'low';
    latest_financial_year: number | null;
    missing_critical_fields: string[];
  };
  data_warnings: string[];
  follow_up_questions: string[];
}

// ── 기업 목록 항목 ───────────────────────────────────────────

export interface CompanyListItem {
  id: string;
  alias_label: string;
  industry: string;
  ksic11: string | null;
  size: string | null;
  location: string;
  founded_year: number | null;
  employee_count: number | null;
  employee_year: number | null;
  latest_revenue_million: number | null;
  latest_revenue_year: number | null;
  revenue_growth_pct: number | null;
  operating_margin_pct: number | null;
  debt_ratio_pct: number | null;
  support_total_million: number;
  support_episode_count: number;
  support_missing_amount_count: number;
  valid_patent_count: number | null;
  certifications: string[];
  risk_signals: string[];
  data_quality: 'high' | 'medium' | 'low';
  program_fit_score: number | null;
  program_fit_reasons: string[];
}

export interface CompanyListResponse {
  items: CompanyListItem[];
  page: number;
  page_size: number;
  total: number;
  sort: string;
}
