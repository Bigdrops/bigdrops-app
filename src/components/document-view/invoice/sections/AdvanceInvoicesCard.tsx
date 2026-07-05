import React from "react";
import styles from "../InvoiceWorkspace.module.css";
import { formatNaira } from "@/lib/formatters/money";
import { formatDisplayDate } from "@/lib/formatters/date";

interface AdvanceInvoicesCardProps {
  advanceInvoice: any;
  onCreateAdvance: () => void;
  onViewAdvance: (advance: any) => void;
}

export const AdvanceInvoicesCard: React.FC<AdvanceInvoicesCardProps> = ({
  advanceInvoice,
  onCreateAdvance,
  onViewAdvance,
}) => {
  if (!advanceInvoice) {
    return (
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionHeaderLeft}>
            <span>Advance Invoice</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              className={styles.btnRecord}
              role="button"
              tabIndex={0}
              onClick={onCreateAdvance}
              onKeyDown={(e) => { if (e.key === "Enter") onCreateAdvance(); }}
            >
              CREATE
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderLeft}>
          <span>Advance Invoice</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            className={styles.btnRecord}
            role="button"
            tabIndex={0}
            onClick={() => onViewAdvance(advanceInvoice)}
            onKeyDown={(e) => { if (e.key === "Enter") onViewAdvance(advanceInvoice); }}
          >
            VIEW/EDIT
          </span>
        </div>
      </div>
      <div className={styles.itemList}>
        <div
          className={styles.advRow}
          onClick={() => onViewAdvance(advanceInvoice)}
          style={{ cursor: "pointer" }}
        >
          <div className={styles.advLeft}>
            <div className={styles.num}>{advanceInvoice.invoice_number}</div>
            <div className={styles.sub}>
              {advanceInvoice.issue_date ? `Issued ${formatDisplayDate(advanceInvoice.issue_date)}` : ""}
            </div>
          </div>
          <div className={styles.advRight}>
            <div className={styles.advAmount}>{formatNaira(advanceInvoice.total)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
