import { useEffect, useState } from 'react'
import { useEntity } from '@/lib/tenant/contexts'
import { loadSummaryList } from '../services'
import type { ItemCatalogItem } from '../types'
import { readListCache, writeListCache, isListCacheFresh, itemLibraryCacheKey } from '@/lib/cache/listCache'

const ITEM_LIBRARY_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

export function useItemHistoryList(limit = 100, options: { includeHeavyFallbacks?: boolean } = {}) {
  const { tenantClient, schemaName } = useEntity()
  const { includeHeavyFallbacks = false } = options
  const cacheKey = itemLibraryCacheKey(schemaName)
  const [data, setData] = useState<ItemCatalogItem[]>(() => {
    if (!cacheKey) return []
    const cached = readListCache<ItemCatalogItem>(cacheKey)
    return cached?.rows || []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      // Fail closed: without a usable tenant context, expose no rows from
      // any entity (never fall back to another tenant's cached list).
      if (!cacheKey) {
        if (!cancelled) {
          setData([])
          setError(null)
          setLoading(true)
        }
        return
      }

      const cached = readListCache<ItemCatalogItem>(cacheKey)
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
        const nextData = await loadSummaryList(limit, { includeHeavyFallbacks }, tenantClient)
        if (!cancelled) {
          setData(nextData)
          writeListCache(cacheKey, nextData)
        }
      } catch (nextError) {
        // On load failure keep only this entity's rows (usually empty for a
        // new tenant) — never substitute another entity's cached list.
        if (!cancelled) {
          const stale = readListCache<ItemCatalogItem>(cacheKey)
          setData(stale?.rows || [])
          setError(nextError instanceof Error ? nextError : new Error('Failed to load item library'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [limit, reloadKey, tenantClient, cacheKey, data.length, includeHeavyFallbacks])

  return { data, setData, loading, error, reload: () => setReloadKey((value) => value + 1) }
}
