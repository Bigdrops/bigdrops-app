import { recordAuditLog, resolveAuditActor, type AuditAction } from '@/lib/audit'
import type { TenantClient } from '@/lib/tenantClient'
import { CPS_AUDIT_META_KEY } from '@/domain/audit/auditTypes'
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
 * The structured payload travels as a single reserved change entry. An
 * unauthenticated actor is classified as a system actor so it stays
 * distinguishable from a real user action. Callers decide whether to surface
 * a write failure. Document actions must not fail only because audit failed.
 */
export async function recordCpsAuditEvent(
  tenantClient: TenantClient,
  input: RecordCpsAuditInput,
): Promise<void> {
  const actor = await resolveAuditActor()
  const meta: CpsAuditMeta = actor.id ? input.meta : { ...input.meta, actorType: 'system' }
  const action = cpsAuditActionForEvent(meta.event) as AuditAction

  await recordAuditLog(tenantClient, {
    entityType: 'cps_sheets',
    recordId: input.recordId,
    entityLabel: input.entityLabel ?? null,
    action,
    oldData: {},
    newData: { [CPS_AUDIT_META_KEY]: meta },
    trackedFields: [CPS_AUDIT_META_KEY],
  })
}
