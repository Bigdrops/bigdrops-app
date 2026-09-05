// Tenant ownership boundary for notifications.
//
// public.notifications rows carry entity_type + entity_id (a record id in
// some tenant schema) but no tenant binding of their own. A notification is
// visible under the active entity ONLY when it is genuinely global (no
// entity reference) or its referenced record exists in the active tenant's
// schema. Anything else is hidden (fail-closed) — never inferred from
// notification text or content.

export type ScopedNotification = {
  entity_type?: string | null
  entity_id?: string | null
}

// Tenant table that owns records of a notification entity type.
// payment notifications reference the parent invoice (same route target).
const ENTITY_TABLE: Record<string, string> = {
  invoice: 'invoices',
  payment: 'invoices',
  quotation: 'quotations',
  quote: 'quotations',
  csr: 'csrs',
  rfq: 'rfqs',
  waybill: 'waybills',
  letter: 'letters',
  project: 'projects',
  client: 'clients',
}

export function notificationOwnerTable(entityType: string | null | undefined): string | null {
  if (!entityType) return null
  return ENTITY_TABLE[String(entityType).toLowerCase()] ?? null
}

/** True when the notification references a specific tenant record. */
export function isEntityBound(notification: ScopedNotification): boolean {
  return !!notification.entity_id && !!notification.entity_type
}

/**
 * Decide visibility given the set of record ids that exist in the active
 * tenant (`existingIds` keyed by tenant table name).
 * - No entity reference → visible (genuinely global).
 * - Known type → visible only if the id exists in the active tenant.
 * - Unknown type with an entity reference → hidden (fail-closed).
 */
export function isNotificationVisibleInTenant(
  notification: ScopedNotification,
  existingIds: Record<string, Set<string>>,
): boolean {
  if (!isEntityBound(notification)) return true
  const table = notificationOwnerTable(notification.entity_type)
  if (!table) return false
  const ids = existingIds[table]
  if (!ids) return false
  return ids.has(String(notification.entity_id))
}

/**
 * Group entity-bound notifications with known owner tables by table,
 * collecting the record ids to verify. Returns table → ids.
 */
export function groupNotificationIdsByTable<T extends ScopedNotification>(
  notifications: T[],
): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  for (const n of notifications) {
    if (!isEntityBound(n)) continue
    const table = notificationOwnerTable(n.entity_type)
    if (!table) continue
    const id = String(n.entity_id)
    if (!groups[table]) groups[table] = []
    if (!groups[table].includes(id)) groups[table].push(id)
  }
  return groups
}
