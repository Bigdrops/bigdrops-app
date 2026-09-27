import { useCallback, useEffect, useState } from 'react'

import { useEntity } from '@/lib/tenant/contexts'
import {
  createHistoricalReviewItem,
  keepHistoricalReviewCandidateSeparateDecision,
  linkHistoricalReviewCase,
  loadHistoricalReviewCases,
} from '../services'
import type {
  CreateHistoricalReviewItemRequest,
  HistoricalReviewMutationResult,
  HistoricalReviewResult,
  KeepHistoricalReviewCandidateSeparateRequest,
  LinkHistoricalReviewCaseRequest,
} from '../types'

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
  const [mutating, setMutating] = useState(false)
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

  const reload = useCallback(() => setReloadKey((value) => value + 1), [])

  const runMutation = useCallback(
    async (operation: () => Promise<HistoricalReviewMutationResult>) => {
      setMutating(true)
      setError(null)
      try {
        const result = await operation()
        if (result.status === 'applied') reload()
        return result
      } finally {
        setMutating(false)
      }
    },
    [reload],
  )

  const linkCaseToItem = useCallback(
    (request: LinkHistoricalReviewCaseRequest) => runMutation(() => linkHistoricalReviewCase(request, tenantClient)),
    [runMutation, tenantClient],
  )

  const createItemFromCase = useCallback(
    (request: CreateHistoricalReviewItemRequest) => runMutation(() => createHistoricalReviewItem(request, tenantClient)),
    [runMutation, tenantClient],
  )

  const keepCandidateSeparate = useCallback(
    (request: KeepHistoricalReviewCandidateSeparateRequest) =>
      runMutation(() => keepHistoricalReviewCandidateSeparateDecision(request, tenantClient)),
    [runMutation, tenantClient],
  )

  return {
    data,
    loading,
    error,
    mutating,
    reload,
    linkCaseToItem,
    createItemFromCase,
    keepCandidateSeparate,
  }
}
