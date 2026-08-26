import type { TenantClient } from '@/lib/tenantClient'
import { Rfq } from './types'

export async function loadRfqsFromSupabase(tenantClient: TenantClient) {
  const { data, error } = await tenantClient
    .from('rfqs')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data as any[]
}

export async function archiveRfq(id: string, tenantClient: TenantClient) {
  const { error } = await tenantClient
    .from('rfqs')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw error
  }
}

export async function deleteRfq(id: string, tenantClient: TenantClient) {
  const { error: itemsError } = await tenantClient
    .from('rfq_items')
    .delete()
    .eq('rfq_id', id)

  if (itemsError) {
    throw itemsError
  }

  const { error } = await tenantClient
    .from('rfqs')
    .delete()
    .eq('id', id)

  if (error) {
    throw error
  }
}
