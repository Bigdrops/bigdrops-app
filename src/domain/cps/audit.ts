import { resolveAuditActor, type AuditAction } from '@/lib/audit'
import type { TenantClient } from '@/lib/tenantClient'
import type { CpsAuditMeta } from '@/domain/audit/auditTypes'
import { cpsAuditActionForEvent } from './auditDiff'

// All pure CPS audit logic lives in auditDiff so it stays free of network
// and Supabase imports. Re-exported here so call sites have one entry point.
export * from './auditDiff'

export interface RecordCpsAuditInput {
  recordId: string
  entityLabel?: string | null
  meta: CpsAuditMeta
}

/**
 * Persist one CPS audit event through the shared audit authority.
 *
 * Phase 2.5: the structured payload is written to `audit_logs.metadata` by the
 * dedicated `record_cps_audit_event` RPC, instead of being hidden inside
 * `audit_logs.changes` under the reserved key `_cps`. Readers still fall back
 * to the legacy location for rows written before the promotion, so nothing
 * historical is lost. The same payload therefore never lives in two places.
 *
 * An unauthenticated actor is classified as a system actor so it stays
 * distinguishable from a real user action. Callers decide whether to surface a
 * write failure: document actions must not fail only because audit failed.
 */
export async function recordCpsAuditEvent(
  tenantClient: TenantClient,
  input: RecordCpsAuditInput,
): Promise<void> {
  const actor = await resolveAuditActor()
  const meta: CpsAuditMeta = actor.id ? input.meta : { ...input.meta, actorType: 'system' }
  const action = cpsAuditActionForEvent(meta.event) as AuditAction

  const { error } = await tenantClient.rpc('record_cps_audit_event', {
    p_entity_id: input.recordId,
    p_entity_label: input.entityLabel ?? null,
    p_action: action,
    p_metadata: meta,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
    p_scope_type: 'app',
  })

  if (error) throw new Error(error.message || 'CPS audit write failed.')
}
