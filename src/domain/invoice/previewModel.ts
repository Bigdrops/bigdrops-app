import { getPdfSummaryLabels } from '@/domain/document/pdfSummaryLabels'
import { formatMergedQtyUnit, resolveCanonicalItemImageUrl } from '@/domain/documentMedia.js'
import { normalizeQuantity } from '@/domain/invoice/normalize'
import { resolveColumnBehavior } from '@/domain/invoice/columns'
import type { ColumnConfig } from '@/domain/invoice/types'
import { normalizeRichTextHtml } from '@/components/pdf-new/core/richText'
import { getAdditionalFields } from './additionalFields'
import { buildSummaryRows } from './calculations'
import type { InvoiceCustomFields } from './types'

import { getAdvanceSummaryValues } from './advanceSummary'

export type PreviewBankAccount = {
  id: string
  bankName: string
  accountName: string
  accountNumber: string
  sortCode: string
  isDefault: boolean
}

export type PreviewDetailRow = {
  label: string
  value: string
}

export type PreviewItem =
  | { type: 'group'; label: string }
  | { type: 'group_footer'; value: string; showSubtotal: boolean }
  | { type: 'line'; label: string; detail: string; value: string; facts: string[]; imageUrl?: string | null }

export type PreviewTotalRow = {
  label: string
  value: string
  emphasis?: boolean
  valueClassName?: string
  labelClassName?: string
}

export type PreviewNoteSection =
  | { title: string; kind: 'html'; html: string }
  | { title: string; kind: 'text'; text: string }
  | { title: string; kind: 'fields'; fields: Array<{ label: string; value: string }> }
  | { title: string; kind: 'links'; links: { label: string; url: string }[] }

type InvoiceLike = {
  custom_fields?: unknown
  client_name?: string | null
  payment_terms?: string | null
  invoice_title?: string | null
  document_type?: string | null
  work_duration?: string | null
  subtotal?: number | string | null
  vat?: number | string | null
  workmanship?: number | string | null
  transportation?: number | string | null
  shipping?: number | string | null
  discount?: number | string | null
  wht?: number | string | null
  total?: number | string | null
  amount_in_words?: string | null
  notes?: string | null
  terms?: string | null
}

type InvoiceItemLike = {
  row_type?: string | null
  group_name?: string | null
  description?: string | null
  sub_description?: string | null
  amount?: number | string | null
  quantity?: number | string | null
  unit_price?: number | string | null
  unit?: string | null
  make?: string | null
  install_rate?: number | string | null
  vat_rate?: number | string | null
  discount_rate?: number | string | null
  custom_data?: Record<string, unknown> | null
  group_id?: string | null
  image_url?: string | null
}

type ClientLike = {
  contact_person?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  phone?: string | null
  email?: string | null
}

type SettingsLike = {
  company_address?: string | null
  company_city?: string | null
  company_state?: string | null
  company_vat?: string | null
  company_phone?: string | null
  company_email?: string | null
}

type BankAccountLike = {
  id: string
  bank_name?: string | null
  account_name?: string | null
  account_number?: string | null
  sort_code?: string | null
  is_default?: boolean | null
}

type CustomFieldObjectLike = {
  header?: Array<{ label?: string | null; value?: string | null }>
  additionalFields?: Array<{ label?: string | null; value?: string | null }>
  bottom?: Array<{ text?: string | null }>
  attachments?: Array<{ url?: string | null; label?: string | null; name?: string | null }>
  columnConfig?: Array<ColumnConfig>
  notesTitle?: string | null
  termsTitle?: string | null
} & InvoiceCustomFields

type PdfOutputLike = {
  bankAccountId?: string | null
  showBalanceDue?: boolean
  showAmountInWords?: boolean
  showVatPercentage?: boolean
  showWhtPercentage?: boolean
  showDiscountPercentage?: boolean
}

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

export type BuildInvoicePreviewModelInput = {
  invoice: InvoiceLike
  items: InvoiceItemLike[]
  client?: ClientLike
  settings?: SettingsLike
  bankAccounts?: BankAccountLike[]
  customFieldObject?: CustomFieldObjectLike
  pdfOutput?: PdfOutputLike
  poNumber?: string
  invoiceTotal: number
  cashReceived: number
  balanceDue: number
  totals?: {
    rawSubtotal?: number
    vatAmount?: number
    discountAmount?: number
    whtAmount?: number
    installRateTotal?: number
  }
  formatMoney: (value: number) => string
}

