import {
  BUILTIN_COLUMNS,
  ensureUiKey,
  inferLegacyCalculationState,
  normalizeAdditionalFieldEntries,
  normalizeFieldEntries,
  parseCustomFields,
  toNumber,
  toNullableDate,
} from '@/domain/invoice'
import { resolveCanonicalItemImageUrl } from '@/domain/documentMedia.js'
import type { InvoiceItem } from '@/domain/invoice'
import type {
  DbQuotation,
  DbQuotationItem,
  Quotation,
  QuotationCustomFields,
  QuotationFormState,
} from './types'

export function getQuotationNumber(row: Partial<DbQuotation> | null | undefined): string {
  return String(row?.quotation_number || '')
}

export function getNextQuotationNumber(
  rows: Array<Pick<DbQuotation, 'quotation_number'>>,
  prefix = 'SASIQUO',
): string {
  const maxNumber = rows
    .map((row) => String(row.quotation_number || '').trim().toUpperCase())
    .filter((value) => value.startsWith(`${prefix}-`))
    .map((value) => {
      const match = value.match(/-(\d+)$/)
      return match ? Number(match[1]) : null
    })
    .filter((value): value is number => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 0)

  return `${prefix}-${String(maxNumber + 1).padStart(3, '0')}`
}

export function mapDbQuotation(row: DbQuotation): Quotation {
  const customFields = parseCustomFields(row.custom_fields) as QuotationCustomFields

  return {
    ...row,
    id: row.id ?? null,
    quotation_number: row.quotation_number || '',
    po_number: row.po_number || '',
    quotation_title: row.quotation_title || customFields.quotationTitle || '',
    client_id: row.client_id ?? null,
    client_name: row.client_name || customFields.clientName || '',
    project_id: row.project_id ?? null,
    issue_date: row.issue_date ?? null,
    valid_until: toNullableDate(row.valid_until),
    status: (row.status as Quotation['status']) || 'open',
    notes: row.notes || customFields.notesHtml || '',
    terms: row.terms || customFields.termsHtml || '',
    workmanship: toNumber(row.workmanship),
    transportation: toNumber(row.transportation),
    shipping: toNumber(row.shipping),
    discount: toNumber(row.discount),
    vat: toNumber(row.vat),
    wht: toNumber(row.wht),
    subtotal: toNumber(row.subtotal),
    install_rate_total: toNumber(row.install_rate_total),
    total: toNumber(row.total),
    amount_in_words: row.amount_in_words || '',
    custom_fields: customFields,
    archived_at: row.archived_at ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  }
}

export function mapDbQuotationItem(row: DbQuotationItem): InvoiceItem {
  const customData =
    typeof row.custom_data === 'string'
      ? (() => {
          try {
            return JSON.parse(row.custom_data || '{}')
          } catch {
            return {}
          }
        })()
      : row.custom_data && typeof row.custom_data === 'object'
        ? row.custom_data
        : {}

  const installRate =
    row.install_rate === null || row.install_rate === undefined || row.install_rate === ''
      ? null
      : toNumber(row.install_rate)

  return ensureUiKey({
    id: row.id ?? null,
    item_id: row.item_id ?? null,
    description: row.description || '',
    sub_description: row.sub_description || '',
    make: row.make || '',
    quantity: toNumber(row.quantity, 1),
    unit: row.unit || '',
    unit_price: toNumber(row.unit_price),
    amount: toNumber(row.amount),
    install_rate: installRate,
    install_rate_override: installRate !== null && installRate !== 0,
    vat_rate:
      row.vat_rate === null || row.vat_rate === undefined || row.vat_rate === ''
        ? null
        : toNumber(row.vat_rate),
    discount_rate:
      row.discount_rate === null || row.discount_rate === undefined || row.discount_rate === ''
        ? null
        : toNumber(row.discount_rate),
    row_type: row.row_type === 'group_header' ? 'group_header' : 'standard',
    group_id: row.group_id ?? null,
    group_name: row.group_name || '',
    sort_order: toNumber(row.sort_order),
    image_url: resolveCanonicalItemImageUrl(row),
    custom_data: customData,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  })
}

export function buildQuotationFormState(
  quotationRow: DbQuotation,
  itemRows: DbQuotationItem[],
): QuotationFormState {
  const quotation = mapDbQuotation(quotationRow)
  const customFields = quotation.custom_fields || {}
  const hasSavedCalculationInputs = Boolean(customFields.calculationInputs)
  const items = (itemRows || []).length
    ? itemRows.map((row) => {
        const item = mapDbQuotationItem(row)
        if (!hasSavedCalculationInputs) {
          return {
            ...item,
            vat_rate: item.vat_rate === 0 ? null : item.vat_rate,
            discount_rate: item.discount_rate === 0 ? null : item.discount_rate,
          }
        }
        return item
      })
    : [ensureUiKey({ description: '', quantity: 1, unit_price: 0, row_type: 'standard', custom_data: {} })]

  const columns = Array.isArray(customFields.columnConfig)
    ? customFields.columnConfig.map((saved) => {
        const base = BUILTIN_COLUMNS.find((column) => column.key === saved.key)
        return base ? { ...base, ...saved } : saved
      })
    : BUILTIN_COLUMNS.map((column) => ({ ...column }))

  const legacyCalculationState = inferLegacyCalculationState({
    invoice: quotationRow,
    items,
    customFields,
  })
  const { calculationInputs, editableInputs } = legacyCalculationState

  return {
    quotation: {
      ...quotation,
      vat: editableInputs.vatRate,
      discount: editableInputs.discountValue,
      wht: calculationInputs.whtValue,
    },
    items,
    columns,
    headerFields: normalizeFieldEntries(customFields.header, 'value'),
    additionalFields: normalizeAdditionalFieldEntries(customFields.additionalFields, customFields.bottom),
    discountType: calculationInputs.discountType,
    discountTiming: calculationInputs.discountTiming,
    whtType: calculationInputs.whtType,
    notesTitle: String(customFields.notesTitle || 'Notes'),
    termsTitle: String(customFields.termsTitle || 'Terms and Conditions'),
    mergeQtyUnit: Boolean(customFields.mergeQtyUnit),
    showItemImages: Boolean(customFields.showItemImages),
  }
}
