"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, X, Send, FileSearch, Quote, Loader2, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type Company, type ChatMessage } from "@/lib/mock-data"
import { assessFinancialRisk } from "@/lib/risk"
import { cn } from "@/lib/utils"

function buildAnswer(company: Company, question: string, context?: string): ChatMessage {
  const q = question.toLowerCase()
  let content = ""
  const sources: { title: string; snippet: string }[] = []
  const latest = company.financials.at(-1)

  if (q.includes("리스크") || q.includes("위험") || context?.includes("리스크")) {
    const risk = assessFinancialRisk(company)
    const observed = [...company.risks, ...risk.signals]
    content = `${company.name}에서 현재 데이터로 확인되는 위험·검토 신호입니다.\n\n${observed.map((item, index) => `${index + 1}) ${item}`).join("\n") || "현재 데이터에서 규칙 임계치를 넘은 신호는 확인되지 않았습니다."}\n\n${risk.unavailable.length > 0 ? `${risk.unavailable.join("·")}은 원천 필드가 없어 판단에서 제외했습니다. 결측을 안전으로 해석하면 안 됩니다.` : "이 결과는 확인된 필드만 사용한 1차 검토이며 생존 가능성을 보장하지 않습니다."}`
    sources.push(
      { title: "기업 리포트 · 리스크 분석", snippet: company.risks[0] },
      { title: `재무 데이터 · ${latest?.year ?? "기준연도 미상"}`, snippet: company.report.finance.slice(0, 60) + "..." },
    )
  } else if (q.includes("매출") || q.includes("재무") || q.includes("성장")) {
    const revenue = latest?.revenue === null || latest?.revenue === undefined ? "자료 없음" : `${latest.revenue}${company.financialUnit}`
    const profit = latest?.operatingProfit === null || latest?.operatingProfit === undefined ? "자료 없음" : `${latest.operatingProfit}${company.financialUnit}`
    content = `${company.name}의 최신 수록 재무연도는 ${latest?.year ?? "확인 불가"}년이며, 매출은 ${revenue}, 영업이익은 ${profit}입니다.\n\n${company.report.finance}\n\n이 수치만으로 사업화 가능성이나 지원 효과를 단정하지 않습니다.`
    sources.push(
      { title: "재무제표 · 수록 연도", snippet: `매출 ${company.financials.map((f) => f.revenue ?? "결측").join(" → ")} ${company.financialUnit}` },
      { title: "기업 리포트 · 재무 분석", snippet: company.report.finance.slice(0, 70) + "..." },
    )
  } else if (q.includes("기술") || q.includes("특허") || context?.includes("기술")) {
    content = `${company.name}의 데이터에 등록 특허 ${company.patents}건과 인증 ${company.certifications.length}건이 수록되어 있습니다.\n\n${company.report.technology}\n\n특허·인증 건수는 기술의 품질이나 공고 적합성을 직접 증명하지 않으므로 원문과 유효상태 확인이 필요합니다.`
    sources.push(
      { title: "기업 리포트 · 기술 분석", snippet: company.report.technology.slice(0, 70) + "..." },
      { title: "특허 등록 현황", snippet: `등록 특허 ${company.patents}건 · 핵심 공정 보호` },
    )
  } else if (q.includes("시장") || q.includes("전망")) {
    content = `${company.report.market}\n\n위 서술은 현재 리포트에 수록된 내용입니다. 출처·기준연도가 연결되기 전에는 시장규모나 성장 전망을 확정 사실로 사용하지 마세요.`
    sources.push({ title: "기업 리포트 · 시장 분석", snippet: company.report.market.slice(0, 70) + "..." })
  } else {
    const highest = [...company.scoreBreakdown].sort((a, b) => b.score - a.score)[0]
    content = `현재 리포트에 수록된 요약입니다.\n\n${company.report.summary}\n\n${highest ? `화면의 공고 평가 예시 중 가장 높은 항목은 '${highest.label}'이지만, 공고 원문 근거가 연결되기 전에는 선정 점수로 사용하지 않습니다.` : "공고 평가항목은 아직 연결되지 않았습니다."} 재무·기술·리스크처럼 확인할 범위를 지정해 질문해 주세요.`
    sources.push(
      { title: "기업 리포트 · 종합 요약", snippet: company.report.summary.slice(0, 70) + "..." },
      { title: "평가 점수 산정 내역", snippet: company.scoreBreakdown.map((s) => `${s.label} ${s.score}`).join(" · ") },
    )
  }

  return { role: "assistant", content, sources, context }
}

