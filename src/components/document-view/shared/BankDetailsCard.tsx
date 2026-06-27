import React, { useState } from "react";
import { ChevronDown, CreditCard } from "lucide-react";
import styles from "../invoice/InvoiceWorkspace.module.css";
import previewStyles from "./DocumentPreview.module.css";

interface BankDetailsCardProps {
  bankAccounts: any[];
  selectedBankId?: string | null;
  onSelect?: (bankId: string) => void;
}

export const BankDetailsCard: React.FC<BankDetailsCardProps> = ({
  bankAccounts,
  selectedBankId,
  onSelect,
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
          {bankAccounts.map((bank, index) => {
            const isSelected = selectedBankId && bank.id === selectedBankId;
            return (
              <div 
                key={index} 
                className={previewStyles.bankDetail}
                style={{
                  backgroundColor: isSelected ? "hsl(var(--bd-primary) / 0.05)" : undefined,
                  borderLeft: isSelected ? "3px solid hsl(var(--bd-primary))" : undefined,
                  paddingLeft: isSelected ? "12px" : undefined,
                  cursor: onSelect ? "pointer" : "default",
                }}
                onClick={() => onSelect?.(bank.id)}
              >
                <div className={previewStyles.bankName}>
                  {bank.bankName}
                  {isSelected && (
                    <span style={{ 
                      marginLeft: "8px", 
                      fontSize: "10px", 
                      fontWeight: 600,
                      color: "hsl(var(--bd-primary))",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}>
                      Active
                    </span>
                  )}
                </div>
                <div className={previewStyles.bankDetailValue}>{bank.accountName}</div>
                <div className={previewStyles.bankDetailValue}>{bank.accountNumber}</div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};
