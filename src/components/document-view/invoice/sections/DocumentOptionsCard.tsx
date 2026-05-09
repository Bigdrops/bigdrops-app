import React, { useState } from "react";
import { ChevronDown, Settings } from "lucide-react";
import styles from "../InvoiceWorkspace.module.css";
import { PdfDocumentOptionsCard } from "@/components/PdfOutputSettings";

interface DocumentOptionsCardProps {
  pdfOutput: any;
  onOutputChange: (settings: any) => void;
  onToggleMergeQtyUnit: () => void;
  mergeQtyUnit: boolean;
  onCustomize: () => void;
}

export const DocumentOptionsCard: React.FC<DocumentOptionsCardProps> = ({
  pdfOutput,
  onOutputChange,
  onToggleMergeQtyUnit,
  mergeQtyUnit,
  onCustomize,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.card}>
      <div 
        className={styles.sectionHeader} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles.sectionHeaderLeft}>
          <Settings size={16} />
          <span>Export Options</span>
        </div>
        <div className={`${styles.sectionChevron} ${isOpen ? styles.sectionChevronOpen : ""}`}>
          <ChevronDown size={14} />
        </div>
      </div>

      {isOpen && (
        <div style={{ padding: "14px 18px" }}>
          <PdfDocumentOptionsCard 
            value={pdfOutput}
            onChange={onOutputChange}
          />
          <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "8px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
            <input 
              type="checkbox" 
              checked={mergeQtyUnit} 
              onChange={onToggleMergeQtyUnit}
              id="merge-qty-unit"
            />
            <label htmlFor="merge-qty-unit" style={{ fontSize: "13px", fontWeight: 500 }}>Merge Qty & Unit in PDF table</label>
          </div>
          <button 
            onClick={onCustomize}
            style={{ 
              marginTop: "16px", 
              width: "100%", 
              padding: "10px", 
              borderRadius: "8px", 
              border: "1px solid var(--border)",
              background: "white",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer"
            }}
          >
            Customize Template & Colors
          </button>
        </div>
      )}
    </div>
  );
};
