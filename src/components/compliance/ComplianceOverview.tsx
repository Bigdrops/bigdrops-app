import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { 
  Receipt, 
  Wallet, 
  Banknote, 
  AlertCircle,
  ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNaira } from '@/lib/formatters/money'
import { formatDisplayDate } from '@/lib/formatters/date'

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
  recentPayments
}: ComplianceOverviewProps) {
  
  const metrics: Metric[] = [
    { label: 'VAT Charged', value: formatNaira(vatCharged), tone: 'amber', icon: <Receipt className="h-5 w-5" /> },
    { label: 'WHT Deducted', value: formatNaira(whtDeducted), tone: 'red', icon: <Banknote className="h-5 w-5" /> },
    { label: 'Net Position', value: formatNaira(netPosition), tone: netPosition >= 0 ? 'blue' : 'red', icon: <Wallet className="h-5 w-5" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((m) => <MetricCard key={m.label} metric={m} />)}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Next Actions */}
        <Card className="border-blue-100 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              Next Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm hover:border-blue-300 transition-colors cursor-pointer group">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800">Verify WHT Receipts</div>
                  <div className="text-xs text-slate-500 mt-1">Found {recentPayments.length} payments needing receipt uploads.</div>
                </div>
                <ArrowRight className="h-4 w-4 text-blue-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm opacity-60">
              <div className="text-sm font-semibold text-slate-800">Filing Deadline</div>
              <div className="text-xs text-slate-500 mt-1">VAT filing for last month is due in 12 days.</div>
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
