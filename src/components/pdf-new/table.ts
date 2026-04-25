import { getPdfCellValue, resolveInstallRate } from '../../domain/invoice/columns'
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
  formula?: string
}

type InterpretPdfTableSettingsOptions = {
  mergeQtyUnit?: boolean
}

type BuildPdfRowCellsOptions = {
  mergeQtyUnit?: boolean
  configuredColumns?: SavedColumnConfig[]
  rowNumber?: number
}

const CONFIGURABLE_DEFAULT_COLUMNS: SavedColumnConfig[] = [
  { key: 'make', label: 'Make', visible: true },
  { key: 'unit', label: 'Unit', visible: true },
  { key: 'install_rate', label: 'Install Rate', type: 'install_rate', visible: false, formula: '' },
  { key: 'vat_rate', label: 'VAT Rate', type: 'vat_rate', visible: false },
  { key: 'discount_rate', label: 'Discount Rate', type: 'discount_rate', visible: false },
]

const FIXED_PDF_COLUMNS: PdfColumnDefinition[] = [
  { key: 'num', label: '#', kind: 'builtin', align: 'center', pdfWidth: 20, pdfFlex: 0.45 },
  { key: 'description', label: 'Description', kind: 'builtin', align: 'left', pdfWidth: 0, pdfFlex: 2.9 },
  { key: 'quantity', label: 'Qty', kind: 'builtin', align: 'center', pdfWidth: 28, pdfFlex: 0.7 },
  { key: 'unit_price', label: 'Unit Price', kind: 'builtin', align: 'right', pdfWidth: 54, pdfFlex: 1.2 },
  { key: 'amount', label: 'Amount', kind: 'builtin', align: 'right', pdfWidth: 62, pdfFlex: 1.35 },
]

function normalizeSavedColumns(columns: SavedColumnConfig[] = []) {
  if (Array.isArray(columns) && columns.length > 0) return columns
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
  return {
    key: String(column.key || '').trim(),
    label: String(column.label || column.key || '').trim(),
    type: column.type as ColumnConfig['type'],
    visible: column.visible !== false,
    formula: typeof column.formula === 'string' ? column.formula : '',
  }
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
  const CONFIGURABLE_KEYS = new Set(['make', 'unit', 'install_rate', 'vat_rate', 'discount_rate'])
  
  const configuredColumns = normalizeSavedColumns(savedColumns)
  const mandatoryKeys = ['num', 'description', 'quantity', 'unit_price', 'amount']
  const resultColumns: PdfColumnDefinition[] = []
  
  configuredColumns.forEach(col => {
    const key = col.key
    const isMandatory = mandatoryKeys.includes(key)
    const isConfigurable = CONFIGURABLE_KEYS.has(key)
    const isCustom = key.startsWith('custom_')

    if (col.visible === false && !isMandatory) return

    const fixedBase = FIXED_PDF_COLUMNS.find(f => f.key === key)
    if (fixedBase) {
      resultColumns.push({
        ...fixedBase,
        label: col.label || fixedBase.label,
        ...(key === 'quantity' && mergeQtyUnit ? {
          label: 'Qty',
          pdfWidth: 56,
          pdfFlex: 0.9
        } : {})
      })
    } else if (isConfigurable) {
      let overrides: Partial<PdfColumnDefinition> = {}
      if (key === 'make') overrides = { pdfWidth: 48, pdfFlex: 1.25 }
      if (key === 'unit' && !mergeQtyUnit) overrides = { pdfWidth: 34, pdfFlex: 0.85 }
      if (key === 'install_rate') overrides = { dataType: 'install_rate', pdfWidth: 54, pdfFlex: 1.15 }
      if (key === 'vat_rate') overrides = { dataType: 'vat_rate', pdfWidth: 32, pdfFlex: 0.8 }
      if (key === 'discount_rate') overrides = { dataType: 'discount_rate', pdfWidth: 40, pdfFlex: 0.95 }
      
      if (Object.keys(overrides).length > 0 || (key === 'unit' && !mergeQtyUnit)) {
        resultColumns.push(createPdfColumnDefinition(col, overrides))
      }
    } else if (isCustom) {
      resultColumns.push(createPdfColumnDefinition(col))
    }
  })

  mandatoryKeys.forEach((key, idx) => {
    if (!resultColumns.some(c => c.key === key)) {
      const fixedBase = FIXED_PDF_COLUMNS.find(f => f.key === key)
      if (fixedBase) {
        if (key === 'num' || key === 'description') {
           resultColumns.splice(idx === 0 ? 0 : 1, 0, fixedBase)
        } else {
           resultColumns.push(fixedBase)
        }
      }
    }
  })

  return {
    mergeQtyUnit,
    configuredColumns,
    activeColumns: configuredColumns.filter(c => c.visible !== false).map(c => createPdfColumnDefinition(c)),
    columns: resultColumns,
    customColumns: configuredColumns.filter(c => c.key.startsWith('custom_')).map(c => createPdfColumnDefinition(c)),
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
  const installValue = installColumn ? resolveInstallRate(item, configuredInstallColumn ? toColumnConfig(configuredInstallColumn) : undefined) : undefined
  const amount = item.amount ?? Number(item.quantity || 0) * Number(item.unit_price || 0)

  return Object.fromEntries(columns.map((column) => {
    if (mergeQtyUnit && column.key === 'quantity') {
      return [column.key, formatMergedQtyUnit(item.quantity ?? '', item.unit || '')]
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
        { amount, installColumn: configuredInstallColumn ? toColumnConfig(configuredInstallColumn) : undefined, installValue },
      ),
    ]
  }))
}

export function resolvePdfPageLayout(columns: PdfColumnDefinition[]): PdfPageLayout {
  const widthDemand = columns.reduce((sum, column) => sum + resolveWeightedColumnWidth(column), 0)
  const orientation = widthDemand > 600 ? 'landscape' : 'portrait'
  return { size: 'A4', orientation }
}
