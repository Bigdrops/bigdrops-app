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
    <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[hsl(var(--bd-text))]">{title}</h1>
          <p className="mt-1 text-xs text-[hsl(var(--bd-text-muted))]">{subtitle}</p>
        </div>
        <div className="rounded-full border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] p-2">
          <FileSpreadsheet className="h-4 w-4 text-[hsl(var(--bd-status-info-text))]" />
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
            <div key={metric.label} className={`min-w-[160px] rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-3.5 shadow-sm`}>
              <div className={`mb-2.5 flex h-8 w-8 items-center justify-center rounded-full shadow-sm ${tone.icon}`}>
                {metric.icon}
              </div>
              <div className={`text-xl font-black tracking-tight ${tone.value}`}>{metric.value}</div>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--bd-text-muted))]">{metric.label}</p>
            </div>
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
    <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-3 shadow-sm space-y-3">
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
                    ? 'h-8 rounded-full border border-[hsl(var(--bd-overlay-border))] bg-[hsl(var(--bd-overlay-bg))] px-3 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-overlay-text))] shadow-sm'
                    : 'h-8 rounded-full border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] px-3 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-border))] transition-colors'
                }
              >
                {chip.label}
              </button>
            )
          })}

          {showStatus ? (
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ReceivablesFilter)}>
              <SelectTrigger className="h-8 w-[120px] rounded-full border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--bd-text-muted))]">
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
            <SelectTrigger className="h-8 w-[160px] rounded-full border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--bd-text-muted))]">
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
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--bd-text-muted))] opacity-50" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search client, invoice or project..."
          className="h-9 rounded-lg border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] pl-9 text-xs"
        />
      </div>
    </div>
  )
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <SkeletonCard className="h-[64px] rounded-[var(--bd-radius-lg)] border-0 p-0 shadow-none bg-[hsl(var(--bd-surface-muted))]" />
        <SkeletonCard className="h-[64px] rounded-[var(--bd-radius-lg)] border-0 p-0 shadow-none bg-[hsl(var(--bd-surface-muted))]" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-3 py-2">
        <div className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))]">
          Syncing {label}
        </div>
        <CenteredSpinner />
      </div>
    </div>
  )
}

export function EmptyState({ title, description, tone }: { title: string; description: string; tone: 'red' | 'green' | 'blue' | 'amber' }) {
  const toneClasses =
    tone === 'red'
      ? 'border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))]'
      : tone === 'green'
        ? 'border-[hsl(var(--bd-status-success-border))] bg-[hsl(var(--bd-status-success-bg))]'
        : tone === 'amber'
          ? 'border-[hsl(var(--bd-status-warning-border))] bg-[hsl(var(--bd-status-warning-bg))]'
          : 'border-[hsl(var(--bd-status-info-border))] bg-[hsl(var(--bd-status-info-bg))]'

  return (
    <div className={`rounded-[var(--bd-radius-xl)] border p-8 shadow-sm text-center ${toneClasses}`}>
      <div className="text-sm font-bold text-[hsl(var(--bd-text))]">{title}</div>
      <div className="mt-1 text-xs text-[hsl(var(--bd-text-muted))]">{description}</div>
    </div>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] px-4 py-3 text-xs font-bold text-[hsl(var(--bd-status-danger-text))] shadow-sm">
      {message}
    </div>
  )
}
