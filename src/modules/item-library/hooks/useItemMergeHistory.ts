import { useEffect, useState, useCallback } from 'react'
import { useEntity } from '@/lib/tenant/contexts'
import { getItemMergeHistory, getItemMergeHistoryCount } from '../repositories/itemLibraryRepository'
import type { ItemMergeLogRow } from '../types'

export function useItemMergeHistory(options: { enabled?: boolean } = {}) {
  const { tenantClient } = useEntity()
  const { enabled = true } = options
  const [data, setData] = useState<ItemMergeLogRow[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<Error | null>(null)

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true)
      const [historyRows, totalCount] = await Promise.all([
        getItemMergeHistory(100, tenantClient),
        getItemMergeHistoryCount(tenantClient)
      ])
      setData(historyRows)
      setCount(totalCount)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load merge history'))
    } finally {
      setLoading(false)
    }
  }, [tenantClient])

  useEffect(() => {
    if (enabled) {
      void loadHistory()
    }
  }, [loadHistory, enabled])

  return { data, count, loading, error, reload: loadHistory }
}
