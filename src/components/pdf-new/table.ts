import type { PdfColumnDefinition, PdfColumnKind, PdfResolvedTableSettings } from './types'

type SavedColumnConfig = {
  key: string
  label?: string
  type?: string
  visible?: boolean
}

type InterpretPdfTableSettingsOptions = {
  mergeQtyUnit?: boolean
}

const CONFIGURABLE_DEFAULT_COLUMNS: SavedColumnConfig[] = [
  { key: 'make', label: 'Make', visible: true },
  { key: 'unit', label: 'Unit', visible: true },
  { key: 'install_rate', label: 'Install Rate', type: 'install_rate', visible: false },
  { key: 'vat_rate', label: 'VAT Rate', type: 'vat_rate', visible: false },
  { key: 'discount_rate', label: 'Discount Rate', type: 'discount_rate', visible: false },
]

const FIXED_PDF_COLUMNS: PdfColumnDefinition[] = [
  { key: 'num', label: '#', kind: 'builtin', align: 'center' },
  { key: 'description', label: 'Description', kind: 'builtin', align: 'left' },
  { key: 'quantity', label: 'Qty', kind: 'builtin', align: 'center' },
  { key: 'unit_price', label: 'Unit Price', kind: 'builtin', align: 'right' },
  { key: 'amount', label: 'Amount', kind: 'builtin', align: 'right' },
]

function normalizeSavedColumns(columns: SavedColumnConfig[] = []) {
  if (Array.isArray(columns) && columns.length > 0) return columns
  return CONFIGURABLE_DEFAULT_COLUMNS
}

function normalizeColumnKind(key: string): PdfColumnKind {
  return key.startsWith('custom_') ? 'custom' : 'builtin'
}

function normalizeColumnAlign(key: string, type?: string) {
  if (key === 'make') return 'left' as const
  if (key === 'unit') return 'center' as const
  if (key === 'vat_rate' || key === 'discount_rate') return 'center' as const
  if (key === 'install_rate' || type === 'number') return 'right' as const
  return 'left' as const
}

function toPdfColumnDefinition(column: SavedColumnConfig): PdfColumnDefinition {
  return {
    key: String(column.key || '').trim(),
    label: String(column.label || column.key || '').trim(),
    kind: normalizeColumnKind(String(column.key || '')),
    align: normalizeColumnAlign(String(column.key || ''), column.type),
    dataType: column.type || null,
  }
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
  const activeColumns = configuredColumns.filter((column) => column.visible !== false)
  const getConfiguredColumn = (key: string) => activeColumns.find((column) => column.key === key)
  const customColumns = activeColumns
    .filter((column) => String(column.key || '').startsWith('custom_'))
    .map(toPdfColumnDefinition)

  const optionalColumns: Array<PdfColumnDefinition | null> = [
    getConfiguredColumn('make')
      ? {
          key: 'make',
          label: String(getConfiguredColumn('make')?.label || 'Make'),
          kind: 'builtin',
          align: 'left',
        }
      : null,
    !mergeQtyUnit && getConfiguredColumn('unit')
      ? {
          key: 'unit',
          label: String(getConfiguredColumn('unit')?.label || 'Unit'),
          kind: 'builtin',
          align: 'center',
        }
      : null,
    getConfiguredColumn('install_rate')
      ? {
          key: 'install_rate',
          label: String(getConfiguredColumn('install_rate')?.label || 'Install Rate'),
          kind: 'builtin',
          align: 'right',
          dataType: 'install_rate',
        }
      : null,
    getConfiguredColumn('vat_rate')
      ? {
          key: 'vat_rate',
          label: String(getConfiguredColumn('vat_rate')?.label || 'VAT Rate'),
          kind: 'builtin',
          align: 'center',
          dataType: 'vat_rate',
        }
      : null,
    getConfiguredColumn('discount_rate')
      ? {
          key: 'discount_rate',
          label: String(getConfiguredColumn('discount_rate')?.label || 'Discount Rate'),
          kind: 'builtin',
          align: 'center',
          dataType: 'discount_rate',
        }
      : null,
  ]

  const columns = [
    FIXED_PDF_COLUMNS[0],
    FIXED_PDF_COLUMNS[1],
    ...optionalColumns.slice(0, 1).filter(Boolean),
    {
      ...FIXED_PDF_COLUMNS[2],
      label: mergeQtyUnit ? 'Qty / Unit' : FIXED_PDF_COLUMNS[2].label,
    },
    ...optionalColumns.slice(1, 2).filter(Boolean),
    FIXED_PDF_COLUMNS[3],
    FIXED_PDF_COLUMNS[4],
    ...optionalColumns.slice(2).filter(Boolean),
    ...customColumns,
  ] as PdfColumnDefinition[]

  return {
    mergeQtyUnit,
    configuredColumns,
    activeColumns: activeColumns.map(toPdfColumnDefinition),
    columns,
    customColumns,
  }
}
