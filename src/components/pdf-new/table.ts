import type { PdfColumnDefinition, PdfLineItem, PdfTextAlign } from './types'

type VisibleColumnInput = PdfColumnDefinition & {
  visible?: boolean
}

export type PdfTableLayoutColumn = PdfColumnDefinition & {
  widthPercent: number
  tier: 1 | 2 | 3 | 4 | 5
  isNumeric: boolean
}

export type PdfTableLayoutPlan = {
  orientation: 'portrait' | 'landscape'
  columns: PdfTableLayoutColumn[]
  firstPageLimit: number
  continuationPageLimit: number
}

type RenderPdfLineCellOptions = {
  currency?: string | null
  mergeQtyUnit?: boolean
  rowNumber?: number | null
}

type ChunkPdfTableRowsOptions = {
  firstPageLimit?: number
  continuationPageLimit?: number
}

const CORE_COLUMN_DEFAULTS: VisibleColumnInput[] = [
  { key: 'num', label: '#', align: 'center' },
  { key: 'description', label: 'Description', align: 'left' },
  { key: 'make', label: 'Make', align: 'left', visible: false },
  { key: 'quantity', label: 'Qty', align: 'right' },
  { key: 'unit_price', label: 'Unit Price', align: 'right' },
  { key: 'amount', label: 'Amount', align: 'right' },
]

const PREFERRED_COLUMN_ORDER = [
  'num',
  'description',
  'make',
  'quantity',
  'unit',
  'unit_price',
  'rate',
  'amount',
  'install_rate',
  'vat_rate',
  'discount_rate',
]

const COLUMN_LABELS: Record<string, string> = {
  num: '#',
  description: 'Description',
  make: 'Make',
  quantity: 'Qty',
  unit: 'Unit',
  unit_price: 'Unit Price',
  rate: 'Rate',
  amount: 'Amount',
  install_rate: 'Install Rate',
  vat_rate: 'VAT Rate',
  discount_rate: 'Discount Rate',
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
}

const COLUMN_WEIGHTS: Record<string, { weight: number; tier: 1 | 2 | 3 | 4 | 5; numeric: boolean }> = {
  num: { weight: 0.65, tier: 5, numeric: true },
  description: { weight: 5.2, tier: 1, numeric: false },
  make: { weight: 2.1, tier: 2, numeric: false },
  quantity: { weight: 1.15, tier: 3, numeric: true },
  unit: { weight: 1.05, tier: 3, numeric: false },
  unit_price: { weight: 1.25, tier: 4, numeric: true },
  rate: { weight: 1.25, tier: 4, numeric: true },
  amount: { weight: 1.35, tier: 4, numeric: true },
  install_rate: { weight: 0.9, tier: 5, numeric: true },
  vat_rate: { weight: 0.8, tier: 5, numeric: true },
  discount_rate: { weight: 0.8, tier: 5, numeric: true },
}

function getColumnMeta(key: string) {
  if (COLUMN_WEIGHTS[key]) return COLUMN_WEIGHTS[key]
  return { weight: 1.0, tier: 5 as const, numeric: false }
}

function normalizeColumn(input: VisibleColumnInput): PdfColumnDefinition {
  return {
    key: input.key,
    label: input.label || COLUMN_LABELS[input.key] || input.key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    align: input.align || defaultAlignForColumn(input.key),
  }
}

function defaultAlignForColumn(key: string): PdfTextAlign {
  return getColumnMeta(key).numeric ? 'right' : key === 'num' ? 'center' : 'left'
}

function countLines(text: string, charsPerLine: number) {
  const plain = String(text || '').trim()
  if (!plain) return 0
  return plain
    .split('\n')
    .reduce((sum, segment) => sum + Math.max(1, Math.ceil(segment.length / Math.max(12, charsPerLine))), 0)
}

function estimateCharsPerLine(widthPercent: number) {
  return Math.max(14, Math.round(widthPercent * 2.2))
}

function estimateTableRowHeight(item: PdfLineItem, columns: PdfTableLayoutColumn[]) {
  if (item.rowType === 'group_header') return 20

  let rowHeight = 24

  for (const column of columns) {
    if (column.key === 'description') {
      const charsPerLine = estimateCharsPerLine(column.widthPercent)
      const descriptionLines = countLines(item.description || '', charsPerLine)
      const subDescriptionLines = countLines(item.subDescription || '', charsPerLine + 4)
      const imageHeight = item.imageUrl ? 30 : 0
      rowHeight = Math.max(rowHeight, 12 + (descriptionLines * 9.5) + (subDescriptionLines * 7.5) + imageHeight)
      continue
    }

    const value = renderPdfLineCell(item, column.key)
    const textLines = countLines(String(value || ''), estimateCharsPerLine(column.widthPercent))
    rowHeight = Math.max(rowHeight, 14 + (textLines * 8))
  }

  return Math.ceil(rowHeight)
}

export function formatCompactPdfMoney(value?: number | null, currency?: string | null) {
  const amount = Number(value || 0)
  const code = String(currency || 'NGN').trim().toUpperCase() || 'NGN'
  const symbol = CURRENCY_SYMBOLS[code] || ''
  const hasFraction = Math.abs(amount % 1) > 0.001
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: hasFraction ? 0 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  })
  return `${symbol}${formatted}`
}

