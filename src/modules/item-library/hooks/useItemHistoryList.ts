import { useEffect, useState } from 'react'
import { loadSummaryList } from '../services'
import type { ItemCatalogItem } from '../types'
import { readListCache, writeListCache, isListCacheFresh } from '@/lib/cache/listCache'

const ITEM_LIBRARY_CACHE_KEY = "bd:item-library:summary:v1"
const ITEM_LIBRARY_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

export function useItemHistoryList(limit = 100, options: { includeHeavyFallbacks?: boolean } = {}) {
  const { includeHeavyFallbacks = false } = options
  const [data, setData] = useState<ItemCatalogItem[]>(() => {
    const cached = readListCache<ItemCatalogItem>(ITEM_LIBRARY_CACHE_KEY)
    return cached?.rows || []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const cached = readListCache<ItemCatalogItem>(ITEM_LIBRARY_CACHE_KEY)
      const fresh = isListCacheFresh(cached, ITEM_LIBRARY_CACHE_TTL)

      // If fresh and we have data, skip fetch
      if (fresh && cached.rows.length > 0) {
        if (!cancelled) {
          setData(cached.rows)
          setLoading(false)
        }
        return
      }

      setLoading(data.length === 0)
      setError(null)
      try {
        const nextData = await loadSummaryList(limit, { includeHeavyFallbacks })
        if (!cancelled) {
          setData(nextData)
          writeListCache(ITEM_LIBRARY_CACHE_KEY, nextData)
        }
      } catch (nextError) {
        if (!cancelled) setError(nextError instanceof Error ? nextError : new Error('Failed to load item library'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [limit, reloadKey])

  return { data, setData, loading, error, reload: () => setReloadKey((value) => value + 1) }
}
