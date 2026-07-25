"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { Program, ProgramRecord } from "@/lib/mock-data"

type AppState = {
  records: ProgramRecord[]
  activeId: string | null
  activeRecord: ProgramRecord | null
  shortlist: string[]
  totalShortlistCount: number
  programList: { id: string; title: string }[]
  setActiveId: (id: string) => void
  toggleShortlist: (companyId: string, programId?: string) => void
  registerProgram: (p: Program) => string
  updateProgram: (id: string, p: Program) => void
}

const AppStateContext = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<ProgramRecord[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  const activeRecord = useMemo(() => records.find((r) => r.program.id === activeId) ?? null, [records, activeId])
  const shortlist = activeRecord?.shortlist ?? []
  const totalShortlistCount = useMemo(() => records.reduce((s, r) => s + r.shortlist.length, 0), [records])
  const programList = useMemo(() => records.map((r) => ({ id: r.program.id, title: r.program.title })), [records])

  const toggleShortlist = useCallback(
    (companyId: string, programId?: string) => {
      const targetId = programId ?? activeId
      if (!targetId) return
      setRecords((prev) =>
        prev.map((r) => {
          if (r.program.id !== targetId) return r
          const has = r.shortlist.includes(companyId)
          const shortlist = has ? r.shortlist.filter((x) => x !== companyId) : [...r.shortlist, companyId]
          return { ...r, shortlist }
        }),
      )
    },
    [activeId],
  )

  const registerProgram = useCallback((p: Program) => {
    const id = `prog-${Date.now()}`
    setRecords((prev) => [...prev, { program: { ...p, id }, shortlist: [] }])
    setActiveId(id)
    return id
  }, [])

  const updateProgram = useCallback((id: string, p: Program) => {
    setRecords((prev) => prev.map((r) => (r.program.id === id ? { ...r, program: { ...p, id } } : r)))
  }, [])

  const value = useMemo<AppState>(
    () => ({
      records,
      activeId,
      activeRecord,
      shortlist,
      totalShortlistCount,
      programList,
      setActiveId,
      toggleShortlist,
      registerProgram,
      updateProgram,
    }),
    [records, activeId, activeRecord, shortlist, totalShortlistCount, programList, toggleShortlist, registerProgram, updateProgram],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider")
  return ctx
}
