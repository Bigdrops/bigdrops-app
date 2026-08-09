import type { TenantClient } from "@/lib/tenantClient"
import { fetchInvoiceFinancials } from "../repositories/paymentRepository"

export interface InvoiceStatusResult {
  success: boolean
  status?: string
  error?: string
}

/**
 * Updates the invoice status directly in the database (tenant schema).
 */
export async function updateInvoiceStatus(
  invoiceId: string,
  status: string,
  tenantClient: TenantClient
): Promise<InvoiceStatusResult> {
  try {
    const { error } = await tenantClient
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
  invoiceId: string,
  tenantClient: TenantClient
): Promise<InvoiceStatusResult> {
  try {
    const financials = await fetchInvoiceFinancials(invoiceId, tenantClient)
    // Phase 3: persist the SAFE status vocabulary only
    const newStatus = financials?.persisted_status || financials?.computed_status || "unpaid"

    const result = await updateInvoiceStatus(invoiceId, newStatus, tenantClient)
    return { ...result, status: newStatus }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
