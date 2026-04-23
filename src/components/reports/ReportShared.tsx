import { FileSpreadsheet, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { CenteredSpinner, SkeletonCard } from '@/components/loading/AppLoadingStates'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Metric, DatePreset, ReceivablesFilter } from './reportTypes'
import { getMetricToneClasses } from './reportUtils'

export const dateChips: Array<{ label: string; value: DatePreset }> = [
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Quarter', value: 'this_quarter' },
  { label: 'Custom', value: 'custom' },
]

export function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
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

export function MetricStrip({ metrics }: { metrics: Metric[] }) {
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

export function Filters({
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
                  <SelectItem value="past_due">Past Due</SelectItem>
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

export function LoadingState({ label }: { label: string }) {
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="space-y-3 p-6">
        <SkeletonCard className="h-[72px] rounded-2xl border-0 p-0 shadow-none" />
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Syncing {label}</div>
        <CenteredSpinner />
      </CardContent>
    </Card>
  )
}

export function EmptyState({ title, description, tone }: { title: string; description: string; tone: 'red' | 'green' | 'blue' | 'amber' }) {
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

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null
  return <div className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-medium text-white shadow-sm">{message}</div>
}
