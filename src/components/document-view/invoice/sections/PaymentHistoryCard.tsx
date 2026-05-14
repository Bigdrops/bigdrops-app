import React, { useMemo, useState } from "react";
import { ChevronDown, Receipt } from "lucide-react";
import styles from "../InvoiceWorkspace.module.css";
import previewStyles from "../../shared/DocumentPreview.module.css";
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
    <div className={styles.card}>
      <div 
        className={styles.sectionHeader} 
        onClick={() => setIsOpen(!isOpen)}
        style={{ background: 'hsl(var(--bd-accent) / 0.06)', cursor: "pointer", userSelect: "none" }}
      >
        <div className={styles.sectionHeaderLeft} style={{ color: "var(--bd-accent)" }}>
          <Receipt size={16} color="var(--bd-accent)" />
          <span>Payment History</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            className={styles.btnRecord}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onRecordPayment();
            }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onRecordPayment(); } }}
          >
            Record
          </span>
          <span className={`${styles.sectionChevron} ${isOpen ? styles.sectionChevronOpen : ""}`} aria-hidden="true">
            <ChevronDown size={14} />
          </span>
        </div>
      </div>

      {isOpen && (
        <>
          <div className={previewStyles.paymentBody}>
            <div className={previewStyles.payRow}>
              <span className={previewStyles.lbl}>Settled Total</span>
              <span className={previewStyles.val}>{paymentSummary.settledTotalFormatted}</span>
            </div>
            <div className={`${previewStyles.payRow} ${previewStyles.payRowDue}`}>
              <span className={previewStyles.lbl}>Balance Due</span>
              <span className={previewStyles.val}>{paymentSummary.balanceDueFormatted}</span>
            </div>
            
            <div className={previewStyles.progressBar}>
              <div className={previewStyles.progressLabel}>
                <span>Payment Progress</span>
                <span>{paymentSummary.paymentProgress}%</span>
              </div>
              <div className={previewStyles.progressTrack}>
                <div 
                  className={previewStyles.progressFill} 
                  style={{ width: `${paymentSummary.paymentProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className={styles.itemList}>
            {payments.map((payment, index) => (
              <div key={payment.id || index} className={styles.itemRow}>
                <div className={previewStyles.itemBody}>
                  <div className={previewStyles.itemName}>
                    {payment.payment_method ? `${payment.payment_method} Payment` : "Payment Received"}
                  </div>
                  <div className={previewStyles.itemSub}>
                    {formatDisplayDate(payment.payment_date)} • {payment.notes || "No notes"}
                  </div>
                  {payment.voided_at && (
                    <div className={previewStyles.itemPill} style={{ color: 'hsl(var(--bd-status-danger-text))', borderColor: 'hsl(var(--bd-status-danger-text))' }}>
                      VOIDED
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className={previewStyles.itemAmount}>{formatNaira(payment.cash_amount)}</div>
                  {!payment.voided_at && (
                    <button 
                      style={{ fontSize: "10px", color: 'hsl(var(--bd-status-danger-text))', background: "none", border: "none", cursor: "pointer", marginTop: "4px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onVoidPayment(payment.id);
                      }}
                    >
                      Void
                    </button>
                  )}
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <div className={styles.itemRow} style={{ justifyContent: "center", color: "hsl(var(--bd-text-muted))" }}>
                No payments recorded yet.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
