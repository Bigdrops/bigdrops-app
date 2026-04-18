import type { ItemSuggestion } from '../types'

export function normalizeSuggestionQuery(searchText: string): string {
  return String(searchText || '').trim()
}

export function rankItemSuggestions(suggestions: ItemSuggestion[]): ItemSuggestion[] {
  return [...suggestions].sort((left, right) => {
    const leftActive = left.is_active === false ? 1 : 0
    const rightActive = right.is_active === false ? 1 : 0
    if (leftActive !== rightActive) return leftActive - rightActive

    const usageDelta = Number(right.usage_count || 0) - Number(left.usage_count || 0)
    if (usageDelta !== 0) return usageDelta

    const leftTime = new Date(left.last_used_at || 0).getTime() || 0
    const rightTime = new Date(right.last_used_at || 0).getTime() || 0
    if (rightTime !== leftTime) return rightTime - leftTime

    return left.name.localeCompare(right.name)
  })
}
