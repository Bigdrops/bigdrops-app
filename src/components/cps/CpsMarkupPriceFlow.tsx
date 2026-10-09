import { cn } from '@/lib/utils'

/**
 * Shared row price presentation for Instant Markup.
 *
 * Both surfaces (Mobile/Fold sheet and Desktop dock) render the same reading
 * order so the workspace speaks one language:
 *
 *   CP ₦270.00   ·   SP ₦299.70   →   ₦332.67
 *
 * CP is immutable cost context and stays subdued. SP is the current working
 * selling price and stays readable. The arrow is the state transition. The
 * calculated destination carries the strongest weight and is the only element
 * that appears while a row is included.
 *
 * No pricing math lives here. Every value arrives as a prop from the engine.
 */

const moneyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function toNumber(value: unknown): number {
  const numeric = Number(String(value ?? '').replace(/,/g, ''))
  return Number.isFinite(numeric) ? numeric : 0
}

function money(value: unknown): string {
  return moneyFormatter.format(toNumber(value))
}

function signedMoney(value: unknown): string {
  return toNumber(value) > 0 ? `+${money(value)}` : money(value)
}

export function CpsMarkupPriceFlow({
  cp,
  sp,
  nextSp,
  excluded = false,
}: {
  cp: unknown
  sp: unknown
  /** Live calculated selling price. Null while the row is out of the run. */
  nextSp?: unknown
  /** Excluded rows keep CP and SP but never show a destination. */
  excluded?: boolean
}) {
  const hasDestination = !excluded && nextSp !== null && nextSp !== undefined && nextSp !== ''
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-mono">
      <span className="text-[11px] text-bd-text-muted">
        CP{' '}
        <b data-price="cp" className="font-semibold">
          {money(cp)}
        </b>
      </span>
      <span aria-hidden="true" className="text-[11px] text-bd-text-muted opacity-60">
        ·
      </span>
      <span className="text-[11.5px] text-bd-text">
        SP{' '}
        <b data-price="sp" className="font-semibold">
          {money(sp)}
        </b>
      </span>
      {hasDestination ? (
        <span className="flex items-baseline gap-1">
          <span
            data-price-arrow
            aria-hidden="true"
            className="text-[12px] font-bold text-bd-status-success-text"
          >
            →
          </span>
          <span className="sr-only">new selling price</span>
          <b
            data-price="next"
            className="text-[13.5px] font-black tabular-nums text-bd-status-success-text"
          >
            {money(nextSp)}
          </b>
        </span>
      ) : null}
      {excluded ? (
        <span className="text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-bd-text-muted">
          not marked up
        </span>
      ) : null}
    </div>
  )
}

/**
 * Dense financial readout. A transition metric shows before → after; a single
 * amount metric shows one value. `layout="row"` places the label and the value
 * on one line; the stacked layout uses two lines. No card chrome, so a summary
 * costs a line rather than a panel.
 */
export function CpsMarkupMetric({
  label,
  before,
  after,
  amount,
  tone = 'default',
  layout = 'stack',
  className,
}: {
  label: string
  before?: unknown
  after?: unknown
  /** Single money value, shown signed when tone is 'gain'. */
  amount?: unknown
  tone?: 'default' | 'gain'
  layout?: 'stack' | 'row'
  className?: string
}) {
  const isTransition = before !== undefined && after !== undefined
  const labelEl = (
    <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">
      {label}
    </span>
  )
  const moneyTone = tone === 'gain' ? 'text-bd-status-success-text' : 'text-bd-text'
  const valueEl = isTransition ? (
    <span className="flex flex-wrap items-baseline gap-x-1 font-mono">
      <span data-metric="before" className="text-[11px] text-bd-text-muted">
        {money(before)}
      </span>
      <span aria-hidden="true" className="text-[11px] text-bd-text-muted">
        →
      </span>
      <b data-metric="after" className="text-[11.5px] font-bold tabular-nums text-bd-text">
        {money(after)}
      </b>
    </span>
  ) : (
    <b
      data-metric="value"
      className={cn('font-mono text-[12.5px] font-black tabular-nums', moneyTone)}
    >
      {amount === undefined ? money(0) : signedMoney(amount)}
    </b>
  )

  if (layout === 'row') {
    return (
      <div className={cn('flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5', className)}>
        {labelEl}
        {valueEl}
      </div>
    )
  }

  return (
    <div className={cn('min-w-0', className)}>
      {labelEl}
      <span className="mt-0.5 block">{valueEl}</span>
    </div>
  )
}
