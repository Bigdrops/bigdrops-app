import { Rfq, DbRfq, RfqItem, DbRfqItem } from './types'
import { DEFAULT_TABLE_TEMPLATE, getDefaultColumnsForDocument } from '@/domain/table-document/templateRegistry'
import { createEmptyTableRow, ensureTableRowKeys } from '@/domain/table-document/rows'
import type { TableDocumentRow } from '@/domain/table-document/types'

const normalizeDate = (value?: string | null): string | null =>
  value && value.trim() ? value : null

function mapLegacyItemToRow(item: any, idx: number): TableDocumentRow {
  return {
    ...createEmptyTableRow(idx, 'item'),
    id: item.id,
    _uiKey: item.id || crypto.randomUUID(),
    sort_order: item.sort_order ?? idx,
    description: item.description || '',
    specification: item.specification || '',
    quantity: Number(item.quantity || 0),
    unit: item.unit || '',
    notes: item.notes || '',
  }
}

function getStoredRows(customFields: Record<string, any>, dbItems: any[]): TableDocumentRow[] {
  if (Array.isArray(customFields.table_rows) && customFields.table_rows.length > 0) {
    return ensureTableRowKeys(
      customFields.table_rows.map((row: any, idx: number) => ({
        ...createEmptyTableRow(idx, row?.row_type === 'section' ? 'section' : 'item'),
        ...row,
        quantity: Number(row?.quantity || 0),
      })),
    )
  }

  return ensureTableRowKeys(dbItems.map(mapLegacyItemToRow))
}

export const normalizeDbRfq = (dbRfq: any, dbItems: any[] = []): Rfq => {
  const customFields =
    typeof dbRfq.custom_fields === 'string'
      ? JSON.parse(dbRfq.custom_fields)
      : (dbRfq.custom_fields || {});

  return {
    ...dbRfq,
    template_id: customFields.template_id || DEFAULT_TABLE_TEMPLATE,
    issue_date: dbRfq.issue_date || '',
    expiry_date: dbRfq.expiry_date || '',
    show_vendor_identity: customFields.show_vendor_identity ?? false,
    show_brand_name: dbRfq.show_brand_name ?? false,
    background_color: dbRfq.background_primary || '#FFFFFF',
    text_color: dbRfq.text_color || '#1F2937',
    border_color: dbRfq.background_secondary || '#D1D5DB',
    accent_color: dbRfq.accent_color || '#1D4ED8',
    preset_name: dbRfq.palette_name || 'Clean Slate',
    custom_fields: customFields,
    table_rows: getStoredRows(customFields, dbItems),
    table_columns: Array.isArray(customFields.table_columns) && customFields.table_columns.length > 0
      ? customFields.table_columns
      : getDefaultColumnsForDocument('rfq'),
    items: dbItems
      .map((item, idx) => ({
        ...item,
        _uiKey: item.id || crypto.randomUUID(),
        sort_order: item.sort_order ?? idx,
        quantity: Number(item.quantity || 0),
      }))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
  }
}

export const denormalizeToDbRfq = (rfq: Rfq): DbRfq => {
  const {
    id,
    created_at,
    updated_at,
    items,
    show_vendor_identity,
    background_color,
    text_color,
    border_color,
    accent_color,
    preset_name,
    ...rest
  } = rfq as any

  const custom_fields = {
    ...(rfq.custom_fields || {}),
    show_vendor_identity,
    template_id: rfq.template_id || DEFAULT_TABLE_TEMPLATE,
    table_rows: rfq.table_rows || [],
    table_columns: rfq.table_columns || getDefaultColumnsForDocument('rfq'),
  };

  return {
    ...rest,
    issue_date: normalizeDate(rfq.issue_date),
    expiry_date: normalizeDate(rfq.expiry_date),
    background_primary: background_color,
    background_secondary: border_color,
    text_color: text_color,
    accent_color: accent_color,
    palette_name: preset_name,
    custom_fields,
  }
}

export const denormalizeToDbRfqItem = (item: RfqItem, rfqId: string): DbRfqItem => {
  const {
    id,
    _uiKey,
    created_at,
    updated_at,
    ...rest
  } = item as RfqItem & {
    created_at?: string
    updated_at?: string
  }

  return {
    ...rest,
    rfq_id: rfqId,
    quantity: Number(item.quantity || 0),
    sort_order: Number(item.sort_order || 0),
  }
}

export function getNextRfqNumber(
  rows: Array<{ rfq_number: string }>,
  prefix = 'RFQ',
): string {
  const maxNumber = rows
    .map((row) => String(row.rfq_number || '').trim().toUpperCase())
    .filter((value) => value.startsWith(`${prefix}-`))
    .map((value) => {
      const match = value.match(/-(\d+)$/)
      return match ? Number(match[1]) : null
    })
    .filter((value): value is number => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 0)

  return `${prefix}-${String(maxNumber + 1).padStart(3, '0')}`
}
