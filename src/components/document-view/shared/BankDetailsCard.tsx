import React, { useState } from "react";
import { ChevronDown, CreditCard, CheckCircle2 } from "lucide-react";
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

      {/* Collapsed: show only the active account with prominent green styling */}
      {!isOpen && selectedBank && (
        <div
          style={{
            margin: "0 18px 14px",
            padding: "16px",
            background: "hsl(142 46% 93%)",
            borderRadius: "var(--bd-radius-lg)",
            border: "2px solid hsl(142 71% 45%)",
            boxShadow: "0 1px 3px hsl(142 71% 45% / 0.15)",
            position: "relative",
            transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
          }}
        >
          {/* Active badge */}
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 10px",
              borderRadius: 999,
              background: "hsl(142 71% 45%)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              lineHeight: 1,
            }}
          >
            <CheckCircle2 size={11} strokeWidth={2.5} />
            Active
          </div>

          <div className={previewStyles.bankName} style={{ paddingRight: 60 }}>
            {selectedBank.bankName}
          </div>
          <div className={previewStyles.bankDetailValue}>{selectedBank.accountName}</div>
          <div className={previewStyles.bankDetailValue}>{selectedBank.accountNumber}</div>
        </div>
      )}

      {/* Expanded: show all accounts */}
      {isOpen && (
        <>
          {bankAccounts.map((bank, index) => {
            const isSelected = bank.id === selectedBank?.id;
            return (
              <React.Fragment key={bank.id || index}>
                <div
                  style={{
                    margin: "0 18px 14px",
                    padding: "16px",
                    background: isSelected
                      ? "hsl(142 46% 93%)"
                      : "hsl(var(--bd-surface-muted))",
                    borderRadius: "var(--bd-radius-lg)",
                    border: isSelected
                      ? "2px solid hsl(142 71% 45%)"
                      : "1px solid hsl(var(--bd-border))",
                    boxShadow: isSelected
                      ? "0 1px 3px hsl(142 71% 45% / 0.15)"
                      : "none",
                    cursor: onSelect ? "pointer" : "default",
                    position: "relative",
                    transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s, border-width 0.15s",
                  }}
                  onClick={() => onSelect?.(bank.id)}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = "hsl(var(--bd-text-muted))";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = "hsl(var(--bd-border))";
                    }
                  }}
                >
                  {/* Active badge */}
                  {isSelected && (
                    <div
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "3px 10px",
                        borderRadius: 999,
                        background: "hsl(142 71% 45%)",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        lineHeight: 1,
                      }}
                    >
                      <CheckCircle2 size={11} strokeWidth={2.5} />
                      Active
                    </div>
                  )}

                  <div className={previewStyles.bankName} style={{ paddingRight: isSelected ? 60 : 0 }}>
                    {isSelected ? (
                      <CheckCircle2
                        size={16}
                        style={{
                          marginRight: 6,
                          color: "hsl(142 71% 45%)",
                          verticalAlign: "text-bottom",
                        }}
                      />
                    ) : (
                      /* Unselected: empty radio circle */
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          border: "2px solid hsl(var(--bd-border))",
                          marginRight: 6,
                          verticalAlign: "text-bottom",
                          transition: "border-color 0.15s",
                        }}
                      />
                    )}
                    {bank.bankName}
                  </div>
                  <div className={previewStyles.bankDetailValue}>{bank.accountName}</div>
                  <div className={previewStyles.bankDetailValue}>{bank.accountNumber}</div>
                </div>
                {index < bankAccounts.length - 1 && (
                  <div
                    style={{
                      height: 1,
                      backgroundColor: "hsl(var(--border))",
                      margin: "0 16px",
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </>
      )}
    </div>
  );
};
