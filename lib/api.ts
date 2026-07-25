import type { Company } from "@/lib/mock-data"
import { formatKrwMillion, formatPercent } from "@/lib/format"

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"
).replace(/\/+$/, "")

export type ReviewStatus = "draft" | "reviewed" | "active"
export type RequirementType =
  | "eligibility"
  | "exclusion"
  | "preference"
  | "evaluation"
  | "document"
  | "obligation"

export interface ProgramRequirementDto {
  id: string
  type: RequirementType
  label: string
  rule: Record<string, unknown> | null
  weight: number | null
  sourcePage: number | null
  sourceText: string | null
  reviewStatus: ReviewStatus
}

export interface ProgramDto {
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
  reviewStatus: ReviewStatus
  documentId?: string | null
  requirements: ProgramRequirementDto[]
}

export type ProgramInput = Omit<ProgramDto, "id">

export interface CompanyListItemDto {
  id: string
  alias_label: string
  industry: string
  ksic11: string | null
  size: string | null
  location: string
  founded_year: number | null
  employee_count: number | null
  employee_year: number | null
  latest_revenue_million: number | null
  latest_revenue_year: number | null
  revenue_growth_pct: number | null
  operating_margin_pct: number | null
  debt_ratio_pct: number | null
  support_total_million: number
  support_episode_count: number
  support_missing_amount_count: number
  valid_patent_count: number | null
  certifications: string[]
  risk_signals: string[]
  data_quality: "high" | "medium" | "low"
  program_fit_score: number | null
  program_fit_reasons: string[]
}

export interface CompanyListResponseDto {
  items: CompanyListItemDto[]
  page: number
  page_size: number
  total: number
  sort: string
}

export interface IndicatorDto {
  code: string
  label: string
  value: number | null
  unit: string
  pctl: number | null
  cohort_level: string | null
  cohort_n: number | null
  status: "ok" | "caution" | "warning" | "missing" | "negative_equity"
  flag_reason: string | null
  direction: "higher_is_better" | "lower_is_better" | "neutral"
  as_of_year: number | null
  evidence_ids: string[]
  formula_version: string
  auc?: number | null
  weight?: number | null
  external_benchmark?: ExternalBenchmarkDto | null
}

export interface ExternalBenchmarkDto {
  dataset_id: string
  reference_year: number
  metric_code: string
  metric_label: string
  value: number
  unit: string
  gap: number
  ksic_code: string
  company_size: string
  source_locator: string | null
}

