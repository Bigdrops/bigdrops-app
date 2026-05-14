import React, { useState } from "react";
import { ChevronDown, Link2, FileText } from "lucide-react";
import styles from "../InvoiceWorkspace.module.css";
import previewStyles from "../../shared/DocumentPreview.module.css";

interface RelatedDocsCardProps {
  relatedCsrs: any[];
  relatedWaybills: any[];
  sourceDocument: any;
  onViewDoc: (type: string, id: string) => void;
}

export const RelatedDocsCard: React.FC<RelatedDocsCardProps> = ({
  relatedCsrs,
  relatedWaybills,
  sourceDocument,
  onViewDoc,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const hasDocs = relatedCsrs.length > 0 || relatedWaybills.length > 0 || sourceDocument;

  return (
    <div className={styles.card}>
      <div 
        className={styles.sectionHeader} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles.sectionHeaderLeft}>
          <Link2 size={16} />
          <span>Related Documents</span>
        </div>
        <div className={`${styles.sectionChevron} ${isOpen ? styles.sectionChevronOpen : ""}`}>
          <ChevronDown size={14} />
        </div>
      </div>

      {isOpen && (
        <div className={styles.itemList}>
          {sourceDocument && (
            <div 
              className={styles.itemRow} 
              onClick={() => onViewDoc(sourceDocument.type, sourceDocument.id)}
              style={{ cursor: "pointer" }}
            >
              <FileText size={16} color="hsl(var(--bd-brand))" style={{ marginTop: "2px" }} />
              <div className={previewStyles.itemBody}>
                <div className={previewStyles.itemName}>Source {sourceDocument.type}</div>
                <div className={previewStyles.itemSub}>{sourceDocument.number}</div>
              </div>
            </div>
          )}
          {relatedCsrs.map((csr, index) => (
            <div 
              key={index} 
              className={styles.itemRow}
              onClick={() => onViewDoc("csr", csr.id)}
              style={{ cursor: "pointer" }}
            >
              <FileText size={16} color="var(--success-moss)" style={{ marginTop: "2px" }} />
              <div className={previewStyles.itemBody}>
                <div className={previewStyles.itemName}>CSR</div>
                <div className={previewStyles.itemSub}>{csr.csr_number}</div>
              </div>
            </div>
          ))}
          {relatedWaybills.map((wb, index) => (
            <div 
              key={index} 
              className={styles.itemRow}
              onClick={() => onViewDoc("waybill", wb.id)}
              style={{ cursor: "pointer" }}
            >
              <FileText size={16} color="var(--info-blue)" style={{ marginTop: "2px" }} />
              <div className={styles.itemBody}>
                <div className={styles.itemName}>Waybill</div>
                <div className={styles.itemSub}>{wb.waybill_number}</div>
              </div>
            </div>
          ))}
          {!hasDocs && (
            <div className={styles.itemRow} style={{ justifyContent: "center", color: "hsl(var(--bd-text-muted))", fontSize: "13px" }}>
              No related documents found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
