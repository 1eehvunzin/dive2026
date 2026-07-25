"use client"

import { useParams, useRouter } from "next/navigation"
import { ProgramRegister } from "@/components/program-register"
import { useAppState } from "@/lib/app-state"
import type { Program } from "@/lib/mock-data"

export default function EditProgramPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { records, updateProgram } = useAppState()
  const record = records.find((r) => r.program.id === params.id)

  if (!record) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-muted-foreground">
        존재하지 않는 공고입니다.
      </div>
    )
  }

  return (
    <ProgramRegister
      initial={record.program}
      onComplete={(p: Program) => {
        updateProgram(record.program.id, p)
        router.push("/")
      }}
    />
  )
}
