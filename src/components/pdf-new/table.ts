import { getPdfCellValue, resolveInstallRate } from '../../domain/invoice/columns.ts'
import type { ColumnConfig, InvoiceItem } from '../../domain/invoice/types.ts'
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
  const configuredColumns = normalizeSavedColumns(savedColumns)
  const activeColumns = configuredColumns.filter((column) => column.visible !== false)
  const getConfiguredColumn = (key: string) => activeColumns.find((column) => column.key === key)
  const customColumns = activeColumns
    .filter((column) => String(column.key || '').startsWith('custom_'))
    .map((column) => createPdfColumnDefinition(column))

  const optionalColumns: Array<PdfColumnDefinition | null> = [
    getConfiguredColumn('make')
      ? createPdfColumnDefinition(getConfiguredColumn('make')!, {
          key: 'make',
          kind: 'builtin',
          align: 'left',
          pdfWidth: 48,
          pdfFlex: 1.25,
        })
      : null,
    !mergeQtyUnit && getConfiguredColumn('unit')
      ? createPdfColumnDefinition(getConfiguredColumn('unit')!, {
          key: 'unit',
          kind: 'builtin',
          align: 'center',
          pdfWidth: 34,
          pdfFlex: 0.85,
        })
      : null,
    getConfiguredColumn('install_rate')
      ? createPdfColumnDefinition(getConfiguredColumn('install_rate')!, {
          key: 'install_rate',
          kind: 'builtin',
          align: 'right',
          dataType: 'install_rate',
          pdfWidth: 54,
          pdfFlex: 1.15,
        })
      : null,
    getConfiguredColumn('vat_rate')
      ? createPdfColumnDefinition(getConfiguredColumn('vat_rate')!, {
          key: 'vat_rate',
          kind: 'builtin',
          align: 'center',
          dataType: 'vat_rate',
          pdfWidth: 32,
          pdfFlex: 0.8,
        })
      : null,
    getConfiguredColumn('discount_rate')
      ? createPdfColumnDefinition(getConfiguredColumn('discount_rate')!, {
          key: 'discount_rate',
          kind: 'builtin',
          align: 'center',
          dataType: 'discount_rate',
          pdfWidth: 40,
          pdfFlex: 0.95,
        })
      : null,
  ]

  const columns = [
    FIXED_PDF_COLUMNS[0],
    FIXED_PDF_COLUMNS[1],
    ...optionalColumns.slice(0, 1).filter(Boolean),
    {
      ...FIXED_PDF_COLUMNS[2],
      label: mergeQtyUnit ? 'Qty / Unit' : FIXED_PDF_COLUMNS[2].label,
      pdfWidth: mergeQtyUnit ? 42 : FIXED_PDF_COLUMNS[2].pdfWidth,
      pdfFlex: mergeQtyUnit ? 0.95 : FIXED_PDF_COLUMNS[2].pdfFlex,
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
    activeColumns: activeColumns.map((column) => createPdfColumnDefinition(column)),
    columns,
    customColumns,
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
      const quantity = item.quantity ?? ''
      const unit = item.unit || ''
      return [column.key, `${quantity}${unit ? ` ${unit}` : ''}`.trim()]
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
