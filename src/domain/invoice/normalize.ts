import type {
  CustomDataMap,
  DbInvoice,
  DbInvoiceItem,
  Invoice,
  InvoiceAttachment,
  InvoiceCustomFields,
  InvoiceItem,
  InvoicePdfOutput,
} from './types'
import { resolveCanonicalItemImageUrl } from '../documentMedia.js'
import { normalizeExtraCharges } from './factories'
import { safeParseJson } from '@/lib/json/safeParseJson'

export const DEFAULT_INVOICE_PDF_OUTPUT: InvoicePdfOutput = {
  showBankDetails: true,
  bankAccountId: null,
  showFooter: true,
  showTagline: true,
  showBalanceDue: true,
  showAmountInWords: true,
  showVatPercentage: true,
  showWhtPercentage: true,
  showDiscountPercentage: true,
}

export function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function normalizeQuantity(value: unknown, fallback = 1): number {
  const parsed = toNumber(value, fallback)
  return parsed > 0 ? parsed : fallback
}

export function toNullableDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  return String(value)
}

function normalizeAttachments(value: unknown): InvoiceAttachment[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const attachment = item as Record<string, unknown>
      return {
        label: typeof attachment.label === 'string' ? attachment.label : undefined,
        name: typeof attachment.name === 'string' ? attachment.name : undefined,
        url: typeof attachment.url === 'string' ? attachment.url : undefined,
        ...attachment,
      }
    })
}

export function parseCustomFields(value: unknown): InvoiceCustomFields {
  if (!value) return {}

  if (typeof value === 'object' && !Array.isArray(value)) {
    const parsed = value as InvoiceCustomFields
    return {
      ...parsed,
      attachments: normalizeAttachments(parsed.attachments),
      extraCharges: normalizeExtraCharges(parsed.extraCharges),
    }
  }

  if (typeof value !== 'string') return {}
  if (!value.trim()) return {}

  const parsed = safeParseJson(value, null as any)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const customFields = parsed as InvoiceCustomFields
    return {
      ...customFields,
      attachments: normalizeAttachments(customFields.attachments),
      extraCharges: normalizeExtraCharges(customFields.extraCharges),
    }
  }
  return {}
}

export function getInvoicePdfOutput(value: unknown): InvoicePdfOutput {
  const customFields = parseCustomFields(value)
  const savedPdfOutput = customFields.pdfOutput
  if (!savedPdfOutput || typeof savedPdfOutput !== 'object' || Array.isArray(savedPdfOutput)) {
    return { ...DEFAULT_INVOICE_PDF_OUTPUT }
  }

  return {
    showBankDetails: typeof savedPdfOutput.showBankDetails === 'boolean' ? savedPdfOutput.showBankDetails : DEFAULT_INVOICE_PDF_OUTPUT.showBankDetails,
    bankAccountId: typeof savedPdfOutput.bankAccountId === 'string' ? savedPdfOutput.bankAccountId : DEFAULT_INVOICE_PDF_OUTPUT.bankAccountId,
    showFooter: typeof savedPdfOutput.showFooter === 'boolean' ? savedPdfOutput.showFooter : DEFAULT_INVOICE_PDF_OUTPUT.showFooter,
    showTagline: typeof savedPdfOutput.showTagline === 'boolean' ? savedPdfOutput.showTagline : DEFAULT_INVOICE_PDF_OUTPUT.showTagline,
    showBalanceDue: typeof savedPdfOutput.showBalanceDue === 'boolean' ? savedPdfOutput.showBalanceDue : DEFAULT_INVOICE_PDF_OUTPUT.showBalanceDue,
    showAmountInWords:
      typeof savedPdfOutput.showAmountInWords === 'boolean'
        ? savedPdfOutput.showAmountInWords
        : DEFAULT_INVOICE_PDF_OUTPUT.showAmountInWords,
    showVatPercentage:
      typeof savedPdfOutput.showVatPercentage === 'boolean'
        ? savedPdfOutput.showVatPercentage
        : DEFAULT_INVOICE_PDF_OUTPUT.showVatPercentage,
    showWhtPercentage:
      typeof savedPdfOutput.showWhtPercentage === 'boolean'
        ? savedPdfOutput.showWhtPercentage
        : DEFAULT_INVOICE_PDF_OUTPUT.showWhtPercentage,
    showDiscountPercentage:
      typeof savedPdfOutput.showDiscountPercentage === 'boolean'
        ? savedPdfOutput.showDiscountPercentage
        : DEFAULT_INVOICE_PDF_OUTPUT.showDiscountPercentage,
  }
}

export function getInvoiceSignatoryId(value: unknown): string | null {
  const customFields = parseCustomFields(value)
  return typeof customFields.signatoryId === 'string' ? customFields.signatoryId : null
}

function parseCustomData(value: unknown): CustomDataMap {
  if (!value) return {}

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as CustomDataMap
  }

  if (typeof value !== 'string' || !value.trim()) return {}

  const parsed = safeParseJson(value, null as any)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as CustomDataMap
  }
  return {}
}

export function mapDbInvoice(row: DbInvoice): Invoice {
  const customFields = parseCustomFields(row.custom_fields)

  return {
    ...row,
    id: row.id ?? null,
    invoice_number: row.invoice_number || '',
    po_number: row.po_number || '',
    client_id: row.client_id ?? null,
    client_name: row.client_name || '',
    issue_date: row.issue_date ?? null,
    due_date: toNullableDate(row.due_date),
    status: row.status || '',
    document_type: row.document_type || '',
    payment_terms: row.payment_terms || '',
    custom_payment_terms: row.custom_payment_terms || '',
    notes: row.notes || '',
    terms: row.terms || '',
    workmanship: toNumber(row.workmanship),
    transportation: toNumber(row.transportation),
    shipping: toNumber(row.shipping),
    discount: toNumber(row.discount),
    vat: toNumber(row.vat),
    wht: toNumber(row.wht),
    subtotal: toNumber(row.subtotal),
    total: toNumber(row.total),
    work_duration: row.work_duration || '',
    amount_in_words: row.amount_in_words || '',
    invoice_title: row.invoice_title || '',
    custom_fields: customFields,
    attachments: normalizeAttachments(customFields.attachments),
    archived_at: row.archived_at ?? null,
    project_id: row.project_id ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  }
}

export function mapDbInvoiceItem(row: DbInvoiceItem): InvoiceItem {
  const customData = parseCustomData(row.custom_data)
  const installRate = row.install_rate === null || row.install_rate === undefined || row.install_rate === ''
    ? null
    : toNumber(row.install_rate, 0)

  return {
    ...row,
    id: row.id ?? null,
    invoice_id: row.invoice_id ?? null,
    item_id: row.item_id ?? null,
    description: row.description || '',
    sub_description: row.sub_description || '',
    make: row.make || '',
    quantity: normalizeQuantity(row.quantity, 1),
    unit: row.unit || '',
    unit_price: toNumber(row.unit_price),
    amount: toNumber(row.amount),
    install_rate: installRate,
    install_rate_override: installRate !== null && installRate !== 0,
    vat_rate: row.vat_rate === null || row.vat_rate === undefined || row.vat_rate === '' ? null : toNumber(row.vat_rate),
    discount_rate: row.discount_rate === null || row.discount_rate === undefined || row.discount_rate === '' ? null : toNumber(row.discount_rate),
    row_type: row.row_type === 'group_header' ? 'group_header' : 'standard',
    group_id: row.group_id ?? null,
    group_name: row.group_name || '',
    sort_order: toNumber(row.sort_order),
    image_url: resolveCanonicalItemImageUrl(row),
    custom_data: customData,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  }
}
