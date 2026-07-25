"use client"

import { Building2, CheckSquare, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ViewId } from "@/lib/mock-data"

const tabs: { id: ViewId; label: string; icon: typeof Building2; needsProgram: boolean }[] = [
  { id: "companies", label: "추천 기업", icon: Building2, needsProgram: false },
  { id: "shortlist", label: "선정 목록", icon: CheckSquare, needsProgram: true },
  { id: "history", label: "활동 히스토리", icon: Clock, needsProgram: true },
]

export function NavTabs({
  active,
  onNavigate,
  hasProgram,
  shortlistCount = 0,
}: {
  active: ViewId
  onNavigate: (id: ViewId) => void
  hasProgram: boolean
  shortlistCount?: number
}) {
  return (
    <nav className="flex items-center gap-1" aria-label="주요 화면">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const disabled = tab.needsProgram && !hasProgram
        const isActive = active === tab.id && !disabled
        return (
          <button
            key={tab.id}
            onClick={() => !disabled && onNavigate(tab.id)}
            disabled={disabled}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              disabled
                ? "cursor-not-allowed text-muted-foreground/40"
                : isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
            {tab.id === "shortlist" && shortlistCount > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                  isActive ? "bg-primary/20 text-primary" : "bg-secondary text-foreground",
                )}
              >
                {shortlistCount}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
