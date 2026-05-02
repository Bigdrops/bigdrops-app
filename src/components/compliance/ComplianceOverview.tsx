import * as React from 'react'
import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { 
  Receipt, 
  Wallet, 
  Banknote, 
  AlertCircle,
  ArrowRight,
  ClipboardList,
  Bell
} from 'lucide-react'
import { formatNaira } from '@/lib/formatters/money'
import { formatDisplayDate } from '@/lib/formatters/date'
import { WhtReceipt, TaxInputEntry, TaxFiling, TaxReminder } from '@/domain/compliance/types'

type MetricTone = 'green' | 'red' | 'amber' | 'blue'

type Metric = {
  label: string
  value: string
  tone: MetricTone
  icon: ReactNode
}

interface ComplianceOverviewProps {
  vatCharged: number
  whtDeducted: number
  netPosition: number
  recentInvoices: any[]
  recentPayments: any[]
  receipts: WhtReceipt[]
  taxInputs: TaxInputEntry[]
  filings: TaxFiling[]
  reminders: TaxReminder[]
}

const getMetricToneClasses = (tone: MetricTone) => {
  switch (tone) {
    case 'green':
      return { card: 'bg-[hsl(var(--bd-status-success-bg))] border-[hsl(var(--bd-status-success-border))]', icon: 'bg-[hsl(var(--bd-status-success-text))] text-white', value: 'text-[hsl(var(--bd-status-success-text))]' }
    case 'red':
      return { card: 'bg-[hsl(var(--bd-status-danger-bg))] border-[hsl(var(--bd-status-danger-border))]', icon: 'bg-[hsl(var(--bd-status-danger-text))] text-white', value: 'text-[hsl(var(--bd-status-danger-text))]' }
    case 'amber':
      return { card: 'bg-[hsl(var(--bd-status-warning-bg))] border-[hsl(var(--bd-status-warning-border))]', icon: 'bg-[hsl(var(--bd-status-warning-text))] text-white', value: 'text-[hsl(var(--bd-status-warning-text))]' }
    default:
      return { card: 'bg-[hsl(var(--bd-status-info-bg))] border-[hsl(var(--bd-status-info-border))]', icon: 'bg-[hsl(var(--bd-status-info-text))] text-white', value: 'text-[hsl(var(--bd-status-info-text))]' }
  }
}

function MetricCard({ metric }: { metric: Metric }) {
  const tone = getMetricToneClasses(metric.tone)
  return (
    <div className={`rounded-[var(--bd-radius-lg)] border p-3.5 shadow-sm ${tone.card}`}>
      <div className={`mb-2.5 flex h-8 w-8 items-center justify-center rounded-full shadow-sm ${tone.icon}`}>
        {metric.icon}
      </div>
      <div className={`text-xl font-black tracking-tight ${tone.value}`}>{metric.value}</div>
      <p className="text-[10px] font-bold text-[hsl(var(--bd-text-muted))] uppercase tracking-wider">{metric.label}</p>
    </div>
  )
}

