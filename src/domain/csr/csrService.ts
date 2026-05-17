import { supabase } from '@/supabase'

export type CsrRow = {
  id: string
  csr_number: string | null
  client_name: string | null
  equipment_type: string | null
  make: string | null
  date: string | null
  created_at: string
  status: string | null
  linked_invoice_id: string | null
  project_id: string | null
}

export async function loadCsrsFromSupabase(): Promise<CsrRow[]> {
  const { data, error } = await supabase
    .from("csrs")
    .select("*")
    .is('archived_at', null)
    .order("date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return (data as CsrRow[]) || []
}

export async function archiveCsr(id: string) {
  const { error } = await supabase
    .from('csrs')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw error
  }
}

export async function deleteCsr(id: string) {
  const { error } = await supabase
    .from("csrs")
    .delete()
    .eq("id", id)

  if (error) {
    throw error
  }
}

export async function attachInvoiceToCsr(csrId: string, invoiceId: string) {
  const { error } = await supabase
    .from("csrs")
    .update({ linked_invoice_id: invoiceId })
    .eq("id", csrId)

  if (error) {
    throw error
  }

  const { data, error: fetchError } = await supabase
    .from("csrs")
    .select("*")
    .eq("id", csrId)
    .single()

  if (fetchError) {
    throw fetchError
  }

  return data as CsrRow
}
