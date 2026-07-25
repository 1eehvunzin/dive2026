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

// ── MultiAreaLine ─────────────────────────────────────────────────────────────
type AreaSeries = {
  label: string
  values: (number | null)[]
  colorVar: string
  fill?: boolean
}

export function MultiAreaLine({
  xLabels,
  series,
  height = 220,
  unit = "",
}: {
  xLabels: string[]
  series: AreaSeries[]
  height?: number
  unit?: string
}) {
  const allVals = series.flatMap((s) => s.values).filter((v): v is number => v !== null)
  if (allVals.length === 0) return null
  const rawMax = Math.max(...allVals)
  const rawMin = Math.min(...allVals, 0)
  const pad = (rawMax - rawMin) * 0.12 || 10
  const maxVal = rawMax + pad
  const minVal = rawMin - pad
  const range = maxVal - minVal || 1
  const svgW = 560
  const padX = 42
  const padY = 18
  const innerW = svgW - padX * 2
  const innerH = height - padY * 2
  const n = xLabels.length

  const toX = (i: number) => padX + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2)
  const toY = (v: number) => padY + (1 - (v - minVal) / range) * innerH

  const zeroY = toY(0)
  const gridTicks = 4

  return (
    <svg viewBox={`0 0 ${svgW} ${height}`} className="w-full" role="img" aria-label="재무 추이 그래프">
      {/* Grid */}
      {Array.from({ length: gridTicks + 1 }, (_, i) => {
        const v = minVal + (i / gridTicks) * range
        const y = toY(v)
        return (
          <g key={i}>
            <line x1={padX} y1={y} x2={svgW - padX} y2={y} stroke="var(--border)" strokeWidth={1} />
            <text x={padX - 4} y={y + 4} textAnchor="end" style={{ fontSize: 10 }} className="fill-muted-foreground">
              {Math.round(v)}
            </text>
          </g>
        )
      })}

      {/* Zero line (if has negatives) */}
      {rawMin < 0 && (
        <line x1={padX} y1={zeroY} x2={svgW - padX} y2={zeroY} stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="3 3" />
      )}

      {/* Series */}
      {series.map((s) => {
        const pts = s.values.map((v, i) => (v !== null ? ([toX(i), toY(v)] as [number, number]) : null))
        const validPts = pts.filter((p): p is [number, number] => p !== null)
        if (validPts.length === 0) return null

        const linePath = pts
          .reduce<string>((acc, p, i) => {
            if (!p) return acc
            const cmd = acc === "" ? "M" : "L"
            return `${acc} ${cmd}${p[0]},${p[1]}`
          }, "")
          .trim()

        const areaPath = s.fill
          ? `${linePath} L${validPts[validPts.length - 1][0]},${zeroY} L${validPts[0][0]},${zeroY} Z`
          : ""

        const color = `var(${s.colorVar})`

        return (
          <g key={s.label}>
            {s.fill && areaPath && (
              <path d={areaPath} fill={color} fillOpacity={0.12} />
            )}
            <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            {validPts.map(([x, y], pi) => (
              <circle key={pi} cx={x} cy={y} r={3} fill={color} />
            ))}
          </g>
        )
      })}

      {/* X labels */}
      {xLabels.map((lbl, i) => (
        <text key={lbl} x={toX(i)} y={height - 2} textAnchor="middle" style={{ fontSize: 11 }} className="fill-muted-foreground">
          {lbl}
        </text>
      ))}

      {/* Unit label */}
      {unit && (
        <text x={padX} y={padY - 4} style={{ fontSize: 10 }} className="fill-muted-foreground">
          {unit}
        </text>
      )}
    </svg>
  )
}

// ── RadarChart ─────────────────────────────────────────────────────────────────
type RadarAxis = { label: string; value: number } // value 0–100

