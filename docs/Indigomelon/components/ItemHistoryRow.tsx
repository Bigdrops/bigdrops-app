import React from 'react';
import type { ItemHistoryEntry } from '../../types/itemLibrary';

interface ItemHistoryRowProps {
  entry: ItemHistoryEntry;
  onNavigate?: (docNumber: string) => void;
}

const fmt = (n: number) =>
  '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0 });

const InvoiceBadge = () => (
  <span
    className={[
      'rounded-[3px] border border-[#c7d2fe] bg-[#eef2ff]',
      'px-[6px] py-[1px]',
      'text-[9px] font-bold uppercase tracking-[0.05em] text-[#4338ca]',
    ].join(' ')}
  >
    Invoice
  </span>
);

const QuotationBadge = () => (
  <span
    className={[
      'rounded-[3px] border border-[#ddd6fe] bg-[#f5f3ff]',
      'px-[6px] py-[1px]',
      'text-[9px] font-bold uppercase tracking-[0.05em] text-[#7c3aed]',
    ].join(' ')}
  >
    Quotation
  </span>
);

export const ItemHistoryRow: React.FC<ItemHistoryRowProps> = ({
  entry,
  onNavigate,
}) => {
  const handleClick = () => onNavigate?.(entry.docNumber);

  const qtyDisplay = entry.unit
    ? `× ${entry.quantity} ${entry.unit}`
    : `× ${entry.quantity}`;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label={`${entry.docNumber} — ${entry.originalDescription}`}
      className={[
        'rounded-[10px] border border-[#dedad2] bg-white',
        'mb-[6px] cursor-pointer p-3 last:mb-0',
        'shadow-[0_1px_3px_rgba(0,0,0,.05)]',
        'transition-all duration-150',
        'hover:border-[#c7d2fe] hover:shadow-[0_4px_14px_rgba(0,0,0,.07)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]',
      ].join(' ')}
    >
      {/* Line 1: Evidence — doc number, type, client, date */}
      <div className="mb-1 flex flex-wrap items-center gap-[6px]">
        <span className="font-['JetBrains_Mono'] text-[12px] font-semibold text-[#4338ca]">
          {entry.docNumber}
        </span>

        <span className="text-[10px] text-[#c4bfb5]">·</span>

        {entry.sourceType === 'invoice' ? <InvoiceBadge /> : <QuotationBadge />}

        <span className="text-[11px] font-semibold text-[#8a8277]">
          {entry.clientName}
        </span>

        {/* Date pushed to right */}
        <span className="ml-auto font-['JetBrains_Mono'] text-[11px] text-[#8a8277] flex-shrink-0">
          {entry.date}
        </span>
      </div>

      {/* Line 2: Original description (italic — exactly as written on the document) */}
      <div className="mb-[6px] text-[12px] italic leading-snug text-[#57534a]">
        &ldquo;{entry.originalDescription}&rdquo;
      </div>

      {/* Line 3: Pricing facts */}
      <div className="flex items-center gap-3">
        <span className="font-['JetBrains_Mono'] text-[13px] font-bold text-[#1a1814]">
          {fmt(entry.unitPrice)}
        </span>

        <span className="font-['JetBrains_Mono'] text-[11px] text-[#8a8277]">
          {qtyDisplay}
        </span>

        {/* Amount pushed to right */}
        <span className="ml-auto font-['JetBrains_Mono'] text-[12px] font-semibold text-[#57534a]">
          {fmt(entry.amount)}
        </span>
      </div>
    </article>
  );
};

export default ItemHistoryRow;
