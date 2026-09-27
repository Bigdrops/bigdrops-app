import { formatDisplayDate } from '../../../lib/formatters/date'
import { formatNaira } from '../../../lib/formatters/money'
import type { ItemPriceContext, ItemSuggestion, ItemSuggestionSelectionSource } from '../types/index.ts'

function formatLastUsedDate(value: string | null | undefined): string | null {
  if (!value) return null
  const formatted = formatDisplayDate(value, {
    fallback: '',
    invalidFallback: '',
    locale: 'en-GB',
    dateOptions: { day: '2-digit', month: '2-digit', year: '2-digit' },
  })
  return formatted || null
}

export function getInvoiceSuggestionPriceContextText(
  suggestion: Pick<
    ItemSuggestion & ItemPriceContext,
    | 'last_price_for_client'
    | 'last_price_for_client_used_at'
    | 'last_price_for_client_document_number'
    | 'last_price_global'
    | 'last_price_global_used_at'
    | 'last_price_global_document_number'
    | 'last_used_at'
    | 'last_source_document_number'
  > | null | undefined,
): string | null {
  if (!suggestion) return null

  const clientPrice = suggestion.last_price_for_client
  const globalPrice = suggestion.last_price_global
  const clientDate = formatLastUsedDate(suggestion.last_price_for_client_used_at)
  const clientDoc = suggestion.last_price_for_client_document_number || null
  const globalDate = formatLastUsedDate(suggestion.last_price_global_used_at ?? suggestion.last_used_at)
  const globalDoc = suggestion.last_price_global_document_number ?? suggestion.last_source_document_number ?? null

  const hasClientPrice = clientPrice !== null && clientPrice !== undefined
  const hasGlobalPrice = globalPrice !== null && globalPrice !== undefined

  const formatLine = (label: string, price: number | null | undefined, doc: string | null, date: string | null) => {
    const docPart = doc ? ` · ${doc}` : ''
    const datePart = date ? ` · ${date}` : ''
    return `${label}: ${formatNaira(price)}${docPart}${datePart}`
  }

  const sameRecord =
    hasClientPrice &&
    hasGlobalPrice &&
    clientPrice === globalPrice &&
    clientDoc === globalDoc &&
    clientDate === globalDate

  if (sameRecord) {
    return formatLine('Last sold to this client', clientPrice, clientDoc, clientDate)
  }

  if (hasClientPrice) {
    const line1 = formatLine('Last sold to this client', clientPrice, clientDoc, clientDate)
    if (hasGlobalPrice) {
      const line2 = formatLine('Last sold', globalPrice, globalDoc, globalDate)
      return `${line1}\n${line2}`
    }
    return line1
  }

  if (hasGlobalPrice) {
    return formatLine('Last sold', globalPrice, globalDoc, globalDate)
  }

  return null
}

export function getRecognizedHistoryPriceActionValue({
  itemId,
  priceContext,
  selectionSource,
  unitPrice,
}: {
  itemId: string | null | undefined
  priceContext: ItemPriceContext | null | undefined
  selectionSource: ItemSuggestionSelectionSource | null | undefined
  unitPrice: number | string | null | undefined
}): number | null {
  if (!itemId) return null
  if (selectionSource !== 'recognized') return null
  if (Number(unitPrice || 0) !== 0) return null

  const clientPrice = priceContext?.last_price_for_client
  if (clientPrice !== null && clientPrice !== undefined && Number(clientPrice) > 0) return clientPrice

  const globalPrice = priceContext?.last_price_global
  if (globalPrice !== null && globalPrice !== undefined && Number(globalPrice) > 0) return globalPrice

  return null
}
