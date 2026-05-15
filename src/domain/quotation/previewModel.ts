import { formatNaira } from "@/lib/formatters/money";
import { formatMergedQtyUnit, resolveCanonicalItemImageUrl } from "@/domain/documentMedia";
import { getPdfSummaryLabels } from "@/domain/document/pdfSummaryLabels";
import { buildSummaryRows } from "@/domain/invoice";
import {
  buildBankAccountsProjection,
  resolveSelectedBankAccount,
  buildCompanyPreviewLines,
  buildClientPreviewLines,
  resolveLineAmount,
  resolvePreviewGroupSubtotal,
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
  const companyPreviewLines = buildCompanyPreviewLines(settings);
  const clientPreviewLines = buildClientPreviewLines(client);

  const previewDetailRows = [
    { label: "Client", value: quotation?.client_name || "Unassigned" },
    { label: "PO Number", value: quotation?.po_number || "" },
    ...(quotation?.quotation_title ? [{ label: "Title", value: quotation.quotation_title }] : []),
    ...(Array.isArray(customFields.header) ? customFields.header : [])
      .filter((field: any) => field?.label && field?.value)
      .map((field: any) => ({ label: String(field.label), value: String(field.value) })),
  ].filter((row) => String(row.value || "").trim().length > 0);

  const previewItems = buildQuotationPreviewItems(items, customFields);

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
      valueClassName: row.tone === "danger" ? "text-[hsl(var(--bd-status-danger-text))]" : undefined,
    })),
    {
      label: "Total",
      value: formatNaira(totals?.totalPayable || 0),
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
    clientPreviewLines,
    previewDetailRows,
    previewItems,
    previewTotals,
    previewNotesSections,
    previewAttachmentLinks,
    quotationAttachments,
    signatory: resolvedSignatory,
  };
}

export function buildQuotationPreviewItems(items: any[], customFields: Record<string, any>) {
  return (Array.isArray(items) ? items : [])
    .map((item, index, sourceItems) => {
      if (item.row_type === "group_header") {
        const groupId = item.group_id || null;
        const showSubtotal = customFields?.groupMeta?.[groupId || ""]?.showSubtotal === true;
        const nextItems: any[] = [
          { type: "group", label: item.group_name || `Group ${index + 1}` },
        ];
        const nextItem = sourceItems[index + 1];
        const shouldCloseImmediately =
          !nextItem || nextItem.row_type === "group_header" || nextItem.group_id !== groupId;
        if (shouldCloseImmediately) {
          nextItems.push({
            type: "group_footer",
            showSubtotal,
            value: showSubtotal ? formatNaira(resolvePreviewGroupSubtotal(sourceItems, groupId)) : "",
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
          value: formatNaira(item.amount || Number(item.quantity || 0) * Number(item.unit_price || 0)),
          facts: [
            item.quantity ? `Qty: ${formatMergedQtyUnit(item.quantity, item.unit)}` : null,
            `Rate: ${formatNaira(item.unit_price || 0)}`,
            item.make ? `Make: ${item.make}` : null,
          ].filter(Boolean),
        },
      ];

      const groupId = item.group_id || null;
      const nextItem = sourceItems[index + 1];
      const groupEndsHere =
        groupId && (!nextItem || nextItem.row_type === "group_header" || nextItem.group_id !== groupId);
      if (groupEndsHere) {
        const showSubtotal = customFields?.groupMeta?.[groupId]?.showSubtotal === true;
        nextItems.push({
          type: "group_footer",
          showSubtotal,
          value: showSubtotal ? formatNaira(resolvePreviewGroupSubtotal(sourceItems, groupId)) : "",
        });
      }

      return nextItems;
    })
    .flat();
}
