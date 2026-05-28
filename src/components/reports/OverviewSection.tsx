import { AlertTriangle, Banknote, BriefcaseBusiness, Receipt } from 'lucide-react'
import { ReportsMetricStrip } from './ReportsMetricStrip'
import { EmptyState, ErrorBanner } from './ReportShared'
import { OverviewSummary } from './reportTypes'

type OverviewTaxSummary = OverviewSummary & {
  expectedWhtExposure: string
  actualWhtDeducted: string
  vatLessActualWht: string
}

interface OverviewSectionProps {
  isActive: boolean
  isLoading: boolean
  summary: OverviewTaxSummary
}

const panelToneClasses = {
  info: {
    text: 'text-bd-status-info-text',
    border: 'border-bd-status-info-border',
    bg: 'bg-bd-status-info-bg',
  },
  warning: {
    text: 'text-bd-status-warning-text',
    border: 'border-bd-status-warning-border',
    bg: 'bg-bd-status-warning-bg',
  },
  danger: {
    text: 'text-bd-status-danger-text',
    border: 'border-bd-status-danger-border',
    bg: 'bg-bd-status-danger-bg',
  },
} as const

function OverviewLoadingState() {
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-2 rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-card-bg p-6">
          <div className="h-3 w-28 rounded-full bg-bd-surface-muted" />
          <div className="mt-4 h-12 w-48 rounded-[var(--bd-radius-lg)] bg-bd-surface-muted" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="h-16 rounded-[var(--bd-radius-lg)] bg-bd-surface-muted" />
            <div className="h-16 rounded-[var(--bd-radius-lg)] bg-bd-surface-muted" />
          </div>
        </div>
        <div className="h-[188px] rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-card-bg p-5">
          <div className="h-full rounded-[var(--bd-radius-lg)] bg-bd-surface-muted" />
        </div>
        <div className="h-[188px] rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-card-bg p-5">
          <div className="h-full rounded-[var(--bd-radius-lg)] bg-bd-surface-muted" />
        </div>
      </section>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-[104px] rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-card-bg p-4">
            <div className="h-full rounded-[var(--bd-radius-lg)] bg-bd-surface-muted" />
          </div>
        ))}
      </section>
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8 rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-card-bg p-5">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 rounded-[var(--bd-radius-lg)] bg-bd-surface-muted" />
            ))}
          </div>
        </div>
        <div className="xl:col-span-4 space-y-4">
          <div className="h-[220px] rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-card-bg p-5">
            <div className="h-full rounded-[var(--bd-radius-lg)] bg-bd-surface-muted" />
          </div>
          <div className="h-[144px] rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-card-bg p-5">
            <div className="h-full rounded-[var(--bd-radius-lg)] bg-bd-surface-muted" />
          </div>
        </div>
      </section>
    </div>
  )
}

