import type { ReactNode } from 'react'

export default function PageLoader({ children }: { children?: ReactNode } = {}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <div className="h-14 w-14 rounded-[18px] border border-zinc-900/10 bg-card shadow-[0_6px_18px_rgba(24,24,27,0.05)]" />
      {children}
    </div>
  )
}
