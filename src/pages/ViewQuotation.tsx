import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Zap } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import {
  PdfBankControls,
  PdfDocumentOptionsCard,
  PdfOutputSettingsValue,
} from "@/components/PdfOutputSettings";
import AuditTrailPanel from "@/components/audit/AuditTrailPanel";
import { QuotationActivityCard } from "@/components/document-view/quotation/QuotationActivityCard";
import QuotationDocumentPreview from "@/components/document-view/quotation/QuotationDocumentPreview";
import PdfOutputCustomizeSheet from "@/components/document-view/shared/PdfOutputCustomizeSheet";
import { useDocumentUIState } from "@/components/document-view/hooks/useDocumentUIState";
import QuotationMoreSheet from "@/components/document-view/quotation/QuotationMoreSheet";
import QuotationViewPage from "@/components/document-view/quotation/QuotationViewPage";
import DocumentConfirmDialog from "@/components/document-view/shared/DocumentConfirmDialog";
import DocumentPage from "@/components/document-view/shared/DocumentPage";
import type { RelatedDocumentItem } from "@/components/document-view/shared/DocumentRelatedDocsSection";
import FloatingDownloadButton from "@/components/document-view/shared/FloatingDownloadButton";
import DocumentTopNav from "@/components/document-view/shared/DocumentTopNav";

import { shareDocument } from "@/components/document-view/shared/shareDocument";
import "@/components/document-view/shared/documentViewTheme.css";
import { CenteredSpinner } from "@/components/loading/AppLoadingStates";
import { getPdfSummaryLabels } from "@/domain/document/pdfSummaryLabels";
import {
  formatMergedQtyUnit,
  resolveCanonicalItemImageUrl,
  resolveCanonicalLogoUrl,
} from "@/domain/documentMedia";
import {
  BUILTIN_COLUMNS,
  buildSummaryRows,
  normalizeInvoicePdfTemplateId,
} from "@/domain/invoice";
import type { InvoicePdfTemplateId } from "@/domain/invoice/types";
import { resolveDocumentSignatory } from "@/domain/invoice/previewModel";
import type { BaseDocument } from "@/components/document-view/types/documentView";
import { feedback } from "@/lib/feedback";
import { formatNaira } from "@/lib/formatters/money";
import {
  getPdfDesignPreset,
  resolvePdfWebFontFamily,
} from "@/lib/pdfDesignPreset";
import { renderRichTextContent } from "@/lib/richText";
import { supabase } from "@/supabase";
import ProjectLinkDialog from "@/components/document/ProjectLinkDialog";
import { formatQuotationStatus } from "@/components/quotation/quotationStatus";
import {
  fetchProjectSummary,
  getQuotationDocumentRelations,
} from "@/domain/documentRelationships";
import {
  archiveQuotationRecord,
  convertQuotationToInvoice,
  deleteQuotationRecord,
  downloadQuotationCsvFile,
  duplicateQuotationRecord,
  loadQuotationViewData,
  updateQuotationStatus,
} from "./viewQuotationActions";

const SHEET_CUSTOMIZE = "customize-output";
const SHEET_MORE = "more-actions";
const MODAL_CONVERT = "convert";
const MODAL_DELETE = "delete";
const MODAL_ARCHIVE = "archive";

const defaultPdfOutput: PdfOutputSettingsValue = {
  showBankDetails: true,
  bankAccountId: null,
  showFooter: true,
  showTagline: true,
  showBalanceDue: false,
  showAmountInWords: true,
  showVatPercentage: true,
  showWhtPercentage: true,
  showDiscountPercentage: true,
};

function renderRichText(value?: string) {
  return renderRichTextContent(value);
}

function resolvePreviewLineAmount(item: any) {
  return Number(
    item.amount ?? Number(item.quantity || 0) * Number(item.unit_price || 0),
  );
}

