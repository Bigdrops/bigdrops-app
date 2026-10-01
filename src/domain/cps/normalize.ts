import type { Cps, DbCps, DbCpsRow } from './types'
import { DEFAULT_TABLE_TEMPLATE, getDefaultColumnsForDocument } from '@/domain/table-document/templateRegistry'
import { createEmptyTableRow, ensureTableRowKeys } from '@/domain/table-document/rows'
import type { TableDocumentRow } from '@/domain/table-document/types'
import { nextAutomaticNumber } from '@/domain/prefixConstants'

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
    image_url: row.image_url || cells.image_url || null,
    group_id: row.group_id || cells.group_id || null,
    vat_rate: row.vat_rate ?? cells.vat_rate ?? null,
    discount_rate: row.discount_rate ?? cells.discount_rate ?? null,
    install_rate: row.install_rate ?? cells.install_rate ?? null,
    install_rate_override: row.install_rate_override ?? cells.install_rate_override ?? null,
    install_rate_taxable: row.install_rate_taxable ?? cells.install_rate_taxable ?? null,
    custom_data: cells.custom_data || {},
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

export const normalizeDbCps = (dbCps: any, dbRows: any[] = []): Cps => {
  const customFields =
    typeof dbCps.custom_fields === 'string'
      ? JSON.parse(dbCps.custom_fields)
      : (dbCps.custom_fields || {})

  return {
    ...dbCps,
    // Compatibility boundary: older rows stored the client in `vendor_name` and
    // the site in `vendor_contact`. Read them as fallbacks only.
    client_name: dbCps.client_name || dbCps.vendor_name || '',
    project_name: dbCps.project_name || dbCps.vendor_contact || '',
    template_id: customFields.template_id || DEFAULT_TABLE_TEMPLATE,
    issue_date: dbCps.issue_date || '',
    show_vendor_identity: customFields.show_vendor_identity ?? false,
    show_brand_name: dbCps.show_brand_name ?? false,
    background_color: dbCps.background_primary || '#FFFFFF',
    text_color: dbCps.text_color || '#1F2937',
    border_color: dbCps.background_secondary || '#94A3B8',
    accent_color: dbCps.accent_color || '#0F172A',
    preset_name: dbCps.palette_name || 'Clean Slate',
    custom_fields: customFields,
    table_rows: getStoredRows(customFields, dbRows),
    table_columns: Array.isArray(customFields.table_columns) && customFields.table_columns.length > 0
      ? customFields.table_columns
      : getDefaultColumnsForDocument('cps_sheets'),
  }
}

export const denormalizeToDbCps = (cps: Cps): DbCps => {
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
  } = cps as any

  const custom_fields = {
    ...(cps.custom_fields || {}),
    show_vendor_identity,
    template_id: template_id || DEFAULT_TABLE_TEMPLATE,
    table_rows: table_rows || [],
    table_columns: table_columns || getDefaultColumnsForDocument('cps_sheets'),
  }

  return {
    ...rest,
    issue_date: normalizeDate(cps.issue_date),
    background_primary: background_color,
    background_secondary: border_color,
    text_color: text_color,
    accent_color: accent_color,
    palette_name: preset_name,
    custom_fields,
  }
}

export const denormalizeToDbCpsRow = (row: TableDocumentRow, cpsId: string): DbCpsRow => {
  const {
    id,
    _uiKey,
    created_at,
    updated_at,
    specification,
    make_brand,
    cp,
    sp,
    image_url,
    group_id,
    vat_rate,
    discount_rate,
    install_rate,
    install_rate_override,
    install_rate_taxable,
    custom_data,
    ...rest
  } = row as TableDocumentRow & {
    created_at?: string
    updated_at?: string
  }

  return {
    ...rest,
    cps_sheet_id: cpsId,
    cells: {
      specification,
      make_brand,
      cp,
      sp,
      image_url,
      group_id,
      vat_rate,
      discount_rate,
      install_rate,
      install_rate_override,
      install_rate_taxable,
      custom_data,
    },
    quantity: Number(row.quantity || 0),
    sort_order: Number(row.sort_order || 0),
  }
}

export function getNextCpsNumber(
  rows: Array<{ cps_number: string }>,
  prefix = 'BOQ',
  cursor?: number,
): string {
  const family = `${prefix}-`
  const occupied = rows
    .map((row) => String(row.cps_number || '').trim().toUpperCase())
    .filter((value) => value.startsWith(family))
  const maxNumber = occupied
    .map((value) => {
      const match = value.match(/-(\d+)$/)
      return match ? Number(match[1]) : null
    })
    .filter((value): value is number => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 0)

  return nextAutomaticNumber(family, cursor, occupied, maxNumber).candidate
}
