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
      {/* Single touch target — no nested interactive elements */}
      <div
        role="button"
        tabIndex={0}
        className={styles.sectionHeader}
        style={{ cursor: "pointer", userSelect: "none" }}
        onClick={() => setIsOpen((o) => !o)}
        onKeyDown={(e) => e.key === "Enter" && setIsOpen((o) => !o)}
        aria-expanded={isOpen}
      >
        <div className={styles.sectionHeaderLeft}>
          <span>Document Options</span>
        </div>
        <span
          className={`${styles.sectionChevron} ${isOpen ? styles.sectionChevronOpen : ""}`}
          aria-hidden="true"
        >
          <ChevronDown size={14} />
        </span>
      </div>
    </div>
  );
};
