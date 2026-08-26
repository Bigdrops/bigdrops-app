import type { TenantClient } from "@/lib/tenantClient"
import type { DuplicateInvoicePrefill } from "../types/invoiceTypes"
import { syncInvoiceStatusFromFinancials as repositorySyncStatus } from "../repositories/paymentRepository"
import { attachChildDocument } from "./invoiceChildDocService"

export interface ChangeInvoiceStatusInput {
  invoiceId: string
  oldStatus: string
  newStatus: string
}

export interface ChangeInvoiceStatusResult {
  success: boolean
  status?: string
  error?: string
}

export async function archiveInvoice(invoiceId: string, tenantClient: TenantClient): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: previousInvoice } = await tenantClient
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle()

    const { error } = await tenantClient
      .from("invoices")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", invoiceId)

    if (error) {
      return { success: false, error: error.message }
    }

    try {
      const { recordAuditLog, INVOICE_TRACKED_FIELDS } = await import("@/lib/audit")
      const { data: updatedInvoice } = await tenantClient
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .maybeSingle()

      await recordAuditLog(tenantClient, {
        entityType: "invoice",
        recordId: invoiceId,
        entityLabel: updatedInvoice?.invoice_number ?? null,
        action: "ARCHIVE",
        oldData: previousInvoice,
        newData: updatedInvoice,
        trackedFields: INVOICE_TRACKED_FIELDS,
      })
    } catch (auditErr) {
      console.error("Audit trail failed:", auditErr)
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// Phase 3: deletion is a composite operation (invoice + items) and MUST be
// atomic — routed through the transactional RPC when the entity id is
// available. Legacy fallback (sequential tenant deletes) is retained only for
// pre-cutover callers that cannot supply an entity id.
export async function deleteInvoice(
  invoiceId: string,
  tenantClient: TenantClient,
  entityId?: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (entityId) {
      const { error } = await tenantClient.rpc("delete_invoice_with_items_transaction", {
        p_entity_id: entityId,
        p_invoice_id: invoiceId,
      })
      if (error) {
        return { success: false, error: error.message }
      }
      return { success: true }
    }

    const { data: invoice } = await tenantClient
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle()

    await tenantClient.from("invoice_items").delete().eq("invoice_id", invoiceId)

    const { error } = await tenantClient
      .from("invoices")
      .delete()
      .eq("id", invoiceId)

    if (error) {
      return { success: false, error: error.message }
    }

    try {
      const { recordAuditLog, INVOICE_TRACKED_FIELDS } = await import("@/lib/audit")
      await recordAuditLog(tenantClient, {
        entityType: "invoice",
        recordId: invoiceId,
        entityLabel: invoice?.invoice_number ?? null,
        action: "DELETE",
        oldData: invoice,
        trackedFields: INVOICE_TRACKED_FIELDS,
      })
    } catch (auditErr) {
      console.error("Audit trail failed:", auditErr)
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function changeInvoiceStatus({
  invoiceId,
  oldStatus,
  newStatus,
  tenantClient,
}: ChangeInvoiceStatusInput & { tenantClient: TenantClient }): Promise<ChangeInvoiceStatusResult> {
  if (newStatus === oldStatus) {
    return { success: true, status: newStatus }
  }

  try {
    const { data: previousInvoice } = await tenantClient
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single()

    const { error } = await tenantClient
      .from("invoices")
      .update({ status: newStatus })
      .eq("id", invoiceId)

    if (error) {
      return { success: false, error: error.message }
    }

    try {
      const { recordInvoiceStatusChanged, recordAuditLog } = await import("@/lib/audit")
      const { data: updatedInvoice } = await tenantClient
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single()

      await recordInvoiceStatusChanged(tenantClient, invoiceId, oldStatus, newStatus)
      await recordAuditLog(tenantClient, {
        entityType: "invoice",
        recordId: invoiceId,
        entityLabel: updatedInvoice?.invoice_number || null,
        action: "STATUS_CHANGE",
        oldData: previousInvoice,
        newData: updatedInvoice,
        trackedFields: (await import("@/lib/audit")).INVOICE_TRACKED_FIELDS,
      })
    } catch (auditErr) {
      console.error("Audit trail failed:", auditErr)
    }

    return { success: true, status: newStatus }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function syncAndGetInvoiceStatus(invoiceId: string, tenantClient: TenantClient): Promise<ChangeInvoiceStatusResult> {
  try {
    const result = await repositorySyncStatus(invoiceId, tenantClient)
    return { success: true, status: result }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function attachExistingDocument({
  invoiceId,
  childId,
  kind,
  tenantClient,
}: {
  invoiceId: string
  childId: string
  kind: "csr" | "waybill"
  tenantClient: TenantClient
}): Promise<{ success: boolean; error?: string }> {
  try {
    await attachChildDocument({ invoiceId, childId, kind, tenantClient })
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export interface DuplicateInvoiceInput {
  invoice: any
  items: any[]
}

export async function duplicateInvoice(
  { invoice, items }: DuplicateInvoiceInput,
  tenantClient: TenantClient,
): Promise<DuplicateInvoicePrefill> {
  const { data: all } = await tenantClient
    .from("invoices")
    .select("invoice_number")
    .like("invoice_number", "SASINV-B%")
    .order("created_at", { ascending: false })

  let nextNum = 1
  if (all && all.length > 0) {
    const nums = all
      .map((entry: any) =>
        parseInt(String(entry.invoice_number || "").replace("SASINV-B", ""), 10)
      )
      .filter((value: number) => !Number.isNaN(value))
    nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1
  }

  const clonedInvoice = JSON.parse(JSON.stringify(invoice))

  let parsedCustomFields: any = {}
  try {
    parsedCustomFields = typeof clonedInvoice.custom_fields === 'string'
      ? JSON.parse(clonedInvoice.custom_fields || '{}')
      : (clonedInvoice.custom_fields || {})
  } catch (e) {
    // Keep empty object if parse fails
  }

  // ponytail: clear lineage — Law 2 requires no trace of source document
  delete parsedCustomFields.conversionTrail

  const vatRate = parsedCustomFields?.calculationInputs?.vatPercent 
    ?? parsedCustomFields?.calculationInputs?.vatRate
    ?? parsedCustomFields?.vatPercent
    ?? parsedCustomFields?.vatRate
    ?? 7.5

  const discountRate = parsedCustomFields?.calculationInputs?.discountValue 
    ?? parsedCustomFields?.discountValue 
    ?? 0
    
  const whtRate = parsedCustomFields?.calculationInputs?.whtValue 
    ?? parsedCustomFields?.whtValue 
    ?? 0

  return {
    prefill: {
      ...clonedInvoice,
      invoice_number: `SASINV-B${String(nextNum).padStart(3, "0")}`,
      client_id: null,
      client_name: "",
      project_id: null,
      status: "unpaid",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: null,
      vat: vatRate,
      discount: discountRate,
      wht: whtRate,
      subtotal: 0,
      total: 0,
      install_rate_total: 0,
      amount_in_words: "",
      custom_fields: JSON.stringify(parsedCustomFields),
    },
    prefillItems: items.map((item) => {
      const clonedItem = JSON.parse(JSON.stringify(item))
      return { ...clonedItem, id: null }
    }),
  }
}
