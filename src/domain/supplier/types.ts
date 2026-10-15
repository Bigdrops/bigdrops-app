// ============================================================================
// SUPPLIER DOMAIN — types, constants and pure validation
// ============================================================================
// Architecture: OPTION B (linked role directories).
//   * `clients`      is authoritative for the client role.
//   * `suppliers`    is authoritative for the supplier role.
//   * `client_supplier_links` records that one client record and one supplier
//     record are the same business. The link is identity metadata only.
//
// Supplier identity is an independent uuid. It is never derived from a client
// id and never derived from free-text vendor values such as `rfqs.vendor_name`,
// `expenses.vendor_name`, `tax_input_entries.vendor_name`, or the legacy
// repurposed `cps_sheets.vendor_name`.
//
// Business rules live here (docs/standard/lifecycle-ownership-standard.md §2.2).
// Database access lives in `src/modules/supplier/supplierService.ts`.
// ============================================================================

/** A supplier row as stored in the tenant schema. */
export interface SupplierRecord {
  id: string
  name: string
  contact_person?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  notes?: string | null
  created_at?: string | null
  updated_at?: string | null
  archived_at?: string | null
}

/** An explicit one-to-one link between a client record and a supplier record. */
export interface ClientSupplierLink {
  id: string
  client_id: string
  supplier_id: string
  created_at?: string | null
  updated_at?: string | null
  created_by?: string | null
  updated_by?: string | null
}

/** Editable supplier fields. */
export interface SupplierFormValues {
  name: string
  contact_person: string
  phone: string
  email: string
  address: string
  city: string
  state: string
  notes: string
}

export const emptySupplierForm: SupplierFormValues = {
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  notes: '',
}

/** The reviewed client fields that may seed a supplier role. */
export interface ClientDetailsForSupplierRole {
  id: string
  name?: string | null
  contact_person?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
}

/**
 * Pre-fill supplier values from a client record.
 *
 * This is a ONE-WAY, ONE-TIME copy offered for review. There is no automatic
 * synchronization in either direction afterwards: a later client edit never
 * propagates to the supplier, and a later supplier edit never propagates to
 * the client.
 */
export function supplierFormFromClient(client: ClientDetailsForSupplierRole): SupplierFormValues {
  return {
    name: client.name?.trim() ?? '',
    contact_person: client.contact_person?.trim() ?? '',
    phone: client.phone?.trim() ?? '',
    email: client.email?.trim() ?? '',
    address: client.address?.trim() ?? '',
    city: client.city?.trim() ?? '',
    state: client.state?.trim() ?? '',
    notes: '',
  }
}

export interface SupplierValidationResult {
  valid: boolean
  error?: string
  errorDescription?: string
}

/**
 * Validate supplier form values.
 *
 * Only the name is required, matching the client form convention. Name
 * uniqueness is deliberately NOT enforced: two distinct businesses may share
 * a name, and identity is the id, never the name.
 */
export function validateSupplierForm(values: SupplierFormValues): SupplierValidationResult {
  if (!values.name || !values.name.trim()) {
    return {
      valid: false,
      error: 'Supplier name is required',
      errorDescription: 'Enter a name for this supplier.',
    }
  }
  return { valid: true }
}

/** Normalise form values into a trimmed persistence payload. */
export function toSupplierPayload(values: SupplierFormValues): SupplierFormValues {
  return {
    name: values.name.trim(),
    contact_person: values.contact_person.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    address: values.address.trim(),
    city: values.city.trim(),
    state: values.state.trim(),
    notes: values.notes.trim(),
  }
}

/** Normalise a supplier row into editable form values. */
export function supplierFormFromRecord(record: SupplierRecord): SupplierFormValues {
  return {
    name: record.name ?? '',
    contact_person: record.contact_person ?? '',
    phone: record.phone ?? '',
    email: record.email ?? '',
    address: record.address ?? '',
    city: record.city ?? '',
    state: record.state ?? '',
    notes: record.notes ?? '',
  }
}

/** Active suppliers are the default everywhere. Archived rows stay readable. */
export function isArchivedSupplier(record: Pick<SupplierRecord, 'archived_at'>): boolean {
  return Boolean(record.archived_at)
}

export function partitionSuppliers(records: SupplierRecord[]): {
  active: SupplierRecord[]
  archived: SupplierRecord[]
} {
  return {
    active: records.filter((record) => !isArchivedSupplier(record)),
    archived: records.filter((record) => isArchivedSupplier(record)),
  }
}

/** Case-insensitive directory filter over name, contact person, city and phone. */
export function matchesSupplierQuery(record: SupplierRecord, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [record.name, record.contact_person, record.city, record.state, record.phone, record.email]
    .some((value) => (value ?? '').toLowerCase().includes(q))
}

export function formatSupplierLocation(record: Pick<SupplierRecord, 'city' | 'state'>): string {
  const value = [record.city, record.state].filter(Boolean).join(', ')
  return value.length ? value : '—'
}
