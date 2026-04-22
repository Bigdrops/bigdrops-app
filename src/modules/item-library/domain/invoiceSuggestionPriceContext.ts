import { formatDisplayDate } from '../../../lib/formatters/date.js'
import { formatNaira } from '../../../lib/formatters/money.js'
import type { ItemSuggestion } from '../types'

function formatLastUsedDate(value: string | null | undefined): string | null {
  if (!value) return null
  const formatted = formatDisplayDate(value, {
    fallback: '',
    invalidFallback: '',
    locale: 'en-US',
    dateOptions: { month: 'short', day: 'numeric' },
  })
  return formatted || null
}

export function getInvoiceSuggestionPriceContextText(
  suggestion: Pick<
    ItemSuggestion,
    | 'last_price_for_client'
    | 'last_price_global'
    | 'last_used_at'
    | 'last_source_document_number'
  > | null | undefined,
): string | null {
  if (!suggestion) return null

  const clientPrice = suggestion.last_price_for_client
  const globalPrice = suggestion.last_price_global
  const date = formatLastUsedDate(suggestion.last_used_at)
  const doc = suggestion.last_source_document_number
  
  const hasClientPrice = clientPrice !== null && clientPrice !== undefined
  const hasGlobalPrice = globalPrice !== null && globalPrice !== undefined

  const datePart = date ? ` · ${date}` : ''
  const docPart = doc ? ` · ${doc}` : ''
  const suffix = `${docPart}${datePart}`

  // Case B: Client-specific price exists AND is same as latest global record
  if (hasClientPrice && hasGlobalPrice && clientPrice === globalPrice) {
    return `Last sold to this client: ${formatNaira(clientPrice)}${suffix}`
  }

  // Case A: Client-specific price exists AND differs from global
  if (hasClientPrice) {
    const line1 = `This client: ${formatNaira(clientPrice)}`
    if (hasGlobalPrice) {
      const line2 = `Last sold: ${formatNaira(globalPrice)}${suffix}`
      return `${line1}\n${line2}`
    }
    return line1
  }

  // Case C: Only global history exists
  if (hasGlobalPrice) {
    return `Last sold: ${formatNaira(globalPrice)}${suffix}`
  }

  // Case D: No history
  return null
}
