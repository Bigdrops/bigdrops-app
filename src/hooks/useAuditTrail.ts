import { startTransition, useCallback, useEffect, useRef, useState } from 'react'

import type { AuditEntityType, AuditLogRecord, AuditTrailEntry } from '@/domain/audit/auditTypes'
import { buildAuditTrailItems } from '@/domain/audit/auditFormatters'
import { useEntity } from '@/lib/tenant/contexts'
import type { TenantClient } from '@/lib/tenantClient'

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

const ACTIVITY_EVENT_SELECT =
  'id, entity_type, entity_id, entity_label, event_type, actor_id, actor_label, source, scope_type, created_at, metadata, reason'

const ACTIVITY_EVENT_TYPES = ['CREATED', 'STATUS_CHANGED', 'PAYMENT_RECORDED', 'PAYMENT_VOIDED', 'LINKED', 'UNLINKED']

const EVENT_TYPE_TO_ACTION: Record<string, string> = {
  CREATED: 'CREATE',
  STATUS_CHANGED: 'STATUS_CHANGE',
  PAYMENT_RECORDED: 'PAYMENT_RECORDED',
  PAYMENT_VOIDED: 'PAYMENT_VOIDED',
  LINKED: 'LINK',
  UNLINKED: 'UNLINK',
}

function mapActivityEventToAuditLog(event: Record<string, unknown>): AuditLogRecord {
  return {
    id: `aev_${event.id}`,
    entity_type: event.entity_type as string,
    entity_id: event.entity_id as string,
    entity_label: event.entity_label as string | null | undefined,
    action: EVENT_TYPE_TO_ACTION[event.event_type as string] || (event.event_type as string),
    actor_id: event.actor_id as string | null | undefined,
    actor_label: event.actor_label as string | null | undefined,
    source: event.source as string | null | undefined,
    scope_type: event.scope_type as string | null | undefined,
    created_at: event.created_at as string | null | undefined,
    changes: null,
    metadata: (event.metadata as Record<string, unknown>) || null,
    reason: event.reason as string | null | undefined,
  }
}

function roundToSecond(ts: string): number {
  return Math.round(new Date(ts).getTime() / 1000)
}

function dedupActivityEvents(auditRows: AuditLogRecord[], activityRows: AuditLogRecord[]) {
  const createEntityIds = new Set(
    auditRows.filter((r) => r.action === 'CREATE').map((r) => r.entity_id),
  )
  const activityFiltered = activityRows.filter(
    (r) => !(r.action === 'CREATE' && createEntityIds.has(r.entity_id)),
  )
  const activityKeys = new Set<string>()
  for (const r of activityFiltered) {
    if (r.created_at) activityKeys.add(`${r.entity_id}:${roundToSecond(r.created_at)}`)
  }
  const auditDeduped = auditRows.filter(
    (r) => !r.created_at || !activityKeys.has(`${r.entity_id}:${roundToSecond(r.created_at)}`),
  )
  return { auditDeduped, activityFiltered }
}

function sortByCreatedDesc(rows: AuditLogRecord[]): AuditLogRecord[] {
  return rows.sort((a, b) => {
    const aT = a.created_at ? new Date(a.created_at).getTime() : 0
    const bT = b.created_at ? new Date(b.created_at).getTime() : 0
    return bT - aT
  })
}

async function fetchMerged(client: TenantClient, entityType: string, entityId: string, before?: string): Promise<AuditLogRecord[]> {
  const auditQuery = client
    .from('audit_logs')
    .select(AUDIT_LOG_SELECT)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(50)

  const activityQuery = client
    .from('activity_events')
    .select(ACTIVITY_EVENT_SELECT)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .in('event_type', ACTIVITY_EVENT_TYPES)
    .order('created_at', { ascending: false })
    .limit(50)

  if (before) {
    auditQuery.lt('created_at', before)
    activityQuery.lt('created_at', before)
  }

  const [auditResult, activityResult] = await Promise.all([auditQuery, activityQuery])

  if (auditResult.error) throw auditResult.error
  if (activityResult.error) throw activityResult.error

  const auditRows = (auditResult.data || []) as AuditLogRecord[]
  const activityRows = (activityResult.data || []).map(mapActivityEventToAuditLog)
  const { auditDeduped, activityFiltered } = dedupActivityEvents(auditRows, activityRows)

  return sortByCreatedDesc([...auditDeduped, ...activityFiltered])
}

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
  const { tenantClient } = useEntity()
  const [entries, setEntries] = useState<AuditTrailEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  const load = useCallback(async (skipCache = false) => {
    if (!enabled || !entityId || !tenantClient.isReady) return

    setLoading(true)
    setError(null)

    const cacheKey = getCacheKey(String(entityType), String(entityId))

    try {
      let rows: AuditLogRecord[]

      const doFetch = () => fetchMerged(tenantClient, entityType, entityId)

      if (!skipCache) {
        const cached = getCachedPromise(cacheKey)
        if (cached) {
          rows = await cached
        } else {
          const fresh = doFetch()
          setCachedPromise(cacheKey, fresh)
          rows = await fresh
        }
      } else {
        const fresh = doFetch()
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
  }, [enabled, entityId, entityType, tenantClient])

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
    if (!entityId || !tenantClient.isReady) return

    setLoading(true)
    setError(null)

    try {
      const rows = await fetchMerged(tenantClient, entityType, entityId, before)

      if (cancelledRef.current) return

      startTransition(() => {
        setEntries((prev) => [...prev, ...buildAuditTrailItems(rows)])
        setError(null)
        setLoading(false)
      })
    } catch (auditError: unknown) {
      if (cancelledRef.current) return

      const message =
        auditError instanceof Error ? auditError.message : 'Unable to load older history.'

      startTransition(() => {
        setError(message)
        setLoading(false)
      })
    }
  }, [entityId, entityType, tenantClient, cancelledRef])

  return {
    entries,
    loading,
    error,
    refetch,
    loadOlder,
  }
}

export default useAuditTrail
