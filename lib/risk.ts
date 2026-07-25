import type { Company } from "@/lib/mock-data"

export type RiskTier = "안정" | "주의" | "위험"

export type RiskAssessment = {
  tier: RiskTier
  signals: string[]
}

/**
 * 부채비율·유동비율·자금 런웨이·최근 영업손익을 함께 보고 지원 대상 기업이
 * 사업 기간 중 재무적으로 무너지지 않을지 가늠하기 위한 단순 룰 기반 판정.
 * 신용평가사의 정식 등급을 대체하지 않으며, 담당자의 1차 스크리닝 보조용이다.
 */
export function assessFinancialRisk(company: Company): RiskAssessment {
  const last = company.financials[company.financials.length - 1]
  const signals: string[] = []
  let score = 0

  if (company.debtRatio >= 100) {
    score += 1
    signals.push(`부채비율 ${company.debtRatio}%로 높은 편입니다`)
  }
  if (company.currentRatio < 130) {
    score += 1
    signals.push(`유동비율 ${company.currentRatio}%로 단기 지급여력이 넉넉하지 않습니다`)
  }
  if (company.runwayMonths !== null && company.runwayMonths < 18) {
    score += 1
    signals.push(`잔여 런웨이 ${company.runwayMonths}개월로 추가 자금조달이 임박했습니다`)
  }
  if (last.operatingProfit < 0) {
    score += 1
    signals.push(`최근 회계연도 영업손실 ${Math.abs(last.operatingProfit)}억 원`)
  }

  const tier: RiskTier = score >= 3 ? "위험" : score >= 1 ? "주의" : "안정"
  return { tier, signals }
}

export const riskTierOrder: Record<RiskTier, number> = { 안정: 0, 주의: 1, 위험: 2 }

export const riskTierTone: Record<RiskTier, { text: string; bg: string; dot: string }> = {
  안정: { text: "text-success", bg: "bg-success/10", dot: "bg-success" },
  주의: { text: "text-warning", bg: "bg-warning/10", dot: "bg-warning" },
  위험: { text: "text-destructive", bg: "bg-destructive/10", dot: "bg-destructive" },
}
