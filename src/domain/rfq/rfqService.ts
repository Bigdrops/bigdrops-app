import { supabase } from '@/supabase'
import { Rfq } from './types'

export async function loadRfqsFromSupabase() {
  const { data, error } = await supabase
    .from('rfqs')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data as any[]
}

export async function archiveRfq(id: string) {
  const { error } = await supabase
    .from('rfqs')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw error
  }
}

export async function deleteRfq(id: string) {
  const { error: itemsError } = await supabase
    .from('rfq_items')
    .delete()
    .eq('rfq_id', id)

  if (itemsError) {
    throw itemsError
  }

  const { error } = await supabase
    .from('rfqs')
    .delete()
    .eq('id', id)

  if (error) {
    throw error
  }
}
