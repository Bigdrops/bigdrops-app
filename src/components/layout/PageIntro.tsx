import type { ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { operationalPanelClassName } from '@/components/ui/operational-card-styles'

const accentBarClasses = {
  slate: 'bg-slate-900',
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  cyan: 'bg-cyan-500',
} as const

type PageIntroProps = {
  eyebrow?: string
  title: string
  description?: string
  meta?: string
  actions?: ReactNode
  toolbar?: ReactNode
  className?: string
  tone?: keyof typeof accentBarClasses
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
}: PageIntroProps) {
  return (
    <div className={cn(operationalPanelClassName, 'overflow-hidden', className)}>
      <div className={cn('h-1', accentBarClasses[tone])} />
      <div className="bg-[linear-gradient(180deg,rgba(248,250,252,0.9),#fff)] p-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label="Open navigation"
            className="grid h-[42px] w-[42px] place-items-center rounded-[14px] border border-slate-200 bg-white text-slate-900 shadow-sm"
          >
            <Menu size={18} />
          </button>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>

        {eyebrow ? <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</div> : null}
        <h2 className="mt-2 text-[28px] font-black leading-[1.05] tracking-[-0.045em] text-slate-900">{title}</h2>
        {meta ? <div className="mt-1 text-sm text-slate-500">{meta}</div> : null}
        {description ? <div className="mt-2.5 text-sm leading-[1.55] text-slate-500">{description}</div> : null}

        {toolbar ? <div className="mt-4">{toolbar}</div> : null}
      </div>
    </div>
  )
}
