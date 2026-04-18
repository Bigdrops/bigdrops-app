import type { ItemCatalogItem, ItemHistoryRow } from '../types'
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

export function getHistorySourceLabel(row: ItemHistoryRow): string {
  return row.source_type === 'invoice' ? 'Invoice' : 'Quotation'
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

export function getItemMetaRows(item: ItemCatalogItem) {
  return [
    { label: 'Standard price', value: formatItemPrice(item.standard_price) },
    { label: 'Last sold price', value: formatItemPrice(item.last_sold_price, 'No sales yet') },
    { label: 'Usage count', value: formatUsageCount(item.usage_count) },
    { label: 'Last used', value: formatLastUsedDate(item.last_used_at) },
  ]
}
