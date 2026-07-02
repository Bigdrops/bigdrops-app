import type {
  ColumnConfig,
  ColumnVisibilityMode,
  ColumnTypeOption,
  InvoiceItem,
  PdfCellValueHelpers,
  PdfColumnDefinition,
} from './types'
import { normalizeQuantity } from './normalize'

export const DEFAULT_COLUMN_ORDER = [
  'description',
  'quantity',
  'make',
  'unit',
  'unit_price',
  'amount',
  'install_rate',
  'vat_rate',
  'discount_rate',
] as const

export const BUILTIN_COLUMNS: ColumnConfig[] = [
  { key: 'description', label: 'Description', visible: true, visibilityMode: 'show', removable: false },
  { key: 'quantity', label: 'Quantity', visible: true, visibilityMode: 'show', removable: false },
  { key: 'make', label: 'Make', visible: true, visibilityMode: 'show', removable: false },
  { key: 'unit', label: 'Unit', visible: true, visibilityMode: 'show', removable: false },
  { key: 'unit_price', label: 'Unit Price', visible: true, visibilityMode: 'show', removable: false },
  { key: 'amount', label: 'Amount', visible: true, visibilityMode: 'show', removable: false },
  { key: 'install_rate', label: 'Install Rate', type: 'install_rate', visible: false, visibilityMode: 'hide_display', removable: false, includeInTotal: true, formula: '' },
  { key: 'vat_rate', label: 'VAT Rate', type: 'vat_rate', visible: false, visibilityMode: 'hide_display', removable: false },
  { key: 'discount_rate', label: 'Discount Rate', type: 'discount_rate', visible: false, visibilityMode: 'hide_display', removable: false },
]

export function getResetColumnConfigs(): ColumnConfig[] {
  const builtinsByKey = new Map(BUILTIN_COLUMNS.map((column) => [column.key, column]))

  return DEFAULT_COLUMN_ORDER
    .map((key) => builtinsByKey.get(key))
    .filter(Boolean)
    .map((column) => normalizeColumnConfig({ ...column! }))
}

export const COLUMN_TYPES: ColumnTypeOption[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
]

export function resolveInstallRate(item: InvoiceItem, installCol?: ColumnConfig): number {
  if (item.install_rate_override && item.install_rate !== null && item.install_rate !== undefined) {
    return Number(item.install_rate)
  }
  if (installCol?.formula) {
    const factor = parseFloat(installCol.formula)
    if (!Number.isNaN(factor) && factor > 0) {
      return factor * normalizeQuantity(item.quantity, 1) * Number(item.unit_price || 0)
    }
  }
  if (!installCol?.formula && item.install_rate !== null && item.install_rate !== undefined) {
    return Number(item.install_rate || 0)
  }
  return 0
}

const ALWAYS_VISIBLE_COLUMN_KEYS = new Set(['description'])
const NEVER_AUTO_HIDE_COLUMN_KEYS = new Set(['description', 'quantity', 'unit_price'])

export function normalizeVisibilityMode(column?: Pick<ColumnConfig, 'visible' | 'visibilityMode'> | null): ColumnVisibilityMode {
  if (column?.visibilityMode === 'hide_display' || column?.visibilityMode === 'hide_full' || column?.visibilityMode === 'show') {
    return column.visibilityMode
  }
  if (column?.visible === false) return 'hide_display'
  return 'show'
}

export function normalizeColumnConfig(column: ColumnConfig): ColumnConfig {
  const visibilityMode = ALWAYS_VISIBLE_COLUMN_KEYS.has(column.key)
    ? 'show'
    : normalizeVisibilityMode(column)

  return {
    ...column,
    visible: visibilityMode === 'show',
    visibilityMode,
  }
}

function isEmptyColumnValue(value: unknown): boolean {
  return value === null || value === undefined || value === ''
}

function itemHasVisibleValue(item: InvoiceItem, column: ColumnConfig): boolean {
  if (item.row_type === 'group_header') return false

  switch (column.key) {
    case 'description':
      return !isEmptyColumnValue(item.description)
    case 'quantity':
      return !isEmptyColumnValue(item.quantity)
    case 'unit':
      return !isEmptyColumnValue(item.unit)
    case 'unit_price':
      return !isEmptyColumnValue(item.unit_price)
    case 'amount':
      return true
    case 'make':
      return !isEmptyColumnValue(item.make)
    case 'install_rate':
      return !isEmptyColumnValue(item.install_rate) && Number(item.install_rate) !== 0
    case 'vat_rate':
      return !isEmptyColumnValue(item.vat_rate)
    case 'discount_rate':
      return !isEmptyColumnValue(item.discount_rate)
    default: {
      const value = (item.custom_data || {})[column.key]
      if (column.type === 'number') return !isEmptyColumnValue(value) && Number(value) !== 0
      return !isEmptyColumnValue(value)
    }
  }
}

