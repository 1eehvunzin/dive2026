"use client"

import { Building2, CheckSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ViewId } from "@/lib/mock-data"

const tabs: { id: ViewId; label: string; icon: typeof Building2; needsProgram: boolean }[] = [
  { id: "companies", label: "추천 기업", icon: Building2, needsProgram: false },
  { id: "shortlist", label: "즐겨찾기", icon: CheckSquare, needsProgram: true },
]

export function NavTabs({
  active,
  onNavigate,
  hasProgram,
  onRequireProgram,
  shortlistCount = 0,
}: {
  active: ViewId
  onNavigate: (id: ViewId) => void
  hasProgram: boolean
  onRequireProgram: () => void
  shortlistCount?: number
}) {
  return (
    <nav className="flex items-center gap-1" aria-label="주요 화면">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const needsRegistration = tab.needsProgram && !hasProgram
        const isActive = active === tab.id && !needsRegistration
        return (
          <button
            key={tab.id}
            onClick={() => (needsRegistration ? onRequireProgram() : onNavigate(tab.id))}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
            {tab.id === "shortlist" && shortlistCount > 0 && (
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
  )
}
