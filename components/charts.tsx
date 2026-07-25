"use client"

type BarDatum = { label: string; value: number }

export function TrendBars({
  data,
  height = 120,
  colorVar = "--chart-1",
  formatValue = (v: number) => `${v}`,
}: {
  data: BarDatum[]
  height?: number
  colorVar?: string
  formatValue?: (v: number) => string
}) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1)
  return (
    <div className="flex items-end gap-3" style={{ height }}>
      {data.map((d) => {
        const h = Math.max((Math.abs(d.value) / max) * (height - 28), 3)
        const negative = d.value < 0
        return (
          <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-xs font-medium tabular-nums text-foreground">{formatValue(d.value)}</span>
            <div
              className="w-full rounded-t-md transition-all"
              style={{
                height: h,
                backgroundColor: negative ? "var(--destructive)" : `var(${colorVar})`,
                opacity: negative ? 0.75 : 1,
              }}
            />
            <span className="text-xs text-muted-foreground">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

type LinePoint = { label: string; value: number }

export function ForecastLine({
  historical,
  forecast,
  height = 200,
}: {
  historical: LinePoint[]
  forecast: LinePoint[]
  height?: number
}) {
  const all = [...historical, ...forecast]
  const values = all.map((p) => p.value)
  const max = Math.max(...values)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const width = 640
  const padX = 36
  const padY = 24
  const stepX = (width - padX * 2) / (all.length - 1)

  const toXY = (v: number, i: number) => {
    const x = padX + i * stepX
    const y = padY + (1 - (v - min) / range) * (height - padY * 2)
    return [x, y] as const
  }

  const histPath = historical
    .map((p, i) => {
      const [x, y] = toXY(p.value, i)
      return `${i === 0 ? "M" : "L"}${x},${y}`
    })
    .join(" ")

  const forecastStartIndex = historical.length - 1
  const forecastPath = forecast
    .map((p, i) => {
      const [x, y] = toXY(p.value, forecastStartIndex + 1 + i)
      return `${i === 0 ? "M" : "L"}${x},${y}`
    })
    .join(" ")

  const lastHist = toXY(historical[historical.length - 1].value, forecastStartIndex)
  const connector = `M${lastHist[0]},${lastHist[1]} L${toXY(forecast[0].value, forecastStartIndex + 1)[0]},${toXY(forecast[0].value, forecastStartIndex + 1)[1]}`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="매출 예측 추이 그래프">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padY + t * (height - padY * 2)
        return <line key={t} x1={padX} y1={y} x2={width - padX} y2={y} stroke="var(--border)" strokeWidth={1} />
      })}
      <path d={histPath} fill="none" stroke="var(--chart-1)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d={connector} fill="none" stroke="var(--chart-3)" strokeWidth={2.5} strokeDasharray="5 5" />
      <path d={forecastPath} fill="none" stroke="var(--chart-3)" strokeWidth={2.5} strokeDasharray="5 5" strokeLinecap="round" strokeLinejoin="round" />
      {all.map((p, i) => {
        const [x, y] = toXY(p.value, i)
        const isForecast = i > forecastStartIndex
        return (
          <g key={p.label}>
            <circle cx={x} cy={y} r={3.5} fill={isForecast ? "var(--chart-3)" : "var(--chart-1)"} />
            <text x={x} y={height - 4} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>
              {p.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function ScoreRing({ score, size = 132 }: { score: number; size?: number }) {
  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  const color = score >= 90 ? "var(--success)" : score >= 80 ? "var(--chart-1)" : "var(--warning)"
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-semibold tabular-nums text-foreground">{score}</span>
        <span className="text-xs text-muted-foreground">매칭 점수</span>
      </div>
    </div>
  )
}
