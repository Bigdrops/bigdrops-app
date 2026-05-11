import React from "react";
import { ChevronDown } from "lucide-react";
import styles from "../InvoiceWorkspace.module.css";

interface DocumentOptionsCardProps {
  pdfOutput?: any;
  onOutputChange?: (settings: any) => void;
  onToggleMergeQtyUnit?: () => void;
  mergeQtyUnit?: boolean;
  onCustomize?: () => void;
}

export const DocumentOptionsCard: React.FC<DocumentOptionsCardProps> = () => {
  return (
    <div className={styles.card}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderLeft}>
          <span>Document Options</span>
        </div>
        <button
          className={styles.sectionChevron}
          aria-label="Toggle document options"
          type="button"
          onClick={(e) => e.stopPropagation()}
        >
          <ChevronDown size={14} />
        </button>
      </div>
    </div>
  );
};
