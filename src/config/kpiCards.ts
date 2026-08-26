import { formatNaira } from '@/lib/formatters/money'
import type { KpiStats } from '@/hooks/useDashboardData'

export const KPI_CARD_COUNT = 4

// Barcode-style bar segment count per the current Glass Mesh reference
// (docs/TEMPLATES/htmltemps/wireframe-variants/batch-5/glass-mesh.html).
export const KPI_BAR_SEGMENTS = 14

export const KPI_CARDS_STORAGE_KEY = 'dashboard_kpi_cards'

export type KpiMetricId =
  | 'collections'
  | 'openWork'
  | 'awaitingPaymentCount'
  | 'inTransitWaybills'
  | 'overdue'
  | 'pastDue'
  | 'dueThisWeek'
  | 'thisMonthCollections'
  | 'pendingFollowUp'

export type KpiTone = 'emerald' | 'rose' | 'violet' | 'amber' | 'sky' | 'slate'

export const DEFAULT_KPI_METRIC_IDS: KpiMetricId[] = [
  'thisMonthCollections',
  'overdue',
  'awaitingPaymentCount',
  'dueThisWeek',
]

type KpiMetricDefinition = {
  id: KpiMetricId
  label: string
  description: string
  format: 'naira' | 'count'
  tone: KpiTone
}

export const KPI_METRIC_REGISTRY: Record<KpiMetricId, KpiMetricDefinition> = {
  collections: {
    id: 'collections',
    label: 'Collections',
    description: 'Cash received this month across issued invoices.',
    format: 'naira',
    tone: 'emerald',
  },
  thisMonthCollections: {
    id: 'thisMonthCollections',
    label: 'Collected This Month',
    description: 'Cash received since the month began.',
    format: 'naira',
    tone: 'emerald',
  },
  overdue: {
    id: 'overdue',
    label: 'Overdue Balance',
    description: 'Past-due balances still awaiting collection.',
    format: 'naira',
    tone: 'rose',
  },
  pastDue: {
    id: 'pastDue',
    label: 'Past Due',
    description: 'Same past-due balance view as Overdue.',
    format: 'naira',
    tone: 'rose',
  },
  dueThisWeek: {
    id: 'dueThisWeek',
    label: 'Due This Week',
    description: 'Outstanding balance falling due within seven days.',
    format: 'naira',
    tone: 'amber',
  },
  awaitingPaymentCount: {
    id: 'awaitingPaymentCount',
    label: 'Awaiting Payment',
    description: 'Invoices still carrying an unpaid balance.',
    format: 'count',
    tone: 'violet',
  },
  openWork: {
    id: 'openWork',
    label: 'Open Work',
    description: 'Invoices currently needing follow-up.',
    format: 'count',
    tone: 'sky',
  },
  pendingFollowUp: {
    id: 'pendingFollowUp',
    label: 'Pending Follow-up',
    description: 'Invoices flagged for attention this week.',
    format: 'count',
    tone: 'sky',
  },
  inTransitWaybills: {
    id: 'inTransitWaybills',
    label: 'Waybills In Transit',
    description: 'Dispatched waybills not yet delivered.',
    format: 'count',
    tone: 'slate',
  },
}

const TONE_SEGMENT_CLASS: Record<KpiTone, string> = {
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
  slate: 'bg-slate-400',
}

// Solid chip backgrounds for Settings UI affordances.
export const TONE_CHIP_CLASS: Record<KpiTone, string> = {
  emerald: 'bg-emerald-600',
  rose: 'bg-rose-600',
  violet: 'bg-violet-600',
  amber: 'bg-amber-500',
  sky: 'bg-sky-600',
  slate: 'bg-slate-500',
}

const DIM_SEGMENT_CLASS = 'bg-border opacity-50'

export function sanitizeKpiMetricIds(value: unknown): KpiMetricId[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<KpiMetricId>()
  const result: KpiMetricId[] = []

  for (const entry of value) {
    const id = String(entry) as KpiMetricId
    if (!Object.prototype.hasOwnProperty.call(KPI_METRIC_REGISTRY, id)) continue
    if (seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }

  return result
}

// Deterministic recovery: drop unknown ids, remove duplicates, top up from the
// defaults, then clamp to exactly four. Every output is a valid registry id.
export function resolveKpiSelection(rawIds: unknown): KpiMetricId[] {
  const selected = sanitizeKpiMetricIds(rawIds)

  for (const defaultId of DEFAULT_KPI_METRIC_IDS) {
    if (selected.length >= KPI_CARD_COUNT) break
    if (!selected.includes(defaultId)) selected.push(defaultId)
  }

  return selected.slice(0, KPI_CARD_COUNT)
}

export function loadStoredKpiCards(): KpiMetricId[] {
  try {
    const stored = localStorage.getItem(KPI_CARDS_STORAGE_KEY)
    if (!stored) return [...DEFAULT_KPI_METRIC_IDS]

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return [...DEFAULT_KPI_METRIC_IDS]

    return resolveKpiSelection(parsed)
  } catch {
    return [...DEFAULT_KPI_METRIC_IDS]
  }
}

export function saveStoredKpiCards(metricIds: KpiMetricId[]): KpiMetricId[] {
  const nextIds = resolveKpiSelection(metricIds)
  localStorage.setItem(KPI_CARDS_STORAGE_KEY, JSON.stringify(nextIds))
  return nextIds
}

type TrendDirection = 'up' | 'down' | 'neutral'

export type KpiCardViewModel = {
  id: KpiMetricId
  label: string
  valueText: string
  trendDirection: TrendDirection
  // 'good': up is positive (green), down negative (red).
  // 'info': direction shown but carries no good/bad judgment.
  trendPolarity: 'good' | 'info'
  trendText: string
  barFilledSegments: number
  barTitle: string
}

function safeRatio(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0
  }
  return Math.min(Math.max(numerator / denominator, 0), 1)
}

