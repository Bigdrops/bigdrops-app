import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

const toneClasses = {
  slate: {
    accent: 'from-slate-700 via-slate-900 to-slate-700',
    eyebrow: 'border-slate-200 bg-slate-100/90 text-slate-700',
    toolbar: 'border-zinc-200/80 bg-white/78',
  },
  blue: {
    accent: 'from-sky-500 via-blue-600 to-sky-500',
    eyebrow: 'border-blue-200 bg-blue-50/90 text-blue-700',
    toolbar: 'border-blue-100/80 bg-white/78',
  },
  violet: {
    accent: 'from-violet-500 via-violet-600 to-fuchsia-500',
    eyebrow: 'border-violet-200 bg-violet-50/90 text-violet-700',
    toolbar: 'border-violet-100/80 bg-white/78',
  },
  emerald: {
    accent: 'from-emerald-500 via-emerald-600 to-teal-500',
    eyebrow: 'border-emerald-200 bg-emerald-50/90 text-emerald-700',
    toolbar: 'border-emerald-100/80 bg-white/78',
  },
  amber: {
    accent: 'from-amber-400 via-orange-500 to-amber-500',
    eyebrow: 'border-amber-200 bg-amber-50/90 text-amber-700',
    toolbar: 'border-amber-100/80 bg-white/78',
  },
  cyan: {
    accent: 'from-cyan-500 via-sky-500 to-cyan-500',
    eyebrow: 'border-cyan-200 bg-cyan-50/90 text-cyan-700',
    toolbar: 'border-cyan-100/80 bg-white/78',
  },
} as const

type PageIntroProps = {
  eyebrow?: string
  title: string
  description?: string
  meta?: string
  actions?: ReactNode
  toolbar?: ReactNode
  className?: string
  tone?: keyof typeof toneClasses
  compact?: boolean
}

export default function PageIntro({
  eyebrow,
  title,
  description,
  meta,
  actions,
  toolbar,
  className,
  tone = 'slate',
  compact = false,
}: PageIntroProps) {
  const palette = toneClasses[tone]

  return (
    <Card
      className={cn(
        'overflow-hidden rounded-[28px] border border-zinc-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(246,248,252,0.98))] shadow-[0_20px_40px_-28px_rgba(15,23,42,0.28)]',
        className,
      )}
    >
      <div className={cn('h-1 w-full bg-gradient-to-r', palette.accent)} />
      <CardContent className={cn('p-4', compact ? 'space-y-3' : 'space-y-4', 'sm:p-4')}>
        <div className={cn('flex items-start justify-between gap-3', compact ? 'min-h-[40px]' : 'min-h-[44px]')}>
          <div className="min-w-0">
            {eyebrow ? (
              <div
                className={cn(
                  'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]',
                  palette.eyebrow,
                )}
              >
                {eyebrow}
              </div>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div> : null}
        </div>

        <div className="min-w-0">
          <h1 className={cn('font-extrabold tracking-[-0.045em] text-foreground', compact ? 'text-[25px] leading-[1.02]' : 'text-[28px] leading-[1.02] sm:text-[30px]')}>
            {title}
          </h1>
          {meta ? <div className="mt-2 text-sm font-medium text-zinc-500">{meta}</div> : null}
          {description ? (
            <p className={cn('max-w-2xl text-sm text-muted-foreground', compact ? 'mt-2 leading-5.5' : 'mt-2.5 leading-6')}>
              {description}
            </p>
          ) : null}
        </div>

        {toolbar ? (
          <div
            className={cn(
              'rounded-[18px] border p-3 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.24)]',
              palette.toolbar,
            )}
          >
            {toolbar}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
