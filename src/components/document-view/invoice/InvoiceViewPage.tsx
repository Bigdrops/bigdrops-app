import { Receipt, Paperclip } from "lucide-react";
import type { ReactNode } from "react";
import InvoiceAdvanceInvoicesSection from "./InvoiceAdvanceInvoicesSection";
import DocumentRelatedDocsSection from "../shared/DocumentRelatedDocsSection";
import DocumentPreviewShell from "../shared/DocumentPreviewShell";
import styles from "./InvoicePresentation.module.css";

interface SupportingSectionProps {
  title: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children: ReactNode;
  isPayment?: boolean;
}

function SupportingSection({
  title,
  action,
  children,
  isPayment,
}: SupportingSectionProps) {
  return (
    <section className={styles["section-card"]}>
      <div className={isPayment ? styles["payment-section-hd"] : styles["section-hd"]}>
        <div className={isPayment ? styles["payment-section-label"] : styles["section-label"]}>{title}</div>
        {action && (
          <button
            type="button"
            className={isPayment ? styles["btn-record"] : styles["section-link"]}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        )}
      </div>
      <div>
        {children}
      </div>
    </section>
  );
}

interface InvoiceViewPageProps {
  documentPreview: ReactNode;
  previewControls?: ReactNode;
  activityHistory?: ReactNode;
  paymentSummary: Array<{
    label: string;
    value: string;
    tone?: "success" | "warning";
  }>;
  paymentProgressLabel: string;
  paymentProgressWidth: string;
  paymentHistory: Array<{
    id: string;
    amountLabel: string;
    dateLabel: string;
    methodLabel: string;
    referenceLabel: string;
    kind: "cash" | "wht";
    isVoided?: boolean;
    voidedAt?: string | null;
  }>;
  advanceInvoices: Array<{
    id: string;
    title: string;
    subtitle: string;
    amountLabel: string;
    onOpen?: () => void;
  }>;
  relatedDocuments: Array<{
    id: string;
    title: string;
    subtitle: string;
    kind: "quotation" | "csr" | "project" | "document";
    onClick?: () => void;
  }>;
  attachments: Array<{
    id: string;
    label: string;
  }>;
  onRecordPayment: () => void;
  onVoidPayment: (id: string) => void;
  onEdit: () => void;
  onDownload: () => void;
  canRecordPayment: boolean;
  voidingPaymentId?: string | null;
}

/**
 * TRUE STRUCTURAL TRANSPLANT
 * This component now returns a flat sequence of workspace modules.
 * Wrappers are removed to allow DocumentPage's scrollBody to manage the flow.
 */
export default function InvoiceViewPage({
  documentPreview,
  previewControls,
  activityHistory,
  paymentSummary,
  paymentProgressLabel,
  paymentProgressWidth,
  paymentHistory,
  advanceInvoices,
  relatedDocuments,
  attachments,
  onRecordPayment,
  onVoidPayment,
  canRecordPayment,
  voidingPaymentId,
}: InvoiceViewPageProps) {
  const gPaymentSummary = Array.isArray(paymentSummary) ? paymentSummary : [];
  const gPaymentHistory = Array.isArray(paymentHistory) ? paymentHistory : [];
  const gAdvanceInvoices = Array.isArray(advanceInvoices) ? advanceInvoices : [];
  const gAttachments = Array.isArray(attachments) ? attachments : [];

  return (
    <>
      {/* 1. Main Document Surface */}
      <DocumentPreviewShell>
        {documentPreview}
      </DocumentPreviewShell>

      {/* 2. Integrated Action Row (Alternative Position if needed, but Topbar and ActionStrip handle most) */}
      {previewControls}

      {/* 3. Payments Module */}
      {gPaymentSummary.length > 0 && (
        <SupportingSection
          title="Payment Module"
          isPayment
          action={
            canRecordPayment
              ? { label: "+ Record", onClick: onRecordPayment }
              : undefined
          }
        >
          <div className={styles["payment-summary-grid"]}>
            {gPaymentSummary.map((cell) => (
              <div key={cell.label} className={styles["pay-sum-cell"]}>
                <div className={styles["pay-sum-lbl"]}>{cell.label}</div>
                <div className={`${styles["pay-sum-val"]} ${cell.tone === "success" ? styles.green : cell.tone === "warning" ? styles.amber : ""}`}>
                  {cell.value}
                </div>
              </div>
            ))}
          </div>
          <div className={styles["progress-wrap"]}>
            <div className={styles["progress-meta"]}>
              <span>{paymentProgressLabel}</span>
              {/* Reference shows balance in meta sometimes */}
            </div>
            <div className={styles["progress-bar"]}>
              <div
                className={styles["progress-fill"]}
                style={{ width: paymentProgressWidth }}
              />
            </div>
          </div>
          <div className={styles["payment-hist"]}>
            {gPaymentHistory.map((item) => (
              <div
                key={item.id}
                className={`${styles["pay-hist-item"]} ${item.isVoided ? styles.voided : ""}`}
              >
                <div className={`${styles["pay-hist-icon"]} ${item.kind === "wht" ? styles.wht : ""}`}>
                  <Receipt size={16} />
                </div>
                <div className={styles["pay-hist-body"]}>
                  <div className={styles["pay-hist-method"]}>{item.methodLabel}</div>
                  <div className={styles["pay-hist-ref"]}>{item.referenceLabel || "No reference"}</div>
                </div>
                <div className={styles["pay-hist-right"]}>
                  <div className={styles["pay-hist-amount"]}>{item.amountLabel}</div>
                  <div className={styles["pay-hist-date"]}>{item.dateLabel}</div>
                </div>
                {!item.isVoided && (
                  <div className={styles["pay-hist-actions"]} style={{ marginLeft: '12px' }}>
                    <button
                      type="button"
                      className={styles["btn-void"]}
                      onClick={() => onVoidPayment(item.id)}
                      disabled={voidingPaymentId === item.id}
                    >
                      {voidingPaymentId === item.id ? "..." : "Void"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </SupportingSection>
      )}

      {/* 4. Advance Invoices */}
      {gAdvanceInvoices.length > 0 && (
        <InvoiceAdvanceInvoicesSection items={gAdvanceInvoices} />
      )}

      {/* 5. Related Documents */}
      {relatedDocuments.length > 0 && (
        <DocumentRelatedDocsSection items={relatedDocuments} />
      )}

      {/* 6. Activity & History */}
      {activityHistory}

      {/* 7. Attachments */}
      {gAttachments.length > 0 && (
        <SupportingSection title="Attachments">
          <div style={{ padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {gAttachments.map((file) => (
              <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--dv-bg-2)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', border: '1px solid var(--dv-border)' }}>
                <Paperclip size={14} />
                <span>{file.label}</span>
              </div>
            ))}
          </div>
        </SupportingSection>
      )}
    </>
  );
}
