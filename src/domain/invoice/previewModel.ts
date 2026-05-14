import { formatMergedQtyUnit, resolveCanonicalItemImageUrl } from '@/domain/documentMedia.js'
import { normalizeQuantity } from '@/domain/invoice/normalize'
import { resolveColumnBehavior } from '@/domain/invoice/columns'

import type {
  PreviewBankAccount,
  PreviewDetailRow,
  PreviewItem,
  PreviewTotalRow,
  PreviewNoteSection,
  PreviewSignatory,
  InvoiceLike,
  InvoiceItemLike,
  ClientLike,
  SettingsLike,
  BankAccountLike,
  SignatoryLike,
  CustomFieldObjectLike,
  PdfOutputLike,
  BuildInvoicePreviewModelInput,
} from './renderTypes'

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

function resolveLineAmount(item: InvoiceItemLike) {
  const explicitAmount = Number(item.amount)
  if (Number.isFinite(explicitAmount) && explicitAmount !== 0) return explicitAmount
  return normalizeQuantity(item.quantity, 1) * Number(item.unit_price || 0)
}

function resolvePreviewGroupSubtotal(items: InvoiceItemLike[], groupId: string | null | undefined) {
  if (!groupId) return 0
  return items.reduce((subtotal, item) => {
    if (item.row_type === 'group_header') return subtotal
    if (item.group_id !== groupId) return subtotal
    return subtotal + resolveLineAmount(item)
  }, 0)
}

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
  const companyPreviewLines = buildCompanyPreviewLines(settings)
  const clientPreviewLines = buildClientPreviewLines(client)
  const topHeaderFields = Array.isArray(customFieldObject?.header)
    ? customFieldObject.header.filter((field) => field?.label && field?.value)
    : []

  const additionalFields = buildAdditionalFieldsProjection(customFieldObject)
  const attachmentLinks = buildAttachmentLinksProjection(customFieldObject)

  const resolvedColumns = resolveColumnBehavior(
    Array.isArray(customFieldObject?.columnConfig) ? customFieldObject.columnConfig : [],
    items as never[],
    'view',
  )
  const visibleColumnKeys = new Set(resolvedColumns.map((column) => column.key))
  const previewCustomColumns = resolvedColumns.filter((column) => String(column?.key || '').startsWith('custom_'))

  const previewDetailRows = buildDetailRowsProjection({ customFieldObject, poNumber, invoice })

  const previewItems: PreviewItem[] = items.map((item, index) => {
    if (item.row_type === 'group_header') {
      const groupId = item.group_id || null
      const showSubtotal = customFieldObject?.groupMeta?.[groupId || '']?.showSubtotal === true
      const nextItems: PreviewItem[] = [{ type: 'group', label: item.group_name || `Group ${index + 1}` }]

      const nextItem = items[index + 1]
      const shouldCloseImmediately = !nextItem || nextItem.row_type === 'group_header' || nextItem.group_id !== groupId
      if (shouldCloseImmediately) {
        nextItems.push({
          type: 'group_footer',
          showSubtotal,
          value: showSubtotal ? formatMoney(resolvePreviewGroupSubtotal(items, groupId)) : '',
        })
      }
      return nextItems
    }

    const customFacts = previewCustomColumns
      .map((column) => {
        const key = column?.key || ''
        const value = key && item.custom_data ? (item.custom_data as Record<string, unknown>)[key] : null
        return value === null || value === undefined || value === '' ? null : `${column?.label || key}: ${value}`
      })
      .filter(Boolean) as string[]

    const nextItems: PreviewItem[] = [{
      type: 'line',
      label: item.description || 'Untitled item',
      detail: item.sub_description || '',
      imageUrl: resolveCanonicalItemImageUrl(item),
      value: visibleColumnKeys.has('amount')
        ? formatMoney(Number(item.amount || (normalizeQuantity(item.quantity, 1) * Number(item.unit_price || 0)) || 0))
        : '',
      facts: [
        visibleColumnKeys.has('quantity')
          ? `Qty: ${formatMergedQtyUnit(normalizeQuantity(item.quantity, 1), visibleColumnKeys.has('unit') ? item.unit : '')}`
          : null,
        visibleColumnKeys.has('unit_price') ? `Rate: ${formatMoney(Number(item.unit_price || 0))}` : null,
        visibleColumnKeys.has('make') && item.make ? `Make: ${item.make}` : null,
        visibleColumnKeys.has('install_rate') && item.install_rate !== null && item.install_rate !== undefined ? `Install: ${item.install_rate}` : null,
        visibleColumnKeys.has('vat_rate') && item.vat_rate !== null && item.vat_rate !== undefined ? `VAT: ${item.vat_rate}%` : null,
        visibleColumnKeys.has('discount_rate') && item.discount_rate !== null && item.discount_rate !== undefined ? `Discount: ${item.discount_rate}%` : null,
        ...customFacts,
      ].filter(Boolean) as string[],
    }]

    const groupId = item.group_id || null
    const nextItem = items[index + 1]
    const groupEndsHere = groupId && (!nextItem || nextItem.row_type === 'group_header' || nextItem.group_id !== groupId)
    if (groupEndsHere) {
      const showSubtotal = customFieldObject?.groupMeta?.[groupId]?.showSubtotal === true
      nextItems.push({
        type: 'group_footer',
        showSubtotal,
        value: showSubtotal ? formatMoney(resolvePreviewGroupSubtotal(items, groupId)) : '',
      })
    }

    return nextItems
  }).flat()

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
    clientPreviewLines,
    topHeaderFields,
    previewDetailRows,
    previewItems,
    previewTotals,
    previewAmountInWords,
    previewBalanceDue: previewBalanceDueRow,
    previewBalanceDueAmount: pdfOutput?.showBalanceDue === false ? null : balanceDue,
    previewNotesSections,
    advanceSummary,
  }
}
