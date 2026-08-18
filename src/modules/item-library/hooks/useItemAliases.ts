import { useEffect, useMemo, useState } from 'react'

import { useEntity } from '@/lib/tenant/contexts'
import { loadItemAliases } from '../services'
import type { ItemAlias } from '../types'

export function useItemAliases(itemIds: string[], options: { enabled?: boolean } = {}) {
  const { tenantClient } = useEntity()
  const { enabled = true } = options
  const [data, setData] = useState<ItemAlias[]>([])
  const [loading, setLoading] = useState(enabled && itemIds.length > 0)
  const [error, setError] = useState<Error | null>(null)

  const stableItemIds = useMemo(
    () => [...new Set(itemIds.filter(Boolean))].sort(),
    [itemIds],
  )
  const itemIdsKey = stableItemIds.join('::')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!enabled || !stableItemIds.length) {
        setData([])
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const nextData = await loadItemAliases(stableItemIds, tenantClient)
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
  }, [itemIdsKey, enabled, tenantClient])

  return { data, loading, error }
}
