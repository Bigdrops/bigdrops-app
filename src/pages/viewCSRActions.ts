import { supabase } from '@/supabase'
import { withUniqueRetry } from '@/lib/withUniqueRetry'

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

/** Convert string booleans to real booleans for DB-safe payload */
function toBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (value === 'Yes' || value === 'true') return true
  if (value === 'No' || value === 'false') return false
  return null
}

export async function duplicateCSRRecord(id: string) {
  const { data: original, error: fetchError } = await supabase.from('csrs').select('*').eq('id', id).single()
  if (fetchError || !original) throw new Error(fetchError?.message || 'CSR not found')

  const { getNextCsrNumber } = await import('@/components/csr/csrUtils')

  // ponytail: identity fields cleared per Law 2 — preserve equipment details only
  const { id: _id, created_at: _ca, updated_at: _ua, csr_number: _wn,
    client_id: _ci, client_name: _cn, project_id: _pi,
    linked_invoice_id: _li, acknowledgement_name: _an,
    ...equipment } = original

  const basePayload = {
    ...equipment,
    client_id: null,
    client_name: '',
    project_id: null,
    linked_invoice_id: null,
    acknowledgement_name: null,
    status: 'in_progress',
    date: new Date().toISOString().split('T')[0],
    // Ensure boolean columns are proper booleans, not strings
    system_down: toBoolean(equipment.system_down),
    show_po: toBoolean(equipment.show_po) ?? false,
  }

  const regenerateNumber = async () => {
    const { data: latestRows } = await supabase
      .from('csrs')
      .select('csr_number')
      .order('created_at', { ascending: false })
      .limit(1)
    return getNextCsrNumber(latestRows?.[0]?.csr_number || null)
  }

  const { data: created, error: insertError } = await withUniqueRetry(
    async (candidateNumber) => {
      const { data, error } = await supabase.from('csrs').insert([{
        ...basePayload,
        csr_number: candidateNumber,
      }]).select().single()
      return { data, error }
    },
    regenerateNumber,
    await regenerateNumber(),
  )

  if (insertError || !created) {
    throw insertError || new Error('CSR duplicate failed')
  }
  return created
}
