import {
  getPdfCellValue,
  normalizeColumnConfig,
  normalizeVisibilityMode,
  resolveColumnBehavior,
  resolveInstallRate,
  shouldIncludeColumnInTotals,
} from '../../domain/invoice/columns'
import { normalizeQuantity } from '../../domain/invoice/normalize'
import type { ColumnConfig, InvoiceItem } from '../../domain/invoice/types'
import { formatMergedQtyUnit } from '../../domain/documentMedia.js'
import type {
  PdfCellValue,
  PdfColumnDefinition,
  PdfPageLayout,
  PdfResolvedTableSettings,
} from './types'

type SavedColumnConfig = {
  key: string
  label?: string
  type?: string
  visible?: boolean
  visibilityMode?: 'show' | 'hide_display' | 'hide_full'
  formula?: string
}

type InterpretPdfTableSettingsOptions = {
  mergeQtyUnit?: boolean
  items?: InvoiceItem[]
}

type BuildPdfRowCellsOptions = {
  mergeQtyUnit?: boolean
  configuredColumns?: SavedColumnConfig[]
  rowNumber?: number
}

const CONFIGURABLE_DEFAULT_COLUMNS: SavedColumnConfig[] = [
  { key: 'description', label: 'Description', visible: true, visibilityMode: 'show' },
  { key: 'quantity', label: 'Quantity', visible: true, visibilityMode: 'show' },
  { key: 'make', label: 'Make', visible: true, visibilityMode: 'show' },
  { key: 'unit', label: 'Unit', visible: true, visibilityMode: 'show' },
  { key: 'unit_price', label: 'Unit Price', visible: true, visibilityMode: 'show' },
  { key: 'amount', label: 'Amount', visible: true, visibilityMode: 'show' },
  { key: 'install_rate', label: 'Install Rate', type: 'install_rate', visible: false, visibilityMode: 'hide_display', formula: '' },
  { key: 'vat_rate', label: 'VAT Rate', type: 'vat_rate', visible: false, visibilityMode: 'hide_display' },
  { key: 'discount_rate', label: 'Discount Rate', type: 'discount_rate', visible: false, visibilityMode: 'hide_display' },
]

const FIXED_PDF_COLUMNS: PdfColumnDefinition[] = [
  { key: 'num', label: '#', kind: 'builtin', align: 'center', pdfWidth: 20, pdfFlex: 0.4 },
  { key: 'description', label: 'Description', kind: 'builtin', align: 'left', pdfWidth: 0, pdfFlex: 1.55 },
  { key: 'quantity', label: 'Qty', kind: 'builtin', align: 'center', pdfWidth: 44, pdfFlex: 0.72 },
  { key: 'unit_price', label: 'Unit Price', kind: 'builtin', align: 'right', pdfWidth: 72, pdfFlex: 0 },
  { key: 'amount', label: 'Amount', kind: 'builtin', align: 'right', pdfWidth: 78, pdfFlex: 0 },
]

function normalizeSavedColumns(columns: SavedColumnConfig[] = []) {
  if (Array.isArray(columns) && columns.length > 0) return columns.map((column) => ({
    ...column,
    visible: normalizeVisibilityMode(column) === 'show',
    visibilityMode: normalizeVisibilityMode(column),
  }))
  return CONFIGURABLE_DEFAULT_COLUMNS
}

function normalizeColumnKind(key: string) {
  return key.startsWith('custom_') ? 'custom' as const : 'builtin' as const
}

function normalizeColumnAlign(key: string, type?: string) {
  if (key === 'make') return 'left' as const
  if (key === 'unit') return 'center' as const
  if (key === 'vat_rate' || key === 'discount_rate') return 'center' as const
  if (key === 'install_rate' || type === 'number') return 'right' as const
  return 'left' as const
}

function toColumnConfig(column: SavedColumnConfig): ColumnConfig {
  return normalizeColumnConfig({
    key: String(column.key || '').trim(),
    label: String(column.label || column.key || '').trim(),
    type: column.type as ColumnConfig['type'],
    visible: column.visible !== false,
    visibilityMode: normalizeVisibilityMode(column),
    formula: typeof column.formula === 'string' ? column.formula : '',
  })
}

function createPdfColumnDefinition(
  column: SavedColumnConfig,
  overrides: Partial<PdfColumnDefinition> = {},
): PdfColumnDefinition {
  const key = String(column.key || '').trim()
  return {
    key,
    label: String(column.label || column.key || '').trim(),
    kind: normalizeColumnKind(key),
    align: normalizeColumnAlign(key, column.type),
    dataType: column.type || null,
    pdfWidth: column.type === 'number' ? 52 : 64,
    pdfFlex: column.type === 'number' ? 1.05 : 1.25,
    ...overrides,
  }
}

function resolveWeightedColumnWidth(column: PdfColumnDefinition) {
  const pdfWidth = Number(column.pdfWidth || 0)
  if (pdfWidth > 0) return pdfWidth
  return Number(column.pdfFlex || 0) * 72
}

