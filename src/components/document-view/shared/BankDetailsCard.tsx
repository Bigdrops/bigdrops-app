import React, { useState } from "react";
import { ChevronDown, CreditCard } from "lucide-react";
import styles from "../invoice/InvoiceWorkspace.module.css";
import previewStyles from "./DocumentPreview.module.css";

interface BankDetailsCardProps {
  bankAccounts: any[];
}

export const BankDetailsCard: React.FC<BankDetailsCardProps> = ({
  bankAccounts,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!bankAccounts || bankAccounts.length === 0) return null;

  return (
    <div className={styles.card}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <div className={styles.sectionHeaderLeft}>
          <CreditCard size={16} />
          <span>Bank Details</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={styles.optToggle} data-on={String(isOpen)}>
            <span className={styles.optToggleKnob} />
          </span>
          <div
            className={`${styles.sectionChevron} ${isOpen ? styles.sectionChevronOpen : ""}`}
          >
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {isOpen && (
        <>
          {bankAccounts.map((bank, index) => (
            <div key={index} className={previewStyles.bankDetail}>
              <div className={previewStyles.bankName}>{bank.bankName}</div>
              <div className={previewStyles.bankDetailValue}>{bank.accountName}</div>
              <div className={previewStyles.bankDetailValue}>{bank.accountNumber}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
