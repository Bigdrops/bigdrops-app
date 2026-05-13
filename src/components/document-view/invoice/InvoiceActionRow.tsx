import React from "react";
import { ArrowDown, Edit3, Download } from "lucide-react";
import styles from "./InvoiceWorkspace.module.css";

interface InvoiceActionRowProps {
  onRecordPayment: () => void;
  onEdit: () => void;
  onDownload: () => void;
  isPaid?: boolean;
}

export const InvoiceActionRow: React.FC<InvoiceActionRowProps> = ({
  onRecordPayment,
  onEdit,
  onDownload,
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
      <button className={styles.btnPill} onClick={onDownload} title="Download">
        <Download size={17} />
      </button>
    </div>
  );
};
