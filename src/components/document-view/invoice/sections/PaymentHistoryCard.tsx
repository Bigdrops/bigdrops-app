import React, { useState } from "react";
import { ChevronDown, Receipt } from "lucide-react";
import styles from "../InvoiceWorkspace.module.css";
import { formatNaira } from "@/lib/formatters/money";
import { formatDisplayDate } from "@/lib/formatters/date";

interface PaymentHistoryCardProps {
  payments: any[];
  viewModel: any;
  onRecordPayment: () => void;
  onVoidPayment: (id: string) => void;
}

export const PaymentHistoryCard: React.FC<PaymentHistoryCardProps> = ({
  payments,
  viewModel,
  onRecordPayment,
  onVoidPayment,
}) => {
  const [isOpen, setIsOpen] = useState(true);

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
          <div className={styles.paymentBody}>
            <div className={styles.payRow}>
              <span className={styles.lbl}>Settled Total</span>
              <span className={styles.val}>{formatNaira(viewModel?.settledTotal || 0)}</span>
            </div>
            <div className={`${styles.payRow} ${styles.payRowDue}`}>
              <span className={styles.lbl}>Balance Due</span>
              <span className={styles.val}>{formatNaira(viewModel?.balanceDue || 0)}</span>
            </div>
            
            <div className={styles.progressBar}>
              <div className={styles.progressLabel}>
                <span>Payment Progress</span>
                <span>{viewModel?.paymentProgress || 0}%</span>
              </div>
              <div className={styles.progressTrack}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${viewModel?.paymentProgress || 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className={styles.itemList}>
            {payments.map((payment, index) => (
              <div key={payment.id || index} className={styles.itemRow}>
                <div className={styles.itemBody}>
                  <div className={styles.itemName}>
                    {payment.payment_method ? `${payment.payment_method} Payment` : "Payment Received"}
                  </div>
                  <div className={styles.itemSub}>
                    {formatDisplayDate(payment.payment_date)} • {payment.notes || "No notes"}
                  </div>
                  {payment.voided_at && (
                    <div className={styles.itemPill} style={{ color: 'hsl(var(--bd-status-danger-text))', borderColor: 'hsl(var(--bd-status-danger-text))' }}>
                      VOIDED
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className={styles.itemAmount}>{formatNaira(payment.cash_amount)}</div>
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
