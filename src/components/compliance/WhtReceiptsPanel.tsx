import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatNaira } from '@/lib/formatters/money'
import { formatDisplayDate } from '@/lib/formatters/date'
import { FileText, ReceiptIcon } from 'lucide-react'

interface WhtReceiptsPanelProps {
  payments: any[]
  loading: boolean
}

export default function WhtReceiptsPanel({ payments, loading }: WhtReceiptsPanelProps) {
  const whtPayments = payments.filter(p => Number(p.wht_amount || 0) > 0)

  if (loading) {
    return (
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="p-6 text-sm text-muted-foreground">Loading WHT records...</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-red-100 bg-red-50/20">
        <CardHeader className="pb-3 border-b border-red-50">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ReceiptIcon className="h-4 w-4 text-red-600" />
            WHT Deductions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {whtPayments.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
              <div className="text-sm font-bold text-slate-800">No WHT recorded</div>
              <div className="text-xs text-muted-foreground mt-1">No payments with WHT deductions have been recorded yet.</div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {whtPayments.map((p) => (
                <div key={p.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-red-200 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="text-sm font-bold text-slate-800">
                        {p.invoice_id ? (
                          <Link to={`/invoices/${p.invoice_id}`} className="hover:text-blue-700 hover:underline">
                            {p.invoice_number || '—'}
                          </Link>
                        ) : (
                          p.invoice_number || '—'
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{p.client_name || '—'}</div>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold uppercase rounded-full">
                      Needs Receipt
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">WHT Amount</div>
                      <div className="text-base font-black text-red-600">{formatNaira(p.wht_amount)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Payment Date</div>
                      <div className="text-sm font-semibold">{formatDisplayDate(p.date)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-100 bg-slate-50/50">
        <CardContent className="p-4 flex items-center gap-3">
          <FileText className="h-5 w-5 text-slate-400" />
          <div className="text-xs text-muted-foreground">
            <span className="font-bold text-slate-700">Tip:</span> Ensure you collect and store WHT Credit Notes for all payments listed above to offset against your future CIT liabilities.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
