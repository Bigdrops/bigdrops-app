import * as React from 'react'
import { ArrowDownRight, ArrowUpRight, Clock3, PackageCheck, ReceiptText, Truck } from 'lucide-react'

import type { HeroStats, SummaryStats } from '@/hooks/useDashboardData'
import { formatNaira } from '@/lib/formatters/money'
import { cn } from '@/lib/utils'

type MetricTone = 'emerald' | 'blue' | 'amber' | 'slate' | 'rose'

type MetricCard = {
  label: string
  value: string
  hint: string
  tone: MetricTone
  icon: React.ComponentType<{ className?: string }>
}

type KpiGridProps = {
  loading: boolean
  heroStats: HeroStats
  summary: SummaryStats
}

const toneStyles: Record<MetricTone, string> = {
  emerald: 'from-emerald-500/15 via-emerald-500/5 to-transparent text-emerald-700 dark:text-emerald-300',
  blue: 'from-sky-500/15 via-sky-500/5 to-transparent text-sky-700 dark:text-sky-300',
  amber: 'from-amber-500/15 via-amber-500/5 to-transparent text-amber-700 dark:text-amber-300',
  slate: 'from-slate-500/15 via-slate-500/5 to-transparent text-slate-700 dark:text-slate-300',
  rose: 'from-rose-500/15 via-rose-500/5 to-transparent text-rose-700 dark:text-rose-300',
}

function formatMetricValue(value: number | null | undefined, kind: 'amount' | 'count') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  if (kind === 'amount') return formatNaira(Number(value), { round: true })
  return String(value)
}

function MetricCardRow({ metric }: { metric: MetricCard }) {
  const Icon = metric.icon

  return (
    <article className="relative overflow-hidden rounded-[var(--bd-radius-xl)] border border-border bg-card p-4 shadow-sm">
      <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', toneStyles[metric.tone])} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
            {metric.label}
          </div>
          <div className="mt-2 text-[24px] font-black leading-none tracking-tight text-foreground">
            {metric.value}
          </div>
          <div className="mt-2 text-[11px] leading-4 text-muted-foreground">
            {metric.hint}
          </div>
        </div>

        <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-muted/70', toneStyles[metric.tone])}>
          <Icon className="size-4" />
        </div>
      </div>
    </article>
  )
}

function MetricSkeletonCard() {
  return (
    <div className="relative overflow-hidden rounded-[var(--bd-radius-xl)] border border-border bg-card p-4 shadow-sm">
      <div className="h-1 w-16 rounded-full bg-muted/80" />
      <div className="mt-3 h-3 w-20 rounded bg-muted/70" />
      <div className="mt-3 h-7 w-28 rounded bg-muted/70" />
      <div className="mt-3 h-3 w-24 rounded bg-muted/60" />
    </div>
  )
}

export function KpiGrid({ loading, heroStats, summary }: KpiGridProps) {
  const heroMetrics: MetricCard[] = [
    {
      label: 'Collections',
      value: formatMetricValue(heroStats.collections, 'amount'),
      hint: 'Live collections captured this month.',
      tone: 'emerald',
      icon: ReceiptText,
    },
    {
      label: 'Open work',
      value: formatMetricValue(heroStats.openWork, 'count'),
      hint: 'Tasks and follow-up work in flight.',
      tone: 'blue',
      icon: PackageCheck,
    },
    {
      label: 'Awaiting payment',
      value: formatMetricValue(heroStats.awaitingPaymentCount, 'count'),
      hint: 'Invoices still carrying a balance.',
      tone: 'amber',
      icon: ArrowDownRight,
    },
    {
      label: 'Waybills in transit',
      value: formatMetricValue(heroStats.inTransitWaybills, 'count'),
      hint: 'Dispatched waybills still moving.',
      tone: 'slate',
      icon: Truck,
    },
  ]

  const summaryMetrics: MetricCard[] = [
    {
      label: 'Overdue balance',
      value: formatMetricValue(summary.overdue, 'amount'),
      hint: 'Past due invoices that still need collection.',
      tone: 'rose',
      icon: Clock3,
    },
    {
      label: 'Past due',
      value: formatMetricValue(summary.pastDue, 'amount'),
      hint: 'Duplicated financial view from the same source.',
      tone: 'rose',
      icon: ArrowDownRight,
    },
    {
      label: 'Due this week',
      value: formatMetricValue(summary.dueThisWeek, 'amount'),
      hint: 'Balance expected before the week closes.',
      tone: 'amber',
      icon: ArrowUpRight,
    },
    {
      label: 'Collected this month',
      value: formatMetricValue(summary.thisMonthCollections, 'amount'),
      hint: 'Cash received since the month began.',
      tone: 'emerald',
      icon: ReceiptText,
    },
    {
      label: 'Pending follow-up',
      value: formatMetricValue(summary.pendingFollowUp, 'count'),
      hint: 'Invoices that still need attention.',
      tone: 'slate',
      icon: PackageCheck,
    },
  ]

  return (
    <div className="rounded-[var(--bd-radius-xl)] border border-border bg-card px-4 py-4 shadow-sm md:px-5 md:py-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
            KPI Grid
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            Live values from the dashboard aggregation layer.
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <MetricSkeletonCard key={index} />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <MetricSkeletonCard key={`summary-${index}`} />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {heroMetrics.map((metric) => (
              <MetricCardRow key={metric.label} metric={metric} />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {summaryMetrics.map((metric) => (
              <MetricCardRow key={metric.label} metric={metric} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
