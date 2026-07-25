"use client"

import { useCallback, useState } from "react"
import { Bell, HelpCircle } from "lucide-react"
import { Sidebar, type ViewId } from "@/components/sidebar"
import { CompanyView } from "@/components/company-view"
import { CompanyReport } from "@/components/company-report"
import { DashboardView } from "@/components/dashboard-view"
import { ShortlistView } from "@/components/shortlist-view"
import { AgentPanel } from "@/components/agent-panel"
import { type Company } from "@/lib/mock-data"

const viewLabels: Record<ViewId, string> = {
  programs: "추천 기업 순위",
  companies: "추천 기업 순위",
  shortlist: "선정 목록",
  overview: "현황 대시보드",
}

export default function Page() {
  const [view, setView] = useState<ViewId>("companies")
  const [selected, setSelected] = useState<Company | null>(null)
  const [agentOpen, setAgentOpen] = useState(false)
  const [pendingContext, setPendingContext] = useState<string | null>(null)
  const [shortlist, setShortlist] = useState<string[]>([])

  const handleAsk = useCallback((context: string) => {
    setPendingContext(context)
    setAgentOpen(true)
  }, [])

  const handleNavigate = useCallback((id: ViewId) => {
    setSelected(null)
    setAgentOpen(false)
    setView(id)
  }, [])

  const toggleShortlist = useCallback((id: string) => {
    setShortlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const openReport = useCallback((c: Company) => setSelected(c), [])

  const crumb = selected ? selected.name : viewLabels[view]

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active={view} onNavigate={handleNavigate} shortlistCount={shortlist.length} />

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

        <main className="flex-1">
          {selected ? (
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
          ) : view === "overview" ? (
            <DashboardView shortlist={shortlist} onSelectCompany={openReport} />
          ) : view === "shortlist" ? (
            <ShortlistView
              shortlist={shortlist}
              onSelectCompany={openReport}
              onToggleShortlist={toggleShortlist}
              onBrowse={() => setView("companies")}
            />
          ) : (
            <CompanyView
              onSelectCompany={openReport}
              shortlist={shortlist}
              onToggleShortlist={toggleShortlist}
            />
          )}
        </main>
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
