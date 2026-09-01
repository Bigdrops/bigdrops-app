import * as React from 'react'

import { feedback } from '@/lib/feedback'
import { useEntity } from '@/lib/tenant/contexts'
import { listBoqs } from '@/domain/boq/storage'
import {
  readDashboardCache,
  writeDashboardCache,
  DashboardCacheData,
} from '@/lib/cache/dashboardCache'
import { fetchInvoiceFinancials } from '@/modules/reports/repositories/reportRepository'
import { isPastDue as isPastDueUtil } from '@/components/reports/reportUtils'

export type RecentDoc = {
  id: string
  type: 'Invoice' | 'Quotation' | 'CSR' | 'Waybill' | 'RFQ' | 'BOQ'
  number: string
  client: string
  date: string
  status: string
  amount?: number | null
  meta?: string
  path: string
}

export type RecentProject = {
  id: string
  name: string
  client_name: string | null
}

export type HeroStats = {
  collections: number
  openWork: number
  awaitingPaymentCount: number
  inTransitWaybills: number
}

export type SummaryStats = {
  overdue: number
  pastDue: number
  dueThisWeek: number
  thisMonthCollections: number
  pendingFollowUp: number
}

// Full ingredient set for KPI cards: the dashboard metrics plus the
// comparison/aggregation fields required for real trends and segmented bars.
export type KpiStats = HeroStats &
  SummaryStats & {
    prevMonthCollections: number
    outstandingTotal: number
    dueLastWeekWindow: number
    totalFinancialRows: number
    waybillsTotal: number
    waybillsDispatchedTotal: number
    totalInvoiced: number
    thisMonthInvoiced: number
    prevMonthInvoiced: number
    vatOnPaid: number
    whtOnPaid: number
    vatUnpaid: number
    whtOutstanding: number
  }

type UseDashboardDataOptions = {
  variant?: 'overview' | 'classic'
}

type UseDashboardDataResult = {
  loading: boolean
  recentDocs: RecentDoc[]
  recentProjects: RecentProject[]
  heroStats: HeroStats
  summary: SummaryStats
  kpiStats: KpiStats
  activityEvents: any[]
  refresh: () => Promise<void>
}

const defaultHeroStats: HeroStats = {
  collections: 0,
  openWork: 0,
  awaitingPaymentCount: 0,
  inTransitWaybills: 0,
}

const defaultSummary: SummaryStats = {
  overdue: 0,
  pastDue: 0,
  dueThisWeek: 0,
  thisMonthCollections: 0,
  pendingFollowUp: 0,
}

const defaultKpiStats: KpiStats = {
  ...defaultHeroStats,
  ...defaultSummary,
  prevMonthCollections: 0,
  outstandingTotal: 0,
  dueLastWeekWindow: 0,
  totalFinancialRows: 0,
  waybillsTotal: 0,
  waybillsDispatchedTotal: 0,
  totalInvoiced: 0,
  thisMonthInvoiced: 0,
  prevMonthInvoiced: 0,
  vatOnPaid: 0,
  whtOnPaid: 0,
  vatUnpaid: 0,
  whtOutstanding: 0,
}

function isValidDateString(value: string | null | undefined): value is string {
  if (!value) return false
  return !Number.isNaN(new Date(value).getTime())
}

