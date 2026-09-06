import { useEffect, useMemo, useState } from "react";
import { Download, Edit3, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { QuotationActivityCard } from "@/components/document-view/quotation/QuotationActivityCard";
import QuotationDocumentPreview from "@/components/document-view/quotation/QuotationDocumentPreview";
import { useDocumentUIState } from "@/components/document-view/hooks/useDocumentUIState";
import QuotationMoreSheet from "@/components/document-view/quotation/QuotationMoreSheet";
import QuotationViewPage from "@/components/document-view/quotation/QuotationViewPage";
import DocumentConfirmDialog from "@/components/document-view/shared/DocumentConfirmDialog";
import DocumentPage from "@/components/document-view/shared/DocumentPage";
import DocumentSheet from "@/components/document-view/shared/DocumentSheet";
import DocumentCustomizeCard from "@/components/document-view/shared/DocumentCustomizeCard";
import CommercialTemplatePicker from "@/components/document-view/shared/CommercialTemplatePicker";
import type { RelatedDocumentItem } from "@/components/document-view/shared/DocumentRelatedDocsSection";
import FloatingDownloadButton from "@/components/document-view/shared/FloatingDownloadButton";
import DocumentTopNav from "@/components/document-view/shared/DocumentTopNav";

import "@/components/document-view/shared/documentViewTheme.css";
import { CenteredSpinner } from "@/components/loading/AppLoadingStates";
import { normalizeInvoicePdfTemplateId } from "@/domain/invoice";
import type { BaseDocument } from "@/components/document-view/types/documentView";
import { formatQuotationStatus } from "@/components/quotation/quotationStatus";
import { getQuotationDocumentRelations } from "@/domain/documentRelationships";
import ProjectLinkDialog from "@/components/document/ProjectLinkDialog";

import { useQuotationViewData } from "@/hooks/useQuotationViewData";
import { useQuotationActions } from "@/hooks/useQuotationActions";
import { usePdfCustomization } from "@/domain/pdf/customization/hooks";
import { COMMERCIAL_CAPABILITIES, COMMERCIAL_POLICY, COMMERCIAL_TEMPLATE_DEFAULTS, persistCommercialDesignPreset, resolveCommercialDocumentFamily } from "@/domain/pdf/customization/commercial";
import { PDF_ACCENT_SWATCHES } from "@/lib/pdfDesignPreset";
import type { PdfDesignPresetDocument } from "@/lib/pdfDesignPreset";
import type { PdfOutputSettingsValue } from "@/components/PdfOutputSettings";
import { buildQuotationPreviewModel } from "@/domain/quotation/previewModel";
import { handleDownloadQuotationPdf } from "@/domain/quotation/pdfDownloadHandler";

import styles from "@/components/document-view/quotation/QuotationActionRow.module.css";

const SHEET_CUSTOMIZE = "customize-output";
const SHEET_MORE = "more-actions";
const MODAL_CONVERT = "convert";
const MODAL_DELETE = "delete";
const MODAL_ARCHIVE = "archive";

function buildDownloadHandler(
  data: ReturnType<typeof useQuotationViewData>,
  actions: ReturnType<typeof useQuotationActions>,
  previewModel: ReturnType<typeof buildQuotationPreviewModel>,
) {
  return () => {
    void handleDownloadQuotationPdf({
      quotation: data.quotation,
      id: data.id!,
      items: data.items,
      settings: data.settings,
      customFields: data.customFields,
      companyPreviewLines: previewModel.companyPreviewLines,
      clientPreviewLines: previewModel.clientPreviewLines,
      client: data.client,
      pdfOutput: data.pdfOutput,
      previewModel,
      previewTotals: previewModel.previewTotals,
      showToast: actions.showToast,
      setDownloading: actions.setDownloading,
    });
  };
}

export default function ViewQuotation() {
  const navigate = useNavigate();
  const ui = useDocumentUIState();
  const [projectLinkOpen, setProjectLinkOpen] = useState(false);

  const data = useQuotationViewData();
  const {
    id, loading, quotation, items, totals, client, settings,
    bankAccounts, customFields, resolvedSignatory, pdfOutput,
    linkedProject, refreshQuotation,
  } = data;

  const actions = useQuotationActions({
    quotation, id: id!, items, totals, customFields,
    setCustomFields: data.setCustomFields,
    setPdfOutput: data.setPdfOutput,
    setQuotation: data.setQuotation,
    refreshQuotation, pdfOutput, ui,
  });

  // ── PDF customization engine (accent color, document font, ink) ──
  const docFamily = resolveCommercialDocumentFamily('quotation' as PdfDesignPresetDocument);
  const { customization, setAccentColor, setAccentEnabled, setDocumentFont, setInkFont, setInkColour } = usePdfCustomization({
    documentFamily: docFamily,
    templateDefaults: COMMERCIAL_TEMPLATE_DEFAULTS,
    capabilities: COMMERCIAL_CAPABILITIES,
    policy: COMMERCIAL_POLICY,
  });

  // ── Local draft state for the customize card ──
  const [draftTemplateId, setDraftTemplateId] = useState<string>(
    () => normalizeInvoicePdfTemplateId(customFields?.pdfTemplateId) || "industry",
  );
  const [draftPdfOutput, setDraftPdfOutput] = useState<PdfOutputSettingsValue>(pdfOutput);

  // Resync drafts when the sheet opens so inline page edits are not overwritten.
  const customizeOpen = ui.isSheetOpen(SHEET_CUSTOMIZE);
  useEffect(() => {
    if (!customizeOpen) return;
    setDraftTemplateId(normalizeInvoicePdfTemplateId(customFields?.pdfTemplateId) || "industry");
    setDraftPdfOutput(pdfOutput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customizeOpen]);

  const handleSave = async () => {
    persistCommercialDesignPreset('quotation', customization);
    await actions.handleSaveCustomization(draftPdfOutput, undefined, draftTemplateId as any);
    ui.closeSheet();
  };

  const previewModel = useMemo(
    () => buildQuotationPreviewModel({
      quotation, items, totals, client, settings, bankAccounts,
      customFields, resolvedSignatory, pdfOutput, linkedProject,
    }),
    [quotation, items, totals, client, settings, bankAccounts, customFields, resolvedSignatory, pdfOutput, linkedProject],
  );

  const downloadPdf = buildDownloadHandler(data, actions, previewModel);

  const relatedDocuments = useMemo<RelatedDocumentItem[]>(() => {
    const relations = getQuotationDocumentRelations(quotation);
    const nextItems: RelatedDocumentItem[] = [];

    if (relations.source && (relations.source.id || relations.source.number)) {
      const sourceType = relations.source.type === "invoice" ? "Invoice" : "Quotation";
      nextItems.push({
        id: String(relations.source.id || relations.source.number || "source"),
        title: `${sourceType} ${relations.source.number || relations.source.id || "Linked source"}`,
        subtitle: "Source document",
        kind: relations.source.type === "quotation" ? "quotation" : "document",
        onClick: relations.source.id
          ? () => navigate(`/${relations.source?.type === "invoice" ? "invoices" : "quotations"}/${relations.source?.id}`)
          : undefined,
      });
    }

    if (Array.isArray(relations.derived)) {
      relations.derived
        .filter((entry) => entry && typeof entry === "object" && (entry.id || entry.number))
        .forEach((entry, index) => {
          const isQuotation = entry.type === "quotation";
          nextItems.push({
            id: String(entry.id || `${entry.type || "document"}-${index}`),
            title: `${isQuotation ? "Quotation" : "Invoice"} ${entry.number || entry.id || "Linked document"}`,
            subtitle: isQuotation ? "Derived quotation" : "Generated invoice",
            kind: isQuotation ? "quotation" : "document",
            onClick: entry.id ? () => navigate(`/${isQuotation ? "quotations" : "invoices"}/${entry.id}`) : undefined,
          });
        });
    }

    if (linkedProject?.id || linkedProject?.name || quotation?.project_id) {
      nextItems.push({
        id: String(linkedProject?.id || quotation?.project_id || "project"),
        title: linkedProject?.name || "Linked project",
        subtitle: "Project connected to this quotation",
        kind: "project",
        onClick: linkedProject?.id ? () => navigate(`/projects/${linkedProject.id}`) : undefined,
      });
    }

    return nextItems;
  }, [linkedProject?.id, linkedProject?.name, navigate, quotation, quotation?.project_id]);

  const previewControls = null;

  if (loading) {
    return (
      <DocumentPage topNav={<DocumentTopNav title="Opening Quotation..." backLabel="Quotations" onBack={() => navigate("/quotations")} />}>
        <CenteredSpinner />
      </DocumentPage>
    );
  }

  if (!quotation) return null;

  const docProps: BaseDocument = {
    id: quotation.id,
    number: quotation.quotation_number,
    title: quotation.quotation_title || "",
    status: (quotation.status || "open") as any,
  };

  return (
    <>
      <DocumentPage
        topNav={
          <DocumentTopNav
            title={docProps.number}
            subtitle={quotation.quotation_title || undefined}
            backLabel="Quotations"
            onBack={() => navigate("/quotations")}
            onShare={() => void actions.handleShare()}
            onCustomize={() => ui.openSheet(SHEET_CUSTOMIZE)}
            onMore={() => ui.openSheet(SHEET_MORE)}
            customizeIcon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
              </svg>
            }
          />
        }
        actionRow={
          <div className={styles.actionRow}>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => ui.openModal(MODAL_CONVERT)}>
              <Zap size={14} strokeWidth={2.5} fill="currentColor" />
              <span>Convert to Invoice</span>
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => navigate(`/quotations/edit/${id}`)}>
              <Edit3 size={14} strokeWidth={2} />
              <span>Edit</span>
            </button>
            <button type="button" className={styles.btnPill} onClick={downloadPdf} disabled={actions.downloading} title="Download PDF">
              <Download size={17} strokeWidth={2} />
            </button>
          </div>
        }
        floating={<FloatingDownloadButton onClick={downloadPdf} disabled={actions.downloading} />}
        overlays={
          <>
            <DocumentSheet
              open={ui.isSheetOpen(SHEET_CUSTOMIZE)} onClose={ui.closeSheet}
              title="Customize Quotation PDF"
              subtitle="These controls update the same PDF output settings used by quotation download."
            >
              <DocumentCustomizeCard
                customization={customization}
                setDocumentFont={setDocumentFont}
                setInkFont={setInkFont}
                setInkColour={setInkColour}
                templatePicker={
                  <CommercialTemplatePicker
                    value={draftTemplateId}
                    onChange={setDraftTemplateId}
                  />
                }
                colorSwatches={[]}
                customColor="auto"
                onCustomColorChange={() => {}}
                handwritingFonts={[]}
                customFont="auto"
                onCustomFontChange={() => {}}
                showAccentColor
                accentColor={customization.accentColor}
                accentEnabled={customization.accentEnabled}
                onAccentColorChange={setAccentColor}
                onAccentEnabledChange={(enabled) => {
                  setAccentEnabled(enabled)
                  if (enabled) setAccentColor(PDF_ACCENT_SWATCHES[0])
                }}
                accentColorSwatches={PDF_ACCENT_SWATCHES}
                showCompact
                compact={draftPdfOutput?.compact ?? false}
                onCompactChange={(compact) =>
                  setDraftPdfOutput((prev: PdfOutputSettingsValue) => ({ ...prev, compact }))
                }
                showLandscape
                landscape={draftPdfOutput?.landscapeLayout ?? false}
                onLandscapeChange={(landscapeLayout) =>
                  setDraftPdfOutput((prev: PdfOutputSettingsValue) => ({ ...prev, landscapeLayout }))
                }
                onSave={handleSave}
              />
            </DocumentSheet>
            <QuotationMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)} onClose={ui.closeSheet}
              onConvertToInvoice={() => ui.openModal(MODAL_CONVERT)} onLinkProject={() => setProjectLinkOpen(true)}
              onDuplicate={() => void actions.handleDuplicate()} onCopyNumber={actions.handleCopyNumber}
              onExportCsv={actions.handleDownloadCsv} onArchive={() => ui.openModal(MODAL_ARCHIVE)} onDelete={() => ui.openModal(MODAL_DELETE)}
            />
            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_CONVERT)} title="Convert to Invoice?"
              description="This will generate a new unpaid invoice based on this quotation. The quotation will be marked as converted."
              cancelLabel="Cancel" confirmLabel={actions.converting ? "Converting..." : "Convert to Invoice"}
              loading={actions.converting} onConfirm={() => void actions.handleConvertToInvoice()} onCancel={ui.closeModal}
            />
            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)} title="Archive Quotation?"
              description={`${docProps.number} will be moved to your archive. It won't appear in your active list but remains accessible.`}
              cancelLabel="Cancel" confirmLabel={actions.archiving ? "Archiving..." : "Archive"}
              loading={actions.archiving} onConfirm={() => void actions.handleArchive()} onCancel={ui.closeModal}
            />
            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)} title="Delete Quotation?"
              description={`${docProps.number} will be permanently deleted. This cannot be undone.`}
              cancelLabel="Cancel" confirmLabel={actions.deleting ? "Deleting..." : "Delete"}
              loading={actions.deleting} destructive
              onConfirm={() => void actions.handleDelete()} onCancel={ui.closeModal}
            />
            <ProjectLinkDialog
              open={projectLinkOpen} onOpenChange={setProjectLinkOpen}
              tableName="quotations" recordId={String(id || "")} documentLabel={docProps.number || "Quotation"}
              onLinked={() => refreshQuotation()}
            />
          </>
        }
      >
        <QuotationViewPage
          document={docProps}
          documentPreview={
            <QuotationDocumentPreview
              quotation={quotation}
              viewModel={{ statusLabel: formatQuotationStatus(quotation?.status) }}
              previewModel={previewModel}
              settingsData={settings}
            />
          }
          previewControls={previewControls}
          bankAccounts={previewModel.previewBankAccounts || bankAccounts}
          pdfOutput={pdfOutput}
          onOutputChange={actions.handleInlinePdfOutputChange}
          onCustomize={() => ui.openSheet(SHEET_CUSTOMIZE)}
          selectedBankId={pdfOutput?.bankAccountId}
          onBankAccountSelect={(bankId) => actions.handleSaveCustomization({ ...pdfOutput, bankAccountId: bankId } as any)}
          relatedDocuments={relatedDocuments}
          activityHistory={<QuotationActivityCard documentId={quotation.id} />}
          attachments={previewModel.quotationAttachments}
          onConvert={() => ui.openModal(MODAL_CONVERT)}
          onEdit={() => navigate(`/quotations/edit/${id}`)}
          onDuplicate={() => void actions.handleDuplicate()}
          onDownload={downloadPdf}
          onCopyNumber={actions.handleCopyNumber}
        />
      </DocumentPage>
    </>
  );
}
