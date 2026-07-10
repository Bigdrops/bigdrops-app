import {
  BUILTIN_COLUMNS,
  normalizeInvoicePdfTemplateId,
  parseCustomFields,
} from "@/domain/invoice";
import { InvoicePdfTemplateId } from "@/domain/invoice/types";
import { computeDocument } from "@/lib/Calculations";
import { buildInvoicePreviewModel, resolveDocumentSignatory } from "@/domain/invoice/previewModel";
import { formatNaira } from "@/lib/formatters/money";
import { calculateInvoiceFinancialState } from "@/domain/invoice/financialState";
import { resolveCanonicalLogoUrl, resolveCanonicalItemImageUrl } from "@/domain/documentMedia";
import { resolveCommercialDesignPreset } from "@/domain/pdf/customization/commercial";


export const downloadInvoicePdfDocument = async ({
  targetInvoice,
  targetItems,
  targetPayments,
  client,
  settings,
  bankAccounts,
  signatories,
  pdfOutput,
  pdfTemplateId,
  settingsData,
}: {
  targetInvoice: any;
  targetItems: any[];
  targetPayments?: any[];
  client: any;
  settings: any;
  bankAccounts: any[];
  signatories: any[];
  pdfOutput: any;
  pdfTemplateId: InvoicePdfTemplateId;
  settingsData: any;
}) => {
  const { buildPdfRowCells, generateInvoicePdf, interpretPdfTableSettings } = await import("@/components/pdf-new");
  
  const targetCustomFields = parseCustomFields(targetInvoice?.custom_fields);
  const targetTemplateId: InvoicePdfTemplateId = normalizeInvoicePdfTemplateId(targetCustomFields?.pdfTemplateId) || pdfTemplateId;
  const savedColumns = Array.isArray(targetCustomFields?.columnConfig) ? targetCustomFields.columnConfig : BUILTIN_COLUMNS;
  
  const totals = computeDocument({
    items: Array.isArray(targetItems) ? targetItems : [],
    document: targetInvoice,
    cf: targetCustomFields || {},
    columns: savedColumns as any,
  });

  const paymentFinancialState = calculateInvoiceFinancialState({
    invoiceTotal: totals.totalPayable || Number(targetInvoice?.total || 0),
    status: targetInvoice?.status || 'unpaid',
    payments: Array.isArray(targetPayments) ? targetPayments : [],
  });

  const targetPreviewModel = buildInvoicePreviewModel({
    invoice: targetInvoice || {},
    items: Array.isArray(targetItems) ? targetItems : [],
    client: client || undefined,
    settings: settings || undefined,
    bankAccounts: Array.isArray(bankAccounts) ? bankAccounts : [],
    customFieldObject: targetCustomFields as any,
    pdfOutput,
    signatory: resolveDocumentSignatory(targetCustomFields?.signatoryId, Array.isArray(signatories) ? signatories : []),
    poNumber: String(targetInvoice?.po_number || ""),
    invoiceTotal: totals.totalPayable || Number(targetInvoice?.total || 0),
    cashReceived: paymentFinancialState.settledAmount,
    balanceDue: paymentFinancialState.balanceDue,
    totals: {
      rawSubtotal: totals.subtotal,
      vatAmount: totals.vat,
      discountAmount: totals.discount,
      whtAmount: totals.wht,
      installRateTotal: totals.installRateTotal,
    },
    formatMoney: (value) => formatNaira(value, { preserveFraction: true }),
  });

  const resolvedTable = interpretPdfTableSettings(savedColumns as any, {
    mergeQtyUnit: targetCustomFields?.mergeQtyUnit === true,
    items: Array.isArray(targetItems) ? targetItems : [],
    landscapeLayout: pdfOutput?.landscapeLayout === true,
  });

  const referenceLinks = Array.isArray(targetCustomFields?.attachments)
    ? targetCustomFields.attachments
        .filter((entry: any) => entry?.url)
        .map((entry: any, index: number) => ({
          label: String(entry.label || entry.name || `Reference ${index + 1}`),
          url: String(entry.url),
        }))
    : [];

  await generateInvoicePdf({
    model: {
      identity: {
        id: String(targetInvoice.id),
        kind: "invoice",
        number: String(targetInvoice.invoice_number || "invoice"),
        title: String(targetInvoice.invoice_title || "Invoice"),
        issueDate: String(targetInvoice.issue_date || ""),
        dueDate: String(targetInvoice.due_date || ""),
        poNumber: String(targetInvoice.po_number || ""),
        status: String(targetInvoice.status || ""),
        currency: "NGN",
      },
      issuer: {
        label: "From",
        name: String(settingsData?.company_name || ""),
        addressLines: Array.isArray(targetPreviewModel?.companyPreviewLines) ? targetPreviewModel.companyPreviewLines : [],
        phone: String(settingsData?.company_phone || ""),
        email: String(settingsData?.company_email || ""),
        taxId: String(settingsData?.company_vat || ""),
        website: String(targetPreviewModel?.companyWebsite || ""),
        customInfo: Array.isArray(targetPreviewModel?.companyCustomInfo) ? targetPreviewModel.companyCustomInfo : [],
      },
      recipient: {
        label: "Bill To",
        name: String(targetInvoice.client_name || ""),
        attention: String(client?.contact_person || ""),
        addressLines: Array.isArray(targetPreviewModel?.clientPreviewLines) ? targetPreviewModel.clientPreviewLines : [],
        phone: String(client?.phone || ""),
        email: String(client?.email || ""),
      },
      headerFields: Array.isArray(targetPreviewModel?.previewDetailRows) ? targetPreviewModel.previewDetailRows : [],
      columns: resolvedTable.columns,
      pageLayout: resolvedTable.pageLayout,
      mergeQtyUnit: resolvedTable.mergeQtyUnit,
      items: (Array.isArray(targetItems) ? targetItems : []).map((item, index) => ({
        id: String(item.id || item._uiKey || index),
        rowType: item.row_type === "group_header" ? "group_header" : "line",
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
            showSubtotal: targetCustomFields?.groupMeta?.[item.group_id]?.showSubtotal === true,
          } : {}),
        },
      })),
      totals: {
        mode: targetPreviewModel?.advanceSummary ? "advance" : "standard",
        rows: (Array.isArray(targetPreviewModel?.previewTotals) ? targetPreviewModel.previewTotals : []).map((row) => ({
          key: String(row.label || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          label: String(row.label || ""),
          amount: row.rawAmount ?? (Number(String(row.value || "0").replace(/[^\d.-]/g, "")) || 0),
          emphasis: row.emphasis === true,
        })),
        amountInWords: String(targetPreviewModel?.previewAmountInWords || ""),
        balanceDue: targetPreviewModel?.previewBalanceDueAmount ?? null,
        advanceSummary: targetPreviewModel?.advanceSummary ? {
          ...targetPreviewModel.advanceSummary,
          primaryLabel: targetPreviewModel.advanceSummary.primaryLabelWithPercent || targetPreviewModel.advanceSummary.primaryLabel,
          secondaryLabel: targetPreviewModel.advanceSummary.secondaryLabelWithPercent || targetPreviewModel.advanceSummary.secondaryLabel,
        } : null,
      },
      bankDetails: pdfOutput.showBankDetails ? targetPreviewModel?.selectedPreviewBank : null,
      notes: targetInvoice.notes ? { title: String(targetCustomFields?.notesTitle || "Notes"), content: targetInvoice.notes, format: "html" } : null,
      terms: targetInvoice.terms ? { title: String(targetCustomFields?.termsTitle || "Terms and Conditions"), content: targetInvoice.terms, format: "html" } : null,
      additionalSections: [],
      referenceLinks,
      signature: targetPreviewModel?.signatory ? {
        name: targetPreviewModel.signatory.name || "",
        role: targetPreviewModel.signatory.role || "",
        imageUrl: targetPreviewModel.signatory.signatureUrl || "",
      } : null,
      logo: { imageUrl: resolveCanonicalLogoUrl(settingsData), altText: String(settingsData?.company_name || "") },
      footerText: pdfOutput.showFooter ? String(settingsData?.footer_text || "") : "",
      tagline: pdfOutput.showTagline ? String(settingsData?.company_tagline || "") : "",
      metaFooter: { companyName: String(settingsData?.company_name || "") },
      template: { designPreset: resolveCommercialDesignPreset("invoice") },
    },
    templateId: targetTemplateId,
    compact: pdfOutput.compact === true,
  });
};