export function buildPdfTableColumns(
  columns: VisibleColumnInput[] = [],
  options: { mergeQtyUnit?: boolean } = {},
): PdfColumnDefinition[] {
  const mergeQtyUnit = options.mergeQtyUnit === true
  const visible = columns
    .filter((column) => column.visible !== false)
    .map(normalizeColumn)

  const merged = [...CORE_COLUMN_DEFAULTS.map(normalizeColumn)]

  for (const column of visible) {
    if (merged.some((entry) => entry.key === column.key)) continue
    merged.push(column)
  }

  return merged
    .filter((column) => !(mergeQtyUnit && column.key === 'unit'))
    .map((column) => ({
      ...column,
      label: mergeQtyUnit && column.key === 'quantity' ? 'Qty / Unit' : column.label,
    }))
    .sort((left, right) => {
      const leftIndex = PREFERRED_COLUMN_ORDER.indexOf(left.key)
      const rightIndex = PREFERRED_COLUMN_ORDER.indexOf(right.key)
      const normalizedLeft = leftIndex === -1 ? PREFERRED_COLUMN_ORDER.length : leftIndex
      const normalizedRight = rightIndex === -1 ? PREFERRED_COLUMN_ORDER.length : rightIndex
      if (normalizedLeft === normalizedRight) return left.label.localeCompare(right.label)
      return normalizedLeft - normalizedRight
    })
}

export function getPdfTableLayoutPlan(
  columns: VisibleColumnInput[] = [],
  options: { mergeQtyUnit?: boolean } = {},
): PdfTableLayoutPlan {
  const normalizedColumns = buildPdfTableColumns(columns, options)
  const totalWeight = normalizedColumns.reduce((sum, column) => sum + getColumnMeta(column.key).weight, 0) || 1
  const widthColumns = normalizedColumns.map((column) => {
    const meta = getColumnMeta(column.key)
    return {
      ...column,
      widthPercent: Number(((meta.weight / totalWeight) * 100).toFixed(2)),
      tier: meta.tier,
      isNumeric: meta.numeric,
    }
  })

  const highDemandColumnCount = widthColumns.filter((column) => column.tier >= 4).length
  const orientation = widthColumns.length >= 8 || highDemandColumnCount >= 4 ? 'landscape' : 'portrait'

  return {
    orientation,
    columns: widthColumns,
    firstPageLimit: orientation === 'landscape' ? 255 : 225,
    continuationPageLimit: orientation === 'landscape' ? 340 : 305,
  }
}

export function chunkPdfTableRows(
  items: PdfLineItem[] = [],
  columns: PdfTableLayoutColumn[],
  options: ChunkPdfTableRowsOptions = {},
) {
  if (items.length === 0) return []

  const segments: PdfLineItem[][] = []
  let currentSegment: PdfLineItem[] = []
  let currentHeight = 0
  let limit = options.firstPageLimit || 225

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    const rowHeight = estimateTableRowHeight(item, columns)
    const nextItem = items[index + 1]
    const lockedGroupHeight =
      item.rowType === 'group_header' && nextItem
        ? rowHeight + estimateTableRowHeight(nextItem, columns)
        : rowHeight

    if (currentSegment.length > 0 && currentHeight + lockedGroupHeight > limit) {
      segments.push(currentSegment)
      currentSegment = []
      currentHeight = 0
      limit = options.continuationPageLimit || 305
    }

    currentSegment.push(item)
    currentHeight += rowHeight
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment)
  }

  return segments
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined) return ''
  return `${Number(value)}%`
}

export function renderPdfLineCell(
  item: PdfLineItem,
  key: string,
  options: RenderPdfLineCellOptions = {},
) {
  const mergeQtyUnit = options.mergeQtyUnit === true

  if (key === 'num') {
    return options.rowNumber === null || options.rowNumber === undefined ? '' : String(options.rowNumber)
  }

  if (key === 'description') {
    return [item.description, item.subDescription]
      .filter((part) => String(part || '').trim())
      .join('\n')
  }

  if (key === 'make') return item.make || ''

  if (key === 'quantity') {
    if (mergeQtyUnit) {
      const qtyText = item.quantity === null || item.quantity === undefined ? '' : String(item.quantity)
      const unitText = String(item.unit || '').trim()
      return [qtyText, unitText].filter(Boolean).join(' ')
    }
    return item.quantity === null || item.quantity === undefined ? '' : String(item.quantity)
  }

  if (key === 'unit') return item.unit || ''
  if (key === 'unit_price' || key === 'rate') return formatCompactPdfMoney(item.unitPrice || 0, options.currency)
  if (key === 'install_rate') return item.installRate ? formatCompactPdfMoney(item.installRate, options.currency) : ''
  if (key === 'vat_rate') return formatPercent(item.vatRate)
  if (key === 'discount_rate') return formatPercent(item.discountRate)
  if (key === 'amount') return formatCompactPdfMoney(item.amount || 0, options.currency)

  const customValue = item.customData?.[key]
  return customValue === null || customValue === undefined ? '' : String(customValue)
}
