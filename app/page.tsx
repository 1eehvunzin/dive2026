"use client"

import { useCallback, useState } from "react"
import { Bell, HelpCircle } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { CompanyView } from "@/components/company-view"
import { CompanyReport } from "@/components/company-report"
import { AgentPanel } from "@/components/agent-panel"
import { type Company } from "@/lib/mock-data"

export default function Page() {
  const [selected, setSelected] = useState<Company | null>(null)
  const [agentOpen, setAgentOpen] = useState(false)
  const [pendingContext, setPendingContext] = useState<string | null>(null)

  const handleAsk = useCallback((context: string) => {
    setPendingContext(context)
    setAgentOpen(true)
  }, [])

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active={selected ? "companies" : "programs"} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-6 py-3.5 backdrop-blur">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">지원사업</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium text-foreground">{selected ? selected.name : "추천 기업 순위"}</span>
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
            />
          ) : (
            <CompanyView onSelectCompany={(c) => setSelected(c)} />
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
