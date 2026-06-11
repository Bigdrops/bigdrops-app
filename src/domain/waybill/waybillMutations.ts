import { supabase } from '@/supabase'
import { createOfflineWaybillDraft, type OfflineWaybillStatus } from '@/lib/native/waybillOffline'
import { Waybill, WaybillItem, normalizeWaybillStatus, validateWaybill } from '@/components/waybill/waybillUtils'

export async function saveWaybill(params: {
  waybill: Waybill;
  items: WaybillItem[];
  custom_fields: any;
  mode: 'new' | 'edit';
  waybillId?: string;
  isOffline: boolean;
}) {
  const { waybill, items, custom_fields, mode, waybillId, isOffline } = params;

  const errors = validateWaybill({ ...waybill, items })
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join('; ')}`)
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

  const payload = {
    ...waybill,
    items,
    custom_fields,
    status: normalizeWaybillStatus(waybill.status)
  }

  if (mode === 'new') {
    const { error } = await supabase.from('waybills').insert([payload])
    if (error) throw error
  } else {
    if (!waybillId) throw new Error("waybillId is required in edit mode");
    const { error } = await supabase.from('waybills').update(payload).eq('id', waybillId)
    if (error) throw error
  }

  return { status: 'online' };
}
