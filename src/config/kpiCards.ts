import { formatNaira } from '@/lib/formatters/money'
import type { KpiStats } from '@/hooks/useDashboardData'

// ponytail: responsive cap — desktop shows up to 6, mobile up to 4.
// The actual slice happens at the call site (DashboardOverview).
export const KPI_CARD_COUNT_DESKTOP = 6
export const KPI_CARD_COUNT_MOBILE = 4

// Barcode-style bar segment count per the current Glass Mesh reference
// (docs/TEMPLATES/htmltemps/wireframe-variants/batch-5/glass-mesh.html).
export const KPI_BAR_SEGMENTS = 14

export const KPI_CARDS_STORAGE_KEY = 'dashboard_kpi_cards'

export type KpiMetricId =
  | 'totalInvoiced'
  | 'thisMonthCollections'
  | 'outstandingReceivables'
  | 'overdue'
  | 'vatOnPaid'
  | 'vatUnpaid'
  | 'whtOnPaid'
  | 'whtOutstanding'

export type KpiTone = 'emerald' | 'rose' | 'violet' | 'amber' | 'sky' | 'slate'

export const DEFAULT_KPI_METRIC_IDS: KpiMetricId[] = [
  'totalInvoiced',
  'thisMonthCollections',
  'vatOnPaid',
  'whtOnPaid',
  'outstandingReceivables',
  'whtOutstanding',
]

type KpiMetricDefinition = {
  id: KpiMetricId
  label: string
  description: string
  format: 'naira' | 'count'
  tone: KpiTone
}

export const KPI_METRIC_REGISTRY: Record<KpiMetricId, KpiMetricDefinition> = {
  totalInvoiced: {
    id: 'totalInvoiced',
    label: 'Total Invoiced',
    description: 'Total value of all invoices ever created.',
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
  outstandingReceivables: {
    id: 'outstandingReceivables',
    label: 'Outstanding Receivables',
    description: 'Total money still owed by clients.',
    format: 'naira',
    tone: 'amber',
  },
  overdue: {
    id: 'overdue',
    label: 'Overdue Balance',
    description: 'Past-due balances still awaiting collection.',
    format: 'naira',
    tone: 'rose',
  },
  vatOnPaid: {
    id: 'vatOnPaid',
    label: 'VAT — Paid Invoices',
    description: 'VAT on fully paid invoices.',
    format: 'naira',
    tone: 'violet',
  },
  vatUnpaid: {
    id: 'vatUnpaid',
    label: 'VAT — Unpaid Invoices',
    description: 'VAT on unpaid or partially paid invoices.',
    format: 'naira',
    tone: 'violet',
  },
  whtOnPaid: {
    id: 'whtOnPaid',
    label: 'WHT — Paid Invoices',
    description: 'Withholding tax on paid invoices.',
    format: 'naira',
    tone: 'sky',
  },
  whtOutstanding: {
    id: 'whtOutstanding',
    label: 'WHT Outstanding',
    description: 'Expected WHT not yet deducted from payments.',
    format: 'naira',
    tone: 'sky',
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
// defaults. No硬编码 clamp — the caller decides how many to display.
export function resolveKpiSelection(rawIds: unknown): KpiMetricId[] {
  const selected = sanitizeKpiMetricIds(rawIds)

  for (const defaultId of DEFAULT_KPI_METRIC_IDS) {
    if (selected.length >= KPI_CARD_COUNT_DESKTOP) break
    if (!selected.includes(defaultId)) selected.push(defaultId)
  }

  return selected.slice(0, KPI_CARD_COUNT_DESKTOP)
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

type TrendDirection = 'up' | 'down' | null

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

function buildCard(
  definition: KpiMetricDefinition,
  stats: KpiStats,
): KpiCardViewModel {
  const value =
    definition.format === 'naira'
      ? formatNaira(Number(stats[definition.id] ?? 0), { round: true })
      : String(Math.max(0, Math.round(Number(stats[definition.id] ?? 0))))

  let trendDirection: TrendDirection = null
  let trendPolarity: 'good' | 'info' = 'info'
  let trendText = ''
  let barRatio = 0
  let barTitle = ''

  switch (definition.id) {
    case 'totalInvoiced': {
      const change = percentChange(stats.thisMonthInvoiced, stats.prevMonthInvoiced)
      if (change !== null) {
        trendDirection = change >= 0 ? 'up' : 'down'
        trendPolarity = 'good'
        trendText = `${signedPercentText(change)} vs last month`
      }
      barRatio = safeRatio(stats.thisMonthInvoiced, stats.totalInvoiced)
      barTitle = 'Current-month share of cumulative invoiced'
      break
    }
    case 'thisMonthCollections': {
      const change = percentChange(stats.thisMonthCollections, stats.prevMonthCollections)
      if (change !== null) {
        trendDirection = change >= 0 ? 'up' : 'down'
        trendPolarity = 'good'
        trendText = `${signedPercentText(change)} vs last month`
      }
      barRatio = safeRatio(stats.thisMonthCollections, stats.thisMonthCollections + stats.prevMonthCollections)
      barTitle = 'Current-month share of last two months\u2019 collections'
      break
    }
    case 'outstandingReceivables': {
      barRatio = safeRatio(stats.outstandingTotal, stats.totalInvoiced)
      barTitle = 'Outstanding as share of total invoiced'
      break
    }
    case 'overdue': {
      barRatio = safeRatio(stats.overdue, stats.outstandingTotal)
      barTitle = 'Overdue share of outstanding balance'
      break
    }
    case 'vatOnPaid': {
      barRatio = safeRatio(stats.vatOnPaid, stats.totalInvoiced)
      barTitle = 'VAT on paid as share of total invoiced'
      break
    }
    case 'vatUnpaid': {
      barRatio = safeRatio(stats.vatUnpaid, stats.vatOnPaid + stats.vatUnpaid)
      barTitle = 'VAT on unpaid as share of total VAT'
      break
    }
    case 'whtOnPaid': {
      barRatio = safeRatio(stats.whtOnPaid, stats.totalInvoiced)
      barTitle = 'WHT on paid as share of total invoiced'
      break
    }
    case 'whtOutstanding': {
      barRatio = safeRatio(stats.whtOutstanding, stats.whtOnPaid + stats.whtOutstanding)
      barTitle = 'WHT outstanding as share of total expected WHT'
      break
    }
  }

  const result: KpiCardViewModel = {
    id: definition.id,
    label: definition.label,
    valueText: value,
    trendDirection,
    trendPolarity,
    trendText,
    barFilledSegments: filledSegments(barRatio),
    barTitle,
  }

  return result
}

// Always resolves to at most KPI_CARD_COUNT_DESKTOP view models; unknown ids cannot
// reach this point because selection goes through resolveKpiSelection.
export function buildKpiCards(
  stats: KpiStats,
  selectedIds: KpiMetricId[],
): KpiCardViewModel[] {
  return resolveKpiSelection(selectedIds).map((id) => buildCard(KPI_METRIC_REGISTRY[id], stats))
}
