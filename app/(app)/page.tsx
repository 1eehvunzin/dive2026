"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CompanyView } from "@/components/company-view"
import { useAppState } from "@/lib/app-state"
import { listCompanies, mapCompanyListItem } from "@/lib/api"
import type { Company } from "@/lib/mock-data"

const PAGE_SIZE = 30
const sortMap = {
  "program-fit": "program_fit:desc",
  revenue: "revenue:desc",
  growth: "revenue_growth:desc",
  employees: "employees:desc",
  "financial-risk": "debt_ratio:asc",
} as const

export default function CompaniesPage() {
  const router = useRouter()
  const { activeRecord, shortlist, toggleShortlist } = useAppState()
  const [companies, setCompanies] = useState<Company[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<keyof typeof sortMap>("program-fit")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await Promise.resolve()
      if (cancelled) return
      setLoading(true)
      setError(null)
      try {
        const response = await listCompanies({
          page,
          limit: PAGE_SIZE,
          search: query,
          sort: sortMap[sort],
          programId: activeRecord?.program.id,
        })
        if (cancelled) return
        setCompanies(response.items.map(mapCompanyListItem))
        setTotal(response.total)
      } catch (reason) {
        if (cancelled) return
        setCompanies([])
        setTotal(0)
        setError(reason instanceof Error ? reason.message : "기업 목록을 불러오지 못했습니다.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [page, query, sort, activeRecord?.program.id])

  const handleQueryChange = useCallback((value: string) => {
    setPage(0)
    setQuery(value)
  }, [])
  const handleSortChange = useCallback((value: keyof typeof sortMap) => {
    setPage(0)
    setSort(value)
  }, [])

  return (
    <CompanyView
      companies={companies}
      total={total}
      loading={loading}
      error={error}
      page={page}
      pageSize={PAGE_SIZE}
      program={activeRecord?.program}
      onSelectCompany={(c: Company) => router.push(`/companies/${c.id}`)}
      onEditProgram={() => {
        if (!activeRecord) return
        router.push(`/programs/${activeRecord.program.id}/edit`)
      }}
      onRegisterProgram={() => router.push("/programs/new")}
      shortlist={shortlist}
      onToggleShortlist={toggleShortlist}
      onQueryChange={handleQueryChange}
      onSortChange={handleSortChange}
      onPageChange={setPage}
    />
  )
}
