import { useEffect, useMemo, useState } from 'react'

import { loadItemAliases } from '../services'
import type { ItemAlias } from '../types'

export function useItemAliases(itemIds: string[]) {
  const [data, setData] = useState<ItemAlias[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const stableItemIds = useMemo(
    () => [...new Set(itemIds.filter(Boolean))].sort(),
    [itemIds],
  )
  const itemIdsKey = stableItemIds.join('::')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!stableItemIds.length) {
        setData([])
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const nextData = await loadItemAliases(stableItemIds)
        if (!cancelled) setData(nextData)
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError : new Error('Failed to load item aliases'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [itemIdsKey, stableItemIds])

  return { data, loading, error }
}
