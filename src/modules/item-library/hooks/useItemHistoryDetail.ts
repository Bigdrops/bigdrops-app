import { useEffect, useState } from 'react'
import { loadItemHistoryDetail } from '../services'
import type { ItemHistoryRow } from '../types'

export function useItemHistoryDetail(itemId: string | null | undefined, limit = 50) {
  const [data, setData] = useState<ItemHistoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!itemId) {
        setData([])
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const nextData = await loadItemHistoryDetail(itemId, limit)
        if (!cancelled) setData(nextData)
      } catch (nextError) {
        if (!cancelled) setError(nextError instanceof Error ? nextError : new Error('Failed to load item history'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [itemId, limit])

  return { data, loading, error }
}
