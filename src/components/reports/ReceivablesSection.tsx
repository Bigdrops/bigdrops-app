import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, FileSpreadsheet, Receipt, Wallet } from 'lucide-react'
import { supabase } from '@/supabase'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DatePreset,
  InvoiceFinancialRow,
  Metric,
  ReceivablesFilter,
} from './reportTypes'
import {
  formatDate,
  formatMoney,
  getAgingBadgeClass,
  getAgingBucket,
  getLeftBorderClass,
  getReceivableStatus,
  getReceivableStatusLabel,
  getStatusClass,
  isPastDue,
  isWithinRange,
} from './reportUtils'
import { EmptyState, ErrorBanner, Filters, LoadingState, MetricStrip } from './ReportShared'

type Props = {
  isActive: boolean
  start: string
  end: string
  rangeKey: string
  clientFilter: string
  setClientFilter: (val: string) => void
  search: string
  setSearch: (val: string) => void
  datePreset: DatePreset
  setDatePreset: (val: DatePreset) => void
  customStart: string
  setCustomStart: (val: string) => void
  customEnd: string
  setCustomEnd: (val: string) => void
}

export function ReceivablesSection({
  isActive,
  start,
  end,
  rangeKey,
  clientFilter,
  setClientFilter,
  search,
  setSearch,
  datePreset,
  setDatePreset,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [loadedRange, setLoadedRange] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [data, setData] = useState<InvoiceFinancialRow[]>([])
  const [receivablesFilter, setReceivablesFilter] = useState<ReceivablesFilter>('all')
  const requestIdRef = useRef(0)

  const load = useCallback(async (startDate: string | null, endDate: string | null, nextRangeKey: string) => {
    const requestId = ++requestIdRef.current

    setLoading(true)
    setError('')

    let query = supabase.from('invoice_financials_v').select('*').order('issue_date', { ascending: false })

    if (startDate) query = query.gte('issue_date', startDate)
    if (endDate) query = query.lte('issue_date', endDate)

    const result = await query

    if (requestIdRef.current !== requestId) return

    setData((result.data || []) as InvoiceFinancialRow[])
    setLoading(false)
    setError(result.error?.message || '')

    if (!result.error) {
      setLoadedRange(nextRangeKey)
    }
  }, [])

  useEffect(() => {
    if (isActive && loadedRange !== rangeKey && !loading) {
      void load(start || null, end || null, rangeKey)
    }
  }, [isActive, start, end, rangeKey, loadedRange, loading, load])

  const searchTerm = search.trim().toLowerCase()

  const clientOptions = useMemo(() => {
    const allClients = new Set<string>()
    data.forEach((row) => {
      if (row.client_name) allClients.add(row.client_name)
    })
    return Array.from(allClients).sort((a, b) => a.localeCompare(b))
  }, [data])

  const filtered = useMemo(() => {
    return data
      .filter((row) => isWithinRange(row.issue_date || null, start, end))
      .filter((row) => {
        if (receivablesFilter === 'unpaid') return Number(row.balance_due || 0) > 0
        if (receivablesFilter === 'paid') return getReceivableStatus(row) === 'paid'
        if (receivablesFilter === 'past_due') return isPastDue(row.due_date, row.balance_due)
        return true
      })
      .filter((row) => (clientFilter === 'all' ? true : row.client_name === clientFilter))
      .filter((row) => !searchTerm || [row.invoice_number, row.client_name].some((value) => String(value || '').toLowerCase().includes(searchTerm)))
  }, [data, start, end, receivablesFilter, clientFilter, searchTerm])

  const metrics = useMemo<Metric[]>(() => {
    const outstanding = filtered.reduce((sum, row) => {
      const balance = Number(row.balance_due || 0)
      return balance > 0 ? sum + balance : sum
    }, 0)
    const pastDue = filtered.reduce((sum, row) => (isPastDue(row.due_date, row.balance_due) ? sum + Number(row.balance_due || 0) : sum), 0)
    const collected = filtered.reduce((sum, row) => sum + Number(row.cash_received || 0), 0)
    return [
      { label: 'Outstanding', value: formatMoney(outstanding), tone: 'red', icon: <Receipt className="h-4 w-4" /> },
      { label: 'Past Due', value: formatMoney(pastDue), tone: 'red', icon: <CalendarDays className="h-4 w-4" /> },
      { label: 'Collected', value: formatMoney(collected), tone: 'green', icon: <Wallet className="h-4 w-4" /> },
      { label: 'Open Invoices', value: String(filtered.length), tone: 'blue', icon: <FileSpreadsheet className="h-4 w-4" /> },
    ]
  }, [filtered])

  const isLoading = loading || loadedRange !== rangeKey

  return (
    <div className="space-y-4">
      <MetricStrip metrics={metrics} />
      <Filters
        activeDate={datePreset}
        setActiveDate={setDatePreset}
        statusFilter={receivablesFilter}
        setStatusFilter={setReceivablesFilter}
        clientFilter={clientFilter}
        setClientFilter={setClientFilter}
        clientOptions={clientOptions}
        search={search}
        setSearch={setSearch}
        showStatus
      />
      {datePreset === 'custom' ? (
        <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-3 shadow-sm grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))]">Start</div>
            <Input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="h-9 rounded-lg" />
          </div>
          <div>
            <div className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))]">End</div>
            <Input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="h-9 rounded-lg" />
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <LoadingState label="receivables" />
      ) : (
        <div className="space-y-4">
          <ErrorBanner message={error} />
          {filtered.length === 0 ? (
            <EmptyState title="No receivables found" description="Try another date range, status, client, or search term." tone="red" />
          ) : (
            <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))]">
                <h3 className="text-sm font-bold text-[hsl(var(--bd-text))]">Outstanding Invoices</h3>
              </div>
              <div className="divide-y divide-[hsl(var(--bd-border))]">
                {filtered.map((row) => {
                  const aging = getAgingBucket(row.due_date)
                  const isPastDueRow = isPastDue(row.due_date, row.balance_due)
                  const status = isPastDueRow ? 'past_due' : getReceivableStatus(row)
                  
                  return (
                    <div
                      key={row.id}
                      className={`p-4 flex flex-col gap-4 hover:bg-[hsl(var(--bd-surface-muted))] transition-colors ${getLeftBorderClass(status)}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-[hsl(var(--bd-text))]">
                            <Link to={`/invoices/${row.id}`} className="hover:text-[hsl(var(--bd-status-info-text))] hover:underline">
                              {row.invoice_number || '—'}
                            </Link>
                          </div>
                          <div className="mt-1 text-xs text-[hsl(var(--bd-text-muted))]">{row.client_name || '—'}</div>
                        </div>
                        <Badge
                          className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase border ${getStatusClass(status)}`}
                        >
                          {getReceivableStatusLabel(row)}
                        </Badge>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">Total</div>
                          <div className="text-sm font-bold text-[hsl(var(--bd-text))]">{formatMoney(row.total)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">Received</div>
                          <div className="text-sm font-bold text-[hsl(var(--bd-status-success-text))]">{formatMoney(row.cash_received)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">Balance Due</div>
                          <div className="text-lg font-black text-[hsl(var(--bd-status-danger-text))]">{formatMoney(row.balance_due)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">Due Date</div>
                          <div className="text-sm font-bold text-[hsl(var(--bd-text))]">{formatDate(row.due_date)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">Aging</div>
                          <Badge className={`mt-1 rounded-full px-2.5 py-1 text-[9px] font-bold border ${getAgingBadgeClass(aging)}`}>{aging}</Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
