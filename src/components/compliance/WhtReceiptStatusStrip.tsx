import { AlertCircle, CheckCircle2, Clock3, ReceiptIcon } from 'lucide-react'

type WhtReceiptStatusCounts = {
  untracked: number
  requested: number
  received: number
  verified: number
  pending: number
}

const stripItems = [
  {
    key: 'untracked',
    label: 'Untracked',
    tone: 'border-bd-status-danger-border bg-bd-status-danger-bg text-bd-status-danger-text',
    icon: ReceiptIcon,
  },
  {
    key: 'requested',
    label: 'Requested',
    tone: 'border-bd-status-warning-border bg-bd-status-warning-bg text-bd-status-warning-text',
    icon: AlertCircle,
  },
  {
    key: 'received',
    label: 'Received',
    tone: 'border-bd-status-info-border bg-bd-status-info-bg text-bd-status-info-text',
    icon: Clock3,
  },
  {
    key: 'verified',
    label: 'Verified',
    tone: 'border-bd-status-success-border bg-bd-status-success-bg text-bd-status-success-text',
    icon: CheckCircle2,
  },
] as const

export default function WhtReceiptStatusStrip({ counts }: { counts: WhtReceiptStatusCounts }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stripItems.map((item) => {
        const Icon = item.icon
        const value = counts[item.key]
        const detail =
          item.key === 'requested' && counts.pending > 0
            ? `${counts.pending} pending follow-up`
            : item.key === 'untracked'
              ? 'No linked receipt record yet'
              : item.key === 'received'
                ? 'Needs review or verification'
                : 'Evidence is fully cleared'

        return (
          <article
            key={item.key}
            className="rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-card-bg p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-bd-text-muted">
                  {item.label}
                </p>
                <p className="text-lg font-black tracking-tight text-bd-text">{value}</p>
                <p className="text-xs text-bd-text-muted">{detail}</p>
              </div>

              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${item.tone}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </article>
        )
      })}
    </section>
  )
}
