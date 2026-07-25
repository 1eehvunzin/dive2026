"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, X, Send, FileSearch, Quote, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type Company, type ChatMessage } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

function buildAnswer(company: Company, question: string, context?: string): ChatMessage {
  const q = question.toLowerCase()
  let content = ""
  const sources: { title: string; snippet: string }[] = []

  if (q.includes("리스크") || q.includes("위험") || context?.includes("리스크")) {
    content = `${company.name}의 핵심 리스크는 다음과 같이 정리됩니다.\n\n1) ${company.risks[0]}\n2) ${company.risks[1] ?? "추가 리스크는 제한적입니다."}\n\n지원 심사 관점에서는 이 리스크들이 지원금 집행 이후 성과 달성에 미치는 영향이 제한적이라고 판단됩니다. 특히 매출 성장세와 흑자 전환 흐름을 고려하면 재무적 완충력이 확보되어 있습니다.`
    sources.push(
      { title: "기업 리포트 · 리스크 분석", snippet: company.risks[0] },
      { title: "재무제표 · 2025 요약", snippet: company.report.finance.slice(0, 60) + "..." },
    )
  } else if (q.includes("매출") || q.includes("재무") || q.includes("성장")) {
    const last = company.financials[company.financials.length - 1]
    content = `${company.name}의 재무 지표를 요약하면, 2025년 매출 ${last.revenue}억 원, 영업이익 ${last.operatingProfit}억 원입니다.\n\n${company.report.finance}\n\n최근 4개년 매출이 지속 성장하고 있어 지원사업의 사업화 가능성 항목에서 높은 점수를 받았습니다.`
    sources.push(
      { title: "재무제표 · 최근 4개년", snippet: `매출 ${company.financials.map((f) => f.revenue).join(" → ")}억` },
      { title: "기업 리포트 · 재무 분석", snippet: company.report.finance.slice(0, 70) + "..." },
    )
  } else if (q.includes("기술") || q.includes("특허") || context?.includes("기술")) {
    content = `기술 경쟁력 측면에서 ${company.name}은(는) 특허 ${company.patents}건을 보유하고 있습니다.\n\n${company.report.technology}\n\n평가 항목 중 '기술 적합성'에서 ${company.scoreBreakdown[0].score}점으로 가장 높은 점수를 받았습니다.`
    sources.push(
      { title: "기업 리포트 · 기술 분석", snippet: company.report.technology.slice(0, 70) + "..." },
      { title: "특허 등록 현황", snippet: `등록 특허 ${company.patents}건 · 핵심 공정 보호` },
    )
  } else if (q.includes("시장") || q.includes("전망")) {
    content = `${company.report.market}\n\n시장 성장성과 ${company.name}의 포지셔닝을 종합할 때, 지원사업 취지에 부합하는 확장 잠재력을 갖추고 있습니다.`
    sources.push({ title: "기업 리포트 · 시장 분석", snippet: company.report.market.slice(0, 70) + "..." })
  } else {
    content = `질문하신 내용을 기업 리포트와 재무 데이터를 바탕으로 분석했습니다.\n\n${company.report.summary}\n\n추가로 매칭 점수는 ${company.matchScore}점이며, 가장 높은 평가 항목은 '${company.scoreBreakdown.sort((a, b) => b.score - a.score)[0].label}'입니다. 더 구체적인 항목(재무, 기술, 리스크, 시장)을 지정해 질문하시면 근거 문서와 함께 상세히 답변드립니다.`
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
  pendingContext,
  onContextConsumed,
}: {
  company: Company
  open: boolean
  onClose: () => void
  pendingContext: string | null
  onContextConsumed: () => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [context, setContext] = useState<string | null>(null)
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (pendingContext) {
      setContext(pendingContext)
      onContextConsumed()
    }
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
      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">리포트 AI 에이전트</p>
              <p className="text-xs text-muted-foreground">RAG · {company.name} 문서 기반</p>
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
                선택한 문장을 근거로 사내 문서·재무 데이터를 검색해 답변합니다
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
              문서를 검색하고 답변을 생성하는 중...
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
