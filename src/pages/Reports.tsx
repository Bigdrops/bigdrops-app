import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  FileSpreadsheet,
  Filter,
  Landmark,
  Receipt,
  Search,
  Wallet,
} from 'lucide-react'

import Layout from '../components/Layout'
import { supabase } from '../supabase'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type ReportTab = 'receivables' | 'collections' | 'projects' | 'tax'
type DatePreset = 'this_month' | 'last_month' | 'this_quarter' | 'custom'
type ReceivablesFilter = 'all' | 'unpaid' | 'paid' | 'overdue'
type MetricTone = 'green' | 'red' | 'amber' | 'blue'

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
  bank_account_id?: string | null
  date?: string | null
  method?: string | null
  reference?: string | null
  cash_amount?: number | null
  wht_amount?: number | null
  voided_at?: string | null
  invoices?: CollectionInvoiceInfo | CollectionInvoiceInfo[] | null
  invoice_number?: string | null
  client_name?: string | null
  account_label?: string | null
}

type BankAccountLookupRow = {
  id: string
  bank_name?: string | null
  account_number?: string | null
}

type ProjectFinancialRow = {
  id: string
  project_id?: string | null
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

type Metric = {
  label: string
  value: string
  tone: MetricTone
  icon: ReactNode
}

const dateChips: Array<{ label: string; value: DatePreset }> = [
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Quarter', value: 'this_quarter' },
  { label: 'Custom', value: 'custom' },
]

const formatMoney = (value: number | null | undefined) => `₦${Number(value || 0).toLocaleString()}`

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

const safeDate = (val: string | null | undefined) => (val && val.trim() !== '' ? val : null)

const getPresetRange = (preset: DatePreset, customStart: string, customEnd: string) => {
  const now = new Date()
  if (preset === 'this_month') return { start: toDateInput(startOfMonth(now)), end: toDateInput(endOfMonth(now)) }
  if (preset === 'last_month') {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return { start: toDateInput(startOfMonth(lastMonth)), end: toDateInput(endOfMonth(lastMonth)) }
  }
  if (preset === 'this_quarter') return { start: toDateInput(startOfQuarter(now)), end: toDateInput(now) }
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
  if (diff <= 30) return '1–30'
  if (diff <= 60) return '31–60'
  return '61+'
}

const getStatusClass = (status: string | null | undefined) => {
  switch (String(status || '').toLowerCase()) {
    case 'paid':
      return 'bg-emerald-500 text-white'
    case 'overdue':
      return 'bg-red-500 text-white'
    case 'partial':
      return 'bg-amber-500 text-white'
    case 'active':
    case 'sent':
    case 'current':
      return 'bg-blue-500 text-white'
    case 'completed':
    case 'draft':
      return 'bg-slate-500 text-white'
    default:
      return 'bg-slate-500 text-white'
  }
}

const getMetricToneClasses = (tone: MetricTone) => {
  switch (tone) {
    case 'green':
      return { card: 'border-emerald-200 bg-emerald-50/60', icon: 'bg-emerald-100 text-emerald-700', value: 'text-emerald-700' }
    case 'red':
      return { card: 'border-red-200 bg-red-50/60', icon: 'bg-red-100 text-red-700', value: 'text-red-700' }
    case 'amber':
      return { card: 'border-amber-200 bg-amber-50/70', icon: 'bg-amber-100 text-amber-700', value: 'text-amber-700' }
    default:
      return { card: 'border-blue-200 bg-blue-50/60', icon: 'bg-blue-100 text-blue-700', value: 'text-blue-700' }
  }
}

const getAgingBadgeClass = (aging: string) => {
  switch (aging) {
    case 'Current':
      return 'bg-blue-500 text-white'
    case '1–30':
      return 'bg-amber-500 text-white'
    case '31–60':
      return 'bg-orange-500 text-white'
    case '61+':
      return 'bg-red-500 text-white'
    default:
      return 'bg-slate-500 text-white'
  }
}

const getLeftBorderClass = (status: string | null | undefined) => {
  switch (String(status || '').toLowerCase()) {
    case 'paid':
      return 'border-l-4 border-l-emerald-500'
    case 'overdue':
      return 'border-l-4 border-l-red-500'
    case 'partial':
      return 'border-l-4 border-l-amber-500'
    case 'active':
    case 'sent':
    case 'current':
      return 'border-l-4 border-l-blue-500'
    case 'completed':
    case 'draft':
      return 'border-l-4 border-l-slate-500'
    default:
      return 'border-l-4 border-l-slate-300'
  }
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0F172A] p-4 text-white shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">{title}</h1>
          <p className="mt-1 text-xs text-slate-300">{subtitle}</p>
        </div>
        <div className="rounded-full border border-slate-700 bg-slate-800/80 p-2">
          <FileSpreadsheet className="h-4 w-4 text-blue-300" />
        </div>
      </div>
    </div>
  )
}

function MetricStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-3">
        {metrics.map((metric) => {
          const tone = getMetricToneClasses(metric.tone)
          return (
            <Card key={metric.label} className={`min-w-[168px] border shadow-sm ${tone.card}`}>
              <CardContent className="p-3">
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/70 shadow-sm ${tone.icon}`}>
                  {metric.icon}
                </div>
                <div className={`text-2xl font-black tracking-tight ${tone.value}`}>{metric.value}</div>
                <p className="mt-1 text-xs font-medium text-muted-foreground">{metric.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function Filters({
  activeDate,
  setActiveDate,
  statusFilter,
  setStatusFilter,
  clientFilter,
  setClientFilter,
  clientOptions,
  search,
  setSearch,
  showStatus,
}: {
  activeDate: DatePreset
  setActiveDate: (value: DatePreset) => void
  statusFilter: ReceivablesFilter
  setStatusFilter: (value: ReceivablesFilter) => void
  clientFilter: string
  setClientFilter: (value: string) => void
  clientOptions: string[]
  search: string
  setSearch: (value: string) => void
  showStatus: boolean
}) {
  return (
    <Card className="border-blue-200 bg-card shadow-sm">
      <CardContent className="space-y-3 p-3">
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {dateChips.map((chip) => {
              const active = activeDate === chip.value
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setActiveDate(chip.value)}
                  className={
                    active
                      ? 'h-8 rounded-full border border-blue-300 bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-600'
                      : 'h-8 rounded-full border border-border bg-muted/50 px-3 text-xs font-semibold text-slate-700 hover:bg-muted/50'
                  }
                >
                  {chip.label}
                </button>
              )
            })}

            {showStatus ? (
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ReceivablesFilter)}>
                <SelectTrigger className="h-8 w-[120px] rounded-full border-input bg-muted/50 text-xs font-semibold">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            ) : null}

            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="h-8 w-[160px] rounded-full border-input bg-muted/50 text-xs font-semibold">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clientOptions.map((client) => (
                  <SelectItem key={client} value={client}>
                    {client}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search client, invoice or project..."
            className="border-input bg-muted/50 pl-9 text-sm"
          />
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingState({ label }: { label: string }) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="p-6 text-sm text-muted-foreground">Loading {label}...</CardContent>
    </Card>
  )
}

function EmptyState({ title, description, tone }: { title: string; description: string; tone: 'red' | 'green' | 'blue' | 'amber' }) {
  const toneClasses =
    tone === 'red'
      ? 'border-red-200 bg-red-50/50'
      : tone === 'green'
        ? 'border-emerald-200 bg-emerald-50/50'
        : tone === 'amber'
          ? 'border-amber-200 bg-amber-50/60'
          : 'border-blue-200 bg-blue-50/50'

  return (
    <Card className={`shadow-sm ${toneClasses}`}>
      <CardContent className="p-6">
        <div className="rounded-2xl border border-white/80 bg-card p-5 text-center shadow-sm">
          <div className="text-sm font-semibold text-slate-700">{title}</div>
          <div className="mt-2 text-sm text-muted-foreground">{description}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function ErrorBanner({ message }: { message: string }) {
  if (!message) return null
  return <div className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-medium text-white shadow-sm">{message}</div>
}

function TaxPlaceholder() {
  return (
    <Card className="border-amber-200 bg-amber-50/40 shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-foreground">VAT & WHT Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-amber-200 bg-card p-6 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-amber-700">
            <Receipt className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-bold text-foreground">Tax Summary Coming Soon</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Placeholder for VAT charged, WHT deductions and net tax position by period.
          </p>
          <div className="mt-5 grid gap-3 text-left">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Period</div>
              <div className="mt-1 text-sm font-semibold text-foreground">Current reporting period</div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Total VAT Charged</div>
                <div className="mt-1 text-lg font-bold text-foreground">₦0.00</div>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Total WHT</div>
                <div className="mt-1 text-lg font-bold text-foreground">₦0.00</div>
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground">Net Tax Position</div>
                <div className="mt-1 text-lg font-bold text-blue-700">₦0.00</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ReceivablesList({
  loading,
  error,
  rows,
}: {
  loading: boolean
  error: string
  rows: InvoiceFinancialRow[]
}) {
  if (loading) return <LoadingState label="receivables" />

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} />
      {rows.length === 0 ? (
        <EmptyState title="No receivables found" description="Try another date range, status, client, or search term." tone="red" />
      ) : (
        <Card className="border-red-200 bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Outstanding Invoices</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {rows.map((row) => {
                const aging = getAgingBucket(row.due_date)
                return (
                  <div key={row.id} className={`rounded-2xl border border-border bg-card p-4 shadow-sm ${getLeftBorderClass(row.computed_status)}`}>
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-foreground">
                          <Link to={`/invoices/${row.id}`} className="hover:text-blue-700 hover:underline">
                            {row.invoice_number || '—'}
                          </Link>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{row.client_name || '—'}</div>
                      </div>
                      <Badge className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${getStatusClass(row.computed_status)}`}>
                        {row.computed_status || 'draft'}
                      </Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      <div>
                        <div className="text-[11px] text-muted-foreground">Total</div>
                        <div className="text-sm font-semibold text-foreground">{formatMoney(row.total)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground">Received</div>
                        <div className="text-sm font-semibold text-emerald-700">{formatMoney(row.cash_received)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground">Balance Due</div>
                        <div className="text-lg font-black text-red-600">{formatMoney(row.balance_due)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground">Due Date</div>
                        <div className="text-sm font-semibold text-foreground">{formatDate(row.due_date)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground">Aging</div>
                        <Badge className={`mt-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${getAgingBadgeClass(aging)}`}>{aging}</Badge>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function CollectionsList({
  loading,
  error,
  rows,
}: {
  loading: boolean
  error: string
  rows: CollectionRow[]
}) {
  if (loading) return <LoadingState label="collections" />

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} />
      {rows.length === 0 ? (
        <EmptyState title="No collections found" description="Try another date range, client, or search term." tone="green" />
      ) : (
        <Card className="border-emerald-200 bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Payments Received</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.id} className="rounded-2xl border border-border border-l-4 border-l-emerald-500 bg-card p-4 shadow-sm">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                    <div>
                      <div className="text-[11px] text-muted-foreground">Date</div>
                      <div className="text-sm font-semibold text-foreground">{formatDate(row.date)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">Invoice #</div>
                      <div className="text-sm font-semibold text-foreground">
                        {row.invoice_id ? (
                          <Link to={`/invoices/${row.invoice_id}`} className="hover:text-blue-700 hover:underline">
                            {row.invoice_number || '—'}
                          </Link>
                        ) : (
                          row.invoice_number || '—'
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">Client</div>
                      <div className="text-sm font-semibold text-foreground">{row.client_name || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">Amount</div>
                      <div className="text-lg font-black text-emerald-700">{formatMoney(row.cash_amount)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">Settlement</div>
                      <div className="text-sm font-semibold text-foreground">{formatMoney(Number(row.cash_amount || 0) + Number(row.wht_amount || 0))}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">Account</div>
                      <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Landmark className="h-3.5 w-3.5 text-emerald-600" />
                        {row.account_label || row.method || '—'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Method: <span className="font-semibold text-slate-700">{row.method || '—'}</span></span>
                    <span>Reference: <span className="font-semibold text-slate-700">{row.reference || '—'}</span></span>
                    <Badge className="rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white">PAID</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ProjectsList({
  loading,
  error,
  rows,
}: {
  loading: boolean
  error: string
  rows: ProjectFinancialRow[]
}) {
  if (loading) return <LoadingState label="projects" />

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} />
      {rows.length === 0 ? (
        <EmptyState title="No projects found" description="Try another client filter or search term." tone="blue" />
      ) : (
        <Card className="border-blue-200 bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Project Financial Summaries</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {rows.map((row) => (
                <Link
                  key={row.id}
                  to={row.project_id ? `/projects/${row.project_id}` : '#'}
                  className={`block rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${getLeftBorderClass(row.status)} ${row.project_id ? '' : 'pointer-events-none'}`}
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-foreground">{row.project_name || row.name || 'Untitled project'}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{row.client_name || '—'}</div>
                    </div>
                    <Badge className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${getStatusClass(row.status)}`}>
                      {row.status || 'unknown'}
                    </Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <div className="text-[11px] text-muted-foreground">Total Invoiced</div>
                      <div className="text-sm font-semibold text-foreground">{formatMoney(row.total_invoiced)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">Collected</div>
                      <div className="text-sm font-semibold text-emerald-700">{formatMoney(row.cash_collected)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">Outstanding</div>
                      <div className="text-lg font-black text-red-600">{formatMoney(row.outstanding)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-muted-foreground">Invoice Count</div>
                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                        {Number(row.invoice_count || 0)}
                        {row.project_id ? <ArrowRight className="h-3.5 w-3.5 text-blue-600" /> : null}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function Reports() {
  const [tab, setTab] = useState<ReportTab>('receivables')
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [receivablesFilter, setReceivablesFilter] = useState<ReceivablesFilter>('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [search, setSearch] = useState('')
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
  const queryStart = useMemo(() => safeDate(start), [start])
  const queryEnd = useMemo(() => safeDate(end), [end])
  const searchTerm = search.trim().toLowerCase()

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

      let receivablesQuery = supabase.from('invoice_financials_v').select('*').order('issue_date', { ascending: false })
      let paymentsQuery = supabase
        .from('payments')
        .select('*, invoices(invoice_number, client_name)')
        .is('voided_at', null)
        .order('date', { ascending: false })

      const startDate = safeDate(queryStart)
      const endDate = safeDate(queryEnd)

      if (startDate) {
        receivablesQuery = receivablesQuery.gte('issue_date', startDate)
        paymentsQuery = paymentsQuery.gte('date', startDate)
      }
      if (endDate) {
        receivablesQuery = receivablesQuery.lte('issue_date', endDate)
        paymentsQuery = paymentsQuery.lte('date', endDate)
      }

      const [receivablesResult, paymentsResult, projectsResult] = await Promise.all([
        receivablesQuery,
        paymentsQuery,
        supabase.from('project_financials_v').select('*').order('outstanding', { ascending: false }),
      ])

      if (cancelled) return

      setReceivables((receivablesResult.data || []) as InvoiceFinancialRow[])
      setProjects((projectsResult.data || []) as ProjectFinancialRow[])

      const bankAccountIds = Array.from(
        new Set(
          ((paymentsResult.data || []) as CollectionRow[])
            .map((payment) => payment.bank_account_id)
            .filter((value): value is string => Boolean(value)),
        ),
      )

      let bankAccountsMap = new Map<string, BankAccountLookupRow>()
      if (bankAccountIds.length > 0) {
        const { data: bankAccountRows, error: bankAccountsError } = await supabase
          .from('bank_accounts')
          .select('id, bank_name, account_number')
          .in('id', bankAccountIds)

        if (bankAccountsError && !cancelled) {
          setError((current) => ({
            ...current,
            collections: bankAccountsError.message,
          }))
        } else {
          bankAccountsMap = new Map(
            ((bankAccountRows || []) as BankAccountLookupRow[]).map((bankAccount) => [bankAccount.id, bankAccount]),
          )
        }
      }

      const collectionRows = ((paymentsResult.data || []) as CollectionRow[]).map((payment) => {
        const joinedInvoice = Array.isArray(payment.invoices) ? payment.invoices[0] : payment.invoices
        const linkedAccount = payment.bank_account_id ? bankAccountsMap.get(payment.bank_account_id) : null
        return {
          ...payment,
          invoice_number: joinedInvoice?.invoice_number || '—',
          client_name: joinedInvoice?.client_name || '—',
          account_label: linkedAccount?.bank_name
            ? `${linkedAccount.bank_name} — ${linkedAccount.account_number || 'No account'}`
            : payment.method || '—',
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
        collections: paymentsResult.error?.message || '',
        projects: projectsResult.error?.message || '',
      })
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [queryEnd, queryStart])

  const clientOptions = useMemo(() => {
    const allClients = new Set<string>()
    receivables.forEach((row) => {
      if (row.client_name) allClients.add(row.client_name)
    })
    collections.forEach((row) => {
      if (row.client_name) allClients.add(row.client_name)
    })
    projects.forEach((row) => {
      if (row.client_name) allClients.add(row.client_name)
    })
    return Array.from(allClients).sort((a, b) => a.localeCompare(b))
  }, [receivables, collections, projects])

  const filteredReceivables = useMemo(() => {
    return receivables
      .filter((row) => isWithinRange(row.issue_date || null, start, end))
      .filter((row) => {
        if (receivablesFilter === 'unpaid') return Number(row.balance_due || 0) > 0
        if (receivablesFilter === 'paid') return Number(row.balance_due || 0) <= 0 || String(row.computed_status || '').toLowerCase() === 'paid'
        if (receivablesFilter === 'overdue') return String(row.computed_status || '').toLowerCase() === 'overdue'
        return true
      })
      .filter((row) => (clientFilter === 'all' ? true : row.client_name === clientFilter))
      .filter((row) => !searchTerm || [row.invoice_number, row.client_name].some((value) => String(value || '').toLowerCase().includes(searchTerm)))
  }, [receivables, start, end, receivablesFilter, clientFilter, searchTerm])

  const filteredCollections = useMemo(() => {
    return collections
      .filter((row) => isWithinRange(row.date || null, start, end))
      .filter((row) => (clientFilter === 'all' ? true : row.client_name === clientFilter))
      .filter((row) => !searchTerm || [row.invoice_number, row.client_name].some((value) => String(value || '').toLowerCase().includes(searchTerm)))
  }, [collections, start, end, clientFilter, searchTerm])

  const filteredProjects = useMemo(() => {
    return projects
      .filter((row) => (clientFilter === 'all' ? true : row.client_name === clientFilter))
      .filter((row) => !searchTerm || [row.project_name, row.name, row.client_name].some((value) => String(value || '').toLowerCase().includes(searchTerm)))
  }, [projects, clientFilter, searchTerm])

  const receivablesMetrics = useMemo<Metric[]>(() => {
    const outstanding = filteredReceivables.reduce((sum, row) => {
      const balance = Number(row.balance_due || 0)
      return balance > 0 ? sum + balance : sum
    }, 0)
    const overdue = filteredReceivables.reduce((sum, row) => String(row.computed_status || '').toLowerCase() === 'overdue' ? sum + Number(row.balance_due || 0) : sum, 0)
    const collected = filteredReceivables.reduce((sum, row) => sum + Number(row.cash_received || 0), 0)
    return [
      { label: 'Outstanding', value: formatMoney(outstanding), tone: 'red', icon: <Receipt className="h-4 w-4" /> },
      { label: 'Overdue', value: formatMoney(overdue), tone: 'red', icon: <CalendarDays className="h-4 w-4" /> },
      { label: 'Collected', value: formatMoney(collected), tone: 'green', icon: <Wallet className="h-4 w-4" /> },
      { label: 'Open Invoices', value: String(filteredReceivables.length), tone: 'blue', icon: <FileSpreadsheet className="h-4 w-4" /> },
    ]
  }, [filteredReceivables])

  const collectionMetrics = useMemo<Metric[]>(() => {
    const totalCash = filteredCollections.reduce((sum, row) => sum + Number(row.cash_amount || 0), 0)
    const totalSettlements = filteredCollections.reduce((sum, row) => sum + Number(row.cash_amount || 0) + Number(row.wht_amount || 0), 0)
    const pending = filteredCollections.filter((row) => row.voided_at == null).length
    return [
      { label: 'Total Cash', value: formatMoney(totalCash), tone: 'green', icon: <Banknote className="h-4 w-4" /> },
      { label: 'Settlements', value: formatMoney(totalSettlements), tone: 'blue', icon: <Landmark className="h-4 w-4" /> },
      { label: 'Transactions', value: String(filteredCollections.length), tone: 'green', icon: <CreditCard className="h-4 w-4" /> },
      { label: 'Pending', value: String(pending), tone: 'amber', icon: <Filter className="h-4 w-4" /> },
    ]
  }, [filteredCollections])

  const projectMetrics = useMemo<Metric[]>(() => {
    const totalInvoiced = filteredProjects.reduce((sum, row) => sum + Number(row.total_invoiced || 0), 0)
    const collected = filteredProjects.reduce((sum, row) => sum + Number(row.cash_collected || 0), 0)
    const outstanding = filteredProjects.reduce((sum, row) => sum + Number(row.outstanding || 0), 0)
    return [
      { label: 'Total Invoiced', value: formatMoney(totalInvoiced), tone: 'blue', icon: <BriefcaseBusiness className="h-4 w-4" /> },
      { label: 'Collected', value: formatMoney(collected), tone: 'green', icon: <Wallet className="h-4 w-4" /> },
      { label: 'Outstanding', value: formatMoney(outstanding), tone: 'red', icon: <Receipt className="h-4 w-4" /> },
      { label: 'Projects', value: String(filteredProjects.length), tone: 'blue', icon: <FileSpreadsheet className="h-4 w-4" /> },
    ]
  }, [filteredProjects])

  const taxMetrics = useMemo<Metric[]>(() => [
    { label: 'VAT Charged', value: '₦0.00', tone: 'amber', icon: <Receipt className="h-4 w-4" /> },
    { label: 'WHT', value: '₦0.00', tone: 'amber', icon: <FileSpreadsheet className="h-4 w-4" /> },
    { label: 'Net Position', value: '₦0.00', tone: 'blue', icon: <Wallet className="h-4 w-4" /> },
  ], [])

  return (
    <Layout title="Reports" hidePageHeader contentClassName="w-full max-w-none bg-slate-50 p-0 pb-24 md:px-4 md:pb-10">
      <div className="mx-auto w-full max-w-6xl px-4 py-4 md:px-0">
        <div className="space-y-4">
          <SectionHeader title="Reports" subtitle="Live receivables, collections, project finance snapshots, and a tax placeholder for the next phase." />
          <Tabs value={tab} onValueChange={(value) => setTab(value as ReportTab)} className="w-full">
            <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
              <div className="overflow-x-auto">
                <TabsList className="inline-flex h-auto w-max gap-2 bg-transparent p-0">
                  <TabsTrigger value="receivables" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 data-[state=active]:border-red-500 data-[state=active]:bg-red-500 data-[state=active]:text-white">Receivables</TabsTrigger>
                  <TabsTrigger value="collections" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 data-[state=active]:border-emerald-500 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">Collections</TabsTrigger>
                  <TabsTrigger value="projects" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 data-[state=active]:border-blue-500 data-[state=active]:bg-blue-500 data-[state=active]:text-white">Projects</TabsTrigger>
                  <TabsTrigger value="tax" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 data-[state=active]:border-amber-500 data-[state=active]:bg-amber-500 data-[state=active]:text-white">Tax</TabsTrigger>
                </TabsList>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              <TabsContent value="receivables" className="mt-0 space-y-4">
                <MetricStrip metrics={receivablesMetrics} />
                <Filters activeDate={datePreset} setActiveDate={setDatePreset} statusFilter={receivablesFilter} setStatusFilter={setReceivablesFilter} clientFilter={clientFilter} setClientFilter={setClientFilter} clientOptions={clientOptions} search={search} setSearch={setSearch} showStatus />
                {datePreset === 'custom' ? <Card className="border-blue-200 bg-card shadow-sm"><CardContent className="grid gap-3 p-3 md:grid-cols-2"><div><div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Start</div><Input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></div><div><div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">End</div><Input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></div></CardContent></Card> : null}
                <ReceivablesList loading={loading.receivables} error={error.receivables} rows={filteredReceivables} />
              </TabsContent>
              <TabsContent value="collections" className="mt-0 space-y-4">
                <MetricStrip metrics={collectionMetrics} />
                <Filters activeDate={datePreset} setActiveDate={setDatePreset} statusFilter={receivablesFilter} setStatusFilter={setReceivablesFilter} clientFilter={clientFilter} setClientFilter={setClientFilter} clientOptions={clientOptions} search={search} setSearch={setSearch} showStatus={false} />
                {datePreset === 'custom' ? <Card className="border-emerald-200 bg-card shadow-sm"><CardContent className="grid gap-3 p-3 md:grid-cols-2"><div><div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Start</div><Input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></div><div><div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">End</div><Input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></div></CardContent></Card> : null}
                <CollectionsList loading={loading.collections} error={error.collections} rows={filteredCollections} />
              </TabsContent>
              <TabsContent value="projects" className="mt-0 space-y-4">
                <MetricStrip metrics={projectMetrics} />
                <Filters activeDate={datePreset} setActiveDate={setDatePreset} statusFilter={receivablesFilter} setStatusFilter={setReceivablesFilter} clientFilter={clientFilter} setClientFilter={setClientFilter} clientOptions={clientOptions} search={search} setSearch={setSearch} showStatus={false} />
                <ProjectsList loading={loading.projects} error={error.projects} rows={filteredProjects} />
              </TabsContent>
              <TabsContent value="tax" className="mt-0 space-y-4">
                <MetricStrip metrics={taxMetrics} />
                <Filters activeDate={datePreset} setActiveDate={setDatePreset} statusFilter={receivablesFilter} setStatusFilter={setReceivablesFilter} clientFilter={clientFilter} setClientFilter={setClientFilter} clientOptions={clientOptions} search={search} setSearch={setSearch} showStatus={false} />
                {datePreset === 'custom' ? <Card className="border-amber-200 bg-card shadow-sm"><CardContent className="grid gap-3 p-3 md:grid-cols-2"><div><div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Start</div><Input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} /></div><div><div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">End</div><Input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} /></div></CardContent></Card> : null}
                <TaxPlaceholder />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </Layout>
  )
}
