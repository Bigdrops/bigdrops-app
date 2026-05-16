import { startTransition, useCallback, useEffect, useRef, useState } from 'react'

import type { AuditEntityType, AuditLogRecord, AuditTrailEntry } from '@/domain/audit/auditTypes'
import { buildAuditTrailItems } from '@/domain/audit/auditFormatters'
import { supabase } from '@/supabase'

interface UseAuditTrailOptions {
  entityType: AuditEntityType
  entityId?: string | null
  enabled?: boolean
}

interface UseAuditTrailResult {
  entries: AuditTrailEntry[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  loadOlder: (before: string) => Promise<void>
}

const AUDIT_LOG_SELECT =
  'id, entity_type, entity_id, entity_label, action, actor_id, actor_label, source, scope_type, created_at, changes, reason'

const CACHE_TTL_MS = 30_000

const requestCache = new Map<string, Promise<AuditLogRecord[]>>()
const cacheTimestamps = new Map<string, number>()

function getCacheKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`
}

function getCachedPromise(key: string): Promise<AuditLogRecord[]> | undefined {
  const timestamp = cacheTimestamps.get(key)
  if (timestamp && Date.now() - timestamp < CACHE_TTL_MS) {
    return requestCache.get(key)
  }
  requestCache.delete(key)
  cacheTimestamps.delete(key)
  return undefined
}

function setCachedPromise(key: string, promise: Promise<AuditLogRecord[]>): void {
  requestCache.set(key, promise)
  cacheTimestamps.set(key, Date.now())
  setTimeout(() => {
    requestCache.delete(key)
    cacheTimestamps.delete(key)
  }, CACHE_TTL_MS)
}

export function useAuditTrail({
  entityType,
  entityId,
  enabled = true,
}: UseAuditTrailOptions): UseAuditTrailResult {
  const [entries, setEntries] = useState<AuditTrailEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  const load = useCallback(async (skipCache = false) => {
    if (!enabled || !entityId) return

    setLoading(true)
    setError(null)

    const cacheKey = getCacheKey(String(entityType), String(entityId))

    const maybeFetch = async (): Promise<AuditLogRecord[]> => {
      const { data, error: auditError } = await supabase
        .from('audit_logs')
        .select(AUDIT_LOG_SELECT)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (auditError) throw auditError
      return (data || []) as AuditLogRecord[]
    }

    try {
      let rows: AuditLogRecord[]

      if (!skipCache) {
        const cached = getCachedPromise(cacheKey)
        if (cached) {
          rows = await cached
        } else {
          const fresh = maybeFetch()
          setCachedPromise(cacheKey, fresh)
          rows = await fresh
        }
      } else {
        const fresh = maybeFetch()
        setCachedPromise(cacheKey, fresh)
        rows = await fresh
      }

      if (cancelledRef.current) return

      startTransition(() => {
        setEntries(buildAuditTrailItems(rows))
        setError(null)
        setLoading(false)
      })
    } catch (auditError: unknown) {
      if (cancelledRef.current) return

      const message =
        auditError instanceof Error ? auditError.message : 'Unable to load history.'

      startTransition(() => {
        setEntries([])
        setError(message)
        setLoading(false)
      })
    }
  }, [enabled, entityId, entityType])

  useEffect(() => {
    cancelledRef.current = false

    if (!enabled || !entityId) {
      setEntries([])
      setLoading(false)
      setError(null)
      return
    }

    void load()

    return () => {
      cancelledRef.current = true
    }
  }, [load, enabled, entityId])

  const refetch = useCallback(async () => {
    cancelledRef.current = false
    await load(true)
  }, [load])

  const loadOlder = useCallback(async (before: string) => {
    if (!entityId) return

    setLoading(true)
    setError(null)

    const { data, error: auditError } = await supabase
      .from('audit_logs')
      .select(AUDIT_LOG_SELECT)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .lt('created_at', before)
      .order('created_at', { ascending: false })
      .limit(50)

    if (cancelledRef.current) return

    if (auditError) {
      startTransition(() => {
        setError(auditError.message || 'Unable to load older history.')
        setLoading(false)
      })
      return
    }

    startTransition(() => {
      setEntries((prev) => [
        ...prev,
        ...buildAuditTrailItems((data || []) as AuditLogRecord[]),
      ])
      setError(null)
      setLoading(false)
    })
  }, [entityId, entityType, cancelledRef])

  return {
    entries,
    loading,
    error,
    refetch,
    loadOlder,
  }
}

export default useAuditTrail
