import React from 'react'
import { formatCurrency } from '@/domain/clientWorkspace'

interface Props {
  total: number
  collected: number
  outstanding: number
  quotationCount: number | null
  convertedCount: number
}

export const MoneyPositionStrip: React.FC<Props> = ({ total, collected, outstanding, quotationCount, convertedCount }) => {
  const settled = outstanding <= 0

  return (
    <section aria-label="Financial position" className="rounded-2xl border border-bd-border bg-bd-surface p-5 shadow-sm">
      <h2 className="text-[10px] font-bold uppercase tracking-wider text-bd-text-muted">
        Money position
      </h2>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span
          className={`text-[28px] font-black tabular-nums tracking-tight ${
            settled ? 'text-[hsl(var(--bd-status-success-text))]' : 'text-[hsl(var(--bd-status-danger-text))]'
          }`}
        >
          {formatCurrency(outstanding)}
        </span>
        <span className="text-xs font-bold text-bd-text-muted">
          {settled ? 'Settled' : 'outstanding'}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-bd-border/60 pt-4">
        <div className="min-w-0">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-bd-text-muted">
            Invoiced
          </dt>
          <dd className="mt-1 truncate text-base font-black tabular-nums text-foreground">
            {formatCurrency(total)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-bd-text-muted">
            Collected
          </dt>
          <dd className="mt-1 truncate text-base font-black tabular-nums text-[hsl(var(--bd-status-success-text))]">
            {formatCurrency(collected)}
          </dd>
        </div>
      </dl>
      {typeof quotationCount === 'number' && (
        <div className="mt-4 border-t border-bd-border/60 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-bd-text-muted">
            Quotations
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xs font-black tabular-nums text-foreground">
              {quotationCount}
            </span>
            {quotationCount > 0 && (
              <span className="text-[10px] font-bold text-bd-text-muted">
                {quotationCount - convertedCount} Open · {convertedCount} Converted
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
