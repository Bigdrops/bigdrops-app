import React from "react";
import styles from "./InvoiceWorkspace.module.css";
import { InvoiceTopNav } from "./InvoiceTopNav";
import { InvoiceActionRow } from "./InvoiceActionRow";
import { InvoiceDocumentCard } from "./InvoiceDocumentCard";
import { BankDetailsCard } from "./sections/BankDetailsCard";
import { DocumentOptionsCard } from "./sections/DocumentOptionsCard";
import { InvoiceOperationalSections } from "./InvoiceOperationalSections";
import { FloatingFAB } from "./FloatingFAB";

interface InvoiceWorkspaceProps {
  // Data
  invoice: any;
  items: any[];
  payments: any[];
  bankAccounts: any[];
  advanceInvoices: any[];
  relatedCsrs: any[];
  relatedWaybills: any[];
  sourceDocument: any;
  previewModel: any;
  viewModel: any;
  pdfOutput: any;
  mergeQtyUnit: boolean;
  logoUrl?: string;
  companyName?: string;
  companySub?: string;

  // Actions
  onBack: () => void;
  onShare: () => void;
  onRecordPayment: () => void;
  onEdit: () => void;
  onDownload: () => void;
  onMore: () => void;
  onVoidPayment: (id: string) => void;
  onCreateAdvance: () => void;
  onViewAdvance: (advance: any) => void;
  onViewDoc: (type: string, id: string) => void;
  onOutputChange: (settings: any) => void;
  onToggleMergeQtyUnit: () => void;
  onCustomize: () => void;
  onFabClick: () => void;
}

export const InvoiceWorkspace: React.FC<InvoiceWorkspaceProps> = ({
  invoice,
  items,
  payments,
  bankAccounts,
  advanceInvoices,
  relatedCsrs,
  relatedWaybills,
  sourceDocument,
  previewModel,
  viewModel,
  pdfOutput,
  mergeQtyUnit,
  logoUrl,
  companyName,
  companySub,

  onBack,
  onShare,
  onRecordPayment,
  onEdit,
  onDownload,
  onMore,
  onVoidPayment,
  onCreateAdvance,
  onViewAdvance,
  onViewDoc,
  onOutputChange,
  onToggleMergeQtyUnit,
  onCustomize,
  onFabClick,
}) => {
  const isPaid = invoice?.status === "paid";

  return (
    <div className={styles.workspace}>
      <InvoiceTopNav
        title="Invoices"
        subtitle={`${invoice?.invoice_number || "Draft"} · ${invoice?.invoice_title || ""}`}
        onBack={onBack}
        onShare={onShare}
        onCustomize={onCustomize}
        onMore={onMore}
      />

      <InvoiceActionRow
        onRecordPayment={onRecordPayment}
        onEdit={onEdit}
        onDownload={onDownload}
        isPaid={isPaid}
      />

      <div className={styles.scrollBody}>
        <InvoiceDocumentCard
          invoice={invoice}
          items={items}
          previewModel={previewModel}
          viewModel={viewModel}
          logoUrl={logoUrl}
          companyName={companyName}
          companySub={companySub}
        />

        <BankDetailsCard bankAccounts={bankAccounts} />

        <DocumentOptionsCard
          pdfOutput={pdfOutput}
          onOutputChange={onOutputChange}
          onToggleMergeQtyUnit={onToggleMergeQtyUnit}
          mergeQtyUnit={mergeQtyUnit}
          onCustomize={onCustomize}
        />

        <InvoiceOperationalSections
          payments={payments}
          viewModel={viewModel}
          advanceInvoices={advanceInvoices}
          relatedCsrs={relatedCsrs}
          relatedWaybills={relatedWaybills}
          sourceDocument={sourceDocument}
          invoiceId={invoice?.id}
          onRecordPayment={onRecordPayment}
          onVoidPayment={onVoidPayment}
          onCreateAdvance={onCreateAdvance}
          onViewAdvance={onViewAdvance}
          onViewDoc={onViewDoc}
        />
      </div>

      <FloatingFAB onClick={onFabClick} />
    </div>
  );
};
