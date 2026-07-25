"use client"

import { useCallback, useRef, useState } from "react"
import {
  ArrowLeft,
  MapPin,
  Users,
  Calendar,
  Award,
  MessageSquareQuote,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Building2,
  CheckSquare,
  Square,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScoreRing, TrendBars } from "@/components/charts"
import { InvestmentSim } from "@/components/investment-sim"
import { type Company } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

type Tab = "overview" | "financials" | "evaluation" | "forecast"

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "기업 개요" },
  { id: "financials", label: "재무 분석" },
  { id: "evaluation", label: "평가 상세" },
  { id: "forecast", label: "모의 투자 예측" },
]

export function CompanyReport({
  company,
  onBack,
  onAsk,
  onOpenAgent,
  picked,
  onToggleShortlist,
}: {
  company: Company
  onBack: () => void
  onAsk: (context: string) => void
  onOpenAgent: () => void
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
          추천 목록으로
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant={picked ? "default" : "outline"}
            size="sm"
            onClick={onToggleShortlist}
            className="gap-1.5"
          >
            {picked ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            {picked ? "선정됨" : "선정 목록에 추가"}
          </Button>
          <Button size="sm" onClick={onOpenAgent} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            AI 에이전트 열기
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
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-foreground">{company.name}</h1>
                <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  {company.stage}
                </span>
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
          <ScoreRing score={company.matchScore} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5 sm:grid-cols-4">
          {[
            { label: "누적 투자유치", value: company.fundingTotal },
            { label: "최근 기업가치", value: company.lastRoundValuation },
            { label: "등록 특허", value: `${company.patents}건` },
            { label: "대표이사", value: company.ceo },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>
      </section>

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

      {tab !== "forecast" && (
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          <MessageSquareQuote className="h-4 w-4 text-primary" />
          리포트 본문에서 궁금한 문장을 <span className="font-medium text-foreground">드래그</span>하면 AI 에이전트에게 근거와 함께 질문할 수 있습니다.
        </div>
      )}
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
      <ReportBlock title="시장 분석">{company.report.market}</ReportBlock>
      <ReportBlock title="기술 경쟁력">{company.report.technology}</ReportBlock>
      <ReportBlock title="팀 · 조직">{company.report.team}</ReportBlock>
    </div>
  )
}

function FinancialsTab({ company }: { company: Company }) {
  const last = company.financials[company.financials.length - 1]
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold text-foreground">매출 추이 (억 원)</h3>
          <TrendBars data={company.financials.map((f) => ({ label: f.year, value: f.revenue }))} colorVar="--chart-1" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold text-foreground">영업이익 추이 (억 원)</h3>
          <TrendBars data={company.financials.map((f) => ({ label: f.year, value: f.operatingProfit }))} colorVar="--chart-3" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "2025 매출", value: `${last.revenue}억` },
          { label: "2025 영업이익", value: `${last.operatingProfit}억` },
          { label: "임직원 수", value: `${last.employees}명` },
          { label: "최근 기업가치", value: company.lastRoundValuation },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{k.value}</p>
          </div>
        ))}
      </div>
      <ReportBlock title="재무 분석 의견">{company.report.finance}</ReportBlock>
    </div>
  )
}

function EvaluationTab({ company }: { company: Company }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 font-semibold text-foreground">평가 항목별 점수</h3>
        <div className="space-y-4">
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
