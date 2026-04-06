import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { 
  Receipt, 
  Wallet, 
  Banknote, 
  AlertCircle,
  ArrowRight,
  ClipboardList
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNaira } from '@/lib/formatters/money'
import { formatDisplayDate } from '@/lib/formatters/date'
import { WhtReceipt, TaxInputEntry, TaxFiling } from '@/domain/compliance/types'

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

function MetricCard({ metric }: { metric: Metric }) {
  const tone = getMetricToneClasses(metric.tone)
  return (
    <Card className={`border shadow-sm ${tone.card}`}>
      <CardContent className="p-4">
        <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/70 shadow-sm ${tone.icon}`}>
          {metric.icon}
        </div>
        <div className={`text-2xl font-black tracking-tight ${tone.value}`}>{metric.value}</div>
        <p className="mt-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">{metric.label}</p>
      </CardContent>
    </Card>
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
  filings
}: ComplianceOverviewProps) {
  
  const recoverableVatTotal = taxInputs
    .filter(ti => ti.is_recoverable)
    .reduce((sum, ti) => sum + Number(ti.vat_amount || 0), 0)

  const nonRecoverableVatTotal = taxInputs
    .filter(ti => !ti.is_recoverable)
    .reduce((sum, ti) => sum + Number(ti.vat_amount || 0), 0)

  const netVatPosition = vatCharged - recoverableVatTotal

  const metrics: Metric[] = [
    { label: 'VAT Charged', value: formatNaira(vatCharged), tone: 'amber', icon: <Receipt className="h-5 w-5" /> },
    { label: 'Recoverable VAT', value: formatNaira(recoverableVatTotal), tone: 'green', icon: <Wallet className="h-5 w-5" /> },
    { label: 'Net VAT Position', value: formatNaira(netVatPosition), tone: netVatPosition >= 0 ? 'blue' : 'red', icon: <ClipboardList className="h-5 w-5" /> },
  ]

  const untrackedWHTCount = recentPayments.filter(p => 
    Number(p.wht_amount || 0) > 0 && !receipts.some(r => r.payment_id === p.id)
  ).length

  const requestedReceiptsCount = receipts.filter(r => r.receipt_status === 'requested').length

  const openFilingsCount = filings.filter(f => f.status === 'draft' || f.status === 'ready').length
  const overdueFilingsCount = filings.filter(f => f.status === 'overdue').length
  const paidFilingsCount = filings.filter(f => f.status === 'paid').length

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((m) => <MetricCard key={m.label} metric={m} />)}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Next Actions */}
        <Card className="border-blue-100 bg-blue-50/30">
          <CardHeader className="pb-3 border-b border-white/40">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              Next Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm hover:border-blue-300 transition-colors group">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    Initialize Tracking
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {untrackedWHTCount} WHT payments have not been initialized as tracking records yet.
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-blue-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm group">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800">Review Requested Receipts</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {requestedReceiptsCount} certificates are currently in "requested" status.
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm group">
              <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
                Input VAT Efficiency
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-lg font-bold text-slate-900">{taxInputs.length}</span>
                <span className="text-[10px] text-slate-500 uppercase font-black">Entries Captured</span>
              </div>
              {nonRecoverableVatTotal > 0 && (
                <div className="mt-1 text-[11px] text-amber-600 font-medium italic">
                  Note: {formatNaira(nonRecoverableVatTotal)} marked as non-recoverable
                </div>
              )}
            </div>

            {/* Filing summary */}
            <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <ClipboardList className="h-3.5 w-3.5 text-emerald-500" />
                Filing Records
              </div>
              <div className="mt-2 flex flex-wrap gap-4">
                <div>
                  <span className="text-lg font-bold text-slate-900">{openFilingsCount}</span>
                  <span className="ml-1 text-[10px] text-slate-500 uppercase font-black">Open</span>
                </div>
                <div>
                  <span className="text-lg font-bold text-emerald-700">{paidFilingsCount}</span>
                  <span className="ml-1 text-[10px] text-slate-500 uppercase font-black">Paid</span>
                </div>
                {overdueFilingsCount > 0 && (
                  <div>
                    <span className="text-lg font-bold text-red-600">{overdueFilingsCount}</span>
                    <span className="ml-1 text-[10px] text-slate-500 uppercase font-black">Overdue</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Tax Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Recent Tax Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentInvoices.length === 0 && recentPayments.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No recent tax activity found.
              </div>
            ) : (
              <div className="space-y-3">
                {recentInvoices.slice(0, 3).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">{inv.invoice_number}</span>
                      <span className="text-[11px] text-muted-foreground">{formatDisplayDate(inv.issue_date)} · VAT</span>
                    </div>
                    <span className="font-bold text-amber-600">+{formatNaira(inv.vat)}</span>
                  </div>
                ))}
                {recentPayments.slice(0, 2).map((pay) => (
                  <div key={pay.id} className="flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-700">{pay.invoice_number || 'Payment'}</span>
                      <span className="text-[11px] text-muted-foreground">{formatDisplayDate(pay.date)} · WHT</span>
                    </div>
                    <span className="font-bold text-red-600">-{formatNaira(pay.wht_amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
