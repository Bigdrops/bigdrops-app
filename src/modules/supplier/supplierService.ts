// ============================================================================
// SUPPLIER PERSISTENCE SERVICE
// ============================================================================
// Persistence only. Business rules and validation live in
// `src/domain/supplier/types.ts` (docs/standard/lifecycle-ownership-standard.md).
//
// Every query runs through the tenant-scoped client, so a call can only ever
// reach the caller's own `entity_*` schema. No function here accepts a schema
// name, and no function reads or writes the `clients` table.
//
// Accounting is untouched. A client/supplier link is identity metadata and is
// never read by source transactions, receivables, or payables.
// ============================================================================

import {
  toSupplierPayload,
  validateSupplierForm,
  type ClientSupplierLink,
  type SupplierFormValues,
  type SupplierRecord,
} from '@/domain/supplier/types'

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SupplierResult<T> {
  data: T | null
  error: string | null
}

const SUPPLIER_COLUMNS =
  'id, name, contact_person, phone, email, address, city, state, notes, created_at, updated_at, archived_at'

const LINK_COLUMNS = 'id, client_id, supplier_id, created_at, updated_at, created_by, updated_by'

function messageFrom(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '')
    if (message) return message
  }
  return fallback
}

/** A unique-constraint violation. Postgres reports SQLSTATE 23505. */
function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: unknown }).code
  if (code === '23505') return true
  const message = String((error as { message?: unknown }).message ?? '')
  return /duplicate key value|unique constraint/i.test(message)
}

const DUPLICATE_LINK_MESSAGE =
  'That link already exists. Each client links to one supplier and each supplier to one client.'

/* ------------------------------------------------------------------ */
/* Reads                                                              */
/* ------------------------------------------------------------------ */

export async function listSuppliers(
  tenantClient: any,
  options: { includeArchived?: boolean } = {},
): Promise<SupplierResult<SupplierRecord[]>> {
  const { includeArchived = false } = options
  let query = tenantClient.from('suppliers').select(SUPPLIER_COLUMNS).order('name')
  if (!includeArchived) query = query.is('archived_at', null)

  const { data, error } = await query
  if (error) return { data: null, error: messageFrom(error, 'Could not load suppliers.') }
  return { data: (data ?? []) as SupplierRecord[], error: null }
}

export async function getSupplier(
  tenantClient: any,
  supplierId: string,
): Promise<SupplierResult<SupplierRecord>> {
  if (!supplierId) return { data: null, error: 'Missing supplier id.' }
  const { data, error } = await tenantClient
    .from('suppliers')
    .select(SUPPLIER_COLUMNS)
    .eq('id', supplierId)
    .single()
  if (error) return { data: null, error: messageFrom(error, 'Could not load this supplier.') }
  return { data: (data ?? null) as SupplierRecord | null, error: null }
}

export async function getLinkForClient(
  tenantClient: any,
  clientId: string,
): Promise<SupplierResult<ClientSupplierLink>> {
  if (!clientId) return { data: null, error: null }
  const { data, error } = await tenantClient
    .from('client_supplier_links')
    .select(LINK_COLUMNS)
    .eq('client_id', clientId)
    .maybeSingle()
  if (error) return { data: null, error: messageFrom(error, 'Could not load the supplier link.') }
  return { data: (data ?? null) as ClientSupplierLink | null, error: null }
}

export async function getLinkForSupplier(
  tenantClient: any,
  supplierId: string,
): Promise<SupplierResult<ClientSupplierLink>> {
  if (!supplierId) return { data: null, error: null }
  const { data, error } = await tenantClient
    .from('client_supplier_links')
    .select(LINK_COLUMNS)
    .eq('supplier_id', supplierId)
    .maybeSingle()
  if (error) return { data: null, error: messageFrom(error, 'Could not load the client link.') }
  return { data: (data ?? null) as ClientSupplierLink | null, error: null }
}

/* ------------------------------------------------------------------ */
/* Supplier lifecycle                                                 */
/* ------------------------------------------------------------------ */

export async function createSupplier(
  tenantClient: any,
  values: SupplierFormValues,
): Promise<SupplierResult<SupplierRecord>> {
  const validation = validateSupplierForm(values)
  if (!validation.valid) return { data: null, error: validation.error ?? 'Invalid supplier.' }

  const { data, error } = await tenantClient
    .from('suppliers')
    .insert(toSupplierPayload(values))
    .select(SUPPLIER_COLUMNS)
    .single()

  if (error) return { data: null, error: messageFrom(error, 'Could not create this supplier.') }
  return { data: (data ?? null) as SupplierRecord | null, error: null }
}

export async function updateSupplier(
  tenantClient: any,
  supplierId: string,
  values: SupplierFormValues,
): Promise<SupplierResult<SupplierRecord>> {
  if (!supplierId) return { data: null, error: 'Missing supplier id.' }

  const validation = validateSupplierForm(values)
  if (!validation.valid) return { data: null, error: validation.error ?? 'Invalid supplier.' }

  const { data, error } = await tenantClient
    .from('suppliers')
    .update(toSupplierPayload(values))
    .eq('id', supplierId)
    .select(SUPPLIER_COLUMNS)
    .single()

  if (error) return { data: null, error: messageFrom(error, 'Could not update this supplier.') }
  return { data: (data ?? null) as SupplierRecord | null, error: null }
}

