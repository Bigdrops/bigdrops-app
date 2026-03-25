import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type EmptyStateProps = {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center shadow-sm',
        className,
      )}
    >
      {icon ? <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50">{icon}</div> : null}
      <div className="mt-4 text-sm font-semibold text-foreground">{title}</div>
      {description ? <div className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