export function buildInvoicePreviewModel({
  invoice,
  items,
  client,
  settings,
  bankAccounts = [],
  customFieldObject,
  pdfOutput,
  poNumber,
  invoiceTotal,
  cashReceived,
  balanceDue,
  totals,
  formatMoney,
}: BuildInvoicePreviewModelInput) {
  const previewBankAccounts: PreviewBankAccount[] = bankAccounts.map((account) => ({
    id: account.id,
    bankName: account.bank_name || '',
    accountName: account.account_name || '',
    accountNumber: account.account_number || '',
    sortCode: account.sort_code || '',
    isDefault: account.is_default === true,
  }))

  const selectedPreviewBank =
    previewBankAccounts.find((account) => account.id === pdfOutput?.bankAccountId)
    || previewBankAccounts.find((account) => account.isDefault)
    || previewBankAccounts[0]
    || null

  const selectedSignatory = customFieldObject?.selectedSignatory
    ? {
        name: customFieldObject.selectedSignatory.name || '',
        role: customFieldObject.selectedSignatory.role || '',
        signatureUrl: customFieldObject.selectedSignatory.signatureUrl || '',
      }
    : null

  const companyPreviewLines = [
    settings?.company_address,
    [settings?.company_city, settings?.company_state].filter(Boolean).join(', '),
    settings?.company_vat ? `VAT Number: ${settings.company_vat}` : null,
    settings?.company_phone ? `Phone: ${settings.company_phone}` : null,
    settings?.company_email ? `Email: ${settings.company_email}` : null,
  ].filter(Boolean) as string[]

  const clientPreviewLines = [
    client?.contact_person ? `Attn: ${client.contact_person}` : null,
    client?.address || null,
    [client?.city, client?.state].filter(Boolean).join(', '),
    client?.phone || null,
    client?.email || null,
  ].filter(Boolean) as string[]

  const topHeaderFields = Array.isArray(customFieldObject?.header)
    ? customFieldObject.header.filter((field) => field?.label && field?.value)
    : []

  const additionalFields = getAdditionalFields(customFieldObject)
    .map((field) => ({
      label: String(field.label || '').trim(),
      value: String(field.value || '').trim(),
    }))
    .filter((field) => field.label || field.value)

  const attachmentLinks = Array.isArray(customFieldObject?.attachments)
    ? customFieldObject.attachments
        .filter((entry) => entry?.url)
        .map((entry, index) => ({
          label: entry?.label || entry?.name || `Reference ${index + 1}`,
          url: entry?.url || '',
        }))
        .filter((entry) => entry.url)
    : []

  const resolvedColumns = resolveColumnBehavior(
    Array.isArray(customFieldObject?.columnConfig) ? customFieldObject.columnConfig : [],
    items as never[],
    'view',
  )
  const visibleColumnKeys = new Set(resolvedColumns.map((column) => column.key))
  const previewCustomColumns = resolvedColumns.filter((column) => String(column?.key || '').startsWith('custom_'))

  const previewDetailRows: PreviewDetailRow[] = [
    { label: 'PO Number', value: poNumber || '' },
    { label: 'Payment Terms', value: invoice.payment_terms || '' },
    { label: 'Work Duration', value: invoice.work_duration || '' },
    ...topHeaderFields.map((field) => ({ label: field.label || '', value: field.value || '' })),
  ].filter((row) => String(row.value || '').trim().length > 0)

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

  const advanceSummary = getAdvanceSummaryValues(invoice)
  const summaryLabels = getPdfSummaryLabels(invoice, pdfOutput)

  const previewTotals: PreviewTotalRow[] = [
    ...buildSummaryRows({
      invoice,
      totals,
      customFields: customFieldObject,
      chargeLabels: customFieldObject?.chargeLabels,
      summaryLabels,
    }).map((row) => ({
      label: row.label,
      value: formatMoney(Number(row.amount || 0)),
      valueClassName: row.tone === 'danger' ? 'text-red-600' : undefined,
    })),
    { label: 'Total', value: formatMoney(invoiceTotal), emphasis: true, valueClassName: 'text-slate-950' },
  ]

  const previewNotesSections: PreviewNoteSection[] = [
    invoice.notes
      ? {
          title: customFieldObject?.notesTitle || 'Notes',
          kind: 'html',
          html: normalizeRichTextHtml(invoice.notes),
        }
      : null,
    invoice.terms
      ? {
          title: customFieldObject?.termsTitle || 'Terms and Conditions',
          kind: 'html',
          html: normalizeRichTextHtml(invoice.terms),
        }
      : null,
    ...(additionalFields.length > 0
      ? [{
          title: 'Additional Fields',
          kind: 'fields' as const,
          fields: additionalFields,
        }]
      : []),
    ...(attachmentLinks.length > 0
      ? [{
          title: 'Reference Links',
          kind: 'links' as const,
          links: attachmentLinks,
        }]
      : []),
  ].filter(Boolean) as PreviewNoteSection[]

  return {
    previewBankAccounts,
    selectedPreviewBank,
    selectedSignatory,
    companyPreviewLines,
    clientPreviewLines,
    topHeaderFields,
    previewDetailRows,
    previewItems,
    previewTotals,
    previewAmountInWords: pdfOutput?.showAmountInWords === false ? '' : String(invoice.amount_in_words || ''),
    previewBalanceDue: pdfOutput?.showBalanceDue === false
      ? null
      : {
          label: 'Balance Due',
          value: formatMoney(balanceDue),
          emphasis: true,
          valueClassName: balanceDue > 0 ? 'text-red-600' : 'text-emerald-600',
        },
    previewBalanceDueAmount: pdfOutput?.showBalanceDue === false ? null : balanceDue,
    previewNotesSections,
    advanceSummary: advanceSummary
      ? {
          ...advanceSummary,
          requestedAmount: advanceSummary.thisAdvance,
        }
      : null,
  }
}