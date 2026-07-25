"use client"

import { useCallback, useRef, useState } from "react"
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  Sparkles,
  X,
  Building2,
  Coins,
  Calendar,
  TrendingUp,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { programs, type Program } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

type Stage = "upload" | "analyzing" | "review"

const analyzeSteps = ["문서 파싱 중", "핵심 항목 추출 중", "평가 키워드 도출 중", "기업 풀 매칭 준비 중"]

export function ProgramRegister({
  onComplete,
  initial = null,
}: {
  onComplete: (p: Program) => void
  initial?: Program | null
}) {
  const [stage, setStage] = useState<Stage>(initial ? "review" : "upload")
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [draft, setDraft] = useState<Program>(initial ?? programs[0])
  const inputRef = useRef<HTMLInputElement>(null)

  const runAnalysis = useCallback((name: string) => {
    setFileName(name)
    setStage("analyzing")
    setStepIdx(0)
    let i = 0
    const timer = setInterval(() => {
      i += 1
      if (i >= analyzeSteps.length) {
        clearInterval(timer)
        // Simulated extraction result
        setDraft({ ...programs[0] })
        setStage("review")
      } else {
        setStepIdx(i)
      }
    }, 750)
  }, [])

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      runAnalysis(file.name)
    },
    [runAnalysis],
  )

  const update = (patch: Partial<Program>) => setDraft((d) => ({ ...d, ...patch }))

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          {initial ? "공고 수정" : "간편 등록"}
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-balance text-foreground">
          {initial ? "지원사업 공고 정보를 수정합니다" : "지원사업 공고문 PDF만 올리면 자동으로 등록됩니다"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {initial
            ? "추출된 항목을 수정한 뒤 저장하면 추천 순위가 다시 계산됩니다."
            : "공고문 PDF를 업로드하면 AI가 사업명·분야·지원 규모·평가 키워드를 자동으로 추출합니다. 추출 결과를 확인하고 등록하면 기업 풀에서 추천 순위가 계산됩니다."}
        </p>
      </div>

      <Stepper stage={stage} />

      {stage === "upload" && (
        <div className="mt-8">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              handleFiles(e.dataTransfer.files)
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50",
            )}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UploadCloud className="h-7 w-7" />
            </div>
            <p className="mt-4 text-sm font-medium text-foreground">
              공고문 PDF를 이곳에 드래그하거나 클릭해 업로드하세요
            </p>
            <p className="mt-1 text-xs text-muted-foreground">PDF · HWP · DOCX 지원 · 최대 20MB</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.hwp,.docx"
              className="sr-only"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
          <div className="mt-4 flex items-center justify-center">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => runAnalysis("2026_AI융합_유망기업_성장바우처_공고.pdf")}>
              <FileText className="h-3.5 w-3.5" />
              샘플 공고문으로 체험하기
            </Button>
          </div>
        </div>
      )}

      {stage === "analyzing" && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{fileName}</p>
              <p className="text-xs text-muted-foreground">AI가 공고문을 분석하고 있습니다</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {analyzeSteps.map((step, i) => {
              const done = i < stepIdx
              const active = i === stepIdx
              return (
                <div key={step} className="flex items-center gap-3">
                  {done ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-success" />
                  ) : active ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin text-primary" />
                  ) : (
                    <div className="h-4.5 w-4.5 rounded-full border-2 border-border" />
                  )}
                  <span
                    className={cn(
                      "text-sm",
                      done ? "text-muted-foreground line-through" : active ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {stage === "review" && (
        <div className="mt-8">
          <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
            <span className="text-foreground">
              <span className="font-medium">{fileName}</span> 에서 항목을 추출했습니다. 내용을 확인하고 필요하면
              수정하세요.
            </span>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-card p-6">
            <div className="grid gap-4">
              <Field label="사업명" value={draft.title} onChange={(v) => update({ title: v })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="주관 기관"
                  value={draft.agency}
                  icon={Building2}
                  onChange={(v) => update({ agency: v })}
                />
                <Field label="지원 분야" value={draft.field} icon={Building2} onChange={(v) => update({ field: v })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="기업당 지원 규모"
                  value={draft.supportPerCompany}
                  icon={Coins}
                  onChange={(v) => update({ supportPerCompany: v })}
                />
                <Field
                  label="대상 단계"
                  value={draft.targetStage}
                  icon={TrendingUp}
                  onChange={(v) => update({ targetStage: v })}
                />
              </div>
              <Field
                label="접수 마감"
                value={draft.deadline}
                icon={Calendar}
                onChange={(v) => update({ deadline: v })}
              />
              <div>
                <label className="text-sm font-medium text-foreground">사업 개요</label>
                <textarea
                  value={draft.description}
                  onChange={(e) => update({ description: e.target.value })}
                  rows={3}
                  className="mt-1.5 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">평가 키워드</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {draft.keywords.map((k) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground"
                    >
                      #{k}
                      <button
                        aria-label={`${k} 삭제`}
                        onClick={() => update({ keywords: draft.keywords.filter((x) => x !== k) })}
                        className="text-accent-foreground/60 hover:text-accent-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => {
                setStage("upload")
                setFileName(null)
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              다른 파일 올리기
            </Button>
                <Button className="gap-1.5" onClick={() => onComplete(draft)}>
                  <Sparkles className="h-4 w-4" />
                  {initial ? "수정 내용 저장" : "등록하고 기업 추천 받기"}
                </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Stepper({ stage }: { stage: Stage }) {
  const steps = [
    { id: "upload", label: "공고문 업로드" },
    { id: "analyzing", label: "AI 자동 추출" },
    { id: "review", label: "검토 및 등록" },
  ]
  const order: Stage[] = ["upload", "analyzing", "review"]
  const currentIdx = order.indexOf(stage)
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const active = i === currentIdx
        const done = i < currentIdx
        return (
          <div key={s.id} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                done
                  ? "bg-success/15 text-success"
                  : active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground",
              )}
            >
              {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn("text-sm", active ? "font-medium text-foreground" : "text-muted-foreground")}>
              {s.label}
            </span>
            {i < steps.length - 1 && <div className="mx-1 h-px flex-1 bg-border" />}
          </div>
        )
      })}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  icon: Icon,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  icon?: typeof Building2
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
      />
    </div>
  )
}
