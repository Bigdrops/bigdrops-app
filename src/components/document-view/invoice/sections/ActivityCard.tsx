import React, { useState } from "react";
import { ChevronDown, Activity } from "lucide-react";
import styles from "../InvoiceWorkspace.module.css";
import AuditTrailPanel from "@/components/audit/AuditTrailPanel";

interface ActivityCardProps {
  documentId: string;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({ documentId }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.card}>
      <div 
        className={styles.sectionHeader} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles.sectionHeaderLeft}>
          <Activity size={16} />
          <span>Activity & History</span>
        </div>
        <div className={`${styles.sectionChevron} ${isOpen ? styles.sectionChevronOpen : ""}`}>
          <ChevronDown size={14} />
        </div>
      </div>

      {isOpen && (
        <div style={{ padding: "0 18px 18px" }}>
          <AuditTrailPanel 
            entityType="invoice"
            entityId={documentId}
            defaultOpen
          />
        </div>
      )}
    </div>
  );
};
