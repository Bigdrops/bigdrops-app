import { normalizeItemText } from './suggestionRanking'
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

export function findExactItemSuggestionMatch(
  description: string | null | undefined,
  suggestions: ItemSuggestion[] | null | undefined,
): ItemSuggestion | null {
  const normalizedDescription = normalizeItemText(description)
  if (normalizedDescription.length < 2) return null

  const exactMatches = (Array.isArray(suggestions) ? suggestions : []).filter((suggestion) => {
    const normalizedName = normalizeItemText(suggestion?.name)
    const normalizedMatchedText = normalizeItemText(suggestion?.matched_text)
    return normalizedDescription === normalizedName || normalizedDescription === normalizedMatchedText
  })

  if (exactMatches.length === 0) return null

  const exactMatchByItemId = new Map(
    exactMatches
      .filter((suggestion) => suggestion?.item_id)
      .map((suggestion) => [String(suggestion.item_id), suggestion]),
  )

  if (exactMatchByItemId.size !== 1) return null
  return [...exactMatchByItemId.values()][0] || null
}
