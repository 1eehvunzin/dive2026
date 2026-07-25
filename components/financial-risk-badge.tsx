import { ShieldCheck, ShieldAlert, ShieldX, CircleHelp } from "lucide-react"
import { assessFinancialRisk, riskTierTone, type RiskTier } from "@/lib/risk"
import { type Company } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const tierIcon: Record<RiskTier, typeof ShieldCheck> = {
  안정: ShieldCheck,
  주의: ShieldAlert,
  위험: ShieldX,
  정보부족: CircleHelp,
}

export function FinancialRiskBadge({ company, className }: { company: Company; className?: string }) {
  const { tier } = assessFinancialRisk(company)
  const tone = riskTierTone[tier]
  const Icon = tierIcon[tier]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tone.bg,
        tone.text,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      재무 {tier}
    </span>
  )
}
