import { Paperclip } from "lucide-react";
import type { ReactNode } from "react";

import { BankDetailsCard } from "../shared/BankDetailsCard";
import { DocumentOptionsCard } from "../shared/DocumentOptionsCard";
import DocumentRelatedDocsSection, {
  type RelatedDocumentItem,
} from "../shared/DocumentRelatedDocsSection";
import type { BaseDocument } from "../types/documentView";
import type { PdfOutputSettingsValue } from "@/components/PdfOutputSettings";

interface QuotationViewPageProps {
  document: BaseDocument;
  documentPreview?: ReactNode;
  preview?: ReactNode;
  previewControls?: ReactNode;
  bankAccounts?: any[];
  pdfOutput?: Partial<PdfOutputSettingsValue>;
  onOutputChange?: (next: PdfOutputSettingsValue) => void;
  onCustomize?: () => void;
  selectedBankId?: string | null;
  onBankAccountSelect?: (bankId: string) => void;
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
  pdfOutput,
  onOutputChange,
  onCustomize,
  selectedBankId,
  onBankAccountSelect,
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

      <BankDetailsCard 
        bankAccounts={bankAccounts}
        selectedBankId={selectedBankId}
        onSelect={onBankAccountSelect}
      />

      <DocumentOptionsCard
        pdfOutput={pdfOutput}
        onOutputChange={onOutputChange}
        onCustomize={onCustomize}
        hideMergeQty
        hideBalanceDue
      />

      {guardedRelatedDocuments.length > 0 && (
        <DocumentRelatedDocsSection items={guardedRelatedDocuments} />
      )}

      {activityHistory}

      {guardedAttachments.length > 0 && (
        <div
          style={{
            background: "hsl(var(--bd-surface))",
            borderRadius: 8,
            border: "1px solid hsl(var(--bd-border))",
            overflow: "hidden",
            boxShadow: "var(--bd-shadow-md)",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid hsl(var(--bd-border))",
              fontSize: 13,
              fontWeight: 700,
              textTransform: "uppercase" as const,
              letterSpacing: "0.04em",
              color: "hsl(var(--bd-text))",
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
                  background: "hsl(var(--bd-surface-muted))",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  border: "1px solid hsl(var(--bd-border))",
                  color: "hsl(var(--bd-text))",
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