export interface CompanyReportDto {
  company_id: number
  as_of_fy: number
  round_id: string | null
  company_profile: {
    name_alias: string
    region: string | null
    founded_date: string | null
    tenure_years: number | null
    corp_type: string | null
    size: string | null
    ind_name: string | null
    ksic11: string | null
    main_product: string | null
    biz_status: string | null
    certifications: string[]
  }
  summary_checks: Array<{
    code?: string
    label: string
    status: "green" | "yellow" | "red" | "gray"
    value: string
    note: string | null
    interpretation?: string | null
  }>
  officer_brief?: {
    lines: string[]
    priority_checks: string[]
    signal_counts: { red: number; yellow: number; green: number; gray: number }
  }
  survival_indicators: IndicatorDto[]
  reference_indicators: IndicatorDto[]
  financial_series: Array<{
    year: number
    revenue: number | null
    op_profit: number | null
    net_income: number | null
    assets: number | null
    liabilities: number | null
    equity: number | null
    op_margin_pct: number | null
  }>
  employment_series: Array<{
    year: number
    pension_enrolled: number | null
    pension_hired: number | null
    pension_left: number | null
    avg_salary_million: number | null
  }>
  technology_evidence: {
    inno_biz: boolean
    main_biz: boolean
    venture: boolean
    material_parts: boolean
    net_cert: boolean
    nep_cert: boolean
    has_corporate_lab: boolean
    has_rd_dept: boolean
    researcher_count: number | null
    patent_registered: number | null
    patent_applied: number | null
    valid_patent_count: number | null
    rd_intensity_pct: number | null
  }
  support_summary: {
    total_episodes: number
    awarded_episodes?: number
    rejected_or_withdrawn?: number
    recent_3yr_awarded?: number
    total_amount_million: number
    awarded_amount_million?: number
    missing_amount_count: number
    zero_amount_count?: number
    years_received: number[]
    is_consecutive_3yr: boolean
    same_purpose_repeats?: Array<{
      purpose: string
      episode_count: number
      years: number[]
      total_amount_million: number
      program_names: string[]
    }>
    badges?: string[]
    episode_list: Array<{
      episode_id: string
      program_name: string | null
      program_code?: string | null
      biz_type: string | null
      support_purpose?: string | null
      selected_date: string | null
      start_date?: string | null
      end_date?: string | null
      result?: string | null
      total_amount_million: number | null
      component_count: number
      is_awarded?: boolean
      amount_flag?: "ok" | "missing" | "zero" | "mixed"
      components?: Array<{
        row_id: number
        support_type: string | null
        support_item: string | null
        amount_million: number | null
        amount_flag: string | null
      }>
    }>
    overlap_pairs: Array<{
      ep1_id: string
      ep2_id: string
      overlap_days: number
      purpose_relation?: "same" | "similar" | "different" | "unknown"
    }>
  }
  observed_changes_after_support?: Array<{
    episode_id: string
    program_name: string | null
    selected_date: string | null
    pre_fy: number | null
    post_fy: number | null
    revenue_change_pct: number | null
    employment_change: number | null
    new_patent_count: number | null
    status: string
    note: string | null
  }>
  similar_companies: Array<{
    company_id: number
    ind_name: string | null
    size: string | null
    region: string | null
    cohort_level: string
    distance: number
    compared_metrics: string[]
  }>
  external_benchmarks: ExternalBenchmarkDto[]
  regional_context: {
    status: "ok" | "not_applicable" | "not_available"
    reason: string | null
    dataset_id: string | null
    reference_year: number | null
    region_name: string | null
    ksic_code: string | null
    establishment_count: number | null
    employee_count: number | null
    employees_per_establishment: number | null
  }
  ntis_summary: {
    project_count: number
    lead_count: number
    government_funding_won: number
    latest_year: number | null
  }
  evidence: Array<{
    evidence_id: string
    source_file: string
    source_sheet_page: string | null
    source_row_cell: string | null
    reference_year: number | null
    raw_value: string | number | null
    normalized_value: string | number | null
    formula: string | null
    formula_version: string
    external_dataset_id: string | null
  }>
  program_context: {
    program_id: string
    gate_status: "eligible" | "ineligible" | "needs_review"
    requirement_results: Array<{
      requirement_id: string
      label: string
      status: "met" | "not_met" | "unknown"
      weight: number | null
      reason: string
      evidence_ids: string[]
    }>
    program_fit_score: number | null
  } | null
  data_quality: {
    status: "high" | "medium" | "low"
    latest_financial_year: number | null
    missing_critical_fields: string[]
  }
  data_warnings: string[]
  follow_up_questions: string[]
}

export interface ParseProgramDocumentResponse {
  fallback: boolean
  documentId: string
  sha256: string
  parser?: string
  pages?: number | null
  program: ProgramInput
}

export interface AgentChatResponse {
  answer: string
  fallback: boolean
  sources: string[]
}

export interface SimulationResponse {
  company_id: number
  scenario: {
    support_amount_million: number
    horizon_years: number
    type: "observational"
  }
  cohort: {
    matching_level: "ksic3_size" | "insufficient"
    revenue_observations: number
    employment_observations: number
  }
  observed_medians: {
    revenue_growth_pct: number
    employment_change_persons: number
  } | null
  limitations: string[]
}

export interface ComparisonResponse {
  round_id: string | null
  metrics: string[]
  rows: Array<{
    company_id: number
    alias_label?: string
    industry?: string | null
    gate_status?: "eligible" | "ineligible" | "needs_review" | null
    data_quality?: CompanyReportDto["data_quality"]
    values?: Record<string, IndicatorDto | number | null>
    error?: string
  }>
}

export interface CreateRoundResponse {
  roundId: string
  programId: string | null
  asOfDate: string
  asOfFy: number
  candidateCount: number
}

