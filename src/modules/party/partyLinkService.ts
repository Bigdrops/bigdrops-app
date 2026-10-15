// ============================================================================
// PARTY LINK ORCHESTRATION — dual-role workflows
// ============================================================================
// Composes the client role and the supplier role so a business can hold both.
//
// Rules enforced here:
//   * A link is always an explicit user decision. Nothing is linked by name.
//   * Linking never rewrites or merges an existing record.
//   * Unlinking removes only the relationship. Both role records survive.
//   * No document, snapshot, or accounting row is ever touched.
//   * Contact values are copied once, on creation, after user review. There is
//     no continuous synchronization in either direction.
//
// Failure recovery: a role record is created first, then linked. If the link
// fails, the newly created record is deleted. If that compensating delete also
// fails, the residue is a valid single-role record — never a dangling link and
// never a half-created party.
// ============================================================================

import { linkExistingSupplierToClient, unlinkClientSupplier, type SupplierResult } from '@/modules/supplier/supplierService'
import type { ClientSupplierLink, SupplierRecord, SupplierFormValues } from '@/domain/supplier/types'

/* eslint-disable @typescript-eslint/no-explicit-any */

const LINK_COLUMNS = 'id, client_id, supplier_id, created_at, updated_at, created_by, updated_by'

/** Client-role values accepted by the existing client creation convention. */
export interface ClientRoleValues {
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
  city: string
  state: string
}

export interface LinkedClientSummary {
  id: string
  name: string | null
}

function messageFrom(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '')
    if (message) return message
  }
  return fallback
}

/** The supplier linked to a client, or null when the client is client-only. */
export async function getLinkedSupplierForClient(
  tenantClient: any,
  clientId: string,
): Promise<SupplierResult<{ link: ClientSupplierLink; supplier: SupplierRecord }>> {
  if (!clientId) return { data: null, error: null }

  const { data: link, error: linkError } = await tenantClient
    .from('client_supplier_links')
    .select(LINK_COLUMNS)
    .eq('client_id', clientId)
    .maybeSingle()

  if (linkError) return { data: null, error: messageFrom(linkError, 'Could not load the supplier link.') }
  if (!link) return { data: null, error: null }

  const { data: supplier, error: supplierError } = await tenantClient
    .from('suppliers')
    .select('id, name, contact_person, phone, email, address, city, state, notes, created_at, updated_at, archived_at')
    .eq('id', link.supplier_id)
    .maybeSingle()

  if (supplierError) return { data: null, error: messageFrom(supplierError, 'Could not load the linked supplier.') }
  if (!supplier) return { data: null, error: null }

  return { data: { link: link as ClientSupplierLink, supplier: supplier as SupplierRecord }, error: null }
}

/** The client linked to a supplier, or null when the supplier is supplier-only. */
export async function getLinkedClientForSupplier(
  tenantClient: any,
  supplierId: string,
): Promise<SupplierResult<{ link: ClientSupplierLink; client: LinkedClientSummary }>> {
  if (!supplierId) return { data: null, error: null }

  const { data: link, error: linkError } = await tenantClient
    .from('client_supplier_links')
    .select(LINK_COLUMNS)
    .eq('supplier_id', supplierId)
    .maybeSingle()

  if (linkError) return { data: null, error: messageFrom(linkError, 'Could not load the client link.') }
  if (!link) return { data: null, error: null }

  const { data: client, error: clientError } = await tenantClient
    .from('clients')
    .select('id, name')
    .eq('id', link.client_id)
    .maybeSingle()

  if (clientError) return { data: null, error: messageFrom(clientError, 'Could not load the linked client.') }
  if (!client) return { data: null, error: null }

  return { data: { link: link as ClientSupplierLink, client: client as LinkedClientSummary }, error: null }
}

/**
 * Add a client role for an existing supplier and link the two.
 *
 * Uses the existing client creation convention (a direct `clients` insert with
 * the same fields `AddClient` writes). The client is created first, then linked;
 * a failed link deletes the just-created client.
 */
export async function createClientAndLinkForSupplier(
  tenantClient: any,
  supplierId: string,
  values: ClientRoleValues,
): Promise<SupplierResult<{ client: LinkedClientSummary; link: ClientSupplierLink }>> {
  if (!supplierId) return { data: null, error: 'Missing supplier id.' }
  if (!values.name.trim()) return { data: null, error: 'Client name is required.' }

  const existing = await getLinkedClientForSupplier(tenantClient, supplierId)
  if (existing.data) {
    return { data: null, error: 'This supplier already has a linked client.' }
  }

  const { data: client, error: clientError } = await tenantClient
    .from('clients')
    .insert({
      name: values.name.trim(),
      contact_person: values.contact_person.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      address: values.address.trim(),
      city: values.city.trim(),
      state: values.state.trim(),
    })
    .select('id, name')
    .single()

  if (clientError || !client) {
    return { data: null, error: messageFrom(clientError, 'Could not create this client.') }
  }

  const linked = await linkExistingSupplierToClient(tenantClient, client.id, supplierId)
  if (linked.error || !linked.data) {
    // Compensate: remove the client we just created.
    await tenantClient.from('clients').delete().eq('id', client.id)
    return { data: null, error: linked.error ?? 'Could not link the new client.' }
  }

  return { data: { client: client as LinkedClientSummary, link: linked.data }, error: null }
}

/** Remove a link. Both the client role record and the supplier role record survive. */
export async function unlinkParties(
  tenantClient: any,
  linkId: string,
): Promise<SupplierResult<true>> {
  return unlinkClientSupplier(tenantClient, linkId)
}

/** Re-exported so callers can build a supplier role for a client in one place. */
export { linkExistingSupplierToClient }
export type { SupplierFormValues }
