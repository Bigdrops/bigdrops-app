import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEntity } from '@/lib/tenant/contexts'
import { findExactItemSuggestionMatch } from '../domain/invoiceSuggestionSelection'
import { getInvoiceSuggestionPriceContextText } from '../domain/invoiceSuggestionPriceContext'
import { loadSuggestions, loadItemPriceContext, resolveExactItemMatch } from '../services'
import type { ItemPriceContext, ItemSuggestion, ItemSuggestionSelectionSource } from '../types'

interface SuggestionEngineResult {
  suggestions: ItemSuggestion[]
  suggestionsLoading: boolean
  exactMatch: ItemSuggestion | null
  priceContext: ItemPriceContext | null
  priceContextText: string | null
  selectionSource: ItemSuggestionSelectionSource | null
  recognizeExactMatch: (suggestion: ItemSuggestion) => void
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
  const { tenantClient } = useEntity()
  const [suggestions, setSuggestions] = useState<ItemSuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [exactMatch, setExactMatch] = useState<ItemSuggestion | null>(null)
  const [priceContext, setPriceContext] = useState<ItemPriceContext | null>(null)
  const [priceContextText, setPriceContextText] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectionSource, setSelectionSource] = useState<ItemSuggestionSelectionSource | null>(null)

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
        const [results, resolvedExactMatch] = await Promise.all([
          loadSuggestions(trimmed, 10, clientId, tenantClient),
          resolveExactItemMatch(trimmed, clientId, tenantClient).catch(() => null),
        ])
        if (cancelled || fetchId !== fetchIdRef.current) return

        setSuggestions(results)
        const nextExactMatch = resolvedExactMatch || findExactItemSuggestionMatch(trimmed, results)
        setExactMatch(nextExactMatch)
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
  }, [shouldFetchSuggestions, trimmed, clientId, tenantClient])

  useEffect(() => {
    if (!selectedItemId) {
      setPriceContext(null)
      setPriceContextText(null)
      return
    }

    const fetchId = ++priceFetchIdRef.current

    let cancelled = false

    const run = async () => {
      try {
        const ctx = await loadItemPriceContext(selectedItemId, clientId, tenantClient)
        if (cancelled || fetchId !== priceFetchIdRef.current) return
        setPriceContext(ctx)
        setPriceContextText(getInvoiceSuggestionPriceContextText(ctx))
      } catch {
        if (!cancelled && fetchId === priceFetchIdRef.current) {
          setPriceContext(null)
          setPriceContextText(null)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [selectedItemId, clientId, tenantClient])

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
    setSelectionSource(item_id ? 'explicit' : null)
    setPriceContext(null)
    setPriceContextText(
      item_id ? getInvoiceSuggestionPriceContextText(suggestion) : null,
    )

    return { description: desc, item_id, unit_price }
  }, [])

  const recognizeExactMatch = useCallback((suggestion: ItemSuggestion) => {
    const itemId = suggestion?.item_id ? String(suggestion.item_id) : null
    setSelectedItemId(itemId)
    setSelectionSource(itemId ? 'recognized' : null)
    setPriceContext(null)
    setPriceContextText(
      itemId ? getInvoiceSuggestionPriceContextText(suggestion) : null,
    )
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItemId(null)
    setSelectionSource(null)
    setPriceContext(null)
    setPriceContextText(null)
  }, [])

  const currentExactMatch = useMemo(() => {
    if (!exactMatch) return null
    return findExactItemSuggestionMatch(trimmed, [exactMatch])
  }, [exactMatch, trimmed])

  return useMemo(
    () => ({
      suggestions,
      suggestionsLoading,
      exactMatch: currentExactMatch,
      priceContext,
      priceContextText,
      selectionSource,
      recognizeExactMatch,
      handleSuggestionSelect,
      clearSelection,
    }),
    [
      suggestions,
      suggestionsLoading,
      currentExactMatch,
      priceContext,
      priceContextText,
      selectionSource,
      recognizeExactMatch,
      handleSuggestionSelect,
      clearSelection,
    ],
  )
}
