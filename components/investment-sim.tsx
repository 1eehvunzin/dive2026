"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Scale, Database, Sparkles, ArrowRight, Info, Loader2, WalletCards } from "lucide-react"
import { ForecastLine } from "@/components/charts"
import { type Company } from "@/lib/mock-data"
import { runSimulation } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatKrwMillion, formatPercent } from "@/lib/format"

type Scenario = "conservative" | "base" | "optimistic"

const scenarioMeta: Record<Scenario, { label: string; amountMillion: number; desc: string }> = {
  conservative: { label: "소규모", amountMillion: 50, desc: "지원금 5천만원 입력" },
  base: { label: "기준", amountMillion: 100, desc: "지원금 1억원 입력" },
  optimistic: { label: "확대", amountMillion: 300, desc: "지원금 3억원 입력" },
}

function formatRatio(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return ""
  if (value > 0 && value < 0.01) return "<0.01%"
  return formatPercent(value)
}

export function InvestmentSim({ company }: { company: Company }) {
  const [amountMillion, setAmountMillion] = useState(100)
  const [amountInput, setAmountInput] = useState("10000")
  const [result, setResult] = useState<Awaited<ReturnType<typeof runSimulation>> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scenario = (Object.keys(scenarioMeta) as Scenario[]).find(
    key => scenarioMeta[key].amountMillion === amountMillion,
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await Promise.resolve()
      if (cancelled) return
      setLoading(true)
      setError(null)
      try {
        const response = await runSimulation({ companyId: Number(company.id), amountMillion })
        if (!cancelled) setResult(response)
      } catch (reason) {
        if (!cancelled) {
          setResult(null)
          setError(reason instanceof Error ? reason.message : "관찰집단 데이터를 불러오지 못했습니다.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [company.id, amountMillion])

  const historical = company.financials
    .filter((f): f is typeof f & { revenue: number } => f.revenue !== null)
    .map((f) => ({ label: f.year, value: f.revenue }))
  const lastPoint = historical.at(-1)
  if (!lastPoint) {
    return <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">시나리오 기준이 되는 매출 데이터가 없습니다.</div>
  }
  const lastRevenue = lastPoint.value
  const latestFinancial = company.financials.at(-1)
  const latestOperatingProfit = latestFinancial?.operatingProfit ?? null
  const confirmedSupport = company.dueDiligence?.supportAudit.confirmedAmountMillion ?? 0
  const revenueShare = lastRevenue > 0 ? amountMillion / lastRevenue * 100 : null
  const lossCoverage = latestOperatingProfit !== null && latestOperatingProfit < 0
    ? amountMillion / Math.abs(latestOperatingProfit) * 100
    : null
  const perEmployee = company.employees && company.employees > 0 ? amountMillion / company.employees : null
  const lastYear = Number.parseInt(lastPoint.label, 10)
  const observedGrowth = result?.observed_medians?.revenue_growth_pct ?? null
  const observedRevenue = observedGrowth === null ? null : Math.round(lastRevenue * (1 + observedGrowth / 100))
  const reference = observedRevenue === null ? [] : [{ label: `${lastYear + 1} 관찰참고`, value: observedRevenue }]

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">지원금 규모 검토</p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            입력한 지원금을 {company.name}의 최근 매출·영업손익·고용·기존 수혜금액과 비교합니다.
            동종기업 관찰값이 연결된 경우에만 별도 참고선으로 표시합니다.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label htmlFor="support-amount" className="text-sm font-semibold text-foreground">
              지원금액
            </label>
            <div className="mt-2 flex max-w-md items-center rounded-lg border border-input bg-background px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20">
              <input
                id="support-amount"
                type="number"
                min={100}
                step={100}
                value={amountInput}
                onChange={(event) => {
                  const next = event.target.value
                  setAmountInput(next)
                  const parsed = Number(next)
                  if (Number.isFinite(parsed) && parsed > 0) setAmountMillion(parsed / 100)
                }}
                onBlur={() => {
                  if (!amountInput || Number(amountInput) <= 0) setAmountInput(String(amountMillion * 100))
                }}
                className="min-w-0 flex-1 bg-transparent py-2.5 text-lg font-semibold tabular-nums text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-sm font-medium text-muted-foreground">만원</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(scenarioMeta) as Scenario[]).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setAmountMillion(scenarioMeta[s].amountMillion)
                  setAmountInput(String(scenarioMeta[s].amountMillion * 100))
                }}
                className={cn(
                  "rounded-full border px-3 py-2 text-sm font-medium transition-colors",
                  scenario === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-primary",
                )}
              >
                {formatKrwMillion(scenarioMeta[s].amountMillion)}
              </button>
            ))}
          </div>
          <div className="min-w-32 rounded-lg bg-primary/8 px-4 py-2.5 text-right">
            <p className="text-xs text-muted-foreground">환산 금액</p>
            <p className="text-lg font-semibold text-primary">{formatKrwMillion(amountMillion)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h4 className="font-semibold text-foreground">지원규모 적정성 점검</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          입력금액을 기업의 실제 규모와 비교하며 미래 매출에 지원금을 임의로 더하지 않습니다.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: TrendingUp,
              label: "최근 매출 대비",
              value: revenueShare === null ? null : formatRatio(revenueShare),
              sub: `${lastPoint.label} 매출 ${formatKrwMillion(lastRevenue)}`,
            },
            {
              icon: Scale,
              label: latestOperatingProfit !== null && latestOperatingProfit < 0 ? "최근 영업손실 대비" : "최근 영업이익 대비",
              value: latestOperatingProfit === null
                ? null
                : formatRatio(amountMillion / Math.max(Math.abs(latestOperatingProfit), 0.0001) * 100),
              sub: `${latestFinancial?.year ?? "최근"} 영업손익 ${formatKrwMillion(latestOperatingProfit)}`,
            },
            {
              icon: WalletCards,
              label: "고용 1인당 지원금",
              value: perEmployee === null ? null : formatKrwMillion(perEmployee),
              sub: company.employees ? `국민연금 가입자 ${company.employees.toLocaleString("ko-KR")}명` : "",
            },
            {
              icon: Database,
              label: "확인된 기존 지원금 대비",
              value: confirmedSupport > 0 ? formatRatio(amountMillion / confirmedSupport * 100) : null,
              sub: confirmedSupport > 0 ? `기존 ${formatKrwMillion(confirmedSupport)}` : "",
            },
          ].filter((item): item is { icon: typeof TrendingUp; label: string; value: string; sub: string } => item.value !== null).map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="rounded-lg border border-border bg-secondary/40 p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />{item.label}
                </div>
                <p className="mt-1.5 text-lg font-semibold tabular-nums text-foreground">{item.value}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{item.sub}</p>
              </div>
            )
          })}
        </div>
      </div>

      {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />관찰집단을 계산하는 중입니다</div>}
      {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-semibold text-foreground">매출 실적 · 동종기업 관찰 참고값</h4>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-chart-1" />실적
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded border-b-2 border-dashed border-chart-3" />관찰 참고
            </span>
          </div>
        </div>
        <ForecastLine historical={historical} forecast={reference} />
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h4 className="mb-3 font-semibold text-foreground">시나리오 해석</h4>
        <div className="space-y-2.5">
          {[
            `${scenario ? scenarioMeta[scenario].label : "직접 입력"} 시나리오의 ${formatKrwMillion(amountMillion)}은 최근 매출의 ${revenueShare === null ? "계산 전" : formatPercent(revenueShare)}입니다.`,
            lossCoverage === null
              ? `최근 영업손익 ${formatKrwMillion(latestOperatingProfit)} 대비 입력금액을 사업 수행비와 성과목표에 맞춰 검토해야 합니다.`
              : `최근 영업손실 ${formatKrwMillion(Math.abs(latestOperatingProfit ?? 0))} 대비 입력 지원금은 ${formatPercent(lossCoverage)} 규모입니다.`,
            observedGrowth === null
              ? `동일 KSIC3·기업규모에서 확인된 매출 관찰은 ${result?.cohort.revenue_observations ?? 0}건입니다. 기업 자체의 재무·고용 추이를 중심으로 지원규모를 검토합니다.`
              : `동종 지원기업 1년 매출변화 중앙값 ${formatPercent(observedGrowth, { signed: true })} (참고용 관찰값).`,
            company.risks[0] ? `${company.risks[0]} — 이 위험은 별도로 검토해야 합니다.` : "현재 화면에 없는 위험요인은 신청서와 실사자료로 추가 확인해야 합니다.",
          ].map((line, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed text-foreground">{line}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-secondary/50 px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {result?.limitations.join(" · ") ?? "지원 전후 관찰값 · 미래 예측 아님"}
        </div>
      </div>
    </div>
  )
}
