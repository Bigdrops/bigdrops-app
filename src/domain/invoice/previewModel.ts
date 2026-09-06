import { resolveCanonicalItemImageUrl } from '@/domain/documentMedia.js'
import { adaptCommercialDocumentData } from '@/components/pdf/industryAdapter'
import { buildPdfRowCells, interpretPdfTableSettings } from '@/components/pdf/table'

import type {
  PreviewBankAccount,
  PreviewDetailRow,
  PreviewItem,
  PreviewTotalRow,
  PreviewNoteSection,
  PreviewSignatory,
  InvoiceLike,
  ClientLike,
  SettingsLike,
  BankAccountLike,
  SignatoryLike,
  CustomFieldObjectLike,
  PdfOutputLike,
  BuildInvoicePreviewModelInput,
} from './renderTypes'
import type { PdfDocumentModel, PdfResolvedTableSettings } from '@/components/pdf/types'

import {
  buildBankAccountsProjection,
  resolveSelectedBankAccount,
  buildCompanyPreviewLines,
  buildClientPreviewLines,
  buildSignatoryProjection,
  buildTotalsProjection,
  buildBalanceDisplayProjection,
  buildAmountInWordsProjection,
  buildAdvanceDisplayProjection,
  buildDetailRowsProjection,
  buildAdditionalFieldsProjection,
  buildAttachmentLinksProjection,
  buildNotesSectionsProjection,
} from './projections'

export type {
  PreviewBankAccount,
  PreviewDetailRow,
  PreviewItem,
  PreviewTotalRow,
  PreviewNoteSection,
  PreviewSignatory,
  BuildInvoicePreviewModelInput,
} from './renderTypes'

export function resolveDocumentSignatory(
  signatoryId: unknown,
  signatories: SignatoryLike[] = [],
): PreviewSignatory | null {
  const id = signatoryId === null || signatoryId === undefined ? '' : String(signatoryId).trim()
  if (!id) return null

  const matchedSignatory = signatories.find((entry) => String(entry?.id ?? '') === id)
  if (!matchedSignatory) return null

  return {
    name: String(matchedSignatory.name || '').trim(),
    role: String(matchedSignatory.role || '').trim(),
    signatureUrl: String(matchedSignatory.signature_url || matchedSignatory.signatureUrl || '').trim(),
  }
}

export function buildInvoicePreviewModel({
  invoice,
  items,
  client,
  settings,
  bankAccounts = [],
  customFieldObject,
  pdfOutput,
  signatory,
  poNumber,
  invoiceTotal,
  cashReceived,
  balanceDue,
  totals,
  formatMoney,
}: BuildInvoicePreviewModelInput) {
  const previewBankAccounts = buildBankAccountsProjection(bankAccounts)
  const selectedPreviewBank = resolveSelectedBankAccount(previewBankAccounts, pdfOutput?.bankAccountId)
  const companyPreviewResult = buildCompanyPreviewLines(settings)
  const companyPreviewLines = companyPreviewResult.addressLines
  const clientPreviewLines = buildClientPreviewLines(client)
  const topHeaderFields = Array.isArray(customFieldObject?.header)
    ? customFieldObject.header.filter((field) => field?.label && field?.value)
    : []

  const additionalFields = buildAdditionalFieldsProjection(customFieldObject)
  const attachmentLinks = buildAttachmentLinksProjection(customFieldObject)

  const previewDetailRows = buildDetailRowsProjection({ customFieldObject, poNumber, invoice })
  const previewTableSettings = resolveInvoicePreviewTableSettings(items, customFieldObject)

  const advanceSummary = buildAdvanceDisplayProjection(invoice)
  const previewTotals = buildTotalsProjection({
    invoice, totals, customFieldObject, invoiceTotal, balanceDue, pdfOutput, formatMoney,
  })
  const previewAmountInWords = buildAmountInWordsProjection(invoice, pdfOutput)
  const previewBalanceDueRow = buildBalanceDisplayProjection(balanceDue, pdfOutput, formatMoney)
  const previewNotesSections = buildNotesSectionsProjection({
    invoice, customFieldObject, additionalFields, attachmentLinks,
  })

  return {
    previewBankAccounts,
    selectedPreviewBank,
    signatory: buildSignatoryProjection(signatory),
    companyPreviewLines,
    companyWebsite: companyPreviewResult.website,
    companyCustomInfo: companyPreviewResult.customInfo,
    clientPreviewLines,
    topHeaderFields,
    previewDetailRows,
    pageLayout: previewTableSettings.pageLayout,
    previewItems: buildInvoicePreviewItems(items, customFieldObject, previewTableSettings),
    previewTotals,
    previewAmountInWords,
    previewBalanceDue: previewBalanceDueRow,
    previewBalanceDueAmount: pdfOutput?.showBalanceDue === false ? null : balanceDue,
    previewNotesSections,
    advanceSummary,
  }
}

function hasPreviewValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

function readDescriptionCell(cell: unknown) {
  if (cell && typeof cell === 'object') {
    const entry = cell as { main?: unknown; sub?: unknown }
    return {
      main: String(entry.main || ''),
      sub: String(entry.sub || ''),
    }
  }

  return { main: String(cell || ''), sub: '' }
}

function buildPreviewFacts(row: any, columns: PdfDocumentModel['columns']) {
  const cells = row?.cells || {}
  return (columns || [])
    .filter((column) => !['num', 'description', 'amount'].includes(column.key))
    .map((column) => {
      const value = cells[column.key]
      return hasPreviewValue(value) ? `${column.label}: ${value}` : null
    })
    .filter(Boolean) as string[]
}

function resolveInvoicePreviewTableSettings(
  items: BuildInvoicePreviewModelInput['items'],
  customFieldObject: BuildInvoicePreviewModelInput['customFieldObject'],
) {
  const sourceItems = Array.isArray(items) ? items : []
  return interpretPdfTableSettings(
    Array.isArray(customFieldObject?.columnConfig) ? customFieldObject.columnConfig : [],
    {
      mergeQtyUnit: customFieldObject?.mergeQtyUnit === true,
      hideEmptyGroups: customFieldObject?.hideEmptyGroups !== false,
      items: sourceItems as never[],
    },
  )
}

export function buildInvoicePreviewItems(
  items: BuildInvoicePreviewModelInput['items'],
  customFieldObject: BuildInvoicePreviewModelInput['customFieldObject'],
  tableSettings?: PdfResolvedTableSettings,
): PreviewItem[] {
  const sourceItems = Array.isArray(items) ? items : []
  const resolvedTable = tableSettings || resolveInvoicePreviewTableSettings(sourceItems, customFieldObject)

  const adapted = adaptCommercialDocumentData({
    identity: { id: '', kind: 'invoice', number: '', title: '' },
    items: sourceItems.map((item, index) => ({
      id: String((item as any).id || (item as any)._uiKey || index),
      rowType: item.row_type === 'group_header' ? 'group_header' : 'line',
      groupLabel: item.group_name || null,
      groupId: item.group_id || null,
      description: item.description || '',
      subDescription: item.sub_description || '',
      make: item.make || '',
      quantity: item.quantity === null || item.quantity === undefined ? null : Number(item.quantity),
      unit: item.unit || '',
      unitPrice: item.unit_price === null || item.unit_price === undefined ? null : Number(item.unit_price),
      installRate: item.install_rate === null || item.install_rate === undefined ? null : Number(item.install_rate),
      vatRate: item.vat_rate === null || item.vat_rate === undefined ? null : Number(item.vat_rate),
      discountRate: item.discount_rate === null || item.discount_rate === undefined ? null : Number(item.discount_rate),
      amount: item.amount === null || item.amount === undefined
        ? Number(item.quantity || 0) * Number(item.unit_price || 0)
        : Number(item.amount),
      imageUrl: resolveCanonicalItemImageUrl(item),
      cells: item.row_type === 'group_header' ? undefined : buildPdfRowCells(item as never, resolvedTable.columns, {
        mergeQtyUnit: resolvedTable.mergeQtyUnit,
        configuredColumns: resolvedTable.configuredColumns,
      }),
      customData: {
        ...(item.custom_data || {}),
        ...(item.row_type === 'group_header' ? {
          showSubtotal: customFieldObject?.groupMeta?.[item.group_id || '']?.showSubtotal === true,
        } : {}),
      },
    })),
    columns: resolvedTable.columns,
    mergeQtyUnit: resolvedTable.mergeQtyUnit,
    hideEmptyGroups: resolvedTable.hideEmptyGroups,
    totals: { rows: [] },
  } as PdfDocumentModel)

  return adapted.table.rows.map((row: any, index): PreviewItem => {
    if (row.isGroupHeader) {
      return { type: 'group', label: String(row.groupLabel || row.groupName || `Group ${index + 1}`) }
    }

    if (row.isGroupFooter) {
      return {
        type: 'group_footer',
        showSubtotal: row.showSubtotal === true,
        value: row.showSubtotal === true ? String(row.groupSubtotalValue || '') : '',
      }
    }

    const description = readDescriptionCell(row.cells?.description)
    return {
      type: 'line',
      label: description.main || 'Untitled item',
      detail: description.sub,
      imageUrl: row.imageUrl || null,
      value: hasPreviewValue(row.cells?.amount) ? String(row.cells.amount) : '',
      facts: buildPreviewFacts(row, resolvedTable.columns),
    }
  })
}
