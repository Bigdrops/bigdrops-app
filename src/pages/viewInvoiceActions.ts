import { supabase } from '@/supabase'
import { buildInvoiceCsv, downloadInvoiceCsv } from '@/components/invoice/exportInvoiceCsv'
import { voidInvoicePayment as voidPayment, refreshInvoicePaymentState } from '@/modules/invoices/services/paymentService'
import { fetchInvoiceIdForPayment } from '@/modules/invoices/repositories/paymentRepository'
import {
  buildAdvanceParentInvoiceMetadata,
} from '@/domain/invoice/advanceChildFlow'
import {
  clearAdvanceInvoiceMetadata,
  getAdvanceInvoiceMetadata,
  mergeAdvanceInvoiceMetadata,
} from '@/domain/invoice/advanceMetadata'
import { getNextQuotationNumber } from '@/domain/quotation'
import { parseDocumentCustomFields, toQuotationItemRow, withSourceTrail, buildTrailLink } from '@/domain/documentConversion'

const ADVANCE_AUDIT_TRACKED_FIELDS = [
  'mode',
  'input_value',
  'suffix',
  'primary_label',
  'secondary_label',
  'amount',
  'document_number',
]

function getSafeAdvanceDeleteMessage(error: any, fallback = 'Could not delete advance invoice') {
  const message = typeof error?.message === 'string' ? error.message.trim() : ''
  return message || fallback
}

async function recordAdvanceCreated({
  parentInvoiceId,
  parentInvoiceNumber,
  advanceMetadata,
}: {
  parentInvoiceId: string
  parentInvoiceNumber: string | null
  advanceMetadata: Record<string, any>
}) {
  const { recordAuditLog } = await import('@/lib/audit')
  try {
    await recordAuditLog({
      entityType: 'invoice',
      recordId: parentInvoiceId,
      entityLabel: parentInvoiceNumber ?? undefined,
      action: 'CREATE',
      oldData: null,
      newData: {
        mode: advanceMetadata.mode,
        input_value: advanceMetadata.input_value,
        suffix: advanceMetadata.suffix,
        primary_label: advanceMetadata.primary_label,
        secondary_label: advanceMetadata.secondary_label,
        document_number: advanceMetadata.document_number,
        amount: advanceMetadata.amount,
      },
      trackedFields: ADVANCE_AUDIT_TRACKED_FIELDS,
      reason: 'Advance invoice metadata created on parent invoice',
    })
  } catch (auditErr) {
    console.error('Advance create audit failed:', auditErr)
  }
}

async function recordAdvanceUpdated({
  parentInvoiceId,
  parentInvoiceNumber,
  oldMetadata,
  newMetadata,
}: {
  parentInvoiceId: string
  parentInvoiceNumber: string | null
  oldMetadata: Record<string, any> | null
  newMetadata: Record<string, any>
}) {
  const { recordAuditLog } = await import('@/lib/audit')
  try {
    await recordAuditLog({
      entityType: 'invoice',
      recordId: parentInvoiceId,
      entityLabel: parentInvoiceNumber ?? undefined,
      action: 'UPDATE',
      oldData: oldMetadata,
      newData: {
        mode: newMetadata.mode,
        input_value: newMetadata.input_value,
        suffix: newMetadata.suffix,
        primary_label: newMetadata.primary_label,
        secondary_label: newMetadata.secondary_label,
        document_number: newMetadata.document_number,
        amount: newMetadata.amount,
      },
      trackedFields: ADVANCE_AUDIT_TRACKED_FIELDS,
      reason: 'Advance invoice metadata updated on parent invoice',
    })
  } catch (auditErr) {
    console.error('Advance update audit failed:', auditErr)
  }
}

