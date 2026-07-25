"use client"

import { HelpCircle, Landmark } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { NavTabs } from "@/components/nav-tabs"
import { AppStateProvider, useAppState } from "@/lib/app-state"
import type { ViewId } from "@/lib/mock-data"

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { records, activeId, setActiveId, programList, totalShortlistCount } = useAppState()

  const view: ViewId = pathname.startsWith("/favorites") ? "shortlist" : "companies"

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Unified top bar: brand block + primary nav, single deep-navy shell */}
      <header className="sticky top-0 z-40 flex h-16 shrink-0 border-b border-sidebar-border/60 bg-sidebar text-sidebar-foreground">
        {/* Brand block, aligned to sidebar width */}
        <div className="hidden w-64 shrink-0 items-center gap-3 border-r border-sidebar-border/60 px-5 lg:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Landmark className="h-5 w-5" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">기업선정 인텔리전스</p>
            <p className="truncate text-xs text-sidebar-foreground/55">공공지원사업 매칭</p>
          </div>
        </div>

        {/* Primary nav */}
        <div className="flex flex-1 items-center justify-between pl-3 pr-3 sm:pl-4 sm:pr-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-foreground lg:hidden">
              <Landmark className="h-4.5 w-4.5" />
            </div>
            <NavTabs
              active={view}
              onNavigate={(id) => router.push(id === "shortlist" ? "/favorites" : "/")}
              hasProgram={records.length > 0}
              onRequireProgram={() => router.push("/programs/new")}
              shortlistCount={totalShortlistCount}
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              aria-label="도움말"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <HelpCircle className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex min-h-0 flex-1">
        <Sidebar
          programs={programList}
          activeId={activeId}
          onSwitchProgram={(id) => {
            setActiveId(id)
            router.push("/")
          }}
          onNewProgram={() => router.push("/programs/new")}
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppStateProvider>
      <Shell>{children}</Shell>
    </AppStateProvider>
  )
}
