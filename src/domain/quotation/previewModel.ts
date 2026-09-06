import { formatNaira } from "@/lib/formatters/money";
import { resolveCanonicalItemImageUrl } from "@/domain/documentMedia";
import { adaptCommercialDocumentData } from "@/components/pdf/industryAdapter";
import { buildPdfRowCells, interpretPdfTableSettings } from "@/components/pdf/table";
import type { PdfDocumentModel, PdfColumnDefinition, PdfResolvedTableSettings } from "@/components/pdf/types";
import { getPdfSummaryLabels } from "@/domain/document/pdfSummaryLabels";
import { buildSummaryRows } from "@/domain/invoice";
import {
  buildBankAccountsProjection,
  resolveSelectedBankAccount,
  buildCompanyPreviewLines,
  buildClientPreviewLines,
} from "@/domain/invoice/projections";

export interface QuotationPreviewModelInput {
  quotation: any;
  items: any[];
  totals: any;
  client: any;
  settings: any;
  bankAccounts: any[];
  customFields: Record<string, any>;
  resolvedSignatory: any;
  pdfOutput: any;
  linkedProject: { id: string; name?: string | null } | null;
}

export function buildQuotationPreviewModel(input: QuotationPreviewModelInput) {
  const {
    quotation, items, totals, client, settings, bankAccounts,
    customFields, resolvedSignatory, pdfOutput, linkedProject,
  } = input;

  const previewBankAccounts = buildBankAccountsProjection(Array.isArray(bankAccounts) ? bankAccounts : []);
  const selectedPreviewBank = resolveSelectedBankAccount(previewBankAccounts, pdfOutput.bankAccountId);
  const companyPreviewResult = buildCompanyPreviewLines(settings);
  const companyPreviewLines = companyPreviewResult.addressLines;
  const clientPreviewLines = buildClientPreviewLines(client);

  const previewDetailRows = [
    { label: "Client", value: quotation?.client_name || "Unassigned" },
    { label: "PO Number", value: quotation?.po_number || "" },
    ...(quotation?.quotation_title ? [{ label: "Title", value: quotation.quotation_title }] : []),
    ...(Array.isArray(customFields.header) ? customFields.header : [])
      .filter((field: any) => field?.label && field?.value)
      .map((field: any) => ({ label: String(field.label), value: String(field.value) })),
  ].filter((row) => String(row.value || "").trim().length > 0);
  const previewTableSettings = resolveQuotationPreviewTableSettings(items, customFields);

  const previewSummaryLabels = getPdfSummaryLabels(quotation, {
    discountType: (customFields?.calculationInputs?.discountType ?? customFields?.discountType) as 'fixed' | 'percent' | undefined,
    discountPercentEquivalent: totals?.discountPercentEquivalent,
  });
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
      value: formatNaira(row.amount || 0, { preserveFraction: true }),
      emphasis: false,
      valueClassName: row.tone === "danger" ? "text-[hsl(var(--bd-status-danger-text))]" : undefined,
    })),
    {
      label: "Total",
      value: formatNaira(totals?.totalPayable || 0, { preserveFraction: true }),
      emphasis: true,
      valueClassName: "text-[hsl(var(--bd-text))]",
    },
  ];

  const previewAttachmentLinks = Array.isArray(customFields.attachments)
    ? customFields.attachments
        .filter((entry: any) => entry?.url)
        .map((entry: any, index: number) => ({
          label: String(entry.label || entry.name || `Reference ${index + 1}`),
          url: String(entry.url),
        }))
        .filter((entry: { url: string }) => entry.url)
    : [];

  const previewNotesSections = [
    quotation?.notes ? {
      title: customFields.notesTitle || "Notes",
      kind: "html" as const,
      html: String(quotation.notes),
    } : null,
    quotation?.terms ? {
      title: customFields.termsTitle || "Terms and Conditions",
      kind: "html" as const,
      html: String(quotation.terms),
    } : null,
    ...(Array.isArray(customFields.additionalFields) && customFields.additionalFields.length > 0 ? [{
      title: "Additional Fields",
      kind: "fields" as const,
      fields: customFields.additionalFields
        .filter((field: any) => field?.label || field?.value)
        .map((field: any) => ({
          label: String(field?.label || ""),
          value: String(field?.value || ""),
        })),
    }] : []),
    ...(previewAttachmentLinks.length > 0 ? [{
      title: "Reference Links",
      kind: "links" as const,
      links: previewAttachmentLinks,
    }] : []),
  ].filter(Boolean);

  const quotationAttachments = Array.isArray(customFields.attachments)
    ? customFields.attachments
        .filter((entry: any) => entry?.label || entry?.name || entry?.url)
        .map((entry: any, index: number) => ({
          id: String(entry.id || entry.url || `${index}`),
          label: String(entry.label || entry.name || entry.url || `Attachment ${index + 1}`),
        }))
    : [];

  return {
    previewBankAccounts,
    selectedPreviewBank,
    companyPreviewLines,
    companyWebsite: companyPreviewResult.website,
    companyCustomInfo: companyPreviewResult.customInfo,
    clientPreviewLines,
    previewDetailRows,
    pageLayout: previewTableSettings.pageLayout,
    previewItems: buildQuotationPreviewItems(items, customFields, previewTableSettings),
    previewTotals,
    previewNotesSections,
    previewAttachmentLinks,
    quotationAttachments,
    signatory: resolvedSignatory,
  };
}

