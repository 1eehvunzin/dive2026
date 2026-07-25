"use client"

import { useState } from "react"
import {
  Building2,
  Calendar,
  Coins,
  Target,
  Pencil,
  MapPin,
  Users,
  TrendingUp,
  Search,
  SlidersHorizontal,
  CheckSquare,
  Square,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { programs, companies, type Company } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

function ScorePill({ score }: { score: number }) {
  const tone =
    score >= 90
      ? "bg-success/15 text-success"
      : score >= 80
        ? "bg-primary/15 text-primary"
        : "bg-warning/15 text-warning"
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums", tone)}>
      {score}
      <span className="text-xs font-normal opacity-70">점</span>
    </span>
  )
}

function ProgramCard({ onEdit }: { onEdit: () => void }) {
  const p = programs[0]
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target className="h-5.5 w-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                등록된 지원사업
              </span>
              <span className="text-xs text-muted-foreground">{p.agency}</span>
            </div>
            <h1 className="mt-2 text-xl font-semibold text-balance text-foreground">{p.title}</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{p.description}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          사업 수정
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: Building2, label: "분야", value: p.field },
          { icon: Coins, label: "기업당 지원", value: p.supportPerCompany },
          { icon: TrendingUp, label: "대상 단계", value: p.targetStage },
          { icon: Calendar, label: "접수 마감", value: p.deadline },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="rounded-lg border border-border bg-secondary/40 p-3.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </div>
              <p className="mt-1.5 text-sm font-semibold text-foreground">{s.value}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {p.keywords.map((k) => (
          <span key={k} className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
            #{k}
          </span>
        ))}
      </div>
    </section>
  )
}

function CompanyRow({
  company,
  rank,
  onSelect,
  picked,
  onToggle,
}: {
  company: Company
  rank: number
  onSelect: () => void
  picked: boolean
  onToggle: () => void
}) {
  const revenueGrowth = Math.round(
    ((company.financials[company.financials.length - 1].revenue - company.financials[0].revenue) /
      company.financials[0].revenue) *
      100,
  )
  return (
    <div className="group flex w-full flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md sm:flex-row sm:items-center">
      <div className="flex w-8 shrink-0 items-center justify-center">
        <span className="text-lg font-semibold tabular-nums text-muted-foreground">{rank}</span>
      </div>

      <button onClick={onSelect} className="flex flex-1 items-start gap-4 text-left">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
          {company.logoSeed}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-foreground">{company.name}</h3>
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
              {company.stage}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{company.oneLiner}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
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
          </div>
        </div>
      </button>

      <div className="flex items-center gap-6 border-t border-border pt-3 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">매출 성장</p>
          <p className="text-sm font-semibold text-success">+{revenueGrowth}%</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">누적 투자</p>
          <p className="text-sm font-semibold text-foreground">{company.fundingTotal}</p>
        </div>
        <ScorePill score={company.matchScore} />
        <button
          onClick={onToggle}
          aria-label={picked ? "선정 목록에서 제거" : "선정 목록에 추가"}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
            picked
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary",
          )}
        >
          {picked ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          {picked ? "선정됨" : "선정"}
        </button>
      </div>
    </div>
  )
}

function RegistrationForm({ onDone }: { onDone: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onDone}>
      <div
        className="w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-foreground">지원사업 등록 / 수정</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          사업 정보를 입력하면 AI가 기업 풀을 분석해 추천 순위를 재계산합니다.
        </p>
        <div className="mt-5 grid gap-4">
          <div>
            <label className="text-sm font-medium text-foreground">사업명</label>
            <input
              defaultValue={programs[0].title}
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">지원 분야</label>
              <input
                defaultValue={programs[0].field}
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">기업당 지원 규모</label>
              <input
                defaultValue={programs[0].supportPerCompany}
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">평가 키워드</label>
            <input
              defaultValue={programs[0].keywords.join(", ")}
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onDone}>
            취소
          </Button>
          <Button onClick={onDone}>저장 후 재분석</Button>
        </div>
      </div>
    </div>
  )
}

export function CompanyView({
  onSelectCompany,
  shortlist,
  onToggleShortlist,
}: {
  onSelectCompany: (c: Company) => void
  shortlist: string[]
  onToggleShortlist: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const sorted = [...companies].sort((a, b) => b.matchScore - a.matchScore)

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <ProgramCard onEdit={() => setEditing(true)} />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">추천 기업 순위</h2>
          <p className="text-sm text-muted-foreground">
            등록된 지원사업 기준 · 총 {sorted.length}개 기업이 매칭 점수 순으로 정렬되었습니다
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            <input placeholder="기업 검색" className="w-28 bg-transparent outline-none placeholder:text-muted-foreground" />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            필터
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {sorted.map((company, i) => (
          <CompanyRow
            key={company.id}
            company={company}
            rank={i + 1}
            onSelect={() => onSelectCompany(company)}
            picked={shortlist.includes(company.id)}
            onToggle={() => onToggleShortlist(company.id)}
          />
        ))}
      </div>

      {editing && <RegistrationForm onDone={() => setEditing(false)} />}
    </div>
  )
}
