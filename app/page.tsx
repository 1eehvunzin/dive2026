'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Landmark, Lock, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const [id, setId] = useState('test')
  const [password, setPassword] = useState('testtester')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    router.push('/dashboard')
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-sidebar">
      <img
        src="/landing.svg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-black/5 to-transparent" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 sm:justify-end sm:px-24 lg:px-40">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card/95 p-8 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Landmark className="h-5 w-5" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-foreground">기업선정 인텔리전스</p>
              <p className="truncate text-xs text-muted-foreground">공공지원사업 매칭</p>
            </div>
          </div>

          <div className="mt-8">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">로그인</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">계정 정보를 입력해 주세요.</p>
          </div>

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-id">아이디</Label>
              <div className="relative">
                <User className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-id"
                  className="pl-9"
                  placeholder="아이디를 입력하세요"
                  autoComplete="username"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-password">비밀번호</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  className="pl-9"
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="mt-2 w-full">
              로그인
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
