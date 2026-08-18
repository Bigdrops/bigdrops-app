import type { TenantClient } from '@/lib/tenantClient'
import { buildInvoiceCsv, downloadInvoiceCsv } from '@/components/invoice/exportInvoiceCsv'
import { computeDocument } from '@/lib/Calculations'
import { parseCustomFields, BUILTIN_COLUMNS } from '@/domain/invoice'
import { voidInvoicePayment as voidPaymentService } from '@/modules/invoices/services/paymentService'
import { fetchInvoiceIdForPayment } from '@/modules/invoices/repositories/paymentRepository'
import {
  buildAdvanceParentInvoiceMetadata,
} from '@/domain/invoice/advanceChildFlow'
import {
  clearAdvanceInvoiceMetadata,
  getAdvanceInvoiceMetadata,
  mergeAdvanceInvoiceMetadata,
} from '@/domain/invoice/advanceMetadata'

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
  tenantClient,
}: {
  parentInvoiceId: string
  parentInvoiceNumber: string | null
  advanceMetadata: Record<string, any>
  tenantClient: TenantClient
}) {
  const { recordAuditLog } = await import('@/lib/audit')
  try {
    await recordAuditLog(tenantClient, {
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
  tenantClient,
}: {
  parentInvoiceId: string
  parentInvoiceNumber: string | null
  oldMetadata: Record<string, any> | null
  newMetadata: Record<string, any>
  tenantClient: TenantClient
}) {
  const { recordAuditLog } = await import('@/lib/audit')
  try {
    await recordAuditLog(tenantClient, {
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
  tenantClient,
}: {
  parentInvoiceId: string
  parentInvoiceNumber: string | null
  clearedMetadata: Record<string, any>
  tenantClient: TenantClient
}) {
  const { recordAuditLog } = await import('@/lib/audit')
  try {
    await recordAuditLog(tenantClient, {
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

// Phase 3: parent invoice custom_fields live in the tenant schema (aggregate).
async function saveParentAdvanceInvoiceConfig({
  parentInvoiceId,
  parentCustomFields,
  advanceMetadata,
  tenantClient,
}: {
  parentInvoiceId: string
  parentCustomFields: unknown
  advanceMetadata: any
  tenantClient: TenantClient
}) {
  const nextCustomFields = mergeAdvanceInvoiceMetadata(parentCustomFields, advanceMetadata)

  const { error } = await tenantClient
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
  tenantClient,
}: {
  parentInvoiceId: string
  parentCustomFields: unknown
  tenantClient: TenantClient
}) {
  const nextCustomFields = clearAdvanceInvoiceMetadata(parentCustomFields)

  const { error } = await tenantClient
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
  const customFields = parseCustomFields(invoice?.custom_fields)
  const columns = Array.isArray(customFields?.columnConfig)
    ? customFields.columnConfig
    : BUILTIN_COLUMNS

  // Recompute the full financial breakdown from the canonical calculation
  // engine (same source as the View page and PDF export). Persisted columns
  // can be stale (imported/legacy documents), so they are never trusted here.
  const documentTotals = computeDocument({
    items: Array.isArray(items) ? items : [],
    document: invoice || {},
    cf: customFields || {},
    columns,
  })

  const csv = buildInvoiceCsv({
    invoice,
    items,
    totals: {
      subtotal: documentTotals.subtotal,
      installRateTotal: documentTotals.installRateTotal,
      vat: documentTotals.vat,
      discount: documentTotals.discount,
      wht: documentTotals.wht,
      grandTotal: documentTotals.grandTotal,
      totalPayable: documentTotals.totalPayable ?? invoiceTotal,
    },
    customFields,
  })
  downloadInvoiceCsv(`${invoice.invoice_number || 'invoice'}.csv`, csv)
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

export async function voidInvoicePayment({ paymentId, reason }: { paymentId: string; reason: string }, tenantClient: TenantClient) {
  const invoiceId = await fetchInvoiceIdForPayment(paymentId, tenantClient)
  if (!invoiceId) {
    throw new Error('Could not find invoice for payment')
  }

  const result = await voidPaymentService({ paymentId, invoiceId, reason }, tenantClient)
  if (!result.success) {
    throw new Error(result.error || 'Failed to void payment')
  }
  return result
}

export async function createAdvanceInvoiceRecord(
  {
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
  },
  tenantClient: TenantClient,
) {
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
    tenantClient,
  })

  if (existingMetadata) {
    await recordAdvanceUpdated({
      parentInvoiceId: String(parentInvoice.id),
      parentInvoiceNumber: parentInvoice.invoice_number,
      oldMetadata: existingMetadata,
      newMetadata: metadata,
      tenantClient,
    })
  } else {
    await recordAdvanceCreated({
      parentInvoiceId: String(parentInvoice.id),
      parentInvoiceNumber: parentInvoice.invoice_number,
      advanceMetadata: metadata,
      tenantClient,
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

export async function updateAdvanceInvoiceRecord(
  {
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
  },
  tenantClient: TenantClient,
) {
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
    tenantClient,
  })

  await recordAdvanceUpdated({
    parentInvoiceId: String(parentInvoice.id),
    parentInvoiceNumber: parentInvoice.invoice_number,
    oldMetadata: existingMetadata,
    newMetadata: metadata,
    tenantClient,
  })

  return buildAdvanceMetadataBackedRecord({
    parentInvoice,
    metadata,
  })
}

export async function deleteAdvanceInvoiceRecord(
  {
    parentInvoiceId,
    parentInvoiceNumber,
    parentCustomFields,
  }: {
    parentInvoiceId: string
    parentInvoiceNumber?: string | null
    parentCustomFields: unknown
  },
  tenantClient: TenantClient,
) {
  const existingMetadata = getAdvanceInvoiceMetadata(parentCustomFields as any)

  await clearParentAdvanceInvoiceConfig({
    parentInvoiceId,
    parentCustomFields,
    tenantClient,
  })

  if (existingMetadata) {
    await recordAdvanceCleared({
      parentInvoiceId,
      parentInvoiceNumber: parentInvoiceNumber ?? null,
      clearedMetadata: existingMetadata,
      tenantClient,
    })
  }

  return {
    status: 'cleared' as const,
    message: 'Advance invoice metadata cleared from the parent invoice.',
  }
}