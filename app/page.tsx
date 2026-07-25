"use client"

import { useCallback, useMemo, useState } from "react"
import { HelpCircle, Landmark } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { NavTabs } from "@/components/nav-tabs"
import { CompanyView } from "@/components/company-view"
import { CompanyReport } from "@/components/company-report"
import { ShortlistView } from "@/components/shortlist-view"
import { ProgramRegister } from "@/components/program-register"
import { HistoryView } from "@/components/history-view"
import { AgentPanel } from "@/components/agent-panel"
import {
  companies,
  type Company,
  type Program,
  type ProgramRecord,
  type HistoryEvent,
  type ViewId,
} from "@/lib/mock-data"

let eventSeq = 0
function makeEvent(type: HistoryEvent["type"], label: string, detail?: string): HistoryEvent {
  eventSeq += 1
  return { id: `ev-${Date.now()}-${eventSeq}`, at: Date.now(), type, label, detail }
}

export default function Page() {
  const [view, setView] = useState<ViewId>("companies")
  const [records, setRecords] = useState<ProgramRecord[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [registering, setRegistering] = useState(false)
  const [editing, setEditing] = useState<Program | null>(null)
  const [selected, setSelected] = useState<Company | null>(null)
  const [agentOpen, setAgentOpen] = useState(false)
  const [pendingContext, setPendingContext] = useState<string | null>(null)

  const activeRecord = useMemo(
    () => records.find((r) => r.program.id === activeId) ?? null,
    [records, activeId],
  )
  const shortlist = activeRecord?.shortlist ?? []

  const handleAsk = useCallback((context: string) => {
    setPendingContext(context)
    setAgentOpen(true)
  }, [])

  const handleNavigate = useCallback((id: ViewId) => {
    setSelected(null)
    setAgentOpen(false)
    setRegistering(false)
    setEditing(null)
    setView(id)
  }, [])

  const toggleShortlist = useCallback(
    (companyId: string) => {
      if (!activeId) return
      const company = companies.find((c) => c.id === companyId)
      setRecords((prev) =>
        prev.map((r) => {
          if (r.program.id !== activeId) return r
          const has = r.shortlist.includes(companyId)
          const shortlist = has ? r.shortlist.filter((x) => x !== companyId) : [...r.shortlist, companyId]
          const ev = has
            ? makeEvent("removed", `${company?.name ?? "기업"} 선정 해제`, "선정 목록에서 제외했습니다.")
            : makeEvent("added", `${company?.name ?? "기업"} 선정`, "지원 대상 후보로 추가했습니다.")
          return { ...r, shortlist, history: [...r.history, ev] }
        }),
      )
    },
    [activeId],
  )

  const openReport = useCallback((c: Company) => setSelected(c), [])

  const handleRegistered = useCallback(
    (p: Program) => {
      if (editing) {
        setRecords((prev) =>
          prev.map((r) =>
            r.program.id === editing.id
              ? {
                  ...r,
                  program: { ...p, id: editing.id },
                  history: [...r.history, makeEvent("edited", "공고 정보 수정", p.title)],
                }
              : r,
          ),
        )
        setEditing(null)
        setView("companies")
        return
      }
      const id = `prog-${Date.now()}`
      const program = { ...p, id }
      const record: ProgramRecord = {
        program,
        shortlist: [],
        history: [makeEvent("registered", "지원사업 공고 등록", program.title)],
      }
      setRecords((prev) => [...prev, record])
      setActiveId(id)
      setRegistering(false)
      setView("companies")
    },
    [editing],
  )

  const startNewProgram = useCallback(() => {
    setSelected(null)
    setAgentOpen(false)
    setEditing(null)
    setRegistering(true)
  }, [])

  const switchProgram = useCallback((id: string) => {
    setActiveId(id)
    setSelected(null)
    setAgentOpen(false)
    setRegistering(false)
    setEditing(null)
    setView("companies")
  }, [])

  const programList = records.map((r) => ({ id: r.program.id, title: r.program.title }))

  function renderMain() {
    if (selected) {
      return (
        <CompanyReport
          company={selected}
          onBack={() => {
            setSelected(null)
            setAgentOpen(false)
          }}
          onAsk={handleAsk}
          onOpenAgent={() => setAgentOpen(true)}
          picked={shortlist.includes(selected.id)}
          onToggleShortlist={() => toggleShortlist(selected.id)}
        />
      )
    }
    if (registering) {
      return <ProgramRegister onComplete={handleRegistered} initial={editing} />
    }
    // shortlist / history require an active program (their tabs are disabled otherwise)
    if (activeRecord && view === "shortlist") {
      return (
        <ShortlistView
          program={activeRecord.program}
          shortlist={shortlist}
          onSelectCompany={openReport}
          onToggleShortlist={toggleShortlist}
          onBrowse={() => setView("companies")}
        />
      )
    }
    if (activeRecord && view === "history") {
      return <HistoryView record={activeRecord} />
    }
    // 추천 기업 tab: always shows the company list, even before any program is registered.
    return (
      <CompanyView
        program={activeRecord?.program}
        onSelectCompany={openReport}
        onEditProgram={() => {
          if (!activeRecord) return
          setEditing(activeRecord.program)
          setRegistering(true)
        }}
        onRegisterProgram={startNewProgram}
        shortlist={shortlist}
        onToggleShortlist={toggleShortlist}
      />
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Unified top bar: brand block + primary nav, single deep-navy shell */}
      <header className="sticky top-0 z-40 flex h-16 shrink-0 border-b border-sidebar-border/60 bg-sidebar text-sidebar-foreground">
        {/* Brand block, aligned to sidebar width */}
        <div className="hidden w-64 shrink-0 items-center gap-3 border-r border-sidebar-border/60 px-5 lg:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Landmark className="h-5 w-5" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">기업선정 인텔리전스</p>
            <p className="truncate text-xs text-sidebar-foreground/55">공공지원사업 매칭</p>
          </div>
        </div>

        {/* Primary nav */}
        <div className="flex flex-1 items-center justify-between pl-3 pr-3 sm:pl-4 sm:pr-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-foreground lg:hidden">
              <Landmark className="h-4.5 w-4.5" />
            </div>
            <NavTabs
              active={view}
              onNavigate={handleNavigate}
              hasProgram={!!activeRecord}
              shortlistCount={shortlist.length}
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              aria-label="도움말"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <HelpCircle className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex min-h-0 flex-1">
        <Sidebar
          programs={programList}
          activeId={activeId}
          onSwitchProgram={switchProgram}
          onNewProgram={startNewProgram}
        />
        <main className="min-w-0 flex-1">{renderMain()}</main>
      </div>

      {selected && (
        <AgentPanel
          company={selected}
          open={agentOpen}
          onClose={() => setAgentOpen(false)}
          pendingContext={pendingContext}
          onContextConsumed={() => setPendingContext(null)}
        />
      )}
    </div>
  )
}
