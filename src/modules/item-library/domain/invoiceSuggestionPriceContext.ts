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
    'standard_price' | 'last_sold_price' | 'last_used_at' | 'last_source_type'
  > | null | undefined,
): string | null {
  const fragments: string[] = []

  if (suggestion?.standard_price !== null && suggestion?.standard_price !== undefined) {
    fragments.push(`Standard ${formatNaira(suggestion.standard_price)}`)
  }

  if (suggestion?.last_sold_price !== null && suggestion?.last_sold_price !== undefined) {
    fragments.push(`Last sold ${formatNaira(suggestion.last_sold_price)}`)
  }

  const lastUsedDate = formatLastUsedDate(suggestion?.last_used_at)
  if (lastUsedDate) {
    const sourceLabel = suggestion?.last_source_type ? ` in ${String(suggestion.last_source_type).toLowerCase()}` : ''
    fragments.push(`Last used${sourceLabel} on ${lastUsedDate}`)
  }

  return fragments.length > 0 ? fragments.join(' · ') : null
}
