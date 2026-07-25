"use client"

import { useState } from "react"
import { TrendingUp, Users, Coins, Sparkles, ArrowRight, Info } from "lucide-react"
import { ForecastLine } from "@/components/charts"
import { type Company } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

type Scenario = "conservative" | "base" | "optimistic"

const scenarioMeta: Record<Scenario, { label: string; multiplier: number; desc: string }> = {
  conservative: { label: "보수적", multiplier: 1.18, desc: "시장 성장 둔화 및 경쟁 심화 가정" },
  base: { label: "기본", multiplier: 1.4, desc: "현 성장세 유지 및 지원금 정상 집행 가정" },
  optimistic: { label: "낙관적", multiplier: 1.7, desc: "지원 효과 극대화 및 시장 확대 가정" },
}

export function InvestmentSim({ company }: { company: Company }) {
  const [scenario, setScenario] = useState<Scenario>("base")
  const m = scenarioMeta[scenario].multiplier

  const historical = company.financials.map((f) => ({ label: f.year, value: f.revenue }))
  const lastRevenue = company.financials[company.financials.length - 1].revenue
  const forecast = [1, 2, 3].map((i) => ({
    label: `${2025 + i}E`,
    value: Math.round(lastRevenue * Math.pow(m, i)),
  }))

  const proj3yr = forecast[forecast.length - 1].value
  const jobsCreated = Math.round(company.employees * (m - 1) * 3)
  const roiMultiple = (proj3yr / lastRevenue).toFixed(1)
  const supportEffect = Math.round((m - 1) * 100)

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">AI 모의 투자 · 지원 성과 예측</p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            {company.name}에 지원사업 자금을 집행했을 때의 3개년 성과를 시나리오별로 시뮬레이션합니다. 과거 재무 추이와
            시장 성장률, 유사 기업 지원 사례를 학습해 산출한 예측치입니다.
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
          { icon: TrendingUp, label: "3년 후 예상 매출", value: `${proj3yr}억 원`, sub: `현재 대비 ${roiMultiple}배`, tone: "text-success" },
          { icon: Users, label: "예상 신규 고용", value: `+${jobsCreated}명`, sub: "지원 기간 누적", tone: "text-primary" },
          { icon: Coins, label: "지원 성장 기여도", value: `+${supportEffect}%`, sub: "연평균 매출 성장 가정", tone: "text-foreground" },
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
          <h4 className="font-semibold text-foreground">매출 예측 추이</h4>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-chart-1" />실적
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded border-b-2 border-dashed border-chart-3" />예측
            </span>
          </div>
        </div>
        <ForecastLine historical={historical} forecast={forecast} />
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h4 className="mb-3 font-semibold text-foreground">지원 의사결정 제언</h4>
        <div className="space-y-2.5">
          {[
            `${scenarioMeta[scenario].label} 시나리오 기준, 지원 후 3개년 내 매출 ${roiMultiple}배 성장이 예상되어 지원 효율성이 높습니다.`,
            `약 ${jobsCreated}명의 신규 고용 창출이 기대되어 정책 성과지표(고용) 달성에 기여합니다.`,
            `${company.risks[0]} — 이 리스크에 대한 사후 관리 조건을 지원 협약에 포함할 것을 권고합니다.`,
          ].map((line, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed text-foreground">{line}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-secondary/50 px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          본 예측은 시뮬레이션 결과이며 실제 성과를 보장하지 않습니다. 최종 선정은 심사위원회 검토를 거쳐 결정하시기 바랍니다.
        </div>
      </div>
    </div>
  )
}
