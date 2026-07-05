import React, { useMemo, useState } from "react";
import { ChevronDown, Receipt } from "lucide-react";
import { formatNaira } from "@/lib/formatters/money";
import { formatDisplayDate } from "@/lib/formatters/date";
import { buildPaymentSummaryProjection } from "@/domain/invoice/projections/financialProjection";

interface PaymentHistoryCardProps {
  payments: any[];
  invoiceTotal: number;
  viewModel: any;
  onRecordPayment: () => void;
  onVoidPayment: (id: string) => void;
}

export const PaymentHistoryCard: React.FC<PaymentHistoryCardProps> = ({
  payments,
  invoiceTotal,
  viewModel,
  onRecordPayment,
  onVoidPayment,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const paymentSummary = useMemo(
    () => buildPaymentSummaryProjection(invoiceTotal, payments || [], (v) => formatNaira(v)),
    [invoiceTotal, payments],
  );

  return (
    <div className="bg-bd-card-bg border border-bd-border rounded-2xl overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        style={{ background: 'hsl(var(--bd-accent) / 0.06)' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2" style={{ color: 'var(--bd-accent)' }}>
          <Receipt size={16} />
          <span className="text-sm font-bold">Payment History</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{ background: 'hsl(var(--bd-accent) / 0.12)', color: 'var(--bd-accent)' }}
            onClick={(e) => { e.stopPropagation(); onRecordPayment(); }}
          >
            Record
          </button>
          <ChevronDown
            size={14}
            className={`text-bd-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3 pt-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-bd-text-muted">Settled Total</span>
              <span className="font-mono font-bold text-bd-text-soft">
                {paymentSummary.settledTotalFormatted}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-bd-text-muted">Balance Due</span>
              <span className="font-mono font-bold text-bd-status-danger-text">
                {paymentSummary.balanceDueFormatted}
              </span>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[11px] text-bd-text-muted">
                <span>Payment Progress</span>
                <span className="font-semibold">{paymentSummary.paymentProgress}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-bd-border/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-bd-status-success-text to-emerald-400 transition-all"
                  style={{ width: `${paymentSummary.paymentProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            {payments.map((payment, index) => (
              <div
                key={payment.id || index}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-bd-surface-muted/60 hover:bg-bd-surface-muted transition-colors"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-bd-text truncate">
                    {payment.payment_method ? `${payment.payment_method} Payment` : "Payment Received"}
                  </span>
                  <span className="text-xs text-bd-text-muted truncate">
                    {formatDisplayDate(payment.payment_date)}
                    {payment.notes ? ` • ${payment.notes}` : ""}
                  </span>
                  {payment.voided_at && (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-bd-status-danger-text">
                      VOIDED
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0 ml-3">
                  <span className="font-mono font-bold text-sm text-bd-text">
                    {formatNaira(payment.cash_amount)}
                  </span>
                  {!payment.voided_at && (
                    <button
                      type="button"
                      className="text-[10px] font-semibold text-bd-status-danger-text hover:text-bd-status-danger-border transition-colors bg-transparent border-none cursor-pointer"
                      onClick={() => onVoidPayment(payment.id)}
                    >
                      Void
                    </button>
                  )}
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <div className="text-center py-6 text-sm text-bd-text-muted">
                No payments recorded yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
