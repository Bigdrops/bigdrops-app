import { useState } from 'react'

import { mergeCatalogItems } from '../services'
import type { ItemLibraryMergeRequest, ItemLibraryMergeResult } from '../types'

export function useItemMerge() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mergeItems = async (request: ItemLibraryMergeRequest): Promise<ItemLibraryMergeResult> => {
    setLoading(true)
    setError(null)

    try {
      const result = await mergeCatalogItems(request)
      return result
    } catch (nextError) {
      const resolvedError =
        nextError instanceof Error ? nextError : new Error('Failed to merge duplicate items')
      setError(resolvedError)
      throw resolvedError
    } finally {
      setLoading(false)
    }
  }

  return {
    mergeItems,
    loading,
    error,
    resetError: () => setError(null),
  }
}
