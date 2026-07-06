import { supabase } from '@/supabase'

export const INVOICE_TRACKED_FIELDS = [
  'invoice_number',
  'client_id',
  'client_name',
  'project_id',
  'issue_date',
  'due_date',
  'status',
  'subtotal',
  'vat',
  'wht',
  'discount',
  'total',
  'po_number',
  'notes',
  'linked_quote_id',
  'linked_csr_id',
]

export const QUOTATION_TRACKED_FIELDS = [
  'quotation_number',
  'client_id',
  'client_name',
  'project_id',
  'issue_date',
  'valid_until',
  'status',
  'subtotal',
  'vat',
  'wht',
  'discount',
  'total',
  'po_number',
  'notes',
]

export const PROJECT_TRACKED_FIELDS = [
  'project_code',
  'name',
  'client_id',
  'client_name',
  'status',
  'start_date',
  'project_value',
  'po_number',
  'notes',
  'location',
]

export const CSR_TRACKED_FIELDS = [
  'csr_number',
  'client_id',
  'client_name',
  'equipment_type',
  'make',
  'status',
  'linked_invoice_id',
  'project_id',
  'date',
  'start_date',
  'end_date',
  'po_number',
]

export const WAYBILL_TRACKED_FIELDS = [
  'waybill_number',
  'type',
  'status',
  'client_id',
  'client_name',
  'project_id',
  'invoice_id',
  'purpose',
  'sender_name',
  'receiver_name',
  'date',
  'delivery_location',
  'vehicle_plate',
]

type AuditEntityType = 'invoice' | 'quotation' | 'project' | 'csr' | 'waybill'
type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'ARCHIVE' | 'STATUS_CHANGE' | 'LINK' | 'UNLINK'

function pick(obj: Record<string, any> | null | undefined, fields: string[]) {
  if (!obj) return null
  const result: Record<string, any> = {}
  for (const field of fields) {
    if (field in obj) result[field] = obj[field]
  }
  return result
}

function isSamePayload(
  left: Record<string, any> | null | undefined,
  right: Record<string, any> | null | undefined,
) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
}

let _actorCache: { sessionKey: string; actor: { id: string | null; label: string } } | null = null

async function getActor() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const sessionKey = session?.access_token ?? ''
  if (_actorCache && _actorCache.sessionKey === sessionKey) {
    return _actorCache.actor
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const actor = { id: user?.id ?? null, label: user?.email ?? 'web' }
  _actorCache = { sessionKey, actor }
  return actor
}

export async function recordAuditLog({
  entityType,
  recordId,
  entityLabel,
  action,
  oldData,
  newData,
  trackedFields,
  reason,
}: {
  entityType: AuditEntityType
  recordId: string
  entityLabel?: string | null
  action: AuditAction
  oldData?: Record<string, any> | null
  newData?: Record<string, any> | null
  trackedFields: string[]
  reason?: string | null
}) {
  const actor = await getActor()

  const p_old_data = oldData ? pick(oldData, trackedFields) : null
  const p_new_data = newData ? pick(newData, trackedFields) : null

  if (
    action !== 'CREATE' &&
    action !== 'DELETE' &&
    action !== 'ARCHIVE' &&
    isSamePayload(p_old_data, p_new_data)
  ) {
    return { data: null, error: null }
  }

  return supabase.rpc('record_audit_log', {
    p_entity_type: entityType,
    p_entity_id: recordId,
    p_entity_label: entityLabel ?? null,
    p_action: action,
    p_old_data,
    p_new_data,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
    p_scope_type: 'app',
    p_reason: reason ?? null,
  })
}

export async function recordInvoiceCreated(invoiceId: string) {
  const actor = await getActor()
  return supabase.rpc('record_invoice_created', {
    p_invoice_id: invoiceId,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
  })
}

export async function recordInvoiceStatusChanged(invoiceId: string, oldStatus: string | null, newStatus: string | null, reason?: string | null) {
  const actor = await getActor()
  return supabase.rpc('record_invoice_status_changed', {
    p_invoice_id: invoiceId,
    p_old_status: oldStatus,
    p_new_status: newStatus,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
    p_reason: reason ?? null,
  })
}

export interface PaymentRecordedParams {
  payment_mode?: string
  account_paid_to?: string
  running_balance_after?: number
  wht_amount?: number
}

export async function recordPaymentRecorded(
  invoiceId: string,
  amount: number,
  reason?: string | null,
  extra?: PaymentRecordedParams,
) {
  const actor = await getActor()

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('invoice_number, status, total, scope_type')
    .eq('id', invoiceId)
    .single()

  if (error || !invoice) {
    throw new Error('Invoice not found: ' + invoiceId)
  }

  return supabase.rpc('record_activity_event', {
    p_entity_type: 'invoice',
    p_entity_id: invoiceId,
    p_event_type: 'PAYMENT_RECORDED',
    p_entity_label: invoice.invoice_number,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
    p_scope_type: invoice.scope_type ?? 'app',
    p_metadata: {
      amount,
      status: invoice.status,
      total: invoice.total,
      payment_mode: extra?.payment_mode ?? null,
      account_paid_to: extra?.account_paid_to ?? null,
      running_balance_after: extra?.running_balance_after ?? null,
      wht_amount: extra?.wht_amount ?? null,
    },
    p_reason: reason ?? null,
    p_dedupe_seconds: 15,
  })
}