async function recordAdvanceCleared({
  parentInvoiceId,
  parentInvoiceNumber,
  clearedMetadata,
}: {
  parentInvoiceId: string
  parentInvoiceNumber: string | null
  clearedMetadata: Record<string, any>
}) {
  const { recordAuditLog } = await import('@/lib/audit')
  try {
    await recordAuditLog({
      entityType: 'invoice',
      recordId: parentInvoiceId,
      entityLabel: parentInvoiceNumber ?? undefined,
      action: 'DELETE',
      oldData: {
        mode: clearedMetadata.mode,
        input_value: clearedMetadata.input_value,
        suffix: clearedMetadata.suffix,
        primary_label: clearedMetadata.primary_label,
        secondary_label: clearedMetadata.secondary_label,
        document_number: clearedMetadata.document_number,
        amount: clearedMetadata.amount,
      },
      newData: null,
      trackedFields: ADVANCE_AUDIT_TRACKED_FIELDS,
      reason: 'Advance invoice details removed from parent invoice metadata',
    })
  } catch (auditErr) {
    console.error('Advance clear audit failed:', auditErr)
  }
}

function buildAdvanceMetadataBackedRecord({
  parentInvoice,
  metadata,
}: {
  parentInvoice: any
  metadata: any
}) {
  return {
    ...parentInvoice,
    id: metadata.legacy_child_invoice_id || null,
    invoice_number: metadata.document_number || 'Advance Invoice',
    invoice_title: parentInvoice?.invoice_title || 'Advance Invoice',
    total: Number(metadata.amount || 0),
    status: metadata.status || 'unpaid',
    issue_date: metadata.issued_at || parentInvoice?.issue_date || null,
    due_date: metadata.due_at || parentInvoice?.due_date || null,
    custom_fields: mergeAdvanceInvoiceMetadata(parentInvoice?.custom_fields, metadata),
    _advanceMetadataOnly: true,
  }
}

async function saveParentAdvanceInvoiceConfig({
  parentInvoiceId,
  parentCustomFields,
  advanceMetadata,
}: {
  parentInvoiceId: string
  parentCustomFields: unknown
  advanceMetadata: any
}) {
  const nextCustomFields = mergeAdvanceInvoiceMetadata(parentCustomFields, advanceMetadata)

  const { error } = await supabase
    .from('invoices')
    .update({ custom_fields: JSON.stringify(nextCustomFields) })
    .eq('id', parentInvoiceId)

  if (error) {
    throw new Error(getSafeAdvanceDeleteMessage(error, 'Advance invoice was saved, but the parent invoice could not be updated.'))
  }
}

async function clearParentAdvanceInvoiceConfig({
  parentInvoiceId,
  parentCustomFields,
}: {
  parentInvoiceId: string
  parentCustomFields: unknown
}) {
  const nextCustomFields = clearAdvanceInvoiceMetadata(parentCustomFields)

  const { error } = await supabase
    .from('invoices')
    .update({ custom_fields: JSON.stringify(nextCustomFields) })
    .eq('id', parentInvoiceId)

  if (error) {
    throw new Error(getSafeAdvanceDeleteMessage(error, 'Advance invoice could not be removed from the parent invoice.'))
  }
}

export function downloadInvoiceCsvFile({
  invoice,
  items,
  invoiceTotal,
}: {
  invoice: any
  items: any[]
  invoiceTotal: number
}) {
  const csv = buildInvoiceCsv({
    invoice,
    items,
    totals: {
      rawSubtotal: Number(invoice.subtotal || 0),
      installRateTotal: Number(invoice.install_rate_total || 0),
      vatAmount: Number(invoice.vat || 0),
      discountAmount: Number(invoice.discount || 0),
      whtAmount: Number(invoice.wht || 0),
      totalPayable: invoiceTotal,
    },
  })
  downloadInvoiceCsv(`${invoice.invoice_number || 'invoice'}.csv`, csv)
}

export async function duplicateInvoiceDraft({
  invoice,
  items,
}: {
  invoice: any
  items: any[]
}) {
  const { data: all } = await supabase.from('invoices').select('invoice_number').like('invoice_number', 'SASINV-B%').order('created_at', { ascending: false })
  let nextNum = 1
  if (all && all.length > 0) {
    const nums = all
      .map((entry: any) => parseInt(String(entry.invoice_number || '').replace('SASINV-B', ''), 10))
      .filter((value: number) => !Number.isNaN(value))
    nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1
  }
  return {
    prefill: {
      ...invoice,
      invoice_number: `SASINV-B${String(nextNum).padStart(3, '0')}`,
      client_id: null,
      client_name: '',
      project_id: null,
      status: 'unpaid',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: null,
    },
    prefillItems: items.map((item) => ({ ...item, id: null })),
  }
}

