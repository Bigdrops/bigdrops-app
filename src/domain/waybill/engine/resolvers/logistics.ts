import type { RawWaybill, LogisticsBlock } from '../types'
import { normalizeBlank } from '../normalizeBlank'

export function resolveLogistics(waybill: RawWaybill): LogisticsBlock {
  return {
    vehiclePlate: normalizeBlank(waybill.vehicle_plate),
    driverName: normalizeBlank(waybill.driver_name),
    deliveryMode: normalizeBlank(waybill.transport_mode),
    deliveryLocation: normalizeBlank(waybill.delivery_location),
    purpose: normalizeBlank(waybill.purpose),
  }
}
