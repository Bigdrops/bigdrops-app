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
    tone: 'border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] text-[hsl(var(--bd-status-danger-text))]',
    icon: ReceiptIcon,
  },
  {
    key: 'requested',
    label: 'Requested',
    tone: 'border-[hsl(var(--bd-status-warning-border))] bg-[hsl(var(--bd-status-warning-bg))] text-[hsl(var(--bd-status-warning-text))]',
    icon: AlertCircle,
  },
  {
    key: 'received',
    label: 'Received',
    tone: 'border-[hsl(var(--bd-status-info-border))] bg-[hsl(var(--bd-status-info-bg))] text-[hsl(var(--bd-status-info-text))]',
    icon: Clock3,
  },
  {
    key: 'verified',
    label: 'Verified',
    tone: 'border-[hsl(var(--bd-status-success-border))] bg-[hsl(var(--bd-status-success-bg))] text-[hsl(var(--bd-status-success-text))]',
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
            className="rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[hsl(var(--bd-text-muted))]">
                  {item.label}
                </p>
                <p className="text-lg font-black tracking-tight text-[hsl(var(--bd-text))]">{value}</p>
                <p className="text-xs text-[hsl(var(--bd-text-muted))]">{detail}</p>
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
