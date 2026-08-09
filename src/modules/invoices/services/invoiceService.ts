import type { TenantClient } from "@/lib/tenantClient"

// Phase 3: invoices + invoice_items are part of the invoice aggregate — all
// reads target the tenant schema via the caller-supplied TenantClient.

export async function loadInvoiceById(id: string, tenantClient: TenantClient) {
  const { data, error } = await tenantClient
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

export async function loadInvoiceItems(invoiceId: string, tenantClient: TenantClient) {
  const { data, error } = await tenantClient
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("sort_order")

  if (error) throw error
  return data || []
}

export async function loadInvoiceCustomFields(id: string, tenantClient: TenantClient) {
  const { data, error } = await tenantClient
    .from("invoices")
    .select("custom_fields")
    .eq("id", id)
    .single()

  if (error) throw error
  return data?.custom_fields || null
}
