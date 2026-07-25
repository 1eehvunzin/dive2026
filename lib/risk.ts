import type { Company } from "@/lib/mock-data"

export type RiskTier = "안정" | "주의" | "위험" | "정보부족"

export type RiskAssessment = {
  tier: RiskTier
  signals: string[]
  unavailable: string[]
}

/**
 * 사용 가능한 부채비율·최근 영업손익을 중심으로 위험 신호를 표시한다.
 * 필드가 없는 유동비율·런웨이는 정상으로 간주하지 않는다.
 * 신용평가사의 정식 등급을 대체하지 않으며, 담당자의 1차 스크리닝 보조용이다.
 */
export function assessFinancialRisk(company: Company): RiskAssessment {
  const last = company.financials[company.financials.length - 1]
  const signals: string[] = []
  const unavailable: string[] = []
  let score = 0
  let observed = 0

  if (company.debtRatio === null) {
    unavailable.push("부채비율")
  } else {
    observed += 1
    if (company.debtRatio >= 100) {
      score += 1
      signals.push(`부채비율 ${company.debtRatio}%로 높은 편입니다`)
    }
  }
  if (company.currentRatio === null) {
    unavailable.push("유동비율")
  } else {
    observed += 1
    if (company.currentRatio < 130) {
      score += 1
      signals.push(`유동비율 ${company.currentRatio}%로 단기 지급여력이 넉넉하지 않습니다`)
    }
  }
  if (company.runwayMonths === null) {
    unavailable.push("자금 런웨이")
  } else {
    observed += 1
    if (company.runwayMonths < 18) {
      score += 1
      signals.push(`잔여 런웨이 ${company.runwayMonths}개월로 추가 자금조달이 임박했습니다`)
    }
  }
  if (last?.operatingProfit === null || last?.operatingProfit === undefined) {
    unavailable.push("최근 영업손익")
  } else {
    observed += 1
    if (last.operatingProfit < 0) {
      score += 1
      signals.push(`최근 회계연도 영업손실 ${Math.abs(last.operatingProfit)}${company.financialUnit}`)
    }
  }

  const tier: RiskTier = score >= 3 ? "위험" : score >= 1 ? "주의" : observed < 4 ? "정보부족" : "안정"
  return { tier, signals, unavailable }
}

export const riskTierOrder: Record<RiskTier, number> = { 안정: 0, 정보부족: 1, 주의: 2, 위험: 3 }

export const riskTierTone: Record<RiskTier, { text: string; bg: string; dot: string }> = {
  안정: { text: "text-success", bg: "bg-success/10", dot: "bg-success" },
  정보부족: { text: "text-muted-foreground", bg: "bg-secondary", dot: "bg-muted-foreground" },
  주의: { text: "text-warning", bg: "bg-warning/10", dot: "bg-warning" },
  위험: { text: "text-destructive", bg: "bg-destructive/10", dot: "bg-destructive" },
}
