import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type ReportTab = 'receivables' | 'collections' | 'projects'
type DatePreset = 'this_month' | 'last_month' | 'this_quarter' | 'custom'

type InvoiceFinancialRow = {
  id: string
  invoice_number?: string | null
  client_name?: string | null
  issue_date?: string | null
  due_date?: string | null
  total?: number | null
  cash_received?: number | null
  wht_received?: number | null
  balance_due?: number | null
  computed_status?: string | null
}

type CollectionInvoiceInfo = {
  invoice_number?: string | null
  client_name?: string | null
}

type CollectionRow = {
  id: string
  invoice_id?: string | null
  date?: string | null
  method?: string | null
  reference?: string | null
  cash_amount?: number | null
  wht_amount?: number | null
  invoices?: CollectionInvoiceInfo | CollectionInvoiceInfo[] | null
  invoice_number?: string | null
  client_name?: string | null
}

type ProjectFinancialRow = {
  id: string
  project_name?: string | null
  name?: string | null
  client_name?: string | null
  status?: string | null
  invoice_count?: number | null
  total_invoiced?: number | null
  cash_collected?: number | null
  wht_collected?: number | null
  total_collected?: number | null
  outstanding?: number | null
}

const formatMoney = (value: number | null | undefined) => `\u20A6${Number(value || 0).toLocaleString()}`

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)
const startOfQuarter = (date: Date) => new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1)

const toDateInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getPresetRange = (preset: DatePreset, customStart: string, customEnd: string) => {
  const now = new Date()
  if (preset === 'this_month') {
    return {
      start: toDateInput(startOfMonth(now)),
      end: toDateInput(endOfMonth(now)),
    }
  }
  if (preset === 'last_month') {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return {
      start: toDateInput(startOfMonth(lastMonth)),
      end: toDateInput(endOfMonth(lastMonth)),
    }
  }
  if (preset === 'this_quarter') {
    return {
      start: toDateInput(startOfQuarter(now)),
      end: toDateInput(now),
    }
  }
  return { start: customStart || '', end: customEnd || '' }
}

const isWithinRange = (value: string | null | undefined, start: string, end: string) => {
  if (!value) return true
  if (start && value < start) return false
  if (end && value > end) return false
  return true
}

const getAgingBucket = (dueDate: string | null | undefined) => {
  if (!dueDate) return 'Current'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - due.getTime()) / 86400000)
  if (diff <= 0) return 'Current'
  if (diff <= 30) return '1-30 days overdue'
  if (diff <= 60) return '31-60 days overdue'
  return '61+ days overdue'
}

