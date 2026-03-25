import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SurfacePanelProps = {
  children: ReactNode
  className?: string
  tone?: 'default' | 'muted' | 'gradient'
}

const toneClassName: Record<NonNullable<SurfacePanelProps['tone']>, string> = {
  default: 'border-border bg-card shadow-sm',
  muted: 'border-border bg-muted/40 shadow-none',
  gradient:
    'border-zinc-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,252,0.98))] shadow-sm',
}

export function SurfacePanel({
  children,
  className,
  tone = 'default',
}: SurfacePanelProps) {
  return (
    <div className={cn('rounded-2xl border', toneClassName[tone], className)}>
      {children}
    </div>
  )
}
