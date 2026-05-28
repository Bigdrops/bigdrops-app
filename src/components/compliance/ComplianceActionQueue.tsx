import ComplianceActionRow, { type ComplianceActionItem } from './ComplianceActionRow'

type QueueTarget = 'vat' | 'wht' | 'filings' | 'obligations'

export default function ComplianceActionQueue({
  items,
  onNavigate,
}: {
  items: ComplianceActionItem[]
  onNavigate: (section: QueueTarget) => void
}) {
  return (
    <section className="rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-card-bg shadow-sm">
      <div className="border-b border-bd-border bg-bd-surface-muted px-4 py-3">
        <h3 className="text-sm font-bold text-bd-text">Action Queue</h3>
        <p className="mt-1 text-xs text-bd-text-muted">Operational work from real compliance records only.</p>
      </div>

      <div className="space-y-3 p-4">
        {items.length > 0 ? (
          items.map((item) => (
            <ComplianceActionRow key={item.id} item={item} onNavigate={onNavigate} />
          ))
        ) : (
          <div className="rounded-[var(--bd-radius-lg)] border border-dashed border-bd-border bg-bd-surface px-4 py-10 text-center">
            <p className="text-sm font-bold text-bd-text">No urgent compliance actions right now.</p>
            <p className="mt-2 text-sm text-bd-text-muted">
              Your filings, receipts, and obligations are clear for the current view.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