export default function ComplianceOverview({ 
  vatCharged, 
  whtDeducted, 
  netPosition,
  recentInvoices,
  recentPayments,
  receipts,
  taxInputs,
  filings,
  reminders
}: ComplianceOverviewProps) {
  
  const recoverableVatTotal = taxInputs
    .filter(ti => ti.is_recoverable)
    .reduce((sum, ti) => sum + Number(ti.vat_amount || 0), 0)

  const nonRecoverableVatTotal = taxInputs
    .filter(ti => !ti.is_recoverable)
    .reduce((sum, ti) => sum + Number(ti.vat_amount || 0), 0)

  const netVatPosition = vatCharged - recoverableVatTotal

  const metrics: Metric[] = [
    { label: 'VAT Charged', value: formatNaira(vatCharged), tone: 'amber', icon: <Receipt className="h-4 w-4" /> },
    { label: 'Recoverable VAT', value: formatNaira(recoverableVatTotal), tone: 'green', icon: <Wallet className="h-4 w-4" /> },
    { label: 'Net VAT Position', value: formatNaira(netVatPosition), tone: netVatPosition >= 0 ? 'blue' : 'red', icon: <ClipboardList className="h-4 w-4" /> },
  ]

  const untrackedWHTCount = recentPayments.filter(p => 
    Number(p.wht_amount || 0) > 0 && !receipts.some(r => r.payment_id === p.id)
  ).length

  const requestedReceiptsCount = receipts.filter(r => r.receipt_status === 'requested').length

  const openFilingsCount = filings.filter(f => f.status === 'draft' || f.status === 'ready').length
  const overdueFilingsCount = filings.filter(f => f.status === 'overdue').length
  const paidFilingsCount = filings.filter(f => f.status === 'paid').length

  const overdueRemindersCount = reminders.filter(r => r.status === 'overdue').length
  const upcomingRemindersCount = reminders.filter(r => r.status === 'upcoming' || r.status === 'due').length
  const nextReminder = reminders.find(r => r.status === 'upcoming' || r.status === 'due')

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((m) => <MetricCard key={m.label} metric={m} />)}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Next Actions */}
        <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] overflow-hidden">
          <div className="px-4 py-3 border-b border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))]">
            <h3 className="text-sm font-bold flex items-center gap-2 text-[hsl(var(--bd-text))]">
              <AlertCircle className="h-4 w-4 text-[hsl(var(--bd-status-info-text))]" />
              Next Actions
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {overdueRemindersCount > 0 ? (
              <div className="rounded-xl border border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] p-4 shadow-sm group">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-black text-[hsl(var(--bd-status-danger-text))] flex items-center gap-2 uppercase tracking-tight">
                      Attention Required
                    </div>
                    <div className="text-xs text-[hsl(var(--bd-status-danger-text))] mt-1 font-bold">
                      {overdueRemindersCount} overdue tax obligations need immediate resolution.
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[hsl(var(--bd-status-danger-text))] opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] p-4 shadow-sm hover:border-[hsl(var(--bd-status-info-border))] transition-colors group">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-bold text-[hsl(var(--bd-text))] flex items-center gap-2">
                      Initialize Tracking
                    </div>
                    <div className="text-xs text-[hsl(var(--bd-text-muted))] mt-1">
                      {untrackedWHTCount} WHT payments have not been initialized as tracking records yet.
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[hsl(var(--bd-status-info-text))] opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            )}

            {nextReminder ? (
              <div className="rounded-xl border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] p-4 shadow-sm group">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-bold text-[hsl(var(--bd-text))]">Next Due: {formatDisplayDate(nextReminder.due_date)}</div>
                    <div className="text-xs text-[hsl(var(--bd-text-muted))] mt-1 uppercase tracking-widest font-black">
                      {nextReminder.tax_type} Periodical 
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[hsl(var(--bd-text-muted))] group-hover:text-[hsl(var(--bd-status-info-text))] group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] p-4 shadow-sm group">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-bold text-[hsl(var(--bd-text))]">Review Requested Receipts</div>
                    <div className="text-xs text-[hsl(var(--bd-text-muted))] mt-1">
                      {requestedReceiptsCount} certificates are currently in "requested" status.
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[hsl(var(--bd-text-muted))] group-hover:text-[hsl(var(--bd-status-info-text))] group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            )}

            <div className="rounded-xl border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] p-4 shadow-sm group">
              <div className="text-sm font-bold text-[hsl(var(--bd-text))] flex items-center gap-2">
                <ClipboardList className="h-3.5 w-3.5 text-[hsl(var(--bd-text-muted))]" />
                Input VAT Efficiency
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-lg font-bold text-[hsl(var(--bd-text))]">{taxInputs.length}</span>
                <span className="text-[10px] text-[hsl(var(--bd-text-muted))] uppercase font-black">Entries Captured</span>
              </div>
              {nonRecoverableVatTotal > 0 && (
                <div className="mt-1 text-[11px] text-[hsl(var(--bd-status-warning-text))] font-medium italic">
                  Note: {formatNaira(nonRecoverableVatTotal)} marked as non-recoverable
                </div>
              )}
            </div>

            {/* Filing summary */}
            <div className="rounded-xl border border-[hsl(var(--bd-status-success-border))] bg-[hsl(var(--bd-surface))] p-4 shadow-sm">
              <div className="text-sm font-bold text-[hsl(var(--bd-text))] flex items-center gap-2">
                <ClipboardList className="h-3.5 w-3.5 text-[hsl(var(--bd-status-success-text))]" />
                Filing Health
              </div>
              <div className="mt-2 flex flex-wrap gap-4">
                <div>
                  <span className="text-lg font-bold text-[hsl(var(--bd-text))]">{openFilingsCount}</span>
                  <span className="ml-1 text-[10px] text-[hsl(var(--bd-text-muted))] uppercase font-black">Drafts</span>
                </div>
                <div>
                  <span className="text-lg font-bold text-[hsl(var(--bd-status-success-text))]">{paidFilingsCount}</span>
                  <span className="ml-1 text-[10px] text-[hsl(var(--bd-text-muted))] uppercase font-black">Settled</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[hsl(var(--bd-status-info-border))] bg-[hsl(var(--bd-surface))] p-4 shadow-sm">
              <div className="text-sm font-bold text-[hsl(var(--bd-text))] flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-[hsl(var(--bd-status-info-text))]" />
                Next Obligations
              </div>
              <div className="mt-2 flex flex-wrap gap-4">
                <div>
                  <span className="text-lg font-bold text-[hsl(var(--bd-status-info-text))]">{upcomingRemindersCount}</span>
                  <span className="ml-1 text-[10px] text-[hsl(var(--bd-text-muted))] uppercase font-black">Upcoming</span>
                </div>
                {overdueRemindersCount > 0 && (
                  <div>
                    <span className="text-lg font-bold text-[hsl(var(--bd-status-danger-text))]">{overdueRemindersCount}</span>
                    <span className="ml-1 text-[10px] text-[hsl(var(--bd-text-muted))] uppercase font-black">Overdue</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Tax Activity */}
        <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] overflow-hidden">
          <div className="px-4 py-3 border-b border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))]">
            <h3 className="text-sm font-bold text-[hsl(var(--bd-text))]">Recent Tax Activity</h3>
          </div>
          <div className="p-4 space-y-4">
            {recentInvoices.length === 0 && recentPayments.length === 0 ? (
              <div className="text-center py-6 text-xs text-[hsl(var(--bd-text-muted))] italic">
                No recent tax activity found.
              </div>
            ) : (
              <div className="space-y-4">
                {recentInvoices.slice(0, 3).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-[hsl(var(--bd-text))]">{inv.invoice_number}</span>
                      <span className="text-[10px] font-medium text-[hsl(var(--bd-text-muted))] uppercase tracking-wider">{formatDisplayDate(inv.issue_date)} · VAT</span>
                    </div>
                    <span className="font-black text-[hsl(var(--bd-status-warning-text))]">+{formatNaira(inv.vat)}</span>
                  </div>
                ))}
                {recentPayments.slice(0, 2).map((pay) => (
                  <div key={pay.id} className="flex items-center justify-between text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-[hsl(var(--bd-text))]">{pay.invoice_number || 'Payment'}</span>
                      <span className="text-[10px] font-medium text-[hsl(var(--bd-text-muted))] uppercase tracking-wider">{formatDisplayDate(pay.date)} · WHT</span>
                    </div>
                    <span className="font-black text-[hsl(var(--bd-status-danger-text))]">-{formatNaira(pay.wht_amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
