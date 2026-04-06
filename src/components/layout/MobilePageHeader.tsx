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
    <div className={cn('rounded-[20px] border border-border/80 bg-background/95 px-3.5 py-3 shadow-sm', className)}>
      <div className="flex items-start gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onMenuClick}
          className="mt-0.5 h-9 w-9 rounded-xl border-border bg-muted/40 text-foreground shadow-none"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className={cn('h-1.5 w-1.5 rounded-full', accentClassName)} aria-hidden="true" />
              <span className="truncate">{eyebrow}</span>
            </div>
          ) : null}

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[17px] font-semibold leading-tight text-foreground">{title}</div>
              {subtitle ? (
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</div>
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