export interface ListCompaniesParams {
  page?: number
  limit?: number
  asOfFy?: number
  sort?: string
  size?: string
  region?: string
  ksic?: string
  bizStatus?: string
  search?: string
  programId?: string
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly payload: unknown,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError(
      0,
      null,
      `로컬 분석 서버(${API_BASE_URL})에 연결할 수 없습니다. 백엔드 실행 상태를 확인해 주세요.`,
    )
  }
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `API request failed (${response.status})`
    throw new ApiError(response.status, payload, message)
  }
  return payload as T
}

function queryString(values: Record<string, string | number | undefined | null>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value))
  }
  const encoded = query.toString()
  return encoded ? `?${encoded}` : ""
}

export function listCompanies(params: ListCompaniesParams = {}) {
  return request<CompanyListResponseDto>(
    `/api/companies${queryString({
      page: params.page,
      limit: params.limit,
      as_of_fy: params.asOfFy,
      sort: params.sort,
      size: params.size,
      region: params.region,
      ksic: params.ksic,
      biz_status: params.bizStatus,
      search: params.search,
      program_id: params.programId,
    })}`,
  )
}

export function getCompanySummary(companyId: string | number, asOfFy?: number) {
  return request<CompanyListItemDto>(
    `/api/companies/${encodeURIComponent(companyId)}${queryString({ as_of_fy: asOfFy })}`,
  )
}

export function getCompanyReport(
  companyId: string | number,
  options: { roundId?: string; asOfDate?: string } = {},
) {
  return request<CompanyReportDto>(
    `/api/reports/${encodeURIComponent(companyId)}${queryString({
      round_id: options.roundId,
      as_of_date: options.asOfDate,
    })}`,
  )
}

export function listPrograms() {
  return request<ProgramDto[]>("/api/programs")
}

export function createProgram(program: ProgramInput) {
  return request<ProgramDto>("/api/programs", {
    method: "POST",
    body: JSON.stringify(program),
  })
}

export function updateProgram(programId: string, program: ProgramInput) {
  return request<ProgramDto>(`/api/programs/${encodeURIComponent(programId)}`, {
    method: "PUT",
    body: JSON.stringify(program),
  })
}

export function parseProgramDocument(file: File) {
  const body = new FormData()
  body.append("file", file)
  return request<ParseProgramDocumentResponse>("/api/programs/parse", {
    method: "POST",
    body,
  })
}