function resolveGroupSubtotal(
  items: any[],
  groupId: string | null | undefined,
) {
  if (!groupId) return 0;
  return items.reduce((subtotal, item) => {
    if (item?.row_type === "group_header") return subtotal;
    if (item?.group_id !== groupId) return subtotal;
    return subtotal + resolvePreviewLineAmount(item);
  }, 0);
}

export default function ViewQuotation() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const ui = useDocumentUIState();

  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [resolvedSignatory, setResolvedSignatory] =
    useState<ReturnType<typeof resolveDocumentSignatory>>(null);
  const [pdfOutput, setPdfOutput] =
    useState<PdfOutputSettingsValue>(defaultPdfOutput);
  const [downloading, setDownloading] = useState(false);
  const [projectLinkOpen, setProjectLinkOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [linkedProject, setLinkedProject] = useState<{
    id: string;
    name?: string | null;
  } | null>(null);

  useEffect(() => {
    const loadQuotation = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await loadQuotationViewData(id);
        if (!data) {
          navigate("/quotations");
          return;
        }

        setQuotation(data.quotation);
        setItems(data.items);
        setTotals(data.totals);
        setClient(data.client);
        setSettings(data.settings);
        setBankAccounts(data.bankAccounts);
        setResolvedSignatory(data.signatory || null);
        setCustomFields(data.customFields);
        setPdfOutput({
          ...defaultPdfOutput,
          ...(data.customFields?.pdfOutput || {}),
          showBalanceDue: false,
        });
        setLinkedProject(
          data.quotation?.project_id
            ? await fetchProjectSummary(data.quotation.project_id)
            : null,
        );
      } catch (err) {
        console.error("Failed to load quotation", err);
      } finally {
        setLoading(false);
      }
    };

    void loadQuotation();
  }, [id, navigate]);

  const refreshQuotation = async () => {
    if (!id) return;
    const data = await loadQuotationViewData(id);
    if (!data) return;
    setQuotation(data.quotation);
    setItems(data.items);
    setTotals(data.totals);
    setClient(data.client);
    setSettings(data.settings);
    setBankAccounts(data.bankAccounts);
    setResolvedSignatory(data.signatory || null);
    setCustomFields(data.customFields);
    setLinkedProject(
      data.quotation?.project_id
        ? await fetchProjectSummary(data.quotation.project_id)
        : null,
    );
  };

  const showToast = (
    title: string,
    description: string,
    tone: "info" | "success" = "info",
  ) => {
    const options = { description };

    if (tone === "success") {
      feedback.success(title, options);
      return;
    }

    feedback.info(title, options);
  };

  const handleCopyNumber = async () => {
    if (!quotation?.quotation_number) return;
    try {
      await navigator.clipboard.writeText(quotation.quotation_number);
      showToast(
        "Quotation number copied",
        quotation.quotation_number,
        "success",
      );
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
        result === "shared"
          ? "Quotation share is ready."
          : "Quotation link copied.",
        "success",
      );
    } catch (error) {
      showToast(
        "Share failed",
        error instanceof Error
          ? error.message
          : "Could not share this quotation.",
      );
    }
  };

  const handleSaveCustomization = async (
    nextPdfOutput: PdfOutputSettingsValue,
    _nextPreset?: unknown,
    nextTemplateId?: InvoicePdfTemplateId,
  ) => {
    if (!quotation || !id) return;

    const currentTemplateId =
      normalizeInvoicePdfTemplateId(customFields?.pdfTemplateId) || "industry";
    const targetTemplateId = nextTemplateId || currentTemplateId;

    const nextCustomFields = {
      ...customFields,
      pdfOutput: nextPdfOutput,
      pdfTemplateId: targetTemplateId,
    };
    const { error } = await supabase
      .from("quotations")
      .update({ custom_fields: JSON.stringify(nextCustomFields) })
      .eq("id", id);
    if (error) throw error;
    setCustomFields(nextCustomFields);
    setPdfOutput(nextPdfOutput);
    setQuotation((current: any) =>
      current ? { ...current, custom_fields: nextCustomFields } : current,
    );
    showToast(
      "Settings saved",
      "Quotation PDF output settings updated.",
      "success",
    );
  };

  const handleInlinePdfOutputChange = useCallback(
    (nextPdfOutput: PdfOutputSettingsValue) => {
      void handleSaveCustomization(nextPdfOutput);
    },
    [handleSaveCustomization],
  );

  const previewBankAccounts = (
    Array.isArray(bankAccounts) ? bankAccounts : []
  ).map((account) => ({
    id: account.id,
    bankName: account.bank_name || "",
    accountName: account.account_name || "",
    accountNumber: account.account_number || "",
    sortCode: account.sort_code || "",
    isDefault: account.is_default === true,
  }));

  const selectedPreviewBank =
    previewBankAccounts.find(
      (account) => account.id === pdfOutput.bankAccountId,
    ) ||
    previewBankAccounts.find((account) => account.isDefault) ||
    previewBankAccounts[0] ||
    null;

  const companyLines = [
    settings?.company_address,
    [settings?.company_city, settings?.company_state]
      .filter(Boolean)
      .join(", "),
    settings?.company_phone,
    settings?.company_email,
  ].filter(Boolean);

  const clientLines = [
    client?.contact_person ? `Attn: ${client.contact_person}` : null,
    client?.address || null,
    [client?.city, client?.state].filter(Boolean).join(", "),
    client?.phone || null,
    client?.email || null,
  ].filter(Boolean);

  const previewDetailRows = [
    { label: "Client", value: quotation?.client_name || "Unassigned" },
    { label: "PO Number", value: quotation?.po_number || "" },
    ...(quotation?.quotation_title
      ? [{ label: "Title", value: quotation.quotation_title }]
      : []),
    ...(Array.isArray(customFields.header) ? customFields.header : [])
      .filter((field: any) => field?.label && field?.value)
      .map((field: any) => ({
        label: String(field.label),
        value: String(field.value),
      })),
  ].filter((row) => String(row.value || "").trim().length > 0);

  const previewItems = (Array.isArray(items) ? items : [])
    .map((item, index, sourceItems) => {
      if (item.row_type === "group_header") {
        const groupId = item.group_id || null;
        const showSubtotal =
          customFields?.groupMeta?.[groupId || ""]?.showSubtotal === true;
        const nextItems: any[] = [
          { type: "group", label: item.group_name || `Group ${index + 1}` },
        ];
        const nextItem = sourceItems[index + 1];
        const shouldCloseImmediately =
          !nextItem ||
          nextItem.row_type === "group_header" ||
          nextItem.group_id !== groupId;
        if (shouldCloseImmediately) {
          nextItems.push({
            type: "group_footer",
            showSubtotal,
            value: showSubtotal
              ? formatNaira(resolveGroupSubtotal(sourceItems, groupId))
              : "",
          });
        }
        return nextItems;
      }

      const nextItems: any[] = [
        {
          type: "line",
          label: item.description || "Untitled item",
          detail: item.sub_description || "",
          imageUrl: resolveCanonicalItemImageUrl(item),
          value: formatNaira(
            item.amount ||
              Number(item.quantity || 0) * Number(item.unit_price || 0),
          ),
          facts: [
            item.quantity
              ? `Qty: ${formatMergedQtyUnit(item.quantity, item.unit)}`
              : null,
            `Rate: ${formatNaira(item.unit_price || 0)}`,
            item.make ? `Make: ${item.make}` : null,
          ].filter(Boolean),
        },
      ];

      const groupId = item.group_id || null;
      const nextItem = sourceItems[index + 1];
      const groupEndsHere =
        groupId &&
        (!nextItem ||
          nextItem.row_type === "group_header" ||
          nextItem.group_id !== groupId);
      if (groupEndsHere) {
        const showSubtotal =
          customFields?.groupMeta?.[groupId]?.showSubtotal === true;
        nextItems.push({
          type: "group_footer",
          showSubtotal,
          value: showSubtotal
            ? formatNaira(resolveGroupSubtotal(sourceItems, groupId))
            : "",
        });
      }

      return nextItems;
    })
    .flat();

  const previewSummaryLabels = getPdfSummaryLabels(quotation, pdfOutput);
  const previewTotals = [
    ...buildSummaryRows({
      invoice: quotation || {},
      totals: {
        rawSubtotal: totals?.subtotal || 0,
        vatAmount: totals?.vat || 0,
        discountAmount: totals?.discount || 0,
        whtAmount: totals?.wht || 0,
        installRateTotal: totals?.installRateTotal || 0,
      },
      customFields,
      chargeLabels: customFields?.chargeLabels,
      summaryLabels: previewSummaryLabels,
    }).map((row) => ({
      label: row.label,
      value: formatNaira(row.amount || 0),
      emphasis: false,
      valueClassName:
        row.tone === "danger"
          ? "text-[hsl(var(--bd-status-danger-text))]"
          : undefined,
    })),
    {
      label: "Total",
      value: formatNaira(totals?.totalPayable || 0),
      emphasis: true,
      valueClassName: "text-[hsl(var(--bd-text))]",
    },
  ];

  const previewNotesSections = [
    quotation?.notes
      ? {
          title: customFields.notesTitle || "Notes",
          content: renderRichText(quotation.notes),
        }
      : null,
    quotation?.terms
      ? {
          title: customFields.termsTitle || "Terms and Conditions",
          content: renderRichText(quotation.terms),
        }
      : null,
    Array.isArray(customFields.additionalFields) &&
    customFields.additionalFields.length > 0
      ? {
          title: "Additional Fields",
          content: (
            <div className="space-y-3">
              {customFields.additionalFields
                .filter((field: any) => field?.label || field?.value)
                .map((field: any, index: number) => (
                  <div key={`field-${index}`} className="grid gap-1">
                    {field.label ? (
                      <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">
                        {field.label}
                      </div>
                    ) : null}
                    <div className="whitespace-pre-wrap break-words">
                      {field.value || "—"}
                    </div>
                  </div>
                ))}
            </div>
          ),
        }
      : null,
  ].filter(Boolean);

  const previewAttachmentLinks = Array.isArray(customFields.attachments)
    ? customFields.attachments
        .filter((entry: any) => entry?.url)
        .map((entry: any, index: number) => ({
          label: String(entry.label || entry.name || `Reference ${index + 1}`),
          url: String(entry.url),
        }))
        .filter((entry: { url: string }) => entry.url)
    : [];

  const quotationAttachments = Array.isArray(customFields.attachments)
    ? customFields.attachments
        .filter((entry: any) => entry?.label || entry?.name || entry?.url)
        .map((entry: any, index: number) => ({
          id: String(entry.id || entry.url || `${index}`),
          label: String(
            entry.label || entry.name || entry.url || `Attachment ${index + 1}`,
          ),
        }))
    : [];

  const relatedDocuments = useMemo<RelatedDocumentItem[]>(() => {
    const relations = getQuotationDocumentRelations(quotation);
    const nextItems: RelatedDocumentItem[] = [];

    if (relations.source && (relations.source.id || relations.source.number)) {
      const sourceType =
        relations.source.type === "invoice" ? "Invoice" : "Quotation";
      nextItems.push({
        id: String(relations.source.id || relations.source.number || "source"),
        title: `${sourceType} ${relations.source.number || relations.source.id || "Linked source"}`,
        subtitle: "Source document",
        kind: relations.source.type === "quotation" ? "quotation" : "document",
        onClick: relations.source.id
          ? () =>
              navigate(
                `/${relations.source?.type === "invoice" ? "invoices" : "quotations"}/${relations.source?.id}`,
              )
          : undefined,
      });
    }

    if (Array.isArray(relations.derived)) {
      relations.derived
        .filter(
          (entry) =>
            entry && typeof entry === "object" && (entry.id || entry.number),
        )
        .forEach((entry, index) => {
          const isQuotation = entry.type === "quotation";
          nextItems.push({
            id: String(entry.id || `${entry.type || "document"}-${index}`),
            title: `${isQuotation ? "Quotation" : "Invoice"} ${entry.number || entry.id || "Linked document"}`,
            subtitle: isQuotation ? "Derived quotation" : "Generated invoice",
            kind: isQuotation ? "quotation" : "document",
            onClick: entry.id
              ? () =>
                  navigate(
                    `/${isQuotation ? "quotations" : "invoices"}/${entry.id}`,
                  )
              : undefined,
          });
        });
    }

    if (linkedProject?.id || linkedProject?.name || quotation?.project_id) {
      nextItems.push({
        id: String(linkedProject?.id || quotation?.project_id || "project"),
        title: linkedProject?.name || "Linked project",
        subtitle: "Project connected to this quotation",
        kind: "project",
        onClick: linkedProject?.id
          ? () => navigate(`/projects/${linkedProject.id}`)
          : undefined,
      });
    }

    return nextItems;
  }, [
    linkedProject?.id,
    linkedProject?.name,
    navigate,
    quotation,
    quotation?.project_id,
  ]);

  const previewControls = useMemo(
    () => (
      <>
        <PdfBankControls
          value={pdfOutput}
          onChange={handleInlinePdfOutputChange}
          bankAccounts={previewBankAccounts}
        />
        <PdfDocumentOptionsCard
          value={pdfOutput}
          onChange={handleInlinePdfOutputChange}
          companyTagline={String(settings?.company_tagline || "")}
          footerText={String(settings?.footer_text || "")}
        />
      </>
    ),
    [
      handleInlinePdfOutputChange,
      pdfOutput,
      previewBankAccounts,
      settings?.company_tagline,
      settings?.footer_text,
    ],
  );

  const quotationPreviewModel = useMemo(
    () => ({
      selectedPreviewBank,
      signatory: resolvedSignatory,
      companyPreviewLines: companyLines,
      clientPreviewLines: clientLines,
      previewDetailRows: previewDetailRows,
      previewItems,
      previewTotals,
      previewAmountInWords:
        pdfOutput.showAmountInWords === false
          ? ""
          : String(quotation?.amount_in_words || ""),
      previewNotesSections: [
        quotation?.notes
          ? {
              title: customFields.notesTitle || "Notes",
              kind: "html" as const,
              html: String(quotation.notes),
            }
          : null,
        quotation?.terms
          ? {
              title: customFields.termsTitle || "Terms and Conditions",
              kind: "html" as const,
              html: String(quotation.terms),
            }
          : null,
        ...(Array.isArray(customFields.additionalFields) &&
        customFields.additionalFields.length > 0
          ? [
              {
                title: "Additional Fields",
                kind: "fields" as const,
                fields: customFields.additionalFields
                  .filter((field: any) => field?.label || field?.value)
                  .map((field: any) => ({
                    label: String(field?.label || ""),
                    value: String(field?.value || ""),
                  })),
              },
            ]
          : []),
        ...(previewAttachmentLinks.length > 0
          ? [
              {
                title: "Reference Links",
                kind: "links" as const,
                links: previewAttachmentLinks,
              },
            ]
          : []),
      ].filter(Boolean),
    }),
    [
      clientLines,
      companyLines,
      customFields.additionalFields,
      customFields.attachments,
      customFields.notesTitle,
      customFields.termsTitle,
      pdfOutput.showAmountInWords,
      previewAttachmentLinks,
      previewDetailRows,
      previewItems,
      previewTotals,
      quotation?.amount_in_words,
      quotation?.notes,
      quotation?.terms,
      resolvedSignatory,
      selectedPreviewBank,
    ],
  );

  const handleDownload = async () => {
    if (!quotation || downloading) return;
    setDownloading(true);
    try {
      const {
        buildPdfRowCells,
        generateQuotationPdf,
        interpretPdfTableSettings,
      } = await import("@/components/pdf-new");
      const pdfDesignPreset = getPdfDesignPreset("quotation");
      const resolvedTable = interpretPdfTableSettings(BUILTIN_COLUMNS as any, {
        mergeQtyUnit: customFields?.mergeQtyUnit === true,
        items: Array.isArray(items) ? items : [],
      });
      const referenceLinks = Array.isArray(customFields.attachments)
        ? customFields.attachments
            .filter((entry: any) => entry?.url)
            .map((entry: any, index: number) => ({
              label: String(
                entry.label || entry.name || `Reference ${index + 1}`,
              ),
              url: String(entry.url),
            }))
        : [];

      await generateQuotationPdf({
        model: {
          identity: {
            id: String(quotation.id || id),
            kind: "quotation",
            number: String(quotation.quotation_number || "quotation"),
            title: String(quotation.quotation_title || "Quotation"),
            issueDate: String(quotation.issue_date || ""),
            validUntil: String(quotation.valid_until || ""),
            poNumber: String(quotation.po_number || ""),
            status: String(quotation.status || ""),
            currency: "NGN",
          },
          issuer: {
            label: "From",
            name: String(settings?.company_name || ""),
            addressLines: companyLines,
            phone: String(settings?.company_phone || ""),
            email: String(settings?.company_email || ""),
            taxId: String(settings?.company_vat || ""),
          },
          recipient: {
            label: "Prepared For",
            name: String(quotation.client_name || ""),
            attention: String(client?.contact_person || ""),
            addressLines: clientLines,
            phone: String(client?.phone || ""),
            email: String(client?.email || ""),
          },
          headerFields: (quotationPreviewModel.previewDetailRows || []).map(
            (row) => ({ label: row.label, value: row.value }),
          ),
          columns: resolvedTable.columns,
          mergeQtyUnit: resolvedTable.mergeQtyUnit,
          items: (Array.isArray(items) ? items : []).map((item, index) => ({
            id: String(item.id || item._uiKey || index),
            rowType: item.row_type === "group_header" ? "group_header" : "line",
            groupLabel: item.group_name || null,
            description: item.description || "",
            subDescription: item.sub_description || "",
            make: item.make || "",
            quantity: item.quantity ?? null,
            unit: item.unit || "",
            unitPrice: item.unit_price ?? 0,
            installRate: item.install_rate ?? null,
            vatRate: item.vat_rate ?? null,
            discountRate: item.discount_rate ?? null,
            amount:
              item.amount ??
              Number(item.quantity || 0) * Number(item.unit_price || 0),
            imageUrl: resolveCanonicalItemImageUrl(item),
            cells:
              item.row_type === "group_header"
                ? undefined
                : buildPdfRowCells(item, resolvedTable.columns, {
                    mergeQtyUnit: resolvedTable.mergeQtyUnit,
                    configuredColumns: resolvedTable.configuredColumns,
                  }),
            customData: item.custom_data || {},
          })),
          totals: {
            mode: "standard",
            rows: previewTotals.map((row) => ({
              key: row.label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              label: row.label,
              amount: Number(String(row.value).replace(/[^\d.-]/g, "")) || 0,
              emphasis: row.emphasis === true,
            })),
            amountInWords:
              pdfOutput.showAmountInWords === false
                ? ""
                : String(quotation.amount_in_words || ""),
          },
          bankDetails:
            pdfOutput.showBankDetails &&
            quotationPreviewModel.selectedPreviewBank
              ? quotationPreviewModel.selectedPreviewBank
              : null,
          notes: quotation.notes
            ? {
                title: customFields.notesTitle || "Notes",
                content: quotation.notes,
                format: "html",
              }
            : null,
          terms: quotation.terms
            ? {
                title: customFields.termsTitle || "Terms and Conditions",
                content: quotation.terms,
                format: "html",
              }
            : null,
          additionalSections: [],
          referenceLinks,
          signature: quotationPreviewModel.signatory
            ? {
                name: quotationPreviewModel.signatory.name || "",
                role: quotationPreviewModel.signatory.role || "",
                imageUrl: quotationPreviewModel.signatory.signatureUrl || "",
              }
            : null,
          logo: {
            imageUrl: resolveCanonicalLogoUrl(settings),
            altText: String(settings?.company_name || ""),
          },
          footerText: pdfOutput.showFooter
            ? String(settings?.footer_text || "")
            : "",
          tagline: pdfOutput.showTagline
            ? String(settings?.company_tagline || "")
            : "",
          metaFooter: { companyName: String(settings?.company_name || "") },
          template: { designPreset: pdfDesignPreset },
        },
        templateId:
          normalizeInvoicePdfTemplateId(customFields?.pdfTemplateId) ||
          "industry",
      });
      showToast("Download ready", "Quotation PDF downloaded.", "success");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not generate the quotation PDF.";
      showToast("Download failed", message);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!quotation) return;
    downloadQuotationCsvFile({ quotation, items, totals });
    showToast("CSV downloaded", "Quotation CSV exported.", "success");
  };

  const handleUpdateStatus = async (status: string, successLabel: string) => {
    if (!id) return;
    try {
      await updateQuotationStatus(id, status);
      await refreshQuotation();
      showToast(successLabel, `Quotation marked as ${status}.`, "success");
    } catch (error) {
      showToast(
        "Update failed",
        error instanceof Error ? error.message : "Could not update status.",
      );
    }
  };

  const handleDuplicate = async () => {
    if (!quotation) return;
    try {
      const createdQuotation = await duplicateQuotationRecord({
        quotation,
        items,
      });
      navigate(`/quotations/${createdQuotation.id}`);
    } catch (error) {
      showToast(
        "Clone failed",
        error instanceof Error
          ? error.message
          : "Could not duplicate this quotation.",
      );
    }
  };

  const handleConvertToInvoice = async () => {
    if (!quotation || converting || !id) return;
    setConverting(true);
    try {
      const createdInvoice = await convertQuotationToInvoice({
        id,
        quotation,
        items,
      });
      navigate(`/invoices/${createdInvoice.id}`);
    } catch (error) {
      showToast(
        "Conversion failed",
        error instanceof Error
          ? error.message
          : "Could not convert this quotation.",
      );
    } finally {
      ui.closeModal();
      setConverting(false);
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    try {
      await archiveQuotationRecord(id);
      navigate("/quotations");
    } catch (error) {
      showToast(
        "Archive failed",
        error instanceof Error
          ? error.message
          : "Could not archive this quotation.",
      );
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteQuotationRecord(id);
      navigate("/quotations");
    } catch (error) {
      showToast(
        "Delete failed",
        error instanceof Error
          ? error.message
          : "Could not delete this quotation.",
      );
    }
  };

  if (loading) {
    return (
      <DocumentPage
        topNav={
          <DocumentTopNav
            title="Loading..."
            backLabel="Quotations"
            onBack={() => navigate("/quotations")}
          />
        }
      >
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
            onShare={() => void handleShare()}
            onCustomize={() => ui.openSheet(SHEET_CUSTOMIZE)}
            onMore={() => ui.openSheet(SHEET_MORE)}
            onDownload={() => void handleDownload()}
            customizeIcon={
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
              </svg>
            }
          />
        }
        actionRow={
          <>
            <button
              type="button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "#ec652b",
                color: "#ffffff",
                flex: 1,
                justifyContent: "center",
                border: "none",
                borderRadius: 8,
                padding: "10px 18px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "-0.28px",
                whiteSpace: "nowrap" as const,
                boxShadow:
                  "rgba(0,0,0,0.1) 0px 4px 8px 0px, rgba(0,0,0,0.1) 0px 2px 4px 0px, rgba(0,0,0,0.25) 0px 1px 1px 0px",
                fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
                transition: "all 0.15s",
              }}
              onClick={() => ui.openModal(MODAL_CONVERT)}
            >
              <Zap size={14} strokeWidth={2.5} fill="currentColor" />
              <span>Convert to Invoice</span>
            </button>
            <button
              type="button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "#ffffff",
                color: "#111a4a",
                flex: 1,
                justifyContent: "center",
                border: "1px solid #111a4a",
                borderRadius: 8,
                padding: "10px 18px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "-0.28px",
                whiteSpace: "nowrap" as const,
                fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
                transition: "all 0.15s",
              }}
              onClick={() => navigate(`/quotations/edit/${id}`)}
            >
              <Edit3 size={14} strokeWidth={2} />
              <span>Edit</span>
            </button>
          </>
        }
        floating={
          <FloatingDownloadButton
            onClick={() => void handleDownload()}
            disabled={downloading}
          />
        }
        overlays={
          <>
            <PdfOutputCustomizeSheet
              open={ui.isSheetOpen(SHEET_CUSTOMIZE)}
              onClose={ui.closeSheet}
              title="Customize Quotation PDF"
              subtitle="These controls update the same PDF output settings used by quotation download."
              documentType="quotation"
              value={pdfOutput}
              bankAccounts={previewBankAccounts}
              companyTagline={String(settings?.company_tagline || "")}
              footerText={String(settings?.footer_text || "")}
              templateId={
                normalizeInvoicePdfTemplateId(customFields?.pdfTemplateId) ||
                "industry"
              }
              onSave={(nextValue, nextPreset, nextTemplateId) =>
                handleSaveCustomization(nextValue, nextPreset, nextTemplateId)
              }
            />

            <QuotationMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onConvertToInvoice={() => ui.openModal(MODAL_CONVERT)}
              onLinkProject={() => setProjectLinkOpen(true)}
              onDuplicate={() => void handleDuplicate()}
              onCopyNumber={handleCopyNumber}
              onExportCsv={handleDownloadCsv}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_CONVERT)}
              title="Convert to Invoice?"
              description="This will generate a new unpaid invoice based on this quotation. The quotation will be marked as converted."
              cancelLabel="Cancel"
              confirmLabel={converting ? "Converting..." : "Convert to Invoice"}
              confirmDisabled={converting}
              onConfirm={() => void handleConvertToInvoice()}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive Quotation?"
              description={`${docProps.number} will be moved to your archive. It won't appear in your active list but remains accessible.`}
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => void handleArchive()}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete Quotation?"
              description={`${docProps.number} will be permanently deleted. This cannot be undone.`}
              cancelLabel="Cancel"
              confirmLabel="Delete"
              destructive
              onConfirm={() => void handleDelete()}
              onCancel={ui.closeModal}
            />

            <ProjectLinkDialog
              open={projectLinkOpen}
              onOpenChange={setProjectLinkOpen}
              tableName="quotations"
              recordId={String(id || "")}
              documentLabel={docProps.number || "Quotation"}
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
              viewModel={{
                statusLabel: formatQuotationStatus(quotation?.status),
              }}
              previewModel={quotationPreviewModel}
              settingsData={settings}
            />
          }
          previewControls={previewControls}
          bankAccounts={bankAccounts}
          pdfOutput={pdfOutput}
          onOutputChange={handleInlinePdfOutputChange}
          onCustomize={() => ui.openSheet(SHEET_CUSTOMIZE)}
          relatedDocuments={relatedDocuments}
          activityHistory={<QuotationActivityCard documentId={quotation.id} />}
          attachments={quotationAttachments}
          onConvert={() => ui.openModal(MODAL_CONVERT)}
          onEdit={() => navigate(`/quotations/edit/${id}`)}
          onDuplicate={() => void handleDuplicate()}
          onDownload={() => void handleDownload()}
          onCopyNumber={handleCopyNumber}
        />
      </DocumentPage>
    </>
  );
}
