import * as React from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DocumentSectionProps = {
  title: ReactNode
  children?: ReactNode
  className?: string
  defaultOpen?: boolean
  summary?: ReactNode
}

export function DocumentSection({
  title,
  children,
  className = '',
  defaultOpen = false,
  summary = '',
}: DocumentSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <section className={cn('space-y-2', className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-bd-border bg-bd-surface px-4 py-3 text-left shadow-sm transition hover:bg-bd-surface-muted/30"
      >
        <div className="min-w-0">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">{title}</div>
          {summary ? <div className="mt-1 text-sm text-muted-foreground">{summary}</div> : null}
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-bd-border bg-bd-surface text-bd-text-muted">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>
      {open ? children : null}
    </section>
  )
}
