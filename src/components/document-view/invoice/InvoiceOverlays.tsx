import React from "react";
import { useNavigate } from "react-router-dom";
import PdfOutputCustomizeSheet from "@/components/document-view/shared/PdfOutputCustomizeSheet";
import InvoiceRecordPaymentSheet from "@/components/document-view/invoice/InvoiceRecordPaymentSheet";
import InvoiceAdvanceSheet from "@/components/invoice/view/InvoiceAdvanceSheet";
import InvoiceMoreSheet from "@/components/document-view/invoice/InvoiceMoreSheet";
import DocumentConfirmDialog from "@/components/document-view/shared/DocumentConfirmDialog";
import ProjectLinkDialog from "@/components/document/ProjectLinkDialog";
import VoidPaymentDialog from "@/components/document-view/invoice/VoidPaymentDialog";
import { buildWaybillPrefill } from "@/pages/viewInvoiceActions";

interface InvoiceOverlaysProps {
  invoice: any;
  ui: any;
  viewModel: any;
  pdfOutput: any;
  pdfTemplateId: any;
  previewBankAccounts: any[];
  settingsData: any;
  customFields: any;
  id: string;
  contractValue: number;
  
  // Advance state
  advanceSheetMode: any;
  selectedAdvanceInvoice: any;
  advanceSaving: boolean;
  advancePdfGenerating: boolean;
  advanceDeleteConfirmOpen: boolean;
  setAdvanceDeleteConfirmOpen: (open: boolean) => void;
  advanceMode: any;
  setAdvanceMode: (mode: any) => void;
  advanceInputValue: number;
  setAdvanceInputValue: (val: number) => void;
  advanceSuffixValue: string;
  setAdvanceSuffixValue: (val: string) => void;
  advancePrimaryLabel: string;
  setAdvancePrimaryLabel: (val: string) => void;
  advanceSecondaryLabel: string;
  setAdvanceSecondaryLabel: (val: string) => void;
  
  // Handlers
  refresh: () => Promise<void>;
  closeAdvanceSheet: (next: boolean) => void;
  handleAdvanceSave: () => void;
  handleAdvanceDownload: () => void;
  handleAdvanceDelete: () => void;
  openAdvanceDetails: (adv: any, mode: any) => void;
  openCreateAdvanceSheet: () => void;
  openRevertFlow: () => void;
  handleDuplicate: () => void;
  handleCopyNumber: () => void;
  handleDownloadCsv: () => void;
  handleToggleMergeQtyUnit: () => void;
  handleArchive: () => void;
  handleDelete: () => void;
  handleRevertToQuotation: () => void;
  handleDownload: () => void;
  confirmVoidPayment: (reason: string) => void;
  projectLinkOpen: boolean;
  setProjectLinkOpen: (open: boolean) => void;
  voiding: boolean;
  pendingVoidPaymentId: string | null;
  setPendingVoidPaymentId: (id: string | null) => void;
  handleSaveCustomization: (v: any, p: any, t: any) => void;
}

const SHEET_CUSTOMIZE = "customize-output";
const SHEET_MORE = "more-actions";
const SHEET_RECORD_PAYMENT = "record-payment";
const SHEET_ADVANCE = "advance";
const MODAL_DELETE = "delete";
const MODAL_ARCHIVE = "archive";
const MODAL_REVERT = "revert";
const MODAL_VOID_PAYMENT = "void-payment";

