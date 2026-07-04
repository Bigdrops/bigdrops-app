import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BriefcaseBusiness, FileSpreadsheet, Receipt, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DatePreset,
  Metric,
  ProjectFinancialRow,
  ReceivablesFilter,
} from './reportTypes'
import {
  formatMoney,
  getLeftBorderClass,
  getStatusClass,
} from './reportUtils'
import { EmptyState, ErrorBanner, Filters, LoadingState, MetricStrip } from './ReportShared'

type Props = {
  isActive: boolean
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
  data: ProjectFinancialRow[]
  error?: string
  isLoading: boolean
}

export function ProjectsSection({
  isActive,
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
    return Array.from(allClients).sort((a, b) => a.localeCompare(b))
  }, [data])

  const filtered = useMemo(() => {
    return data
      .filter((row) => (clientFilter === 'all' ? true : row.client_name === clientFilter))
      .filter((row) => !searchTerm || [row.project_name, row.name, row.client_name].some((value) => String(value || '').toLowerCase().includes(searchTerm)))
  }, [data, clientFilter, searchTerm])

  const metrics = useMemo<Metric[]>(() => {
    const totalInvoiced = filtered.reduce((sum, row) => sum + Number(row.total_invoiced || 0), 0)
    const collected = filtered.reduce((sum, row) => sum + Number(row.cash_collected || 0), 0)
    const outstanding = filtered.reduce((sum, row) => sum + Number(row.outstanding || 0), 0)
    return [
      { label: 'Total Invoiced', value: formatMoney(totalInvoiced), tone: 'blue', icon: <BriefcaseBusiness className="h-4 w-4" /> },
      { label: 'Collected', value: formatMoney(collected), tone: 'green', icon: <Wallet className="h-4 w-4" /> },
      { label: 'Outstanding', value: formatMoney(outstanding), tone: 'red', icon: <Receipt className="h-4 w-4" /> },
      { label: 'Projects', value: String(filtered.length), tone: 'blue', icon: <FileSpreadsheet className="h-4 w-4" /> },
    ]
  }, [filtered])

  // ponytail: loading driven by parent prop

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
      
      {isLoading ? (
        <LoadingState label="projects" />
      ) : (
        <div className="space-y-4">
          <ErrorBanner message={error} />
          {filtered.length === 0 ? (
            <EmptyState title="No projects found" description="Try another client filter or search term." tone="blue" />
          ) : (
            <Card className="border-blue-200 bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground">Project Financial Summaries</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {filtered.map((row) => (
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
      )}
    </div>
  )
}
