import React, { useMemo, useState, useEffect } from "react";
import { ChevronDown, Receipt, FileText, Image, ExternalLink } from "lucide-react";
import { formatNaira } from "@/lib/formatters/money";
import { buildPaymentSummaryProjection } from "@/domain/invoice/projections/financialProjection";
import { buildPaymentHistoryRowViewModels, type AttachmentPreview } from "./paymentHistoryViewModel";
import { useEntity } from "@/lib/tenant/contexts";
import { useNavigate } from "react-router-dom";

interface PaymentHistoryCardProps {
  payments: any[];
  invoiceTotal: number;
  viewModel: any;
  invoiceId: string;
  onRecordPayment: () => void;
  onVoidPayment: (id: string) => void;
}

export const PaymentHistoryCard: React.FC<PaymentHistoryCardProps> = ({
  payments,
  invoiceTotal,
  viewModel,
  invoiceId,
  onRecordPayment,
  onVoidPayment,
}) => {
  const navigate = useNavigate();
  const { tenantClient } = useEntity();
  const [isOpen, setIsOpen] = useState(true);
  const [receiptsByPayment, setReceiptsByPayment] = useState<Record<string, { id: string; number: string }>>({});

  useEffect(() => {
    if (!invoiceId) return;
    tenantClient.from('receipts').select('id, receipt_number, payment_id').eq('invoice_id', invoiceId)
      .then(({ data }) => {
        const map: Record<string, { id: string; number: string }> = {};
        if (data) data.forEach(r => { map[r.payment_id] = { id: r.id, number: r.receipt_number } });
        setReceiptsByPayment(map);
      });
  }, [invoiceId, tenantClient]);

  const paymentSummary = useMemo(
    () => buildPaymentSummaryProjection(invoiceTotal, payments || [], (v) => formatNaira(v)),
    [invoiceTotal, payments],
  );

  const rowViewModels = useMemo(() => buildPaymentHistoryRowViewModels(payments || []), [payments]);

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
            {rowViewModels.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-bd-surface-muted/60 hover:bg-bd-surface-muted transition-colors"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-bd-text truncate">
                    {row.paymentMethodLabel}
                  </span>
                  <span className="text-xs text-bd-text-muted truncate">
                    {row.date}
                    {row.time && <> · {row.time}</>}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-bd-text-muted truncate">
                    {row.hasReference && <span>{row.reference}</span>}
                    {row.hasReference && row.hasNotes && <span>·</span>}
                    {row.hasNotes && <span>{row.notes}</span>}
                  </div>
                  {row.isVoided && (
                    <span className="text-[11px] font-bold uppercase tracking-wider text-bd-status-danger-text">
                      VOIDED
                    </span>
                  )}
                  {row.hasAttachments && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {row.attachmentPreviews.map((att: AttachmentPreview) =>
                        att.isImage ? (
                          <span
                            key={att.fileId}
                            title={att.fileName}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-md"
                            style={{ background: 'hsl(var(--bd-accent) / 0.1)' }}
                          >
                            <Image size={12} style={{ color: 'var(--bd-accent)' }} />
                          </span>
                        ) : (
                          <span
                            key={att.fileId}
                            title={att.fileName}
                            className="inline-flex items-center gap-1 text-[11px] truncate max-w-[140px]"
                            style={{ color: 'var(--bd-text-muted)' }}
                          >
                            <FileText size={12} />
                            <span className="truncate">{att.fileName}</span>
                          </span>
                        ),
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0 ml-3">
                  <span className="font-mono font-bold text-sm text-bd-text">
                    {row.formattedAmount}
                  </span>
                  {receiptsByPayment[row.id] && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-bd-accent hover:underline bg-transparent border-none cursor-pointer"
                      onClick={() => navigate(`/receipts/${receiptsByPayment[row.id].id}`)}
                    >
                      <ExternalLink size={10} />
                      Receipt #{receiptsByPayment[row.id].number}
                    </button>
                  )}
                  {!row.isVoided && (
                    <button
                      type="button"
                      className="text-[10px] font-semibold text-bd-status-danger-text hover:text-bd-status-danger-border transition-colors bg-transparent border-none cursor-pointer"
                      onClick={() => onVoidPayment(row.id)}
                    >
                      Void
                    </button>
                  )}
                </div>
              </div>
            ))}
            {rowViewModels.length === 0 && (
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
