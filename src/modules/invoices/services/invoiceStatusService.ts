import { supabase } from "@/supabase"
import { fetchInvoiceFinancials } from "../repositories/paymentRepository"

export interface InvoiceStatusResult {
  success: boolean
  status?: string
  error?: string
}

/**
 * Updates the invoice status directly in the database.
 */
export async function updateInvoiceStatus(
  invoiceId: string,
  status: string
): Promise<InvoiceStatusResult> {
  try {
    const { error } = await supabase
      .from("invoices")
      .update({ status })
      .eq("id", invoiceId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, status }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

/**
 * Recalculates and synchronizes the invoice status based on its financial state (payments).
 */
export async function syncInvoiceStatusFromFinancials(
  invoiceId: string
): Promise<InvoiceStatusResult> {
  try {
    const financials = await fetchInvoiceFinancials(invoiceId)
    const newStatus = financials?.computed_status || "unpaid"

    const result = await updateInvoiceStatus(invoiceId, newStatus)
    return { ...result, status: newStatus }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
