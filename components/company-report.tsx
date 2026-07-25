"use client"

import { useCallback, useRef, useState } from "react"
import {
  ArrowLeft,
  MapPin,
  Users,
  Calendar,
  Award,
  MessageSquareQuote,
  ShieldAlert,
  CheckCircle2,
  Building2,
  CheckSquare,
  Square,
  Info,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { TrendBars, MultiAreaLine, RadarChart, PercentileStrip, SupportDots, SupportTimeline, BenchmarkBars } from "@/components/charts"
import { InvestmentSim } from "@/components/investment-sim"
import { FinancialRiskBadge } from "@/components/financial-risk-badge"
import { type Company } from "@/lib/mock-data"
import { assessFinancialRisk } from "@/lib/risk"
import { formatKrwMillion, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

type Tab = "overview" | "financials" | "support" | "evaluation" | "forecast"

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "데이터 요약" },
  { id: "financials", label: "재무·고용" },
  { id: "support", label: "중복수혜·지원이력" },
  { id: "evaluation", label: "비교 관찰" },
  { id: "forecast", label: "모의 지원 시나리오" },
]

export function CompanyReport({
  company,
  onBack,
  onAsk,
  picked,
  onToggleShortlist,
}: {
  company: Company
  onBack: () => void
  onAsk: (context: string) => void
  picked: boolean
  onToggleShortlist: () => void
}) {
  const [tab, setTab] = useState<Tab>("overview")
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null)
  const [evidenceId, setEvidenceId] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const evidenceItems = company.dueDiligence?.evidenceItems ?? []
  const activeEvidence = evidenceItems.find((item) => item.evidenceId === evidenceId) ?? null

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection()
    const text = sel?.toString().trim()
    if (!text || text.length < 8 || !contentRef.current) {
      setSelection(null)
      return
    }
    const range = sel!.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const containerRect = contentRef.current.getBoundingClientRect()
    setSelection({
      text,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top,
    })
  }, [])

  const askSelection = () => {
    if (selection) {
      onAsk(selection.text)
      setSelection(null)
      window.getSelection()?.removeAllRanges()
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          기업 목록으로
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant={picked ? "default" : "outline"}
            size="sm"
            onClick={onToggleShortlist}
            className="gap-1.5"
          >
            {picked ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            {picked ? "즐겨찾기됨" : "즐겨찾기에 추가"}
          </Button>
        </div>
      </div>

      {/* Header */}
      <section className="mt-4 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary">
              {company.logoSeed}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-foreground">{company.name}</h1>
                <FinancialRiskBadge company={company} />
              </div>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">{company.oneLiner}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {company.industry}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {company.location}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {company.employees === null
                    ? "임직원 자료 없음"
                    : `${company.employees.toLocaleString("ko-KR")}명`}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {company.founded === null ? "설립연도 자료 없음" : `${company.founded}년 설립`}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {company.tags.map((t) => (
                  <span key={t} className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 px-5 py-4 text-right">
            <p className="text-xs text-muted-foreground">재무 기준연도 · 데이터 신뢰도</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {company.dueDiligence?.asOfYear ?? company.financials.at(-1)?.year ?? "확인 불가"}
            </p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {company.dueDiligence?.dataQuality === "high"
                ? "신뢰도 높음"
                : company.dueDiligence?.dataQuality === "medium"
                  ? "신뢰도 보통"
                  : company.dueDiligence?.dataQuality === "low"
                    ? "신뢰도 낮음"
                    : "신뢰도 미산정"}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5 sm:grid-cols-4">
          {[
            { label: "확인된 기존 지원금", value: company.supportTotal },
            {
              label: `최근 매출${company.financials.at(-1)?.year ? ` · ${company.financials.at(-1)?.year}년` : ""}`,
              value: company.financials.at(-1)?.revenue == null
                ? null
                : formatKrwMillion(company.financials.at(-1)?.revenue ?? null),
            },
            {
              label: "유효 특허",
              value: company.patents === null
                ? null
                : `${company.patents.toLocaleString("ko-KR")}건`,
            },
            {
              label: "국민연금 가입자",
              value: company.employees === null
                ? null
                : `${company.employees.toLocaleString("ko-KR")}명`,
            },
          ].filter((item): item is { label: string; value: string } => item.value !== null).map((s) => (
            <div key={s.label}>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      {tab !== "forecast" && (
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          <MessageSquareQuote className="h-4 w-4 text-primary" />
          리포트 본문에서 궁금한 문장을 <span className="font-medium text-foreground">드래그</span>하면 AI 에이전트에게 근거와 함께 질문할 수 있습니다.
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t.id ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {tab === t.id && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div ref={contentRef} className="relative mt-6" onMouseUp={handleMouseUp}>
        {selection && (
          <button
            onClick={askSelection}
            style={{ left: selection.x, top: selection.y - 8 }}
            className="absolute z-20 flex -translate-x-1/2 -translate-y-full items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-lg animate-in fade-in zoom-in-95"
          >
            <MessageSquareQuote className="h-3.5 w-3.5" />
            이 부분 질문하기
          </button>
        )}

        {tab === "overview" && <OverviewTab company={company} />}
        {tab === "financials" && (
          <FinancialsTab company={company} onOpenEvidence={setEvidenceId} />
        )}
        {tab === "support" && <SupportAuditTab company={company} />}
        {tab === "evaluation" && <EvaluationTab company={company} />}
        {tab === "forecast" && <InvestmentSim company={company} />}
      </div>

      {activeEvidence && (
        <EvidencePanel evidence={activeEvidence} onClose={() => setEvidenceId(null)} />
      )}
    </div>
  )
}

function EvidencePanel({
  evidence,
  onClose,
}: {
  evidence: NonNullable<NonNullable<Company["dueDiligence"]>["evidenceItems"]>[number]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-lg rounded-xl border border-border bg-card p-5 shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">원천 근거</p>
          <h3 className="mt-0.5 text-sm font-semibold text-foreground">
            {evidence.label ?? evidence.evidenceId}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="근거 닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 text-sm">
        <dt className="text-muted-foreground">원천</dt>
        <dd className="text-foreground">{evidence.sourceFile}</dd>
        <dt className="text-muted-foreground">시트</dt>
        <dd className="text-foreground">{evidence.sourceSheet ?? "—"}</dd>
        <dt className="text-muted-foreground">필드</dt>
        <dd className="text-foreground">{evidence.sourceCell ?? "—"}</dd>
        <dt className="text-muted-foreground">기준연도</dt>
        <dd className="tabular-nums text-foreground">{evidence.referenceYear ?? "—"}</dd>
        <dt className="text-muted-foreground">값</dt>
        <dd className="tabular-nums text-foreground">
          {evidence.normalizedValue ?? evidence.rawValue ?? "—"}
        </dd>
        <dt className="text-muted-foreground">산식</dt>
        <dd className="text-foreground">{evidence.formula ?? "원천값 그대로 사용"}</dd>
        {evidence.externalDatasetId && (
          <>
            <dt className="text-muted-foreground">외부비교</dt>
            <dd className="text-foreground">{evidence.externalDatasetId}</dd>
          </>
        )}
      </dl>
    </div>
  )
}

function ReportBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-2.5 font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-foreground/90 selection:bg-primary/25">{children}</p>
    </div>
  )
}

function OverviewTab({ company }: { company: Company }) {
  const due = company.dueDiligence
  const employment = due?.employmentDetails.at(-1)
  const tech = due?.technology
  const brief = due?.officerBrief
  const primaryCodes = new Set(["eligibility", "survival", "capacity", "post_support", "support_focus", "data_quality"])
  const checks = (due?.summaryChecks ?? []).filter(
    (check) => !check.code || primaryCodes.has(check.code) || check.code === "finance",
  )
  // 화면 6칸: 공고·생존·수행·지원후·지원집중·데이터 (+재무는 7번째 가능)
  const displayChecks = checks.filter((check) => check.code !== "revenue_scale").slice(0, 7)
  const checkTone = {
    green: "border-success/30 bg-success/5",
    yellow: "border-warning/30 bg-warning/5",
    red: "border-destructive/30 bg-destructive/5",
    gray: "border-border bg-secondary/40",
  }
  const statusLabel = (status: string) =>
    status === "red" ? "긴급" : status === "yellow" ? "주의" : status === "gray" ? "확인 대기" : "특이신호 없음"

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground">30초 데이터 점검</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              재무·생존·중복수혜 신호를 먼저 확인합니다.
            </p>
          </div>
          {brief && (
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">긴급 {brief.signalCounts.red}</span>
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-warning">주의 {brief.signalCounts.yellow}</span>
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-success">특이없음 {brief.signalCounts.green}</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">자료부족 {brief.signalCounts.gray}</span>
            </div>
          )}
        </div>
        {displayChecks.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {displayChecks.map((check) => (
              <div key={`${check.code ?? check.label}`} className={cn("rounded-lg border p-4", checkTone[check.status])}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">{check.label}</p>
                  <span className="text-[11px] font-semibold text-foreground">{statusLabel(check.status)}</span>
                </div>
                <p className="mt-1.5 text-sm font-semibold leading-snug text-foreground">{check.value}</p>
                {check.note && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{check.note}</p>}
              </div>
            ))}
          </div>
        )}
        {brief && brief.lines.length > 0 && (
          <div className="mt-4 rounded-lg border border-border bg-secondary/30 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground">한 줄 요약</p>
            <ul className="mt-2 space-y-1.5">
              {brief.lines.map((line) => (
                <li key={line} className="text-sm leading-relaxed text-foreground">• {line}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
            <CheckCircle2 className="h-4.5 w-4.5 text-success" />
            관찰 강점
          </h3>
          {company.strengths.length > 0 ? (
            <ul className="space-y-2.5">
              {company.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">특이 강점 신호가 없습니다.</p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
            <ShieldAlert className="h-4.5 w-4.5 text-warning" />
            확인 필요 신호
          </h3>
          {company.risks.length > 0 ? (
            <ul className="space-y-2.5">
              {company.risks.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">현재 임계치를 넘은 확인 신호는 없습니다.</p>
          )}
        </div>
      </div>

      {due && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-1 font-semibold text-foreground">사업수행 기반 원천 필드</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            고용·연구조직·특허·국가R&D 원천 필드
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              {
                label: "고용 순증감",
                value: employment?.hired == null || employment.left == null
                  ? null
                  : `${employment.hired - employment.left > 0 ? "+" : ""}${(
                      employment.hired - employment.left
                    ).toLocaleString("ko-KR")}명`,
                sub: employment ? `${employment.year}년 입사 ${employment.hired ?? "—"} · 퇴사 ${employment.left ?? "—"}` : "",
              },
              {
                label: "평균 보수",
                value: employment?.averageSalaryMillion == null
                  ? null
                  : `${employment.averageSalaryMillion.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}백만원`,
                sub: employment ? `${employment.year}년 국민연금 기반` : "",
              },
              {
                label: "연구전담 인력",
                value: tech?.researcherCount == null
                  ? null
                  : `${tech.researcherCount.toLocaleString("ko-KR")}명`,
                sub: [tech?.corporateLab ? "기업부설연구소" : null, tech?.rdDepartment ? "연구개발전담부서" : null]
                  .filter(Boolean).join(" · ") || "연구조직 등록 미확인",
              },
              {
                label: "유효 특허",
                value: tech?.validPatentCount == null ? null : `${tech.validPatentCount.toLocaleString("ko-KR")}건`,
                sub: `당해 등록 ${tech?.patentRegistered ?? "—"} · 출원 ${tech?.patentApplied ?? "—"}`,
              },
              {
                label: "NTIS 수행 과제",
                value: `${due.ntisProjectCount.toLocaleString("ko-KR")}건`,
                sub: "과제책임자·참여기관 매칭",
              },
              {
                label: "NTIS 정부출연금",
                value: due.ntisFundingWon > 0 ? formatKrwMillion(due.ntisFundingWon / 1_000_000) : "0원 또는 미확인",
                sub: "기준연도 확인 가능한 과제 합계",
              },
            ].filter((item): item is { label: string; value: string; sub: string } => item.value !== null).map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-secondary/40 p-4">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-base font-semibold tabular-nums text-foreground">{item.value}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {company.supportHistory && company.supportHistory.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-1 font-semibold text-foreground">지원대상 이력 타임라인</h3>
          <SupportDots events={company.supportHistory} />
        </div>
      )}

      {due && (due.dataWarnings.length > 0 || due.followUpQuestions.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-3 font-semibold text-foreground">데이터 주의·한계</h3>
            {due.dataWarnings.length > 0 ? (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {due.dataWarnings.map((warning) => <li key={warning}>• {warning}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">별도 경고 없음</p>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-3 font-semibold text-foreground">추가 확인 질문</h3>
            <div className="space-y-3">
              {due.followUpQuestions.map((question, index) => {
                const match = question.match(/^\[([^\]]+)\]\s*(.*)$/)
                const label = match?.[1] ?? "확인"
                const body = match?.[2] ?? question
                const critical = label.includes("필수")
                return (
                  <div key={question} className={cn(
                    "rounded-lg border p-3.5",
                    critical ? "border-warning/30 bg-warning/5" : "border-border bg-secondary/30",
                  )}>
                    <div className="flex items-start gap-3">
                      <span className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        critical ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary",
                      )}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                        <p className="mt-1 text-sm leading-relaxed text-foreground">{body}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FinancialsTab({ company, onOpenEvidence }: { company: Company; onOpenEvidence?: (id: string) => void }) {
  const last = company.financials[company.financials.length - 1]
  const lastYear = last?.year ?? "기준연도 미상"
  const risk = assessFinancialRisk(company)
  const previous = company.financials.at(-2)
  const financialDetail = company.dueDiligence?.financialDetails.at(-1)
  const formatMetric = (value: number | null, suffix: string) =>
    value === null
      ? "자료 없음"
      : `${value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}${suffix}`
  const formatMoney = (value: number | null) => formatKrwMillion(value)
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <ShieldAlert className="h-4.5 w-4.5 text-primary" />
            생존·재무 핵심 지표
          </h3>
          <FinancialRiskBadge company={company} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "CRETOP 신용등급", value: company.creditGrade },
            { label: "부채 상환부담 · 부채비율", value: company.debtRatio == null ? null : formatMetric(company.debtRatio, "%") },
            {
              label: "최근 매출 증감",
              value: company.revenueGrowthPct == null
                ? null
                : formatPercent(company.revenueGrowthPct, { signed: true }),
            },
            {
              label: `${lastYear} 영업손익`,
              value: last?.operatingProfit == null ? null : formatMoney(last.operatingProfit),
            },
          ].filter((item): item is { label: string; value: string } => item.value !== null).map((k) => (
            <div key={k.label} className="rounded-lg border border-border bg-secondary/40 p-3.5">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{k.value}</p>
            </div>
          ))}
        </div>
        {risk.signals.length > 0 && (
          <ul className="mt-4 space-y-2">
            {risk.signals.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                {s}
              </li>
            ))}
          </ul>
        )}
        {risk.signals.length === 0 && risk.unavailable.length === 0 && (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            현재 규칙에서 임계치를 넘은 신호는 없지만, 이는 지원 기간 중 생존이나 상환능력을 보장하지 않습니다.
          </p>
        )}
      </div>

      {company.dueDiligence?.survivalIndicators && company.dueDiligence.survivalIndicators.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-1 font-semibold text-foreground">생존 관련 핵심 지표</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            동종 위치와 AUC로 우선 확인 순서를 잡습니다.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">지표</th>
                  <th className="py-2 pr-3 font-medium">값</th>
                  <th className="py-2 pr-3 font-medium">동종 위치</th>
                  <th className="py-2 pr-3 font-medium">AUC</th>
                  <th className="py-2 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {company.dueDiligence.survivalIndicators.map((row) => {
                  const evidenceKey = company.dueDiligence?.evidenceItems?.find(
                    (item) => item.label === row.label || item.evidenceId.includes(row.code),
                  )?.evidenceId
                  return (
                  <tr key={row.code} className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-medium text-foreground">
                      <span className="inline-flex items-center gap-1">
                        {row.label}
                        {evidenceKey && onOpenEvidence && (
                          <button
                            type="button"
                            onClick={() => onOpenEvidence(evidenceKey)}
                            className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-primary"
                            aria-label={`${row.label} 근거`}
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums text-foreground">
                      {row.value === null
                        ? "자료 없음"
                        : `${row.value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}${row.unit}`}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">
                      {row.pctl === null
                        ? "—"
                        : `${row.pctl.toFixed(0)}백분위${row.cohortLabel ? ` · ${row.cohortLabel}` : ""}`}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums text-muted-foreground">
                      {row.auc == null ? "—" : row.auc.toFixed(3)}
                    </td>
                    <td className="py-2.5 text-muted-foreground">
                      {row.flagReason ?? (row.status === "ok" ? "특이신호 없음" : row.status)}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {company.dueDiligence?.referenceIndicators && company.dueDiligence.referenceIndicators.length > 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card/80 p-6">
          <h3 className="mb-1 font-semibold text-muted-foreground">참고지표</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            부채비율·영업이익률·R&D 등 재무 상태 참고
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {company.dueDiligence.referenceIndicators.map((row) => {
              const evidenceKey = company.dueDiligence?.evidenceItems?.find(
                (item) => item.label === row.label || item.evidenceId.includes(row.code),
              )?.evidenceId
              return (
              <div key={row.code} className="rounded-lg border border-border bg-secondary/30 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  {evidenceKey && onOpenEvidence && (
                    <button
                      type="button"
                      onClick={() => onOpenEvidence(evidenceKey)}
                      className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-primary"
                      aria-label={`${row.label} 근거`}
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                  {row.value === null
                    ? "자료 없음"
                    : `${row.value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}${row.unit}`}
                </p>
                {row.flagReason && (
                  <p className="mt-1 text-[11px] text-muted-foreground">{row.flagReason}</p>
                )}
              </div>
              )
            })}
          </div>
        </div>
      )}

      {financialDetail && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-1 font-semibold text-foreground">재무상태표 기반 완충력</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            자산·부채·자본과 당기순손익을 함께 보며 지원기간 중 손실 흡수 여력을 점검합니다.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "자산총계", value: formatKrwMillion(financialDetail.assetsMillion) },
              { label: "부채총계", value: formatKrwMillion(financialDetail.liabilitiesMillion) },
              { label: "자본총계", value: formatKrwMillion(financialDetail.equityMillion) },
              { label: "당기순손익", value: formatKrwMillion(financialDetail.netIncomeMillion) },
              { label: "영업이익률", value: formatPercent(financialDetail.operatingMarginPct) },
            ].filter((item, index) => [
              financialDetail.assetsMillion,
              financialDetail.liabilitiesMillion,
              financialDetail.equityMillion,
              financialDetail.netIncomeMillion,
              financialDetail.operatingMarginPct,
            ][index] !== null).map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-secondary/40 p-3.5">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Combined line chart: revenue + op profit */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">매출·영업손익 추이</h3>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: "var(--chart-1)" }} />
              매출 ({company.financialUnit})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: "var(--chart-3)" }} />
              영업이익 ({company.financialUnit})
            </span>
          </div>
        </div>
        <MultiAreaLine
          xLabels={company.financials.map((f) => f.year)}
          series={[
            {
              label: "매출",
              values: company.financials.map((f) => f.revenue),
              colorVar: "--chart-1",
              fill: true,
            },
            {
              label: "영업이익",
              values: company.financials.map((f) => f.operatingProfit),
              colorVar: "--chart-3",
              fill: false,
            },
          ]}
          unit={company.financialUnit}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold text-foreground">연도별 매출 규모 ({company.financialUnit})</h3>
          <TrendBars
            data={company.financials.map((f) => ({ label: f.year, value: f.revenue }))}
            colorVar="--chart-1"
            formatValue={(value) =>
              value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })
            }
          />
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold text-foreground">국민연금 가입자 추이</h3>
          <TrendBars data={company.financials.map((f) => ({ label: f.year, value: f.employees }))} colorVar="--chart-2" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: `${lastYear} 매출 · 사업규모`, value: formatMoney(last?.revenue ?? null) },
          { label: `${lastYear} 영업손익 · 현금창출 대용`, value: formatMoney(last?.operatingProfit ?? null) },
          {
            label: `${lastYear} 사업 수행인력`,
            value: last?.employees == null
              ? "자료 없음"
              : `${last.employees.toLocaleString("ko-KR")}명`,
          },
          {
            label: previous ? `${previous.year}→${lastYear} 매출 변화` : "매출 변화",
            value: company.revenueGrowthPct == null
              ? "비교 불가"
              : formatPercent(company.revenueGrowthPct, { signed: true }),
          },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{k.value}</p>
          </div>
        ))}
      </div>

      {company.industryBenchmarks && company.industryBenchmarks.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-foreground">업종평균과 비교한 재무 상태</h3>
            <span className="rounded bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">한국은행 업종지표</span>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            기업값과 같은 업종의 평균 차이, 선정 심사에서 확인할 의미를 함께 표시합니다.
          </p>
          <BenchmarkBars items={company.industryBenchmarks} />
        </div>
      )}

      {company.survivalPercentiles && company.survivalPercentiles.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-1 font-semibold text-foreground">실데이터 동종기업 내 상대 위치</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            KSIC·기업규모 코호트의 표본수와 함께 보는 상대 지표이며 절대평가 점수가 아닙니다.
          </p>
          <PercentileStrip items={company.survivalPercentiles} />
        </div>
      )}

      <ReportBlock title="재무 관찰 메모 (원천 수치)">{company.report.finance}</ReportBlock>
    </div>
  )
}

function SupportAuditTab({ company }: { company: Company }) {
  const audit = company.dueDiligence?.supportAudit
  const observed = company.dueDiligence?.observedChanges ?? []
  if (!audit) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        지원사업 선정 이력 연계 전입니다.
      </div>
    )
  }
  const reviewCount = audit.missingAmountCount + audit.zeroAmountCount
  const changeLabel: Record<string, string> = {
    improved: "변화 관찰",
    partial: "일부 관찰",
    unchanged: "변화 미확인",
    insufficient: "산출 불가",
    overlapped: "다른 지원과 중첩",
  }
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-1 font-semibold text-foreground">중복수혜 점검 요약</h3>
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          횟수·기간·목적·금액을 분리해 확인합니다.
        </p>
        {audit.badges.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {audit.badges.map((badge) => (
              <span key={badge} className="rounded-full border border-border bg-secondary/50 px-2.5 py-0.5 text-xs text-foreground">
                {badge}
              </span>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "최근 3년 수혜", value: `${audit.recent3yrAwarded.toLocaleString("ko-KR")}건` },
            { label: "지원대상 누적", value: `${audit.awardedEpisodes.toLocaleString("ko-KR")}건` },
            { label: "확인 지원금", value: formatKrwMillion(audit.awardedAmountMillion) },
            {
              label: "기간 중첩",
              value: audit.overlapPairs.length > 0 ? `${audit.overlapPairs.length}쌍` : "없음",
            },
            {
              label: "동일 목적 반복",
              value: audit.samePurposeRepeats.length > 0
                ? `${audit.samePurposeRepeats[0].purpose} ${audit.samePurposeRepeats[0].episodeCount}회`
                : "없음",
            },
            {
              label: "탈락·포기",
              value: audit.rejectedOrWithdrawn > 0
                ? `${audit.rejectedOrWithdrawn}건`
                : "0건",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border bg-secondary/40 p-3.5">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
        {reviewCount > 0 && (
          <p className="mt-4 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-foreground">
            금액 확인 대상: 미상 {audit.missingAmountCount}건 · 원천값 0원 {audit.zeroAmountCount}건
          </p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-1 font-semibold text-foreground">수행기간 타임라인</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          지원대상 기준. 중첩 구간은 테두리로 표시합니다.
        </p>
        <SupportTimeline
          episodes={audit.episodes.map((episode) => ({
            id: episode.evidenceId,
            program: episode.program,
            purpose: episode.supportPurpose,
            startDate: episode.startDate ?? null,
            endDate: episode.endDate ?? null,
            selectedDate: episode.selectedDate,
            amountMillion: episode.amountMillion,
            isAwarded: episode.isAwarded,
            overlap: audit.overlapPairs.some(
              (pair) => pair.evidenceIds.includes(episode.evidenceId),
            ),
          }))}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-3 font-semibold text-foreground">동일 목적 반복</h3>
          {audit.samePurposeRepeats.length > 0 ? (
            <div className="space-y-3">
              {audit.samePurposeRepeats.map((item) => (
                <div key={item.purpose} className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                  <p className="text-sm font-semibold text-foreground">{item.purpose}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.episodeCount}회 · {item.years.join(", ")}년 · 누적 {formatKrwMillion(item.totalAmountMillion)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{item.programNames.join(" · ")}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">정규화 목적 기준 반복 수혜가 없습니다.</p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-3 font-semibold text-foreground">사업 수행기간 중첩</h3>
          {audit.overlapPairs.length > 0 ? (
            <div className="space-y-3">
              {audit.overlapPairs.map((pair, index) => (
                <div key={`${pair.firstProgram}-${pair.secondProgram}-${index}`} className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                  <p className="text-sm font-semibold text-foreground">
                    {pair.firstProgram} ↔ {pair.secondProgram}
                  </p>
                  <p className="mt-1 text-sm text-foreground">수행기간 {pair.overlapDays}일 중첩</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    목적 관계: {pair.purposeRelation ?? "미상"} · 금액 {formatKrwMillion(pair.firstAmountMillion)} · {formatKrwMillion(pair.secondAmountMillion)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">30일 이상 겹친 지원대상 수행기간은 없습니다.</p>
          )}
        </div>
      </div>

      {observed.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-1 font-semibold text-foreground">지원 후 관찰 변화</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            지원 전후 관측값 (매출·고용·신규 특허)
          </p>
          <div className="divide-y divide-border">
            {observed.map((item) => (
              <div key={item.episodeId} className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_90px_90px_90px_100px]">
                <div>
                  <p className="font-medium text-foreground">{item.programName ?? "사업명 미상"}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.selectedDate ?? "선정일 미상"} · {item.preFy ?? "—"}→{item.postFy ?? "—"}년
                  </p>
                </div>
                <p className="tabular-nums text-muted-foreground">
                  매출 {item.revenueChangePct == null ? "—" : `${item.revenueChangePct > 0 ? "+" : ""}${item.revenueChangePct}%`}
                </p>
                <p className="tabular-nums text-muted-foreground">
                  고용 {item.employmentChange == null ? "—" : `${item.employmentChange > 0 ? "+" : ""}${item.employmentChange}`}
                </p>
                <p className="tabular-nums text-muted-foreground">
                  특허 {item.newPatentCount ?? "—"}
                </p>
                <p className="text-xs font-medium text-foreground">{changeLabel[item.status] ?? item.status}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-3 font-semibold text-foreground">지원 원장 (episode)</h3>
        <div className="divide-y divide-border">
          {audit.episodes.map((episode) => (
            <div key={episode.evidenceId} className="py-3">
              <div className="grid gap-2 text-sm sm:grid-cols-[110px_1fr_120px_110px] sm:items-start">
                <span className="tabular-nums text-muted-foreground">{episode.selectedDate ?? "선정일 미확인"}</span>
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-medium text-foreground">{episode.program}</p>
                    {episode.result && (
                      <span className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium",
                        episode.isAwarded
                          ? "bg-success/10 text-success"
                          : "bg-secondary text-muted-foreground",
                      )}>
                        {episode.result}
                      </span>
                    )}
                    {episode.supportPurpose && (
                      <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground">
                        {episode.supportPurpose}
                      </span>
                    )}
                  </div>
                  {(episode.startDate || episode.endDate) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      수행 {episode.startDate ?? "?"} ~ {episode.endDate ?? "?"}
                    </p>
                  )}
                  {episode.components && episode.components.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                      {episode.components.map((component, idx) => (
                        <li key={idx}>
                          · {component.supportType ?? "유형 미상"}
                          {component.supportItem && component.supportItem !== "비대상"
                            ? ` · ${component.supportItem.slice(0, 60)}${component.supportItem.length > 60 ? "…" : ""}`
                            : ""}
                          {component.amountMillion != null ? ` · ${formatKrwMillion(component.amountMillion)}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{episode.businessType ?? "—"}</span>
                <span className="text-left font-semibold tabular-nums text-foreground sm:text-right">
                  {episode.amountMillion === null
                    ? "금액 미상"
                    : episode.amountMillion === 0
                      ? "원천값 0원"
                      : formatKrwMillion(episode.amountMillion)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EvaluationTab({ company }: { company: Company }) {
  const checks = (company.dueDiligence?.summaryChecks ?? []).filter(check => check.status !== "gray")
  const requirements = company.dueDiligence?.requirementResults ?? []
  const automaticRequirements = requirements.filter(requirement => requirement.status !== "unknown")
  const manualRequirements = requirements.filter(requirement => requirement.status === "unknown")
  const due = company.dueDiligence
  const checkTone = {
    green: "border-success/30 bg-success/5",
    yellow: "border-warning/30 bg-warning/5",
    red: "border-destructive/30 bg-destructive/5",
    gray: "border-border bg-secondary/40",
  }
  return (
    <div className="space-y-4">
      {checks.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-1 font-semibold text-foreground">데이터 점검 체크리스트</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            신청서·증빙에서 재확인할 우선순위 신호입니다.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {checks.map((check) => (
              <div key={check.label} className={cn("rounded-lg border p-4", checkTone[check.status])}>
                <p className="text-xs text-muted-foreground">{check.label}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{check.value}</p>
                {check.note && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{check.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {company.scoreBreakdown.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 font-semibold text-foreground">공고 평가항목별 근거 점검</h3>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="shrink-0">
            <RadarChart
              axes={company.scoreBreakdown.map((s) => ({ label: s.label, value: s.score }))}
              size={220}
              colorVar="--chart-1"
            />
          </div>
          <div className="flex-1 space-y-4">
            {company.scoreBreakdown.map((s) => (
              <div key={s.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-foreground">
                    {s.label} <span className="text-xs text-muted-foreground">· 가중치 {s.weight}%</span>
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">{s.score}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${s.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      )}
      {requirements.length > 0 ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground">공고 자격·배제요건 점검</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            기업 데이터로 확인되는 항목과 신청서·현장 확인 항목을 분리했습니다.
          </p>
          {automaticRequirements.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {automaticRequirements.map((requirement) => (
                <div key={requirement.label} className={cn(
                  "rounded-lg border p-4",
                  requirement.status === "met"
                    ? "border-success/30 bg-success/5"
                    : "border-destructive/30 bg-destructive/5",
                )}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{requirement.label}</p>
                    <span className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                      requirement.status === "met"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive",
                    )}>
                      {requirement.status === "met" ? "데이터 충족" : "요건 재검토"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{requirement.reason}</p>
                </div>
              ))}
            </div>
          )}
          {manualRequirements.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">신청서·증빙 확인 체크리스트</p>
                <span className="text-xs text-muted-foreground">{manualRequirements.length}개 항목</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {manualRequirements.map((requirement) => (
                  <div key={requirement.label} className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/25 px-3.5 py-3">
                    <span className="h-4 w-4 shrink-0 rounded border border-muted-foreground/40 bg-background" />
                    <p className="text-sm text-foreground">{requirement.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
          연결된 공고가 없어 자격·배제요건 판정은 생략했습니다. 현재는 기업 자체 재무·고용·지원 이력만으로 실사 우선순위를 제공합니다.
        </div>
      )}
      {due && due.similarCompanies.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-1 font-semibold text-foreground">유사기업 비교 관찰</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            KSIC·기업규모·재무 거리 기준 유사기업입니다.
          </p>
          <div className="space-y-2">
            {due.similarCompanies.map((item) => (
              <div key={item.companyId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">기업_{item.companyId}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.industry} · {item.size} · {item.region}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-foreground">재무·고용 추이 유사</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.comparedMetrics.map(metric => ({
                      revenue: "매출",
                      employees: "고용",
                      operating_margin: "영업이익률",
                      debt_ratio: "부채비율",
                    }[metric] ?? metric)).join(" · ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {due && (
        <div className="grid gap-4 md:grid-cols-2">
          {due.regionalContext.status === "ok" && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-2 font-semibold text-foreground">지역 산업기반</h3>
              <div className="space-y-1 text-sm text-foreground">
                <p>{due.regionalContext.regionName} · {due.regionalContext.referenceYear}년</p>
                <p>
                  사업체 {due.regionalContext.establishmentCount?.toLocaleString("ko-KR")}개 · 종사자 {due.regionalContext.employeeCount?.toLocaleString("ko-KR")}명
                </p>
                <p>사업체당 종사자 {due.regionalContext.employeesPerEstablishment?.toLocaleString("ko-KR")}명</p>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
          <Award className="h-4.5 w-4.5 text-primary" />
          사업 수행·기술개발 기반
        </h3>
        <div className="flex flex-wrap gap-2">
          {company.certifications.map((c) => (
            <span key={c} className="rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm text-foreground">
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
