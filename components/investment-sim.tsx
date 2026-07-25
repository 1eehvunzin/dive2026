"use client"

import { useState } from "react"
import { TrendingUp, Scale, Database, Sparkles, ArrowRight, Info } from "lucide-react"
import { ForecastLine } from "@/components/charts"
import { type Company } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

type Scenario = "conservative" | "base" | "optimistic"

const scenarioMeta: Record<Scenario, { label: string; annualGrowth: number; desc: string }> = {
  conservative: { label: "보수적", annualGrowth: -0.05, desc: "연간 매출 5% 감소를 사용자가 가정" },
  base: { label: "기본", annualGrowth: 0.05, desc: "연간 매출 5% 증가를 사용자가 가정" },
  optimistic: { label: "낙관적", annualGrowth: 0.15, desc: "연간 매출 15% 증가를 사용자가 가정" },
}

export function InvestmentSim({ company }: { company: Company }) {
  const [scenario, setScenario] = useState<Scenario>("base")
  const annualGrowth = scenarioMeta[scenario].annualGrowth
  const multiplier = 1 + annualGrowth

  const historical = company.financials
    .filter((f): f is typeof f & { revenue: number } => f.revenue !== null)
    .map((f) => ({ label: f.year, value: f.revenue }))
  const lastPoint = historical.at(-1)
  if (!lastPoint) {
    return <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">시나리오 기준이 되는 매출 데이터가 없습니다.</div>
  }
  const lastRevenue = lastPoint.value
  const lastYear = Number.parseInt(lastPoint.label, 10)
  const forecast = [1, 2, 3].map((i) => ({
    label: `${lastYear + i} 가정`,
    value: Math.round(lastRevenue * Math.pow(multiplier, i)),
  }))

  const proj3yr = forecast[forecast.length - 1].value
  const roiMultiple = (proj3yr / lastRevenue).toFixed(1)
  const assumptionRate = Math.round(annualGrowth * 100)

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">모의투자 매출 시나리오</p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            {company.name}의 {lastPoint.label}년 매출을 기준으로 선택한 연간 증감률을 기계적으로 적용합니다.
            지원금의 인과효과나 미래 성과를 예측하는 모델이 아닙니다.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(scenarioMeta) as Scenario[]).map((s) => (
          <button
            key={s}
            onClick={() => setScenario(s)}
            className={cn(
              "flex-1 rounded-lg border px-4 py-3 text-left transition-all",
              scenario === s
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-primary/40",
            )}
          >
            <p className={cn("text-sm font-semibold", scenario === s ? "text-primary" : "text-foreground")}>
              {scenarioMeta[s].label} 시나리오
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{scenarioMeta[s].desc}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: TrendingUp, label: "3년 후 가정 매출", value: `${proj3yr}${company.financialUnit}`, sub: `기준연도 대비 ${roiMultiple}배`, tone: "text-foreground" },
          { icon: Scale, label: "연간 증감률 가정", value: `${assumptionRate > 0 ? "+" : ""}${assumptionRate}%`, sub: "선택한 시나리오 입력값", tone: "text-primary" },
          { icon: Database, label: "산출 근거", value: "단순 복리", sub: "유사기업·지원효과 미반영", tone: "text-foreground" },
        ].map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="h-4 w-4" />
                {k.label}
              </div>
              <p className={cn("mt-2 text-2xl font-semibold tabular-nums", k.tone)}>{k.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{k.sub}</p>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-semibold text-foreground">매출 실적 · 가정값 추이</h4>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-chart-1" />실적
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded border-b-2 border-dashed border-chart-3" />가정값
            </span>
          </div>
        </div>
        <ForecastLine historical={historical} forecast={forecast} />
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h4 className="mb-3 font-semibold text-foreground">시나리오 해석</h4>
        <div className="space-y-2.5">
          {[
            `${scenarioMeta[scenario].label} 시나리오는 연간 ${assumptionRate}% 증감이 3년간 동일하게 이어진다고 가정합니다.`,
            `계산 결과 ${lastPoint.label}년 매출 대비 ${roiMultiple}배가 되지만, 지원 여부가 만든 변화로 해석할 수 없습니다.`,
            `${company.risks[0]} — 이 위험이 시나리오 가정을 훼손할 수 있으므로 별도 검토가 필요합니다.`,
          ].map((line, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed text-foreground">{line}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-secondary/50 px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          현재 화면은 명시적 가정을 비교하는 계산기입니다. 유사기업 관찰값이 연결되면 대조군 규모·매칭 조건·관찰기간을 함께 표시해야 하며, 그 경우에도 인과효과로 표현하지 않습니다.
        </div>
      </div>
    </div>
  )
}
