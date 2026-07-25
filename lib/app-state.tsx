"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  createProgram,
  listPrograms,
  updateProgram as updateProgramApi,
  type ProgramInput,
} from "@/lib/api"
import type { Program, ProgramRecord } from "@/lib/mock-data"

function toProgramInput(program: Program): ProgramInput {
  return {
    title: program.title,
    agency: program.agency,
    field: program.field,
    budget: program.budget,
    supportPerCompany: program.supportPerCompany,
    deadline: program.deadline,
    targetStage: program.targetStage,
    keywords: program.keywords,
    description: program.description,
    reviewStatus: program.reviewStatus ?? "draft",
    documentId: program.documentId ?? null,
    requirements: program.requirements ?? [],
  }
}

type AppState = {
  records: ProgramRecord[]
  activeId: string | null
  activeRecord: ProgramRecord | null
  shortlist: string[]
  totalShortlistCount: number
  programList: { id: string; title: string }[]
  programsLoading: boolean
  programsError: string | null
  setActiveId: (id: string) => void
  toggleShortlist: (companyId: string, programId?: string) => void
  registerProgram: (p: Program) => Promise<string>
  updateProgram: (id: string, p: Program) => Promise<void>
  reloadPrograms: () => Promise<void>
}

const AppStateContext = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<ProgramRecord[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [programsLoading, setProgramsLoading] = useState(true)
  const [programsError, setProgramsError] = useState<string | null>(null)

  const reloadPrograms = useCallback(async () => {
    setProgramsLoading(true)
    setProgramsError(null)
    try {
      const programs = await listPrograms()
      setRecords((previous) =>
        programs.map((program) => ({
          program,
          shortlist: previous.find((record) => record.program.id === program.id)?.shortlist ?? [],
        })),
      )
      setActiveId((current) =>
        current && programs.some((program) => program.id === current)
          ? current
          : programs[0]?.id ?? null,
      )
    } catch (error) {
      setProgramsError(error instanceof Error ? error.message : "공고 목록을 불러오지 못했습니다.")
    } finally {
      setProgramsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reloadPrograms()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [reloadPrograms])

  const activeRecord = useMemo(() => records.find((r) => r.program.id === activeId) ?? null, [records, activeId])
  const shortlist = useMemo(() => activeRecord?.shortlist ?? [], [activeRecord])
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

  const registerProgram = useCallback(async (p: Program) => {
    const saved = await createProgram(toProgramInput(p))
    setRecords((prev) => [{ program: saved, shortlist: [] }, ...prev.filter((r) => r.program.id !== saved.id)])
    setActiveId(saved.id)
    return saved.id
  }, [])

  const updateProgram = useCallback(async (id: string, p: Program) => {
    const saved = await updateProgramApi(id, toProgramInput(p))
    setRecords((prev) => prev.map((r) => (r.program.id === id ? { ...r, program: saved } : r)))
  }, [])

  const value = useMemo<AppState>(
    () => ({
      records,
      activeId,
      activeRecord,
      shortlist,
      totalShortlistCount,
      programList,
      programsLoading,
      programsError,
      setActiveId,
      toggleShortlist,
      registerProgram,
      updateProgram,
      reloadPrograms,
    }),
    [
      records,
      activeId,
      activeRecord,
      shortlist,
      totalShortlistCount,
      programList,
      programsLoading,
      programsError,
      toggleShortlist,
      registerProgram,
      updateProgram,
      reloadPrograms,
    ],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider")
  return ctx
}
