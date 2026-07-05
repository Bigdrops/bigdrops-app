import type { RawWaybill, PartiesBlock } from '../types'
import { normalizeBlank } from '../normalizeBlank'

export function resolveParties(waybill: RawWaybill): PartiesBlock {
  return {
    clientName: normalizeBlank(waybill.client_name),
    clientAddress: normalizeBlank(waybill.client_address),
    clientPhone: normalizeBlank(waybill.client_phone),
    clientEmail: normalizeBlank(waybill.client_email),
    clientCityState: normalizeBlank(waybill.client_city_state),
    senderName: normalizeBlank(waybill.sender_name),
    receiverName: normalizeBlank(waybill.receiver_name),
  }
}
