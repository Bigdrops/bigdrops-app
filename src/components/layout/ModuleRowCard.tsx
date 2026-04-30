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
        "group relative flex w-full cursor-pointer items-center gap-4 rounded-[22px] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] p-4 text-left transition-all hover:bg-[hsl(var(--bd-surface-muted))] active:scale-[0.99] shadow-sm",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-bold tracking-tight text-[hsl(var(--bd-text))]">
          {title}
        </div>
        {subtitle && (
          <div className="mt-1 truncate text-[13px] font-medium leading-relaxed text-[hsl(var(--bd-text-muted))]">
            {subtitle}
          </div>
        )}
        {tertiary && (
          <div className="mt-0.5 truncate text-[12px] font-medium leading-relaxed text-[hsl(var(--bd-text-muted))] opacity-70">
            {tertiary}
          </div>
        )}
      </div>

      <div className="shrink-0 text-right">
        {amount && (
          <div className="text-[17px] font-black tracking-[-0.03em] text-[hsl(var(--bd-text))]">
            {amount}
          </div>
        )}
        {statusLabel && (
          <div className="mt-1.5">
            <span
              className={cn(
                "inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-black uppercase tracking-[0.08em] shadow-sm ring-1 ring-black/5",
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
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))] transition-colors hover:bg-[hsl(var(--bd-surface-action-hover))] hover:text-[hsl(var(--bd-text))]"
          aria-label={actionAriaLabel}
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