export function buildPdfTableColumns(
  savedColumns: SavedColumnConfig[] = [],
  options: InterpretPdfTableSettingsOptions = {},
): PdfColumnDefinition[] {
  return interpretPdfTableSettings(savedColumns, options).columns
}

export function interpretPdfTableSettings(
  savedColumns: SavedColumnConfig[] = [],
  options: InterpretPdfTableSettingsOptions = {},
): PdfResolvedTableSettings {
  const mergeQtyUnit = options.mergeQtyUnit === true
  const configuredColumns = normalizeSavedColumns(savedColumns)
  const resolvedColumns = resolveColumnBehavior(
    configuredColumns.map(toColumnConfig),
    options.items || [],
    'pdf',
  )
  const resolvedKeys = new Set(resolvedColumns.map((column) => column.key))
  const resultColumns: PdfColumnDefinition[] = []

  configuredColumns.forEach(col => {
    const key = col.key
    const isCustom = key.startsWith('custom_')

    if (!resolvedKeys.has(key)) return
    if (mergeQtyUnit && key === 'unit') return

    const fixedBase = FIXED_PDF_COLUMNS.find(f => f.key === key)
    if (fixedBase) {
      resultColumns.push({
        ...fixedBase,
        label: col.label || fixedBase.label,
        ...(key === 'quantity' && mergeQtyUnit ? {
          label: 'Qty',
          pdfWidth: 76,
          pdfFlex: 0,
        } : {})
      })
    } else if (!isCustom) {
      let overrides: Partial<PdfColumnDefinition> = {}
      if (key === 'make') overrides = { pdfWidth: 58, pdfFlex: 1.1 }
      if (key === 'unit' && !mergeQtyUnit) overrides = { pdfWidth: 42, pdfFlex: 0 }
      if (key === 'install_rate') overrides = { dataType: 'install_rate', pdfWidth: 72, pdfFlex: 0 }
      if (key === 'vat_rate') overrides = { dataType: 'vat_rate', pdfWidth: 32, pdfFlex: 0.8 }
      if (key === 'discount_rate') overrides = { dataType: 'discount_rate', pdfWidth: 40, pdfFlex: 0.95 }
      
      resultColumns.push(createPdfColumnDefinition(col, overrides))
    } else if (isCustom) {
      resultColumns.push(createPdfColumnDefinition(col))
    }
  })

  if (!resultColumns.some((column) => column.key === 'description')) {
    const descriptionColumn = FIXED_PDF_COLUMNS.find((column) => column.key === 'description')
    if (descriptionColumn) resultColumns.splice(1, 0, descriptionColumn)
  }
  if (!resultColumns.some((column) => column.key === 'num')) {
    resultColumns.unshift(FIXED_PDF_COLUMNS[0])
  }

  return {
    mergeQtyUnit,
    configuredColumns,
    activeColumns: resolvedColumns.map((column) => createPdfColumnDefinition(column)),
    columns: resultColumns,
    customColumns: resolvedColumns.filter(c => c.key.startsWith('custom_')).map(c => createPdfColumnDefinition(c)),
  }
}

export function buildPdfRowCells(
  item: InvoiceItem,
  columns: PdfColumnDefinition[],
  options: BuildPdfRowCellsOptions = {},
): Record<string, PdfCellValue> {
  const mergeQtyUnit = options.mergeQtyUnit === true
  const configuredColumns = normalizeSavedColumns(options.configuredColumns)
  const installColumn = columns.find((column) => column.key === 'install_rate')
  const configuredInstallColumn = configuredColumns.find((column) => column.key === 'install_rate')
  const resolvedInstallColumn = configuredInstallColumn ? toColumnConfig(configuredInstallColumn) : undefined
  const installValue = installColumn && shouldIncludeColumnInTotals(resolvedInstallColumn)
    ? resolveInstallRate(item, resolvedInstallColumn)
    : undefined
  const amount = item.amount ?? normalizeQuantity(item.quantity, 1) * Number(item.unit_price || 0)

  return Object.fromEntries(columns.map((column) => {
    if (mergeQtyUnit && column.key === 'quantity') {
      return [column.key, formatMergedQtyUnit(normalizeQuantity(item.quantity, 1), item.unit || '')]
    }

    if (column.key === 'num') {
      return [column.key, options.rowNumber ? String(options.rowNumber) : '']
    }

    return [
      column.key,
      getPdfCellValue(
        {
          key: column.key,
          label: column.label,
          kind: column.kind,
          align: column.align || 'left',
          pdfWidth: Number(column.pdfWidth || 0),
          pdfFlex: Number(column.pdfFlex || 0),
          type: (column.dataType || undefined) as ColumnConfig['type'],
        },
        item,
        { amount, installColumn: resolvedInstallColumn, installValue },
      ),
    ]
  }))
}

export function resolvePdfPageLayout(columns: PdfColumnDefinition[]): PdfPageLayout {
  const widthDemand = columns.reduce((sum, column) => sum + resolveWeightedColumnWidth(column), 0)
  const orientation = widthDemand > 600 ? 'landscape' : 'portrait'
  return { size: 'A4', orientation }
}
