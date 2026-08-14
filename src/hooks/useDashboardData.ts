import * as React from 'react'

import { feedback } from '@/lib/feedback'
import { formatNaira } from '@/lib/formatters/money'
import { formatStatusLabel } from '@/lib/formatters/status'
import { supabase } from '@/supabase'
import { useEntity } from '@/lib/tenant/contexts'
import { listBoqs } from '@/domain/boq/storage'
import {
  readDashboardCache,
  writeDashboardCache,
  DashboardCacheData,
} from '@/lib/cache/dashboardCache'

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

export type PriorityItem = {
  key: string
  title: string
  meta: string
  dotClassName: string
  dotRingClassName: string
  badgeLabel: string
  badgeClassName: string
  type?: string
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

type UseDashboardDataOptions = {
  variant?: 'overview' | 'classic'
}

type UseDashboardDataResult = {
  loading: boolean
  recentDocs: RecentDoc[]
  recentProjects: RecentProject[]
  priorityItems: PriorityItem[]
  heroStats: HeroStats
  summary: SummaryStats
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

function formatDashboardAmount(amount: number | string | null | undefined) {
  return formatNaira(Number(amount || 0), { round: true })
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

function buildClassicPriorityItems(projects: RecentProject[], invoices: any[], quotations: any[]) {
  const items: PriorityItem[] = []

  if (projects[0]) {
    items.push({
      key: `project-${projects[0].id}`,
      title: `Update project status — ${projects[0].name}`,
      meta: `${projects[0].client_name || 'Open project'} • no movement recorded recently`,
      dotClassName: 'bg-emerald-500',
      dotRingClassName: 'ring-[6px] ring-emerald-500/15',
      badgeLabel: 'Project',
      badgeClassName: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      type: 'project',
    })
  }

  const paymentInvoice = invoices.find((doc) => {
    const status = String(doc.status || '').toLowerCase()
    return status && status !== 'paid'
  })

  if (paymentInvoice) {
    items.push({
      key: `payment-${paymentInvoice.id}`,
      title: `Record payment — ${paymentInvoice.invoice_number}`,
      meta: `${paymentInvoice.client_name || 'Walking Client'} • ${formatDashboardAmount(paymentInvoice.total)}`,
      dotClassName: 'bg-blue-500',
      dotRingClassName: 'ring-[6px] ring-blue-500/15',
      badgeLabel: 'Payment',
      badgeClassName: 'bg-blue-50 text-blue-700 border-blue-200',
      type: 'payment',
    })
  }

  if (projects[1]) {
    items.push({
      key: `project-review-${projects[1].id}`,
      title: `Confirm progress — ${projects[1].name}`,
      meta: `${projects[1].client_name || 'Open project'} • team follow-up needed`,
      dotClassName: 'bg-amber-500',
      dotRingClassName: 'ring-[6px] ring-amber-500/15',
      badgeLabel: 'Review',
      badgeClassName: 'bg-amber-50 text-amber-700 border-amber-200',
      type: 'project',
    })
  } else if (quotations[0]) {
    items.push({
      key: `quote-${quotations[0].id}`,
      title: `Follow up quotation — ${quotations[0].quotation_number}`,
      meta: `${quotations[0].client_name || 'Walking Client'} • awaiting response`,
      dotClassName: 'bg-violet-500',
      dotRingClassName: 'ring-[6px] ring-violet-500/15',
      badgeLabel: 'Quote',
      badgeClassName: 'bg-violet-50 text-violet-700 border-violet-200',
      type: 'quotation',
    })
  }

  return items.slice(0, 3)
}

function buildOverviewPriorityItems(projects: RecentProject[], quotations: any[], hasPastDue: boolean) {
  const items: PriorityItem[] = []

  if (projects[0]) {
    items.push({
      key: `project-${projects[0].id}`,
      title: `Update project status — ${projects[0].name}`,
      meta: `${projects[0].client_name || 'Open project'} • no movement recorded recently`,
      dotClassName: 'bg-emerald-500',
      dotRingClassName: 'ring-[6px] ring-emerald-500/15',
      badgeLabel: 'Project',
      badgeClassName: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      type: 'project',
    })
  }

  if (hasPastDue) {
    items.push({
      key: 'past-due-invoice',
      title: 'Record payment — Past due',
      meta: 'Balance still pending for record capture',
      dotClassName: 'bg-rose-500',
      dotRingClassName: 'ring-[6px] ring-rose-500/15',
      badgeLabel: 'Payment',
      badgeClassName: 'bg-rose-50 text-rose-700 border-rose-200',
      type: 'payment',
    })
  }

  const pendingQuotation = quotations.find((quotation) => {
    const status = String(quotation.status || '').toLowerCase()
    return status === 'open'
  })

  if (pendingQuotation) {
    items.push({
      key: `quotation-${pendingQuotation.id}`,
      title: `Follow up quotation — ${pendingQuotation.quotation_number}`,
      meta: `${pendingQuotation.client_name || 'Walking Client'} • status ${formatStatusLabel(pendingQuotation.status, { fallback: 'open', lowercase: true })}`,
      dotClassName: 'bg-blue-500',
      dotRingClassName: 'ring-[6px] ring-blue-500/15',
      badgeLabel: 'Quotation',
      badgeClassName: 'bg-blue-50 text-blue-700 border-blue-200',
      type: 'quotation',
    })
  }

  return items.slice(0, 3)
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

export function useDashboardData(options: UseDashboardDataOptions = {}): UseDashboardDataResult {
  const { variant = 'overview' } = options
  const { tenantClient } = useEntity()
  const cacheKey = `bd:dashboard:${variant}:v1`

  const [loading, setLoading] = React.useState(() => {
    const cached = readDashboardCache(cacheKey)
    return !cached
  })
  
  const [recentDocs, setRecentDocs] = React.useState<RecentDoc[]>(() => {
    const cached = readDashboardCache(cacheKey)
    return cached?.data.recentDocs || []
  })
  const [recentProjects, setRecentProjects] = React.useState<RecentProject[]>(() => {
    const cached = readDashboardCache(cacheKey)
    return cached?.data.recentProjects || []
  })
  const [priorityItems, setPriorityItems] = React.useState<PriorityItem[]>(() => {
    const cached = readDashboardCache(cacheKey)
    return cached?.data.priorityItems || []
  })
  const [heroStats, setHeroStats] = React.useState<HeroStats>(() => {
    const cached = readDashboardCache(cacheKey)
    return cached?.data.heroStats || defaultHeroStats
  })
  const [summary, setSummary] = React.useState<SummaryStats>(() => {
    const cached = readDashboardCache(cacheKey)
    return cached?.data.summary || defaultSummary
  })

  const load = React.useCallback(async () => {
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

        const [invoiceRes, quotationRes, csrRes, waybillRes, rfqRes, financialsRes, projectsRes] = await Promise.all([
          tenantClient
            .from('invoices')
            .select('id, invoice_number, client_name, status, created_at, total, custom_fields')
            .is('archived_at', null)
            .order('created_at', { ascending: false })
            .limit(8),
          tenantClient.from('quotations').select('id, quotation_number, client_name, status, created_at, total').order('created_at', { ascending: false }).limit(8),
          supabase.from('csrs').select('id, csr_number, client_name, status, created_at, date').order('created_at', { ascending: false }).order('csr_number', { ascending: false }).limit(5),
          tenantClient.from('waybills').select('id, waybill_number, client_name, status, created_at, date, type, vehicle_plate').order('created_at', { ascending: false }).limit(8),
          supabase.from('rfqs').select('id, rfq_number, vendor_name, created_at').order('created_at', { ascending: false }).limit(5),
          tenantClient.from('invoice_financials_v').select('balance_due, cash_received, issue_date, due_date, computed_status'),
          tenantClient.from('projects').select('id, name, client_name').order('created_at', { ascending: false }).limit(3),
        ])

        const invoices = (invoiceRes.data || [])
        const quotations = quotationRes.data || []
        const csrs = csrRes.data || []
        const waybills = waybillRes.data || []
        const rfqs = rfqRes.data || []
        const boqs = listBoqs()
        const projects = (projectsRes.data || []) as RecentProject[]
        const invoiceFinancials = financialsRes.data || []

        const isPastDue = (row: any) => {
          const balance = Number(row.balance_due || 0)
          if (balance <= 0 || !row.due_date) return false
          const dueDate = new Date(row.due_date)
          if (Number.isNaN(dueDate.getTime())) return false
          dueDate.setHours(0, 0, 0, 0)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          return dueDate < today
        }

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

        const thisMonthCollections = invoiceFinancials.reduce((sum: number, row: any) => {
          const issueDate = row.issue_date ? new Date(row.issue_date) : null
          if (!issueDate || Number.isNaN(issueDate.getTime()) || issueDate < startOfMonth) return sum
          return sum + Number(row.cash_received || 0)
        }, 0)

        const pendingFollowUp = invoiceFinancials.filter((row: any) => {
          const balance = Number(row.balance_due || 0)
          if (balance <= 0) return false
          if (isPastDue(row)) return true
          const dueDate = row.due_date ? new Date(row.due_date) : null
          if (!dueDate || Number.isNaN(dueDate.getTime())) return false
          return dueDate >= now && dueDate <= endOfWeek
        }).length

        const reminders = buildClassicPriorityItems(projects, invoices, quotations)
        
        const nextRecentDocs = buildRecentDocs(invoices, quotations, csrs, waybills, rfqs, boqs)
        const nextHeroStats = {
          collections: thisMonthCollections,
          openWork: reminders.length || pendingFollowUp,
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

        setRecentDocs(nextRecentDocs)
        setRecentProjects(projects)
        setPriorityItems(reminders)
        setHeroStats(nextHeroStats)
        setSummary(nextSummary)

        writeDashboardCache(cacheKey, {
          recentDocs: nextRecentDocs,
          recentProjects: projects,
          priorityItems: reminders,
          heroStats: nextHeroStats,
          summary: nextSummary,
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
      const [invoiceRes, quotationRes, csrRes, waybillRes, rfqRes, financialMetricsRes, projectsRes] = await Promise.all([
        tenantClient
          .from('invoices')
          .select('id, invoice_number, client_name, status, created_at, issue_date, total, custom_fields')
          .is('archived_at', null)
          .order('created_at', { ascending: false })
          .limit(20),
        tenantClient.from('quotations').select('id, quotation_number, client_name, status, created_at, issue_date, total').order('created_at', { ascending: false }).limit(8),
        supabase.from('csrs').select('id, csr_number, client_name, status, created_at, date').order('created_at', { ascending: false }).order('csr_number', { ascending: false }).limit(8),
        tenantClient.from('waybills').select('id, waybill_number, client_name, status, created_at, date, type, vehicle_plate').order('created_at', { ascending: false }).limit(8),
        supabase.from('rfqs').select('id, rfq_number, vendor_name, created_at').order('created_at', { ascending: false }).limit(8),
        tenantClient.from('invoice_financials_v').select('balance_due, cash_received, issue_date, due_date, computed_status'),
        tenantClient.from('projects').select('id, name, client_name').order('created_at', { ascending: false }).limit(3),
      ])

      const invoices = (invoiceRes.data || [])
      const quotations = quotationRes.data || []
      const csrs = csrRes.data || []
      const waybills = waybillRes.data || []
      const rfqs = rfqRes.data || []
      const boqs = listBoqs()
      const projects = (projectsRes.data || []) as RecentProject[]
      const invoiceFinancials = financialMetricsRes.data || []

      const isPastDue = (row: any) => {
        const balance = Number(row.balance_due || 0)
        if (balance <= 0 || !row.due_date) return false
        const dueDate = new Date(row.due_date)
        if (Number.isNaN(dueDate.getTime())) return false
        dueDate.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return dueDate < today
      }

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

      const thisMonthCollections = invoiceFinancials.reduce((sum: number, row: any) => {
        const issueDate = row.issue_date ? new Date(row.issue_date) : null
        if (!issueDate || Number.isNaN(issueDate.getTime()) || issueDate < startOfMonth) return sum
        return sum + Number(row.cash_received || 0)
      }, 0)

      const pendingFollowUp = invoiceFinancials.filter((row: any) => {
        const balance = Number(row.balance_due || 0)
        if (balance <= 0) return false
        if (isPastDue(row)) return true
        const dueDate = row.due_date ? new Date(row.due_date) : null
        if (!dueDate || Number.isNaN(dueDate.getTime())) return false
        return dueDate >= now && dueDate <= endOfWeek
      }).length

      const awaitingPaymentCount = invoiceFinancials.filter((row: any) => Number(row.balance_due || 0) > 0).length

      const hasPastDue = invoiceFinancials.some((row: any) => isPastDue(row))
      const inTransitWaybills = waybills.filter(
        (row: any) => String(row.status || '').toLowerCase() === 'dispatched',
      ).length
      const reminders = buildOverviewPriorityItems(projects, quotations, hasPastDue)

      const nextRecentDocs = buildRecentDocs(invoices, quotations, csrs, waybills, rfqs, boqs, { useIssueDate: false })
      const nextHeroStats = {
        collections: thisMonthCollections,
        openWork: reminders.length || pendingFollowUp,
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

      setRecentDocs(nextRecentDocs)
      setRecentProjects(projects)
      setPriorityItems(reminders)
      setHeroStats(nextHeroStats)
      setSummary(nextSummary)

      writeDashboardCache(cacheKey, {
        recentDocs: nextRecentDocs,
        recentProjects: projects,
        priorityItems: reminders,
        heroStats: nextHeroStats,
        summary: nextSummary,
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

  return { loading, recentDocs, recentProjects, priorityItems, heroStats, summary, refresh: load }
}
