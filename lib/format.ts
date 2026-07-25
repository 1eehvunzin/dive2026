export function formatKrwMillion(value: number | null, options: { signed?: boolean } = {}): string {
  if (value === null || !Number.isFinite(value)) return "확인 불가"
  const sign = options.signed && value > 0 ? "+" : ""
  const absolute = Math.abs(value)
  const format = (amount: number) =>
    amount.toLocaleString("ko-KR", { maximumFractionDigits: 1 })

  if (absolute >= 1_000_000) return `${sign}${format(value / 1_000_000)}조원`
  if (absolute >= 100) return `${sign}${format(value / 100)}억원`
  return `${sign}${format(value * 100)}만원`
}

export function formatPercent(value: number | null, options: { signed?: boolean } = {}): string {
  if (value === null || !Number.isFinite(value)) return "확인 불가"
  const sign = options.signed && value > 0 ? "+" : ""
  return `${sign}${value.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}%`
}
