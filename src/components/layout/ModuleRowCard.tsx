import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModuleRowCardProps {
  title: string
  subtitle?: string | React.ReactNode
  tertiary?: string | React.ReactNode
  amount?: string | React.ReactNode
  statusLabel?: string | string[]
  statusClassName?: string | string[]
  onClick?: () => void
  onActionClick?: () => void
  actionAriaLabel?: string
  isSelected?: boolean
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
  isSelected = false,
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
      aria-selected={isSelected}
      className={cn(
        "group relative flex w-full cursor-pointer items-center gap-3 rounded-[var(--bd-radius-lg)] border border-slate-200 dark:border-slate-800 bg-[hsl(var(--bd-surface))] p-3 md:p-2 text-left transition-all hover:bg-[hsl(var(--bd-surface-muted))] active:scale-[0.99] shadow-sm dark:shadow-black/10 md:shadow-none md:rounded-[var(--bd-radius-md)] md:border-x-0 md:border-t-0",
        isSelected && "border-[hsl(var(--bd-button-primary-bg))] bg-[hsl(var(--bd-button-primary-bg))]/5 shadow-[0_0_12px_-4px_hsl(var(--bd-button-primary-bg)/0.2)] md:border-l-4 md:border-l-[hsl(var(--bd-button-primary-bg))]",
        className
      )}
    >
      {isSelected && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 md:hidden">
           <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))] shadow-sm ring-2 ring-[hsl(var(--bd-surface))]">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
           </div>
        </div>
      )}
      <div className="min-w-0 flex-1 flex flex-col md:flex-row md:items-center md:gap-4">
        <div className="min-w-0 md:min-w-[200px] md:flex-shrink-0">
          <div className="truncate text-[15px] md:text-[14px] font-bold tracking-tight text-[hsl(var(--bd-text))]">
            {title}
          </div>
          {subtitle && (
            <div className="md:hidden truncate text-[12px] font-medium text-[hsl(var(--bd-text-muted))]">
              {subtitle}
            </div>
          )}
        </div>

        <div className="hidden md:flex flex-1 items-center gap-4 text-[13px] font-medium text-[hsl(var(--bd-text-muted))]">
          {subtitle && (
            <div className="truncate opacity-70 min-w-[140px]">
              {subtitle}
            </div>
          )}
          {tertiary && (
            <div className="truncate opacity-50">
              {tertiary}
            </div>
          )}
        </div>

        {tertiary && (
          <div className="md:hidden truncate text-[11px] font-medium text-[hsl(var(--bd-text-muted))] opacity-60">
            {tertiary}
          </div>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-3 md:gap-6">
        <div className="text-right">
          {amount && (
            <div className="text-[16px] md:text-[14px] font-black tracking-tight text-[hsl(var(--bd-text))]">
              {amount}
            </div>
          )}
          {statusLabel && (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {(Array.isArray(statusLabel) ? statusLabel : [statusLabel]).map((label, i) => {
                const cls = Array.isArray(statusClassName) ? statusClassName[i] || statusClassName[0] : statusClassName
                return (
                  <span
                    key={label}
                    className={cn(
                      "inline-flex h-5 items-center rounded-full px-2 text-[9px] font-black uppercase tracking-wider shadow-sm ring-1 ring-[hsl(var(--bd-border)/0.1)]",
                      cls
                    )}
                  >
                    {label}
                  </span>
                )
              })}
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
            onPointerDown={(e) => {
              e.stopPropagation()
            }}
            className="grid h-8 w-8 md:h-7 md:w-7 shrink-0 place-items-center rounded-[var(--bd-radius-md)] bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))] transition-colors hover:bg-[hsl(var(--bd-surface-action-hover))] hover:text-[hsl(var(--bd-text))]"
            aria-label={actionAriaLabel}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
