"use client"

import { useMemo, useState } from "react"
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
  Sparkles,
  FileUp,
  ArrowUpDown,
  Check,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { companies, type Company, type Program } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const revenueGrowth = (c: Company) =>
  Math.round(
    ((c.financials[c.financials.length - 1].revenue - c.financials[0].revenue) / c.financials[0].revenue) * 100,
  )

type SortKey = "recommended" | "recommended-asc" | "growth" | "employees"

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "추천순" },
  { key: "recommended-asc", label: "추천 역순" },
  { key: "growth", label: "매출 성장순" },
  { key: "employees", label: "임직원 규모순" },
]

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

function RegisterBanner({ onRegister }: { onRegister: () => void }) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">지원사업 공고를 등록해 보세요</h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            지금은 전체 기업 풀을 기본 순위로 보고 있습니다. 공고문 PDF를 등록하면 사업 요건에 맞춘 맞춤 추천 순위와
            기업 선정·리포트 기능을 사용할 수 있습니다.
          </p>
        </div>
      </div>
      <Button onClick={onRegister} className="gap-1.5">
        <FileUp className="h-4 w-4" />
        공고문 등록
      </Button>
    </section>
  )
}

function ProgramCard({ program, onEdit }: { program: Program; onEdit: () => void }) {
  const p = program
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
  onSelect,
  picked,
  onToggle,
  canSelect,
}: {
  company: Company
  onSelect: () => void
  picked: boolean
  onToggle: () => void
  canSelect: boolean
}) {
  const growth = revenueGrowth(company)
  return (
    <div className="group flex w-full flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md sm:flex-row sm:items-center">
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
          <p className="text-sm font-semibold text-success">+{growth}%</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">누적 투자</p>
          <p className="text-sm font-semibold text-foreground">{company.fundingTotal}</p>
        </div>
        {canSelect && <ScorePill score={company.matchScore} />}
        {canSelect && (
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
        )}
      </div>
    </div>
  )
}