export const InvoiceOverlays: React.FC<InvoiceOverlaysProps> = ({
  invoice,
  ui,
  viewModel,
  pdfOutput,
  pdfTemplateId,
  previewBankAccounts,
  settingsData,
  customFields,
  id,
  contractValue,
  advanceSheetMode,
  selectedAdvanceInvoice,
  advanceSaving,
  advancePdfGenerating,
  advanceDeleteConfirmOpen,
  setAdvanceDeleteConfirmOpen,
  advanceMode,
  setAdvanceMode,
  advanceInputValue,
  setAdvanceInputValue,
  advanceSuffixValue,
  setAdvanceSuffixValue,
  advancePrimaryLabel,
  setAdvancePrimaryLabel,
  advanceSecondaryLabel,
  setAdvanceSecondaryLabel,
  refresh,
  closeAdvanceSheet,
  handleAdvanceSave,
  handleAdvanceDownload,
  handleAdvanceDelete,
  openAdvanceDetails,
  openCreateAdvanceSheet,
  openRevertFlow,
  handleDuplicate,
  handleCopyNumber,
  handleDownloadCsv,
  handleToggleMergeQtyUnit,
  handleArchive,
  handleDelete,
  handleRevertToQuotation,
  handleDownload,
  confirmVoidPayment,
  projectLinkOpen,
  setProjectLinkOpen,
  voiding,
  pendingVoidPaymentId,
  setPendingVoidPaymentId,
  handleSaveCustomization,
}) => {
  const navigate = useNavigate();

  return (
    <>
      <PdfOutputCustomizeSheet
        open={ui.isSheetOpen(SHEET_CUSTOMIZE)}
        onClose={ui.closeSheet}
        title="Customize Invoice PDF"
        subtitle="Adjust template, font, and color styling for this invoice PDF."
        documentType="invoice"
        value={pdfOutput}
        bankAccounts={previewBankAccounts}
        companyTagline={String(settingsData?.company_tagline || "")}
        footerText={String(settingsData?.footer_text || "")}
        showBalanceDueOption={true}
        designOnly
        templateId={pdfTemplateId}
        onSave={handleSaveCustomization}
      />

      <InvoiceRecordPaymentSheet
        open={ui.isSheetOpen(SHEET_RECORD_PAYMENT)}
        onClose={ui.closeSheet}
        onSaved={refresh}
        invoice={{
          id: String(invoice.id),
          invoice_number: invoice.invoice_number || "Invoice",
          client_name: invoice.client_name || "",
          total: Number(viewModel.invoiceTotal || 0),
          wht: invoice.wht,
        }}
      />

      <InvoiceAdvanceSheet
        open={ui.isSheetOpen(SHEET_ADVANCE)}
        onOpenChange={closeAdvanceSheet}
        invoiceNumber={invoice.invoice_number || "Invoice"}
        contractValue={contractValue}
        advanceSheetMode={advanceSheetMode}
        advanceInvoice={selectedAdvanceInvoice}
        advanceSaving={advanceSaving}
        advancePdfGenerating={advancePdfGenerating}
        advanceMode={advanceMode}
        setAdvanceMode={setAdvanceMode}
        advanceInputValue={advanceInputValue}
        setAdvanceInputValue={setAdvanceInputValue}
        advanceSuffixValue={advanceSuffixValue}
        setAdvanceSuffixValue={setAdvanceSuffixValue}
        advancePrimaryLabel={advancePrimaryLabel}
        setAdvancePrimaryLabel={setAdvancePrimaryLabel}
        advanceSecondaryLabel={advanceSecondaryLabel}
        setAdvanceSecondaryLabel={setAdvanceSecondaryLabel}
        onSave={handleAdvanceSave}
        onDownloadPdf={handleAdvanceDownload}
        onEdit={() => {
          if (selectedAdvanceInvoice) {
            openAdvanceDetails(selectedAdvanceInvoice, "edit");
          }
        }}
        onRequestDelete={() => setAdvanceDeleteConfirmOpen(true)}
        deleteConfirmOpen={advanceDeleteConfirmOpen}
        onDeleteConfirmOpenChange={setAdvanceDeleteConfirmOpen}
        onDeleteConfirm={handleAdvanceDelete}
      />

      <InvoiceMoreSheet
        open={ui.isSheetOpen(SHEET_MORE)}
        onClose={ui.closeSheet}
        onRevert={openRevertFlow}
        onGenerateWaybill={() =>
          navigate("/waybills/new", {
            state: buildWaybillPrefill(invoice),
          })
        }
        onRecordPayment={() => {
          ui.closeSheet();
          ui.openSheet(SHEET_RECORD_PAYMENT);
        }}
        onAdvanceInvoice={openCreateAdvanceSheet}
        onLinkProject={() => setProjectLinkOpen(true)}
        onDuplicate={handleDuplicate}
        onCopyNumber={handleCopyNumber}
        onExportCsv={handleDownloadCsv}
        mergeQtyUnit={customFields?.mergeQtyUnit === true}
        onToggleMergeQtyUnit={handleToggleMergeQtyUnit}
        onArchive={() => ui.openModal(MODAL_ARCHIVE)}
        onDelete={() => ui.openModal(MODAL_DELETE)}
      />

      <DocumentConfirmDialog
        open={ui.isModalOpen(MODAL_REVERT)}
        title="Revert to Quotation?"
        description={`${invoice.invoice_number} will be converted back to an open quotation. Existing payment records will be deleted and cannot be recovered.`}
        cancelLabel="Cancel"
        confirmLabel="Revert"
        onConfirm={handleRevertToQuotation}
        onCancel={ui.closeModal}
      />

      <DocumentConfirmDialog
        open={ui.isModalOpen(MODAL_ARCHIVE)}
        title="Archive Invoice?"
        description={`${invoice.invoice_number} will be moved to your archive.`}
        cancelLabel="Cancel"
        confirmLabel="Archive"
        onConfirm={handleArchive}
        onCancel={ui.closeModal}
      />

      <DocumentConfirmDialog
        open={ui.isModalOpen(MODAL_DELETE)}
        title="Delete Invoice?"
        description={`${invoice.invoice_number} will be permanently deleted.`}
        cancelLabel="Cancel"
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={ui.closeModal}
      />

      <ProjectLinkDialog
        open={projectLinkOpen}
        onOpenChange={setProjectLinkOpen}
        tableName="invoices"
        recordId={String(invoice.id || "")}
        documentLabel={invoice.invoice_number || "Invoice"}
        onLinked={() => refresh()}
      />

      <VoidPaymentDialog
        open={ui.isModalOpen(MODAL_VOID_PAYMENT)}
        onOpenChange={(open) => {
          if (!open) {
            ui.closeModal();
            setPendingVoidPaymentId(null);
          }
        }}
        onConfirm={confirmVoidPayment}
        loading={voiding}
      />
    </>
  );
};
