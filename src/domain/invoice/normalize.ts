import type {
  CustomDataMap,
  DbInvoice,
  DbInvoiceItem,
  Invoice,
  InvoiceAttachment,
  InvoiceCustomFields,
  InvoiceGroup,
  InvoiceItem,
  InvoicePdfOutput,
} from './types'
import { resolveCanonicalItemImageUrl } from '../documentMedia.js'
import { normalizeExtraCharges } from './factories'
import { safeParseJson } from '@/lib/json/safeParseJson'

type CompanyCustomInfoEntry = { label: string; value: string }

/**
 * Derive group order from item `group_header` rows and return a re-ordered
 * `groups` array that stays in sync with `items`.  Returns the original
 * array reference when no re-ordering is needed so callers can bail out
 * of unnecessary state updates.
 *
 * This is the **single source of truth** for synchronising the group
 * metadata array (used by `groupEntries` in `FormLineItems`) with the
 * live ordering of `group_header` rows in the items array.
 */
export function syncGroupsFromItems(
  items: InvoiceItem[],
  currentGroups: InvoiceGroup[],
): InvoiceGroup[] {
  const seen = new Set<string>()
  const ordered: InvoiceGroup[] = []

  for (const item of items) {
    if (item.row_type === 'group_header' && item.group_id && !seen.has(item.group_id)) {
      seen.add(item.group_id)
      const existing = currentGroups.find((g) => g.id === item.group_id)
      if (existing) {
        ordered.push(existing)
      } else {
        ordered.push({ id: item.group_id, name: item.group_name || 'Group', showSubtotal: false })
      }
    }
  }

  if (ordered.length !== currentGroups.length) return ordered
  for (let i = 0; i < ordered.length; i++) {
    if (ordered[i].id !== currentGroups[i].id) return ordered
  }
  return currentGroups
}

/**
 * Parse and normalize company custom_info JSON into the canonical
 * `{ label, value }` shape.
 *
 * This is the **single** compatibility boundary for legacy data that was
 * saved with `{ title, content }` keys.  Every downstream consumer
 * (partyProjection, previewModel, PDF adapter, CommercialPartyCard)
 * operates exclusively on `{ label, value }`.
 *
 * TODO: Remove the legacy `title`/`content` mapping once all persisted
 * settings rows have been re-saved through the updated settings form.
 */
export function normalizeCompanyCustomInfo(
  input: string | null | undefined,
): CompanyCustomInfoEntry[] {
  if (!input) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch {
    return []
  }

  if (!Array.isArray(parsed)) return []

  return parsed
    .filter(
      (item): item is Record<string, unknown> =>
        item != null && typeof item === 'object' && !Array.isArray(item),
    )
    .map((item) => {
      const label = String(
        item.label ?? item.title ?? '',
      ).trim()
      const value = String(
        item.value ?? item.content ?? '',
      ).trim()
      return { label, value }
    })
    .filter((entry) => entry.label.length > 0 && entry.value.length > 0)
}

export const DEFAULT_INVOICE_PDF_OUTPUT: InvoicePdfOutput = {
  showBankDetails: true,
  bankAccountId: null,
  showFooter: true,
  showTagline: true,
  showBalanceDue: true,
  showAmountInWords: true,
  compact: false,
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
    compact:
      typeof savedPdfOutput.compact === 'boolean'
        ? savedPdfOutput.compact
        : DEFAULT_INVOICE_PDF_OUTPUT.compact,
    landscapeLayout: savedPdfOutput.landscapeLayout === true,
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

/**
 * Heal row overrides that were corrupted or predate row-level overrides,
 * so rows inherit the global discount like the quotation reference does.
 *
 * Case 1 - legacy documents without persisted calculation inputs: stored 0
 * for `vat_rate` / `discount_rate` predates the row-level mechanism, so 0
 * means "inherit" and is healed to null (mirrors `buildQuotationFormState`).
 *
 * Case 2 - documents WITH persisted calculation inputs: rows stored as 0
 * were corrupted by the Aug 2026 invoice save RPC COALESCE, which coerced
 * NULL to 0 for inheriting rows. The coercion applied to every inheriting
 * row regardless of the persisted global discount value, so the 0 is healed
 * to null unconditionally and the row inherits the global discount. The
 * global discount field must work independently of row-level values, so
 * healing cannot depend on the persisted discount being non-zero: a user may
 * type a discount in Edit on an invoice that was saved without one.
 *
 * Explicit non-zero row overrides are always preserved. Explicit 0 can only
 * be distinguished from RPC corruption on invoices saved outside the
 * composite RPC; the discount_rate column is hidden by default, so deliberate
 * 0 overrides are rare and re-settable.
 */
export function healLegacyCalculationOverrides(
  item: InvoiceItem,
  hasSavedCalculationInputs: boolean,
): InvoiceItem {
  if (!hasSavedCalculationInputs) {
    return {
      ...item,
      vat_rate: item.vat_rate === 0 ? null : item.vat_rate,
      discount_rate: item.discount_rate === 0 ? null : item.discount_rate,
    }
  }
  return {
    ...item,
    discount_rate: item.discount_rate === 0 ? null : item.discount_rate,
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
