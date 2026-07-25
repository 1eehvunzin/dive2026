"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, X, Send, FileSearch, Quote, Loader2, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { chatAgent } from "@/lib/api"
import { type Company, type ChatMessage } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

function evidenceLabel(evidenceId: string): string {
  if (evidenceId.startsWith("btp_support:")) return "부산TP 사업 선정 이력"
  if (evidenceId.startsWith("ntis:")) return "NTIS 국가R&D 과제"
  if (evidenceId.includes("patent")) return "KODATA 특허 현황"
  if (evidenceId.includes("researcher") || evidenceId.includes("rd_")) return "KODATA 연구개발 역량"
  if (evidenceId.includes("employment")) return "KODATA 고용 현황"
  if (evidenceId.includes("revenue") || evidenceId.includes("margin")) return "KODATA 손익·매출"
  if (evidenceId.includes("debt") || evidenceId.includes("equity")) return "KODATA 재무상태"
  return "기업 실사 원천데이터"
}

function AgentAnswer({ content }: { content: string }) {
  return (
    <div className="space-y-2.5">
      {content.split(/\n/).filter((line) => line.trim()).map((line, index) => {
        const text = line.trim().replace(/\s{2,}$/g, "")
        if (/^[①②③④⑤]/.test(text)) {
          return <p key={index} className="pt-1 text-sm font-semibold text-foreground">{text}</p>
        }
        if (/^[-•]\s*/.test(text)) {
          return (
            <div key={index} className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
              <p>{text.replace(/^[-•]\s*/, "")}</p>
            </div>
          )
        }
        if (/^(kodata|btp_support|ntis|ntis_summary):/i.test(text)) return null
        return <p key={index} className="text-sm leading-relaxed text-foreground/90">{text}</p>
      })}
    </div>
  )
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

  const send = async () => {
    const text = input.trim()
    if (!text || thinking) return
    const companyId = Number.parseInt(String(company.id), 10)
    const userMsg: ChatMessage = { role: "user", content: text, context: context ?? undefined }
    setMessages((m) => [...m, userMsg])
    setInput("")
    const usedContext = context
    setContext(null)
    setThinking(true)
    try {
      if (!Number.isFinite(companyId)) {
        throw new Error("이 기업은 백엔드 기업 ID가 없어 에이전트 분석을 요청할 수 없습니다.")
      }
      const result = await chatAgent({
        companyId,
        question: usedContext
          ? `리포트에서 선택한 문장: ${usedContext}\n담당자 질문: ${text}`
          : text,
        roundId: company.dueDiligence?.roundId ?? undefined,
      })
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: result.fallback
            ? `${result.answer}\n\n현재 Solar API를 사용할 수 없어 백엔드의 규칙 기반 응답을 표시했습니다.`
            : result.answer,
          context: usedContext ?? undefined,
          sources: result.sources.map((evidenceId) => ({
            title: evidenceLabel(evidenceId),
            snippet: evidenceId,
          })),
        },
      ])
    } catch (cause) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: cause instanceof Error
            ? `응답을 불러오지 못했습니다: ${cause.message}`
            : "응답을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
          context: usedContext ?? undefined,
        },
      ])
    } finally {
      setThinking(false)
    }
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
                  {m.role === "assistant"
                    ? <AgentAnswer content={m.content} />
                    : <p className="whitespace-pre-wrap">{m.content}</p>}
                </div>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 rounded-lg border border-border bg-background px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <FileSearch className="h-3 w-3 text-primary" />
                      답변에 사용한 원천데이터
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[...m.sources.reduce((groups, source) => {
                        groups.set(source.title, (groups.get(source.title) ?? 0) + 1)
                        return groups
                      }, new Map<string, number>())].map(([title, count]) => (
                        <span key={title} className="rounded-md bg-secondary px-2 py-1 text-[11px] text-muted-foreground">
                          {title} {count}개 필드
                        </span>
                      ))}
                    </div>
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
                void send()
                }
              }}
              rows={1}
              placeholder="선택한 내용에 대해 질문하기..."
              className="max-h-28 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
            />
            <Button size="icon" onClick={() => void send()} disabled={!input.trim() || thinking} className="h-10 w-10 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
