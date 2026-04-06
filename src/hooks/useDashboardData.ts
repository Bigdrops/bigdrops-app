import * as React from 'react'
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

export function useDashboardData() {
  const [loading, setLoading] = React.useState(true)
  const [recentDocs, setRecentDocs] = React.useState<RecentDoc[]>([])
  const [priorityItems, setPriorityItems] = React.useState<PriorityItem[]>([])
  const [heroStats, setHeroStats] = React.useState({ collections: 0, openWork: 0 })
  const [summary, setSummary] = React.useState({ overdue: 0, dueThisWeek: 0, thisMonthCollections: 0, pendingFollowUp: 0 })

  const load = React.useCallback(async () => {
    setLoading(true)

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const now = new Date()
    const endOfWeek = new Date(now)
    endOfWeek.setDate(now.getDate() + 7)
    endOfWeek.setHours(23, 59, 59, 999)

    try {
      const [invoiceRes, quotationRes, csrRes, waybillRes, financialsRes, projectsRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('id, invoice_number, client_name, status, created_at, total, thread_role, is_advance')
          .or('thread_role.is.null,thread_role.neq.advance')
          .or('is_advance.is.null,is_advance.eq.false')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase.from('quotations').select('id, quotation_number, client_name, status, created_at, total').order('created_at', { ascending: false }).limit(8),
        supabase.from('csrs').select('id, csr_number, client_name, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('waybills').select('id, waybill_number, client_name, status, created_at, date, type, vehicle_plate').order('created_at', { ascending: false }).limit(8),
        supabase.from('invoice_financials_v').select('balance_due, cash_received, issue_date, due_date, computed_status'),
        supabase.from('projects').select('id, name, client_name').order('created_at', { ascending: false }).limit(3),
      ])

      const invoices = (invoiceRes.data || []).filter(inv => {
        const threadRole = String(inv?.thread_role || '').toLowerCase()
        const isAdvanceInvoice = inv?.is_advance === true || String(inv?.is_advance || '').toLowerCase() === 'true'
        return threadRole !== 'advance' && !isAdvanceInvoice
      })

      const mergedDocs: RecentDoc[] = [
        ...invoices.map((doc) => ({
          id: doc.id,
          type: 'Invoice' as const,
          number: doc.invoice_number,
          client: doc.client_name || 'Walking Client',
          date: doc.created_at,
          status: doc.status,
          amount: doc.total,
        })),
        ...(quotationRes.data || []).map((doc) => ({
          id: doc.id,
          type: 'Quotation' as const,
          number: doc.quotation_number,
          client: doc.client_name || 'Walking Client',
          date: doc.created_at,
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

      const invoiceFinancials = financialsRes.data || []

      const overdue = invoiceFinancials.reduce(
        (sum, row) => String(row.computed_status || '').toLowerCase() === 'overdue' ? sum + Number(row.balance_due || 0) : sum,
        0
      )

      const dueThisWeek = invoiceFinancials.reduce((sum, row) => {
        const dueDate = row.due_date ? new Date(row.due_date) : null
        const balance = Number(row.balance_due || 0)
        if (!dueDate || Number.isNaN(dueDate.getTime()) || balance <= 0) return sum
        if (dueDate < now || dueDate > endOfWeek) return sum
        return sum + balance
      }, 0)

      const thisMonthCollections = invoiceFinancials.reduce((sum, row) => {
        const issueDate = row.issue_date ? new Date(row.issue_date) : null
        if (!issueDate || Number.isNaN(issueDate.getTime()) || issueDate < startOfMonth) return sum
        return sum + Number(row.cash_received || 0)
      }, 0)

      const pendingFollowUpCount = invoiceFinancials.filter((row) => {
        const balance = Number(row.balance_due || 0)
        if (balance <= 0) return false
        if (String(row.computed_status || '').toLowerCase() === 'overdue') return true
        const dueDate = row.due_date ? new Date(row.due_date) : null
        if (!dueDate || Number.isNaN(dueDate.getTime())) return false
        return dueDate >= now && dueDate <= endOfWeek
      }).length

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

      const overdueInvoice = invoiceFinancials.find(f => String(f.computed_status || '').toLowerCase() === 'overdue')
      if (overdueInvoice) {
        reminders.push({
          key: `overdue-invoice`,
          title: `Record payment — Overdue`,
          meta: `Balance still pending for record capture`,
          dotClassName: 'bg-rose-500',
          dotRingClassName: 'ring-[6px] ring-rose-500/15',
          badgeLabel: 'Payment',
          badgeClassName: 'bg-rose-50 text-rose-700 border-rose-200',
          type: 'payment'
        })
      }

      setRecentDocs(mergedDocs)
      setPriorityItems(reminders.slice(0, 3))
      setHeroStats({ collections: thisMonthCollections, openWork: reminders.length || pendingFollowUpCount })
      setSummary({ overdue, dueThisWeek, thisMonthCollections, pendingFollowUp: pendingFollowUpCount })
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
