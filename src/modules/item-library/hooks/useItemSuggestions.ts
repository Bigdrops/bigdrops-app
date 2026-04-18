import { useEffect, useState } from 'react'
import { loadSuggestions } from '../services'
import type { ItemSuggestion } from '../types'

export function useItemSuggestions(searchText: string, resultLimit = 10) {
  const [data, setData] = useState<ItemSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!String(searchText || '').trim()) {
        setData([])
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const nextData = await loadSuggestions(searchText, resultLimit)
        if (!cancelled) setData(nextData)
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError : new Error('Failed to load item suggestions'))
          setData([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [resultLimit, searchText])

  return { data, loading, error }
}
