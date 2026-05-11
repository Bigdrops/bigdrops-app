import { Paperclip } from "lucide-react";
import type { ReactNode } from "react";

import DocumentRelatedDocsSection, {
  type RelatedDocumentItem,
} from "../shared/DocumentRelatedDocsSection";
import type { BaseDocument } from "../types/documentView";

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
      {/* Main preview — no shell wrapper */}
      {previewContent}

      {/* PDF controls */}
      {previewControls && (
        <div style={{ marginTop: 12 }}>{previewControls}</div>
      )}

      {/* Related docs */}
      {guardedRelatedDocuments.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <DocumentRelatedDocsSection items={guardedRelatedDocuments} />
        </div>
      )}

      {/* Activity history */}
      {activityHistory && (
        <div style={{ marginTop: 12 }}>{activityHistory}</div>
      )}

      {/* Attachments */}
      {guardedAttachments.length > 0 && (
        <div
          style={{
            marginTop: 12,
            background: "#ffffff",
            borderRadius: 8,
            border: "1px solid #e3e4e8",
            overflow: "hidden",
            boxShadow:
              "rgba(17,26,74,0.05) 0px 0px 0px 1px, rgba(0,0,0,0.1) 0px 1px 2px 0px",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid #e3e4e8",
              fontSize: 13,
              fontWeight: 700,
              textTransform: "uppercase" as const,
              letterSpacing: "0.04em",
              color: "#011821",
            }}
          >
            Attachments
          </div>
          <div
            style={{
              padding: "14px 18px",
              display: "flex",
              flexWrap: "wrap" as const,
              gap: 8,
            }}
          >
            {guardedAttachments.map((file) => (
              <div
                key={file.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#f6f6f8",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  border: "1px solid #e3e4e8",
                  color: "#011821",
                }}
              >
                <Paperclip size={14} />
                <span>{file.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
