import { supabase } from "@/supabase"
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

export async function archiveInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("invoices")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", invoiceId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function deleteInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoiceId)

    if (error) {
      return { success: false, error: error.message }
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
}: ChangeInvoiceStatusInput): Promise<ChangeInvoiceStatusResult> {
  if (newStatus === oldStatus) {
    return { success: true, status: newStatus }
  }

  try {
    const { data: previousInvoice } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single()

    const { error } = await supabase
      .from("invoices")
      .update({ status: newStatus })
      .eq("id", invoiceId)

    if (error) {
      return { success: false, error: error.message }
    }

    try {
      const { recordInvoiceStatusChanged, recordAuditLog } = await import("@/lib/audit")
      const { data: updatedInvoice } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single()

      await recordInvoiceStatusChanged(invoiceId, oldStatus, newStatus)
      await recordAuditLog({
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

export async function syncAndGetInvoiceStatus(invoiceId: string): Promise<ChangeInvoiceStatusResult> {
  try {
    const result = await repositorySyncStatus(invoiceId)
    return { success: true, status: result }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function attachExistingDocument({
  invoiceId,
  childId,
  kind,
}: {
  invoiceId: string
  childId: string
  kind: "csr" | "waybill"
}): Promise<{ success: boolean; error?: string }> {
  try {
    await attachChildDocument({ invoiceId, childId, kind })
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export interface DuplicateInvoiceInput {
  invoice: any
  items: any[]
}

export async function duplicateInvoice({
  invoice,
  items,
}: DuplicateInvoiceInput): Promise<DuplicateInvoicePrefill> {
  const { data: all } = await supabase
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

  return {
    prefill: {
      ...invoice,
      invoice_number: `SASINV-B${String(nextNum).padStart(3, "0")}`,
      client_id: null,
      client_name: "",
      project_id: null,
      status: "unpaid",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: null,
    },
    prefillItems: items.map((item) => ({ ...item, id: null })),
  }
}
