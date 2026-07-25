"use client"

import { useCallback, useMemo, useState } from "react"
import { Bell, HelpCircle } from "lucide-react"
import { Sidebar, type ViewId } from "@/components/sidebar"
import { CompanyView } from "@/components/company-view"
import { CompanyReport } from "@/components/company-report"
import { ShortlistView } from "@/components/shortlist-view"
import { ProgramRegister } from "@/components/program-register"
import { HistoryView } from "@/components/history-view"
import { EmptyLanding } from "@/components/empty-landing"
import { AgentPanel } from "@/components/agent-panel"
import { companies, type Company, type Program, type ProgramRecord, type HistoryEvent } from "@/lib/mock-data"

const viewLabels: Record<ViewId, string> = {
  companies: "추천 기업 순위",
  shortlist: "선정 목록",
  history: "활동 히스토리",
}

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
  const crumb = selected ? selected.name : registering || !activeRecord ? "지원사업 등록" : viewLabels[view]

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
    if (!activeRecord) {
      return <EmptyLanding onRegister={startNewProgram} />
    }
    if (view === "shortlist") {
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
    if (view === "history") {
      return <HistoryView record={activeRecord} />
    }
    return (
      <CompanyView
        program={activeRecord.program}
        onSelectCompany={openReport}
        onEditProgram={() => {
          setEditing(activeRecord.program)
          setRegistering(true)
        }}
        shortlist={shortlist}
        onToggleShortlist={toggleShortlist}
      />
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        active={view}
        onNavigate={handleNavigate}
        shortlistCount={shortlist.length}
        programs={programList}
        activeId={activeId}
        onSwitchProgram={switchProgram}
        onNewProgram={startNewProgram}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-6 py-3.5 backdrop-blur">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">지원사업</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium text-foreground">{crumb}</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="rounded-md p-2 text-muted-foreground hover:bg-secondary">
              <HelpCircle className="h-4.5 w-4.5" />
            </button>
            <button className="rounded-md p-2 text-muted-foreground hover:bg-secondary">
              <Bell className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        <main className="flex-1">{renderMain()}</main>
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
