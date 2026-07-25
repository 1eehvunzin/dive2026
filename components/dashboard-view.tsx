"use client"

import { Building2, CheckSquare, TrendingUp, Coins, Target } from "lucide-react"
import { TrendBars } from "@/components/charts"
import { companies, programs, type Company } from "@/lib/mock-data"

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Building2
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

export function DashboardView({
  shortlist,
  onSelectCompany,
}: {
  shortlist: string[]
  onSelectCompany: (c: Company) => void
}) {
  const p = programs[0]
  const sorted = [...companies].sort((a, b) => b.matchScore - a.matchScore)
  const avgScore = Math.round(companies.reduce((s, c) => s + c.matchScore, 0) / companies.length)
  const totalEmployees = companies.reduce((s, c) => s + c.employees, 0)

  const scoreBars = sorted.map((c) => ({ label: c.logoSeed, value: c.matchScore }))

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">현황 대시보드</span>
        <span className="text-xs text-muted-foreground">{p.agency}</span>
      </div>
      <h1 className="mt-2 text-xl font-semibold text-foreground">{p.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">지원사업 매칭 및 선정 진행 현황을 한눈에 확인합니다.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Building2} label="분석 기업" value={`${companies.length}개`} sub="추천 풀 전체" />
        <Stat icon={CheckSquare} label="선정 목록" value={`${shortlist.length}개`} sub={`정원 대비 ${shortlist.length}/5`} />
        <Stat icon={Target} label="평균 매칭점수" value={`${avgScore}점`} sub="상위 기업 기준" />
        <Stat icon={Coins} label="총 지원 예산" value={p.budget} sub={`기업당 ${p.supportPerCompany}`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <section className="rounded-xl border border-border bg-card p-6 lg:col-span-3">
          <h2 className="text-sm font-semibold text-foreground">기업별 매칭 점수 분포</h2>
          <div className="mt-4">
            <TrendBars data={scoreBars} height={180} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">추천 상위 기업</h2>
          <div className="mt-3 flex flex-col gap-2">
            {sorted.slice(0, 4).map((c, i) => (
              <button
                key={c.id}
                onClick={() => onSelectCompany(c)}
                className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-left transition-colors hover:border-primary/40"
              >
                <span className="w-4 text-sm font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                  {c.logoSeed}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.industry}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {c.matchScore}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            총 {companies.length}개 기업, 누적 고용 {totalEmployees}명
          </p>
        </section>
      </div>
    </div>
  )
}
