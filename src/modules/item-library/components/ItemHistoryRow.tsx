import { Link } from 'react-router-dom'

import type { ItemHistoryRow as ItemHistoryRecord } from '../types'
import {
  formatItemPrice,
  formatLastUsedDate,
  getHistoryDocumentHref,
  getHistoryDocumentLabel,
} from './itemLibraryFormatters'

type ItemHistoryRowProps = {
  row: ItemHistoryRecord
}

function InvoiceBadge() {
  return (
    <span className="rounded-full border border-bd-status-info-border bg-bd-status-info-bg px-[8px] py-[2px] text-[9px] font-bold uppercase tracking-[0.08em] text-bd-status-info-text shadow-sm">
      Invoice
    </span>
  )
}

function QuotationBadge() {
  return (
    <span className="rounded-full border border-bd-status-neutral-border bg-bd-status-neutral-bg px-[8px] py-[2px] text-[9px] font-bold uppercase tracking-[0.08em] text-bd-status-neutral-text shadow-sm">
      Quotation
    </span>
  )
}

export function ItemHistoryRow({ row }: ItemHistoryRowProps) {
  const href = getHistoryDocumentHref(row)
  const quantityLabel =
    row.quantity === null || row.quantity === undefined
      ? null
      : row.unit
        ? `x ${Number(row.quantity).toLocaleString()} ${row.unit}`
        : `x ${Number(row.quantity).toLocaleString()}`

  return (
    <article className="mb-[8px] rounded-lg border border-bd-border bg-bd-surface p-3 shadow-sm last:mb-0">
      <div className="mb-1 flex flex-wrap items-center gap-[6px]">
        {href ? (
          <Link
            to={href}
            className="font-mono text-[12px] font-semibold text-bd-text underline-offset-4 hover:underline"
          >
            {getHistoryDocumentLabel(row)}
          </Link>
        ) : (
          <span className="font-mono text-[12px] font-semibold text-bd-text">
            {getHistoryDocumentLabel(row)}
          </span>
        )}

        <span className="text-[10px] text-bd-text-muted opacity-40">.</span>
        {row.source_type === 'invoice' ? <InvoiceBadge /> : <QuotationBadge />}

        <span className="ml-auto shrink-0 font-mono text-[11px] text-bd-text-muted">
          {formatLastUsedDate(row.used_at)}
        </span>
      </div>

      <div className="mb-[6px] text-[12px] italic leading-snug text-bd-text-muted">
        "{row.description || 'No description captured.'}"
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono text-[13px] font-bold text-bd-text">
          {formatItemPrice(row.unit_price, 'No price')}
        </span>

        {quantityLabel ? (
          <span className="font-mono text-[11px] text-bd-text-muted opacity-80">{quantityLabel}</span>
        ) : null}

        {row.amount !== null && row.amount !== undefined ? (
          <span className="ml-auto font-mono text-[12px] font-semibold text-bd-text opacity-90">
            {formatItemPrice(row.amount)}
          </span>
        ) : null}
      </div>
    </article>
  )
}
