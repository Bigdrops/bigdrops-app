import * as React from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

import type { KpiCardViewModel, KpiMetricId, KpiTone } from '@/config/kpiCards'
import { KPI_BAR_SEGMENTS, KPI_CARD_COUNT } from '@/config/kpiCards'
import { cn } from '@/lib/utils'

type KpiGridProps = {
  loading: boolean
  cards: KpiCardViewModel[]
}

const SEGMENT_BASE_CLASS = 'h-full w-[3px] shrink-0 transition-colors'
const SEGMENT_DIM_CLASS = 'bg-border opacity-50'

const TONE_SEGMENT_CLASS: Record<KpiTone, string> = {
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
  slate: 'bg-slate-400',
}

// View models carry only ids; the grid owns the visual tone mapping.
const METRIC_TONE: Record<KpiMetricId, KpiTone> = {
  totalInvoiced: 'emerald',
  thisMonthCollections: 'emerald',
  outstandingReceivables: 'amber',
  overdue: 'rose',
}

function TrendIndicator({ card }: { card: KpiCardViewModel }) {
  if (card.trendDirection === null) {
    return null
  }

  const isUp = card.trendDirection === 'up'

  return (
    <div className="flex items-center gap-[3px] text-[11px] text-muted-foreground">
      <span
        className={cn(
          'inline-flex items-center font-bold',
          card.trendPolarity === 'good' && (isUp
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400'),
        )}
      >
        {isUp ? <ArrowUpRight className="size-3" aria-hidden="true" /> : <ArrowDownRight className="size-3" aria-hidden="true" />}
        {card.trendText.split(' ')[0]}
      </span>
      <span>{card.trendText.split(' ').slice(1).join(' ')}</span>
    </div>
  )
}

function KpiBar({ card }: { card: KpiCardViewModel }) {
  const filledClass = TONE_SEGMENT_CLASS[METRIC_TONE[card.id]]

  return (
    <div className="flex h-3 items-center justify-start gap-[2px]" role="img" aria-label={card.barTitle}>
      {Array.from({ length: KPI_BAR_SEGMENTS }).map((_, index) => (
        <span
          key={index}
          className={cn(
            SEGMENT_BASE_CLASS,
            index < card.barFilledSegments ? filledClass : SEGMENT_DIM_CLASS,
          )}
        />
      ))}
    </div>
  )
}

// Informational only by design: no onClick, no button/link semantics.
function KpiCard({ card }: { card: KpiCardViewModel }) {
  return (
    <article className="flex flex-col gap-2 rounded-[var(--bd-radius-xl)] border border-border bg-card p-4 shadow-sm">
      <div className="truncate text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
        {card.label}
      </div>

      <div className="text-2xl font-extrabold leading-none tracking-[-0.02em] text-foreground">
        {card.valueText}
      </div>

      <KpiBar card={card} />

      <TrendIndicator card={card} />
    </article>
  )
}

function KpiCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--bd-radius-xl)] border border-border bg-card p-4 shadow-sm" aria-hidden="true">
      <div className="h-3 w-20 rounded bg-muted/80" />
      <div className="h-7 w-28 rounded bg-muted/80" />
      <div className="flex h-3 items-center gap-[2px]">
        {Array.from({ length: KPI_BAR_SEGMENTS }).map((_, index) => (
          <span key={index} className={cn(SEGMENT_BASE_CLASS, 'bg-muted/70')} />
        ))}
      </div>
      <div className="h-3 w-24 rounded bg-muted/60" />
    </div>
  )
}

export function KpiGrid({ loading, cards }: KpiGridProps) {
  const visibleCards = cards.slice(0, KPI_CARD_COUNT)

  return (
    <div className="grid grid-cols-2 gap-3">
      {loading || visibleCards.length === 0
        ? Array.from({ length: KPI_CARD_COUNT }).map((_, index) => <KpiCardSkeleton key={index} />)
        : visibleCards.map((card) => <KpiCard key={card.id} card={card} />)}
    </div>
  )
}
