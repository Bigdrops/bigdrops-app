import React from "react";
import { ArrowDown, Edit3 } from "lucide-react";
import styles from "./InvoiceWorkspace.module.css";

interface InvoiceActionRowProps {
  onRecordPayment: () => void;
  onEdit: () => void;
  isPaid?: boolean;
}

export const InvoiceActionRow: React.FC<InvoiceActionRowProps> = ({
  onRecordPayment,
  onEdit,
  isPaid,
}) => {
  return (
    <div className={styles.actionRow}>
      {!isPaid && (
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={onRecordPayment}
        >
          <ArrowDown size={14} />
          <span>Record Payment</span>
        </button>
      )}
      <button
        className={`${styles.btn} ${styles.btnSecondary}`}
        onClick={onEdit}
      >
        <Edit3 size={14} />
        <span>Edit</span>
      </button>
    </div>
  );
};
