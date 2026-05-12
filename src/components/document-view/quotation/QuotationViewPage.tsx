import { Paperclip } from "lucide-react";
import type { ReactNode } from "react";

import { BankDetailsCard } from "../invoice/sections/BankDetailsCard";
import { DocumentOptionsCard } from "../invoice/sections/DocumentOptionsCard";
import DocumentRelatedDocsSection, {
  type RelatedDocumentItem,
} from "../shared/DocumentRelatedDocsSection";
import type { BaseDocument } from "../types/documentView";

interface QuotationViewPageProps {
  document: BaseDocument;
  documentPreview?: ReactNode;
  preview?: ReactNode;
  previewControls?: ReactNode;
  bankAccounts?: any[];
  relatedDocuments?: RelatedDocumentItem[];
  activityHistory?: ReactNode;
  attachments?: Array<{ id: string; label: string }>;
  onConvert: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDownload: () => void;
  onCopyNumber: () => void;
}

const GAP = 12;

export default function QuotationViewPage({
  documentPreview,
  preview,
  bankAccounts = [],
  relatedDocuments,
  activityHistory,
  attachments,
}: QuotationViewPageProps) {
  const previewContent = documentPreview || preview;
  const guardedRelatedDocuments = Array.isArray(relatedDocuments) ? relatedDocuments : [];
  const guardedAttachments = Array.isArray(attachments) ? attachments : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
      {previewContent}

      <BankDetailsCard bankAccounts={bankAccounts} />

      <DocumentOptionsCard />

      {guardedRelatedDocuments.length > 0 && (
        <DocumentRelatedDocsSection items={guardedRelatedDocuments} />
      )}

      {activityHistory}

      {guardedAttachments.length > 0 && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: 8,
            border: "1px solid #e3e4e8",
            overflow: "hidden",
            boxShadow:
              "rgba(17,26,74,0.05) 0px 0px 0px 1px, rgba(0,0,0,0.1) 0px 1px 2px 0px, rgba(255,255,255,0.5) 0px 0px 0px 1px inset",
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
          <div style={{ padding: "14px 18px", display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
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
    </div>
  );
}
