import {
  formatMergedQtyUnit,
  resolveCanonicalItemImageUrl,
  resolveCanonicalLogoUrl,
} from "@/domain/documentMedia";
import {
  BUILTIN_COLUMNS,
  normalizeInvoicePdfTemplateId,
} from "@/domain/invoice";
import { resolveCommercialDesignPreset } from "@/domain/pdf/customization/commercial";

export async function handleDownloadQuotationPdf(input: {
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
  showToast: (title: string, description: string, tone?: "info" | "success") => void;
  setDownloading: (v: boolean) => void;
}) {
  const {
    quotation, id, items, settings, customFields, companyPreviewLines,
    clientPreviewLines, client, pdfOutput, previewModel, previewTotals,
    showToast, setDownloading,
  } = input;

  setDownloading(true);
  try {
    const {
      buildPdfRowCells,
      generateQuotationPdf,
      interpretPdfTableSettings,
    } = await import("@/components/pdf-new");
    const pdfDesignPreset = resolveCommercialDesignPreset("quotation");
    const savedColumns = Array.isArray(customFields?.columnConfig) ? customFields.columnConfig : BUILTIN_COLUMNS;
    const resolvedTable = interpretPdfTableSettings(savedColumns as any, {
      mergeQtyUnit: customFields?.mergeQtyUnit === true,
      items: Array.isArray(items) ? items : [],
      landscapeLayout: pdfOutput?.landscapeLayout === true,
    });
    const referenceLinks = Array.isArray(customFields.attachments)
      ? customFields.attachments
          .filter((entry: any) => entry?.url)
          .map((entry: any, index: number) => ({
            label: String(entry.label || entry.name || `Reference ${index + 1}`),
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
        headerFields: (previewModel.previewDetailRows || []).map((row: any) => ({
          label: row.label,
          value: row.value,
        })),
        columns: resolvedTable.columns,
        pageLayout: resolvedTable.pageLayout,
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
          amount: item.amount ?? Number(item.quantity || 0) * Number(item.unit_price || 0),
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
            pdfOutput.showAmountInWords === false ? "" : String(quotation.amount_in_words || ""),
        },
        bankDetails:
          pdfOutput.showBankDetails && previewModel.selectedPreviewBank
            ? previewModel.selectedPreviewBank
            : null,
        notes: quotation.notes
          ? { title: customFields.notesTitle || "Notes", content: quotation.notes, format: "html" }
          : null,
        terms: quotation.terms
          ? { title: customFields.termsTitle || "Terms and Conditions", content: quotation.terms, format: "html" }
          : null,
        additionalSections: [],
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
      templateId: normalizeInvoicePdfTemplateId(customFields?.pdfTemplateId) || "industry",
      compact: pdfOutput.compact === true,
    });
    showToast("Download ready", "Quotation PDF downloaded.", "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate the quotation PDF.";
    showToast("Download failed", message);
  } finally {
    setDownloading(false);
  }
}
