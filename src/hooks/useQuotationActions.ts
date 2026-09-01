import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PdfOutputSettingsValue } from "@/components/PdfOutputSettings";
import { normalizeInvoicePdfTemplateId } from "@/domain/invoice";
import type { InvoicePdfTemplateId } from "@/domain/invoice/types";
import { shareDocument } from "@/components/document-view/shared/shareDocument";
import { useOperation } from "@/context/OperationContext";
import { feedback } from "@/lib/feedback";
import { useEntity } from "@/lib/tenant/contexts";
import {
  archiveQuotationRecord,
  convertQuotationToInvoice,
  deleteQuotationRecord,
  downloadQuotationCsvFile,
  duplicateQuotationRecord,
  updateQuotationStatus,
} from "../pages/viewQuotationActions";
import { useSettings } from "@/hooks/useSettings";

export function useQuotationActions(input: {
  quotation: any;
  id: string;
  items: any[];
  totals: any;
  customFields: Record<string, any>;
  setCustomFields: (v: Record<string, any>) => void;
  setPdfOutput: (v: PdfOutputSettingsValue) => void;
  setQuotation: (fn: (current: any) => any) => void;
  refreshQuotation: () => Promise<void>;
  pdfOutput: PdfOutputSettingsValue;
  ui: any;
}) {
  const {
    quotation, id, items, totals, customFields, setCustomFields,
    setPdfOutput, setQuotation, refreshQuotation, ui,
  } = input;

  const navigate = useNavigate();
  const { settings } = useSettings();
  const { tenantClient, entity } = useEntity();
  const entityId = entity?.id ?? null;
  const operation = useOperation();
  const [downloading, setDownloading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const showToast = (title: string, description: string, tone: "info" | "success" = "info") => {
    const options = { description };
    if (tone === "success") { feedback.success(title, options); return; }
    feedback.info(title, options);
  };

  const handleCopyNumber = async () => {
    if (!quotation?.quotation_number) return;
    try {
      await navigator.clipboard.writeText(quotation.quotation_number);
      showToast("Quotation number copied", quotation.quotation_number, "success");
    } catch {
      showToast("Copy failed", "Clipboard access denied.");
    }
  };

  const handleShare = async () => {
    try {
      const result = await shareDocument({
        title: quotation?.quotation_number || "Quotation",
        text: quotation?.quotation_title || undefined,
      });
      showToast(
        result === "shared" ? "Share sheet opened" : "Link copied",
        result === "shared" ? "Quotation share is ready." : "Quotation link copied.",
        "success",
      );
    } catch (error) {
      showToast("Share failed", error instanceof Error ? error.message : "Could not share this quotation.");
    }
  };

  const handleSaveCustomization = async (
    nextPdfOutput: PdfOutputSettingsValue,
    _nextPreset?: unknown,
    nextTemplateId?: InvoicePdfTemplateId,
  ) => {
    if (!quotation || !id) return;
    const currentTemplateId = normalizeInvoicePdfTemplateId(customFields?.pdfTemplateId) || "industry";
    const targetTemplateId = nextTemplateId || currentTemplateId;
    const nextCustomFields = { ...customFields, pdfOutput: nextPdfOutput, pdfTemplateId: targetTemplateId };
    const { error } = await tenantClient
      .from("quotations").update({ custom_fields: JSON.stringify(nextCustomFields) }).eq("id", id);
    if (error) throw error;
    setCustomFields(nextCustomFields);
    setPdfOutput(nextPdfOutput);
    setQuotation((current) => current ? { ...current, custom_fields: nextCustomFields } : current);
    showToast("Settings saved", "Quotation PDF output settings updated.", "success");
  };

  const handleInlinePdfOutputChange = useCallback(
    (nextPdfOutput: PdfOutputSettingsValue) => { void handleSaveCustomization(nextPdfOutput); },
    [],
  );

  const handleDownloadCsv = () => {
    if (!quotation) return;
    downloadQuotationCsvFile({ quotation, items, totals, customFields });
    showToast("CSV downloaded", "Quotation CSV exported.", "success");
  };

  const handleUpdateStatus = async (status: string, successLabel: string) => {
    if (!id || updatingStatus) return;
    setUpdatingStatus(true);
    operation.start("update-status", "Updating Status", "Updating quotation status...");
    try {
      await updateQuotationStatus(id, status, tenantClient);
      await refreshQuotation();
      operation.finish("success");
      showToast(successLabel, `Quotation marked as ${status}.`, "success");
    } catch (error) {
      operation.finish("error");
      showToast("Update failed", error instanceof Error ? error.message : "Could not update status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDuplicate = async () => {
    if (!quotation || duplicating) return;
    setDuplicating(true);
    operation.start("duplicate-quotation", "Duplicating Quotation", "Creating copy...");
    try {
      const { prefill, prefillItems } = await duplicateQuotationRecord({ quotation, items });
      operation.finish("success");
      navigate('/quotations/new', {
        state: { duplicatePrefill: prefill, duplicatePrefillItems: prefillItems },
      });
    } catch (error) {
      operation.finish("error");
      showToast("Clone failed", error instanceof Error ? error.message : "Could not duplicate this quotation.");
    } finally {
      setDuplicating(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!quotation || converting || !id) return;
    setConverting(true);
    operation.start("convert-quotation", "Creating Invoice", "Transferring quotation information...");
    try {
      const createdInvoice = await convertQuotationToInvoice({ id, quotation, items, prefixes: settings?.document_prefixes }, tenantClient, entityId);
      const invoiceId = createdInvoice?.id;
      if (!invoiceId) {
        throw new Error('Conversion succeeded but the invoice ID was not returned. The invoice may exist in the invoice list.');
      }
      operation.finish("success");
      navigate(`/invoices/${invoiceId}`);
    } catch (error) {
      operation.finish("error");
      showToast("Conversion failed", error instanceof Error ? error.message : "Could not convert this quotation.");
    } finally {
      ui.closeModal();
      setConverting(false);
    }
  };

  const handleArchive = async () => {
    if (!id || archiving) return;
    setArchiving(true);
    operation.start("archive-quotation", "Archiving Document", "Updating company records...");
    try {
      await archiveQuotationRecord(id, tenantClient);
      operation.finish("success");
      navigate("/quotations");
    } catch (error) {
      operation.finish("error");
      showToast("Archive failed", error instanceof Error ? error.message : "Could not archive this quotation.");
    } finally {
      setArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || deleting) return;
    setDeleting(true);
    operation.start("delete-quotation", "Deleting Document", "Removing from records...");
    try {
      await deleteQuotationRecord(id, tenantClient);
      operation.finish("success");
      navigate("/quotations");
    } catch (error) {
      operation.finish("error");
      showToast("Delete failed", error instanceof Error ? error.message : "Could not delete this quotation.");
    } finally {
      setDeleting(false);
    }
  };

  return {
    downloading,
    setDownloading,
    converting,
    archiving,
    deleting,
    duplicating,
    updatingStatus,
    showToast,
    handleCopyNumber,
    handleShare,
    handleSaveCustomization,
    handleInlinePdfOutputChange,
    handleDownloadCsv,
    handleUpdateStatus,
    handleDuplicate,
    handleConvertToInvoice,
    handleArchive,
    handleDelete,
  };
}
