import * as React from 'react'
import { ADVANCE_INVOICE_EXCLUSION_FILTER, shouldIncludeInvoiceInList } from '@/domain/invoice/advanceList'
import { supabase } from '@/supabase'
import { formatStatusLabel } from '@/lib/formatters/status'

export type RecentDoc = {
  id: string
  type: 'Invoice' | 'Quotation' | 'CSR' | 'Waybill'
  number: string
  client: string
  date: string
  status: string
  amount: number | null
  meta?: string
}

export type PriorityItem = {
  key: string
  title: string
  meta: string
  dotClassName: string
  dotRingClassName: string
  badgeLabel: string
  badgeClassName: string
  type: string
}

type HeroStats = {
  collections: number
  openWork: number
  awaitingPaymentCount: number
  inTransitWaybills: number
}

type SummaryStats = {
  overdue: number
  pastDue: number
  dueThisWeek: number
  thisMonthCollections: number
  pendingFollowUp: number
}

type DashboardFinancialMetrics = {
  overdue: number | string | null
  due_this_week: number | string | null
  this_month_collections: number | string | null
  pending_follow_up: number | string | null
  awaiting_payment_count: number | string | null
  has_past_due: boolean | null
}

function toNumber(value: number | string | null | undefined) {
  return Number(value || 0)
}

