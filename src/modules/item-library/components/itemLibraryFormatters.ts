import type { ItemCatalogItem, ItemHistoryRow, ItemSourceType } from '../types'
import { formatNaira } from '@/lib/formatters/money.js'
import { formatDisplayDate } from '@/lib/formatters/date.js'

export function formatItemPrice(value: number | null | undefined, fallback = 'Not set'): string {
  if (value === null || value === undefined) return fallback
  return formatNaira(value)
}

export function formatUsageCount(value: number | null | undefined): string {
  const count = Number(value || 0)
  return `${count.toLocaleString()} ${count === 1 ? 'use' : 'uses'}`
}

export function formatLastUsedDate(value: string | null | undefined, fallback = 'No activity yet'): string {
  if (!value) return fallback
  return formatDisplayDate(value, { fallback })
}

export function formatCompactUsageCount(value: number | null | undefined): string {
  const count = Number(value || 0)
  return `${count.toLocaleString()}x`
}

export function getHistorySourceLabel(row: ItemHistoryRow): string {
  return row.source_type === 'invoice' ? 'Invoice' : 'Quotation'
}

export function getSourceTypeLabel(value: ItemSourceType | string | null | undefined, fallback = 'History'): string {
  if (value === 'invoice') return 'Invoice'
  if (value === 'quotation') return 'Quotation'
  return fallback
}

export function getHistoryDocumentHref(row: ItemHistoryRow): string | null {
  if (!row.source_document_id) return null
  return row.source_type === 'invoice'
    ? `/invoices/${row.source_document_id}`
    : `/quotations/${row.source_document_id}`
}

export function getHistoryDocumentLabel(row: ItemHistoryRow): string {
  if (row.source_document_number) return row.source_document_number
  return row.source_document_id || 'Document'
}

export function getPriceDelta(standardPrice: number | null | undefined, lastPrice: number | null | undefined) {
  const standard = Number(standardPrice)
  const last = Number(lastPrice)

  if (!Number.isFinite(standard) || !Number.isFinite(last) || standard === 0) {
    return null
  }

  const amount = last - standard
  const pct = Math.round((amount / standard) * 100)
  if (amount === 0 && pct === 0) {
    return { amount: 0, pct: 0, direction: 'flat' as const }
  }

  return {
    amount,
    pct,
    direction: amount > 0 ? ('up' as const) : ('down' as const),
  }
}

export function getItemMetaRows(item: ItemCatalogItem) {
  return [
    { label: 'Standard price', value: formatItemPrice(item.standard_price) },
    { label: 'Last sold price', value: formatItemPrice(item.last_sold_price, 'No sales yet') },
    { label: 'Usage count', value: formatUsageCount(item.usage_count) },
    { label: 'Last used', value: formatLastUsedDate(item.last_used_at) },
  ]
}

export function getItemPriceRangeLabel(item: ItemCatalogItem): string | null {
  if (item.min_price === null || item.min_price === undefined || item.max_price === null || item.max_price === undefined) {
    return null
  }

  return `${formatItemPrice(item.min_price)} - ${formatItemPrice(item.max_price)}`
}
