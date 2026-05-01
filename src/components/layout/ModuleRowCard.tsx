import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModuleRowCardProps {
  title: string
  subtitle?: string | React.ReactNode
  tertiary?: string | React.ReactNode
  amount?: string | React.ReactNode
  statusLabel?: string
  statusClassName?: string
  onClick?: () => void
  onActionClick?: () => void
  actionAriaLabel?: string
  className?: string
  index?: number
}

export default function ModuleRowCard({
  title,
  subtitle,
  tertiary,
  amount,
  statusLabel,
  statusClassName,
  onClick,
  onActionClick,
  actionAriaLabel = 'Open actions',
  className,
  index = 0,
}: ModuleRowCardProps) {
  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "group relative flex w-full cursor-pointer items-center gap-[var(--bd-row-gap)] rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] p-[var(--bd-card-padding)] md:p-3.5 text-left transition-all hover:bg-[hsl(var(--bd-surface-muted))] active:scale-[0.985] shadow-sm",
        className
      )}
    >
      <div className="min-w-0 flex-1 flex flex-col md:flex-row md:items-center md:gap-6">
        <div className="min-w-0 md:min-w-[240px] md:flex-shrink-0">
          <div className="truncate text-[16px] font-bold tracking-[-0.03em] text-[hsl(var(--bd-text))]">
            {title}
          </div>
          <div className="mt-[var(--bd-space-xs)] md:hidden truncate text-[13px] font-medium leading-relaxed text-[hsl(var(--bd-text-muted))]">
            {subtitle}
          </div>
        </div>

        <div className="hidden md:flex flex-1 items-center gap-6 text-[13px] font-medium text-[hsl(var(--bd-text-muted))]">
          {subtitle && (
            <div className="truncate opacity-80 min-w-[120px]">
              {subtitle}
            </div>
          )}
          {tertiary && (
            <div className="truncate opacity-60">
              {tertiary}
            </div>
          )}
        </div>

        {tertiary && (
          <div className="mt-[var(--bd-space-xs)] md:hidden truncate text-[12px] font-medium leading-relaxed text-[hsl(var(--bd-text-muted))] opacity-70">
            {tertiary}
          </div>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-4 md:gap-8">
        <div className="text-right">
          {amount && (
            <div className="text-[17px] md:text-[16px] font-black tracking-[-0.03em] text-[hsl(var(--bd-text))]">
              {amount}
            </div>
          )}
          {statusLabel && (
            <div className="mt-[var(--bd-space-xs)] md:mt-0.5">
              <span
                className={cn(
                  "inline-flex h-6 md:h-5 items-center rounded-full px-[var(--bd-space-sm)] text-[10px] font-black uppercase tracking-[var(--bd-label-letter-spacing)] shadow-sm ring-1 ring-black/5",
                  statusClassName
                )}
              >
                {statusLabel}
              </span>
            </div>
          )}
        </div>

        {onActionClick && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onActionClick()
            }}
            className="grid h-9 w-9 md:h-8 md:w-8 shrink-0 place-items-center rounded-[var(--bd-radius-md)] bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))] transition-colors hover:bg-[hsl(var(--bd-surface-action-hover))] hover:text-[hsl(var(--bd-text))]"
            aria-label={actionAriaLabel}
          >
            <MoreHorizontal className="h-5 w-5 md:h-4 md:w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
