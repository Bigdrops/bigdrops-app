import * as React from "react"
import { cn } from "@/lib/utils"

interface SettingsSummaryCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  action?: React.ReactNode
}

export function SettingsSummaryCard({
  title,
  description,
  action,
  children,
  className,
  ...props
}: SettingsSummaryCardProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg shadow-sm transition-all",
        className
      )}
      {...props}
    >
      {(title || description || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-[hsl(var(--bd-border)/0.4)] bg-[hsl(var(--bd-surface-muted)/0.3)] px-5 py-4">
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-sm font-bold text-bd-text">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-0.5 text-[12px] leading-relaxed text-bd-text-muted">
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="divide-y divide-[hsl(var(--bd-border)/0.3)]">
        {children}
      </div>
    </div>
  )
}

interface SettingsSummaryRowProps {
  label: string
  value?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export function SettingsSummaryRow({
  label,
  value,
  icon,
  className,
}: SettingsSummaryRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-[hsl(var(--bd-surface-muted)/0.2)]",
        className
      )}
    >
      {icon && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--bd-radius-md)] bg-bd-surface-muted text-bd-text-muted">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-bd-text-muted opacity-70">
          {label}
        </p>
        <div className="mt-0.5 text-sm font-medium text-bd-text truncate">
          {value || <span className="opacity-30 italic">Not set</span>}
        </div>
      </div>
    </div>
  )
}
