export type WaybillType = 'internal' | 'external'
export type WaybillStatus = 'draft' | 'dispatched' | 'delivered'
export type ItemCondition = 'good' | 'damaged' | 'partial'

export interface WaybillItem {
  description: string
  quantity: number
  unit: string
  condition: ItemCondition
}

export interface Waybill {
  id?: string
  waybill_number: string
  type: WaybillType
  date: string
  time: string
  sender_name: string
  receiver_name: string
  receiver_signature_url: string
  receiver_description: string
  client_id: string
  client_name: string
  project_id: string
  invoice_id: string
  po_number: string
  vehicle_plate: string
  delivery_location: string
  items: WaybillItem[]
  notes: string
  status: WaybillStatus
  created_by: string
  created_at?: string
}

export function createDefaultWaybill(): Omit<Waybill, 'id' | 'created_at'> {
  const today = new Date().toISOString().split('T')[0]
  return {
    waybill_number: '',
    type: 'internal',
    date: today,
    time: '',
    sender_name: '',
    receiver_name: '',
    receiver_signature_url: '',
    receiver_description: '',
    client_id: '',
    client_name: '',
    project_id: '',
    invoice_id: '',
    po_number: '',
    vehicle_plate: '',
    delivery_location: '',
    items: [{ description: '', quantity: 1, unit: '', condition: 'good' }],
    notes: '',
    status: 'draft',
    created_by: '',
  }
}

export function createDefaultItem(): WaybillItem {
  return { description: '', quantity: 1, unit: '', condition: 'good' }
}

export function getNextWaybillNumber(type: WaybillType, existingNumbers: string[]): string {
  const prefix = type === 'internal' ? 'SASWB-I' : 'SASWB-E'
  const nums = existingNumbers
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => !isNaN(n))
  const highest = nums.length > 0 ? Math.max(...nums) : 0
  return `${prefix}${String(highest + 1).padStart(3, '0')}`
}

export const STATUS_META: Record<string, { label: string; className: string }> = {
  draft:      { label: 'Draft',      className: 'bg-slate-500 text-white' },
  dispatched: { label: 'Dispatched', className: 'bg-blue-500 text-white' },
  delivered:  { label: 'Delivered',  className: 'bg-emerald-500 text-white' },
}

export function getStatusMeta(status: string) {
  return STATUS_META[status?.toLowerCase()] ?? STATUS_META.draft
}

export const TYPE_META: Record<string, { label: string; className: string }> = {
  internal: { label: 'Internal', className: 'bg-purple-600 text-white' },
  external: { label: 'External', className: 'bg-blue-600 text-white' },
}

export function getTypeMeta(type: string) {
  return TYPE_META[type?.toLowerCase()] ?? TYPE_META.internal
}

export const CONDITION_OPTIONS = [
  { value: 'good',    label: 'Good' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'partial', label: 'Partial' },
]

export function formatWaybillDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
