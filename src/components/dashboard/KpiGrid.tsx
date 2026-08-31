import * as React from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

import type { KpiCardViewModel, KpiMetricId, KpiTone } from '@/config/kpiCards'
import { KPI_BAR_SEGMENTS } from '@/config/kpiCards'
import { cn } from '@/lib/utils'

type KpiGridProps = {
  loading: boolean
  cards: KpiCardViewModel[]
  maxCards?: number
}

// V6 tick bar: thin vertical segments
const TICK_BASE = 'h-[9px] w-[3px] shrink-0 rounded-[1.5px] transition-colors'

// V6 color tokens mapped to semantic CSS variables
const TICK_DIM = 'bg-[hsl(var(--line-strong))]'

const TICK_FILLED: Record<KpiTone, string> = {
  emerald: 'bg-[hsl(var(--primary))]',
  rose: 'bg-[hsl(var(--attention))]',
  violet: 'bg-[hsl(var(--primary))]',
  amber: 'bg-[hsl(var(--secondary))]',
  sky: 'bg-[hsl(var(--primary))]',
  slate: 'bg-[hsl(var(--ink-3))]',
}

// ponytail: segment fill color per metric tone — single source for bar coloring
const METRIC_TICK_TONE: Record<KpiMetricId, KpiTone> = {
  totalInvoiced: 'emerald',
  thisMonthCollections: 'emerald',
  outstandingReceivables: 'amber',
  overdue: 'rose',
  vatOnPaid: 'violet',
  vatUnpaid: 'violet',
  whtOnPaid: 'sky',
  whtOutstanding: 'sky',
}

// V6 metric card tone classes
// "collect" = gradient card (collected this month)
// "overdue" = attention-tinted
// "awaiting" = secondary-tinted
// default = standard card
const METRIC_VARIANT: Record<KpiMetricId, 'default' | 'collect' | 'overdue' | 'awaiting'> = {
  totalInvoiced: 'default',
  thisMonthCollections: 'collect',
  outstandingReceivables: 'awaiting',
  overdue: 'overdue',
  vatOnPaid: 'default',
  vatUnpaid: 'default',
  whtOnPaid: 'default',
  whtOutstanding: 'default',
}

function TickBar({ card }: { card: KpiCardViewModel }) {
  const variant = METRIC_VARIANT[card.id]
  const isCollect = variant === 'collect'

  return (
    <div className="flex items-center gap-[2.5px]" role="img" aria-label={card.barTitle}>
      {Array.from({ length: KPI_BAR_SEGMENTS }).map((_, index) => (
        <span
          key={index}
          className={cn(
            TICK_BASE,
            index < card.barFilledSegments
              ? isCollect
                ? 'bg-white/80'
                : TICK_FILLED[METRIC_TICK_TONE[card.id]]
              : isCollect
                ? 'bg-white/25'
                : TICK_DIM,
          )}
        />
      ))}
    </div>
  )
}

