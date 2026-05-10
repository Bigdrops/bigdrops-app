import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/supabase";
import { feedback } from "@/lib/feedback";
import { parseCustomFields } from "@/domain/invoice";
import {
  getAdvanceDraftFromInvoice,
  ADVANCE_SUFFIX_DEFAULT,
  ADVANCE_PRIMARY_LABEL_DEFAULT,
  ADVANCE_SECONDARY_LABEL_DEFAULT,
} from "@/domain/invoice/advanceChildFlow";
import { downloadInvoiceCsvFile, createAdvanceInvoiceRecord, updateAdvanceInvoiceRecord, deleteAdvanceInvoiceRecord } from "@/pages/viewInvoiceActions";
import { archiveInvoice, deleteInvoice, duplicateInvoice, syncAndGetInvoiceStatus } from "@/modules/invoices/services/invoiceLifecycleService";
import { voidInvoicePayment } from "@/modules/invoices/services/paymentService";
import { revertInvoiceToQuotationService } from "@/modules/invoices/services/invoiceConversionService";
import { downloadInvoicePdfDocument } from "./invoicePdfActions";

const SHEET_CUSTOMIZE = "customize-output";
const SHEET_MORE = "more-actions";
const SHEET_RECORD_PAYMENT = "record-payment";
const SHEET_ADVANCE = "advance";
const MODAL_DELETE = "delete";
const MODAL_ARCHIVE = "archive";
const MODAL_REVERT = "revert";
const MODAL_VOID_PAYMENT = "void-payment";

