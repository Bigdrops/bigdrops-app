import { supabase } from "@/supabase"
import type { DuplicateInvoicePrefill } from "../types/invoiceTypes"

export interface ArchiveInvoiceInput {
  invoiceId: string
}

export interface DeleteInvoiceInput {
  invoiceId: string
}

export interface DuplicateInvoiceInput {
  invoice: any
  items: any[]
}

export interface UpdateStatusInput {
  invoiceId: string
  status: string
}

export interface InvoiceLifecycleResult {
  success: boolean
  error?: string
}

export async function archiveInvoice({
  invoiceId,
}: ArchiveInvoiceInput): Promise<InvoiceLifecycleResult> {
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

export async function deleteInvoice({
  invoiceId,
}: DeleteInvoiceInput): Promise<InvoiceLifecycleResult> {
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

export async function updateInvoiceStatus({
  invoiceId,
  status,
}: UpdateStatusInput): Promise<InvoiceLifecycleResult> {
  try {
    const { error } = await supabase
      .from("invoices")
      .update({ status })
      .eq("id", invoiceId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