export function RadarChart({
  axes,
  size = 220,
  colorVar = "--chart-1",
}: {
  axes: RadarAxis[]
  size?: number
  colorVar?: string
}) {
  const n = axes.length
  if (n < 3) return null
  // Use padded viewBox so labels have room without overflowing
  const pad = 44
  const cx = size / 2 + pad
  const cy = size / 2 + pad
  const r = size * 0.38
  const labelR = size * 0.48
  const vw = size + pad * 2
  const vh = size + pad * 2

  const angle = (i: number) => ((i / n) * 360 - 90) * (Math.PI / 180)
  const polar = (i: number, radius: number): [number, number] => [
    cx + radius * Math.cos(angle(i)),
    cy + radius * Math.sin(angle(i)),
  ]

  const rings = [0.25, 0.5, 0.75, 1]
  const color = `var(${colorVar})`

  const polyPoints = axes.map((a, i) => polar(i, r * (a.value / 100))).map(([x, y]) => `${x},${y}`).join(" ")

  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full max-w-[240px] mx-auto" role="img" aria-label="평가 레이더 차트">
      {/* Background rings */}
      {rings.map((t) => (
        <polygon
          key={t}
          points={Array.from({ length: n }, (_, i) => polar(i, r * t)).map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {Array.from({ length: n }, (_, i) => {
        const [ex, ey] = polar(i, r)
        return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke="var(--border)" strokeWidth={1} />
      })}

      {/* Company polygon */}
      <polygon points={polyPoints} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2} strokeLinejoin="round" />

      {/* Dots */}
      {axes.map((a, i) => {
        const [x, y] = polar(i, r * (a.value / 100))
        return <circle key={i} cx={x} cy={y} r={4} fill={color} />
      })}

      {/* Labels */}
      {axes.map((a, i) => {
        const [lx, ly] = polar(i, labelR)
        const anchor = lx < cx - 5 ? "end" : lx > cx + 5 ? "start" : "middle"
        return (
          <text key={i} x={lx} y={ly + 4} textAnchor={anchor} style={{ fontSize: 10.5 }} className="fill-foreground font-medium">
            {a.label}
          </text>
        )
      })}
    </svg>
  )
}

// ── PercentileStrip ────────────────────────────────────────────────────────────
export function PercentileStrip({
  items,
}: {
  items: { label: string; pctl: number; cohortLabel?: string }[]
}) {
  return (
    <div className="space-y-3.5">
      {items.map((item) => {
        const pct = Math.max(0, Math.min(100, item.pctl))
        const tier = pct >= 70 ? "text-success" : pct >= 40 ? "text-warning" : "text-destructive"
        return (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-foreground/90">{item.label}</span>
              <span className={`font-semibold tabular-nums ${tier}`}>상위 {100 - pct}%</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
              {/* Color zone */}
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background:
                    pct >= 70
                      ? "var(--success)"
                      : pct >= 40
                      ? "var(--warning)"
                      : "var(--destructive)",
                  opacity: 0.8,
                }}
              />
            </div>
            {item.cohortLabel && (
              <p className="mt-0.5 text-xs text-muted-foreground">대조군: {item.cohortLabel}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── SupportDots ────────────────────────────────────────────────────────────────
type SupportEvent = { year: number; program: string; amount: number; type?: string }

export function SupportDots({ events }: { events: SupportEvent[] }) {
  if (events.length === 0) return null
  const years = events.map((e) => e.year)
  const minY = Math.min(...years)
  const maxY = Math.max(...years)
  const spanY = maxY - minY || 1

  return (
    <div className="relative pt-4 pb-2">
      {/* Timeline bar */}
      <div className="absolute left-4 right-4 top-[26px] h-0.5 bg-border" />

      {/* Dots */}
      <div className="relative flex" style={{ height: 56 }}>
        {events.map((ev, i) => {
          const posLeft = ((ev.year - minY) / spanY) * 100
          return (
            <div
              key={i}
              className="absolute flex flex-col items-center"
              style={{ left: `calc(${posLeft}% + 1rem - 6px)` }}
            >
              <div className="h-3 w-3 rounded-full border-2 border-primary bg-card" title={ev.program} />
              <span className="mt-1 whitespace-nowrap text-[10px] font-medium text-foreground">{ev.year}</span>
              <span className="mt-0.5 max-w-[80px] truncate text-center text-[9px] text-muted-foreground">{ev.program}</span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {events.map((ev, i) => (
          <span key={i} className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{ev.year}</span> {ev.program}
            {ev.amount > 0 && ` · ${ev.amount.toLocaleString()}만원`}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── BenchmarkBars ──────────────────────────────────────────────────────────────
export function BenchmarkBars({
  items,
}: {
  items: { label: string; company: number; industry: number; unit: string }[]
}) {
  return (
    <div className="space-y-4">
      {items.map((item) => {
        const max = Math.max(item.company, item.industry, 1)
        const companyPct = (item.company / max) * 100
        const industryPct = (item.industry / max) * 100
        const better = item.company >= item.industry
        return (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-foreground/90">{item.label}</span>
              <span className="text-xs text-muted-foreground">(단위: {item.unit})</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-xs text-foreground">당사</span>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${companyPct}%`,
                        backgroundColor: better ? "var(--chart-1)" : "var(--warning)",
                      }}
                    />
                  </div>
                </div>
                <span className="w-10 text-right text-xs font-semibold tabular-nums text-foreground">
                  {item.company}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-xs text-muted-foreground">업종평균</span>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-muted-foreground/40 transition-all"
                      style={{ width: `${industryPct}%` }}
                    />
                  </div>
                </div>
                <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                  {item.industry}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── ScoreRing ──────────────────────────────────────────────────────────────────
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
