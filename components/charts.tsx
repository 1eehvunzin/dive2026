"use client"

import { formatKrwMillion } from "@/lib/format"

type BarDatum = { label: string; value: number | null }

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
  const max = Math.max(...data.map((d) => Math.abs(d.value ?? 0)), 1)
  return (
    <div className="flex items-end gap-3" style={{ height }}>
      {data.map((d) => {
        const h = d.value === null ? 0 : Math.max((Math.abs(d.value) / max) * (height - 28), 3)
        const negative = d.value !== null && d.value < 0
        return (
          <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-xs font-medium tabular-nums text-foreground">{d.value === null ? "–" : formatValue(d.value)}</span>
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
  const firstForecast = forecast[0]
  const connector = firstForecast
    ? `M${lastHist[0]},${lastHist[1]} L${toXY(firstForecast.value, forecastStartIndex + 1)[0]},${toXY(firstForecast.value, forecastStartIndex + 1)[1]}`
    : null

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="매출 실적과 시나리오 가정값 추이 그래프">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = padY + t * (height - padY * 2)
        return <line key={t} x1={padX} y1={y} x2={width - padX} y2={y} stroke="var(--border)" strokeWidth={1} />
      })}
      <path d={histPath} fill="none" stroke="var(--chart-1)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {connector && (
        <path d={connector} fill="none" stroke="var(--chart-3)" strokeWidth={2.5} strokeDasharray="5 5" />
      )}
      <path d={forecastPath} fill="none" stroke="var(--chart-3)" strokeWidth={2.5} strokeDasharray="5 5" strokeLinecap="round" strokeLinejoin="round" />
      {all.map((p, i) => {
        const [x, y] = toXY(p.value, i)
        const isForecast = i > forecastStartIndex
        return (
          <g key={`${p.label}-${i}`}>
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

        const segments: [number, number][][] = []
        for (const point of pts) {
          if (point) {
            const current = segments.at(-1)
            if (current && current.length > 0) current.push(point)
            else segments.push([point])
          } else if (segments.at(-1)?.length) {
            segments.push([])
          }
        }
        const nonEmptySegments = segments.filter((segment) => segment.length > 0)

        const color = `var(${s.colorVar})`

        return (
          <g key={s.label}>
            {nonEmptySegments.map((segment, segmentIndex) => {
              const linePath = segment.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x},${y}`).join(" ")
              const areaPath = `${linePath} L${segment.at(-1)![0]},${zeroY} L${segment[0][0]},${zeroY} Z`
              return (
                <g key={segmentIndex}>
                  {s.fill && <path d={areaPath} fill={color} fillOpacity={0.12} />}
                  <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </g>
              )
            })}
            {pts.map((point, pointIndex) => point && (
              <circle key={pointIndex} cx={point[0]} cy={point[1]} r={3} fill={color} />
            ))}
          </g>
        )
      })}

      {/* X labels */}
      {xLabels.map((lbl, i) => (
        <text key={`${lbl}-${i}`} x={toX(i)} y={height - 2} textAnchor="middle" style={{ fontSize: 11 }} className="fill-muted-foreground">
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
  items: { label: string; pctl: number; cohortLabel?: string; higherIsBetter?: boolean }[]
}) {
  return (
    <div className="space-y-5">
      {items.map((item) => {
        const rawPct = Math.max(0, Math.min(100, item.pctl))
        const favorablePct = item.higherIsBetter === false ? 100 - rawPct : rawPct
        const tier = favorablePct >= 70 ? "text-success" : favorablePct >= 40 ? "text-warning" : "text-destructive"
        return (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="text-foreground/90">{item.label}</span>
              <span className={`font-semibold tabular-nums ${tier}`}>
                유리한 위치 {Math.round(favorablePct)}백분위
              </span>
            </div>
            <div className="relative h-8 w-full">
              <div className="absolute inset-x-0 top-3 h-2 overflow-hidden rounded-full border border-border">
                <div className="grid h-full grid-cols-4">
                  <span className="bg-destructive/15" />
                  <span className="bg-warning/15" />
                  <span className="bg-primary/10" />
                  <span className="bg-success/15" />
                </div>
              </div>
              <span className="absolute top-1 h-6 w-px bg-foreground/25" style={{ left: "50%" }} />
              <span
                className="absolute top-0 h-8 w-3 -translate-x-1/2 rounded-full border-2 border-background shadow-sm transition-all duration-700"
                style={{
                  left: `${favorablePct}%`,
                  backgroundColor:
                    favorablePct >= 70
                      ? "var(--success)"
                      : favorablePct >= 40
                        ? "var(--warning)"
                        : "var(--destructive)",
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>불리한 구간</span>
              <span>동종기업 중앙</span>
              <span>유리한 구간</span>
            </div>
            {item.cohortLabel && <p className="mt-1 text-xs text-muted-foreground">대조군: {item.cohortLabel}</p>}
          </div>
        )
      })}
    </div>
  )
}

// ── SupportDots ────────────────────────────────────────────────────────────────
type SupportEvent = { year: number; program: string; amount: number | null; type?: string }

export function SupportDots({ events }: { events: SupportEvent[] }) {
  if (events.length === 0) return null
  const grouped = [...events.reduce((groups, event) => {
    groups.set(event.year, [...(groups.get(event.year) ?? []), event])
    return groups
  }, new Map<number, SupportEvent[]>())].sort(([left], [right]) => left - right)

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {grouped.map(([year, yearEvents]) => (
        <div key={year} className="rounded-lg border border-border bg-secondary/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold tabular-nums text-foreground">{year}년</p>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {yearEvents.length}건
            </span>
          </div>
          <div className="space-y-2.5">
            {yearEvents.map((event, index) => (
              <div key={`${event.program}-${index}`} className="border-l-2 border-primary/40 pl-3">
                <p className="text-sm font-medium leading-snug text-foreground">{event.program}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {event.amount === null
                    ? "지원금액 확인 필요"
                    : event.amount === 0
                      ? "원천값 0원 · 의미 확인"
                      : formatKrwMillion(event.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
      </div>
  )
}

// ── SupportTimeline (기간 막대) ─────────────────────────────────────────────────
export type TimelineEpisode = {
  id: string
  program: string
  purpose?: string | null
  startDate: string | null
  endDate: string | null
  selectedDate?: string | null
  amountMillion: number | null
  isAwarded?: boolean
  overlap?: boolean
}

const PURPOSE_COLORS: Record<string, string> = {
  "시제품": "var(--chart-1)",
  "기술/R&D": "var(--chart-2)",
  "인력양성": "var(--chart-3)",
  "고용": "var(--chart-3)",
  "마케팅/수출": "var(--chart-4)",
  "사업화": "var(--chart-5)",
  "패키지": "var(--primary)",
  "인증": "var(--chart-2)",
  "지식재산": "var(--chart-2)",
}

function parseDay(value: string | null | undefined): number | null {
  if (!value) return null
  const t = Date.parse(value)
  return Number.isFinite(t) ? t : null
}

export function SupportTimeline({
  episodes,
  height = 28,
}: {
  episodes: TimelineEpisode[]
  height?: number
}) {
  const rows = episodes.filter((e) => e.isAwarded !== false)
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">표시할 지원대상 이력이 없습니다.</p>
  }

  const ranges = rows.map((episode) => {
    let start = parseDay(episode.startDate)
    let end = parseDay(episode.endDate)
    const selected = parseDay(episode.selectedDate)
    // 기간 없으면 선정일 기준 분기 점선 막대
    if (start === null && selected !== null) {
      start = selected
      end = selected + 90 * 86_400_000
    }
    if (start !== null && end === null) end = start + 90 * 86_400_000
    if (end !== null && start === null) start = end - 90 * 86_400_000
    return { episode, start, end, unknown: !episode.startDate || !episode.endDate }
  })

  const known = ranges.filter((r) => r.start !== null && r.end !== null)
  if (known.length === 0) {
    return <p className="text-sm text-muted-foreground">수행기간이 없어 타임라인을 그릴 수 없습니다.</p>
  }

  const minT = Math.min(...known.map((r) => r.start!))
  const maxT = Math.max(...known.map((r) => r.end!))
  const span = Math.max(maxT - minT, 86_400_000)
  const years: number[] = []
  const startYear = new Date(minT).getUTCFullYear()
  const endYear = new Date(maxT).getUTCFullYear()
  for (let y = startYear; y <= endYear; y += 1) years.push(y)

  return (
    <div className="space-y-3">
      <div className="relative mb-1 flex h-5 text-[10px] text-muted-foreground">
        {years.map((year) => {
          const x = ((Date.UTC(year, 0, 1) - minT) / span) * 100
          if (x < 0 || x > 100) return null
          return (
            <span
              key={year}
              className="absolute -translate-x-1/2 tabular-nums"
              style={{ left: `${x}%` }}
            >
              {year}
            </span>
          )
        })}
      </div>
      <div className="space-y-2">
        {ranges.map(({ episode, start, end, unknown }) => {
          if (start === null || end === null) return null
          const left = ((start - minT) / span) * 100
          const width = Math.max(((end - start) / span) * 100, 1.5)
          const color = PURPOSE_COLORS[episode.purpose ?? ""] ?? "var(--primary)"
          return (
            <div key={episode.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">{episode.program}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {[episode.purpose, unknown ? "기간 일부 추정" : null].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="relative h-7 rounded-md bg-secondary/50">
                <div
                  className="absolute top-1 rounded-sm"
                  title={`${episode.program} ${episode.startDate ?? "?"} ~ ${episode.endDate ?? "?"}`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    height: height - 8,
                    backgroundColor: color,
                    opacity: unknown ? 0.45 : episode.overlap ? 0.95 : 0.8,
                    outline: episode.overlap ? "2px solid var(--warning)" : undefined,
                    outlineOffset: 1,
                    backgroundImage: unknown
                      ? "repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,.25) 4px, rgba(255,255,255,.25) 8px)"
                      : undefined,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── BenchmarkBars ──────────────────────────────────────────────────────────────
export function BenchmarkBars({
  items,
}: {
  items: {
    label: string
    company: number
    industry: number
    unit: string
    context?: string
    higherIsBetter?: boolean
  }[]
}) {
  const explain = (
    label: string,
    company: number,
    industry: number,
    higherIsBetter: boolean,
  ) => {
    const gap = Math.abs(company - industry).toLocaleString("ko-KR", { maximumFractionDigits: 1 })
    if (label.includes("부채")) {
      return company > industry
        ? `업종평균보다 ${gap}%p 높습니다. 차입금 구성과 향후 원리금 상환 일정을 확인하세요.`
        : `업종평균보다 ${gap}%p 낮습니다. 현재 부채 부담은 상대적으로 작습니다.`
    }
    if (label.includes("영업이익")) {
      return company >= industry
        ? `업종평균보다 ${gap}%p 높아 본업의 수익성이 상대적으로 우수합니다.`
        : `업종평균보다 ${gap}%p 낮습니다. 원가·판관비와 적자 개선 계획을 확인하세요.`
    }
    if (label.includes("증가율") && company < 0 && industry >= 0) {
      return `기업 매출은 감소한 반면 업종은 성장했습니다. 매출 회복 계획과 수주 근거를 우선 확인하세요.`
    }
    return `${label}이 업종평균보다 ${gap}%p ${company >= industry ? "높습니다" : "낮습니다"}. ${
      higherIsBetter === (company >= industry) ? "상대적으로 양호한 신호입니다." : "선정 전 원인을 확인하세요."
    }`
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const min = Math.min(item.company, item.industry, 0)
        const max = Math.max(item.company, item.industry, 0)
        const span = max - min || 1
        const zeroPct = ((0 - min) / span) * 100
        const position = (value: number) => ((value - min) / span) * 100
        const higherIsBetter = item.higherIsBetter !== false
        const better = higherIsBetter ? item.company >= item.industry : item.company <= item.industry
        const gap = item.company - item.industry
        const magnitude = Math.abs(gap).toLocaleString("ko-KR", { maximumFractionDigits: 1 })
        const direction = gap === 0 ? "동일" : gap > 0 ? "높음" : "낮음"
        return (
          <div key={item.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="text-base font-semibold text-foreground">
                {item.label} 비교
                {item.context && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{item.context}</span>
                )}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                better ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              }`}>
                {better ? "상대적 양호" : "선정 전 확인"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
              <div className="rounded-lg bg-primary/5 px-3 py-2.5">
                <p className="text-xs font-medium text-primary">해당 기업</p>
                <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">
                  {item.company.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}{item.unit}
                </p>
              </div>
              <div className="flex min-w-24 flex-col items-center justify-center rounded-lg bg-secondary px-2 text-center">
                <p className="text-[11px] text-muted-foreground">평균과 차이</p>
                <p className={better ? "text-sm font-bold text-success" : "text-sm font-bold text-warning"}>
                  {magnitude}%p {direction}
                </p>
              </div>
              <div className="rounded-lg bg-secondary px-3 py-2.5 text-right">
                <p className="text-xs font-medium text-muted-foreground">업종평균</p>
                <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">
                  {item.industry.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}{item.unit}
                </p>
              </div>
            </div>

            <div className="relative mt-4 h-7" aria-label={`${item.label} 기업과 업종평균 위치`}>
              <div className="absolute inset-x-0 top-3 h-1.5 rounded-full bg-secondary" />
              {min < 0 && max > 0 && (
                <span className="absolute top-0 h-7 w-px bg-foreground/25" style={{ left: `${zeroPct}%` }}>
                  <span className="absolute -top-1 -translate-x-1/2 text-[9px] text-muted-foreground">0</span>
                </span>
              )}
              <span
                className="absolute top-1.5 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-background bg-primary shadow"
                style={{ left: `${position(item.company)}%` }}
                title={`해당 기업 ${item.company}${item.unit}`}
              />
              <span
                className="absolute top-2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-background bg-muted-foreground shadow"
                style={{ left: `${position(item.industry)}%` }}
                title={`업종평균 ${item.industry}${item.unit}`}
              />
            </div>
            <div className="flex gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-primary" />해당 기업</span>
              <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />업종평균</span>
            </div>
            <p className={`mt-3 border-l-2 pl-3 text-sm leading-6 ${
              better ? "border-success text-foreground" : "border-warning text-foreground"
            }`}>
              {explain(item.label, item.company, item.industry, higherIsBetter)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
