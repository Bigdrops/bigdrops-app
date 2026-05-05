import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'

type QueueSeverity = 'overdue' | 'warning' | 'info'
type QueueTarget = 'vat' | 'wht' | 'filings' | 'obligations'

export interface ComplianceActionItem {
  id: string
  sourceType: 'WHT' | 'Filing' | 'Obligation' | 'VAT'
  title: string
  context: string
  statusLabel: string
  severity: QueueSeverity
  actionLabel: string
  targetSection: QueueTarget
  amountLabel?: string
  taxTypeLabel?: string
  dueLabel?: string
  periodLabel?: string
  secondaryMeta?: string[]
}

const sourceBadgeClasses: Record<ComplianceActionItem['sourceType'], string> = {
  WHT: 'border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-surface))] text-[hsl(var(--bd-status-danger-text))]',
  Filing: 'border-[hsl(var(--bd-status-success-border))] bg-[hsl(var(--bd-surface))] text-[hsl(var(--bd-status-success-text))]',
  Obligation: 'border-[hsl(var(--bd-status-warning-border))] bg-[hsl(var(--bd-surface))] text-[hsl(var(--bd-status-warning-text))]',
  VAT: 'border-[hsl(var(--bd-status-info-border))] bg-[hsl(var(--bd-surface))] text-[hsl(var(--bd-status-info-text))]',
}

export default function ComplianceActionRow({
  item,
  onNavigate,
}: {
  item: ComplianceActionItem
  onNavigate: (section: QueueTarget) => void
}) {
  const meta = [item.taxTypeLabel, item.periodLabel, item.dueLabel, ...(item.secondaryMeta ?? [])].filter(Boolean)

  return (
    <article className="rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={item.severity === 'overdue' ? 'danger' : item.severity === 'warning' ? 'warning' : 'info'}>
              {item.statusLabel}
            </StatusBadge>
            <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${sourceBadgeClasses[item.sourceType]}`}>
              {item.sourceType}
            </span>
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[hsl(var(--bd-text))]">{item.title}</h4>
            <p className="text-sm text-[hsl(var(--bd-text-muted))]">{item.context}</p>
          </div>

          {meta.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {meta.map((entry) => (
                <span
                  key={`${item.id}-${entry}`}
                  className="rounded-full border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--bd-text-muted))]"
                >
                  {entry}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex min-w-[164px] flex-col gap-3 lg:items-end">
          {item.amountLabel ? (
            <p className="text-sm font-black text-[hsl(var(--bd-text))]">{item.amountLabel}</p>
          ) : null}

          <Button
            type="button"
            variant="outline"
            className="h-10 justify-center rounded-[var(--bd-radius-lg)] border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-4 text-[10px] font-black uppercase tracking-[0.18em] text-[hsl(var(--bd-text))] hover:bg-[hsl(var(--bd-surface-muted))]"
            onClick={() => onNavigate(item.targetSection)}
          >
            {item.actionLabel}
          </Button>
        </div>
      </div>
    </article>
  )
}
