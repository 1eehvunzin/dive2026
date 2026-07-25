"use client"

import { useState } from "react"
import { FileText, Settings, Landmark, Plus, ChevronsUpDown, Check } from "lucide-react"
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
  const [open, setOpen] = useState(false)
  const activeProgram = programs.find((p) => p.id === activeId)
  const hasProgram = programs.length > 0

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Landmark className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">기업선정 인텔리전스</p>
          <p className="text-xs text-sidebar-foreground/60">공공지원사업 매칭</p>
        </div>
      </div>

      {/* Program switcher */}
      <div className="relative px-3 pb-2">
        <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-sidebar-foreground/40">
          지원사업 공고
        </p>
        <button
          onClick={() => hasProgram && setOpen((o) => !o)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-2.5 text-left transition-colors",
            hasProgram && "hover:bg-sidebar-accent",
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {activeProgram ? activeProgram.title : "등록된 공고 없음"}
            </p>
            <p className="text-[11px] text-sidebar-foreground/50">
              {hasProgram ? `${programs.length}개 공고 관리 중` : "새 공고를 등록하세요"}
            </p>
          </div>
          {hasProgram && <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/50" />}
        </button>

        {open && hasProgram && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-3 right-3 z-20 mt-1 overflow-hidden rounded-lg border border-sidebar-border bg-sidebar shadow-xl">
              {programs.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSwitchProgram?.(p.id)
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent"
                >
                  <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  {p.id === activeId && <Check className="h-4 w-4 shrink-0 text-sidebar-primary" />}
                </button>
              ))}
            </div>
          </>
        )}

        <button
          onClick={() => {
            setOpen(false)
            onNewProgram?.()
          }}
          className="mt-1.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
      {!hasProgram && <div className="flex-1 border-t border-sidebar-border/60" />}

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
