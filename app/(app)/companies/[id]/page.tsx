"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { CompanyReport } from "@/components/company-report"
import { AgentPanel } from "@/components/agent-panel"
import { createRound, getCompanyReport, mapCompanyReport } from "@/lib/api"
import type { Company } from "@/lib/mock-data"
import { useAppState } from "@/lib/app-state"
import { cn } from "@/lib/utils"

export default function CompanyReportPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { activeRecord, shortlist, toggleShortlist } = useAppState()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [agentOpen, setAgentOpen] = useState(true)
  const [pendingContext, setPendingContext] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await Promise.resolve()
      if (cancelled) return
      setLoading(true)
      setError(null)
      const round = activeRecord
        ? await createRound({
            programId: activeRecord.program.id,
            companyIds: [params.id],
            asOfDate: new Date().toISOString().slice(0, 10),
          })
        : null
      const report = await getCompanyReport(params.id, { roundId: round?.roundId })
      if (!cancelled) setCompany(mapCompanyReport(report))
    }
    load()
      .catch((reason: unknown) => {
        if (!cancelled) {
          setCompany(null)
          setError(reason instanceof Error ? reason.message : "기업 실사 리포트를 불러오지 못했습니다.")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [params.id, activeRecord])

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16 text-center text-sm text-muted-foreground">
        실제 기업 데이터로 실사 리포트를 생성하는 중입니다.
      </div>
    )
  }

  if (!company) {
    return (
      <div role="alert" className="mx-auto max-w-5xl px-6 py-16 text-center text-sm text-destructive">
        {error ?? "존재하지 않는 기업입니다."}
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