const getStatusClass = (status: string | null | undefined) => {
  switch (String(status || '').toLowerCase()) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-700'
    case 'overdue':
      return 'bg-red-100 text-red-600'
    case 'sent':
      return 'bg-blue-100 text-blue-700'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function SummaryMetric({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'danger' | 'success'
}) {
  const toneClass =
    tone === 'danger'
      ? 'bg-red-50 text-red-600'
      : tone === 'success'
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-muted/60 text-foreground'

  const labelToneClass =
    tone === 'danger'
      ? 'text-red-500'
      : tone === 'success'
        ? 'text-emerald-600'
        : 'text-muted-foreground'

  return (
    <div className={`rounded-xl p-4 ${toneClass}`}>
      <div className={`text-[10px] font-bold uppercase tracking-[0.16em] ${labelToneClass}`}>{label}</div>
      <div className="mt-2 text-lg font-black tracking-tight">{value}</div>
    </div>
  )
}

function TableShell({
  loading,
  empty,
  children,
}: {
  loading: boolean
  empty: boolean
  children: ReactNode
}) {
  if (loading) {
    return <div className="rounded-xl border border-border bg-card px-4 py-8 text-sm text-muted-foreground">Loading report...</div>
  }
  if (empty) {
    return <div className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-sm text-muted-foreground">No records found for this filter.</div>
  }
  return <div className="overflow-x-auto rounded-xl border border-border bg-card">{children}</div>
}

export default function Reports() {
  const [tab, setTab] = useState<ReportTab>('receivables')
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [methodFilter, setMethodFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [receivables, setReceivables] = useState<InvoiceFinancialRow[]>([])
  const [collections, setCollections] = useState<CollectionRow[]>([])
  const [projects, setProjects] = useState<ProjectFinancialRow[]>([])
  const [loading, setLoading] = useState({
    receivables: true,
    collections: true,
    projects: true,
  })
  const [error, setError] = useState({
    receivables: '',
    collections: '',
    projects: '',
  })

  const { start, end } = useMemo(() => getPresetRange(datePreset, customStart, customEnd), [datePreset, customStart, customEnd])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading({
        receivables: true,
        collections: true,
        projects: true,
      })
      setError({
        receivables: '',
        collections: '',
        projects: '',
      })

      const [receivablesResult, paymentsResult, invoicesResult, projectsResult] = await Promise.all([
        supabase.from('invoice_financials_v').select('*').order('issue_date', { ascending: false }),
        supabase.from('payments').select('*').is('voided_at', null).order('date', { ascending: false }),
        supabase.from('invoices').select('id, invoice_number, client_name'),
        supabase.from('project_financials_v').select('*').order('outstanding', { ascending: false }),
      ])

      if (cancelled) return

      setReceivables((receivablesResult.data || []) as InvoiceFinancialRow[])
      setProjects((projectsResult.data || []) as ProjectFinancialRow[])

      const invoiceLookup = new Map<string, CollectionInvoiceInfo>(
        ((invoicesResult.data || []) as Array<{ id: string; invoice_number?: string | null; client_name?: string | null }>).map((invoice) => [
          invoice.id,
          {
            invoice_number: invoice.invoice_number,
            client_name: invoice.client_name,
          },
        ]),
      )

      const collectionRows = ((paymentsResult.data || []) as CollectionRow[]).map((payment) => {
        const joinedInvoice = invoiceLookup.get(String(payment.invoice_id || ''))
        return {
          ...payment,
          invoice_number: joinedInvoice?.invoice_number || '—',
          client_name: joinedInvoice?.client_name || '—',
        }
      })
      setCollections(collectionRows)

      setLoading({
        receivables: false,
        collections: false,
        projects: false,
      })

      setError({
        receivables: receivablesResult.error?.message || '',
        collections: paymentsResult.error?.message || invoicesResult.error?.message || '',
        projects: projectsResult.error?.message || '',
      })
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredReceivables = useMemo(() => {
    return receivables
      .filter((row) => Number(row.balance_due || 0) > 0)
      .filter((row) => isWithinRange(row.issue_date || null, start, end))
      .filter((row) => (overdueOnly ? Number(row.balance_due || 0) > 0 && getAgingBucket(row.due_date) !== 'Current' : true))
  }, [receivables, start, end, overdueOnly])

  const receivablesSummary = useMemo(() => {
    const totalOutstanding = filteredReceivables.reduce((sum, row) => sum + Number(row.balance_due || 0), 0)
    const overdueOutstanding = filteredReceivables
      .filter((row) => getAgingBucket(row.due_date) !== 'Current')
      .reduce((sum, row) => sum + Number(row.balance_due || 0), 0)
    return {
      totalOutstanding,
      overdueOutstanding,
      count: filteredReceivables.length,
    }
  }, [filteredReceivables])

  const collectionClients = useMemo(
    () => Array.from(new Set(collections.map((row) => row.client_name || '—').filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [collections],
  )

  const filteredCollections = useMemo(() => {
    return collections
      .filter((row) => isWithinRange(row.date || null, start, end))
      .filter((row) => (methodFilter === 'all' ? true : String(row.method || '').toLowerCase() === methodFilter))
      .filter((row) => (clientFilter === 'all' ? true : row.client_name === clientFilter))
  }, [collections, start, end, methodFilter, clientFilter])

  const collectionsSummary = useMemo(() => {
    const totalCash = filteredCollections.reduce((sum, row) => sum + Number(row.cash_amount || 0), 0)
    const totalWht = filteredCollections.reduce((sum, row) => sum + Number(row.wht_amount || 0), 0)
    return {
      totalCash,
      totalWht,
      totalSettled: totalCash + totalWht,
      count: filteredCollections.length,
    }
  }, [filteredCollections])

  const projectsSummary = useMemo(() => {
    return {
      totalInvoiced: projects.reduce((sum, row) => sum + Number(row.total_invoiced || 0), 0),
      totalCollected: projects.reduce((sum, row) => sum + Number(row.total_collected || 0), 0),
      totalOutstanding: projects.reduce((sum, row) => sum + Number(row.outstanding || 0), 0),
    }
  }, [projects])

  return (
    <Layout title="Reports" hidePageHeader contentClassName="w-full max-w-none p-0 pb-24 md:px-4 md:pb-10">
      <div className="w-full px-4 py-4 md:px-0">
        <div className="mb-4">
          <div className="text-2xl font-black tracking-tight text-foreground">Reports</div>
          <div className="mt-1 text-sm text-muted-foreground">Receivables, collections, and project finance snapshots built from your live views.</div>
        </div>

        <Card className="mb-4 border-border shadow-none">
          <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,220px)_minmax(0,220px)_minmax(0,220px)_1fr]">
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Date Range</div>
              <Select value={datePreset} onValueChange={(value) => setDatePreset(value as DatePreset)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">This month</SelectItem>
                  <SelectItem value="last_month">Last month</SelectItem>
                  <SelectItem value="this_quarter">This quarter</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {datePreset === 'custom' ? (
              <>
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Start</div>
                  <Input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
                </div>
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">End</div>
                  <Input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
                </div>
              </>
            ) : (
              <div className="md:col-span-2">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Applied Window</div>
                <div className="rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
                  {formatDate(start)} to {formatDate(end)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={(value) => setTab(value as ReportTab)} className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-3">
            <TabsTrigger value="receivables">Receivables</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>

          <TabsContent value="receivables" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={overdueOnly ? 'outline' : 'default'} size="sm" onClick={() => setOverdueOnly(false)}>
                All
              </Button>
              <Button type="button" variant={overdueOnly ? 'default' : 'outline'} size="sm" onClick={() => setOverdueOnly(true)}>
                Overdue only
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <SummaryMetric label="Total Outstanding" value={formatMoney(receivablesSummary.totalOutstanding)} tone="danger" />
              <SummaryMetric label="Total Overdue" value={formatMoney(receivablesSummary.overdueOutstanding)} tone="danger" />
              <SummaryMetric label="Invoices" value={String(receivablesSummary.count)} />
            </div>

            {error.receivables ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error.receivables}</div> : null}

            <TableShell loading={loading.receivables} empty={filteredReceivables.length === 0}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Cash Received</TableHead>
                    <TableHead className="text-right">WHT Received</TableHead>
                    <TableHead className="text-right">Balance Due</TableHead>
                    <TableHead>Aging</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceivables.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-semibold text-slate-900">
                        <Link to={`/invoices/${row.id}`} className="text-blue-700 hover:underline">
                          {row.invoice_number || '—'}
                        </Link>
                      </TableCell>
                      <TableCell>{row.client_name || '—'}</TableCell>
                      <TableCell>{formatDate(row.issue_date)}</TableCell>
                      <TableCell>{formatDate(row.due_date)}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.total)}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.cash_received)}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.wht_received)}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">{formatMoney(row.balance_due)}</TableCell>
                      <TableCell>{getAgingBucket(row.due_date)}</TableCell>
                      <TableCell>
                        <Badge className={`capitalize ${getStatusClass(row.computed_status)}`}>{row.computed_status || 'draft'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableShell>
          </TabsContent>

          <TabsContent value="collections" className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Payment Method</div>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All methods</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="pos">POS</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Client</div>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All clients</SelectItem>
                    {collectionClients.map((client) => (
                      <SelectItem key={client} value={client}>
                        {client}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <SummaryMetric label="Cash Received" value={formatMoney(collectionsSummary.totalCash)} />
              <SummaryMetric label="WHT Received" value={formatMoney(collectionsSummary.totalWht)} />
              <SummaryMetric label="Total Settled" value={formatMoney(collectionsSummary.totalSettled)} tone="success" />
              <SummaryMetric label="Payments" value={String(collectionsSummary.count)} />
            </div>

            {error.collections ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error.collections}</div> : null}

            <TableShell loading={loading.collections} empty={filteredCollections.length === 0}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Cash</TableHead>
                    <TableHead className="text-right">WHT</TableHead>
                    <TableHead className="text-right">Settlement</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCollections.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatDate(row.date)}</TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        {row.invoice_id ? (
                          <Link to={`/invoices/${row.invoice_id}`} className="text-blue-700 hover:underline">
                            {row.invoice_number || '—'}
                          </Link>
                        ) : (
                          row.invoice_number || '—'
                        )}
                      </TableCell>
                      <TableCell>{row.client_name || '—'}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.cash_amount)}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.wht_amount)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatMoney(Number(row.cash_amount || 0) + Number(row.wht_amount || 0))}</TableCell>
                      <TableCell>{row.method || '—'}</TableCell>
                      <TableCell>{row.reference || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableShell>
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <SummaryMetric label="Total Invoiced" value={formatMoney(projectsSummary.totalInvoiced)} />
              <SummaryMetric label="Total Collected" value={formatMoney(projectsSummary.totalCollected)} tone="success" />
              <SummaryMetric label="Total Outstanding" value={formatMoney(projectsSummary.totalOutstanding)} tone="danger" />
            </div>

            {error.projects ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error.projects}</div> : null}

            <TableShell loading={loading.projects} empty={projects.length === 0}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Invoice Count</TableHead>
                    <TableHead className="text-right">Total Invoiced</TableHead>
                    <TableHead className="text-right">Cash Collected</TableHead>
                    <TableHead className="text-right">WHT Collected</TableHead>
                    <TableHead className="text-right">Total Collected</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-semibold text-slate-900">
                        <Link to={`/projects/${row.id}`} className="text-blue-700 hover:underline">
                          {row.project_name || row.name || 'Untitled project'}
                        </Link>
                      </TableCell>
                      <TableCell>{row.client_name || '—'}</TableCell>
                      <TableCell>
                        <Badge className={`capitalize ${getStatusClass(row.status)}`}>{row.status || 'unknown'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{Number(row.invoice_count || 0)}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.total_invoiced)}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.cash_collected)}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.wht_collected)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatMoney(row.total_collected)}</TableCell>
                      <TableCell className={`text-right font-semibold ${Number(row.outstanding || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {formatMoney(row.outstanding)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableShell>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}
