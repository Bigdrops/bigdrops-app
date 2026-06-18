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

function normalizeDataKey(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function labelFromKey(key: string): string {
  return key
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizePrimitiveValue(value: unknown): string | number | null {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'number') return Number.isFinite(value) ? value : ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

export type InternalWaybillImportResult = {
  type: 'internal'
  fields: Record<string, unknown>
  items: WaybillItem[]
  customColumns: WaybillCustomColumn[]
  customFields: Record<string, unknown>
}

const STANDARD_KEYS = ['description', 'quantity', 'unit', 'condition']

export const internalWaybillImportAdapter = {
  prompt: internalWaybillPrompt,
  schema: internalWaybillSchema,
  applyResult(parsedData: Record<string, unknown>): InternalWaybillImportResult {
    const monetaryKeys = ['unit_price', 'rate', 'vat', 'discount', 'subtotal', 'grand_total']
    const parsedItems = Array.isArray(parsedData.items) ? parsedData.items : []
    const customColumnsMap = new Map<string, WaybillCustomColumn>()

    const items: WaybillItem[] = parsedItems.map((item: Record<string, unknown>) => {
      const clean = { ...item }
      for (const key of monetaryKeys) {
        delete clean[key]
      }
      const custom_data: Record<string, string | number | null> = {}
      for (const [key, value] of Object.entries(clean)) {
        const normalizedKey = normalizeDataKey(key)
        if (!normalizedKey || STANDARD_KEYS.includes(normalizedKey)) continue
        custom_data[normalizedKey] = normalizePrimitiveValue(value)
        if (!customColumnsMap.has(normalizedKey)) {
          customColumnsMap.set(normalizedKey, { key: normalizedKey, label: labelFromKey(normalizedKey) })
        }
      }
      return {
        description: String(clean.description || ''),
        quantity: typeof clean.quantity === 'number' ? clean.quantity : Number(clean.quantity) || 1,
        unit: String(clean.unit || ''),
        condition: (['good', 'damaged', 'partial'].includes(String(clean.condition)) ? clean.condition : 'good') as 'good' | 'damaged' | 'partial',
        custom_data,
        row_type: 'standard' as const,
      }
    })

    const customColumns = Array.from(customColumnsMap.values()).slice(0, 20)

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
      customColumns,
      customFields: { customColumns },
    }
  },
}