function mergeRecentDocs(docs: RecentDoc[]) {
  return docs
    .filter((doc) => isValidDateString(doc.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6)
}

function buildRecentDocs(invoices: any[], quotations: any[], csrs: any[], waybills: any[], rfqs: any[], boqs: any[], opts?: { useIssueDate?: boolean }) {
  const useIssueDate = opts?.useIssueDate ?? false

  const docs = [
    ...invoices.map((doc) => ({
      id: doc.id,
      type: 'Invoice' as const,
      number: doc.invoice_number,
      client: doc.client_name || 'Walking Client',
      date: useIssueDate ? (doc.issue_date || doc.created_at) : doc.created_at,
      status: String(doc.status || ''),
      amount: doc.total,
      path: `/invoices/${doc.id}`,
    })),
    ...quotations.map((doc) => ({
      id: doc.id,
      type: 'Quotation' as const,
      number: doc.quotation_number,
      client: doc.client_name || 'Walking Client',
      date: useIssueDate ? (doc.issue_date || doc.created_at) : doc.created_at,
      status: String(doc.status || ''),
      amount: doc.total,
      path: `/quotations/${doc.id}`,
    })),
    ...csrs.map((doc) => ({
      id: doc.id,
      type: 'CSR' as const,
      number: doc.csr_number,
      client: doc.client_name || 'Walking Client',
      date: doc.created_at || doc.date,
      status: String(doc.status || ''),
      amount: null,
      path: `/csr/${doc.id}`,
    })),
    ...waybills.map((doc) => ({
      id: doc.id,
      type: 'Waybill' as const,
      number: doc.waybill_number || 'Waybill',
      client: doc.client_name || 'No client',
      date: doc.created_at || doc.date,
      status: String(doc.status || ''),
      amount: null,
      meta: doc.vehicle_plate || 'Waybill',
      path: `/waybills/${doc.id}`,
    })),
    ...rfqs.map((doc) => ({
      id: doc.id,
      type: 'RFQ' as const,
      number: doc.rfq_number || 'RFQ',
      client: doc.vendor_name || 'No vendor',
      date: doc.created_at,
      status: 'Open',
      amount: null,
      path: `/rfqs/${doc.id}`,
    })),
    ...boqs.map((doc) => ({
      id: doc.id,
      type: 'BOQ' as const,
      number: doc.boq_number || 'BOQ',
      client: doc.vendor_name || 'No vendor',
      date: doc.created_at,
      status: 'Local',
      amount: null,
      path: `/boqs/${doc.id}`,
    })),
  ]

  return mergeRecentDocs(docs)
}

// ponytail: build id→{vat,wht,status} lookup from the invoices query so
// computeKpiAggregates can read invoice-level tax fields the view doesn't expose.
function buildInvoiceMap(invoices: any[]) {
  const map = new Map<string, { vat: number; wht: number; status: string }>()
  for (const inv of invoices) {
    map.set(inv.id, {
      vat: Number(inv.vat || 0),
      wht: Number(inv.wht || 0),
      status: String(inv.status || ''),
    })
  }
  return map
}

// Comparison/aggregation ingredients for KPI cards, derived from the same
// unbounded invoice_financials_v result set as the existing metrics.
function computeKpiAggregates(
  invoiceFinancials: any[],
  invoiceMap: Map<string, { vat: number; wht: number; status: string }>,
  now: Date,
  startOfMonth: Date,
) {
  const prevMonthStart = new Date(startOfMonth)
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1)

  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  weekAgo.setHours(0, 0, 0, 0)

  let prevMonthCollections = 0
  let outstandingTotal = 0
  let dueLastWeekWindow = 0
  let totalInvoiced = 0
  let thisMonthInvoiced = 0
  let prevMonthInvoiced = 0
  let vatOnPaid = 0
  let whtOnPaid = 0
  let vatUnpaid = 0
  let whtOutstanding = 0

  for (const row of invoiceFinancials) {
    const balance = Number(row.balance_due || 0)
    const cashReceived = Number(row.cash_received || 0)
    const totalGross = Number(row.total_gross || 0)

    const issueDate = row.issue_date ? new Date(row.issue_date) : null
    const hasIssueDate = !!issueDate && !Number.isNaN(issueDate.getTime())

    totalInvoiced += totalGross

    if (hasIssueDate && (issueDate as Date) >= startOfMonth) {
      thisMonthInvoiced += totalGross
    }

    if (balance > 0) {
      outstandingTotal += balance
    }

    if (hasIssueDate && (issueDate as Date) >= prevMonthStart && (issueDate as Date) < startOfMonth) {
      prevMonthCollections += cashReceived
      prevMonthInvoiced += totalGross
    }

    if (balance > 0 && row.due_date) {
      const dueDate = new Date(row.due_date)
      if (!Number.isNaN(dueDate.getTime()) && dueDate >= weekAgo && dueDate <= now) {
        dueLastWeekWindow += balance
      }
    }

    // ponytail: use invoice-level vat/wht from invoices table (not the view)
    const inv = invoiceMap.get(row.id)
    const invoiceVat = inv?.vat ?? 0
    const invoiceWht = inv?.wht ?? 0
    const isPaid = balance <= 0
    if (isPaid) {
      vatOnPaid += invoiceVat
      whtOnPaid += invoiceWht
    } else {
      vatUnpaid += invoiceVat
    }
    // WHT outstanding = expected WHT on invoice − actual WHT deducted from payments
    whtOutstanding += Math.max(0, invoiceWht - Number(row.wht_received || 0))
  }

  return {
    prevMonthCollections,
    outstandingTotal,
    dueLastWeekWindow,
    totalFinancialRows: invoiceFinancials.length,
    totalInvoiced,
    thisMonthInvoiced,
    prevMonthInvoiced,
    vatOnPaid,
    whtOnPaid,
    vatUnpaid,
    whtOutstanding,
  }
}

