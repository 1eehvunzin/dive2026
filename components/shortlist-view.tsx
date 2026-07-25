"use client"

import { CheckSquare, Building2, MapPin, Users, X, ArrowUpRight, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { companies, programs, type Company } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export function ShortlistView({
  shortlist,
  onSelectCompany,
  onToggleShortlist,
  onBrowse,
}: {
  shortlist: string[]
  onSelectCompany: (c: Company) => void
  onToggleShortlist: (id: string) => void
  onBrowse: () => void
}) {
  const p = programs[0]
  const picked = companies
    .filter((c) => shortlist.includes(c.id))
    .sort((a, b) => b.matchScore - a.matchScore)
  const totalEmployees = picked.reduce((s, c) => s + c.employees, 0)

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">선정 목록</span>
            <span className="text-xs text-muted-foreground">{p.title}</span>
          </div>
          <h1 className="mt-2 text-xl font-semibold text-foreground">지원 대상 후보 기업</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            선정한 {picked.length}개 기업 · 누적 고용 {totalEmployees}명 · 정원 5개 중 {picked.length}개 선택
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onBrowse}>
          기업 더 추가하기
        </Button>
      </div>

      {picked.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <CheckSquare className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">아직 선정한 기업이 없습니다</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            추천 기업 목록이나 리포트에서 &apos;선정 목록에 추가&apos;를 눌러 후보를 담아보세요.
          </p>
          <Button className="mt-5" onClick={onBrowse}>
            추천 기업 보러가기
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {picked.map((c, i) => (
            <div
              key={c.id}
              className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center"
            >
              <div className="flex w-8 shrink-0 items-center justify-center">
                <span className="text-lg font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
              </div>
              <button onClick={() => onSelectCompany(c)} className="flex flex-1 items-start gap-4 text-left">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                  {c.logoSeed}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-foreground">{c.name}</h3>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                      {c.stage}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{c.oneLiner}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {c.industry}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {c.location}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {c.employees}명
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5" />
                      {c.fundingTotal}
                    </span>
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-4 border-t border-border pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">매칭</p>
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      c.matchScore >= 90 ? "text-success" : c.matchScore >= 80 ? "text-primary" : "text-warning",
                    )}
                  >
                    {c.matchScore}점
                  </p>
                </div>
                <button
                  onClick={() => onToggleShortlist(c.id)}
                  aria-label="선정 목록에서 제거"
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onSelectCompany(c)}
                  aria-label="리포트 보기"
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
