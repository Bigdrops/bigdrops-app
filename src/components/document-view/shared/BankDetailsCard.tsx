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
          <span
            style={{
              display: "inline-block",
              width: 44,
              height: 24,
              borderRadius: 12,
              background: "hsl(var(--bd-brand))",
              position: "relative",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "hsl(var(--bd-surface))",
                position: "absolute",
                top: 3,
                left: 3,
                transform: isOpen ? "translateX(20px)" : "translateX(0)",
                transition: "transform 0.2s",
                boxShadow: "var(--bd-shadow-sm)",
              }}
            />
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
              <div>
                <div className={previewStyles.lbl}>Account Name</div>
                <div className={previewStyles.val}>{bank.accountName}</div>
              </div>
              <div>
                <div className={previewStyles.lbl}>Account Number</div>
                <div className={previewStyles.val}>{bank.accountNumber}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
