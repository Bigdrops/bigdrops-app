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
  Menu,
  Truck,
  AlertCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import Layout, { BusinessSwitcher, MobileChromeContext } from '../components/Layout'
import { getQuickTiles, loadStoredQuickTiles } from '../config/quickTiles'
import { supabase } from '../supabase'

const naira = (amount) => `₦${Math.round(Number(amount || 0)).toLocaleString()}`

const typeStyle = {
  Invoice: { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-600', icon: FileText, path: 'invoices' },
  Quotation: { badge: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-600', icon: FileSignature, path: 'quotations' },
  CSR: { badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-600', icon: ClipboardCheck, path: 'csr' },
  Waybill: { badge: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-700', icon: Truck, path: 'waybills' },
}

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

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const mobileChrome = React.useContext(MobileChromeContext)
  const [quickAccessOpen, setQuickAccessOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [recentDocs, setRecentDocs] = React.useState([])
  const [recentProjects, setRecentProjects] = React.useState([])
  const [summary, setSummary] = React.useState({ overdue: 0, dueThisWeek: 0, thisMonthCollections: 0, pendingFollowUp: 0 })
  const quickTiles = React.useMemo(() => getQuickTiles(loadStoredQuickTiles()), [])

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

      const mergedDocs = [
        ...(invoiceRes.data || []).map((doc) => ({ id: doc.id, type: 'Invoice', number: doc.invoice_number, client: doc.client_name || 'Walking Client', date: doc.created_at, status: doc.status, amount: doc.total })),
        ...(quotationRes.data || []).map((doc) => ({ id: doc.id, type: 'Quotation', number: doc.quotation_number, client: doc.client_name || 'Walking Client', date: doc.created_at, status: doc.status, amount: doc.total })),
        ...(csrRes.data || []).map((doc) => ({ id: doc.id, type: 'CSR', number: doc.csr_number, client: doc.client_name || 'Walking Client', date: doc.created_at, status: doc.status, amount: null })),
        ...(waybillRes.data || []).map((doc) => ({ id: doc.id, type: 'Waybill', number: doc.waybill_number || 'Waybill', client: doc.client_name || 'No client', date: doc.created_at || doc.date, status: doc.status, amount: null, meta: doc.vehicle_plate || formatStatus(doc.type) })),
      ]
        .filter((doc) => doc.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5)

      const invoiceFinancials = financialsRes.data || []
      const overdue = invoiceFinancials.reduce((sum, row) => String(row.computed_status || '').toLowerCase() === 'overdue' ? sum + Number(row.balance_due || 0) : sum, 0)
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

      setRecentDocs(mergedDocs)
      setRecentProjects(projectsRes.data || [])
      setSummary({ overdue, dueThisWeek, thisMonthCollections, pendingFollowUp })
      setLoading(false)
    }

    void load()
  }, [])

  const userName = getUserDisplayName(session)
  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <Layout title="Dashboard" session={session} hideMobileHomeHeader>
      <div className="w-full overflow-x-hidden px-4 pb-2 md:px-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-3.5 py-2.5 shadow-sm md:hidden">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={mobileChrome.openSidebar}
              className="h-9 w-9 rounded-xl border-border bg-muted/40 shadow-none"
              aria-label="Open navigation menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Dashboard</div>
              <div className="truncate text-sm font-semibold text-foreground">BIGDROPS</div>
            </div>
            <div className="shrink-0">
              <BusinessSwitcher />
            </div>
          </div>

          <Card className="max-w-full rounded-2xl border-border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-2 px-3.5 py-3">
              <div className="min-w-0 flex-1 pr-1">
                <div className="truncate text-base font-black text-foreground">
                  {getGreeting()}, {userName}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{dateLabel}</div>
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

          <div className="max-w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
          </div>
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
    </Layout>
  )
}
