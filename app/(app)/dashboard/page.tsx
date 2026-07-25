"use client"

import { useRouter } from "next/navigation"
import { CompanyView } from "@/components/company-view"
import { useAppState } from "@/lib/app-state"
import type { Company } from "@/lib/mock-data"

export default function CompaniesPage() {
  const router = useRouter()
  const { activeRecord, shortlist, toggleShortlist } = useAppState()

  return (
    <CompanyView
      program={activeRecord?.program}
      onSelectCompany={(c: Company) => router.push(`/companies/${c.id}`)}
      onEditProgram={() => {
        if (!activeRecord) return
        router.push(`/programs/${activeRecord.program.id}/edit`)
      }}
      onRegisterProgram={() => router.push("/programs/new")}
      shortlist={shortlist}
      onToggleShortlist={toggleShortlist}
    />
  )
}