export function OverviewSection({ isActive, isLoading, summary }: OverviewSectionProps) {
  if (!isActive) return null

  if (isLoading) {
    return <OverviewLoadingState />
  }

  const compactMetrics = [
    {
      label: 'Open Invoices',
      value: String(summary.outstandingInvoices),
      description: 'Invoices with balance due in the selected scope.',
      tone: 'blue' as const,
    },
    {
      label: 'Past Due Invoices',
      value: String(summary.pastDueCount),
      description: 'Invoices already beyond due date.',
      tone: summary.pastDueCount > 0 ? ('red' as const) : ('blue' as const),
    },
    {
      label: 'Projects Carrying Balance',
      value: String(summary.projectsWithOutstanding),
      description: 'Projects still holding outstanding receivables.',
      tone: summary.projectsWithOutstanding > 0 ? ('amber' as const) : ('blue' as const),
    },
    {
      label: 'Payments Logged',
      value: String(summary.collectionCount),
      description: 'Collections captured in the selected period.',
      tone: summary.collectionCount > 0 ? ('green' as const) : ('blue' as const),
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {summary.errors.map((message) => (
        <ErrorBanner key={message} message={message} />
      ))}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-2 rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg p-6">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-bd-text-muted">
            <Receipt className="h-4 w-4 text-bd-status-info-text" />
            Total Exposure
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div className="text-4xl font-black tracking-tight text-bd-text lg:text-5xl">
              {summary.totalExposure}
            </div>
            <div className="rounded-full border border-bd-status-info-border bg-bd-status-info-bg px-3 py-1 text-[10px] font-black uppercase tracking-widest text-bd-status-info-text">
              {summary.outstandingInvoices} open invoices
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-bd-text-muted">Past Due Share</div>
              <div className="mt-2 text-2xl font-black text-bd-status-danger-text">{summary.pastDueAmount}</div>
              <div className="mt-1 text-xs text-bd-text-muted">{summary.pastDuePercent}% of exposure</div>
            </div>
            <div className="rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-bd-text-muted">Collected</div>
              <div className="mt-2 text-2xl font-black text-bd-status-success-text">{summary.collectedAmount}</div>
              <div className="mt-1 text-xs text-bd-text-muted">{summary.collectionCount} payment entries matched this view</div>
            </div>
          </div>
        </div>

        <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg p-5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-bd-text-muted">
            <AlertTriangle className="h-4 w-4 text-bd-status-danger-text" />
            Past Due
          </div>
          <div className="mt-4 text-3xl font-black text-bd-status-danger-text">{summary.pastDueAmount}</div>
          <div className="mt-2 text-xs text-bd-text-muted">
            {summary.pastDueCount} invoices are currently overdue in this range.
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-bd-surface-muted">
            <div
              className="h-full rounded-full bg-bd-status-danger-border"
              style={{ width: `${Math.max(0, Math.min(summary.pastDuePercent, 100))}%` }}
            />
          </div>
        </div>

        <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg p-5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-bd-text-muted">
            <Banknote className="h-4 w-4 text-bd-status-success-text" />
            VAT Less Actual WHT
          </div>
          {summary.unsupported.tax ? (
            <div className="mt-4 rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface p-4 text-sm text-bd-text-muted">
              Tax position is unavailable for this selection.
            </div>
          ) : (
            <>
              <div className="mt-4 text-3xl font-black text-bd-text">{summary.vatLessActualWht}</div>
              <div className="mt-2 text-xs text-bd-text-muted">
                VAT charged on invoices minus WHT actually deducted from recorded payments.
              </div>
              <div className="mt-3 grid gap-3">
                <div className="rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface p-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-bd-text-muted">VAT Charged</div>
                  <div className="mt-1 text-sm font-bold text-bd-text">{summary.vatCharged}</div>
                </div>
                <div className="rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface p-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-bd-text-muted">Expected WHT Exposure</div>
                  <div className="mt-1 text-sm font-bold text-bd-text">{summary.expectedWhtExposure}</div>
                </div>
                <div className="rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface p-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-bd-text-muted">Actual WHT Deducted</div>
                  <div className="mt-1 text-sm font-bold text-bd-text">{summary.actualWhtDeducted}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <ReportsMetricStrip compactMetrics={compactMetrics} />

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8 rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[hsl(var(--bd-border)/0.5)] px-5 py-4">
            <div>
              <h2 className="text-sm font-black text-bd-text">High-Risk Receivables</h2>
              <p className="mt-1 text-xs text-bd-text-muted">Sorted by overdue severity and balance due.</p>
            </div>
            <div className="rounded-full border border-bd-status-danger-border bg-bd-status-danger-bg px-3 py-1 text-[10px] font-black uppercase tracking-widest text-bd-status-danger-text">
              {summary.highRiskReceivables.length} flagged
            </div>
          </div>

          {summary.highRiskReceivables.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No high-risk receivables"
                description="There are no overdue or balance-heavy invoices in the current selection."
                tone="blue"
              />
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[hsl(var(--bd-border)/0.5)] bg-bd-surface-muted">
                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-bd-text-muted">Client</th>
                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-bd-text-muted">Invoice</th>
                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-bd-text-muted">Aging</th>
                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-bd-text-muted">Due Date</th>
                      <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-widest text-bd-text-muted">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.highRiskReceivables.map((row) => {
                      const tone = panelToneClasses[row.tone]
                      return (
                        <tr key={row.id} className="border-b border-[hsl(var(--bd-border)/0.5)] last:border-b-0">
                          <td className="px-5 py-4">
                            <div className="font-bold text-bd-text">{row.client}</div>
                            <div className="mt-1 text-xs text-bd-text-muted">{row.statusLabel}</div>
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-bd-text">{row.invoiceNumber}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${tone.border} ${tone.bg} ${tone.text}`}>
                              {row.agingLabel}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-bd-text-muted">{row.dueDate}</td>
                          <td className="px-5 py-4 text-right text-sm font-black text-bd-text">{row.amount}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 p-4 md:hidden">
                {summary.highRiskReceivables.map((row) => {
                  const tone = panelToneClasses[row.tone]
                  return (
                    <div key={row.id} className="rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-bd-text">{row.client}</div>
                          <div className="mt-1 text-xs text-bd-text-muted">{row.invoiceNumber}</div>
                        </div>
                        <div className="text-right text-sm font-black text-bd-text">{row.amount}</div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${tone.border} ${tone.bg} ${tone.text}`}>
                          {row.agingLabel}
                        </span>
                        <span className="text-xs text-bd-text-muted">{row.statusLabel}</span>
                      </div>
                      <div className="mt-3 text-xs text-bd-text-muted">Due {row.dueDate}</div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div className="xl:col-span-4 space-y-4">
          <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg p-5">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-bd-text-muted">
              <Receipt className="h-4 w-4 text-bd-status-warning-text" />
              Aging Buckets
            </div>
            <div className="mt-4 space-y-4">
              {summary.agingBuckets.map((bucket) => {
                const tone = panelToneClasses[bucket.tone]
                return (
                  <div key={bucket.key}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-bd-text">{bucket.label}</div>
                        <div className="mt-1 text-xs text-bd-text-muted">{bucket.invoiceCount} invoices</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-bd-text">{bucket.amount}</div>
                        <div className="mt-1 text-xs text-bd-text-muted">{bucket.percent}% of exposure</div>
                      </div>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-bd-surface-muted">
                      <div className={`h-full rounded-full ${tone.bg}`} style={{ width: `${Math.max(bucket.percent, bucket.invoiceCount > 0 ? 6 : 0)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg p-5">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-bd-text-muted">
              <BriefcaseBusiness className="h-4 w-4 text-bd-status-info-text" />
              Coverage
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-bd-text-muted">Projects with outstanding balance</span>
                  <span className="text-lg font-black text-bd-text">{summary.projectsWithOutstanding}</span>
                </div>
              </div>
              <div className="rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-bd-text-muted">Payments logged in range</span>
                  <span className="text-lg font-black text-bd-text">{summary.collectionCount}</span>
                </div>
              </div>
              <div className="rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-bd-text-muted">Invoices with balance due</span>
                  <span className="text-lg font-black text-bd-text">{summary.outstandingInvoices}</span>
                </div>
              </div>
              <div className="rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-bd-text-muted">Actual WHT deducted on payments</span>
                  <span className="text-lg font-black text-bd-text">{summary.actualWhtDeducted}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
