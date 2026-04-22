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
    <span className="rounded-[3px] border border-[#c7d2fe] bg-[#eef2ff] px-[6px] py-[1px] text-[9px] font-bold uppercase tracking-[0.05em] text-[#4338ca]">
      Invoice
    </span>
  )
}

function QuotationBadge() {
  return (
    <span className="rounded-[3px] border border-[#ddd6fe] bg-[#f5f3ff] px-[6px] py-[1px] text-[9px] font-bold uppercase tracking-[0.05em] text-[#7c3aed]">
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
    <article className="mb-[6px] rounded-[10px] border border-[#dedad2] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,.05)] last:mb-0">
      <div className="mb-1 flex flex-wrap items-center gap-[6px]">
        {href ? (
          <Link
            to={href}
            className="font-['JetBrains_Mono'] text-[12px] font-semibold text-[#4338ca] underline-offset-4 hover:underline"
          >
            {getHistoryDocumentLabel(row)}
          </Link>
        ) : (
          <span className="font-['JetBrains_Mono'] text-[12px] font-semibold text-[#4338ca]">
            {getHistoryDocumentLabel(row)}
          </span>
        )}

        <span className="text-[10px] text-[#c4bfb5]">.</span>
        {row.source_type === 'invoice' ? <InvoiceBadge /> : <QuotationBadge />}

        <span className="ml-auto shrink-0 font-['JetBrains_Mono'] text-[11px] text-[#8a8277]">
          {formatLastUsedDate(row.used_at)}
        </span>
      </div>

      <div className="mb-[6px] text-[12px] italic leading-snug text-[#57534a]">
        "{row.description || 'No description captured.'}"
      </div>

      <div className="flex items-center gap-3">
        <span className="font-['JetBrains_Mono'] text-[13px] font-bold text-[#1a1814]">
          {formatItemPrice(row.unit_price, 'No price')}
        </span>

        {quantityLabel ? (
          <span className="font-['JetBrains_Mono'] text-[11px] text-[#8a8277]">{quantityLabel}</span>
        ) : null}

        {row.amount !== null && row.amount !== undefined ? (
          <span className="ml-auto font-['JetBrains_Mono'] text-[12px] font-semibold text-[#57534a]">
            {formatItemPrice(row.amount)}
          </span>
        ) : null}
      </div>
    </article>
  )
}
