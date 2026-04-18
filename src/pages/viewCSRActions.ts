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

  const { id: _id, created_at: _ca, updated_at: _ua, csr_number: _wn, ...rest } = original
  
  // Find next number
  const { data: all } = await supabase.from('csrs').select('csr_number').like('csr_number', 'CSR-%').order('created_at', { ascending: false })
  let nextNum = 1
  if (all && all.length > 0) {
    const nums = all
      .map((entry: any) => parseInt(String(entry.csr_number || '').replace('CSR-', ''), 10))
      .filter((value: number) => !Number.isNaN(value))
    nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1
  }

  const { data: created, error: insertError } = await supabase.from('csrs').insert([{
    ...rest,
    csr_number: `CSR-${String(nextNum).padStart(4, '0')}`,
    status: 'draft',
    date: new Date().toISOString().split('T')[0],
  }]).select().single()

  if (insertError) throw insertError
  return created
}
