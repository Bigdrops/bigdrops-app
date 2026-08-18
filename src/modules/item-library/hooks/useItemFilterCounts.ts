import { useEffect, useState } from 'react'
import { useEntity } from '@/lib/tenant/contexts'
import { getItemFilterCounts } from '../repositories'
import type { ItemFilterCounts } from '../types'

const DEFAULT_COUNTS: ItemFilterCounts = { all: 0, invoice: 0, quotation: 0 }

export function useItemFilterCounts() {
  const { tenantClient } = useEntity()
  const [counts, setCounts] = useState<ItemFilterCounts>(DEFAULT_COUNTS)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      try {
        const result = await getItemFilterCounts(tenantClient)
        if (!cancelled) setCounts(result)
      } catch {
        // Silently fall back to zero counts on error
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => { cancelled = true }
  }, [reloadKey, tenantClient])

  return { counts, loading, reload: () => setReloadKey((v) => v + 1) }
}
