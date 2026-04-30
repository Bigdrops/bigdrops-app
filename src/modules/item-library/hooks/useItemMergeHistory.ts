import { useEffect, useState, useCallback } from 'react'
import { getItemMergeHistory, getItemMergeHistoryCount } from '../repositories/itemLibraryRepository'
import type { ItemMergeLogRow } from '../types'

export function useItemMergeHistory() {
  const [data, setData] = useState<ItemMergeLogRow[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true)
      const [historyRows, totalCount] = await Promise.all([
        getItemMergeHistory(100),
        getItemMergeHistoryCount()
      ])
      setData(historyRows)
      setCount(totalCount)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load merge history'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  return { data, count, loading, error, reload: loadHistory }
}
