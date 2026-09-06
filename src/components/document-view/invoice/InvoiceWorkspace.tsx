import React from "react";
import DocumentPage from "../shared/DocumentPage";
import styles from "./InvoiceWorkspace.module.css";
import { InvoiceTopNav } from "./InvoiceTopNav";
import { InvoiceActionRow } from "./InvoiceActionRow";
import { InvoiceDocumentCard } from "./InvoiceDocumentCard";
import { BankDetailsCard } from "../shared/BankDetailsCard";
import { DocumentOptionsCard } from "../shared/DocumentOptionsCard";
import { InvoiceOperationalSections } from "./InvoiceOperationalSections";
import FloatingDownloadButton from "../shared/FloatingDownloadButton";

interface InvoiceWorkspaceProps {
  // Data
  invoice: any;
  items: any[];
  payments: any[];
  bankAccounts: any[];
  advanceInvoice: any;
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
  settings?: any;
  selectedBankId?: string | null;
  onBankAccountSelect?: (bankId: string) => void;

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
  overlays?: React.ReactNode;
}

export const InvoiceWorkspace: React.FC<InvoiceWorkspaceProps> = ({
  invoice,
  items,
  payments,
  bankAccounts,
  advanceInvoice,
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
  settings,
  selectedBankId,
  onBankAccountSelect,

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
  overlays,
}) => {
  const isPaid = invoice?.status === "paid";

  return (
    <DocumentPage
      topNav={
        <InvoiceTopNav
          title="Invoices"
          subtitle={`${invoice?.invoice_number || "Draft"} · ${invoice?.invoice_title || ""}`}
          onBack={onBack}
          onShare={onShare}
          onCustomize={onCustomize}
          onMore={onMore}
        />
      }
      actionRow={
        <InvoiceActionRow
          onRecordPayment={onRecordPayment}
          onEdit={onEdit}
          onDownload={onDownload}
          isPaid={isPaid}
        />
      }
      floating={
        <FloatingDownloadButton onClick={onFabClick} />
      }
      overlays={overlays}
    >
      <InvoiceDocumentCard
        invoice={invoice}
        items={items}
        previewModel={previewModel}
        viewModel={viewModel}
        logoUrl={logoUrl}
        companyName={companyName}
        companySub={companySub}
        settings={settings}
      />

      <BankDetailsCard 
        bankAccounts={previewModel?.previewBankAccounts || bankAccounts}
        selectedBankId={selectedBankId}
        onSelect={onBankAccountSelect}
      />

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
        advanceInvoice={advanceInvoice}
        relatedCsrs={relatedCsrs}
        relatedWaybills={relatedWaybills}
        sourceDocument={sourceDocument}
        invoiceId={invoice?.id}
        invoiceTotal={invoice?.total || 0}
        onRecordPayment={onRecordPayment}
        onVoidPayment={onVoidPayment}
        onCreateAdvance={onCreateAdvance}
        onViewAdvance={onViewAdvance}
        onViewDoc={onViewDoc}
      />
    </DocumentPage>
  );
};
