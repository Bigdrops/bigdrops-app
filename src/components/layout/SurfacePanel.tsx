import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SurfacePanelProps = {
  children: ReactNode
  className?: string
  tone?: 'default' | 'muted'
}

const toneClassName: Record<NonNullable<SurfacePanelProps['tone']>, string> = {
  default: 'border-border bg-card shadow-sm',
  muted: 'border-border bg-muted/40 shadow-none',
}

export function SurfacePanel({
  children,
  className,
  tone = 'default',
}: SurfacePanelProps) {
  return (
    <div
      data-slot="surface-panel"
      className={cn('rounded-2xl border', toneClassName[tone], className)}
    >
      {children}
    </div>
  )
}