export function chatAgent(input: { companyId: string | number; question: string; roundId?: string }) {
  return request<AgentChatResponse>("/api/agent/chat", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function runSimulation(input: { companyId: string | number; amountMillion: number }) {
  return request<SimulationResponse>("/api/simulations", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function compareCompanies(input: {
  companyIds: Array<string | number>
  roundId?: string
  metrics?: string[]
}) {
  return request<ComparisonResponse>("/api/comparisons", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function createRound(input: {
  programId?: string
  companyIds: Array<string | number>
  asOfDate?: string
}) {
  return request<CreateRoundResponse>("/api/rounds", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

function metric(report: CompanyReportDto, code: string): IndicatorDto | undefined {
  return [...report.survival_indicators, ...report.reference_indicators].find(
    (indicator) => indicator.code === code,
  )
}

function usableMainProduct(value: string | null): string | null {
  if (!value) return null
  const normalized = value.trim()
  if (!normalized || ["-", "없음", "미상", "홈페이지"].includes(normalized)) return null
  return normalized
}

function cohortLabel(level: string): string {
  const labels: Record<string, string> = {
    ksic3_size: "KSIC 중분류·기업규모",
    ksic3: "KSIC 중분류",
    ksic1_size: "KSIC 대분류·기업규모",
    ksic1: "KSIC 대분류",
  }
  return labels[level] ?? level
}

export function mapCompanyListItem(item: CompanyListItemDto): Company {
  const revenue = item.latest_revenue_million
  const opProfit =
    revenue !== null && item.operating_margin_pct !== null
      ? (revenue * item.operating_margin_pct) / 100
      : null
  const supportTotal =
    item.support_episode_count === 0
      ? "선정 이력 0건"
      : item.support_missing_amount_count === item.support_episode_count
      ? "금액 미상"
      : item.support_total_million === 0
        ? "금액 의미 확인"
      : `${formatKrwMillion(item.support_total_million)}${
          item.support_missing_amount_count > 0
            ? ` + 미상 ${item.support_missing_amount_count}건`
            : ""
        }`

  return {
    id: item.id,
    name: item.alias_label,
    logoSeed: item.alias_label.slice(0, 1) || "기",
    industry: item.industry,
    location: item.location,
    founded: item.founded_year,
    employees: item.employee_count,
    supportTotal,
    financialUnit: "백만원",
    oneLiner: [item.ksic11, item.size].filter(Boolean).join(" · "),
    tags: item.certifications,
    scoreBreakdown: [],
    strengths: [],
    risks: item.risk_signals,
    financials:
      item.latest_revenue_year === null
        ? []
        : [{
            year: String(item.latest_revenue_year),
            revenue,
            operatingProfit: opProfit,
            employees: item.employee_count,
          }],
    patents: item.valid_patent_count,
    certifications: item.certifications,
    creditGrade: null,
    debtRatio: item.debt_ratio_pct,
    currentRatio: null,
    revenueGrowthPct: item.revenue_growth_pct,
    runwayMonths: null,
    programFitScore: item.program_fit_score,
    programFitReasons: item.program_fit_reasons,
    report: {
      summary: `데이터 품질: ${item.data_quality}`,
      market: "원천데이터에 시장 정보가 없습니다.",
      technology:
        item.valid_patent_count === null
          ? "유효 특허 수를 확인할 수 없습니다."
          : `유효 특허 ${item.valid_patent_count.toLocaleString("ko-KR")}건`,
      team:
        item.employee_count === null
          ? "고용 인원을 확인할 수 없습니다."
          : `${item.employee_year ?? "최근"}년 고용 ${item.employee_count.toLocaleString("ko-KR")}명`,
      finance:
        revenue === null
          ? "최근 매출을 확인할 수 없습니다."
          : `${item.latest_revenue_year ?? "최근"}년 매출 ${formatKrwMillion(revenue)}`,
    },
  }
}

function mapIndicator(indicator: IndicatorDto) {
  return {
    code: indicator.code,
    label: indicator.label,
    value: indicator.value,
    unit: indicator.unit,
    pctl: indicator.pctl,
    cohortLabel:
      indicator.cohort_level && indicator.cohort_n !== null
        ? `${cohortLabel(indicator.cohort_level)} (n=${indicator.cohort_n})`
        : null,
    status: indicator.status,
    flagReason: indicator.flag_reason,
    auc: indicator.auc ?? null,
    weight: indicator.weight ?? null,
  }
}

function debtDisplay(value: number | null, equityMillion: number | null): string {
  if (value === null) return "자료 없음"
  if (equityMillion !== null && equityMillion <= 0) return "자본잠식"
  if (value >= 1000 || (equityMillion !== null && equityMillion > 0 && equityMillion < 50)) {
    return `자본 소진 임박 · 자본 ${formatKrwMillion(equityMillion)} · 산출 ${formatPercent(value)}`
  }
  return formatPercent(value)
}

export function mapCompanyReport(report: CompanyReportDto): Company {
  const latestEmployment = report.employment_series.at(-1)
  const latestFinancial = report.financial_series.at(-1)
  const debtRatio = metric(report, "debt_ratio")?.value ?? null
  const coreCodes = new Set(["survival", "capacity", "support_focus", "data_quality", "eligibility", "finance"])
  const coreChecks = report.summary_checks.filter(
    (check) => !check.code || coreCodes.has(check.code),
  )
  const warningChecks = coreChecks.filter(
    (check) => check.status === "red" || check.status === "yellow",
  )
  const goodChecks = coreChecks.filter((check) => check.status === "green")
  const mainProduct = usableMainProduct(report.company_profile.main_product)
  const revenueGrowth = metric(report, "revenue_growth")?.value ?? null
  const operatingMargin = metric(report, "operating_margin")?.value ?? null
  const supportEpisodeMap = new Map(
    report.support_summary.episode_list.map((episode) => [episode.episode_id, episode]),
  )
  const awardedOnly = report.support_summary.episode_list.filter((episode) => {
    if (typeof episode.is_awarded === "boolean") return episode.is_awarded
    return !episode.result || episode.result === "지원대상" || episode.result.includes("지원대상")
  })
  const repeatedPrograms = [...awardedOnly.reduce(
    (groups, episode) => {
      const program = episode.program_name ?? episode.biz_type ?? "사업명 미상"
      groups.set(program, [...(groups.get(program) ?? []), episode.episode_id])
      return groups
    },
    new Map<string, string[]>(),
  )]
    .filter(([, episodeIds]) => episodeIds.length > 1)
    .map(([program, episodeIds]) => ({ program, count: episodeIds.length, episodeIds }))

  const brief = report.officer_brief
  const awardedAmount =
    report.support_summary.awarded_amount_million
    ?? awardedOnly.reduce((sum, item) => sum + (item.total_amount_million ?? 0), 0)

  return {
    id: String(report.company_id),
    name: report.company_profile.name_alias,
    logoSeed: report.company_profile.name_alias.slice(0, 1) || "기",
    industry: report.company_profile.ind_name ?? "업종 미상",
    location: report.company_profile.region ?? "지역 미상",
    founded: report.company_profile.founded_date
      ? Number(report.company_profile.founded_date.slice(0, 4))
      : null,
    employees: latestEmployment?.pension_enrolled ?? null,
    supportTotal:
      (report.support_summary.awarded_episodes ?? awardedOnly.length) === 0
        ? "지원대상 0건"
        : report.support_summary.missing_amount_count > 0 && awardedAmount === 0
          ? "금액 미상"
          : `${formatKrwMillion(awardedAmount)}${
              report.support_summary.missing_amount_count > 0
                ? ` + 미상 ${report.support_summary.missing_amount_count}건`
                : ""
            }`,
    financialUnit: "백만원",
    oneLiner:
      mainProduct
      ?? [report.company_profile.ksic11, report.company_profile.size, report.company_profile.biz_status]
        .filter(Boolean)
        .join(" · "),
    tags: report.company_profile.certifications,
    scoreBreakdown: [],
    strengths: goodChecks.map((check) => `${check.label}: ${check.value}`),
    risks: warningChecks.map((check) =>
      [check.label, check.value, check.note].filter(Boolean).join(" · "),
    ),
    financials: report.financial_series.map((point) => ({
      year: String(point.year),
      revenue: point.revenue,
      operatingProfit: point.op_profit,
      employees:
        report.employment_series.find((employment) => employment.year === point.year)
          ?.pension_enrolled ?? null,
    })),
    patents: report.technology_evidence.valid_patent_count,
    certifications: report.company_profile.certifications,
    creditGrade: null,
    debtRatio,
    currentRatio: metric(report, "current_ratio")?.value ?? null,
    revenueGrowthPct: metric(report, "revenue_growth")?.value ?? null,
    runwayMonths: null,
    report: {
      summary: brief?.lines.join("\n")
        ?? [
          `기준 ${report.as_of_fy}년 매출 ${formatKrwMillion(latestFinancial?.revenue ?? null)} · 전년비 ${formatPercent(revenueGrowth, { signed: true })}`,
          `영업이익률 ${formatPercent(operatingMargin)} · ${debtDisplay(debtRatio, latestFinancial?.equity ?? null)}`,
          `지원대상 ${report.support_summary.awarded_episodes ?? awardedOnly.length}건 · 중첩 ${report.support_summary.overlap_pairs.length}쌍 · 금액 확인 ${report.support_summary.missing_amount_count}건`,
        ].join("\n"),
      market:
        report.regional_context.status === "ok"
          ? `${report.regional_context.region_name ?? "해당 지역"} 사업체 ${
              report.regional_context.establishment_count?.toLocaleString("ko-KR") ?? "확인 불가"
            }개`
          : report.regional_context.reason ?? "적용 가능한 지역 통계가 없습니다.",
      technology: [
        `유효 특허 ${
          report.technology_evidence.valid_patent_count?.toLocaleString("ko-KR") ?? "확인 불가"
        }건`,
        `NTIS 과제 ${report.ntis_summary.project_count.toLocaleString("ko-KR")}건`,
        report.technology_evidence.has_corporate_lab ? "기업부설연구소" : null,
        report.technology_evidence.has_rd_dept ? "연구개발전담부서" : null,
      ].filter(Boolean).join(" · "),
      team:
        latestEmployment?.pension_enrolled === null || latestEmployment === undefined
          ? "고용 인원을 확인할 수 없습니다."
          : `${latestEmployment.year}년 국민연금 가입자 ${latestEmployment.pension_enrolled.toLocaleString("ko-KR")}명`
            + (latestEmployment.pension_hired != null && latestEmployment.pension_left != null
              ? ` · 입사 ${latestEmployment.pension_hired} · 퇴사 ${latestEmployment.pension_left}`
              : ""),
      finance:
        latestFinancial?.revenue === null || latestFinancial === undefined
          ? "최근 매출을 확인할 수 없습니다."
          : `${latestFinancial.year}년 매출 ${formatKrwMillion(latestFinancial.revenue)} · 영업이익 ${formatKrwMillion(latestFinancial.op_profit)} · ${debtDisplay(debtRatio, latestFinancial.equity)}`,
    },
    survivalPercentiles: report.survival_indicators
      .filter((indicator) => indicator.pctl !== null && (indicator.weight ?? 1) > 0)
      .map((indicator) => ({
        label: indicator.label,
        pctl: indicator.pctl as number,
        cohortLabel:
          indicator.cohort_level && indicator.cohort_n !== null
            ? `${cohortLabel(indicator.cohort_level)} (n=${indicator.cohort_n})`
            : undefined,
        higherIsBetter: indicator.direction !== "lower_is_better",
      })),
    supportHistory: awardedOnly.map((episode) => ({
      year: episode.selected_date
        ? Number(episode.selected_date.slice(0, 4))
        : report.as_of_fy,
      program: episode.program_name ?? episode.biz_type ?? "사업명 미상",
      amount: episode.total_amount_million,
    })),
    industryBenchmarks: report.external_benchmarks.flatMap((benchmark) => {
      const companyIndicator = metric(report, benchmark.metric_code)
      if (companyIndicator?.value === null || companyIndicator?.value === undefined) return []
      return [{
        label: benchmark.metric_label,
        company: companyIndicator.value,
        industry: benchmark.value,
        unit: benchmark.unit,
        context: `${benchmark.reference_year}년 · KSIC ${benchmark.ksic_code} · ${benchmark.company_size}`,
        higherIsBetter: companyIndicator.direction !== "lower_is_better",
      }]
    }),
    dueDiligence: {
      asOfYear: report.as_of_fy,
      roundId: report.round_id,
      dataQuality: report.data_quality.status,
      officerBrief: brief
        ? {
            lines: brief.lines,
            priorityChecks: brief.priority_checks,
            signalCounts: brief.signal_counts,
          }
        : undefined,
      summaryChecks: report.summary_checks,
      survivalIndicators: report.survival_indicators.map(mapIndicator),
      referenceIndicators: report.reference_indicators.map(mapIndicator),
      requirementResults: report.program_context?.requirement_results.map((requirement) => ({
        label: requirement.label,
        status: requirement.status,
        reason: requirement.reason,
        weight: requirement.weight,
      })) ?? [],
      dataWarnings: report.data_warnings,
      followUpQuestions: report.follow_up_questions,
      ntisProjectCount: report.ntis_summary.project_count,
      ntisFundingWon: report.ntis_summary.government_funding_won,
      evidenceIds: report.evidence.map((item) => item.evidence_id),
      evidenceItems: report.evidence.map((item) => {
        const linked = [...report.survival_indicators, ...report.reference_indicators]
          .find((indicator) => indicator.evidence_ids.includes(item.evidence_id))
        return {
          evidenceId: item.evidence_id,
          sourceFile: item.source_file,
          sourceSheet: item.source_sheet_page,
          sourceCell: item.source_row_cell,
          referenceYear: item.reference_year,
          rawValue: item.raw_value,
          normalizedValue: item.normalized_value,
          formula: item.formula,
          formulaVersion: item.formula_version,
          externalDatasetId: item.external_dataset_id,
          label: linked?.label,
        }
      }),
      supportAudit: {
        totalEpisodes: report.support_summary.total_episodes,
        awardedEpisodes: report.support_summary.awarded_episodes ?? awardedOnly.length,
        rejectedOrWithdrawn: report.support_summary.rejected_or_withdrawn ?? 0,
        recent3yrAwarded: report.support_summary.recent_3yr_awarded ?? awardedOnly.length,
        confirmedAmountMillion: report.support_summary.total_amount_million,
        awardedAmountMillion: awardedAmount,
        missingAmountCount: report.support_summary.missing_amount_count,
        zeroAmountCount: report.support_summary.zero_amount_count
          ?? report.support_summary.episode_list.filter(
            (episode) => episode.total_amount_million === 0,
          ).length,
        yearsReceived: report.support_summary.years_received,
        badges: report.support_summary.badges ?? [],
        samePurposeRepeats: (report.support_summary.same_purpose_repeats ?? []).map((item) => ({
          purpose: item.purpose,
          episodeCount: item.episode_count,
          years: item.years,
          totalAmountMillion: item.total_amount_million,
          programNames: item.program_names,
        })),
        repeatedPrograms,
        overlapPairs: report.support_summary.overlap_pairs.map((pair) => {
          const first = supportEpisodeMap.get(pair.ep1_id)
          const second = supportEpisodeMap.get(pair.ep2_id)
          return {
            firstProgram: first?.program_name ?? first?.biz_type ?? pair.ep1_id,
            secondProgram: second?.program_name ?? second?.biz_type ?? pair.ep2_id,
            overlapDays: pair.overlap_days,
            purposeRelation: pair.purpose_relation,
            firstAmountMillion: first?.total_amount_million ?? null,
            secondAmountMillion: second?.total_amount_million ?? null,
            evidenceIds: [`btp_support:${pair.ep1_id}`, `btp_support:${pair.ep2_id}`],
          }
        }),
        episodes: report.support_summary.episode_list.map((episode) => ({
          evidenceId: `btp_support:${episode.episode_id}`,
          selectedDate: episode.selected_date,
          startDate: episode.start_date ?? null,
          endDate: episode.end_date ?? null,
          program: episode.program_name ?? episode.biz_type ?? "사업명 미상",
          businessType: episode.biz_type,
          supportPurpose: episode.support_purpose ?? null,
          result: episode.result ?? null,
          isAwarded: episode.is_awarded,
          amountMillion: episode.total_amount_million,
          amountFlag: episode.amount_flag,
          components: (episode.components ?? []).map((component) => ({
            supportType: component.support_type,
            supportItem: component.support_item,
            amountMillion: component.amount_million,
          })),
        })),
      },
      observedChanges: (report.observed_changes_after_support ?? []).map((item) => ({
        episodeId: item.episode_id,
        programName: item.program_name,
        selectedDate: item.selected_date,
        preFy: item.pre_fy,
        postFy: item.post_fy,
        revenueChangePct: item.revenue_change_pct,
        employmentChange: item.employment_change,
        newPatentCount: item.new_patent_count,
        status: item.status,
        note: item.note,
      })),
      financialDetails: report.financial_series.map((point) => ({
        year: point.year,
        netIncomeMillion: point.net_income,
        assetsMillion: point.assets,
        liabilitiesMillion: point.liabilities,
        equityMillion: point.equity,
        operatingMarginPct: point.op_margin_pct,
      })),
      employmentDetails: report.employment_series.map((point) => ({
        year: point.year,
        enrolled: point.pension_enrolled,
        hired: point.pension_hired,
        left: point.pension_left,
        averageSalaryMillion: point.avg_salary_million,
      })),
      technology: {
        corporateLab: report.technology_evidence.has_corporate_lab,
        rdDepartment: report.technology_evidence.has_rd_dept,
        researcherCount: report.technology_evidence.researcher_count,
        patentRegistered: report.technology_evidence.patent_registered,
        patentApplied: report.technology_evidence.patent_applied,
        validPatentCount: report.technology_evidence.valid_patent_count,
        rdIntensityPct: report.technology_evidence.rd_intensity_pct,
      },
      similarCompanies: report.similar_companies.map((item) => ({
        companyId: item.company_id,
        industry: item.ind_name ?? "업종 미상",
        size: item.size ?? "규모 미분류",
        region: item.region ?? "지역 미상",
        distance: item.distance,
        comparedMetrics: item.compared_metrics,
      })),
      regionalContext: {
        status: report.regional_context.status,
        reason: report.regional_context.reason,
        regionName: report.regional_context.region_name,
        referenceYear: report.regional_context.reference_year,
        establishmentCount: report.regional_context.establishment_count,
        employeeCount: report.regional_context.employee_count,
        employeesPerEstablishment: report.regional_context.employees_per_establishment,
      },
    },
  }
}
