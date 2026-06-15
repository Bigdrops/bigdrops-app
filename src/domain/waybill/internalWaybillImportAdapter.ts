import { internalWaybillPrompt } from './internalWaybillPrompt'
import { internalWaybillSchema } from './internalWaybillSchema'
import type { WaybillItem, WaybillCustomColumn } from '@/components/waybill/waybillUtils'

function normalizeDateValue(value: unknown): string {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

export type InternalWaybillImportResult = {
  type: 'internal'
  fields: Record<string, unknown>
  items: WaybillItem[]
  customColumns: WaybillCustomColumn[]
  customFields: Record<string, unknown>
}

export const internalWaybillImportAdapter = {
  prompt: internalWaybillPrompt,
  schema: internalWaybillSchema,
  applyResult(parsedData: Record<string, unknown>): InternalWaybillImportResult {
    const monetaryKeys = ['unit_price', 'rate', 'vat', 'discount', 'subtotal', 'grand_total']
    const parsedItems = Array.isArray(parsedData.items) ? parsedData.items : []
    const items: WaybillItem[] = parsedItems.map((item: Record<string, unknown>) => {
      const clean = { ...item }
      for (const key of monetaryKeys) {
        delete clean[key]
      }
      return {
        description: String(clean.description || ''),
        quantity: typeof clean.quantity === 'number' ? clean.quantity : Number(clean.quantity) || 1,
        unit: String(clean.unit || ''),
        condition: (['good', 'damaged', 'partial'].includes(String(clean.condition)) ? clean.condition : 'good') as 'good' | 'damaged' | 'partial',
        custom_data: {},
        row_type: 'standard' as const,
      }
    })

    const fields: Record<string, unknown> = {
      type: 'internal',
      date: normalizeDateValue(parsedData.date),
      time: String(parsedData.time || ''),
      sender_name: String(parsedData.sender_name || ''),
      receiver_name: String(parsedData.receiver_name || ''),
      vehicle_plate: String(parsedData.vehicle_plate || ''),
      delivery_location: String(parsedData.delivery_location || ''),
      notes: String(parsedData.notes || ''),
    }

    return {
      type: 'internal',
      fields,
      items: items.length > 0 ? items : [{ description: '', quantity: 1, unit: '', condition: 'good', custom_data: {}, row_type: 'standard' as const }],
      customColumns: [],
      customFields: {},
    }
  },
}