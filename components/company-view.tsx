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
import { FinancialRiskBadge } from "@/components/financial-risk-badge"
import { companies, type Company, type Program } from "@/lib/mock-data"
import { assessFinancialRisk, riskTierOrder } from "@/lib/risk"
import { cn } from "@/lib/utils"

const revenueGrowth = (c: Company) => {
  const values = c.financials.map((point) => point.revenue).filter((value): value is number => value !== null)
  if (values.length < 2 || values[0] === 0) return null
  return Math.round(((values.at(-1)! - values[0]) / Math.abs(values[0])) * 100)
}

type SortKey = "revenue" | "growth" | "employees" | "financial-risk"

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "revenue", label: "최근 매출 규모순" },
  { key: "financial-risk", label: "재무 위험 낮은순" },
  { key: "growth", label: "매출 성장순" },
  { key: "employees", label: "임직원 규모순" },
]

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
            지금은 최근 매출·고용·재무 신호처럼 확인 가능한 데이터로 기업 풀을 정렬합니다. 공고문 PDF를 등록하면
            자격·배제요건과 평가항목별 근거를 함께 검토할 수 있습니다.
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
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-foreground">{company.name}</h3>
            <FinancialRiskBadge company={company} />
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
          <p className={cn("text-sm font-semibold", growth === null ? "text-muted-foreground" : growth >= 0 ? "text-success" : "text-destructive")}>
            {growth === null ? "자료 부족" : `${growth > 0 ? "+" : ""}${growth}%`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">누적 지원금</p>
          <p className="text-sm font-semibold text-foreground">{company.supportTotal}</p>
        </div>
        {canSelect && (
          <button
            onClick={onToggle}
            aria-label={picked ? "즐겨찾기에서 제거" : "즐겨찾기에 추가"}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
              picked
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary",
            )}
          >
            {picked ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            {picked ? "즐겨찾기됨" : "즐겨찾기"}
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
  const [sortKey, setSortKey] = useState<SortKey>("revenue")
  const [industries, setIndustries] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])

  const allIndustries = useMemo(() => [...new Set(companies.map((c) => c.industry))], [])
  const allLocations = useMemo(() => [...new Set(companies.map((c) => c.location))], [])
  const filterCount = industries.length + locations.length

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = companies.filter((c) => {
      if (industries.length && !industries.includes(c.industry)) return false
      if (locations.length && !locations.includes(c.location)) return false
      if (q && !`${c.name} ${c.industry} ${c.oneLiner}`.toLowerCase().includes(q)) return false
      return true
    })
    const sorted = [...filtered]
    if (sortKey === "revenue")
      sorted.sort((a, b) => (b.financials.at(-1)?.revenue ?? -Infinity) - (a.financials.at(-1)?.revenue ?? -Infinity))
    else if (sortKey === "growth")
      sorted.sort((a, b) => (revenueGrowth(b) ?? -Infinity) - (revenueGrowth(a) ?? -Infinity))
    else if (sortKey === "employees") sorted.sort((a, b) => b.employees - a.employees)
    else if (sortKey === "financial-risk")
      sorted.sort((a, b) => riskTierOrder[assessFinancialRisk(a).tier] - riskTierOrder[assessFinancialRisk(b).tier])
    return sorted
  }, [query, sortKey, industries, locations])

  const resetFilters = () => {
    setIndustries([])
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
            placeholder="기업명·업종·주요 제품으로 검색해보세요"
            className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <SortDropdown value={sortKey} onChange={setSortKey} />

        <FilterDropdown
          count={filterCount}
          allIndustries={allIndustries}
          allLocations={allLocations}
          industries={industries}
          locations={locations}
          onToggleIndustry={(v) => setIndustries((s) => toggle(s, v))}
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
  allLocations,
  industries,
  locations,
  onToggleIndustry,
  onToggleLocation,
  onReset,
}: {
  count: number
  allIndustries: string[]
  allLocations: string[]
  industries: string[]
  locations: string[]
  onToggleIndustry: (v: string) => void
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
              {section("지역", allLocations, locations, onToggleLocation)}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
