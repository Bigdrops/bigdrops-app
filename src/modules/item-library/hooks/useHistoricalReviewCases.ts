import { useEffect, useState } from 'react'

import { useEntity } from '@/lib/tenant/contexts'
import { loadHistoricalReviewCases } from '../services'
import type { HistoricalReviewResult } from '../types'

const EMPTY_RESULT: HistoricalReviewResult = {
  tenant_schema: 'unknown',
  cases: [],
  summary: {
    occurrence_count: 0,
    case_count: 0,
    repeated_case_count: 0,
    singleton_case_count: 0,
    repeated_occurrence_count: 0,
    invoice_occurrence_count: 0,
    quotation_occurrence_count: 0,
    specification_sensitive_case_count: 0,
    cases_with_candidates_count: 0,
    tier_d_excluded_count: 0,
    tier_b_excluded_count: 0,
    truncated: false,
  },
}

export function useHistoricalReviewCases() {
  const { tenantClient, schemaName } = useEntity()
  const [data, setData] = useState<HistoricalReviewResult>(EMPTY_RESULT)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await loadHistoricalReviewCases(tenantClient)
        if (!cancelled) setData(result)
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError : new Error('Failed to load Historical Review cases.'))
          setData({
            ...EMPTY_RESULT,
            tenant_schema: schemaName || 'unknown',
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [reloadKey, tenantClient, schemaName])

  return {
    data,
    loading,
    error,
    reload: () => setReloadKey((value) => value + 1),
  }
}
