import { useEffect, useState } from 'react'
import { loadSummaryList } from '../services'
import type { ItemCatalogItem } from '../types'

export function useItemHistoryList(limit = 100) {
  const [data, setData] = useState<ItemCatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const nextData = await loadSummaryList(limit)
        if (!cancelled) setData(nextData)
      } catch (nextError) {
        if (!cancelled) setError(nextError instanceof Error ? nextError : new Error('Failed to load item summary list'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [limit, reloadKey])

  return { data, loading, error, reload: () => setReloadKey((value) => value + 1) }
}
