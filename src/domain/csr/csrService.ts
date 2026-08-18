import { recordAuditLog, recordCsrCreated, recordCsrStatusChanged, recordCsrLinked, CSR_TRACKED_FIELDS } from '@/lib/audit'
import type { TenantClient } from '@/lib/tenantClient'

export type CsrRow = {
  id: string
  csr_number: string | null
  client_name: string | null
  equipment_type: string | null
  make: string | null
  date: string | null
  created_at: string
  status: string | null
  linked_invoice_id: string | null
  project_id: string | null
}

export type CreatedCsr = {
  id: string
  csr_number: string
}

// ── Retry helpers ──────────────────────────────────────────

const MAX_RETRIES = 3
const BASE_DELAY_MS = 750

function isNetworkTimeout(error: unknown): boolean {
  const name = String((error as { name?: string })?.name || '')
  const message = String((error as { message?: string })?.message || '')

  if (name === 'AbortError' || name === 'TimeoutError') return true

  return /failed to fetch|networkerror|network request failed|timed out|timeout/i.test(message)
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      console.error(`[csrService] ${label} attempt ${attempt} failed`, error)

      if (attempt < MAX_RETRIES && isNetworkTimeout(error)) {
        const waitMs = BASE_DELAY_MS * Math.pow(2, attempt - 1)
        console.warn(`[csrService] Retrying in ${waitMs}ms…`)
        await delay(waitMs)
        continue
      }

      throw error
    }
  }

  throw lastError
}

// ── Schema-safe columns ────────────────────────────────────
const CSR_TABLE_COLUMNS = new Set([
  'id', 'csr_number', 'date', 'client_id', 'client_name', 'address',
  'problem_reported', 'equipment_type', 'equipment_location', 'make',
  'model', 'serial_no', 'engine_no', 'capacity', 'voltage', 'frequency',
  'battery', 'temperature', 'pressure', 'hours', 'materials_used',
  'service_rendered', 'engineer_remarks', 'status', 'start_date', 'end_date',
  'customer_feedback', 'acknowledgement_name', 'linked_invoice_id',
  'created_at', 'start_time', 'end_time', 'po_number', 'show_po',
  'archived_at', 'project_id', 'defects_found', 'system_down',
  'technician_signatory_id', 'call_type', 'service_basis',
])

/**
 * Strip any fields that are not valid csrs table columns.
 * Prevents "column not found" errors from Supabase when
 * orphan form fields (e.g. recipient_signature_uri) leak
 * into the insert/update payload.
 */
export function sanitizeCsrInsertPayload<T extends Record<string, unknown>>(payload: T): T {
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (CSR_TABLE_COLUMNS.has(key) && value !== undefined) {
      sanitized[key] = value
    }
  }
  return sanitized as T
}

// ── Create / Update ────────────────────────────────────────

export async function createCsr(csrData: Record<string, unknown>, tenantClient: TenantClient): Promise<CreatedCsr> {
  const safeData = sanitizeCsrInsertPayload(csrData)

  // ── VERIFY: id must never appear in the INSERT payload ──
  const keys = Object.keys(safeData)
  const hasId = 'id' in safeData
  console.log('[createCsr] safeData keys:', keys)
  console.log('[createCsr] safeData has id:', hasId, '| id value:', hasId ? safeData.id : '(absent)')
  if (hasId) {
    console.error('[createCsr] BLOCKED: id property found in INSERT payload — this will cause a constraint violation')
  }

  const { data, error } = await withRetry(
    async () =>
      tenantClient
        .from('csrs')
        .insert([safeData])
        .select('id, csr_number')
        .single(),
    'createCsr',
  )

  if (error) {
    console.error('[csrService] createCsr supabase error', JSON.stringify(error, null, 2))
    throw error
  }

  if (!data) {
    const err = new Error('No data returned from CSR insert')
    console.error('[csrService] createCsr empty response', err)
    throw err
  }

  // Audit: fire-and-forget after successful create
  try {
    void recordAuditLog(tenantClient, {
      entityType: 'csr',
      recordId: data.id,
      entityLabel: data.csr_number,
      action: 'CREATE',
      oldData: null,
      newData: csrData,
      trackedFields: CSR_TRACKED_FIELDS,
    })
    void recordCsrCreated(tenantClient, data.id, data.csr_number)
  } catch { /* ponytail: audit failure must not break mutation */ }

  return data as CreatedCsr
}

export async function updateCsr(id: string, csrData: Record<string, unknown>, tenantClient: TenantClient): Promise<void> {
  // Fetch old status before update for audit
  let oldStatus: string | null = null
  try {
    const { data } = await tenantClient.from('csrs').select('status').eq('id', id).single()
    oldStatus = data?.status ?? null
  } catch { /* ponytail: best-effort old status */ }

  const safeData = sanitizeCsrInsertPayload(csrData)
  const { error } = await withRetry(
    async () =>
      tenantClient
        .from('csrs')
        .update(safeData)
        .eq('id', id),
    'updateCsr',
  )

  if (error) {
    console.error('[csrService] updateCsr supabase error', JSON.stringify(error, null, 2))
    throw error
  }

  // Audit: fire-and-forget after successful update
  try {
    void recordAuditLog(tenantClient, {
      entityType: 'csr',
      recordId: id,
      entityLabel: csrData.csr_number as string | null ?? null,
      action: 'UPDATE',
      oldData: null,
      newData: csrData,
      trackedFields: CSR_TRACKED_FIELDS,
    })
    const newStatus = (csrData.status as string | null) ?? null
    if (oldStatus !== newStatus) {
      void recordCsrStatusChanged(tenantClient, id, oldStatus, newStatus)
    }
  } catch { /* ponytail: audit failure must not break mutation */ }
}

export async function loadCsrsFromSupabase(tenantClient: TenantClient): Promise<CsrRow[]> {
  const { data, error } = await tenantClient
    .from("csrs")
    .select("*")
    .is('archived_at', null)
    .order("date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return (data as CsrRow[]) || []
}

export async function archiveCsr(id: string, tenantClient: TenantClient) {
  const { error } = await tenantClient
    .from('csrs')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw error
  }
}

export async function deleteCsr(id: string, tenantClient: TenantClient) {
  const { error } = await tenantClient
    .from("csrs")
    .delete()
    .eq("id", id)

  if (error) {
    throw error
  }
}

export async function attachInvoiceToCsr(csrId: string, invoiceId: string, tenantClient: TenantClient) {
  const { error } = await tenantClient
    .from("csrs")
    .update({ linked_invoice_id: invoiceId })
    .eq("id", csrId)

  if (error) {
    throw error
  }

  const { data, error: fetchError } = await tenantClient
    .from("csrs")
    .select("*")
    .eq("id", csrId)
    .single()

  if (fetchError) {
    throw fetchError
  }

  // Audit: fire-and-forget after successful link
  try {
    void recordAuditLog(tenantClient, {
      entityType: 'csr',
      recordId: csrId,
      entityLabel: data.csr_number,
      action: 'LINK',
      oldData: null,
      newData: { linked_invoice_id: invoiceId },
      trackedFields: CSR_TRACKED_FIELDS,
    })
    void recordCsrLinked(tenantClient, csrId, invoiceId)
  } catch { /* ponytail: audit failure must not break mutation */ }

  return data as CsrRow
}
