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
}: PageIntroProps) {
  const palette = toneClasses[tone]

  return (
    <Card
      className={cn(
        'overflow-hidden rounded-[28px] border border-zinc-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(243,247,252,0.98))] shadow-[0_18px_40px_-28px_rgba(15,23,42,0.4)]',
        className,
      )}
    >
      <div className={cn('h-1.5 w-full bg-gradient-to-r', palette.accent)} />
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="rounded-[22px] bg-[linear-gradient(180deg,rgba(248,250,252,0.88),rgba(255,255,255,0.98))] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
              <h1 className="mt-3 text-[26px] font-extrabold tracking-[-0.045em] text-foreground sm:text-[31px]">
                {title}
              </h1>
              {description ? (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                  {description}
                </p>
              ) : null}
              {meta ? <div className="mt-3 text-sm font-medium text-zinc-500">{meta}</div> : null}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        </div>

        {toolbar ? (
          <div
            className={cn(
              'rounded-[22px] border p-3 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.3)] sm:p-4',
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
