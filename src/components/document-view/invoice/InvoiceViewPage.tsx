import { Plus, Receipt, Paperclip, Edit3, Download } from "lucide-react";
import type { ReactNode } from "react";
import InvoiceAdvanceInvoicesSection from "./InvoiceAdvanceInvoicesSection";
import DocumentRelatedDocsSection from "../shared/DocumentRelatedDocsSection";
import styles from "./InvoicePresentation.module.css";

interface SupportingSectionProps {
  title: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children: ReactNode;
}

function SupportingSection({
  title,
  action,
  children,
  isPayment,
}: SupportingSectionProps & { isPayment?: boolean }) {
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
  onEdit,
  onDownload,
  canRecordPayment,
  voidingPaymentId,
}: InvoiceViewPageProps) {
  const gPaymentSummary = Array.isArray(paymentSummary) ? paymentSummary : [];
  const gPaymentHistory = Array.isArray(paymentHistory) ? paymentHistory : [];
  const gAdvanceInvoices = Array.isArray(advanceInvoices)
    ? advanceInvoices
    : [];
  const gRelatedDocuments = Array.isArray(relatedDocuments)
    ? relatedDocuments
    : [];
  const gAttachments = Array.isArray(attachments) ? attachments : [];

  return (
    <div className={styles.stack}>
      <div className={styles.documentBody}>{documentPreview}</div>

      {previewControls ? (
        <div className={styles.previewControls}>{previewControls}</div>
      ) : null}

      <div className={styles.supportingArea}>
        {gPaymentSummary.length > 0 && (
          <SupportingSection
            title="Payments"
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
                    <div
                      className={`${styles["pay-sum-val"]} ${cell.tone === "success" ? styles.green : cell.tone === "warning" ? styles.amber : ""}`}
                    >
                      {cell.value}
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles["progress-wrap"]}>
                <div className={styles["progress-bar"]}>
                  <div
                    className={styles["progress-fill"]}
                    style={{ width: paymentProgressWidth }}
                  />
                </div>
                <div className={styles["progress-meta"]}>
                  {paymentProgressLabel}
                </div>
              </div>
              <div className={styles["payment-hist"]}>
                {gPaymentHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`${styles["pay-hist-item"]} ${item.isVoided ? styles.voided : ""}`}
                  >
                    <div
                      className={`${styles["pay-hist-icon"]} ${item.kind === "wht" ? styles.wht : ""}`}
                    >
                      <Receipt size={16} />
                    </div>
                    <div className={styles["pay-hist-body"]}>
                      <div className={styles["pay-hist-method"]}>
                        {item.methodLabel}
                      </div>
                      <div className={styles["pay-hist-ref"]}>
                        {item.referenceLabel || "No reference"}
                      </div>
                    </div>
                    <div className={styles["pay-hist-right"]}>
                      <div className={styles["pay-hist-amount"]}>
                        {item.amountLabel}
                      </div>
                      <div className={styles["pay-hist-date"]}>
                        {item.dateLabel}
                      </div>
                    </div>
                    {!item.isVoided && (
                      <div className={styles["pay-hist-actions"]}>
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

        <InvoiceAdvanceInvoicesSection items={gAdvanceInvoices} />

        <DocumentRelatedDocsSection items={relatedDocuments} />

        {activityHistory}

        {gAttachments.length > 0 && (
          <SupportingSection title="Attachments">
            <div className={styles["attachments-scroller"]}>
              {gAttachments.map((file) => (
                <div key={file.id} className={styles["attach-chip"]}>
                  <Paperclip size={14} />
                  <span>{file.label}</span>
                </div>
              ))}
            </div>
          </SupportingSection>
        )}
      </div>
    </div>
  );
}
