"use client"

import { useRouter } from "next/navigation"
import { ProgramRegister } from "@/components/program-register"
import { useAppState } from "@/lib/app-state"
import type { Program } from "@/lib/mock-data"

export default function NewProgramPage() {
  const router = useRouter()
  const { registerProgram } = useAppState()

  return (
    <ProgramRegister
      onComplete={(p: Program) => {
        return registerProgram(p).then(() => {
          router.push("/")
        })
      }}
    />
  )
}
