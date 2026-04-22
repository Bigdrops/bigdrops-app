import { supabase } from '@/supabase'

export async function archiveWaybillRecord(id: string) {
  const { error } = await supabase.from('waybills').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteWaybillRecord(id: string) {
  const { error } = await supabase.from('waybills').delete().eq('id', id)
  if (error) throw error
}

export async function updateWaybillStatus(id: string, status: string) {
  const { error } = await supabase.from('waybills').update({ status }).eq('id', id)
  if (error) throw error
}

export async function duplicateWaybillRecord(id: string) {
  const { data: original, error: fetchError } = await supabase.from('waybills').select('*').eq('id', id).single()
  if (fetchError || !original) throw new Error(fetchError?.message || 'Waybill not found')

  const { id: _id, created_at: _ca, updated_at: _ua, waybill_number: _wn, ...rest } = original
  
  // Find next number
  const { data: all } = await supabase.from('waybills').select('waybill_number').like('waybill_number', 'WB-%').order('created_at', { ascending: false })
  let nextNum = 1
  if (all && all.length > 0) {
    const nums = all
      .map((entry: any) => parseInt(String(entry.waybill_number || '').replace('WB-', ''), 10))
      .filter((value: number) => !Number.isNaN(value))
    nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1
  }

  const { data: created, error: insertError } = await supabase.from('waybills').insert([{
    ...rest,
    waybill_number: `WB-${String(nextNum).padStart(4, '0')}`,
    status: 'dispatched',
    date: new Date().toISOString().split('T')[0],
  }]).select().single()

  if (insertError) throw insertError
  return created
}
