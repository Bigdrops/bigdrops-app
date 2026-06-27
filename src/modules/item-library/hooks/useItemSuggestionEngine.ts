import { useCallback, useEffect, useRef, useState } from 'react'
import { findExactItemSuggestionMatch } from '../domain/invoiceSuggestionSelection'
import { getInvoiceSuggestionPriceContextText } from '../domain/invoiceSuggestionPriceContext'
import { loadSuggestions, loadItemPriceContext } from '../services'
import type { ItemSuggestion } from '../types'

interface SuggestionEngineResult {
  suggestions: ItemSuggestion[]
  suggestionsLoading: boolean
  exactMatch: ItemSuggestion | null
  priceContextText: string | null
  handleSuggestionSelect: (suggestion: ItemSuggestion) => {
    description: string
    item_id: string | null
    unit_price: number
  }
  clearSelection: () => void
}

export function useItemSuggestionEngine(
  description: string,
  clientId: string | null | undefined,
  enabled: boolean,
  isFocused: boolean,
  rowType?: string | null,
): SuggestionEngineResult {
  const [suggestions, setSuggestions] = useState<ItemSuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [exactMatch, setExactMatch] = useState<ItemSuggestion | null>(null)
  const [priceContextText, setPriceContextText] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const fetchIdRef = useRef(0)
  const priceFetchIdRef = useRef(0)

  const trimmed = String(description || '').trim()
  const shouldFetchSuggestions = enabled && isFocused && trimmed.length >= 2 && (rowType == null || rowType === 'standard')

  useEffect(() => {
    if (!shouldFetchSuggestions) {
      setSuggestions([])
      setSuggestionsLoading(false)
      setExactMatch(null)
      return
    }

    const fetchId = ++fetchIdRef.current

    let cancelled = false

    const run = async () => {
      setSuggestionsLoading(true)
      setExactMatch(null)

      try {
        const results = await loadSuggestions(trimmed, 10, clientId)
        if (cancelled || fetchId !== fetchIdRef.current) return

        setSuggestions(results)
        setExactMatch(findExactItemSuggestionMatch(trimmed, results))
      } catch {
        if (!cancelled && fetchId === fetchIdRef.current) {
          setSuggestions([])
          setExactMatch(null)
        }
      } finally {
        if (!cancelled && fetchId === fetchIdRef.current) {
          setSuggestionsLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [shouldFetchSuggestions, trimmed, clientId])

  useEffect(() => {
    if (!selectedItemId) {
      setPriceContextText(null)
      return
    }

    const fetchId = ++priceFetchIdRef.current

    let cancelled = false

    const run = async () => {
      try {
        const ctx = await loadItemPriceContext(selectedItemId, clientId)
        if (cancelled || fetchId !== priceFetchIdRef.current) return
        setPriceContextText(getInvoiceSuggestionPriceContextText(ctx))
      } catch {
        if (!cancelled && fetchId === priceFetchIdRef.current) {
          setPriceContextText(null)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [selectedItemId, clientId])

  const handleSuggestionSelect = useCallback((suggestion: ItemSuggestion) => {
    const { description: desc, item_id, unit_price } = (() => {
      const isAliasMatch = suggestion?.match_source === 'alias'
      const d = isAliasMatch
        ? String(suggestion?.matched_text || suggestion?.name || '')
        : String(suggestion?.name || suggestion?.matched_text || '')
      return {
        description: d,
        item_id: suggestion?.item_id ? String(suggestion.item_id) : null,
        unit_price: Number(suggestion?.standard_price ?? 0),
      }
    })()

    setSelectedItemId(item_id)
    setPriceContextText(
      item_id ? getInvoiceSuggestionPriceContextText(suggestion) : null,
    )

    return { description: desc, item_id, unit_price }
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItemId(null)
    setPriceContextText(null)
  }, [])

  return {
    suggestions,
    suggestionsLoading,
    exactMatch,
    priceContextText,
    handleSuggestionSelect,
    clearSelection,
  }
}
