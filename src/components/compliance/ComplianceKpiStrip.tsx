import { type ReactNode } from 'react'

type KpiTone = 'success' | 'warning' | 'danger' | 'info'

export interface ComplianceKpiItem {
  label: string
  value: string
  detail?: string
  icon: ReactNode
  tone: KpiTone
}

const toneClasses: Record<KpiTone, string> = {
  success: 'border-[hsl(var(--bd-status-success-border))] bg-[hsl(var(--bd-status-success-bg))] text-[hsl(var(--bd-status-success-text))]',
  warning: 'border-[hsl(var(--bd-status-warning-border))] bg-[hsl(var(--bd-status-warning-bg))] text-[hsl(var(--bd-status-warning-text))]',
  danger: 'border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] text-[hsl(var(--bd-status-danger-text))]',
  info: 'border-[hsl(var(--bd-status-info-border))] bg-[hsl(var(--bd-status-info-bg))] text-[hsl(var(--bd-status-info-text))]',
}

export default function ComplianceKpiStrip({ items }: { items: ComplianceKpiItem[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[hsl(var(--bd-text))]">Today</h3>
          <p className="mt-1 text-sm text-[hsl(var(--bd-text-muted))]">What needs my attention now?</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <article
            key={item.label}
            className="rounded-[var(--bd-radius-lg)] border bg-[hsl(var(--bd-card-bg))] p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[hsl(var(--bd-text-muted))]">
                  {item.label}
                </p>
                <p className="text-lg font-black tracking-tight text-[hsl(var(--bd-text))]">{item.value}</p>
                {item.detail ? (
                  <p className="text-xs text-[hsl(var(--bd-text-muted))]">{item.detail}</p>
                ) : null}
              </div>

              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${toneClasses[item.tone]}`}>
                {item.icon}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
