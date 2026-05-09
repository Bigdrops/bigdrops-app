import React, { useState } from "react";
import { ChevronDown, CreditCard } from "lucide-react";
import styles from "../InvoiceWorkspace.module.css";

interface BankDetailsCardProps {
  bankAccounts: any[];
}

export const BankDetailsCard: React.FC<BankDetailsCardProps> = ({ bankAccounts }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!bankAccounts || bankAccounts.length === 0) return null;

  return (
    <div className={styles.card}>
      <div 
        className={styles.sectionHeader} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles.sectionHeaderLeft}>
          <CreditCard size={16} />
          <span>Bank Details</span>
        </div>
        <div className={`${styles.sectionChevron} ${isOpen ? styles.sectionChevronOpen : ""}`}>
          <ChevronDown size={14} />
        </div>
      </div>
      
      {isOpen && (
        <div style={{ padding: "14px 0" }}>
          {bankAccounts.map((bank, index) => (
            <div key={index} className={styles.bankDetail}>
              <div className={styles.bankName}>{bank.bank_name}</div>
              <div>
                <div className={styles.lbl}>Account Name</div>
                <div className={styles.val}>{bank.account_name}</div>
              </div>
              <div>
                <div className={styles.lbl}>Account Number</div>
                <div className={styles.val}>{bank.account_number}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
