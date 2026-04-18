import type { ItemSuggestion } from '../types'

export interface InvoiceSuggestionSelection {
  description: string
  item_id: string | null
  unit_price: number
}

export function getInvoiceSuggestionSelection(
  suggestion: ItemSuggestion | null | undefined
): InvoiceSuggestionSelection {
  const isAliasMatch = suggestion?.match_source === 'alias'
  const description = isAliasMatch
    ? String(suggestion?.matched_text || suggestion?.name || '')
    : String(suggestion?.name || suggestion?.matched_text || '')

  return {
    description,
    item_id: suggestion?.item_id ? String(suggestion.item_id) : null,
    unit_price: Number(suggestion?.standard_price ?? 0),
  }
}
