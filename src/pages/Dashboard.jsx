import * as React from 'react'
import {
  Bell,
  FileText,
  FileSignature,
  ClipboardCheck,
  FolderKanban,
  ChevronRight,
  ChevronDown,
  Users,
  FolderOpen,
  Archive,
  BadgeCheck,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import Layout, { BusinessSwitcher, QuickTileRail } from '../components/Layout'
import { supabase } from '../supabase'

const naira = (amount) => `₦${Math.round(Number(amount || 0)).toLocaleString()}`

const typeStyle = {
  Invoice: { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-600', icon: FileText, path: 'invoices' },
  Quotation: { badge: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-600', icon: FileSignature, path: 'quotations' },
  CSR: { badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-600', icon: ClipboardCheck, path: 'csr' },
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatStatus(status) {
  const raw = String(status || 'draft').replace(/_/g, ' ')
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function getStatusStyle(status) {
  const label = formatStatus(status)
  if (label === 'Paid' || label === 'Approved') return { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: BadgeCheck, label }
  if (label === 'Overdue') return { badge: 'bg-red-50 text-red-700 border-red-200', icon: AlertCircle, label }
  if (label === 'In progress') return { badge: 'bg-slate-50 text-slate-700 border-slate-200', icon: Clock, label: 'In Progress' }
  if (label === 'Sent') return { badge: 'bg-blue-50 text-blue-700 border-blue-200', icon: BadgeCheck, label }
  return { badge: 'bg-slate-50 text-slate-700 border-slate-200', icon: Clock, label }
}

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const [quickAccessOpen, setQuickAccessOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [companyName, setCompanyName] = React.useState('BIGDROPS')
  const [recentDocs, setRecentDocs] = React.useState([])
  const [recentClients, setRecentClients] = React.useState([])
  const [recentProjects, setRecentProjects] = React.useState([])
  const [summary, setSummary] = React.useState({ outstandingReceivables: 0, thisMonthCollections: 0 })

  React.useEffect(() => {
    const load = async () => {
      setLoading(true)

      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const [invoiceRes, quotationRes, csrRes, financialsRes, clientsRes, projectsRes, settingsRes] = await Promise.all([
        supabase.from('invoices').select('id, invoice_number, client_name, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('quotations').select('id, quotation_number, client_name, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('csrs').select('id, csr_number, client_name, status, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('invoice_financials_v').select('balance_due, cash_received, issue_date'),
        supabase.from('clients').select('id, name').order('created_at', { ascending: false }).limit(3),
        supabase.from('projects').select('id, name, client_name').order('created_at', { ascending: false }).limit(3),
        supabase.from('settings').select('company_name').eq('id', 1).single(),
      ])

      const mergedDocs = [
        ...(invoiceRes.data || []).map((doc) => ({ id: doc.id, type: 'Invoice', number: doc.invoice_number, client: doc.client_name || 'Walking Client', date: doc.created_at, status: doc.status })),
        ...(quotationRes.data || []).map((doc) => ({ id: doc.id, type: 'Quotation', number: doc.quotation_number, client: doc.client_name || 'Walking Client', date: doc.created_at, status: doc.status })),
        ...(csrRes.data || []).map((doc) => ({ id: doc.id, type: 'CSR', number: doc.csr_number, client: doc.client_name || 'Walking Client', date: doc.created_at, status: doc.status })),
      ]
        .filter((doc) => doc.date)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5)

      const invoiceFinancials = financialsRes.data || []
      const outstandingReceivables = invoiceFinancials.reduce((sum, row) => sum + (Number(row.balance_due || 0) > 0 ? Number(row.balance_due || 0) : 0), 0)
      const thisMonthCollections = invoiceFinancials.reduce((sum, row) => {
        const issueDate = row.issue_date ? new Date(row.issue_date) : null
        if (!issueDate || Number.isNaN(issueDate.getTime()) || issueDate < startOfMonth) return sum
        return sum + Number(row.cash_received || 0)
      }, 0)

      setCompanyName(settingsRes.data?.company_name || 'BIGDROPS')
      setRecentDocs(mergedDocs)
      setRecentClients(clientsRes.data || [])
      setRecentProjects(projectsRes.data || [])
      setSummary({ outstandingReceivables, thisMonthCollections })
      setLoading(false)
    }

    void load()
  }, [])

  const greeting = getGreeting()
  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

  const quickActions = [
    { key: 'invoice', label: 'New Invoice', icon: FileText, tint: 'bg-blue-50 border-blue-200', iconBg: 'bg-blue-600', onClick: () => navigate('/invoices/new') },
    { key: 'quotation', label: 'New Quotation', icon: FileSignature, tint: 'bg-violet-50 border-violet-200', iconBg: 'bg-violet-600', onClick: () => navigate('/quotations/new') },
    { key: 'csr', label: 'New CSR', icon: ClipboardCheck, tint: 'bg-orange-50 border-orange-200', iconBg: 'bg-orange-600', onClick: () => navigate('/csr/new') },
    { key: 'project', label: 'New Project', icon: FolderKanban, tint: 'bg-emerald-50 border-emerald-200', iconBg: 'bg-emerald-600', onClick: () => navigate('/projects/new') },
  ]

  return (
    <Layout title="Dashboard" session={session}>
      <div className="space-y-3">
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <div className="flex items-start justify-between gap-3 px-4 py-4">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{greeting}</div>
              <div className="mt-1 truncate text-lg font-black text-foreground">{companyName}</div>
              <div className="mt-1 text-xs text-muted-foreground">{dateLabel}</div>
              <div className="mt-3">
                <BusinessSwitcher />
              </div>
            </div>

            <Button variant="outline" size="icon" className="rounded-2xl border-border bg-muted/50" onClick={() => {}}>
              <Bell className="h-5 w-5 text-slate-700" />
            </Button>
          </div>

          <div className="px-4 pb-4">
            <div className="rounded-2xl border border-border bg-muted/50 px-4 py-3">
              <div className="text-xs text-muted-foreground">
                Focus: <span className="font-semibold text-foreground">create documents fast</span> and keep collections moving.
              </div>
            </div>
          </div>
        </Card>

        <section className="space-y-2">
          <div className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick actions</div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <button key={action.key} type="button" onClick={action.onClick} className={cn('group rounded-2xl border p-4 text-left shadow-sm transition active:scale-[0.99]', action.tint)}>
                  <div className="flex items-start justify-between gap-3">
                    <span className={cn('grid h-11 w-11 place-items-center rounded-2xl shadow-sm', action.iconBg)}>
                      <Icon className="h-6 w-6 text-white" />
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground opacity-70 transition group-hover:opacity-100" />
                  </div>
                  <div className="mt-3 text-sm font-bold text-foreground">{action.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Tap to start</div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="space-y-2">
          <div className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shortcuts</div>
          <QuickTileRail />
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent activity</div>
            <button type="button" className="text-xs font-semibold text-foreground underline-offset-4 hover:underline" onClick={() => navigate('/invoices')}>
              View all
            </button>
          </div>

          <Card className="rounded-2xl border-border bg-card shadow-sm">
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
                    <button key={`${doc.type}-${doc.id}`} type="button" onClick={() => navigate(`/${type.path}/${doc.id}`)} className="w-full px-4 py-3 text-left transition hover:bg-muted/50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="mt-0.5 grid h-10 w-10 place-items-center rounded-2xl bg-muted">
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
                            <div className="mt-1 truncate text-xs text-muted-foreground">
                              {doc.client} • {new Date(doc.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn('rounded-full', status.badge)}>
                            <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
                            {status.label}
                          </Badge>
                          <ChevronRight className="h-5 w-5 text-slate-300" />
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            <div className="px-4 py-3">
              <Separator className="mb-3" />
              <button type="button" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-muted/50 px-4 py-3 text-sm font-semibold text-foreground shadow-sm" onClick={() => navigate('/invoices')}>
                View document lists <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </Card>
        </section>

        <section className="space-y-2">
          <div className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outstanding summary</div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => navigate('/reports')} className="rounded-2xl border border-red-200 bg-red-50 p-4 text-left shadow-sm transition active:scale-[0.99]">
              <div className="text-xs font-semibold uppercase tracking-wider text-red-700">Receivables</div>
              <div className="mt-2 text-xl font-black text-foreground">{naira(summary.outstandingReceivables)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Tap to open Reports</div>
            </button>
            <button type="button" onClick={() => navigate('/reports')} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left shadow-sm transition active:scale-[0.99]">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Collected</div>
              <div className="mt-2 text-xl font-black text-foreground">{naira(summary.thisMonthCollections)}</div>
              <div className="mt-1 text-xs text-muted-foreground">This month</div>
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
                <SheetHeader className="rounded-t-3xl bg-slate-900 px-5 py-4 text-white">
                  <SheetTitle className="text-base font-black tracking-tight">Quick Access</SheetTitle>
                </SheetHeader>

                <div className="bg-muted/50 px-4 py-4">
                  <div className="mb-4">
                    <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent clients</div>
                    <div className="space-y-2">
                      {recentClients.map((client) => (
                        <button key={client.id} type="button" onClick={() => { navigate(`/clients/${client.id}`); setQuickAccessOpen(false) }} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm transition hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-muted">
                              <Users className="h-5 w-5 text-slate-700" />
                            </span>
                            <div>
                              <div className="text-sm font-semibold text-foreground">{client.name}</div>
                              <div className="text-xs text-muted-foreground">Open client</div>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent projects</div>
                    <div className="space-y-2">
                      {recentProjects.map((project) => (
                        <button key={project.id} type="button" onClick={() => { navigate(`/projects/${project.id}`); setQuickAccessOpen(false) }} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm transition hover:bg-muted/50">
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
                    <button type="button" onClick={() => { navigate('/settings'); setQuickAccessOpen(false) }} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm transition hover:bg-muted/50">
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

                  <Card className="rounded-2xl border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">Workspace</div>
                      <div className="text-xs font-semibold text-foreground">Main workspace</div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">Notifications</div>
                      <div className="text-xs font-semibold text-foreground">Placeholder</div>
                    </div>
                  </Card>

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
    </Layout>
  )
}
