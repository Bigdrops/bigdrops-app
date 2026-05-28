import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'
import { getStatusTone, type StatusTone } from '@/lib/statusTheme'
import { type WhtReceipt } from '@/domain/compliance/types'

export type WhtPaymentRecord = {
  id: string
  invoice_id?: string | null
  invoice_number?: string | null
  client_name?: string | null
  date?: string | null
  wht_amount?: number | string | null
  total?: number | string | null
}

export type WhtQueueStatus = 'untracked' | 'requested' | 'pending' | 'received' | 'verified'

export type WhtReceiptQueueEntry = {
  id: string
  rank: number
  status: WhtQueueStatus
  actionLabel: string
  payment: WhtPaymentRecord
  receipt: WhtReceipt | null
}

const statusMeta: Record<
  WhtQueueStatus,
  {
    label: string
    variant: StatusTone
  }
> = {
  untracked: { label: 'Untracked', variant: 'danger' },
  requested: { label: 'Requested', variant: 'warning' },
  pending: { label: 'Pending', variant: 'info' },
  received: { label: 'Received', variant: 'info' },
  verified: { label: 'Verified', variant: 'success' },
}

export default function WhtReceiptQueueRow({
  entry,
  onOpen,
  processing,
}: {
  entry: WhtReceiptQueueEntry
  onOpen: (entry: WhtReceiptQueueEntry) => void
  processing: boolean
}) {
  const meta = statusMeta[entry.status]
  const receiptNumber = entry.receipt?.receipt_number
  const hasNotes = !!entry.receipt?.notes?.trim()
  const paymentDate = entry.payment.date ? formatDisplayDate(entry.payment.date) : 'No payment date'

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(entry)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(entry)
        }
      }}
      className="rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-card-bg p-4 shadow-sm transition-colors hover:bg-bd-surface-muted focus:outline-none focus:ring-2 focus:ring-bd-button-primary-bg"
    >
      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] xl:items-center">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={meta.variant} dot>
              {meta.label}
            </StatusBadge>
            {hasNotes ? (
              <Badge
                variant="outline"
                className="rounded-full border-bd-border bg-bd-surface px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-bd-text-muted"
              >
                Notes
              </Badge>
            ) : null}
          </div>

          <div className="space-y-1">
            <p className="truncate text-sm font-bold text-bd-text">{entry.payment.client_name || entry.receipt?.client_name || 'Unknown client'}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-bd-text-muted">
              {entry.payment.invoice_id ? (
                <Link
                  to={`/invoices/${entry.payment.invoice_id}`}
                  onClick={(event) => event.stopPropagation()}
                  className="font-semibold text-bd-text transition-colors hover:text-bd-button-primary-bg hover:underline"
                >
                  {entry.payment.invoice_number || 'Invoice record'}
                </Link>
              ) : (
                <span>{entry.payment.invoice_number || 'Payment-linked WHT'}</span>
              )}
              <span>{paymentDate}</span>
              {receiptNumber ? <span>Receipt {receiptNumber}</span> : null}
            </div>
          </div>
        </div>

        <div className="grid gap-2 text-xs text-bd-text-muted sm:grid-cols-3 xl:grid-cols-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-bd-text-muted">WHT Amount</p>
            <p className="mt-1 text-sm font-black text-bd-status-danger-text">{formatNaira(entry.payment.wht_amount)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-bd-text-muted">Current State</p>
            <p className="mt-1 text-sm font-semibold text-bd-text">{meta.label}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-bd-text-muted">Evidence Ref</p>
            <p className="mt-1 truncate text-sm font-semibold text-bd-text">{receiptNumber || 'Not recorded'}</p>
          </div>
        </div>

        <div className="flex xl:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation()
              onOpen(entry)
            }}
            className="h-10 min-w-[148px] rounded-[var(--bd-radius-lg)] border-bd-border bg-bd-surface px-4 text-[10px] font-black uppercase tracking-[0.18em] text-bd-text hover:bg-bd-surface-muted"
          >
            {processing ? 'Working...' : entry.actionLabel}
          </Button>
        </div>
      </div>
    </article>
  )
}
