"use client"

import { FileText, Settings, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export function Sidebar({
  programs = [],
  activeId = null,
  onSwitchProgram,
  onNewProgram,
}: {
  programs?: { id: string; title: string }[]
  activeId?: string | null
  onSwitchProgram?: (id: string) => void
  onNewProgram?: () => void
}) {
  const hasProgram = programs.length > 0

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      {/* New program action */}
      <div className="px-3 pb-2 pt-4">
        <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-sidebar-foreground/40">
          지원사업 공고
        </p>
        <button
          onClick={() => onNewProgram?.()}
          className="flex w-full items-center gap-2 rounded-lg border border-dashed border-sidebar-border px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:border-sidebar-primary/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Plus className="h-4 w-4" />새 공고 등록
        </button>
      </div>

      {hasProgram && (
        <nav className="mt-1 flex flex-1 flex-col gap-1 overflow-y-auto border-t border-sidebar-border/60 px-3 py-3">
          <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-sidebar-foreground/40">
            공고 목록
          </p>
          {programs.map((p) => (
            <button
              key={p.id}
              onClick={() => onSwitchProgram?.(p.id)}
              aria-current={p.id === activeId ? "true" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                p.id === activeId
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{p.title}</span>
            </button>
          ))}
        </nav>
      )}
      {!hasProgram && <div className="flex-1" />}

      <div className="px-3 pb-4">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent">
          <Settings className="h-4.5 w-4.5" />
          설정
        </button>
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-sidebar-accent/60 px-3 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
            산진
          </div>
          <div className="leading-tight">
            <p className="text-xs font-medium">한국산업기술진흥원</p>
            <p className="text-[11px] text-sidebar-foreground/60">사업총괄부 · 담당자</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
