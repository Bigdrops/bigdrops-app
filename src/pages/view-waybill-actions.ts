import { recordAuditLog, recordWaybillCreated, WAYBILL_TRACKED_FIELDS } from '@/lib/audit'
import type { TenantClient } from '@/lib/tenantClient'

export async function archiveWaybillRecord(id: string, tenantClient: TenantClient) {
  const db = tenantClient
  const { error } = await db.from('waybills').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
  // ponytail: audit inline, no refactoring
  try {
    void recordAuditLog(tenantClient, {
      entityType: 'waybill',
      recordId: id,
      action: 'ARCHIVE',
      oldData: null,
      newData: null,
      trackedFields: WAYBILL_TRACKED_FIELDS,
    })
  } catch { /* audit failure must not break mutation */ }
}

export async function deleteWaybillRecord(id: string, tenantClient: TenantClient) {
  const db = tenantClient
  const { error } = await db.from('waybills').delete().eq('id', id)
  if (error) throw error
  // ponytail: audit inline, no refactoring
  try {
    void recordAuditLog(tenantClient, {
      entityType: 'waybill',
      recordId: id,
      action: 'DELETE',
      oldData: null,
      newData: null,
      trackedFields: WAYBILL_TRACKED_FIELDS,
    })
  } catch { /* audit failure must not break mutation */ }
}

export async function updateWaybillStatus(id: string, status: string, tenantClient: TenantClient) {
  const db = tenantClient
  // Fetch old status before update for activity_events
  let oldStatus: string | null = null
  try {
    const { data } = await db.from('waybills').select('status').eq('id', id).single()
    oldStatus = data?.status ?? null
  } catch { /* ponytail: best-effort old status */ }

  const { error } = await db.from('waybills').update({ status }).eq('id', id)
  if (error) throw error

  // ponytail: audit inline, no refactoring
  try {
    void recordAuditLog(tenantClient, {
      entityType: 'waybill',
      recordId: id,
      action: 'STATUS_CHANGE',
      oldData: { status: oldStatus },
      newData: { status },
      trackedFields: WAYBILL_TRACKED_FIELDS,
    })
    // Lazy import to avoid circular dependency at module load
    const { recordWaybillStatusChanged } = await import('@/lib/audit')
    void recordWaybillStatusChanged(tenantClient, id, oldStatus, status)
  } catch { /* audit failure must not break mutation */ }
}

export async function duplicateWaybillRecord(id: string, tenantClient: TenantClient) {
  const db = tenantClient
  const { data: original, error: fetchError } = await db.from('waybills').select('*').eq('id', id).single()
  if (fetchError || !original) throw new Error(fetchError?.message || 'Waybill not found')

  // ponytail: identity fields cleared per Law 2 — preserve items, routes, vehicle only
  const { id: _id, created_at: _ca, updated_at: _ua, waybill_number: _wn,
    client_id: _ci, client_name: _cn, project_id: _pi, invoice_id: _ii,
    ...rest } = original

  const prefix = original.type === 'internal' ? 'AWB-I-' : 'AWB-E-'
  const { data: all } = await db.from('waybills').select('waybill_number').like('waybill_number', `${prefix}%`).order('created_at', { ascending: false })
  let nextNum = 1
  if (all && all.length > 0) {
    const nums = all
      .map((entry: any) => parseInt(String(entry.waybill_number || '').replace(prefix, ''), 10))
      .filter((value: number) => !Number.isNaN(value))
    nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1
  }

  const { data: created, error: insertError } = await db.from('waybills').insert([{
    ...rest,
    waybill_number: `${prefix}${String(nextNum).padStart(4, '0')}`,
    status: 'dispatched',
    date: new Date().toISOString().split('T')[0],
  }]).select().single()

  if (insertError) throw insertError

  // ponytail: audit inline, no refactoring
  if (created) {
    try {
      void recordAuditLog(tenantClient, {
        entityType: 'waybill',
        recordId: created.id,
        entityLabel: created.waybill_number,
        action: 'CREATE',
        oldData: null,
        newData: created,
        trackedFields: WAYBILL_TRACKED_FIELDS,
      })
      void recordWaybillCreated(tenantClient, created.id)
    } catch { /* audit failure must not break mutation */ }
  }

  return created
}
