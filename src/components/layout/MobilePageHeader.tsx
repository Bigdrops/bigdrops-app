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
  eyebrowClassName?: string
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
  eyebrowClassName,
  onMenuClick,
  actions,
  className,
  hideGlobalSearch = false,
}: MobilePageHeaderProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border))/0.8] bg-[hsl(var(--bd-surface)/0.95)] px-[var(--bd-space-md)] py-[var(--bd-space-sm)] shadow-sm',
        className,
      )}
    >
      <div className="flex items-start gap-[var(--bd-space-sm)]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="mt-[var(--bd-space-xs)] h-9 w-9 shrink-0 rounded-[var(--bd-radius-md)] bg-[hsl(var(--bd-surface-muted))/0.45] text-[hsl(var(--bd-text))/0.8] hover:bg-[hsl(var(--bd-surface-muted))] active:scale-95 focus-visible:ring-2 focus-visible:ring-[hsl(var(--bd-focus-ring))]"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4.5 w-4.5" />
        </Button>

        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <div className={cn(
              "mb-[var(--bd-space-xs)] flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[var(--bd-label-letter-spacing)]",
              eyebrowClassName || "text-[hsl(var(--bd-text-muted))]"
            )}>
              <span className={cn('h-1.5 w-1.5 rounded-full', accentClassName)} aria-hidden="true" />
              <span className="truncate">{eyebrow}</span>
            </div>
          ) : null}

          <div className="flex items-start justify-between gap-[var(--bd-space-sm)]">
            <div className="min-w-0">
              <div className="truncate text-[16px] font-semibold leading-tight text-[hsl(var(--bd-text))]">
                {title}
              </div>
              {subtitle ? (
                <div className="mt-px truncate text-[11px] text-[hsl(var(--bd-text-muted))]">{subtitle}</div>
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
