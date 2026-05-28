type ActivityTone = 'success' | 'warning' | 'danger' | 'info'

export interface ComplianceActivityItem {
  id: string
  title: string
  detail: string
  dateLabel: string
  amountLabel?: string
  tone: ActivityTone
}

const amountToneClasses: Record<ActivityTone, string> = {
  success: 'text-bd-status-success-text',
  warning: 'text-bd-status-warning-text',
  danger: 'text-bd-status-danger-text',
  info: 'text-bd-status-info-text',
}

export default function ComplianceRecentActivity({ items }: { items: ComplianceActivityItem[] }) {
  return (
    <section className="rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-card-bg shadow-sm">
      <div className="border-b border-bd-border bg-bd-surface-muted px-4 py-3">
        <h3 className="text-sm font-bold text-bd-text">Recent Compliance Activity</h3>
        <p className="mt-1 text-xs text-bd-text-muted">Latest recorded VAT, WHT, filing, and receipt changes.</p>
      </div>

      <div className="p-4">
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface px-3 py-3"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-bold text-bd-text">{item.title}</p>
                  <p className="text-xs text-bd-text-muted">{item.detail}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-bd-text-muted">
                    {item.dateLabel}
                  </p>
                </div>
                {item.amountLabel ? (
                  <p className={`shrink-0 text-sm font-black ${amountToneClasses[item.tone]}`}>{item.amountLabel}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--bd-radius-lg)] border border-dashed border-bd-border bg-bd-surface px-4 py-8 text-center">
            <p className="text-sm font-bold text-bd-text">No recent compliance activity yet.</p>
            <p className="mt-2 text-sm text-bd-text-muted">
              Activity will appear here as invoices, receipts, filings, and obligations are updated.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
