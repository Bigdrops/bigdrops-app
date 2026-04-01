import * as React from 'react'
import {
  Archive,
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileSignature,
  FileText,
  FolderOpen,
  Truck,
  AlertCircle,
  Plus,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import Layout, { MobileChromeContext } from '../components/Layout'
import { getQuickTiles, loadStoredQuickTiles } from '../config/quickTiles'
import { supabase } from '../supabase'

const naira = (amount) => `₦${Math.round(Number(amount || 0)).toLocaleString()}`

const typeStyle = {
  Invoice: { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-600', icon: FileText, path: 'invoices' },
  Quotation: { badge: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-600', icon: FileSignature, path: 'quotations' },
  CSR: { badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-600', icon: ClipboardCheck, path: 'csr' },
  Waybill: { badge: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-700', icon: Truck, path: 'waybills' },
}

const CREATE_ACTIONS = [
  {
    key: 'invoice',
    label: 'New invoice',
    description: 'Create a billing document',
    path: '/invoices/new',
    icon: FileText,
    iconBg: 'bg-gradient-to-br from-[#5f85ff] to-[#4166ff]',
  },
  {
    key: 'quotation',
    label: 'New quotation',
    description: 'Start a proposal for a client',
    path: '/quotations/new',
    icon: FileSignature,
    iconBg: 'bg-gradient-to-br from-[#9b6bff] to-[#7b4dff]',
  },
  {
    key: 'csr',
    label: 'New CSR',
    description: 'Log a new service request',
    path: '/csr/new',
    icon: ClipboardCheck,
    iconBg: 'bg-gradient-to-br from-[#f5a524] to-[#f28d35]',
  },
  {
    key: 'waybill',
    label: 'New waybill',
    description: 'Create a dispatch record',
    path: '/waybills/new',
    icon: Truck,
    iconBg: 'bg-gradient-to-br from-[#2fcf93] to-[#12b76a]',
  },
]

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getUserDisplayName(session) {
  const user = session?.user
  const metadata = user?.user_metadata || {}
  const candidates = [
    metadata.full_name,
    metadata.name,
    metadata.display_name,
    [metadata.first_name, metadata.last_name].filter(Boolean).join(' ').trim(),
  ].filter(Boolean)

  if (candidates.length > 0) return candidates[0]

  const emailName = user?.email?.split('@')[0]?.replace(/[._-]+/g, ' ')?.trim()
  if (emailName) return emailName.replace(/\b\w/g, (char) => char.toUpperCase())
  return 'there'
}

function formatStatus(status) {
  const raw = String(status || 'draft').replace(/_/g, ' ')
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function getStatusStyle(status) {
  const label = formatStatus(status)
  if (label === 'Paid' || label === 'Approved' || label === 'Delivered') return { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: BadgeCheck, label }
  if (label === 'Overdue') return { badge: 'bg-red-50 text-red-700 border-red-200', icon: AlertCircle, label }
  if (label === 'In progress') return { badge: 'bg-slate-50 text-slate-700 border-slate-200', icon: Clock, label: 'In Progress' }
  if (label === 'Sent' || label === 'Dispatched') return { badge: 'bg-blue-50 text-blue-700 border-blue-200', icon: BadgeCheck, label }
  return { badge: 'bg-slate-50 text-slate-700 border-slate-200', icon: Clock, label }
}

function buildPriorityItems(projects, invoices, quotations) {
  const items = []

  if (projects[0]) {
    items.push({
      key: `project-${projects[0].id}`,
      title: `Update project status — ${projects[0].name}`,
      meta: `${projects[0].client_name || 'Open project'} • no movement recorded recently`,
      dotClassName: 'bg-emerald-500',
      dotShadow: '0 0 0 6px rgba(16,185,129,0.14)',
      badgeLabel: 'Project',
      badgeClassName: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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
      meta: `${paymentInvoice.client_name || 'Walking Client'} • ${naira(paymentInvoice.total)}`,
      dotClassName: 'bg-blue-500',
      dotShadow: '0 0 0 6px rgba(59,130,246,0.14)',
      badgeLabel: 'Payment',
      badgeClassName: 'bg-blue-50 text-blue-700 border-blue-200',
    })
  }

  if (projects[1]) {
    items.push({
      key: `project-review-${projects[1].id}`,
      title: `Confirm progress — ${projects[1].name}`,
      meta: `${projects[1].client_name || 'Open project'} • team follow-up needed`,
      dotClassName: 'bg-amber-500',
      dotShadow: '0 0 0 6px rgba(245,158,11,0.14)',
      badgeLabel: 'Review',
      badgeClassName: 'bg-amber-50 text-amber-700 border-amber-200',
    })
  } else if (quotations[0]) {
    items.push({
      key: `quote-${quotations[0].id}`,
      title: `Follow up quotation — ${quotations[0].quotation_number}`,
      meta: `${quotations[0].client_name || 'Walking Client'} • awaiting response`,
      dotClassName: 'bg-violet-500',
      dotShadow: '0 0 0 6px rgba(139,92,246,0.14)',
      badgeLabel: 'Quote',
      badgeClassName: 'bg-violet-50 text-violet-700 border-violet-200',
    })
  }

  return items.slice(0, 3)
}

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const mobileChrome = React.useContext(MobileChromeContext)

  const [quickAccessOpen, setQuickAccessOpen] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [recentDocs, setRecentDocs] = React.useState([])
  const [recentProjects, setRecentProjects] = React.useState([])
  const [priorityItems, setPriorityItems] = React.useState([])
  const [heroStats, setHeroStats] = React.useState({ collections: 0, openWork: 0 })
  const [summary, setSummary] = React.useState({ overdue: 0, dueThisWeek: 0, thisMonthCollections: 0, pendingFollowUp: 0 })

  const quickTiles = React.useMemo(() => getQuickTiles(loadStoredQuickTiles()), [])
  const createActions = React.useMemo(() => CREATE_ACTIONS, [])

  React.useEffect(() => {
    const load = async () => {
      setLoading(true)

      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const now = new Date()
      const endOfWeek = new Date(now)
      endOfWeek.setDate(now.getDate() + 7)
      endOfWeek.setHours(23, 59, 59, 999)

      const [invoiceRes, quotationRes, csrRes, waybillRes, financialsRes, projectsRes] = await Promise.all([
        supabase.from('invoices').select('id, invoice_number, client_name, status, created_at, total').order('created_at', { ascending: false }).limit(8),
        supabase.from('quotations').select('id, quotation_number, client_name, status, created_at, total').order('created_at', { ascending: false }).limit(8),
        supabase.from('csrs').select('id, csr_number, client_name, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('waybills').select('id, waybill_number, client_name, status, created_at, date, type, vehicle_plate').order('created_at', { ascending: false }).limit(8),
        supabase.from('invoice_financials_v').select('balance_due, cash_received, issue_date, due_date, computed_status'),
        supabase.from('projects').select('id, name, client_name').order('created_at', { ascending: false }).limit(3),
      ])

      const invoices = invoiceRes.data || []
      const quotations = quotationRes.data || []
      const csrs = csrRes.data || []
      const waybills = waybillRes.data || []
      const projects = projectsRes.data || []

      const mergedDocs = [
        ...invoices.map((doc) => ({
          id: doc.id,
          type: 'Invoice',
          number: doc.invoice_number,
          client: doc.client_name || 'Walking Client',
          date: doc.created_at,
          status: doc.status,
          amount: doc.total,
        })),
        ...quotations.map((doc) => ({
          id: doc.id,
          type: 'Quotation',
          number: doc.quotation_number,
          client: doc.client_name || 'Walking Client',
          date: doc.created_at,
          status: doc.status,
          amount: doc.total,
        })),
        ...csrs.map((doc) => ({
          id: doc.id,
          type: 'CSR',
          number: doc.csr_number,
          client: doc.client_name || 'Walking Client',
          date: doc.created_at,
          status: doc.status,
          amount: null,
        })),
        ...waybills.map((doc) => ({
          id: doc.id,
          type: 'Waybill',
          number: doc.waybill_number || 'Waybill',
          client: doc.client_name || 'No client',
          date: doc.created_at || doc.date,
          status: doc.status,
          amount: null,
          meta: doc.vehicle_plate || formatStatus(doc.type),
        })),
      ]
        .filter((doc) => doc.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5)

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

      const pendingFollowUp = invoiceFinancials.filter((row) => {
        const balance = Number(row.balance_due || 0)
        if (balance <= 0) return false
        if (String(row.computed_status || '').toLowerCase() === 'overdue') return true
        const dueDate = row.due_date ? new Date(row.due_date) : null
        if (!dueDate || Number.isNaN(dueDate.getTime())) return false
        return dueDate >= now && dueDate <= endOfWeek
      }).length

      const reminders = buildPriorityItems(projects, invoices, quotations)

      setRecentDocs(mergedDocs)
      setRecentProjects(projects)
      setPriorityItems(reminders)
      setHeroStats({
        collections: thisMonthCollections,
        openWork: reminders.length || pendingFollowUp,
      })
      setSummary({ overdue, dueThisWeek, thisMonthCollections, pendingFollowUp })
      setLoading(false)
    }

    void load()
  }, [])

  const userName = getUserDisplayName(session)

  return (
    <Layout title="Dashboard" session={session} hideMobileHomeHeader>
      <>
        <div className="md:hidden w-full overflow-x-hidden bg-[#f6f6f4] text-foreground">
          <div
            className="pb-6"
            style={{
              background:
                'radial-gradient(220px 220px at -30px 82%, rgba(255,255,255,.78), transparent 62%), radial-gradient(180px 180px at calc(100% + 20px) 32%, rgba(0,0,0,.96), transparent 62%), linear-gradient(180deg, #050607 0 255px, #f6f6f4 255px)',
            }}
          >
            <section className="px-4 pt-[18px] text-white">
              <div className="mb-[18px] flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => mobileChrome?.openSidebar?.()}
                    aria-label="Open menu"
                    className="grid h-[50px] w-[50px] place-items-center rounded-[18px] border border-white/10 bg-white/[0.05] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_24px_rgba(0,0,0,0.18)] backdrop-blur"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M4 7h16M4 12h16M4 17h16" />
                    </svg>
                  </button>

                  <div className="min-w-0">
                    <div className="mb-1 truncate text-[12px] font-bold uppercase tracking-[0.22em] text-white/60">
                      Workspace
                    </div>
                    <h1 className="truncate text-2xl font-black tracking-[-0.04em] text-white">
                      {getGreeting()}, {userName}
                    </h1>
                  </div>
                </div>

                <div className="grid h-[50px] w-[50px] place-items-center rounded-[18px] border border-white/10 bg-white/[0.05] text-base font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_24px_rgba(0,0,0,0.18)] backdrop-blur">
                  BD
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3 px-4">
              <article className="rounded-[24px] border border-black/10 bg-white px-4 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
                <label className="block text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#6d7a8f]">
                  Collections
                </label>
                <strong className="mt-3 block text-[28px] font-black tracking-[-0.05em] text-[#111111]">
                  {naira(heroStats.collections)}
                </strong>
                <span className="mt-2 block text-sm text-[#748197]">
                  Tracking ahead of last month’s pace.
                </span>
              </article>

              <article className="rounded-[24px] border border-black/10 bg-white px-4 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
                <label className="block text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#6d7a8f]">
                  Open work
                </label>
                <strong className="mt-3 block text-[28px] font-black tracking-[-0.05em] text-[#111111]">
                  {heroStats.openWork}
                </strong>
                <span className="mt-2 block text-sm text-[#748197]">
                  7 invoices pending, 3 drafts need review.
                </span>
              </article>
            </section>
          </div>

          <div className="px-4 pt-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#6c788d]">
                  Quick actions
                </h2>
                <button type="button" className="text-[13px] font-bold text-[#4769d8]">
                  See all
                </button>
              </div>

              <div className="grid grid-cols-2 gap-[14px]">
                {quickTiles.map((tile) => {
                  const Icon = tile.icon
                  return (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => navigate(tile.path)}
                      className={cn(
                        'relative overflow-hidden rounded-[26px] border p-[18px] text-left shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition active:scale-[0.99]',
                        tile.tint
                      )}
                    >
                      <span className="pointer-events-none absolute -left-5 -top-7 h-[120px] w-[120px] rounded-full bg-white/40" />
                      <span className={cn('relative z-[1] grid h-14 w-14 place-items-center rounded-[18px] shadow-sm', tile.iconBg)}>
                        <Icon className="h-6 w-6 text-white" />
                      </span>
                      <div className="relative z-[1] mt-5 text-[19px] font-black tracking-[-0.03em] text-foreground">
                        {tile.label}
                      </div>
                      <div className="relative z-[1] mt-1 text-sm leading-[1.45] text-muted-foreground">
                        {tile.tileHint || tile.description}
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="mt-6 space-y-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#6c788d]">
                  Priority follow-up
                </h2>
                <button type="button" className="text-[13px] font-bold text-[#4769d8]">
                  View queue
                </button>
              </div>

              <div className="rounded-[30px] border border-black/10 bg-white/85 p-[18px] shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-black tracking-[-0.05em] text-[#111111]">
                      {priorityItems.length || 0} reminders need action
                    </h3>
                    <p className="mt-1 text-sm leading-[1.45] text-[#6d7787]">
                      Use this space for stale project updates and invoice payments that still need to be recorded.
                    </p>
                  </div>
                  <span className="inline-flex h-[34px] min-w-[76px] items-center justify-center rounded-full border border-black/10 bg-slate-50 px-3 text-xs font-bold text-[#111111]">
                    Today
                  </span>
                </div>

                <div className="grid gap-[10px]">
                  {priorityItems.length === 0 ? (
                    <div className="rounded-[20px] border border-black/5 bg-[#fafaf8] px-4 py-4 text-sm text-muted-foreground">
                      No reminders right now.
                    </div>
                  ) : (
                    priorityItems.map((item) => (
                      <div
                        key={item.key}
                        className="grid grid-cols-[auto,1fr,auto] items-center gap-3 rounded-[20px] border border-black/5 bg-[#fafaf8] px-3.5 py-3.5"
                      >
                        <span
                          className={cn('h-3 w-3 rounded-full', item.dotClassName)}
                          style={{ boxShadow: item.dotShadow }}
                        />
                        <div className="min-w-0">
                          <strong className="block text-[15px] leading-[1.25] text-[#111111]">
                            {item.title}
                          </strong>
                          <span className="block text-[13px] leading-[1.35] text-[#6e7787]">
                            {item.meta}
                          </span>
                        </div>
                        <span className={cn('inline-flex h-8 min-w-[78px] items-center justify-center rounded-full border px-3 text-xs font-bold', item.badgeClassName)}>
                          {item.badgeLabel}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="mt-6 space-y-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#6c788d]">
                  Recent documents
                </h2>
              </div>

              <div className="grid gap-3">
                {loading ? (
                  <div className="rounded-[28px] border border-black/10 bg-white px-4 py-8 text-center text-sm text-muted-foreground shadow-[0_12px_30px_rgba(0,0,0,0.06)]">
                    Loading documents...
                  </div>
                ) : recentDocs.length === 0 ? (
                  <div className="rounded-[28px] border border-black/10 bg-white px-4 py-8 text-center text-sm text-muted-foreground shadow-[0_12px_30px_rgba(0,0,0,0.06)]">
                    No recent documents yet.
                  </div>
                ) : (
                  recentDocs.map((doc) => {
                    const type = typeStyle[doc.type]
                    const status = getStatusStyle(doc.status)
                    const amountText = doc.amount != null ? naira(doc.amount) : 'Open'

                    return (
                      <button
                        key={`${doc.type}-${doc.id}`}
                        type="button"
                        onClick={() => navigate(`/${type.path}/${doc.id}`)}
                        className="grid grid-cols-[1fr,auto] items-center gap-3 rounded-[28px] border border-black/10 bg-white px-[18px] py-4 text-left shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-2">
                            <Badge variant="outline" className={cn('rounded-full', type.badge)}>
                              <span className={cn('mr-2 inline-block h-1.5 w-1.5 rounded-full', type.dot)} />
                              {doc.type}
                            </Badge>
                            <span className="truncate text-[17px] font-black tracking-[-0.03em] text-[#111111]">
                              {doc.number}
                            </span>
                          </div>
                          <div className="truncate text-[13px] text-[#748094]">
                            {doc.client} • {new Date(doc.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                          </div>
                          {doc.meta ? (
                            <div className="truncate text-[13px] text-[#748094]">
                              {doc.meta}
                            </div>
                          ) : null}
                        </div>

                        <div className="min-w-[102px] text-right">
                          <span className="mb-2 block text-base font-black tracking-[-0.03em] text-[#111111]">
                            {amountText}
                          </span>
                          <Badge variant="outline" className={cn('rounded-full', status.badge)}>
                            {status.label}
                          </Badge>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </section>

            <section className="mt-6 space-y-3 pb-2">
              <div className="flex items-center justify-between gap-3 px-1">
                <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#6c788d]">
                  Snapshot
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-[14px]">
                <article className="rounded-[28px] border border-black/10 p-[18px] shadow-[0_12px_30px_rgba(0,0,0,0.06)]" style={{ background: 'linear-gradient(180deg, rgba(255,241,242,.92), rgba(255,255,255,.78))' }}>
                  <label className="block text-xs font-extrabold uppercase tracking-[0.18em] text-[#b33f4a]">
                    Overdue
                  </label>
                  <strong className="mt-4 block text-[30px] font-black tracking-[-0.05em] text-[#111111]">
                    {naira(summary.overdue)}
                  </strong>
                  <span className="mt-2 block text-sm leading-[1.45] text-[#747e8d]">
                    No unpaid balance has crossed due date today.
                  </span>
                </article>

                <article className="rounded-[28px] border border-black/10 p-[18px] shadow-[0_12px_30px_rgba(0,0,0,0.06)]" style={{ background: 'linear-gradient(180deg, rgba(255,248,235,.95), rgba(255,255,255,.78))' }}>
                  <label className="block text-xs font-extrabold uppercase tracking-[0.18em] text-[#ad770e]">
                    Due this week
                  </label>
                  <strong className="mt-4 block text-[30px] font-black tracking-[-0.05em] text-[#111111]">
                    {naira(summary.dueThisWeek)}
                  </strong>
                  <span className="mt-2 block text-sm leading-[1.45] text-[#747e8d]">
                    Your receivables calendar is currently clear.
                  </span>
                </article>

                <article className="rounded-[28px] border border-black/10 p-[18px] shadow-[0_12px_30px_rgba(0,0,0,0.06)]" style={{ background: 'linear-gradient(180deg, rgba(237,252,244,.96), rgba(255,255,255,.78))' }}>
                  <label className="block text-xs font-extrabold uppercase tracking-[0.18em] text-[#0e8b5d]">
                    Collected
                  </label>
                  <strong className="mt-4 block text-[30px] font-black tracking-[-0.05em] text-[#111111]">
                    {naira(summary.thisMonthCollections)}
                  </strong>
                  <span className="mt-2 block text-sm leading-[1.45] text-[#747e8d]">
                    Collection counter updates when payments are captured.
                  </span>
                </article>

                <article className="rounded-[28px] border border-black/10 bg-white/85 p-[18px] shadow-[0_12px_30px_rgba(0,0,0,0.06)]">
                  <label className="block text-xs font-extrabold uppercase tracking-[0.18em] text-[#6f7785]">
                    Pending follow-up
                  </label>
                  <strong className="mt-4 block text-[30px] font-black tracking-[-0.05em] text-[#111111]">
                    {priorityItems.length || summary.pendingFollowUp}
                  </strong>
                  <span className="mt-2 block text-sm leading-[1.45] text-[#747e8d]">
                    Two projects and one payment need attention today.
                  </span>
                </article>
              </div>
            </section>
          </div>

          {createActions.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                aria-label="Create new"
                className="fixed bottom-[76px] left-1/2 z-[25] grid h-[62px] w-[62px] -translate-x-1/2 place-items-center rounded-[20px] bg-[#111111] text-white shadow-[0_18px_34px_rgba(0,0,0,0.20)]"
              >
                <Plus className="h-7 w-7" />
              </button>

              <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <SheetContent side="bottom" className="p-0">
                  <div className="rounded-t-[28px] bg-white">
                    <div className="mx-auto mt-2 h-[5px] w-[52px] rounded-full bg-[#d8deea]" />
                    <SheetHeader className="px-4 pb-3 pt-4 text-left">
                      <SheetTitle className="text-2xl font-black tracking-[-0.04em] text-[#111111]">
                        Create new
                      </SheetTitle>
                    </SheetHeader>

                    <div className="grid gap-[10px] px-4 pb-5">
                      {createActions.map((action) => {
                        const Icon = action.icon
                        return (
                          <button
                            key={action.key}
                            type="button"
                            onClick={() => {
                              navigate(action.path)
                              setCreateOpen(false)
                            }}
                            className="grid grid-cols-[52px,1fr,auto] items-center gap-3 rounded-[20px] border border-black/10 bg-[#fafcff] px-3.5 py-3.5 text-left"
                          >
                            <span className={cn('grid h-[52px] w-[52px] place-items-center rounded-[16px] text-white', action.iconBg)}>
                              <Icon className="h-6 w-6" />
                            </span>
                            <span>
                              <span className="block text-[15px] font-bold text-[#111111]">
                                {action.label}
                              </span>
                              <span className="block text-[13px] text-[#738096]">
                                {action.description}
                              </span>
                            </span>
                            <ChevronRight className="h-[18px] w-[18px] text-[#64748b]" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : null}
        </div>

        <div className="hidden md:block w-full overflow-x-hidden px-4 pb-2 md:px-0">
          <div className="space-y-3">
            <Card className="max-w-full rounded-2xl border-border bg-card shadow-sm">
              <div className="flex items-center justify-between gap-2 px-3.5 py-3">
                <div className="min-w-0 flex-1 pr-1">
                  <div className="truncate text-base font-black text-foreground">
                    {getGreeting()}, {userName}
                  </div>
                </div>
              </div>
            </Card>

            <section className="space-y-2">
              <div className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick tiles</div>
              <div className="grid grid-cols-2 gap-3">
                {quickTiles.map((tile) => {
                  const Icon = tile.icon
                  return (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => navigate(tile.path)}
                      className={cn(
                        'group min-w-0 max-w-full overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition active:scale-[0.99]',
                        tile.tint
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className={cn('grid h-11 w-11 place-items-center rounded-2xl shadow-sm', tile.iconBg)}>
                          <Icon className="h-6 w-6 text-white" />
                        </span>
                        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-70 transition group-hover:opacity-100" />
                      </div>
                      <div className="mt-3 truncate text-sm font-bold text-foreground">{tile.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{tile.tileHint || tile.description}</div>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="space-y-2">
              <div className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent activity</div>

              <Card className="max-w-full overflow-hidden rounded-2xl border-border bg-card shadow-sm">
                <div className="divide-y divide-border">
                  {loading ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading activity...</div>
                  ) : recentDocs.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">No recent documents yet.</div>
                  ) : (
                    recentDocs.map((doc) => {
                      const type = typeStyle[doc.type]
                      const status = getStatusStyle(doc.status)
                      const TypeIcon = type.icon
                      const StatusIcon = status.icon
                      return (
                        <button
                          key={`${doc.type}-${doc.id}`}
                          type="button"
                          onClick={() => navigate(`/${type.path}/${doc.id}`)}
                          className="w-full overflow-hidden px-4 py-4 text-left transition hover:bg-muted/50"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                              <span className="mt-0.5 grid h-11 w-11 place-items-center rounded-2xl bg-muted">
                                <TypeIcon className="h-5 w-5 text-slate-700" />
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className={cn('rounded-full', type.badge)}>
                                    <span className={cn('mr-2 inline-block h-1.5 w-1.5 rounded-full', type.dot)} />
                                    {doc.type}
                                  </Badge>
                                  <div className="text-sm font-bold text-foreground">{doc.number}</div>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {doc.client} • {new Date(doc.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                                </div>
                                {doc.meta ? <div className="mt-1 text-xs text-muted-foreground">{doc.meta}</div> : null}
                                {doc.amount != null ? <div className="mt-2 text-sm font-black text-foreground">{naira(doc.amount)}</div> : null}
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2 self-start sm:ml-3">
                              <Badge variant="outline" className={cn('rounded-full', status.badge)}>
                                <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
                                {status.label}
                              </Badge>
                              <ChevronRight className="hidden h-5 w-5 text-slate-300 sm:block" />
                            </div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </Card>
            </section>

            <section className="space-y-2">
              <div className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action summary</div>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => navigate('/reports')} className="min-w-0 rounded-2xl border border-red-200 bg-red-50 p-4 text-left shadow-sm transition active:scale-[0.99]">
                  <div className="text-xs font-semibold uppercase tracking-wider text-red-700">Overdue</div>
                  <div className="mt-2 text-lg font-black text-foreground">{naira(summary.overdue)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Unpaid past due</div>
                </button>
                <button type="button" onClick={() => navigate('/reports')} className="min-w-0 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left shadow-sm transition active:scale-[0.99]">
                  <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">Due this week</div>
                  <div className="mt-2 text-lg font-black text-foreground">{naira(summary.dueThisWeek)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Upcoming receivables</div>
                </button>
                <button type="button" onClick={() => navigate('/reports')} className="min-w-0 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left shadow-sm transition active:scale-[0.99]">
                  <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Collected</div>
                  <div className="mt-2 text-lg font-black text-foreground">{naira(summary.thisMonthCollections)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">This month</div>
                </button>
                <button type="button" onClick={() => navigate('/reports')} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left shadow-sm transition active:scale-[0.99]">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-700">Pending follow-up</div>
                  <div className="mt-2 text-lg font-black text-foreground">{summary.pendingFollowUp}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Invoices needing attention</div>
                </button>
              </div>
            </section>

            <section className="pt-1">
              <Button variant="outline" className="w-full rounded-2xl border-zinc-200 bg-card shadow-sm" onClick={() => setQuickAccessOpen(true)}>
                More <ChevronDown className="ml-2 h-4 w-4" />
              </Button>

              <Sheet open={quickAccessOpen} onOpenChange={setQuickAccessOpen}>
                <SheetContent side="bottom" className="p-0">
                  <div className="rounded-t-3xl">
                    <SheetHeader className="rounded-t-3xl bg-slate-900 px-5 py-4 text-white shadow-none">
                      <SheetTitle className="text-base font-black tracking-tight">Quick Access</SheetTitle>
                    </SheetHeader>

                    <div className="bg-muted/50 px-4 py-4">
                      <div className="mb-4">
                        <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent projects</div>
                        <div className="space-y-2">
                          {recentProjects.map((project) => (
                            <button key={project.id} type="button" onClick={() => { navigate(`/projects/${project.id}`); setQuickAccessOpen(false) }} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left transition hover:bg-muted/50">
                              <div className="flex items-center gap-3">
                                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-muted">
                                  <FolderOpen className="h-5 w-5 text-slate-700" />
                                </span>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-foreground">{project.name}</div>
                                  <div className="text-xs text-muted-foreground">{project.client_name || 'Open project'}</div>
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Archive</div>
                        <button type="button" onClick={() => { navigate('/settings'); setQuickAccessOpen(false) }} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left transition hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-muted">
                              <Archive className="h-5 w-5 text-slate-700" />
                            </span>
                            <div>
                              <div className="text-sm font-semibold text-foreground">Archived items</div>
                              <div className="text-xs text-muted-foreground">Open settings archive tools</div>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </button>
                      </div>

                      <div className="mt-4">
                        <Button variant="outline" className="w-full rounded-2xl border-border bg-card" onClick={() => setQuickAccessOpen(false)}>
                          Close
                        </Button>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </section>

            <div className="h-2" />
          </div>
        </div>
      </>
    </Layout>
  )
}