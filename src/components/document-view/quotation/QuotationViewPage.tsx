import { Paperclip } from "lucide-react";
import type { ReactNode } from "react";

import DocumentRelatedDocsSection, {
  type RelatedDocumentItem,
} from "../shared/DocumentRelatedDocsSection";
import type { BaseDocument } from "../types/documentView";
import DocumentPreviewShell from "../shared/DocumentPreviewShell";
import styles from "./QuotationViewPage.module.css";

interface SupportingSectionProps {
  title: string;
  children: ReactNode;
}

function SupportingSection({ title, children }: SupportingSectionProps) {
  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHd}>
        <div className={styles.sectionLabel}>{title}</div>
      </div>
      <div>
        {children}
      </div>
    </section>
  );
}

interface QuotationViewPageProps {
  document: BaseDocument;
  documentPreview?: ReactNode;
  preview?: ReactNode;
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

/**
 * TRUE STRUCTURAL TRANSPLANT
 * Flat sequence of modules mirroring the HTML reference.
 */
export default function QuotationViewPage({
  documentPreview,
  preview,
  previewControls,
  relatedDocuments,
  activityHistory,
  attachments,
}: QuotationViewPageProps) {
  const previewContent = documentPreview || preview;
  const guardedRelatedDocuments = Array.isArray(relatedDocuments)
    ? relatedDocuments
    : [];
  const guardedAttachments = Array.isArray(attachments) ? attachments : [];

  return (
    <>
      <DocumentPreviewShell>
        {previewContent}
      </DocumentPreviewShell>

      {previewControls}

      <DocumentRelatedDocsSection items={guardedRelatedDocuments} />

      {activityHistory}

      {guardedAttachments.length > 0 && (
        <SupportingSection title="Attachments">
          <div style={{ padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {guardedAttachments.map((file) => (
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