export function buildWaybillPrefill(invoice: any) {
  return {
    sourceInvoice: {
      invoiceId: invoice?.id,
      invoiceNumber: invoice?.invoice_number || '',
      clientId: invoice?.client_id || '',
      clientName: invoice?.client_name || '',
      poNumber: String(invoice?.po_number || ''),
    },
  }
}

export async function archiveInvoiceRecord(id: string) {
  const { error } = await supabase.from('invoices').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteInvoiceRecord(id: string) {
  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) throw error
}

export async function createAdvanceInvoiceRecord({
  parentInvoice,
  mode,
  inputValue,
  suffix,
  primaryLabel,
  secondaryLabel,
}: {
  parentInvoice: any
  mode: 'percent' | 'fixed'
  inputValue: number | string
  suffix: string | undefined
  primaryLabel: string
  secondaryLabel: string
}) {
  const existingMetadata = getAdvanceInvoiceMetadata(parentInvoice)
  const metadata = buildAdvanceParentInvoiceMetadata({
    parentInvoice,
    mode,
    inputValue,
    suffix,
    primaryLabel,
    secondaryLabel,
    legacyChildInvoiceId: existingMetadata?.legacy_child_invoice_id,
    legacyChildInvoiceNumber: existingMetadata?.legacy_child_invoice_number,
    legacyChildInvoiceTotal: existingMetadata?.legacy_child_invoice_total,
    issuedAt: existingMetadata?.issued_at,
    dueAt: existingMetadata?.due_at,
    status: existingMetadata?.status,
    printSnapshot: existingMetadata?.print_snapshot,
  })

await saveParentAdvanceInvoiceConfig({
    parentInvoiceId: String(parentInvoice.id),
    parentCustomFields: parentInvoice.custom_fields,
    advanceMetadata: metadata,
  })

  if (existingMetadata) {
    await recordAdvanceUpdated({
      parentInvoiceId: String(parentInvoice.id),
      parentInvoiceNumber: parentInvoice.invoice_number,
      oldMetadata: existingMetadata,
      newMetadata: metadata,
    })
  } else {
    await recordAdvanceCreated({
      parentInvoiceId: String(parentInvoice.id),
      parentInvoiceNumber: parentInvoice.invoice_number,
      advanceMetadata: metadata,
    })
  }

  return {
    invoice: buildAdvanceMetadataBackedRecord({
      parentInvoice,
      metadata,
    }),
    created: !existingMetadata,
  }
}

export async function updateAdvanceInvoiceRecord({
  advanceInvoiceId,
  parentInvoice,
  mode,
  inputValue,
  suffix,
  primaryLabel,
  secondaryLabel,
}: {
  advanceInvoiceId?: string | null
  parentInvoice: any
  mode: 'percent' | 'fixed'
  inputValue: number | string
  suffix: string | undefined
  primaryLabel: string
  secondaryLabel: string
  threadPosition?: number
}) {
  const existingMetadata = getAdvanceInvoiceMetadata(parentInvoice)
  const metadata = buildAdvanceParentInvoiceMetadata({
    parentInvoice,
    mode,
    inputValue,
    suffix,
    primaryLabel,
    secondaryLabel,
    legacyChildInvoiceId: existingMetadata?.legacy_child_invoice_id || advanceInvoiceId,
    legacyChildInvoiceNumber: existingMetadata?.legacy_child_invoice_number,
    legacyChildInvoiceTotal: existingMetadata?.legacy_child_invoice_total,
    issuedAt: existingMetadata?.issued_at,
    dueAt: existingMetadata?.due_at,
    status: existingMetadata?.status,
    printSnapshot: existingMetadata?.print_snapshot,
  })

await saveParentAdvanceInvoiceConfig({
    parentInvoiceId: String(parentInvoice.id),
    parentCustomFields: parentInvoice.custom_fields,
    advanceMetadata: metadata,
  })

  await recordAdvanceUpdated({
    parentInvoiceId: String(parentInvoice.id),
    parentInvoiceNumber: parentInvoice.invoice_number,
    oldMetadata: existingMetadata,
    newMetadata: metadata,
  })

  return buildAdvanceMetadataBackedRecord({
    parentInvoice,
    metadata,
  })
}

