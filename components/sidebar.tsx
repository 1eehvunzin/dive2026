"use client"

import { LayoutDashboard, FileText, Building2, CheckSquare, Settings, Landmark } from "lucide-react"
import { cn } from "@/lib/utils"

export type ViewId = "programs" | "companies" | "shortlist" | "overview"

const nav: { id: ViewId; label: string; icon: typeof FileText }[] = [
  { id: "programs", label: "지원사업 등록", icon: FileText },
  { id: "companies", label: "추천 기업", icon: Building2 },
  { id: "shortlist", label: "선정 목록", icon: CheckSquare },
  { id: "overview", label: "현황 대시보드", icon: LayoutDashboard },
]

export function Sidebar({
  active = "companies",
  onNavigate,
  shortlistCount = 0,
}: {
  active?: ViewId
  onNavigate?: (id: ViewId) => void
  shortlistCount?: number
}) {
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

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {nav.map((item) => {
          const Icon = item.icon
          const isActive = item.id === active
          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4.5 w-4.5" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === "shortlist" && shortlistCount > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                    isActive
                      ? "bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground"
                      : "bg-sidebar-primary/25 text-sidebar-foreground",
                  )}
                >
                  {shortlistCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

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
