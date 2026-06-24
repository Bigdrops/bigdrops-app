import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SidebarToggleIcon } from '@/components/unlumen-ui/sidebar-toggle-icon'
import { operationalPanelClassName } from '@/components/ui/operational-card-styles'

const accentBarClasses = {
  slate: 'tone-neutral-accent',
  blue: 'tone-info-accent',
  violet: 'tone-accent-accent',
  emerald: 'tone-success-accent',
  amber: 'tone-warning-accent',
  cyan: 'tone-data-accent',
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
  isOpen?: boolean
  onMenuClick?: () => void
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
  isOpen = false,
  onMenuClick,
}: PageIntroProps) {
  return (
    <div className={cn(operationalPanelClassName, 'overflow-hidden', className)}>
      <div className={cn('h-1', accentBarClasses[tone])} />
      <div className="page-intro-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
            className="grid h-[42px] w-[42px] place-items-center rounded-[14px] border border-bd-border bg-bd-surface text-bd-text shadow-sm"
          >
            <SidebarToggleIcon
              isOpen={isOpen}
              strokeWidth={2}
              className="w-[18px] h-[18px] text-bd-text"
            />
          </button>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>

        {eyebrow ? <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</div> : null}
        <h2 className="mt-2 text-[28px] font-black leading-[1.05] tracking-[-0.045em] text-foreground">{title}</h2>
        {meta ? <div className="mt-1 text-sm text-muted-foreground">{meta}</div> : null}
        {description ? <div className="mt-2.5 text-sm leading-[1.55] text-muted-foreground">{description}</div> : null}

        {toolbar ? <div className="mt-4">{toolbar}</div> : null}
      </div>
    </div>
  )
}
