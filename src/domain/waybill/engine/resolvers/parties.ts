import type { RawWaybill, PartiesBlock } from '../types'
import { normalizeBlank } from '../normalizeBlank'

export function resolveParties(waybill: RawWaybill): PartiesBlock {
  return {
    clientName: normalizeBlank(waybill.client_name),
    senderName: normalizeBlank(waybill.sender_name),
    receiverName: normalizeBlank(waybill.receiver_name),
  }
}