export function useDashboardData(options: UseDashboardDataOptions = {}): UseDashboardDataResult {
  const { variant = 'overview' } = options
  const { tenantClient, schemaName } = useEntity()
  // ponytail: entity-scoped key — old unscoped bd:dashboard:${variant}:v1 entries are orphaned harmlessly
  const cacheKey = schemaName
    ? `bd:dashboard:${schemaName}:${variant}:v2`
    : `bd:dashboard:pending:${variant}:v2`

  const [loading, setLoading] = React.useState(() => {
    if (!schemaName) return true
    const cached = readDashboardCache(cacheKey)
    return !cached
  })
  
  const [recentDocs, setRecentDocs] = React.useState<RecentDoc[]>(() => {
    if (!schemaName) return []
    const cached = readDashboardCache(cacheKey)
    return cached?.data.recentDocs || []
  })
  const [recentProjects, setRecentProjects] = React.useState<RecentProject[]>(() => {
    if (!schemaName) return []
    const cached = readDashboardCache(cacheKey)
    return cached?.data.recentProjects || []
  })
  const [kpiStats, setKpiStats] = React.useState<KpiStats>(() => {
    if (!schemaName) return defaultKpiStats
    const cached = readDashboardCache(cacheKey)
    return cached?.data.kpiStats || defaultKpiStats
  })
  const [heroStats, setHeroStats] = React.useState<HeroStats>(() => {
    if (!schemaName) return defaultHeroStats
    const cached = readDashboardCache(cacheKey)
    return cached?.data.heroStats || defaultHeroStats
  })
  const [summary, setSummary] = React.useState<SummaryStats>(() => {
    if (!schemaName) return defaultSummary
    const cached = readDashboardCache(cacheKey)
    return cached?.data.summary || defaultSummary
  })
  const [activityEvents, setActivityEvents] = React.useState<any[]>(() => {
    if (!schemaName) return []
    const cached = readDashboardCache(cacheKey)
    return cached?.data.activityEvents || []
  })

  const load = React.useCallback(async () => {
    // Guard: tenantClient must be ready before any query.
    if (!tenantClient.isReady) {
      return
    }

    const cached = readDashboardCache(cacheKey)

    // Only show loading if we don't have ANY data to show (including stale)
    if (!cached) {
      setLoading(true)
    }

    if (variant === 'classic') {
      try {
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const now = new Date()
        const endOfWeek = new Date(now)
        endOfWeek.setDate(now.getDate() + 7)
        endOfWeek.setHours(23, 59, 59, 999)

        const [invoiceRes, quotationRes, csrRes, waybillRes, rfqRes, projectsRes, paymentsRes] = await Promise.all([
          tenantClient
            .from('invoices')
          .select('id, invoice_number, client_name, status, created_at, total, vat, wht, custom_fields')
          .is('archived_at', null)
          .order('created_at', { ascending: false }),
          tenantClient.from('quotations').select('id, quotation_number, client_name, status, created_at, total').order('created_at', { ascending: false }).limit(8),
          tenantClient.from('csrs').select('id, csr_number, client_name, status, created_at, date').order('created_at', { ascending: false }).order('csr_number', { ascending: false }).limit(5),
          tenantClient.from('waybills').select('id, waybill_number, client_name, status, created_at, date, type, vehicle_plate').order('created_at', { ascending: false }).limit(8),
          tenantClient.from('rfqs').select('id, rfq_number, vendor_name, created_at').order('created_at', { ascending: false }).limit(5),
          tenantClient.from('projects').select('id, name, client_name').order('created_at', { ascending: false }).limit(3),
          tenantClient.from('payments').select('id, cash_amount, date').gte('date', startOfMonth.toISOString()),
        ])

        const invoices = (invoiceRes.data || [])
        const quotations = quotationRes.data || []
        const csrs = csrRes.data || []
        const waybills = waybillRes.data || []
        const rfqs = rfqRes.data || []
        const boqs = listBoqs()
        const projects = (projectsRes.data || []) as RecentProject[]
        // ponytail: reuse Reports pipe — same tenant view, unfiltered for global KPIs
        const invoiceFinancials = await fetchInvoiceFinancials(tenantClient, null, null)
        const invoiceMap = buildInvoiceMap(invoices)

        const isPastDue = (row: any) => isPastDueUtil(row.due_date, row.balance_due)

        const overdue = invoiceFinancials.reduce(
          (sum: number, row: any) => (isPastDue(row) ? sum + Number(row.balance_due || 0) : sum),
          0,
        )

        const dueThisWeek = invoiceFinancials.reduce((sum: number, row: any) => {
          const dueDate = row.due_date ? new Date(row.due_date) : null
          const balance = Number(row.balance_due || 0)
          if (!dueDate || Number.isNaN(dueDate.getTime()) || balance <= 0) return sum
          if (dueDate < now || dueDate > endOfWeek) return sum
          return sum + balance
        }, 0)

        const thisMonthPayments = (paymentsRes.data || []) as Array<{ cash_amount: number | null }>
        const thisMonthCollections = thisMonthPayments.reduce(
          (sum: number, p: { cash_amount: number | null }) => sum + Number(p.cash_amount || 0),
          0,
        )

        const pendingFollowUp = invoiceFinancials.filter((row: any) => {
          const balance = Number(row.balance_due || 0)
          if (balance <= 0) return false
          if (isPastDue(row)) return true
          const dueDate = row.due_date ? new Date(row.due_date) : null
          if (!dueDate || Number.isNaN(dueDate.getTime())) return false
          return dueDate >= now && dueDate <= endOfWeek
        }).length

        const kpiAggregates = computeKpiAggregates(invoiceFinancials, invoiceMap, now, startOfMonth)

        const nextRecentDocs = buildRecentDocs(invoices, quotations, csrs, waybills, rfqs, boqs)
        const nextHeroStats = {
          collections: thisMonthCollections,
          openWork: pendingFollowUp,
          awaitingPaymentCount: 0,
          inTransitWaybills: 0,
        }
        const nextSummary = {
          overdue,
          pastDue: overdue,
          dueThisWeek,
          thisMonthCollections,
          pendingFollowUp,
        }
        const nextKpiStats: KpiStats = {
          ...nextHeroStats,
          ...nextSummary,
          ...kpiAggregates,
          waybillsTotal: 0,
          waybillsDispatchedTotal: 0,
        }

        setRecentDocs(nextRecentDocs)
        setRecentProjects(projects)
        setHeroStats(nextHeroStats)
        setSummary(nextSummary)
        setKpiStats(nextKpiStats)
        setActivityEvents([])

        writeDashboardCache(cacheKey, {
          recentDocs: nextRecentDocs,
          recentProjects: projects,
          heroStats: nextHeroStats,
          summary: nextSummary,
          kpiStats: nextKpiStats,
          activityEvents: [],
        })
      } catch (error) {
        console.error('Dashboard data load failed:', error)
      } finally {
        setLoading(false)
      }

      return
    }

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const now = new Date()
    const endOfWeek = new Date(now)
    endOfWeek.setDate(now.getDate() + 7)
    endOfWeek.setHours(23, 59, 59, 999)

    try {
      const [invoiceRes, quotationRes, csrRes, waybillRes, rfqRes, projectsRes, waybillsTotalRes, waybillsDispatchedRes, activityEventsRes, paymentsRes] = await Promise.all([
        tenantClient
          .from('invoices')
          .select('id, invoice_number, client_name, status, created_at, issue_date, total, vat, wht, custom_fields')
          .is('archived_at', null)
          .order('created_at', { ascending: false }),
        tenantClient.from('quotations').select('id, quotation_number, client_name, status, created_at, issue_date, total').order('created_at', { ascending: false }).limit(8),
        tenantClient.from('csrs').select('id, csr_number, client_name, status, created_at, date').order('created_at', { ascending: false }).order('csr_number', { ascending: false }).limit(8),
        tenantClient.from('waybills').select('id, waybill_number, client_name, status, created_at, date, type, vehicle_plate').order('created_at', { ascending: false }).limit(8),
        tenantClient.from('rfqs').select('id, rfq_number, vendor_name, created_at').order('created_at', { ascending: false }).limit(8),
        tenantClient.from('projects').select('id, name, client_name').order('created_at', { ascending: false }).limit(3),
        // Exact waybill counts for the in-transit KPI bar; the recent-rows
        // query above is limit-truncated and would produce misleading ratios.
        tenantClient.from('waybills').select('id', { count: 'exact', head: true }),
        tenantClient.from('waybills').select('id', { count: 'exact', head: true }).eq('status', 'dispatched'),
        tenantClient.from('activity_events').select('id, entity_type, entity_id, entity_label, event_type, actor_label, created_at, metadata').order('created_at', { ascending: false }).limit(10),
        // ponytail: direct payments query for "Collected This Month" — the
        // view sums cash_received by invoice issue_date which is wrong for
        // collections; payments.date is the actual receipt date.
        tenantClient.from('payments').select('id, cash_amount, date').gte('date', startOfMonth.toISOString()),
      ])

      const invoices = (invoiceRes.data || [])
      const quotations = quotationRes.data || []
      const csrs = csrRes.data || []
      const waybills = waybillRes.data || []
      const rfqs = rfqRes.data || []
      const boqs = listBoqs()
      const projects = (projectsRes.data || []) as RecentProject[]
      // ponytail: same pipe as Reports — unfiltered for global KPIs, no date-range clipping
      const invoiceFinancials = await fetchInvoiceFinancials(tenantClient, null, null)
      const invoiceMap = buildInvoiceMap(invoices)

      const isPastDue = (row: any) => isPastDueUtil(row.due_date, row.balance_due)

      const overdue = invoiceFinancials.reduce(
        (sum: number, row: any) => (isPastDue(row) ? sum + Number(row.balance_due || 0) : sum),
        0,
      )

      const dueThisWeek = invoiceFinancials.reduce((sum: number, row: any) => {
        const dueDate = row.due_date ? new Date(row.due_date) : null
        const balance = Number(row.balance_due || 0)
        if (!dueDate || Number.isNaN(dueDate.getTime()) || balance <= 0) return sum
        if (dueDate < now || dueDate > endOfWeek) return sum
        return sum + balance
      }, 0)

      // ponytail: sum from payments table by payment date, not invoice issue_date
      const thisMonthPayments = (paymentsRes.data || []) as Array<{ cash_amount: number | null }>
      const thisMonthCollections = thisMonthPayments.reduce(
        (sum: number, p: { cash_amount: number | null }) => sum + Number(p.cash_amount || 0),
        0,
      )

      const pendingFollowUp = invoiceFinancials.filter((row: any) => {
        const balance = Number(row.balance_due || 0)
        if (balance <= 0) return false
        if (isPastDue(row)) return true
        const dueDate = row.due_date ? new Date(row.due_date) : null
        if (!dueDate || Number.isNaN(dueDate.getTime())) return false
        return dueDate >= now && dueDate <= endOfWeek
      }).length

      const awaitingPaymentCount = invoiceFinancials.filter((row: any) => Number(row.balance_due || 0) > 0).length

      const inTransitWaybills = waybills.filter(
        (row: any) => String(row.status || '').toLowerCase() === 'dispatched',
      ).length
      const kpiAggregates = computeKpiAggregates(invoiceFinancials, invoiceMap, now, startOfMonth)

      const nextRecentDocs = buildRecentDocs(invoices, quotations, csrs, waybills, rfqs, boqs, { useIssueDate: false })
      const nextHeroStats = {
        collections: thisMonthCollections,
        openWork: pendingFollowUp,
        awaitingPaymentCount,
        inTransitWaybills,
      }
      const nextSummary = {
        overdue,
        pastDue: overdue,
        dueThisWeek,
        thisMonthCollections,
        pendingFollowUp,
      }
      const nextKpiStats: KpiStats = {
        ...nextHeroStats,
        ...nextSummary,
        ...kpiAggregates,
        waybillsTotal: waybillsTotalRes.count ?? 0,
        waybillsDispatchedTotal: waybillsDispatchedRes.count ?? 0,
      }

      const activityEvents = activityEventsRes.data || []

      setRecentDocs(nextRecentDocs)
      setRecentProjects(projects)
      setHeroStats(nextHeroStats)
      setSummary(nextSummary)
      setKpiStats(nextKpiStats)
      setActivityEvents(activityEvents)

      writeDashboardCache(cacheKey, {
        recentDocs: nextRecentDocs,
        recentProjects: projects,
        heroStats: nextHeroStats,
        summary: nextSummary,
        kpiStats: nextKpiStats,
        activityEvents,
      })
    } catch (error) {
      console.error('Dashboard data load failed:', error)
      feedback.error('Dashboard unavailable', {
        description: 'We could not load dashboard data right now.',
      })
    } finally {
      setLoading(false)
    }
  }, [variant, cacheKey, tenantClient])

  React.useEffect(() => {
    void load()
  }, [load])

  return { loading, recentDocs, recentProjects, heroStats, summary, kpiStats, activityEvents, refresh: load }
}
