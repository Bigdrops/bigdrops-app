import {
  formatMergedQtyUnit,
  resolveCanonicalItemImageUrl,
  resolveCanonicalLogoUrl,
} from "@/domain/documentMedia";
import {
  BUILTIN_COLUMNS,
  normalizeInvoicePdfTemplateId,
  normalizeAdditionalFieldEntries,
} from "@/domain/invoice";
import { isIntrinsicPaletteTemplate } from "@/domain/invoice/types";
import { resolveCommercialDesignPreset } from "@/domain/pdf/customization/commercial";
import { userDownloadLocationLabel } from "@/lib/native/fileDownload";

export type QuotationPdfGenerationParams = {
  quotation: any;
  id: string;
  items: any[];
  settings: any;
  customFields: Record<string, any>;
  companyPreviewLines: string[];
  clientPreviewLines: string[];
  client: any;
  pdfOutput: any;
  previewModel: any;
  previewTotals: any[];
};

export async function buildQuotationPdfPayload(input: QuotationPdfGenerationParams) {
  const {
    quotation, id, items, settings, customFields, companyPreviewLines,
    clientPreviewLines, client, pdfOutput, previewModel, previewTotals,
  } = input;

  const {
    buildPdfRowCells,
    interpretPdfTableSettings,
  } = await import("@/components/pdf");
  const savedColumns = Array.isArray(customFields?.columnConfig) ? customFields.columnConfig : BUILTIN_COLUMNS;
  const templateId = normalizeInvoicePdfTemplateId(customFields?.pdfTemplateId) || "industry";
  const rawDesignPreset = resolveCommercialDesignPreset("quotation");
  // Intrinsic-palette templates own their color scheme. Suppress any
  // previously saved custom accent so it cannot bleed into their palette.
  const pdfDesignPreset = isIntrinsicPaletteTemplate(templateId)
    ? { ...rawDesignPreset, useCustomColors: false }
    : rawDesignPreset;
  const resolvedTable = interpretPdfTableSettings(savedColumns as any, {
    mergeQtyUnit: customFields?.mergeQtyUnit === true,
    items: Array.isArray(items) ? items : [],
    landscapeLayout: pdfOutput?.landscapeLayout === true,
    templateId,
  });
  const referenceLinks = Array.isArray(customFields.attachments)
    ? customFields.attachments
        .filter((entry: any) => entry?.url)
        .map((entry: any, index: number) => ({
          label: String(entry.label || entry.name || `Reference ${index + 1}`),
          url: String(entry.url),
        }))
    : [];

  const rawAdditionalFields = normalizeAdditionalFieldEntries(
    customFields?.additionalFields,
    customFields?.bottom,
  );
  const validAdditionalFields = rawAdditionalFields
    .filter((field: any) => Boolean((field?.label && String(field.label).trim()) || (field?.value && String(field.value).trim())))
    .map((field: any) => ({
      label: String(field.label || "").trim(),
      value: String(field.value || "").trim(),
    }));

  return {
    model: {
      identity: {
        id: String(quotation.id || id),
        kind: "quotation" as const,
        number: String(quotation.quotation_number || "quotation"),
        title: String(quotation.quotation_title || "Quotation"),
        issueDate: String(quotation.issue_date || ""),
        validUntil: String(quotation.valid_until || ""),
        poNumber: String(quotation.po_number || ""),
        status: String(quotation.status || ""),
      },
      issuer: {
        label: "From",
        name: String(settings?.company_name || ""),
        addressLines: companyPreviewLines,
        phone: String(settings?.company_phone || ""),
        email: String(settings?.company_email || ""),
        taxId: String(settings?.company_vat || ""),
        website: String(previewModel?.companyWebsite || ""),
        customInfo: Array.isArray(previewModel?.companyCustomInfo) ? previewModel.companyCustomInfo : [],
      },
      recipient: {
        label: "Prepared For",
        name: String(quotation.client_name || ""),
        attention: String(client?.contact_person || ""),
        addressLines: clientPreviewLines,
        phone: String(client?.phone || ""),
        email: String(client?.email || ""),
      },
      headerFields: Array.isArray(previewModel?.previewDetailRows) ? previewModel.previewDetailRows : [],
      columns: resolvedTable.columns,
      pageLayout: resolvedTable.pageLayout,
      mergeQtyUnit: resolvedTable.mergeQtyUnit,
      items: (Array.isArray(items) ? items : []).map((item, index) => ({
        id: String(item.id || item._uiKey || index),
        rowType: (item.row_type === "group_header" ? "group_header" : "line") as "line" | "group_header",
        groupLabel: item.group_name || null,
        groupId: item.group_id || null,
        description: item.description || "",
        subDescription: item.sub_description || "",
        make: item.make || "",
        quantity: item.quantity ?? null,
        unit: item.unit || "",
        unitPrice: item.unit_price ?? 0,
        installRate: item.install_rate ?? null,
        vatRate: item.vat_rate ?? null,
        discountRate: item.discount_rate ?? null,
        amount: item.amount ?? Number(item.quantity || 0) * Number(item.unit_price || 0),
        imageUrl: resolveCanonicalItemImageUrl(item),
        cells: item.row_type === "group_header" ? undefined : buildPdfRowCells(item, resolvedTable.columns, {
          mergeQtyUnit: resolvedTable.mergeQtyUnit,
          configuredColumns: resolvedTable.configuredColumns,
        }),
        customData: {
          ...(item.custom_data || {}),
          ...(item.row_type === "group_header" ? {
            showSubtotal: customFields?.groupMeta?.[item.group_id]?.showSubtotal === true,
          } : {}),
        },
      })),
      totals: {
        rows: (Array.isArray(previewTotals) ? previewTotals : []).map((row) => ({
          key: String(row.label || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          label: String(row.label || ""),
          amount: row.rawAmount ?? (Number(String(row.value || "0").replace(/[^\d.-]/g, "")) || 0),
          emphasis: row.emphasis === true,
        })),
        amountInWords: String(previewModel?.previewAmountInWords || ""),
      },
      notes: quotation.notes
        ? {
            title: String(customFields?.notesTitle || "Notes"),
            content: quotation.notes,
            format: "html" as const,
          }
        : null,
      terms: quotation.terms
        ? {
            title: String(customFields?.termsTitle || "Terms and Conditions"),
            content: quotation.terms,
            format: "html" as const,
          }
        : null,
      additionalSections: validAdditionalFields.map((field: any) => ({
        title: field.label,
        content: field.value,
      })),
      additionalFields: validAdditionalFields,
      referenceLinks,
      signature: previewModel.signatory
        ? {
            name: previewModel.signatory.name || "",
            role: previewModel.signatory.role || "",
            imageUrl: previewModel.signatory.signatureUrl || "",
          }
        : null,
      logo: {
        imageUrl: resolveCanonicalLogoUrl(settings),
        altText: String(settings?.company_name || ""),
      },
      footerText: pdfOutput.showFooter ? String(settings?.footer_text || "") : "",
      tagline: pdfOutput.showTagline ? String(settings?.company_tagline || "") : "",
      metaFooter: { companyName: String(settings?.company_name || "") },
      template: { designPreset: pdfDesignPreset },
    },
    templateId,
    compact: pdfOutput.compact === true,
  };
}

export async function getQuotationPdfBlob(input: QuotationPdfGenerationParams): Promise<{ blob: Blob; filename: string }> {
  const payload = await buildQuotationPdfPayload(input);
  const { generateQuotationPdfBlob } = await import("@/components/pdf");
  return generateQuotationPdfBlob(payload);
}

export async function handleDownloadQuotationPdf(input: QuotationPdfGenerationParams & {
  showToast: (title: string, description: string, tone?: "info" | "success") => void;
  setDownloading: (v: boolean) => void;
}) {
  const { showToast, setDownloading, ...params } = input;
  setDownloading(true);
  try {
    const payload = await buildQuotationPdfPayload(params);
    const { generateQuotationPdf } = await import("@/components/pdf");
    await generateQuotationPdf(payload);
    showToast("Download ready", `Quotation PDF saved to ${userDownloadLocationLabel()}.`, "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate the quotation PDF.";
    showToast("Download failed", message);
  } finally {
    setDownloading(false);
  }
}
