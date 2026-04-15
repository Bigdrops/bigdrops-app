import { getPdfColumns } from '../../domain/invoice/index.ts'
import type { ColumnConfig } from '../../domain/invoice/index.ts'
import type { PdfColumnDefinition, PdfLineItem } from './types'

type RenderPdfLineCellOptions = {
  currency?: string | null
  mergeQtyUnit?: boolean
  rowNumber?: number | null
}

function formatMoney(value?: number | null, currency?: string | null) {
  const amount = Number(value || 0)
  const code = String(currency || 'NGN').trim() || 'NGN'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined) return ''
  return `${Number(value)}%`
}

export function buildPdfTableColumns(
  columns: ColumnConfig[] = [],
  options: { mergeQtyUnit?: boolean } = {},
): PdfColumnDefinition[] {
  const mergeQtyUnit = options.mergeQtyUnit === true

  return getPdfColumns(columns)
    .filter((column) => !(mergeQtyUnit && column.key === 'unit'))
    .map((column) => ({
      key: column.key,
      label: mergeQtyUnit && column.key === 'quantity' ? 'Qty / Unit' : column.label,
      align: column.align,
    }))
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
  if (key === 'unit_price' || key === 'rate') return formatMoney(item.unitPrice || 0, options.currency)
  if (key === 'install_rate') return item.installRate ? formatMoney(item.installRate, options.currency) : ''
  if (key === 'vat_rate') return formatPercent(item.vatRate)
  if (key === 'discount_rate') return formatPercent(item.discountRate)
  if (key === 'amount') return formatMoney(item.amount || 0, options.currency)

  const customValue = item.customData?.[key]
  return customValue === null || customValue === undefined ? '' : String(customValue)
}