export function buildQuotationPreviewItems(
  items: any[],
  customFields: Record<string, any>,
  tableSettings?: PdfResolvedTableSettings,
) {
  const sourceItems = Array.isArray(items) ? items : [];
  const resolvedTable = tableSettings || resolveQuotationPreviewTableSettings(sourceItems, customFields);

  const adapted = adaptCommercialDocumentData({
    identity: { id: "", kind: "quotation", number: "", title: "" },
    items: sourceItems.map((item, index) => ({
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
          showSubtotal: customFields?.groupMeta?.[item.group_id || ""]?.showSubtotal === true,
        } : {}),
      },
    })),
    columns: resolvedTable.columns,
    mergeQtyUnit: resolvedTable.mergeQtyUnit,
    hideEmptyGroups: resolvedTable.hideEmptyGroups,
    totals: { rows: [] },
  } as PdfDocumentModel);

  return adapted.table.rows.map((row: any, index) => {
    if (row.isGroupHeader) {
      return { type: "group", label: String(row.groupLabel || row.groupName || `Group ${index + 1}`) };
    }

    if (row.isGroupFooter) {
      return {
        type: "group_footer",
        showSubtotal: row.showSubtotal === true,
        value: row.showSubtotal === true ? String(row.groupSubtotalValue || "") : "",
      };
    }

    const description = readDescriptionCell(row.cells?.description);
    return {
      type: "line",
      label: description.main || "Untitled item",
      detail: description.sub,
      imageUrl: row.imageUrl || null,
      value: hasPreviewValue(row.cells?.amount) ? String(row.cells.amount) : "",
      facts: buildPreviewFacts(row, resolvedTable.columns),
    };
  });
}

function resolveQuotationPreviewTableSettings(items: any[], customFields: Record<string, any>) {
  const sourceItems = Array.isArray(items) ? items : [];
  return interpretPdfTableSettings(
    Array.isArray(customFields?.columnConfig) ? customFields.columnConfig : [],
    {
      mergeQtyUnit: customFields?.mergeQtyUnit === true,
      hideEmptyGroups: customFields?.hideEmptyGroups !== false,
      items: sourceItems as never[],
    },
  );
}

function hasPreviewValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function readDescriptionCell(cell: unknown) {
  if (cell && typeof cell === "object") {
    const entry = cell as { main?: unknown; sub?: unknown };
    return {
      main: String(entry.main || ""),
      sub: String(entry.sub || ""),
    };
  }

  return { main: String(cell || ""), sub: "" };
}

function buildPreviewFacts(row: any, columns: PdfColumnDefinition[]) {
  const cells = row?.cells || {};
  return columns
    .filter((column) => !["num", "description", "amount"].includes(column.key))
    .map((column) => {
      const value = cells[column.key];
      return hasPreviewValue(value) ? `${column.label}: ${value}` : null;
    })
    .filter(Boolean);
}