export function AgentPanel({
  company,
  open,
  onClose,
  onOpen,
  pendingContext,
  onContextConsumed,
}: {
  company: Company
  open: boolean
  onClose: () => void
  onOpen: () => void
  pendingContext: string | null
  onContextConsumed: () => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [context, setContext] = useState<string | null>(null)
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pendingContext) return
    const timer = window.setTimeout(() => {
      setContext(pendingContext)
      onContextConsumed()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [pendingContext, onContextConsumed])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, thinking])

  const send = () => {
    const text = input.trim()
    if (!text) return
    const userMsg: ChatMessage = { role: "user", content: text, context: context ?? undefined }
    setMessages((m) => [...m, userMsg])
    setInput("")
    const usedContext = context
    setContext(null)
    setThinking(true)
    setTimeout(() => {
      setMessages((m) => [...m, buildAnswer(company, text, usedContext ?? undefined)])
      setThinking(false)
    }, 900)
  }

  const suggestions = ["이 기업의 핵심 리스크는?", "매출 성장세를 평가해줘", "기술 경쟁력은 어때?"]

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={onClose} />}
      {!open && (
        <button
          onClick={onOpen}
          aria-label="AI 에이전트 열기"
          className="fixed right-0 top-1/2 z-50 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-2xl border border-r-0 border-primary/30 bg-card px-2 py-4 text-primary shadow-lg transition-colors hover:bg-primary/5"
        >
          <ChevronLeft className="h-4.5 w-4.5" />
          <span className="[writing-mode:vertical-rl] text-xs font-medium tracking-wide">AI 에이전트</span>
        </button>
      )}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "pointer-events-none translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">리포트 AI 에이전트</p>
              <p className="text-xs text-muted-foreground">현재 리포트 필드 · {company.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.length === 0 && !context && (
            <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-5 text-center">
              <FileSearch className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-foreground">리포트에서 궁금한 부분을 드래그하세요</p>
              <p className="mt-1 text-xs text-muted-foreground">
                선택한 문장과 현재 화면에 수록된 재무 필드 범위에서 답변합니다
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[88%]", m.role === "user" ? "" : "w-full")}>
                {m.context && (
                  <div className="mb-1.5 flex items-start gap-1.5 rounded-md border-l-2 border-primary bg-primary/5 px-2.5 py-1.5">
                    <Quote className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                    <p className="line-clamp-2 text-xs italic text-muted-foreground">{m.context}</p>
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-secondary/50 text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">참고 문서 {m.sources.length}건</p>
                    {m.sources.map((s, si) => (
                      <div key={si} className="rounded-lg border border-border bg-background px-3 py-2">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <FileSearch className="h-3 w-3 text-primary" />
                          {s.title}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{s.snippet}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              현재 리포트 필드를 확인하는 중...
            </div>
          )}
        </div>

        <div className="border-t border-border px-5 py-4">
          {context && (
            <div className="mb-2.5 flex items-start gap-1.5 rounded-md border-l-2 border-primary bg-primary/5 px-2.5 py-1.5">
              <Quote className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              <p className="line-clamp-2 flex-1 text-xs italic text-muted-foreground">{context}</p>
              <button onClick={() => setContext(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {messages.length === 0 && (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  e.preventDefault()
                  send()
                }
              }}
              rows={1}
              placeholder="선택한 내용에 대해 질문하기..."
              className="max-h-28 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
            />
            <Button size="icon" onClick={send} disabled={!input.trim()} className="h-10 w-10 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
