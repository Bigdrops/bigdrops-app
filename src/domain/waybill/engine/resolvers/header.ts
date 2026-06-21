import type { RawWaybill, HeaderBlock } from '../types'
import { normalizeBlank } from '../normalizeBlank'

export function resolveHeader(waybill: RawWaybill): HeaderBlock {
  return {
    type: waybill.type,
    waybillNumber: waybill.waybill_number,
    date: waybill.date,
    time: normalizeBlank(waybill.time),
    poNumber: normalizeBlank(waybill.po_number),
  }
}
