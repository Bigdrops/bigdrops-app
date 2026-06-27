import React, { useState } from "react";
import { ChevronDown, CreditCard, Check } from "lucide-react";
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
  const [isOpen, setIsOpen] = useState(false);

  if (!bankAccounts || bankAccounts.length === 0) return null;

  const selectedBank = bankAccounts.find(bank => bank.id === selectedBankId) || bankAccounts[0];

  return (
    <div className={styles.card}>
      <div className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <div className={styles.sectionHeaderLeft}>
          <CreditCard size={16} />
          <span>Bank Details</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            className={`${styles.sectionChevron} ${isOpen ? styles.sectionChevronOpen : ""}`}
          >
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {!isOpen && selectedBank && (
        <div className={previewStyles.bankDetail}>
          <div className={previewStyles.bankName}>
            <Check size={12} style={{ marginRight: 6, color: "hsl(var(--bd-primary))" }} />
            {selectedBank.bankName}
          </div>
          <div className={previewStyles.bankDetailValue}>{selectedBank.accountName}</div>
          <div className={previewStyles.bankDetailValue}>{selectedBank.accountNumber}</div>
        </div>
      )}

      {isOpen && (
        <>
          {bankAccounts.map((bank, index) => {
            const isSelected = bank.id === selectedBank?.id;
            return (
              <React.Fragment key={bank.id || index}>
                <div 
                  className={previewStyles.bankDetail}
                  style={{
                    cursor: onSelect ? "pointer" : "default",
                    backgroundColor: isSelected ? "hsl(var(--bd-primary) / 0.05)" : undefined,
                    borderLeft: isSelected ? "3px solid hsl(var(--bd-primary))" : undefined,
                    paddingLeft: isSelected ? "12px" : undefined,
                  }}
                  onClick={() => onSelect?.(bank.id)}
                >
                  <div className={previewStyles.bankName}>
                    {isSelected ? (
                      <Check size={12} style={{ marginRight: 6, color: "hsl(var(--bd-primary))" }} />
                    ) : (
                      <span style={{ marginRight: 18 }} />
                    )}
                    {isSelected && (
                      <span style={{ 
                        marginRight: "8px", 
                        fontSize: "10px", 
                        fontWeight: 600,
                        color: "hsl(var(--bd-primary))",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}>
                        Active
                      </span>
                    )}
                    {bank.bankName}
                  </div>
                  <div className={previewStyles.bankDetailValue}>{bank.accountName}</div>
                  <div className={previewStyles.bankDetailValue}>{bank.accountNumber}</div>
                </div>
                {index < bankAccounts.length - 1 && (
                  <div style={{ 
                    height: 1, 
                    backgroundColor: "hsl(var(--border))",
                    margin: "0 16px",
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </>
      )}
    </div>
  );
};