export async function deleteAdvanceInvoiceRecord({
  parentInvoiceId,
  parentInvoiceNumber,
  parentCustomFields,
}: {
  advanceInvoiceId?: string
  parentInvoiceId: string
  parentInvoiceNumber?: string | null
  parentCustomFields: unknown
}) {
  const existingMetadata = getAdvanceInvoiceMetadata(parentCustomFields as any)

  await clearParentAdvanceInvoiceConfig({
    parentInvoiceId,
    parentCustomFields,
  })

  if (existingMetadata) {
    await recordAdvanceCleared({
      parentInvoiceId,
      parentInvoiceNumber: parentInvoiceNumber ?? null,
      clearedMetadata: existingMetadata,
    })
  }

  return {
    status: 'cleared' as const,
    message: 'Advance invoice metadata cleared from the parent invoice.',
  }
}

export async function revertInvoiceToQuotation({
  invoice,
  items,
  customFields,
}: {
  invoice: any
  items: any[]
  customFields: any
}) {
  const [{ data: quotationRows }, { data: latestInvoice }] = await Promise.all([
    supabase.from('quotations').select('quotation_number'),
    supabase.from('invoices').select('custom_fields').eq('id', invoice.id).single(),
  ])
  const nextQuotationNumber = getNextQuotationNumber((quotationRows || []) as Array<{ quotation_number?: string | null }>)
  const sourceInvoiceFields = parseDocumentCustomFields(latestInvoice?.custom_fields || customFields)
  const quotationPayload = {
    quotation_number: nextQuotationNumber,
    po_number: invoice.po_number || null,
    quotation_title: invoice.invoice_title || null,
    client_id: invoice.client_id || null,
    client_name: invoice.client_name || '',
    project_id: invoice.project_id || null,
    issue_date: invoice.issue_date || new Date().toISOString().split('T')[0],
    valid_until: invoice.due_date || null,
    status: 'open',
    notes: invoice.notes || '',
    terms: invoice.terms || '',
    workmanship: Number(invoice.workmanship || 0),
    transportation: Number(invoice.transportation || 0),
    shipping: Number(invoice.shipping || 0),
    discount: Number(invoice.discount || 0),
    vat: Number(invoice.vat || 0),
    wht: Number(invoice.wht || 0),
    subtotal: Number(invoice.subtotal || 0),
    install_rate_total: Number(invoice.install_rate_total || 0),
    total: Number(invoice.total || 0),
    amount_in_words: invoice.amount_in_words || '',
    custom_fields: JSON.stringify(
      withSourceTrail(
        {
          ...sourceInvoiceFields,
          quotationTitle: invoice.invoice_title || '',
          clientName: invoice.client_name || '',
          notesHtml: invoice.notes || '',
          termsHtml: invoice.terms || '',
        },
        buildTrailLink({
          id: invoice.id,
          type: 'invoice',
          number: invoice.invoice_number,
          project_id: invoice.project_id || null,
          po_number: invoice.po_number || null,
        }),
      ),
    ),
  }
  const itemRows = items
    .filter((item) => (item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim()))
    .map((item, index) => toQuotationItemRow(item, '' as any, index))

  const { data: createdQuotation, error } = await supabase.rpc('revert_invoice_to_quotation_transaction', {
    p_invoice_id: invoice.id,
    p_quotation_payload: quotationPayload,
    p_quotation_items_payload: itemRows,
  })

  if (error || !createdQuotation) throw new Error(error?.message || 'Failed to revert invoice')
  return createdQuotation
}

export async function voidInvoicePayment({ paymentId, reason }: { paymentId: string; reason: string }) {
  const invoiceId = await fetchInvoiceIdForPayment(paymentId)
  if (!invoiceId) {
    throw new Error('Could not find invoice for payment')
  }

  const result = await voidPayment({
    paymentId,
    invoiceId,
    reason,
  })

  if (!result.success) {
    throw new Error(result.error || 'Failed to void payment')
  }

  return result
}

export const syncInvoiceStatusFromFinancials = refreshInvoicePaymentState
