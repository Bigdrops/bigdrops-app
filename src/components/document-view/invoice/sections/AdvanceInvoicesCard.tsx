import React, { useState } from "react";
import { ChevronDown, Split } from "lucide-react";
import styles from "../InvoiceWorkspace.module.css";
import { formatNaira } from "@/lib/formatters/money";
import { formatDisplayDate } from "@/lib/formatters/date";

interface AdvanceInvoicesCardProps {
  advanceInvoices: any[];
  onCreateAdvance: () => void;
  onViewAdvance: (advance: any) => void;
}

export const AdvanceInvoicesCard: React.FC<AdvanceInvoicesCardProps> = ({
  advanceInvoices,
  onCreateAdvance,
  onViewAdvance,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={styles.card}>
      <div 
        className={styles.sectionHeader} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles.sectionHeaderLeft}>
          <Split size={16} />
          <span>Advance Invoices</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button 
            className={styles.btnRecord} 
            onClick={(e) => {
              e.stopPropagation();
              onCreateAdvance();
            }}
          >
            {advanceInvoices.length > 0 ? "Manage" : "Split"}
          </button>
          <div className={`${styles.sectionChevron} ${isOpen ? styles.sectionChevronOpen : ""}`}>
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className={styles.itemList}>
          {advanceInvoices.map((adv, index) => (
            <div 
              key={adv.id || index} 
              className={styles.advRow}
              onClick={() => onViewAdvance(adv)}
              style={{ cursor: "pointer" }}
            >
              <div className={styles.advLeft}>
                <div className={styles.num}>{adv.invoice_number}</div>
                <div className={styles.sub}>Issued {formatDisplayDate(adv.issue_date)} • {adv.status}</div>
              </div>
              <div className={styles.advRight}>
                <div className={styles.advAmount}>{formatNaira(adv.total)}</div>
              </div>
            </div>
          ))}
          {advanceInvoices.length === 0 && (
            <div className={styles.itemRow} style={{ justifyContent: "center", color: "var(--slate)", fontSize: "13px" }}>
              No advance invoices generated.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
