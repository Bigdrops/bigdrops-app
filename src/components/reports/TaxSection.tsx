import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRight, Banknote, FileSpreadsheet, Receipt, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  CollectionRow,
  DatePreset,
  Metric,
  ReceivablesFilter,
  TaxInvoiceRow,
} from './reportTypes'
import {
  formatMoney,
  computeReportTaxMetrics,
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
  data: TaxInvoiceRow[]
  collections: CollectionRow[]
  error?: string
  isLoading: boolean
}

export function TaxSection({
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
  data,
  collections,
  error = '',
  isLoading,
}: Props) {
  const [receivablesFilter, setReceivablesFilter] = useState<ReceivablesFilter>('all')

  const searchTerm = search.trim().toLowerCase()

  const clientOptions = useMemo(() => {
    const allClients = new Set<string>()
    data.forEach((row) => {
      if (row.client_name) allClients.add(row.client_name)
    })
    collections.forEach((row) => {
      if (row.client_name) allClients.add(row.client_name)
    })
    return Array.from(allClients).sort((a, b) => a.localeCompare(b))
  }, [data, collections])

  const filteredTaxInvoices = useMemo(() => {
    return data
      .filter((row) => isWithinRange(row.issue_date, start, end))
      .filter((row) => (clientFilter === 'all' ? true : row.client_name === clientFilter))
      .filter((row) => !searchTerm || [row.invoice_number, row.client_name].some((value) => String(value || '').toLowerCase().includes(searchTerm)))
  }, [data, start, end, clientFilter, searchTerm])

  const filteredCollections = useMemo(() => {
    return collections
      .filter((row) => isWithinRange(row.date || null, start, end))
      .filter((row) => (clientFilter === 'all' ? true : row.client_name === clientFilter))
      .filter((row) => !searchTerm || [row.invoice_number, row.client_name].some((value) => String(value || '').toLowerCase().includes(searchTerm)))
  }, [collections, start, end, clientFilter, searchTerm])

  const metrics = useMemo<Metric[]>(() => {
    const {
      vatChargedValue,
      expectedWhtExposureValue,
      actualWhtDeductedValue,
      vatLessActualWhtValue,
    } = computeReportTaxMetrics(filteredTaxInvoices, filteredCollections)

    return [
      { label: 'VAT Charged', value: formatMoney(vatChargedValue), tone: 'amber', icon: <Receipt className="h-4 w-4" /> },
      { label: 'Expected WHT Exposure', value: formatMoney(expectedWhtExposureValue), tone: 'blue', icon: <FileSpreadsheet className="h-4 w-4" /> },
      { label: 'Actual WHT Deducted', value: formatMoney(actualWhtDeductedValue), tone: 'green', icon: <Wallet className="h-4 w-4" /> },
      { label: 'VAT Less Actual WHT', value: formatMoney(vatLessActualWhtValue), tone: vatLessActualWhtValue >= 0 ? 'blue' : 'red', icon: <Banknote className="h-4 w-4" /> },
    ]
  }, [filteredTaxInvoices, filteredCollections])

  // ponytail: loading driven by parent prop

  const {
    vatChargedValue,
    expectedWhtExposureValue,
    actualWhtDeductedValue,
    vatLessActualWhtValue,
  } = useMemo(
    () => computeReportTaxMetrics(filteredTaxInvoices, filteredCollections),
    [filteredTaxInvoices, filteredCollections],
  )

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
        <Card className="border-amber-200 bg-card shadow-sm">
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
        <LoadingState label="tax data" />
      ) : (
        <div className="space-y-4">
          <ErrorBanner message={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-amber-200 bg-amber-50/50 shadow-sm transition hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-700">VAT Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900">{formatMoney(vatChargedValue)}</div>
                <p className="mt-1 text-[11px] text-muted-foreground">Total VAT charged on active invoices for this period.</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50 shadow-sm transition hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-700">Expected WHT Exposure</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900">{formatMoney(expectedWhtExposureValue)}</div>
                <p className="mt-1 text-[11px] text-muted-foreground">Total invoice-level WHT expected to be withheld in this period.</p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/50 shadow-sm transition hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-green-700">Actual WHT Deducted</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900">{formatMoney(actualWhtDeductedValue)}</div>
                <p className="mt-1 text-[11px] text-muted-foreground">Total payment-level WHT actually deducted from recorded collections in this period.</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-slate-50/50 shadow-sm transition hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">VAT Less Actual WHT</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-slate-900">{formatMoney(vatLessActualWhtValue)}</div>
                <p className="mt-1 text-[11px] text-muted-foreground">VAT charged on invoices minus WHT actually deducted from recorded payments.</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-blue-200 bg-blue-50/60 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 -translate-y-4 translate-x-4 opacity-5 group-hover:scale-110 transition-transform">
              <Receipt className="h-40 w-40" />
            </div>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 rounded-full h-2 w-2 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Compliance Operations</span>
              </div>
              <CardTitle className="text-lg font-black tracking-tight mt-1">Operational Compliance Hub</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed max-w-lg">
                Detailed VAT input tracking, WHT receipts workspace, and tax filing management have moved to the new Compliance Hub.
              </p>
              <Link to="/compliance" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-xl hover:bg-slate-800 transition transform hover:-translate-y-0.5 active:translate-y-0">
                Open Compliance Hub
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
          
          <Card className="border-slate-100 bg-slate-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <div className="text-xs text-muted-foreground font-medium">
                VAT less actual WHT for this period is <span className={vatLessActualWhtValue >= 0 ? "text-blue-700 font-bold" : "text-red-700 font-bold"}>{formatMoney(vatLessActualWhtValue)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
