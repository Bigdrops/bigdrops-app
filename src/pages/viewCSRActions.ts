import { supabase } from '@/supabase'

export async function archiveCSRRecord(id: string) {
  const { error } = await supabase.from('csrs').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteCSRRecord(id: string) {
  const { error } = await supabase.from('csrs').delete().eq('id', id)
  if (error) throw error
}

export async function updateCSRStatus(id: string, status: string) {
  const { error } = await supabase.from('csrs').update({ status }).eq('id', id)
  if (error) throw error
}

export async function duplicateCSRRecord(id: string) {
  const { data: original, error: fetchError } = await supabase.from('csrs').select('*').eq('id', id).single()
  if (fetchError || !original) throw new Error(fetchError?.message || 'CSR not found')

  const { getNextCsrNumber } = await import('@/components/csr/csrUtils')
  const { data: all } = await supabase.from('csrs').select('csr_number').order('created_at', { ascending: false })
  const latestNumber = (all || []).reduce<string | null>((latest, row) => {
    const num = row.csr_number
    if (!num) return latest
    if (!latest || num > latest) return num
    return latest
  }, null)
  const nextNumber = getNextCsrNumber(latestNumber)

  // ponytail: identity fields cleared per Law 2 — preserve equipment details only
  const { id: _id, created_at: _ca, updated_at: _ua, csr_number: _wn,
    client_id: _ci, client_name: _cn, project_id: _pi,
    linked_invoice_id: _li, acknowledgement_name: _an,
    ...equipment } = original

  const { data: created, error: insertError } = await supabase.from('csrs').insert([{
    ...equipment,
    csr_number: nextNumber,
    client_id: null,
    client_name: '',
    project_id: null,
    linked_invoice_id: null,
    acknowledgement_name: null,
    status: 'in_progress',
    date: new Date().toISOString().split('T')[0],
  }]).select().single()

  if (insertError) throw insertError
  return created
}
