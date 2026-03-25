import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

type PageIntroProps = {
  eyebrow?: string
  title: string
  description?: string
  meta?: string
  actions?: ReactNode
  toolbar?: ReactNode
  className?: string
}

export default function PageIntro({
  eyebrow,
  title,
  description,
  meta,
  actions,
  toolbar,
  className,
}: PageIntroProps) {
  return (
    <Card
      className={cn(
        'overflow-hidden border-zinc-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,252,0.98))] shadow-sm',
        className,
      )}
    >
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            {eyebrow ? (
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{eyebrow}</div>
            ) : null}
            <h1 className="mt-1 text-[22px] font-extrabold tracking-[-0.03em] text-foreground sm:text-[26px]">{title}</h1>
            {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>

        {(meta || toolbar) ? (
          <div className="space-y-3 border-t border-zinc-200/80 pt-4">
            {meta ? <div className="text-xs font-medium text-zinc-500">{meta}</div> : null}
            {toolbar}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
