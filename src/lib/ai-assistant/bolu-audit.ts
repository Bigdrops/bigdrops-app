/**
 * bolu-audit.ts — persisted co-creation provenance for documents saved by Bolu.
 *
 * Bolu never replaces the human actor. A document created through Bolu is
 * written by the authenticated user who approved Gate 1 and confirmed Gate 2,
 * and this module records that same user in the existing audit infrastructure
 * while marking the operation source as `bolu`.
 *
 * Two persisted facts identify a Bolu-assisted document after a reload:
 *
 * 1. `custom_fields.created_via = 'bolu_assistant'`, written with the document
 *    itself by `bolu-document-service.ts`.
 * 2. An `audit_logs` CREATE row whose `source` is `bolu` and whose actor is the
 *    authenticated user.
 *
 * Both come from saved data. Nothing here is derived from frontend state, so a
 * refresh or a different device cannot invent or lose the attribution.
 */

import type { TenantClient } from '@/lib/tenantClient'

/** Audit `source` value for an operation performed through Bolu. */
export const BOLU_AUDIT_SOURCE = 'bolu'

/** `custom_fields` key and value that persist Bolu involvement. */
export const BOLU_PROVENANCE_KEY = 'created_via'
export const BOLU_PROVENANCE_VALUE = 'bolu_assistant'

export interface BoluAuditActor {
  id: string | null
  label: string
}

export interface BoluCreationAuditInput {
  family: 'invoice' | 'quotation'
  documentId: string
  documentNumber: string
  clientName: string
  total: number
  opId: string
  /** The authenticated user who approved and confirmed the save. */
  actor?: BoluAuditActor | null
}

/**
 * Reads persisted provenance from a document's `custom_fields`.
 *
 * Only the exact stored marker counts. A manually created document, a document
 * created by another integration, and a document whose fields are unreadable all
 * return false, so the view page can never mislabel them.
 */
export function isBoluCreatedDocument(customFields: unknown): boolean {
  if (!customFields) return false
  let parsed: unknown = customFields
  if (typeof customFields === 'string') {
    try {
      parsed = JSON.parse(customFields)
    } catch {
      return false
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false
  return (parsed as Record<string, unknown>)[BOLU_PROVENANCE_KEY] === BOLU_PROVENANCE_VALUE
}

/**
 * Records the existing CREATE audit event for a document persisted through Bolu.
 *
 * This is deliberately the same `record_audit_log` RPC the standard form uses,
 * with the same tracked fields and the same authenticated actor. Only the
 * operation `source` differs, which is exactly what distinguishes a Bolu-assisted
 * creation from a manual one.
 *
 * Best-effort by design: a failed audit write must never roll back or hide a
 * document that was persisted successfully. Failures are logged, not swallowed
 * silently.
 */
export async function recordBoluDocumentCreationAudit(
  tenantClient: TenantClient,
  input: BoluCreationAuditInput,
): Promise<void> {
  const newData: Record<string, unknown> = input.family === 'invoice'
    ? {
        invoice_number: input.documentNumber,
        client_name: input.clientName,
        total: input.total,
      }
    : {
        quotation_number: input.documentNumber,
        client_name: input.clientName,
        total: input.total,
      }

  try {
    await tenantClient.rpc('record_audit_log', {
      p_entity_type: input.family,
      p_entity_id: input.documentId,
      p_entity_label: input.documentNumber,
      p_action: 'CREATE',
      p_old_data: null,
      p_new_data: newData,
      p_actor_id: input.actor?.id ?? null,
      p_actor_label: input.actor?.label ?? 'bolu',
      p_source: BOLU_AUDIT_SOURCE,
      p_scope_type: 'app',
      p_reason: `Created through Bolu (operation ${input.opId})`,
    })
  } catch (err) {
    console.warn(
      '[bolu-audit] CREATE audit event failed:',
      err instanceof Error ? err.message : err,
    )
  }

  // The activity feed reads the per-family CREATE RPC, exactly as the form does.
  // The audit row above carries the field diff; this call supplies lineage.
  try {
    if (input.family === 'invoice') {
      await tenantClient.rpc('record_invoice_created', {
        p_invoice_id: input.documentId,
        p_actor_id: input.actor?.id ?? null,
        p_actor_label: input.actor?.label ?? 'bolu',
        p_source: BOLU_AUDIT_SOURCE,
      })
    } else {
      await tenantClient.rpc('record_quotation_created', {
        p_quotation_id: input.documentId,
        p_actor_id: input.actor?.id ?? null,
        p_actor_label: input.actor?.label ?? 'bolu',
        p_source: BOLU_AUDIT_SOURCE,
      })
    }
  } catch (err) {
    console.warn(
      '[bolu-audit] activity event failed:',
      err instanceof Error ? err.message : err,
    )
  }
}

/**
 * Records an UPDATE audit event for a document modified through Bolu.
 *
 * The standard forms write this event after a successful update; a Bolu
 * modification must not be invisible in the same trail. The actor stays the
 * authenticated user and only the source marks the channel.
 */
export async function recordBoluDocumentModificationAudit(
  tenantClient: TenantClient,
  input: {
    family: 'invoice' | 'quotation'
    documentId: string
    documentNumber: string
    opId: string
    changedField?: string | null
    oldValue?: string | number | null
    newValue?: string | number | null
    itemsChanged?: boolean
    actor?: BoluAuditActor | null
  },
): Promise<void> {
  const newData: Record<string, unknown> = {
    document_number: input.documentNumber,
    changed_via: BOLU_PROVENANCE_VALUE,
  }
  if (input.changedField) {
    newData[input.changedField] = input.newValue ?? null
  }
  if (input.itemsChanged) {
    newData.line_items = 'replaced'
  }

  try {
    await tenantClient.rpc('record_audit_log', {
      p_entity_type: input.family,
      p_entity_id: input.documentId,
      p_entity_label: input.documentNumber,
      p_action: 'UPDATE',
      p_old_data: input.changedField
        ? { [input.changedField]: input.oldValue ?? null }
        : null,
      p_new_data: newData,
      p_actor_id: input.actor?.id ?? null,
      p_actor_label: input.actor?.label ?? 'bolu',
      p_source: BOLU_AUDIT_SOURCE,
      p_scope_type: 'app',
      p_reason: `Modified through Bolu (operation ${input.opId})`,
    })
  } catch (err) {
    console.warn(
      '[bolu-audit] UPDATE audit event failed:',
      err instanceof Error ? err.message : err,
    )
  }
}
