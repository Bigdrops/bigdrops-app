import { Paperclip } from "lucide-react";
import type { ReactNode } from "react";

import DocumentRelatedDocsSection, {
  type RelatedDocumentItem,
} from "../shared/DocumentRelatedDocsSection";
import type { BaseDocument } from "../types/documentView";
import QuotationPrimaryActions from "./QuotationPrimaryActions";
import styles from "./QuotationViewPage.module.css";

interface SupportingSectionProps {
  title: string;
  children: ReactNode;
}

function SupportingSection({ title, children }: SupportingSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHd}>
        <div className={styles.sectionLabel}>{title}</div>
      </div>
      <div className={styles.sectionCard}>
        {children}
      </div>
    </section>
  );
}

interface QuotationViewPageProps {
  document: BaseDocument;
  documentPreview?: ReactNode;
  preview?: ReactNode; // deprecated, use documentPreview
  previewControls?: ReactNode;
  relatedDocuments?: RelatedDocumentItem[];
  activityHistory?: ReactNode;
  attachments?: Array<{
    id: string;
    label: string;
  }>;
  onConvert: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDownload: () => void;
  onCopyNumber: () => void;
}

export default function QuotationViewPage({
  document: _document,
  documentPreview,
  preview,
  previewControls,
  relatedDocuments,
  activityHistory,
  attachments,
  onConvert,
  onEdit,
  onDuplicate: _onDuplicate,
  onDownload,
  onCopyNumber: _onCopyNumber,
}: QuotationViewPageProps) {
  const previewContent = documentPreview || preview;
  const guardedRelatedDocuments = Array.isArray(relatedDocuments)
    ? relatedDocuments
    : [];
  const guardedAttachments = Array.isArray(attachments) ? attachments : [];

  return (
    <div className={styles.stack}>
      <div className={styles.documentBody}>{previewContent}</div>


      {previewControls ? (
        <div className={styles.previewControls}>{previewControls}</div>
      ) : null}

      <div className={styles.supportingArea}>
        <DocumentRelatedDocsSection items={guardedRelatedDocuments} />

        {activityHistory}

        {guardedAttachments.length > 0 ? (
          <SupportingSection title="Attachments">
            <div className={styles.attachmentsScroller}>
              {guardedAttachments.map((file) => (
                <div key={file.id} className={styles.attachChip}>
                  <Paperclip size={14} />
                  <span>{file.label}</span>
                </div>
              ))}
            </div>
          </SupportingSection>
        ) : null}
      </div>
    </div>
  );
}
