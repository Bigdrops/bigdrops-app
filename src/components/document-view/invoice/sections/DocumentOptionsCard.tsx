import React, { useState } from "react";
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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.card}>
      <div
        className={styles.sectionHeader}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles.sectionHeaderLeft}>
          <span>Document Options</span>
        </div>
        <button
          className={`${styles.sectionChevron} ${isOpen ? styles.sectionChevronOpen : ""}`}
          aria-label="Toggle document options"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          <ChevronDown size={14} />
        </button>
      </div>
    </div>
  );
};
