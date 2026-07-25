"use client"

import type { ProgramRecord, HistoryEvent } from "@/lib/mock-data"
import { FilePlus2, Pencil, CheckSquare, MinusSquare, Eye, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

const meta: Record<HistoryEvent["type"], { icon: typeof Clock; tone: string; ring: string }> = {
  registered: { icon: FilePlus2, tone: "text-primary", ring: "bg-primary/10" },
  edited: { icon: Pencil, tone: "text-warning", ring: "bg-warning/10" },
  added: { icon: CheckSquare, tone: "text-success", ring: "bg-success/10" },
  removed: { icon: MinusSquare, tone: "text-muted-foreground", ring: "bg-muted" },
  viewed: { icon: Eye, tone: "text-muted-foreground", ring: "bg-muted" },
}

function timeAgo(at: number) {
  const diff = Date.now() - at
  const min = Math.floor(diff / 60000)
  if (min < 1) return "방금 전"
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  return `${day}일 전`
}

export function HistoryView({ record }: { record: ProgramRecord }) {
  const events = [...record.history].sort((a, b) => b.at - a.at)

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">활동 히스토리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {record.program.title} · 총 {events.length}건의 활동
        </p>
      </div>

      <ol className="relative border-l border-border pl-6">
        {events.map((e) => {
          const m = meta[e.type]
          const Icon = m.icon
          return (
            <li key={e.id} className="relative mb-6 last:mb-0">
              <span
                className={cn(
                  "absolute -left-[35px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background",
                  m.ring,
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", m.tone)} />
              </span>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{e.label}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(e.at)}</span>
                </div>
                {e.detail && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{e.detail}</p>}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
