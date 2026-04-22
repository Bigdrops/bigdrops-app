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
  'custom_fields', // Included to catch linked_quote_id/linked_csr_id via parsing if needed, but the prompt asked for specific names.
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

function pick(obj: any, fields: string[]) {
  if (!obj) return null
  const result: any = {}
  fields.forEach((f) => {
    if (f in obj) result[f] = obj[f]
  })
  return result
}

async function getActor() {
  const { data: { user } } = await supabase.auth.getUser()
  return {
    id: user?.id || null,
    label: user?.email || 'web',
  }
}

export async function recordAuditLog({
  tableName,
  recordId,
  operation,
  oldData,
  newData,
  trackedFields,
}: {
  tableName: string
  recordId: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  oldData?: any
  newData?: any
  trackedFields: string[]
}) {
  const actor = await getActor()
  const p_old_data = oldData ? pick(oldData, trackedFields) : null
  const p_new_data = newData ? pick(newData, trackedFields) : null

  return supabase.rpc('record_audit_log', {
    p_table_name: tableName,
    p_record_id: recordId,
    p_operation: operation,
    p_old_data,
    p_new_data,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
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

export async function recordInvoiceStatusChanged(invoiceId: string, oldStatus: string, newStatus: string) {
  const actor = await getActor()
  return supabase.rpc('record_invoice_status_changed', {
    p_invoice_id: invoiceId,
    p_old_status: oldStatus,
    p_new_status: newStatus,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
  })
}

export async function recordPaymentRecorded(invoiceId: string, paymentId: string, amount: number) {
  const actor = await getActor()
  return supabase.rpc('record_payment_recorded', {
    p_invoice_id: invoiceId,
    p_payment_id: paymentId,
    p_amount: amount,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
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

export async function recordQuotationStatusChanged(quotationId: string, oldStatus: string, newStatus: string) {
  const actor = await getActor()
  return supabase.rpc('record_quotation_status_changed', {
    p_quotation_id: quotationId,
    p_old_status: oldStatus,
    p_new_status: newStatus,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
  })
}

export async function recordQuotationLinked(quotationId: string, invoiceId: string) {
  const actor = await getActor()
  return supabase.rpc('record_quotation_linked', {
    p_quotation_id: quotationId,
    p_invoice_id: invoiceId,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
  })
}

export async function recordProjectUpdated(projectId: string) {
  const actor = await getActor()
  return supabase.rpc('record_project_updated', {
    p_project_id: projectId,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
  })
}

export async function recordProjectNoteAdded(projectId: string, note: string) {
  const actor = await getActor()
  return supabase.rpc('record_project_note_added', {
    p_project_id: projectId,
    p_note: note,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
  })
}

export async function recordProjectDocumentAdded(projectId: string, documentId: string, docType: string) {
  const actor = await getActor()
  return supabase.rpc('record_project_document_added', {
    p_project_id: projectId,
    p_document_id: documentId,
    p_document_type: docType,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
  })
}

export async function recordProjectLinkedActivity(projectId: string, docId: string, docType: 'invoice' | 'quotation' | 'csr' | 'waybill') {
  const actor = await getActor()
  return supabase.rpc('record_project_linked_activity', {
    p_project_id: projectId,
    p_document_id: docId,
    p_document_type: docType,
    p_actor_id: actor.id,
    p_actor_label: actor.label,
    p_source: 'web',
  })
}