function TrendIndicator({ card, isCollect }: { card: KpiCardViewModel; isCollect: boolean }) {
  if (card.trendDirection === null) {
    return null
  }

  const isUp = card.trendDirection === 'up'

  return (
    <div className={cn(
      'mt-auto flex items-center gap-1 text-[8px] leading-[1.3]',
      isCollect ? 'text-white/78' : 'text-[hsl(var(--ink-3))]',
    )}>
      <span
        className={cn(
          'inline-flex items-center font-[800]',
          !isCollect && card.trendPolarity === 'good' && (isUp
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400'),
          isCollect && 'text-white',
        )}
      >
        {!isCollect && isUp && (
          <span className="mr-0.5 inline-block translate-y-[-1px] text-[6px] text-emerald-500">▲</span>
        )}
        {card.trendText.split(' ')[0]}
      </span>
      <span>{card.trendText.split(' ').slice(1).join(' ')}</span>
    </div>
  )
}

// V6 metric card — matches the V6 HTML prototype structure
function KpiCard({ card }: { card: KpiCardViewModel }) {
  const variant = METRIC_VARIANT[card.id]
  const isCollect = variant === 'collect'
  const isOverdue = variant === 'overdue'
  const isAwaiting = variant === 'awaiting'

  return (
    <article
      className={cn(
        'relative flex min-h-[108px] flex-col overflow-hidden rounded-[18px] border p-[11px_12px_10px] text-left transition-all md:min-h-[116px] md:p-[12px_14px_11px] lg:min-h-[120px] lg:p-[14px_16px_12px]',
        isCollect
          ? 'border-transparent bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] text-white shadow-lg'
          : isOverdue
            ? 'border-[hsl(var(--line))] bg-[hsl(var(--surface))] shadow-md'
            : isAwaiting
              ? 'border-[hsl(var(--line))] bg-[hsl(var(--surface))] shadow-md'
              : 'border-[hsl(var(--line))] bg-[hsl(var(--surface))] shadow-md',
      )}
      style={{
        boxShadow: isCollect
          ? undefined
          : '0 12px 28px color-mix(in srgb, var(--primary) 8%, transparent), 0 2px 6px rgba(15,23,42,.04)',
      }}
    >
      {/* V6 decorative circles */}
      <div
        className="pointer-events-none absolute -bottom-[42px] -right-[36px] h-[84px] w-[84px] rounded-full opacity-50"
        style={{
          background: isCollect
            ? 'radial-gradient(circle at 35% 35%, rgba(255,255,255,.35), rgba(255,255,255,0) 140%)'
            : isOverdue
              ? 'radial-gradient(circle at 35% 35%, hsl(var(--attention-soft)), hsl(var(--attention)) 140%)'
              : isAwaiting
                ? 'radial-gradient(circle at 35% 35%, hsl(var(--secondary-soft, var(--secondary) / 0.13)), hsl(var(--secondary)) 140%)'
                : 'radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.14), hsl(var(--primary)) 140%)',
        }}
      />
      <div
        className={cn(
          'pointer-events-none absolute -top-[14px] right-[10px] h-[34px] w-[34px] rounded-full border-2 opacity-55',
          isCollect ? 'border-white/40' : 'border-[hsl(var(--primary))]/20',
        )}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col gap-2">
        <div
          className={cn(
            'truncate text-[8px] font-[800] uppercase leading-[1.2] tracking-[0.07em]',
            isCollect ? 'text-white/78' : 'text-[hsl(var(--ink-2))]',
          )}
        >
          {card.label}
        </div>

        <TickBar card={card} />

        <div
          className={cn(
            'font-[\'DM_Mono\',ui-monospace,SFMono-Regular,Menlo,monospace] text-[17px] font-medium tracking-[-.075em] whitespace-nowrap',
            isCollect ? 'text-white' : 'text-[hsl(var(--ink))]',
          )}
        >
          {card.valueText}
        </div>

        <TrendIndicator card={card} isCollect={isCollect} />
      </div>
    </article>
  )
}

function KpiCardSkeleton() {
  return (
    <div
      className="flex min-h-[108px] flex-col gap-2 rounded-[18px] border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-[11px_12px_10px] shadow-md md:min-h-[116px] md:p-[12px_14px_11px] lg:min-h-[120px] lg:p-[14px_16px_12px]"
      aria-hidden="true"
    >
      <div className="h-2 w-20 rounded bg-[hsl(var(--surface-muted))]/80" />
      <div className="flex items-center gap-[2px]">
        {Array.from({ length: KPI_BAR_SEGMENTS }).map((_, index) => (
          <span key={index} className={cn(TICK_BASE, 'bg-[hsl(var(--surface-muted))]/70')} />
        ))}
      </div>
      <div className="h-[17px] w-28 rounded bg-[hsl(var(--surface-muted))]/80" />
      <div className="mt-auto h-2 w-24 rounded bg-[hsl(var(--surface-muted))]/60" />
    </div>
  )
}

export function KpiGrid({ loading, cards, maxCards = 4 }: KpiGridProps) {
  const visibleCards = cards.slice(0, maxCards)

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
      {loading || visibleCards.length === 0
        ? Array.from({ length: maxCards }).map((_, index) => <KpiCardSkeleton key={index} />)
        : visibleCards.map((card) => <KpiCard key={card.id} card={card} />)}
    </div>
  )
}
