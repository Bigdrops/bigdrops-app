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
    <span className="rounded-full border border-[#ceb392] bg-[#ead8c2] px-[8px] py-[2px] text-[9px] font-bold uppercase tracking-[0.08em] text-[#6a5037] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
      Invoice
    </span>
  )
}

function QuotationBadge() {
  return (
    <span className="rounded-full border border-[#d8c1a4] bg-[#f1e2cf] px-[8px] py-[2px] text-[9px] font-bold uppercase tracking-[0.08em] text-[#7a6147] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
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
    <article className="mb-[8px] rounded-[12px] border border-[#d8c6ae] bg-[linear-gradient(180deg,_#fffaf2_0%,_#f8efe2_100%)] p-3 shadow-[0_14px_24px_rgba(96,72,45,0.08),inset_0_1px_0_rgba(255,255,255,0.5)] last:mb-0">
      <div className="mb-1 flex flex-wrap items-center gap-[6px]">
        {href ? (
          <Link
            to={href}
            className="font-['JetBrains_Mono'] text-[12px] font-semibold text-[#765538] underline-offset-4 hover:underline"
          >
            {getHistoryDocumentLabel(row)}
          </Link>
        ) : (
          <span className="font-['JetBrains_Mono'] text-[12px] font-semibold text-[#765538]">
            {getHistoryDocumentLabel(row)}
          </span>
        )}

        <span className="text-[10px] text-[#c7b39d]">.</span>
        {row.source_type === 'invoice' ? <InvoiceBadge /> : <QuotationBadge />}

        <span className="ml-auto shrink-0 font-['JetBrains_Mono'] text-[11px] text-[#8a755f]">
          {formatLastUsedDate(row.used_at)}
        </span>
      </div>

      <div className="mb-[6px] text-[12px] italic leading-snug text-[#5a4734]">
        "{row.description || 'No description captured.'}"
      </div>

      <div className="flex items-center gap-3">
        <span className="font-['JetBrains_Mono'] text-[13px] font-bold text-[#2e2419]">
          {formatItemPrice(row.unit_price, 'No price')}
        </span>

        {quantityLabel ? (
          <span className="font-['JetBrains_Mono'] text-[11px] text-[#8d7962]">{quantityLabel}</span>
        ) : null}

        {row.amount !== null && row.amount !== undefined ? (
          <span className="ml-auto font-['JetBrains_Mono'] text-[12px] font-semibold text-[#5a4632]">
            {formatItemPrice(row.amount)}
          </span>
        ) : null}
      </div>
    </article>
  )
}
