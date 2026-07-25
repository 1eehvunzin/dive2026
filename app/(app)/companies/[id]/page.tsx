"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { CompanyReport } from "@/components/company-report"
import { AgentPanel } from "@/components/agent-panel"
import { companies } from "@/lib/mock-data"
import { useAppState } from "@/lib/app-state"
import { cn } from "@/lib/utils"

export default function CompanyReportPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const company = companies.find((c) => c.id === params.id)
  const { shortlist, toggleShortlist } = useAppState()
  const [agentOpen, setAgentOpen] = useState(true)
  const [pendingContext, setPendingContext] = useState<string | null>(null)

  if (!company) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16 text-center text-sm text-muted-foreground">
        존재하지 않는 기업입니다.
      </div>
    )
  }

  return (
    <>
      <div className={cn("transition-[padding] duration-300", agentOpen && "lg:pr-[28rem]")}>
        <CompanyReport
          company={company}
          onBack={() => router.back()}
          onAsk={(context) => {
            setPendingContext(context)
            setAgentOpen(true)
          }}
          picked={shortlist.includes(company.id)}
          onToggleShortlist={() => toggleShortlist(company.id)}
        />
      </div>
      <AgentPanel
        company={company}
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
        onOpen={() => setAgentOpen(true)}
        pendingContext={pendingContext}
        onContextConsumed={() => setPendingContext(null)}
      />
    </>
  )
}
