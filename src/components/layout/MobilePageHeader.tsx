import type { ReactNode } from 'react'

import { Menu } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { GlobalSearch } from '@/components/layout/GlobalSearch'

type MobilePageHeaderProps = {
  title: string
  subtitle?: string
  eyebrow?: string
  accentClassName?: string
  onMenuClick: () => void
  actions?: ReactNode
  className?: string
  hideGlobalSearch?: boolean
}

export default function MobilePageHeader({
  title,
  subtitle,
  eyebrow,
  accentClassName = 'tone-neutral-accent',
  onMenuClick,
  actions,
  className,
  hideGlobalSearch = false,
}: MobilePageHeaderProps) {
  return (
    <div
      className={cn(
        'rounded-[20px] border border-border/80 bg-background/95 px-3.5 py-2.5 shadow-sm',
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="mt-0.5 h-9 w-9 shrink-0 rounded-xl bg-muted/45 text-foreground/80 hover:bg-muted active:scale-95"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4.5 w-4.5" />
        </Button>

        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <div className="mb-0.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className={cn('h-1.5 w-1.5 rounded-full', accentClassName)} aria-hidden="true" />
              <span className="truncate">{eyebrow}</span>
            </div>
          ) : null}

          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0">
              <div className="truncate text-[16px] font-semibold leading-tight text-foreground">
                {title}
              </div>
              {subtitle ? (
                <div className="mt-px truncate text-[11px] text-muted-foreground">{subtitle}</div>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {actions}
              {!hideGlobalSearch && <GlobalSearch />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
