import { supabase } from '@/supabase'
import { createOfflineWaybillDraft, type OfflineWaybillStatus } from '@/lib/native/waybillOffline'
import { Waybill, WaybillItem, normalizeWaybillStatus, validateWaybill, getNextWaybillNumber } from '@/components/waybill/waybillUtils'

export async function saveWaybill(params: {
  waybill: Waybill;
  items: WaybillItem[];
  custom_fields: any;
  mode: 'new' | 'edit';
  waybillId?: string;
  isOffline: boolean;
}) {
  const { waybill, items, custom_fields, mode, waybillId, isOffline } = params;

  const warnings = validateWaybill({ ...waybill, items })
  if (warnings.length > 0) {
    console.warn('Waybill validation warnings:', warnings)
  }

  if (isOffline) {
    await createOfflineWaybillDraft({
      ...waybill,
      status: normalizeWaybillStatus(waybill.status) as OfflineWaybillStatus,
      items,
      custom_fields,
    })
    return { status: 'offline' };
  }

  let waybillNumber = waybill.waybill_number || ''
  if (mode === 'new' && !waybillNumber) {
    const { data: existingWaybills } = await supabase
      .from('waybills')
      .select('waybill_number')
      .order('created_at', { ascending: false })
      .limit(1000)
    const existingNumbers = (existingWaybills || []).map((w) => w.waybill_number || '').filter(Boolean)
    waybillNumber = getNextWaybillNumber(waybill.type || 'external', existingNumbers)
  }

  const purpose = waybill.purpose || 'Supply'

  const payload = {
    ...waybill,
    waybill_number: waybillNumber,
    purpose,
    items,
    custom_fields,
    status: normalizeWaybillStatus(waybill.status)
  }

  if (mode === 'new') {
    const { data, error } = await supabase.from('waybills').insert([payload]).select('id').single()
    if (error) {
      console.error('Waybill save error:', error)
      throw new Error(`Failed to save waybill: ${error.message}`)
    }

    if (data?.id) {
      const { error: logError } = await supabase.from('blank_waybill_logs').insert([{
        waybill_id: data.id,
        template_type: waybill.type || 'external',
      }])
      if (logError) {
        console.warn('Failed to log blank waybill:', logError)
      }
    }
  } else {
    if (!waybillId) throw new Error("waybillId is required in edit mode");
    const { error } = await supabase.from('waybills').update(payload).eq('id', waybillId)
    if (error) {
      console.error('Waybill update error:', error)
      throw new Error(`Failed to update waybill: ${error.message}`)
    }
  }

  return { status: 'online' };
}
