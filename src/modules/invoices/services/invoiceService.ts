import { supabase } from "@/supabase"

export async function loadInvoiceById(id: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

export async function loadInvoiceItems(invoiceId: string) {
  const { data, error } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("sort_order")

  if (error) throw error
  return data || []
}

export async function loadInvoiceCustomFields(id: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("custom_fields")
    .eq("id", id)
    .single()

  if (error) throw error
  return data?.custom_fields || null
}
