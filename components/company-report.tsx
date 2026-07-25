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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { TrendBars, MultiAreaLine, RadarChart, PercentileStrip, SupportDots, BenchmarkBars } from "@/components/charts"
import { InvestmentSim } from "@/components/investment-sim"
import { FinancialRiskBadge } from "@/components/financial-risk-badge"
import { type Company } from "@/lib/mock-data"
import { assessFinancialRisk } from "@/lib/risk"
import { cn } from "@/lib/utils"

type Tab = "overview" | "financials" | "evaluation" | "forecast"

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "기업 개요" },
  { id: "financials", label: "재무 분석" },
  { id: "evaluation", label: "평가 상세" },
  { id: "forecast", label: "모의투자 시나리오" },
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
  const contentRef = useRef<HTMLDivElement>(null)

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
                  {company.employees}명
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {company.founded}년 설립
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
            <p className="text-xs text-muted-foreground">데이터 기준연도</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {company.financials.at(-1)?.year ?? "확인 불가"}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5 sm:grid-cols-4">
          {[
            { label: "누적 지원금", value: company.supportTotal },
            { label: "최근 매출", value: company.financials.at(-1)?.revenue == null ? "자료 없음" : `${company.financials.at(-1)?.revenue}${company.financialUnit}` },
            { label: "등록 특허", value: `${company.patents}건` },
            { label: "임직원", value: `${company.employees}명` },
          ].map((s) => (
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
        {tab === "financials" && <FinancialsTab company={company} />}
        {tab === "evaluation" && <EvaluationTab company={company} />}
        {tab === "forecast" && <InvestmentSim company={company} />}
      </div>
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
  return (
    <div className="space-y-4">
      <ReportBlock title="종합 요약">{company.report.summary}</ReportBlock>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
            <CheckCircle2 className="h-4.5 w-4.5 text-success" />
            강점
          </h3>
          <ul className="space-y-2.5">
            {company.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90 selection:bg-primary/25">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
            <ShieldAlert className="h-4.5 w-4.5 text-warning" />
            리스크
          </h3>
          <ul className="space-y-2.5">
            {company.risks.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90 selection:bg-primary/25">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {company.supportHistory && company.supportHistory.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-3 font-semibold text-foreground">공공 지원 이력</h3>
          <SupportDots events={company.supportHistory} />
        </div>
      )}
      <ReportBlock title="시장 분석">{company.report.market}</ReportBlock>
      <ReportBlock title="기술 경쟁력">{company.report.technology}</ReportBlock>
      <ReportBlock title="팀 · 조직">{company.report.team}</ReportBlock>
    </div>
  )
}

function FinancialsTab({ company }: { company: Company }) {
  const last = company.financials[company.financials.length - 1]
  const risk = assessFinancialRisk(company)
  const formatMetric = (value: number | null, suffix: string) => value === null ? "자료 없음" : `${value}${suffix}`
  const formatMoney = (value: number | null) => value === null ? "자료 없음" : `${value}${company.financialUnit}`
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <ShieldAlert className="h-4.5 w-4.5 text-primary" />
            재무 건전성 · 신용
          </h3>
          <FinancialRiskBadge company={company} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "신용등급", value: company.creditGrade ?? "CRETOP 연계 전" },
            { label: "부채비율", value: formatMetric(company.debtRatio, "%") },
            { label: "유동비율", value: formatMetric(company.currentRatio, "%") },
            { label: "잔여 런웨이", value: formatMetric(company.runwayMonths, "개월") },
          ].map((k) => (
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
        {risk.unavailable.length > 0 && (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {risk.unavailable.join("·")}은 원천 필드가 없어 판단에서 제외했습니다. 결측은 안정 신호로 해석하지 않습니다.
          </p>
        )}
        {risk.signals.length === 0 && risk.unavailable.length === 0 && (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            현재 규칙에서 임계치를 넘은 신호는 없지만, 이는 지원 기간 중 생존이나 상환능력을 보장하지 않습니다.
          </p>
        )}
      </div>

      {/* Combined line chart: revenue + op profit */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">매출 · 영업이익 추이</h3>
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
          <h3 className="mb-4 font-semibold text-foreground">매출 추이 ({company.financialUnit})</h3>
          <TrendBars data={company.financials.map((f) => ({ label: f.year, value: f.revenue }))} colorVar="--chart-1" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold text-foreground">임직원 수 추이</h3>
          <TrendBars data={company.financials.map((f) => ({ label: f.year, value: f.employees }))} colorVar="--chart-2" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: `${last.year} 매출`, value: formatMoney(last.revenue) },
          { label: `${last.year} 영업이익`, value: formatMoney(last.operatingProfit) },
          { label: `${last.year} 임직원 수`, value: last.employees === null ? "자료 없음" : `${last.employees}명` },
          { label: "누적 지원금", value: company.supportTotal },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{k.value}</p>
          </div>
        ))}
      </div>

      {company.industryBenchmarks && company.industryBenchmarks.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold text-foreground">업종 평균 대비 비교</h3>
          <BenchmarkBars items={company.industryBenchmarks} />
        </div>
      )}

      {company.survivalPercentiles && company.survivalPercentiles.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold text-foreground">동종 업종 내 분위 위치</h3>
          <PercentileStrip items={company.survivalPercentiles} />
        </div>
      )}

      <ReportBlock title="재무 분석 의견">{company.report.finance}</ReportBlock>
    </div>
  )
}

function EvaluationTab({ company }: { company: Company }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 font-semibold text-foreground">평가 항목별 점수</h3>
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
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
          <Award className="h-4.5 w-4.5 text-primary" />
          인증 · 자격
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
