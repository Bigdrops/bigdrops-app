import { startTransition, useEffect, useState } from 'react'

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
}

const AUDIT_LOG_SELECT =
  'id, entity_type, entity_id, entity_label, action, actor_id, actor_label, old_data, new_data, reason, created_at'

export function useAuditTrail({
  entityType,
  entityId,
  enabled = true,
}: UseAuditTrailOptions): UseAuditTrailResult {
  const [entries, setEntries] = useState<AuditTrailEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !entityId) {
      setEntries([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      const { data, error: auditError } = await supabase
        .from('audit_logs')
        .select(AUDIT_LOG_SELECT)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (auditError) {
        startTransition(() => {
          setEntries([])
          setError(auditError.message || 'Unable to load history.')
          setLoading(false)
        })
        return
      }

      startTransition(() => {
        setEntries(buildAuditTrailItems((data || []) as AuditLogRecord[]))
        setError(null)
        setLoading(false)
      })
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [enabled, entityId, entityType])

  return {
    entries,
    loading,
    error,
  }
}

export default useAuditTrail
