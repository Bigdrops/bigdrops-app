import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PdfOutputSettingsValue } from "@/components/PdfOutputSettings";
import { normalizeInvoicePdfTemplateId } from "@/domain/invoice";
import type { InvoicePdfTemplateId } from "@/domain/invoice/types";
import { shareDocument } from "@/components/document-view/shared/shareDocument";
import { feedback } from "@/lib/feedback";
import { supabase } from "@/supabase";
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
    const { error } = await supabase
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
    downloadQuotationCsvFile({ quotation, items, totals });
    showToast("CSV downloaded", "Quotation CSV exported.", "success");
  };

  const handleUpdateStatus = async (status: string, successLabel: string) => {
    if (!id || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      await updateQuotationStatus(id, status);
      await refreshQuotation();
      showToast(successLabel, `Quotation marked as ${status}.`, "success");
    } catch (error) {
      showToast("Update failed", error instanceof Error ? error.message : "Could not update status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDuplicate = async () => {
    if (!quotation || duplicating) return;
    setDuplicating(true);
    try {
      const createdQuotation = await duplicateQuotationRecord({ quotation, items, prefixes: settings?.document_prefixes });
      navigate(`/quotations/${createdQuotation.id}`);
    } catch (error) {
      showToast("Clone failed", error instanceof Error ? error.message : "Could not duplicate this quotation.");
    } finally {
      setDuplicating(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!quotation || converting || !id) return;
    setConverting(true);
    try {
      const createdInvoice = await convertQuotationToInvoice({ id, quotation, items, prefixes: settings?.document_prefixes });
      navigate(`/invoices/${createdInvoice.id}`);
    } catch (error) {
      showToast("Conversion failed", error instanceof Error ? error.message : "Could not convert this quotation.");
    } finally {
      ui.closeModal();
      setConverting(false);
    }
  };

  const handleArchive = async () => {
    if (!id || archiving) return;
    setArchiving(true);
    try {
      await archiveQuotationRecord(id);
      navigate("/quotations");
    } catch (error) {
      showToast("Archive failed", error instanceof Error ? error.message : "Could not archive this quotation.");
    } finally {
      setArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || deleting) return;
    setDeleting(true);
    try {
      await deleteQuotationRecord(id);
      navigate("/quotations");
    } catch (error) {
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