export function CompanyView({
  program,
  onSelectCompany,
  onEditProgram,
  onRegisterProgram,
  shortlist,
  onToggleShortlist,
}: {
  program?: Program | null
  onSelectCompany: (c: Company) => void
  onEditProgram: () => void
  onRegisterProgram: () => void
  shortlist: string[]
  onToggleShortlist: (id: string) => void
}) {
  const canSelect = !!program
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("recommended")
  const [industries, setIndustries] = useState<string[]>([])
  const [stages, setStages] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])

  const allIndustries = useMemo(() => [...new Set(companies.map((c) => c.industry))], [])
  const allStages = useMemo(() => [...new Set(companies.map((c) => c.stage))], [])
  const allLocations = useMemo(() => [...new Set(companies.map((c) => c.location))], [])
  const filterCount = industries.length + stages.length + locations.length

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = companies.filter((c) => {
      if (industries.length && !industries.includes(c.industry)) return false
      if (stages.length && !stages.includes(c.stage)) return false
      if (locations.length && !locations.includes(c.location)) return false
      if (q && !`${c.name} ${c.industry} ${c.oneLiner}`.toLowerCase().includes(q)) return false
      return true
    })
    const sorted = [...filtered]
    if (sortKey === "recommended") sorted.sort((a, b) => b.matchScore - a.matchScore)
    else if (sortKey === "recommended-asc") sorted.sort((a, b) => a.matchScore - b.matchScore)
    else if (sortKey === "growth") sorted.sort((a, b) => revenueGrowth(b) - revenueGrowth(a))
    else if (sortKey === "employees") sorted.sort((a, b) => b.employees - a.employees)
    return sorted
  }, [query, sortKey, industries, stages, locations])

  const resetFilters = () => {
    setIndustries([])
    setStages([])
    setLocations([])
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {program ? (
        <ProgramCard program={program} onEdit={onEditProgram} />
      ) : (
        <RegisterBanner onRegister={onRegisterProgram} />
      )}

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <div className="flex min-w-56 flex-1 items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-3 text-sm text-muted-foreground focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20">
          <Search className="h-4.5 w-4.5 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="사업자 등록번호, 기업명 등을 검색해보세요"
            className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <SortDropdown value={sortKey} onChange={setSortKey} />

        <FilterDropdown
          count={filterCount}
          allIndustries={allIndustries}
          allStages={allStages}
          allLocations={allLocations}
          industries={industries}
          stages={stages}
          locations={locations}
          onToggleIndustry={(v) => setIndustries((s) => toggle(s, v))}
          onToggleStage={(v) => setStages((s) => toggle(s, v))}
          onToggleLocation={(v) => setLocations((s) => toggle(s, v))}
          onReset={resetFilters}
        />
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        총 <span className="font-medium text-foreground">{visible.length}</span>개 기업
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {visible.map((company) => (
          <CompanyRow
            key={company.id}
            company={company}
            onSelect={() => onSelectCompany(company)}
            picked={shortlist.includes(company.id)}
            onToggle={() => onToggleShortlist(company.id)}
            canSelect={canSelect}
          />
        ))}
        {visible.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 py-14 text-center text-sm text-muted-foreground">
            조건에 맞는 기업이 없습니다. 검색어나 필터를 조정해 보세요.
          </div>
        )}
      </div>
    </div>
  )
}

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function SortDropdown({ value, onChange }: { value: SortKey; onChange: (k: SortKey) => void }) {
  const [open, setOpen] = useState(false)
  const current = sortOptions.find((o) => o.key === value)
  return (
    <div className="relative">
      <Button variant="outline" className="h-11 gap-1.5" onClick={() => setOpen((o) => !o)}>
        <ArrowUpDown className="h-4 w-4" />
        {current?.label}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1.5 w-44 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-lg">
            {sortOptions.map((o) => (
              <button
                key={o.key}
                onClick={() => {
                  onChange(o.key)
                  setOpen(false)
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary",
                  o.key === value ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {o.label}
                {o.key === value && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function FilterDropdown({
  count,
  allIndustries,
  allStages,
  allLocations,
  industries,
  stages,
  locations,
  onToggleIndustry,
  onToggleStage,
  onToggleLocation,
  onReset,
}: {
  count: number
  allIndustries: string[]
  allStages: string[]
  allLocations: string[]
  industries: string[]
  stages: string[]
  locations: string[]
  onToggleIndustry: (v: string) => void
  onToggleStage: (v: string) => void
  onToggleLocation: (v: string) => void
  onReset: () => void
}) {
  const [open, setOpen] = useState(false)
  const section = (
    title: string,
    all: string[],
    selected: string[],
    onToggleItem: (v: string) => void,
  ) => (
    <div className="px-1 py-2">
      <p className="px-2 pb-1.5 text-xs font-medium text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-1.5 px-2">
        {all.map((v) => {
          const active = selected.includes(v)
          return (
            <button
              key={v}
              onClick={() => onToggleItem(v)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {v}
            </button>
          )
        })}
      </div>
    </div>
  )
  return (
    <div className="relative">
      <Button variant="outline" className="h-11 gap-1.5" onClick={() => setOpen((o) => !o)}>
        <SlidersHorizontal className="h-4 w-4" />
        필터
        {count > 0 && (
          <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
            {count}
          </span>
        )}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1.5 w-80 divide-y divide-border rounded-lg border border-border bg-popover shadow-lg">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-semibold text-foreground">기업 필터</p>
              <div className="flex items-center gap-2">
                {count > 0 && (
                  <button onClick={onReset} className="text-xs text-muted-foreground hover:text-foreground">
                    초기화
                  </button>
                )}
                <button onClick={() => setOpen(false)} aria-label="닫기" className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto py-1">
              {section("업종", allIndustries, industries, onToggleIndustry)}
              {section("성장 단계", allStages, stages, onToggleStage)}
              {section("지역", allLocations, locations, onToggleLocation)}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