export function useInvoiceActions({
  invoice,
  items,
  payments,
  client,
  settings,
  bankAccounts,
  signatories,
  advanceMetadata,
  viewModel,
  ui,
  refresh,
  setInvoice,
  pdfOutput,
  setPdfOutput,
  pdfTemplateId,
  settingsData,
}: any) {
  const navigate = useNavigate();
  const location = useLocation();

  const [downloading, setDownloading] = useState(false);
  const [projectLinkOpen, setProjectLinkOpen] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [advanceSheetMode, setAdvanceSheetMode] = useState<any>("create");
  const [selectedAdvanceInvoice, setSelectedAdvanceInvoice] = useState<any>(null);
  const [advanceSaving, setAdvanceSaving] = useState(false);
  const [advancePdfGenerating, setAdvancePdfGenerating] = useState(false);
  const [advanceDeleteConfirmOpen, setAdvanceDeleteConfirmOpen] = useState(false);
  const [advanceMode, setAdvanceMode] = useState<any>("percent");
  const [advanceInputValue, setAdvanceInputValue] = useState<number>(30);
  const [advanceSuffixValue, setAdvanceSuffixValue] = useState(ADVANCE_SUFFIX_DEFAULT);
  const [advancePrimaryLabel, setAdvancePrimaryLabel] = useState(ADVANCE_PRIMARY_LABEL_DEFAULT);
  const [advanceSecondaryLabel, setAdvanceSecondaryLabel] = useState(ADVANCE_SECONDARY_LABEL_DEFAULT);
  const [pendingVoidPaymentId, setPendingVoidPaymentId] = useState<string | null>(null);
  const [voiding, setVoiding] = useState(false);

  const customFields = useMemo(() => parseCustomFields(invoice?.custom_fields), [invoice?.custom_fields]);

  const showToast = (title: string, description: string, tone: "info" | "success" = "info") => {
    const options = { description };
    if (tone === "success") {
      feedback.success(title, options);
    } else {
      feedback.info(title, options);
    }
  };

  const handleDownload = async () => {
    if (!invoice || downloading) return;
    setDownloading(true);
    try {
      await downloadInvoicePdfDocument({
        targetInvoice: { ...invoice, status: viewModel.computedStatus || invoice.status || "" },
        targetItems: Array.isArray(items) ? items : [],
        targetPayments: Array.isArray(payments) ? payments : [],
        client, settings, bankAccounts, signatories, pdfOutput, pdfTemplateId, settingsData
      });
      showToast("Download ready", "Invoice PDF downloaded.", "success");
    } catch (error: any) {
      showToast("Download failed", error?.message || "Could not generate PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const handleArchive = async () => {
    if (!invoice?.id) return;
    try {
      const result = await archiveInvoice(invoice.id);
      if (!result.success) throw new Error(result.error);
      navigate("/invoices");
    } catch (error: any) {
      showToast("Archive failed", error?.message || "Could not archive.");
    }
  };

  const handleDelete = async () => {
    if (!invoice?.id) return;
    try {
      const result = await deleteInvoice(invoice.id);
      if (!result.success) throw new Error(result.error);
      navigate("/invoices");
    } catch (error: any) {
      showToast("Delete failed", error?.message || "Could not delete.");
    }
  };

  const handleRevertToQuotation = async () => {
    if (!invoice?.id || reverting) return;
    setReverting(true);
    try {
      const createdQuotation = await revertInvoiceToQuotationService({ invoice, items, customFields });
      navigate(`/quotations/${createdQuotation.id}`);
    } catch (error: any) {
      showToast("Revert failed", error?.message || "Could not revert.");
    } finally {
      ui.closeModal();
      setReverting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!invoice) return;
    try {
      const { prefill, prefillItems } = await duplicateInvoice({ invoice, items: Array.isArray(items) ? items : [] });
      navigate("/invoices/new", { state: { prefill, prefillItems } });
    } catch (error: any) {
      showToast("Clone failed", error?.message || "Could not duplicate.");
    }
  };

  const handleDownloadCsv = () => {
    if (!invoice) return;
    downloadInvoiceCsvFile({ invoice, items: Array.isArray(items) ? items : [], invoiceTotal: viewModel.invoiceTotal });
    showToast("CSV downloaded", "Invoice CSV exported.", "success");
  };

  const handleCopyNumber = async () => {
    if (!invoice?.invoice_number) return;
    try {
      await navigator.clipboard.writeText(invoice.invoice_number);
      showToast("Invoice number copied", invoice.invoice_number, "success");
    } catch {
      showToast("Copy unavailable", "Clipboard access is not available.");
    }
  };

  const handleToggleMergeQtyUnit = async () => {
    if (!invoice?.id) return;
    try {
      const nextCustomFields = { ...customFields, mergeQtyUnit: customFields?.mergeQtyUnit !== true };
      const { error } = await supabase.from("invoices").update({ custom_fields: JSON.stringify(nextCustomFields) }).eq("id", invoice.id);
      if (error) throw error;
      await refresh();
      showToast("Table setting updated", "Qty + Unit merge updated.", "success");
    } catch (err: any) {
      showToast("Update failed", err?.message || "Could not update.");
    }
  };

  const handleSaveCustomization = useCallback(async (nextPdfOutput: any, _nextPreset?: any, nextTemplateId?: any) => {
    if (!invoice?.id) return;
    const prev = pdfOutput;
    setPdfOutput(nextPdfOutput);
    try {
      const nextCustomFields = { ...(customFields || {}), pdfOutput: nextPdfOutput, pdfTemplateId: nextTemplateId || pdfTemplateId };
      const { error } = await supabase.from("invoices").update({ custom_fields: JSON.stringify(nextCustomFields) }).eq("id", invoice.id);
      if (error) throw error;
      await refresh();
      showToast("Settings saved", "PDF settings updated.", "success");
    } catch (err: any) {
      setPdfOutput(prev);
      showToast("Save failed", err?.message || "Could not save.");
    }
  }, [customFields, invoice?.id, pdfOutput, pdfTemplateId, refresh, setPdfOutput]);

  const confirmVoidPayment = async (reason: string) => {
    if (!pendingVoidPaymentId || !invoice?.id || voiding) return;
    setVoiding(true);
    try {
      const result = await voidInvoicePayment({ paymentId: pendingVoidPaymentId, reason });
      if (!result.success) throw new Error(result.error);
      await syncInvoiceStatus(invoice.id);
      await refresh();
      showToast("Payment voided", "Reversed and status updated.", "success");
      ui.closeModal();
    } catch (error: any) {
      showToast("Void failed", error?.message || "Could not void.");
    } finally {
      setVoiding(false);
      setPendingVoidPaymentId(null);
    }
  };

  const syncInvoiceStatus = async (invoiceId: string) => {
    const result = await syncAndGetInvoiceStatus(invoiceId);
    if (!result.success) throw new Error(result.error);
    return result.status;
  };

  const openAdvanceDetails = useCallback((advanceInvoice: any, mode: any = "view") => {
    setSelectedAdvanceInvoice(advanceInvoice);
    setAdvanceDeleteConfirmOpen(false);
    setAdvanceSheetMode(mode);
    const draft = getAdvanceDraftFromInvoice(advanceInvoice);
    setAdvanceMode(draft.mode);
    setAdvanceInputValue(draft.inputValue);
    setAdvanceSuffixValue(draft.suffix);
    setAdvancePrimaryLabel(draft.primaryLabel);
    setAdvanceSecondaryLabel(draft.secondaryLabel);
    ui.closeSheet();
    requestAnimationFrame(() => ui.openSheet(SHEET_ADVANCE));
  }, [ui]);

  const handleAdvanceSave = async () => {
    if (!invoice?.id || advanceSaving) return;
    setAdvanceSaving(true);
    try {
      const result = advanceSheetMode === "edit" 
        ? await updateAdvanceInvoiceRecord({ 
            advanceInvoiceId: selectedAdvanceInvoice?.id || advanceMetadata?.legacy_child_invoice_id || null,
            parentInvoice: invoice, mode: advanceMode, inputValue: advanceInputValue, suffix: advanceSuffixValue,
            primaryLabel: advancePrimaryLabel, secondaryLabel: advanceSecondaryLabel 
          })
        : await createAdvanceInvoiceRecord({
            parentInvoice: invoice, mode: advanceMode, inputValue: advanceInputValue, suffix: advanceSuffixValue,
            primaryLabel: advancePrimaryLabel, secondaryLabel: advanceSecondaryLabel
          });
      
      const saved = (result as any)?.invoice || result;
      if (!saved) throw new Error("Save failed");

      await refresh();
      openAdvanceDetails(saved, "view");
      showToast("Advance ready", "Advance invoice details saved.", "success");
    } catch (error: any) {
      showToast("Advance failed", error?.message || "Could not save.");
    } finally {
      setAdvanceSaving(false);
    }
  };

  const handleAdvanceDownload = async () => {
    if (!selectedAdvanceInvoice || advancePdfGenerating) return;
    setAdvancePdfGenerating(true);
    try {
      await downloadInvoicePdfDocument({
        targetInvoice: { ...invoice, ...selectedAdvanceInvoice, status: selectedAdvanceInvoice.status || "unpaid" },
        targetItems: Array.isArray(items) ? items : [], targetPayments: [],
        client, settings, bankAccounts, signatories, pdfOutput, pdfTemplateId, settingsData
      });
      showToast("Download ready", "Advance PDF downloaded.", "success");
    } catch (error: any) {
      showToast("Download failed", error?.message || "Could not generate PDF.");
    } finally {
      setAdvancePdfGenerating(false);
    }
  };

  const handleAdvanceDelete = async () => {
    if (!invoice?.id || advanceSaving) return;
    setAdvanceSaving(true);
    try {
      await deleteAdvanceInvoiceRecord({ 
        parentInvoiceId: String(invoice.id), parentInvoiceNumber: invoice.invoice_number ?? undefined, 
        parentCustomFields: invoice.custom_fields 
      });
      await refresh();
      setAdvanceDeleteConfirmOpen(false);
      ui.closeSheet();
      showToast("Advance removed", "Cleared from parent invoice.", "success");
    } catch (error: any) {
      showToast("Delete failed", error?.message || "Could not delete.");
    } finally {
      setAdvanceSaving(false);
    }
  };

  const openCreateAdvanceSheet = useCallback(() => {
    setSelectedAdvanceInvoice(null);
    setAdvanceDeleteConfirmOpen(false);
    setAdvanceSheetMode("create");
    setAdvanceMode("percent");
    setAdvanceInputValue(30);
    setAdvanceSuffixValue(ADVANCE_SUFFIX_DEFAULT);
    setAdvancePrimaryLabel(ADVANCE_PRIMARY_LABEL_DEFAULT);
    setAdvanceSecondaryLabel(ADVANCE_SECONDARY_LABEL_DEFAULT);
    ui.closeSheet();
    requestAnimationFrame(() => ui.openSheet(SHEET_ADVANCE));
  }, [ui]);

  const openRevertFlow = useCallback(() => {
    ui.closeSheet();
    requestAnimationFrame(() => ui.openModal(MODAL_REVERT));
  }, [ui]);

  const handleShare = async () => {
    try {
      const { shareDocument } = await import("@/components/document-view/shared/shareDocument");
      await shareDocument({ title: invoice?.invoice_number || "Invoice", text: invoice?.invoice_title || "Invoice" });
      showToast("Share successful", "Document link handled.", "success");
    } catch (err) {
      showToast("Share failed", "Could not share the document.");
    }
  };

  return {
    downloading, handleDownload, handleArchive, handleDelete, handleDuplicate, handleDownloadCsv,
    handleCopyNumber, handleToggleMergeQtyUnit, handleSaveCustomization, confirmVoidPayment,
    projectLinkOpen, setProjectLinkOpen, voiding, pendingVoidPaymentId, setPendingVoidPaymentId,
    advanceSheetMode, selectedAdvanceInvoice, advanceSaving, advancePdfGenerating, advanceDeleteConfirmOpen,
    setAdvanceDeleteConfirmOpen, advanceMode, setAdvanceMode, advanceInputValue, setAdvanceInputValue,
    advanceSuffixValue, setAdvanceSuffixValue, advancePrimaryLabel, setAdvancePrimaryLabel,
    advanceSecondaryLabel, setAdvanceSecondaryLabel, handleAdvanceSave, handleAdvanceDownload,
    handleAdvanceDelete, openAdvanceDetails, openCreateAdvanceSheet, openRevertFlow,
    handleRevertToQuotation, reverting, handleShare
  };
}