/**
 * Archive a supplier. Archiving is per role: it never touches the linked
 * client record, and it never touches any document or document snapshot.
 */
export async function archiveSupplier(
  tenantClient: any,
  supplierId: string,
): Promise<SupplierResult<SupplierRecord>> {
  if (!supplierId) return { data: null, error: 'Missing supplier id.' }

  const { data, error } = await tenantClient
    .from('suppliers')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', supplierId)
    .select(SUPPLIER_COLUMNS)
    .single()

  if (error) return { data: null, error: messageFrom(error, 'Could not archive this supplier.') }
  return { data: (data ?? null) as SupplierRecord | null, error: null }
}

/** Restore an archived supplier. The inverse of archive, and equally role-scoped. */
export async function restoreSupplier(
  tenantClient: any,
  supplierId: string,
): Promise<SupplierResult<SupplierRecord>> {
  if (!supplierId) return { data: null, error: 'Missing supplier id.' }

  const { data, error } = await tenantClient
    .from('suppliers')
    .update({ archived_at: null })
    .eq('id', supplierId)
    .select(SUPPLIER_COLUMNS)
    .single()

  if (error) return { data: null, error: messageFrom(error, 'Could not restore this supplier.') }
  return { data: (data ?? null) as SupplierRecord | null, error: null }
}

/* ------------------------------------------------------------------ */
/* Explicit party links                                               */
/* ------------------------------------------------------------------ */

/**
 * Link an existing supplier to an existing client.
 *
 * Both ids must resolve inside the caller's schema. The one-to-one uniques on
 * the link table make a duplicate or concurrent link attempt fail safely
 * instead of producing two links.
 */
export async function linkExistingSupplierToClient(
  tenantClient: any,
  clientId: string,
  supplierId: string,
): Promise<SupplierResult<ClientSupplierLink>> {
  if (!clientId || !supplierId) {
    return { data: null, error: 'A link needs both a client and a supplier.' }
  }

  const { data, error } = await tenantClient
    .from('client_supplier_links')
    .insert({ client_id: clientId, supplier_id: supplierId })
    .select(LINK_COLUMNS)
    .single()

  if (error) {
    if (isUniqueViolation(error)) return { data: null, error: DUPLICATE_LINK_MESSAGE }
    return { data: null, error: messageFrom(error, 'Could not create the link.') }
  }
  return { data: (data ?? null) as ClientSupplierLink | null, error: null }
}

/** Link an existing client to an existing supplier. Same rules as the inverse. */
export async function linkExistingClientToSupplier(
  tenantClient: any,
  supplierId: string,
  clientId: string,
): Promise<SupplierResult<ClientSupplierLink>> {
  return linkExistingSupplierToClient(tenantClient, clientId, supplierId)
}

/**
 * Create a supplier role for a client and link the two, in one reviewed step.
 *
 * Failure recovery: the supplier insert commits first. If the link insert then
 * fails, the new supplier is deleted so no unintended record is left behind.
 * If that compensating delete also fails, the residue is a VALID supplier-only
 * record, never a dangling link or a partial party.
 */
export async function createSupplierAndLinkForClient(
  tenantClient: any,
  clientId: string,
  values: SupplierFormValues,
): Promise<SupplierResult<{ supplier: SupplierRecord; link: ClientSupplierLink }>> {
  if (!clientId) return { data: null, error: 'Missing client id.' }

  const existing = await getLinkForClient(tenantClient, clientId)
  if (existing.data) {
    return { data: null, error: 'This client already has a linked supplier.' }
  }

  const created = await createSupplier(tenantClient, values)
  if (created.error || !created.data) {
    return { data: null, error: created.error ?? 'Could not create this supplier.' }
  }

  const linked = await linkExistingSupplierToClient(tenantClient, clientId, created.data.id)
  if (linked.error || !linked.data) {
    // Compensate: remove the supplier we just created. Worst case the delete
    // fails and the row stays as a legitimate supplier-only record.
    await tenantClient.from('suppliers').delete().eq('id', created.data.id)
    return { data: null, error: linked.error ?? 'Could not link the new supplier.' }
  }

  return { data: { supplier: created.data, link: linked.data }, error: null }
}

/**
 * Remove a link. Both role records are preserved: no client and no supplier is
 * deleted, and no document or accounting row is touched.
 */
export async function unlinkClientSupplier(
  tenantClient: any,
  linkId: string,
): Promise<SupplierResult<true>> {
  if (!linkId) return { data: null, error: 'Missing link id.' }

  const { error } = await tenantClient.from('client_supplier_links').delete().eq('id', linkId)
  if (error) return { data: null, error: messageFrom(error, 'Could not remove the link.') }
  return { data: true, error: null }
}