export async function recordPaymentAttachmentUploaded(
  paymentId: string,
  invoiceId: string,
  fileName: string | null,
  fileSize: number | null,
) {
  const actor = await getActor()
  return supabase.rpc('record_payment_attachment_uploaded', {
    p_payment_id: paymentId,
    p_invoice_id: invoiceId,
    p_file_name: fileName,
    p_file_size: fileSize,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
  })
}

export async function recordPaymentVoided(paymentId: string, invoiceId: string, amount: number, reason?: string | null) {
  const actor = await getActor()
  return supabase.rpc('record_payment_voided', {
    p_payment_id: paymentId,
    p_invoice_id: invoiceId,
    p_amount: amount,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
    p_reason: reason ?? null,
  })
}

export async function recordQuotationCreated(quotationId: string) {
  const actor = await getActor()
  return supabase.rpc('record_quotation_created', {
    p_quotation_id: quotationId,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
  })
}

export async function recordQuotationStatusChanged(quotationId: string, oldStatus: string | null, newStatus: string | null, reason?: string | null) {
  const actor = await getActor()
  return supabase.rpc('record_quotation_status_changed', {
    p_quotation_id: quotationId,
    p_old_status: oldStatus,
    p_new_status: newStatus,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
    p_reason: reason ?? null,
  })
}

export async function recordQuotationLinked(
  quotationId: string,
  invoiceId?: string | null,
  projectId?: string | null,
  reason?: string | null,
) {
  const actor = await getActor()
  return supabase.rpc('record_quotation_linked', {
    p_quotation_id: quotationId,
    p_invoice_id: invoiceId ?? null,
    p_project_id: projectId ?? null,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
    p_reason: reason ?? null,
  })
}

export async function recordProjectUpdated(projectId: string, reason?: string | null, metadata?: Record<string, any>) {
  const actor = await getActor()
  return supabase.rpc('record_project_updated', {
    p_project_id: projectId,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
    p_reason: reason ?? null,
    p_metadata: metadata ?? {},
  })
}

export async function recordProjectNoteAdded(projectId: string, note: string, reason?: string | null) {
  const actor = await getActor()
  return supabase.rpc('record_project_note_added', {
    p_project_id: projectId,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
    p_reason: reason ?? null,
    p_metadata: { note },
  })
}

export async function recordProjectDocumentAdded(projectId: string, documentId: string, docType: string, reason?: string | null) {
  const actor = await getActor()
  return supabase.rpc('record_project_document_added', {
    p_project_id: projectId,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
    p_reason: reason ?? null,
    p_metadata: {
      document_id: documentId,
      document_type: docType,
    },
  })
}

export async function recordProjectLinkedActivity(
  projectId: string,
  linkedEntityType: 'invoice' | 'quotation',
  linkedEntityId: string,
  linkedEntityLabel?: string | null,
  reason?: string | null,
) {
  const actor = await getActor()
  return supabase.rpc('record_project_linked_activity', {
    p_project_id: projectId,
    p_linked_entity_type: linkedEntityType,
    p_linked_entity_id: linkedEntityId,
    p_linked_entity_label: linkedEntityLabel ?? null,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
    p_reason: reason ?? null,
  })
}

// ───────────────────────────────────────────────────────────────
// TEMPORARY DIAGNOSTIC PATCH — CSR & WAYBILL AUDIT RPC VISIBILITY
// Date: 2026-07-06 | Author: Gu
// Purpose: Expose RPC return state and surface hidden Postgres errors
// Remove after CSR + Waybill audit logging is verified.
// ───────────────────────────────────────────────────────────────

export async function recordCsrCreated(csrId: string, csrNumber: string | null, reason?: string | null) {
  try {
    const actor = await getActor()
    const res = await supabase.rpc('record_csr_created', {
      p_csr_id: csrId,
      p_actor_id: actor.id,
      p_actor_label: actor.label,
      p_source: 'web',
      p_reason: reason ?? null,
    })
    console.log('[CSR AUDIT RPC RESULT]', {
      data: res.data,
      error: res.error,
    })
    return res
  } catch (err) {
    console.error('[CSR AUDIT RPC THROW]', err)
    throw err
  }
}

export async function recordCsrStatusChanged(csrId: string, oldStatus: string | null, newStatus: string | null, reason?: string | null) {
  const actor = await getActor()
  return supabase.rpc('record_csr_status_changed', {
    p_csr_id: csrId,
    p_old_status: oldStatus,
    p_new_status: newStatus,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
    p_reason: reason ?? null,
  })
}

export async function recordCsrLinked(csrId: string, invoiceId: string, reason?: string | null) {
  const actor = await getActor()
  return supabase.rpc('record_csr_linked', {
    p_csr_id: csrId,
    p_invoice_id: invoiceId,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
    p_reason: reason ?? null,
  })
}

export async function recordWaybillCreated(waybillId: string, reason?: string | null) {
  try {
    const actor = await getActor()
    const res = await supabase.rpc('record_waybill_created', {
      p_waybill_id: waybillId,
      p_actor_id: actor.id,
      p_actor_label: actor.label,
      p_source: 'web',
      p_reason: reason ?? null,
    })
    console.log('[WAYBILL AUDIT RPC RESULT]', {
      data: res.data,
      error: res.error,
    })
    return res
  } catch (err) {
    console.error('[WAYBILL AUDIT RPC THROW]', err)
    throw err
  }
}

export async function recordWaybillStatusChanged(waybillId: string, oldStatus: string | null, newStatus: string | null, reason?: string | null) {
  const actor = await getActor()
  return supabase.rpc('record_waybill_status_changed', {
    p_waybill_id: waybillId,
    p_old_status: oldStatus,
    p_new_status: newStatus,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
    p_reason: reason ?? null,
  })
}