export function useDashboardData() {
  const [loading, setLoading] = React.useState(true)
  const [recentDocs, setRecentDocs] = React.useState<RecentDoc[]>([])
  const [priorityItems, setPriorityItems] = React.useState<PriorityItem[]>([])
  const [heroStats, setHeroStats] = React.useState<HeroStats>({
    collections: 0,
    openWork: 0,
    awaitingPaymentCount: 0,
    inTransitWaybills: 0,
  })
  const [summary, setSummary] = React.useState<SummaryStats>({
    overdue: 0,
    pastDue: 0,
    dueThisWeek: 0,
    thisMonthCollections: 0,
    pendingFollowUp: 0,
  })

  const load = React.useCallback(async () => {
    setLoading(true)

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const startOfMonthIso = startOfMonth.toISOString()

    const now = new Date()
    const endOfWeek = new Date(now)
    endOfWeek.setDate(now.getDate() + 7)
    endOfWeek.setHours(23, 59, 59, 999)
    const nowIso = now.toISOString()
    const endOfWeekIso = endOfWeek.toISOString()

    try {
      const [invoiceRes, quotationRes, csrRes, waybillRes, financialMetricsRes, projectsRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('id, invoice_number, client_name, status, created_at, issue_date, total, custom_fields')
          .or(ADVANCE_INVOICE_EXCLUSION_FILTER)
          .order('issue_date', { ascending: false })
          .limit(8),
        supabase.from('quotations').select('id, quotation_number, client_name, status, created_at, issue_date, total').order('issue_date', { ascending: false }).limit(8),
        supabase.from('csrs').select('id, csr_number, client_name, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('waybills').select('id, waybill_number, client_name, status, created_at, date, type, vehicle_plate').order('created_at', { ascending: false }).limit(8),
        supabase.rpc('get_dashboard_financial_metrics', {
          p_now: nowIso,
          p_end_of_week: endOfWeekIso,
          p_start_of_month: startOfMonthIso,
        }),
        supabase.from('projects').select('id, name, client_name').order('created_at', { ascending: false }).limit(3),
      ])

      const invoices = (invoiceRes.data || []).filter((invoice) => shouldIncludeInvoiceInList(invoice))

      const mergedDocs: RecentDoc[] = [
        ...invoices.map((doc) => ({
          id: doc.id,
          type: 'Invoice' as const,
          number: doc.invoice_number,
          client: doc.client_name || 'Walking Client',
          date: doc.issue_date || doc.created_at,
          status: doc.status,
          amount: doc.total,
        })),
        ...(quotationRes.data || []).map((doc) => ({
          id: doc.id,
          type: 'Quotation' as const,
          number: doc.quotation_number,
          client: doc.client_name || 'Walking Client',
          date: doc.issue_date || doc.created_at,
          status: doc.status,
          amount: doc.total,
        })),
        ...(csrRes.data || []).map((doc) => ({
          id: doc.id,
          type: 'CSR' as const,
          number: doc.csr_number,
          client: doc.client_name || 'Walking Client',
          date: doc.created_at,
          status: doc.status,
          amount: null,
        })),
        ...(waybillRes.data || []).map((doc) => ({
          id: doc.id,
          type: 'Waybill' as const,
          number: doc.waybill_number || 'Waybill',
          client: doc.client_name || 'No client',
          date: doc.created_at || doc.date,
          status: doc.status,
          amount: null,
          meta: doc.vehicle_plate,
        })),
      ]
        .filter((doc) => doc.date)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5) as RecentDoc[]

      const financialMetrics = Array.isArray(financialMetricsRes.data)
        ? (financialMetricsRes.data[0] as DashboardFinancialMetrics | undefined)
        : (financialMetricsRes.data as DashboardFinancialMetrics | null)

      const pastDue = toNumber(financialMetrics?.overdue)
      const dueThisWeek = toNumber(financialMetrics?.due_this_week)
      const thisMonthCollections = toNumber(financialMetrics?.this_month_collections)
      const pendingFollowUpCount = toNumber(financialMetrics?.pending_follow_up)
      const awaitingPaymentCount = toNumber(financialMetrics?.awaiting_payment_count)
      const inTransitWaybills = (waybillRes.data || []).filter(
        (row) => String(row.status || '').toLowerCase() === 'dispatched'
      ).length

      // Build Priority Items
      const projects = projectsRes.data || []
      const reminders: PriorityItem[] = []

      if (projects[0]) {
        reminders.push({
          key: `project-${projects[0].id}`,
          title: `Update project status — ${projects[0].name}`,
          meta: `${projects[0].client_name || 'Open project'} • no movement recorded recently`,
          dotClassName: 'bg-emerald-500',
          dotRingClassName: 'ring-[6px] ring-emerald-500/15',
          badgeLabel: 'Project',
          badgeClassName: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          type: 'project'
        })
      }

      if (financialMetrics?.has_past_due) {
        reminders.push({
          key: `past-due-invoice`,
          title: `Record payment — Past due`,
          meta: `Balance still pending for record capture`,
          dotClassName: 'bg-rose-500',
          dotRingClassName: 'ring-[6px] ring-rose-500/15',
          badgeLabel: 'Payment',
          badgeClassName: 'bg-rose-50 text-rose-700 border-rose-200',
          type: 'payment'
        })
      }

      const pendingQuotation = (quotationRes.data || []).find((quotation) => {
        const status = String(quotation.status || '').toLowerCase()
        return status === 'open'
      })

      if (pendingQuotation) {
        reminders.push({
          key: `quotation-${pendingQuotation.id}`,
          title: `Follow up quotation — ${pendingQuotation.quotation_number}`,
          meta: `${pendingQuotation.client_name || 'Walking Client'} • status ${formatStatusLabel(pendingQuotation.status, { fallback: 'open', lowercase: true })}`,
          dotClassName: 'bg-blue-500',
          dotRingClassName: 'ring-[6px] ring-blue-500/15',
          badgeLabel: 'Quotation',
          badgeClassName: 'bg-blue-50 text-blue-700 border-blue-200',
          type: 'quotation'
        })
      }

      setRecentDocs(mergedDocs)
      setPriorityItems(reminders.slice(0, 3))
      setHeroStats({
        collections: thisMonthCollections,
        openWork: reminders.length || pendingFollowUpCount,
        awaitingPaymentCount,
        inTransitWaybills,
      })
      setSummary({ overdue: pastDue, pastDue, dueThisWeek, thisMonthCollections, pendingFollowUp: pendingFollowUpCount })
    } catch (error) {
      console.error('Dashboard data load failed:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  return { loading, recentDocs, priorityItems, heroStats, summary, refresh: load }
}
