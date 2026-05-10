import { supabase } from "@/supabase"

export interface ChildDocSummary {
  id: string
  number: string
}

export interface InvoiceChildDocs {
  csrs: ChildDocSummary[]
  waybills: ChildDocSummary[]
}

export async function fetchChildDocsForInvoice(invoiceId: string): Promise<InvoiceChildDocs> {
  const [{ data: csrs }, { data: waybills }] = await Promise.all([
    supabase
      .from("csrs")
      .select("id, csr_number")
      .eq("linked_invoice_id", invoiceId)
      .order("created_at", { ascending: false }),
    supabase
      .from("waybills")
      .select("id, waybill_number")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: false }),
  ])

  return {
    csrs: (csrs || []).map((r) => ({ id: r.id, number: r.csr_number || "" })),
    waybills: (waybills || []).map((r) => ({ id: r.id, number: r.waybill_number || "" })),
  }
}

export async function linkCsrToInvoice(csrId: string, invoiceId: string): Promise<void> {
  const { error } = await supabase
    .from("csrs")
    .update({ linked_invoice_id: invoiceId })
    .eq("id", csrId)

  if (error) throw error
}

export async function linkWaybillToInvoice(waybillId: string, invoiceId: string): Promise<void> {
  const { error } = await supabase
    .from("waybills")
    .update({ invoice_id: invoiceId })
    .eq("id", waybillId)

  if (error) throw error
}