function filledSegments(ratio: number): number {
  return Math.round(safeRatio(ratio, 1) * KPI_BAR_SEGMENTS)
}

// Percent change with honest baseline handling: no baseline -> null, so callers
// render the neutral trend state instead of Infinity/NaN/fabricated numbers.
function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) {
    return null
  }
  return Math.round(((current - previous) / previous) * 100)
}

function signedPercentText(change: number): string {
  return `${change >= 0 ? '+' : '\u2212'}${Math.abs(change)}%`
}

function neutralTrend(): Pick<KpiCardViewModel, 'trendDirection' | 'trendPolarity' | 'trendText'> {
  return { trendDirection: 'neutral', trendPolarity: 'info', trendText: 'No comparison period' }
}

function buildCard(
  definition: KpiMetricDefinition,
  stats: KpiStats,
): KpiCardViewModel {
  const value =
    definition.format === 'naira'
      ? formatNaira(Number(stats[definition.id] ?? 0), { round: true })
      : String(Math.max(0, Math.round(Number(stats[definition.id] ?? 0))))

  let trend: Pick<KpiCardViewModel, 'trendDirection' | 'trendPolarity' | 'trendText'>
  let barRatio = 0
  let barTitle = ''

  switch (definition.id) {
    case 'thisMonthCollections':
    case 'collections': {
      // Current period: cash received on invoices issued this month.
      // Comparison period: same measure over the previous calendar month.
      const change = percentChange(stats.thisMonthCollections, stats.prevMonthCollections)
      trend =
        change === null
          ? neutralTrend()
          : {
              trendDirection: change >= 0 ? 'up' : 'down',
              trendPolarity: 'good',
              trendText: `${signedPercentText(change)} vs last month`,
            }
      barRatio = safeRatio(stats.thisMonthCollections, stats.thisMonthCollections + stats.prevMonthCollections)
      barTitle = 'Current-month share of last two months\u2019 collections'
      break
    }
    case 'dueThisWeek': {
      // Current window: balance due within the next 7 days.
      // Comparison window: balance that fell due in the prior 7 days.
      const change = percentChange(stats.dueThisWeek, stats.dueLastWeekWindow)
      trend =
        change === null
          ? neutralTrend()
          : {
              trendDirection: change >= 0 ? 'up' : 'down',
              trendPolarity: 'info',
              trendText: `${signedPercentText(change)} vs last week`,
            }
      barRatio = safeRatio(stats.dueThisWeek, stats.outstandingTotal)
      barTitle = 'Share of outstanding balance due this week'
      break
    }
    case 'overdue':
    case 'pastDue': {
      trend = neutralTrend()
      barRatio = safeRatio(stats.overdue, stats.outstandingTotal)
      barTitle = 'Overdue share of outstanding balance'
      break
    }
    case 'awaitingPaymentCount': {
      trend = neutralTrend()
      barRatio = safeRatio(stats.awaitingPaymentCount, stats.totalFinancialRows)
      barTitle = 'Unpaid invoices as share of all invoices'
      break
    }
    case 'openWork':
    case 'pendingFollowUp': {
      trend = neutralTrend()
      barRatio = safeRatio(stats.pendingFollowUp, stats.awaitingPaymentCount)
      barTitle = 'Follow-up concentration among unpaid invoices'
      break
    }
    case 'inTransitWaybills': {
      trend = neutralTrend()
      barRatio = safeRatio(stats.waybillsDispatchedTotal, stats.waybillsTotal)
      barTitle = 'Dispatched share of all waybills'
      break
    }
  }

  return {
    id: definition.id,
    label: definition.label,
    valueText: value,
    ...trend,
    barFilledSegments: filledSegments(barRatio),
    barTitle,
  }
}

// Always resolves to exactly KPI_CARD_COUNT view models; unknown ids cannot
// reach this point because selection goes through resolveKpiSelection.
export function buildKpiCards(
  stats: KpiStats,
  selectedIds: KpiMetricId[],
): KpiCardViewModel[] {
  return resolveKpiSelection(selectedIds).map((id) => buildCard(KPI_METRIC_REGISTRY[id], stats))
}
