import type {
  ColumnConfig,
  ColumnTypeOption,
  InvoiceItem,
  PdfCellValueHelpers,
  PdfColumnDefinition,
} from './types'

export const BUILTIN_COLUMNS: ColumnConfig[] = [
  { key: 'make', label: 'Make', visible: true, removable: false },
  { key: 'unit', label: 'Unit', visible: true, removable: false },
  { key: 'install_rate', label: 'Install Rate', type: 'install_rate', visible: true, removable: false, includeInTotal: true, formula: '' },
  { key: 'vat_rate', label: 'VAT Rate', type: 'vat_rate', visible: false, removable: false },
  { key: 'discount_rate', label: 'Discount Rate', type: 'discount_rate', visible: false, removable: false },
]

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
      return factor * Number(item.quantity || 1) * Number(item.unit_price || 0)
    }
  }
  if (!installCol?.formula && item.install_rate !== null && item.install_rate !== undefined) {
    return Number(item.install_rate || 0)
  }
  return 0
}

export function getActiveColumns(columns: ColumnConfig[] = []): ColumnConfig[] {
  const orderedColumns = Array.isArray(columns) && columns.length ? columns : BUILTIN_COLUMNS
  return orderedColumns.filter((column) => column.visible !== false)
}

export function getPdfColumns(columns: ColumnConfig[] = []): PdfColumnDefinition[] {
  const activeColumns = getActiveColumns(columns)
  const getColumn = (key: string) => activeColumns.find((column) => column.key === key)
  const customColumns = activeColumns.filter((column) => column.key.startsWith('custom_'))

  const orderedColumns: Array<PdfColumnDefinition | null> = [
    { key: 'num', label: '#', kind: 'builtin', align: 'center', pdfWidth: 20, pdfFlex: 0.45 },
    { key: 'description', label: 'Description', kind: 'builtin', align: 'left', pdfWidth: 0, pdfFlex: 2.9 },
    getColumn('make')
      ? { key: 'make', label: getColumn('make')?.label || 'Make', kind: 'builtin', align: 'left', pdfWidth: 48, pdfFlex: 1.25 }
      : null,
    { key: 'quantity', label: 'Qty', kind: 'builtin', align: 'center', pdfWidth: 28, pdfFlex: 0.7 },
    getColumn('unit')
      ? { key: 'unit', label: getColumn('unit')?.label || 'Unit', kind: 'builtin', align: 'center', pdfWidth: 34, pdfFlex: 0.85 }
      : null,
    { key: 'unit_price', label: 'Unit Price', kind: 'builtin', align: 'right', pdfWidth: 54, pdfFlex: 1.2 },
    { key: 'amount', label: 'Amount (NGN)', kind: 'builtin', align: 'right', pdfWidth: 62, pdfFlex: 1.35 },
    getColumn('install_rate')
      ? { key: 'install_rate', label: getColumn('install_rate')?.label || 'Install Rate', kind: 'builtin', align: 'right', pdfWidth: 54, pdfFlex: 1.15 }
      : null,
    getColumn('vat_rate')
      ? { key: 'vat_rate', label: getColumn('vat_rate')?.label || 'VAT %', kind: 'builtin', align: 'center', pdfWidth: 32, pdfFlex: 0.8 }
      : null,
    getColumn('discount_rate')
      ? { key: 'discount_rate', label: getColumn('discount_rate')?.label || 'Disc %', kind: 'builtin', align: 'center', pdfWidth: 40, pdfFlex: 0.95 }
      : null,
    ...customColumns.map((column) => ({
      key: column.key,
      label: column.label || 'Custom',
      kind: 'custom' as const,
      type: column.type || 'text',
      align: column.type === 'number' ? 'right' as const : 'left' as const,
      pdfWidth: column.type === 'number' ? 52 : 64,
      pdfFlex: column.type === 'number' ? 1.05 : 1.25,
    })),
  ]

  return orderedColumns.filter(Boolean) as PdfColumnDefinition[]
}

function formatPdfPercentValue(value: number | string | null | undefined, zeroLabel: string): string {
  if (value === null || value === undefined || value === '') return '-'
  if (Number(value) === 0) return zeroLabel
  return `${Number(value).toLocaleString()}%`
}

export function getPdfCellValue(column: PdfColumnDefinition, item: InvoiceItem, helpers: PdfCellValueHelpers = {}): string | number {
  if (column.key === 'description') return item.description || ''
  if (column.key === 'make') return item.make || ''
  if (column.key === 'quantity') return item.quantity ?? ''
  if (column.key === 'unit') return item.unit || ''
  if (column.key === 'unit_price') return Number(item.unit_price || 0).toLocaleString()
  if (column.key === 'amount') return Number(helpers.amount || 0).toLocaleString()
  if (column.key === 'install_rate') {
    const installValue = resolveInstallRate(item, helpers.installColumn)
    return installValue > 0 ? installValue.toLocaleString() : '-'
  }
  if (column.key === 'vat_rate') return formatPdfPercentValue(item.vat_rate, 'Exempt')
  if (column.key === 'discount_rate') return formatPdfPercentValue(item.discount_rate, 'No disc')
  if (column.kind === 'custom') {
    const value = (item.custom_data || {})[column.key]
    if (value === null || value === undefined || value === '') return '-'
    return column.type === 'number' ? Number(value).toLocaleString() : String(value)
  }
  return ''
}
