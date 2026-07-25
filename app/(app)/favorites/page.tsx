"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ShortlistView } from "@/components/shortlist-view"
import { useAppState } from "@/lib/app-state"
import type { Company } from "@/lib/mock-data"

export default function FavoritesPage() {
  const router = useRouter()
  const { records, toggleShortlist, setActiveId } = useAppState()

  useEffect(() => {
    if (records.length === 0) router.replace("/")
  }, [records.length, router])

  if (records.length === 0) return null

  return (
    <ShortlistView
      records={records}
      onSelectCompany={(c: Company) => router.push(`/companies/${c.id}`)}
      onToggleShortlist={toggleShortlist}
      onBrowse={(programId) => {
        setActiveId(programId)
        router.push("/")
      }}
    />
  )
}
