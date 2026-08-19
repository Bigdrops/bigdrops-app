import type { Boq, DbBoq, DbBoqRow } from './types'
import { DEFAULT_TABLE_TEMPLATE, getDefaultColumnsForDocument } from '@/domain/table-document/templateRegistry'
import { createEmptyTableRow, ensureTableRowKeys } from '@/domain/table-document/rows'
import type { TableDocumentRow } from '@/domain/table-document/types'

const normalizeDate = (value?: string | null): string | null =>
  value && value.trim() ? value : null

function parseCells(cells: unknown): Record<string, any> {
  if (typeof cells === 'string') {
    try {
      return JSON.parse(cells)
    } catch {
      return {}
    }
  }
  return (cells || {}) as Record<string, any>
}

function mapLegacyRowToRow(row: any, idx: number): TableDocumentRow {
  const cells = parseCells(row.cells)

  return {
    ...createEmptyTableRow(idx, row.row_type === 'section' ? 'section' : 'item'),
    id: row.id,
    _uiKey: row.id || crypto.randomUUID(),
    sort_order: row.sort_order ?? idx,
    section_title: row.section_title || '',
    description: row.description || '',
    specification: cells.specification || '',
    quantity: Number(row.quantity || 0),
    unit: row.unit || '',
    notes: row.notes || '',
    make_brand: cells.make_brand || '',
    cp: cells.cp ?? '',
    sp: cells.sp ?? '',
  }
}

function getStoredRows(customFields: Record<string, any>, dbRows: any[]): TableDocumentRow[] {
  if (Array.isArray(customFields.table_rows) && customFields.table_rows.length > 0) {
    return ensureTableRowKeys(
      customFields.table_rows.map((row: any, idx: number) => ({
        ...createEmptyTableRow(idx, row?.row_type === 'section' ? 'section' : 'item'),
        ...row,
        quantity: Number(row?.quantity || 0),
      })),
    )
  }

  return ensureTableRowKeys(dbRows.map(mapLegacyRowToRow))
}

export const normalizeDbBoq = (dbBoq: any, dbRows: any[] = []): Boq => {
  const customFields =
    typeof dbBoq.custom_fields === 'string'
      ? JSON.parse(dbBoq.custom_fields)
      : (dbBoq.custom_fields || {})

  return {
    ...dbBoq,
    template_id: customFields.template_id || DEFAULT_TABLE_TEMPLATE,
    issue_date: dbBoq.issue_date || '',
    show_vendor_identity: customFields.show_vendor_identity ?? false,
    show_brand_name: dbBoq.show_brand_name ?? false,
    background_color: dbBoq.background_primary || '#FFFFFF',
    text_color: dbBoq.text_color || '#1F2937',
    border_color: dbBoq.background_secondary || '#94A3B8',
    accent_color: dbBoq.accent_color || '#0F172A',
    preset_name: dbBoq.palette_name || 'Clean Slate',
    custom_fields: customFields,
    table_rows: getStoredRows(customFields, dbRows),
    table_columns: Array.isArray(customFields.table_columns) && customFields.table_columns.length > 0
      ? customFields.table_columns
      : getDefaultColumnsForDocument('boq'),
  }
}

export const denormalizeToDbBoq = (boq: Boq): DbBoq => {
  const {
    id,
    created_at,
    updated_at,
    template_id,
    table_rows,
    table_columns,
    show_vendor_identity,
    background_color,
    text_color,
    border_color,
    accent_color,
    preset_name,
    ...rest
  } = boq as any

  const custom_fields = {
    ...(boq.custom_fields || {}),
    show_vendor_identity,
    template_id: template_id || DEFAULT_TABLE_TEMPLATE,
    table_rows: table_rows || [],
    table_columns: table_columns || getDefaultColumnsForDocument('boq'),
  }

  return {
    ...rest,
    issue_date: normalizeDate(boq.issue_date),
    background_primary: background_color,
    background_secondary: border_color,
    text_color: text_color,
    accent_color: accent_color,
    palette_name: preset_name,
    custom_fields,
  }
}

export const denormalizeToDbBoqRow = (row: TableDocumentRow, boqId: string): DbBoqRow => {
  const {
    id,
    _uiKey,
    created_at,
    updated_at,
    specification,
    make_brand,
    cp,
    sp,
    ...rest
  } = row as TableDocumentRow & {
    created_at?: string
    updated_at?: string
  }

  return {
    ...rest,
    boq_id: boqId,
    cells: { specification, make_brand, cp, sp },
    quantity: Number(row.quantity || 0),
    sort_order: Number(row.sort_order || 0),
  }
}

export function getNextBoqNumber(
  rows: Array<{ boq_number: string }>,
  prefix = 'BOQ',
): string {
  const maxNumber = rows
    .map((row) => String(row.boq_number || '').trim().toUpperCase())
    .filter((value) => value.startsWith(`${prefix}-`))
    .map((value) => {
      const match = value.match(/-(\d+)$/)
      return match ? Number(match[1]) : null
    })
    .filter((value): value is number => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 0)

  return `${prefix}-${String(maxNumber + 1).padStart(3, '0')}`
}
