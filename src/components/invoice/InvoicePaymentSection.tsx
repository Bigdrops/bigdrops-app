import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DocumentSection } from '@/components/document/DocumentViewShell'

type PaymentHistoryItem = {
  id: string | number
  date?: string | null
  method?: string | null
  reference?: string | null
  voided_at?: string | null
  total: number
  runningBalance: number
}

type InvoicePaymentSectionProps = {
  variant?: 'simple' | 'detailed'
  paymentHistory: PaymentHistoryItem[]
  formatMoney: (value: number) => string
  formatDate: (value?: string | null) => string
  isAdmin: boolean
  voidingPaymentId: string | number | null
  onVoidPayment: (paymentId: string | number) => void
  onRecordPayment?: () => void
  showRecordPaymentButton?: boolean
  invoiceTotal?: number
  cashReceived?: number
  balanceDue?: number
  computedStatus?: string
  statusBadgeClass?: string
}

export default function InvoicePaymentSection({
  variant = 'simple',
  paymentHistory,
  formatMoney,
  formatDate,
  isAdmin,
  voidingPaymentId,
  onVoidPayment,
  onRecordPayment,
  showRecordPaymentButton = false,
  invoiceTotal = 0,
  cashReceived = 0,
  balanceDue = 0,
  computedStatus = '',
  statusBadgeClass = '',
}: InvoicePaymentSectionProps) {
  if (variant === 'detailed') {
    return (
      <Card className="mb-6 border-border shadow-none">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted/50 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Invoice Total</div>
              <div className="mt-1 text-sm font-bold text-foreground">{formatMoney(invoiceTotal)}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/50 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cash Received</div>
              <div className="mt-1 text-sm font-bold text-foreground">{formatMoney(cashReceived)}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/50 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Balance Due</div>
              <div className={`mt-1 text-sm font-bold ${balanceDue > 0 ? 'text-[hsl(var(--bd-status-danger-text))]' : 'text-[hsl(var(--bd-status-success-text))]'}`}>{formatMoney(balanceDue)}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/50 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Status</div>
              <div className="mt-2">
                <Badge className={`capitalize ${statusBadgeClass}`}>{String(computedStatus).replace(/_/g, ' ')}</Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">Payment History</div>
              <div className="text-xs text-muted-foreground">Running balance reflects non-voided settlements in date order.</div>
            </div>
            {showRecordPaymentButton && onRecordPayment ? (
              <Button type="button" size="sm" className="bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))] hover:brightness-110" onClick={onRecordPayment}>
                Record Payment
              </Button>
            ) : null}
          </div>

          {paymentHistory.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/50 px-4 py-6 text-sm text-muted-foreground">
              No payments recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Settlement</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory.map((payment) => {
                    const rowClassName = payment.voided_at ? 'line-through text-slate-400' : ''
                    return (
                      <TableRow key={payment.id}>
                        <TableCell className={rowClassName}>
                          <div className="flex items-center gap-2">
                            <span>{formatDate(payment.date)}</span>
                            {payment.voided_at ? <Badge variant="outline">Voided</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell className={rowClassName}>{payment.method || '-'}</TableCell>
                        <TableCell className={rowClassName}>{payment.reference || '-'}</TableCell>
                        <TableCell className={`text-right ${rowClassName}`}>{formatMoney(payment.total)}</TableCell>
                        <TableCell className={`text-right font-semibold ${rowClassName}`}>{formatMoney(payment.total)}</TableCell>
                        <TableCell className={`text-right font-semibold ${payment.runningBalance > 0 ? 'text-[hsl(var(--bd-status-danger-text))]' : 'text-[hsl(var(--bd-status-success-text))]'} ${rowClassName}`}>
                          {formatMoney(payment.runningBalance)}
                        </TableCell>
                        <TableCell className="text-right">
                          {isAdmin && !payment.voided_at ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onVoidPayment(payment.id)}
                              loading={voidingPaymentId === payment.id}
                            >
                              Void
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <DocumentSection title="Payment History">
      <Card className="rounded-[24px] border-border shadow-sm">
        <CardContent className="space-y-3 p-4">
          {paymentHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
              No payments recorded yet.
            </div>
          ) : (
            paymentHistory.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                <div className={payment.voided_at ? 'line-through text-slate-400' : ''}>
                  <div className="text-sm font-bold text-foreground">{formatMoney(payment.total)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(payment.date)} · {payment.method || 'Payment'}
                    {payment.reference ? ` · ${payment.reference}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-xs font-bold ${payment.runningBalance > 0 ? 'text-[hsl(var(--bd-status-danger-text))]' : 'text-[hsl(var(--bd-status-success-text))]'} ${payment.voided_at ? 'line-through opacity-40' : ''}`}>
                    {formatMoney(payment.runningBalance)}
                  </div>
                  {isAdmin && !payment.voided_at ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => onVoidPayment(payment.id)} loading={voidingPaymentId === payment.id}>
                      Void
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </DocumentSection>
  )
}
