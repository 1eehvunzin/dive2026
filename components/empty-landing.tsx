"use client"

import { Button } from "@/components/ui/button"
import { FileUp, Building2, Sparkles, ArrowRight } from "lucide-react"

export function EmptyLanding({ onRegister }: { onRegister: () => void }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Building2 className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground text-balance">
        공고문을 등록하고 추천 기업을 확인하세요
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
        기업 풀은 이미 준비되어 있습니다. 지원사업 공고문(PDF)만 등록하면 AI가 사업 요건을 분석해 가장 적합한
        기업을 추천 순위로 정렬해 보여드립니다.
      </p>

      <Button size="lg" onClick={onRegister} className="mt-8 gap-2">
        <FileUp className="h-4.5 w-4.5" />
        지원사업 공고문 등록하기
        <ArrowRight className="h-4 w-4" />
      </Button>

      <div className="mt-14 grid w-full gap-4 sm:grid-cols-3">
        {[
          { icon: FileUp, title: "1. 공고문 등록", desc: "PDF를 올리면 사업 요건을 자동 추출합니다." },
          { icon: Sparkles, title: "2. 요건별 근거 분석", desc: "자격·배제요건과 평가항목별 기업 근거를 정리합니다." },
          { icon: Building2, title: "3. 추천 기업 확인", desc: "추천 순위와 리포트를 확인하고 즐겨찾기에 추가합니다." },
        ].map((s) => {
          const Icon = s.icon
          return (
            <div key={s.title} className="rounded-xl border border-border bg-card p-5 text-left">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <Icon className="h-4.5 w-4.5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">{s.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