export function resolveColumnBehavior(
  columns: ColumnConfig[] = [],
  items: InvoiceItem[] = [],
  context: 'form' | 'pdf' | 'view',
): ColumnConfig[] {
  return columns
    .map(normalizeColumnConfig)
    .filter((column) => {
      if (ALWAYS_VISIBLE_COLUMN_KEYS.has(column.key)) return true

      const visibilityMode = column.visibilityMode || 'show'
      if (visibilityMode === 'hide_full') return false
      if (visibilityMode === 'hide_display') return false
      if (context === 'form') return true
      if (NEVER_AUTO_HIDE_COLUMN_KEYS.has(column.key)) return true
      return items.some((item) => itemHasVisibleValue(item, column))
    })
}

export function shouldIncludeColumnInTotals(column?: ColumnConfig | null): boolean {
  if (!column) return false
  return normalizeVisibilityMode(column) !== 'hide_full'
}

export function getActiveColumns(columns: ColumnConfig[] = []): ColumnConfig[] {
  return resolveColumnBehavior(columns, [], 'form')
}

export function getPdfColumns(columns: ColumnConfig[] = [], items: InvoiceItem[] = []): PdfColumnDefinition[] {
  const activeColumns = resolveColumnBehavior(columns, items, 'pdf')

  const builtinPdfProps: Record<string, Pick<PdfColumnDefinition, 'align' | 'pdfWidth' | 'pdfFlex'>> = {
    description: { align: 'left', pdfWidth: 0, pdfFlex: 2.9 },
    make: { align: 'left', pdfWidth: 48, pdfFlex: 1.25 },
    quantity: { align: 'center', pdfWidth: 28, pdfFlex: 0.7 },
    unit: { align: 'center', pdfWidth: 34, pdfFlex: 0.85 },
    unit_price: { align: 'right', pdfWidth: 54, pdfFlex: 1.2 },
    amount: { align: 'right', pdfWidth: 62, pdfFlex: 1.35 },
    install_rate: { align: 'right', pdfWidth: 54, pdfFlex: 1.15 },
    vat_rate: { align: 'center', pdfWidth: 32, pdfFlex: 0.8 },
    discount_rate: { align: 'center', pdfWidth: 40, pdfFlex: 0.95 },
  }

  const ordered: PdfColumnDefinition[] = [
    { key: 'num', label: '#', kind: 'builtin', align: 'center', pdfWidth: 20, pdfFlex: 0.45 },
  ]

  for (const col of activeColumns) {
    if (col.key.startsWith('custom_')) {
      ordered.push({
        key: col.key,
        label: col.label || 'Custom',
        kind: 'custom',
        type: col.type || 'text',
        align: col.type === 'number' ? 'right' : 'left',
        pdfWidth: col.type === 'number' ? 52 : 64,
        pdfFlex: col.type === 'number' ? 1.05 : 1.25,
      })
    } else {
      const props = builtinPdfProps[col.key]
      if (props) {
        ordered.push({
          key: col.key,
          label: col.label,
          kind: 'builtin',
          align: props.align,
          pdfWidth: props.pdfWidth,
          pdfFlex: props.pdfFlex,
        })
      }
    }
  }

  return ordered
}

function formatPdfPercentValue(value: number | string | null | undefined, zeroLabel: string): string {
  if (value === null || value === undefined || value === '') return ''
  if (Number(value) === 0) return zeroLabel
  return `${Number(value).toLocaleString()}%`
}

export function getPdfCellValue(column: PdfColumnDefinition, item: InvoiceItem, helpers: PdfCellValueHelpers = {}): string | number {
  if (column.key === 'description') return item.description || ''
  if (column.key === 'make') return item.make || ''
  if (column.key === 'quantity') return normalizeQuantity(item.quantity, 1)
  if (column.key === 'unit') return item.unit || ''
  if (column.key === 'unit_price') return Number(item.unit_price || 0).toLocaleString()
  if (column.key === 'amount') return Number(helpers.amount || 0).toLocaleString()
  if (column.key === 'install_rate') {
    const installValue =
      helpers.installValue !== undefined
        ? Number(helpers.installValue || 0)
        : resolveInstallRate(item, helpers.installColumn)
    return installValue > 0 ? installValue.toLocaleString() : ''
  }
  if (column.key === 'vat_rate') return formatPdfPercentValue(item.vat_rate, '0%')
  if (column.key === 'discount_rate') return formatPdfPercentValue(item.discount_rate, '0%')
  if (column.kind === 'custom') {
    const value = (item.custom_data || {})[column.key]
    if (value === null || value === undefined || value === '') return ''
    return column.type === 'number' ? Number(value).toLocaleString() : String(value)
  }
  return ''
}
