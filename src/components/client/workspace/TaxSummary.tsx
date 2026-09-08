import React from 'react'
import { formatCurrency } from '@/domain/clientWorkspace'

export interface ClientTaxSummary {
  vatPaid: number
  vatUnpaid: number
  /** Canonical WHT outstanding: expected WHT minus WHT already received. */
  whtOutstanding: number
}

interface Props {
  /** Null when the required invoice tax fields are not in the loaded data. */
  data: ClientTaxSummary | null
}

export const TaxSummary: React.FC<Props> = ({ data }) => {
  return (
    <section aria-label="Tax summary" className="rounded-2xl border border-bd-border bg-bd-surface p-5 shadow-sm">
      <h2 className="text-[10px] font-bold uppercase tracking-wider text-bd-text-muted">
        Tax summary
      </h2>
      {data ? (
        <dl className="mt-3 space-y-2.5">
          <TaxRow label="VAT paid" value={formatCurrency(data.vatPaid)} />
          <TaxRow label="VAT unpaid" value={formatCurrency(data.vatUnpaid)} />
          <TaxRow
            label="Total VAT"
            value={formatCurrency(data.vatPaid + data.vatUnpaid)}
            strong
          />
          <TaxRow label="WHT" value={formatCurrency(data.whtOutstanding)} />
        </dl>
      ) : (
        <p className="mt-3 text-xs font-semibold leading-relaxed text-muted-foreground">
          Tax figures need invoice tax fields that are not part of the
          current client data load.
        </p>
      )}
    </section>
  )
}

function TaxRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-2">
      <dt className="shrink-0 text-[11px] font-bold text-bd-text-muted">{label}</dt>
      <dd
        className={`truncate text-sm font-black tabular-nums ${
          strong ? 'text-foreground' : 'text-foreground/90'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}
