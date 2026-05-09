import React from "react";
import { Plus, Edit3, Download, Share2, MoreHorizontal } from "lucide-react";
import styles from "./InvoiceWorkspace.module.css";

interface InvoiceActionRowProps {
  onRecordPayment: () => void;
  onEdit: () => void;
  onDownload: () => void;
  onShare: () => void;
  onMore: () => void;
  isPaid?: boolean;
}

export const InvoiceActionRow: React.FC<InvoiceActionRowProps> = ({
  onRecordPayment,
  onEdit,
  onDownload,
  onShare,
  onMore,
  isPaid,
}) => {
  return (
    <div className={styles.actionRow}>
      {!isPaid && (
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onRecordPayment}>
          <Plus size={18} />
          <span>Record Payment</span>
        </button>
      )}
      <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={onEdit}>
        <Edit3 size={18} />
        <span>Edit Invoice</span>
      </button>
      <button className={styles.btnPill} onClick={onDownload} title="Download">
        <Download size={17} />
      </button>
      <button className={styles.btnPill} onClick={onShare} title="Share">
        <Share2 size={17} />
      </button>
      <button className={styles.btnPill} onClick={onMore} title="More Actions">
        <MoreHorizontal size={17} />
      </button>
    </div>
  );
};
