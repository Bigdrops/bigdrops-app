import { supabase } from '@/supabase'
import { Waybill, WaybillItem, normalizeWaybillStatus, validateWaybill, getNextWaybillNumber } from '@/components/waybill/waybillUtils'
import { invalidateListCache } from '@/lib/cache/listCache'
import { resolvePrefix, type DocumentPrefixes } from '@/domain/prefixConstants'
import { withUniqueRetry } from '@/lib/withUniqueRetry'

export async function saveWaybill(params: {
  waybill: Waybill;
  items: WaybillItem[];
  custom_fields: any;
  mode: 'new' | 'edit';
  waybillId?: string;
  prefixes?: DocumentPrefixes | null;
}) {
  const { waybill, items, custom_fields, mode, waybillId, prefixes } = params;

  const errors: string[] = []
  if (waybill.type === 'external' && !waybill.client_id) {
    errors.push('Client must be selected for external waybills')
  }
  if (!waybill.waybill_number && mode === 'new') {
    errors.push('Waybill number is required')
  }
  if (!items || items.length === 0) {
    errors.push('At least one line item is required')
  }
  if (items?.some((item) => !item.description || (item.quantity ?? 0) <= 0)) {
    errors.push('Every item must have a description and quantity greater than 0')
  }
  if (errors.length > 0) {
    throw new Error(errors.join('; '))
  }

  let waybillNumber = waybill.waybill_number || ''
  if (mode === 'new' && !waybillNumber) {
    const { data: existingWaybills } = await supabase
      .from('waybills')
      .select('waybill_number')
      .order('created_at', { ascending: false })
      .limit(1000)
    const existingNumbers = (existingWaybills || []).map((w) => w.waybill_number || '').filter(Boolean)
    const prefix = resolvePrefix(prefixes, 'waybill')
    waybillNumber = getNextWaybillNumber(waybill.type || 'external', existingNumbers, prefix)
  }

  const purpose = waybill.type === 'internal' ? null : (waybill.purpose || 'Supply')

  const nullIfEmpty = (value: string | null | undefined): string | null =>
    value === '' || value === undefined ? null : value

  const dbTime = nullIfEmpty(waybill.time)

  const dbItems = items.map(item => ({
    description: item.description,
    qty: item.quantity,
    unit: item.unit,
    condition: item.condition,
    ...(item.custom_data && Object.keys(item.custom_data).length > 0 ? { custom_data: item.custom_data } : {})
  }))

  const payload = {
    ...waybill,
    time: dbTime,
    waybill_number: waybillNumber,
    purpose,
    items: dbItems,
    custom_fields,
    status: normalizeWaybillStatus(waybill.status),
    client_id: nullIfEmpty(waybill.client_id),
    project_id: nullIfEmpty(waybill.project_id),
    invoice_id: nullIfEmpty(waybill.invoice_id),
    created_by: nullIfEmpty(waybill.created_by),
  }

  if (mode === 'new') {
    const prefix = resolvePrefix(prefixes, 'waybill')
    const { data, error } = await withUniqueRetry(
      async (candidateNumber: string) => {
        payload.waybill_number = candidateNumber
        return supabase.from('waybills').insert([payload]).select('id').single()
      },
      async () => {
        const { data: rows } = await supabase
          .from('waybills')
          .select('waybill_number')
          .order('created_at', { ascending: false })
          .limit(1000)
        const existingNumbers = (rows || []).map((w) => w.waybill_number || '').filter(Boolean)
        return getNextWaybillNumber(waybill.type || 'external', existingNumbers, prefix)
      },
    )
    if (error) {
      console.error('Waybill save error:', error)
      throw new Error(`Failed to save waybill: ${error.message}`)
    }
    invalidateListCache('bd:list:waybills:v1:all')
    return { status: 'online', waybillId: data?.id }
  } else {
    if (!waybillId) throw new Error("waybillId is required in edit mode");
    const { error } = await supabase.from('waybills').update(payload).eq('id', waybillId)
    if (error) {
      console.error('Waybill update error:', error)
      throw new Error(`Failed to update waybill: ${error.message}`)
    }
    invalidateListCache('bd:list:waybills:v1:all')
    return { status: 'online', waybillId }
  }
}
