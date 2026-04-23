import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, CreditCard, Filter, Landmark } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  CollectionRow,
  DatePreset,
  Metric,
  ReceivablesFilter,
} from './reportTypes'
import {
  formatDate,
  formatMoney,
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
  // Shared data from parent
  collections: CollectionRow[]
  isLoading: boolean
  error: string
}

export function CollectionsSection({
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
  collections,
  isLoading,
  error,
}: Props) {
  const [receivablesFilter, setReceivablesFilter] = useState<ReceivablesFilter>('all')

  const searchTerm = search.trim().toLowerCase()

  const clientOptions = useMemo(() => {
    const allClients = new Set<string>()
    collections.forEach((row) => {
      if (row.client_name) allClients.add(row.client_name)
    })
    return Array.from(allClients).sort((a, b) => a.localeCompare(b))
  }, [collections])

  const filtered = useMemo(() => {
    if (!isActive) return []
    return collections
      .filter((row) => isWithinRange(row.date || null, start, end))
      .filter((row) => (clientFilter === 'all' ? true : row.client_name === clientFilter))
      .filter((row) => !searchTerm || [row.invoice_number, row.client_name].some((value) => String(value || '').toLowerCase().includes(searchTerm)))
  }, [isActive, collections, start, end, clientFilter, searchTerm])

  const metrics = useMemo<Metric[]>(() => {
    if (!isActive) return []
    const totalCash = filtered.reduce((sum, row) => sum + Number(row.cash_amount || 0), 0)
    const totalSettlements = filtered.reduce((sum, row) => sum + Number(row.cash_amount || 0) + Number(row.wht_amount || 0), 0)
    const pending = filtered.filter((row) => row.voided_at == null).length
    return [
      { label: 'Total Cash', value: formatMoney(totalCash), tone: 'green', icon: <Banknote className="h-4 w-4" /> },
      { label: 'Settlements', value: formatMoney(totalSettlements), tone: 'blue', icon: <Landmark className="h-4 w-4" /> },
      { label: 'Transactions', value: String(filtered.length), tone: 'green', icon: <CreditCard className="h-4 w-4" /> },
      { label: 'Pending', value: String(pending), tone: 'amber', icon: <Filter className="h-4 w-4" /> },
    ]
  }, [isActive, filtered])

  if (!isActive && collections.length === 0) return null

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
        showStatus={false}
      />
      {datePreset === 'custom' ? (
        <Card className="border-emerald-200 bg-card shadow-sm">
          <CardContent className="grid gap-3 p-3 md:grid-cols-2">
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Start</div>
              <Input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">End</div>
              <Input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <LoadingState label="collections" />
      ) : (
        <div className="space-y-4">
          <ErrorBanner message={error} />
          {filtered.length === 0 ? (
            <EmptyState title="No collections found" description="Try another date range, client, or search term." tone="green" />
          ) : (
            <Card className="border-emerald-200 bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground">Payments Received</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {filtered.map((row) => (
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
      )}
    </div>
  )
}
