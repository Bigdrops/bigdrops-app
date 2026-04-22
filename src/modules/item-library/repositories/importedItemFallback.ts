import type { ItemCatalogItem, ItemHistoryRow } from '../types'

type RawHistorySourceRow = {
  id?: string | null
  item_id?: string | null
  description?: string | null
  quantity?: number | string | null
  unit?: string | null
  unit_price?: number | string | null
  amount?: number | string | null
  updated_at?: string | null
  invoice_id?: string | null
  quotation_id?: string | null
  issue_date?: string | null
}

type DocumentMetadata = { number: string | null; date: string | null }
type DocumentMetadataLookup = Map<string, DocumentMetadata>

const IMPORTED_ITEM_PREFIX = 'imported-desc:'

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizeImportedDescription(value: unknown) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function createImportedDescriptionItemId(description: string) {
  return `${IMPORTED_ITEM_PREFIX}${encodeURIComponent(normalizeImportedDescription(description))}`
}

export function isImportedDescriptionItemId(itemId: string) {
  return itemId.startsWith(IMPORTED_ITEM_PREFIX)
}

export function decodeImportedDescriptionItemId(itemId: string) {
  return decodeURIComponent(itemId.slice(IMPORTED_ITEM_PREFIX.length))
}

function pickDisplayName(existingName: string, nextDescription: string) {
  if (!existingName) return nextDescription
  return existingName.length >= nextDescription.length ? existingName : nextDescription
}

export function buildFallbackSummaryItems(
  invoiceRows: RawHistorySourceRow[],
  quotationRows: RawHistorySourceRow[],
  existingItemIds: Set<string>,
): ItemCatalogItem[] {
  const groups = new Map<string, {
    item_id: string
    name: string
    appears_in_invoice: boolean
    appears_in_quotation: boolean
    usage_count: number
    prices: number[]
    last_sold_price: number | null
    last_used_at: string | null
    last_source_type: 'invoice' | 'quotation'
    last_source_document_id: string | null
  }>()

  const visitRow = (row: RawHistorySourceRow, sourceType: 'invoice' | 'quotation') => {
    const description = String(row.description || '').trim()
    const realItemId = String(row.item_id || '').trim()
    const fallbackKey = description ? createImportedDescriptionItemId(description) : ''
    const itemId = realItemId || fallbackKey

    if (!itemId) return
    if (realItemId && existingItemIds.has(realItemId)) return

    const price = toNumber(row.unit_price)
    const usedAt = row.issue_date || (row.updated_at ? String(row.updated_at) : null)
    const sourceDocumentId = String(sourceType === 'invoice' ? row.invoice_id || '' : row.quotation_id || '') || null
    const existing = groups.get(itemId)

    if (!existing) {
      groups.set(itemId, {
        item_id: itemId,
        name: description || realItemId,
        appears_in_invoice: sourceType === 'invoice',
        appears_in_quotation: sourceType === 'quotation',
        usage_count: 1,
        prices: price === null ? [] : [price],
        last_sold_price: price,
        last_used_at: usedAt,
        last_source_type: sourceType,
        last_source_document_id: sourceDocumentId,
      })
      return
    }

    existing.usage_count += 1
    existing.name = pickDisplayName(existing.name, description || realItemId)
    if (sourceType === 'invoice') existing.appears_in_invoice = true
    if (sourceType === 'quotation') existing.appears_in_quotation = true
    if (price !== null) existing.prices.push(price)

    const existingTime = new Date(existing.last_used_at || 0).getTime() || 0
    const nextTime = new Date(usedAt || 0).getTime() || 0
    if (nextTime >= existingTime) {
      existing.last_used_at = usedAt
      existing.last_sold_price = price
      existing.last_source_type = sourceType
      existing.last_source_document_id = sourceDocumentId
    }
  }

  for (const row of invoiceRows) visitRow(row, 'invoice')
  for (const row of quotationRows) visitRow(row, 'quotation')

  return Array.from(groups.values())
    .map((group) => {
      const prices = group.prices.filter((value): value is number => value !== null)
      const averagePrice = prices.length > 0 ? prices.reduce((sum, value) => sum + value, 0) / prices.length : null
      return {
        item_id: group.item_id,
        name: group.name,
        standard_price: group.last_sold_price,
        is_active: true,
        appears_in_invoice: group.appears_in_invoice,
        appears_in_quotation: group.appears_in_quotation,
        usage_count: group.usage_count,
        min_price: prices.length > 0 ? Math.min(...prices) : null,
        max_price: prices.length > 0 ? Math.max(...prices) : null,
        avg_price: averagePrice,
        last_sold_price: group.last_sold_price,
        last_used_at: group.last_used_at,
        last_source_type: group.last_source_type,
        last_source_document_id: group.last_source_document_id,
      } satisfies ItemCatalogItem
    })
    .sort((left, right) => {
      const rightTime = new Date(right.last_used_at || 0).getTime() || 0
      const leftTime = new Date(left.last_used_at || 0).getTime() || 0
      if (rightTime !== leftTime) return rightTime - leftTime
      return left.name.localeCompare(right.name)
    })
}

  row: RawHistorySourceRow,
  sourceType: 'invoice' | 'quotation',
  itemId: string,
  documentMetadataLookup: DocumentMetadataLookup,
): ItemHistoryRow {
  const documentId = String(sourceType === 'invoice' ? row.invoice_id || '' : row.quotation_id || '')
  const meta = documentMetadataLookup.get(documentId)
  return {
    row_id: String(row.id || ''),
    item_id: itemId,
    source_type: sourceType,
    source_document_id: documentId,
    source_document_number: meta?.number ?? null,
    description: String(row.description || ''),
    quantity: toNumber(row.quantity),
    unit: row.unit ? String(row.unit) : null,
    unit_price: toNumber(row.unit_price),
    amount: toNumber(row.amount),
    used_at: meta?.date || row.issue_date || (row.updated_at ? String(row.updated_at) : null),
  }
}

export function buildFallbackHistoryRows(args: {
  itemId: string
  invoiceRows: RawHistorySourceRow[]
  quotationRows: RawHistorySourceRow[]
  invoiceNumbers: DocumentMetadataLookup
  quotationNumbers: DocumentMetadataLookup
  limit: number
}) {
  const { itemId, invoiceRows, quotationRows, invoiceNumbers, quotationNumbers, limit } = args
  const normalizedDescription = isImportedDescriptionItemId(itemId)
    ? decodeImportedDescriptionItemId(itemId)
    : null

  const matchingInvoiceRows = invoiceRows.filter((row) => {
    if (normalizedDescription) {
      return !row.item_id && normalizeImportedDescription(row.description) === normalizedDescription
    }
    return String(row.item_id || '') === itemId
  })

  const matchingQuotationRows = quotationRows.filter((row) => {
    if (normalizedDescription) {
      return !row.item_id && normalizeImportedDescription(row.description) === normalizedDescription
    }
    return String(row.item_id || '') === itemId
  })

  return [
    ...matchingInvoiceRows.map((row) => mapHistoryRow(row, 'invoice', itemId, invoiceNumbers)),
    ...matchingQuotationRows.map((row) => mapHistoryRow(row, 'quotation', itemId, quotationNumbers)),
  ]
    .sort((left, right) => (new Date(right.used_at || 0).getTime() || 0) - (new Date(left.used_at || 0).getTime() || 0))
    .slice(0, limit)
}
