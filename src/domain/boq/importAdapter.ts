import { z } from 'zod'
import type { Boq } from './types'
import { ensureBoqCustomColumns, getBoqCustomColumnKey, normalizeBoqColumns } from './columns'
import { createEmptyTableRow } from '@/domain/table-document/rows'
import type { TableDocumentRow } from '@/domain/table-document/types'

const groupSchema = z.object({
  id: z.union([z.string(), z.number()]).optional().nullable(),
  name: z.string().min(1),
  itemIds: z.array(z.union([z.string(), z.number()])).optional(),
}).strict()

const itemSchema = z.object({
  id: z.union([z.string(), z.number()]).optional().nullable(),
  group_id: z.union([z.string(), z.number()]).optional().nullable(),
  gid: z.union([z.string(), z.number()]).optional().nullable(),
  description: z.string().optional().nullable(),
  sub_description: z.string().optional().nullable(),
  specification: z.string().optional().nullable(),
  make: z.string().optional().nullable(),
  make_brand: z.string().optional().nullable(),
  quantity: z.union([z.number(), z.string()]).optional().nullable(),
  qty: z.union([z.number(), z.string()]).optional().nullable(),
  unit: z.string().optional().nullable(),
  cost_price: z.union([z.number(), z.string()]).optional().nullable(),
  cp: z.union([z.number(), z.string()]).optional().nullable(),
  unit_price: z.union([z.number(), z.string()]).optional().nullable(),
  sp: z.union([z.number(), z.string()]).optional().nullable(),
  image_url: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  custom_fields: z.record(z.string(), z.unknown()).optional().nullable(),
}).strict()

export const boqImportSchema = z.object({
  title: z.string().optional().nullable(),
  client_name: z.string().optional().nullable(),
  vendor_name: z.string().optional().nullable(),
  site: z.string().optional().nullable(),
  vendor_contact: z.string().optional().nullable(),
  groups: z.array(groupSchema).optional(),
  items: z.array(itemSchema),
}).strict()

export type BoqImportPayload = z.infer<typeof boqImportSchema>

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function keyOf(value: unknown) {
  return value === null || value === undefined ? null : String(value)
}

export const boqImportPrompt = `You are a strict JSON data extractor. Follow these rules without exception:

· Return ONLY data explicitly present in the source document.
· Never infer, guess, or fabricate values.
· Missing values MUST be null.
· Do not rename or reorder fields.
· Output MUST be valid JSON only.
· Groups are allowed ONLY if explicitly present in the source document.
· Never create groups from layout, indentation, or spacing.
· Each document type is independent (no cross-domain inference).
· The identifier po_number MUST be null unless the source explicitly labels it as PO/Voucher.

This is a Cost & Pricing Sheet import. Return one JSON object:
{
  "title": string | null,
  "client_name": string | null,
  "site": string | null,
  "groups": [{ "id": string | number | null, "name": string, "itemIds": [string | number] }],
  "items": [{
    "id": string | number | null,
    "group_id": string | number | null,
    "description": string | null,
    "sub_description": string | null,
    "make": string | null,
    "quantity": number | null,
    "unit": string | null,
    "cost_price": number | null,
    "unit_price": number | null,
    "image_url": string | null,
    "notes": string | null,
    "custom_fields": object | null
  }]
}`

export function applyBoqImport(payload: BoqImportPayload, current: Boq): Boq {
  const groups = payload.groups || []
  const sectionRows: Array<{ sourceKey: string; row: TableDocumentRow }> = []
  const groupIdMap = new Map<string, string>()
  const itemGroupMap = new Map<string, string>()
  const customLabels = new Set<string>()

  groups.forEach((group, index) => {
    const sourceKey = keyOf(group.id) || String(index)
    const localGroupId = `group_${sourceKey}`
    const row = createEmptyTableRow(index, 'section')
    row._uiKey = localGroupId
    row.section_title = group.name.trim()
    row.group_id = localGroupId
    sectionRows.push({ sourceKey, row })
    groupIdMap.set(sourceKey, localGroupId)
    group.itemIds?.forEach((itemId) => itemGroupMap.set(String(itemId), localGroupId))
  })

  const importedItems = payload.items.map((item, index) => {
    const row = createEmptyTableRow(index, 'item')
    const rawGroupId = item.group_id ?? item.gid
    const mappedGroup = rawGroupId !== null && rawGroupId !== undefined
      ? groupIdMap.get(String(rawGroupId))
      : item.id !== null && item.id !== undefined
        ? itemGroupMap.get(String(item.id))
        : undefined

    row.description = item.description || ''
    row.specification = item.sub_description || item.specification || ''
    row.make_brand = item.make || item.make_brand || ''
    row.quantity = asNumber(item.quantity ?? item.qty)
    row.unit = item.unit || ''
    row.cp = String(item.cost_price ?? item.cp ?? '')
    row.sp = String(item.unit_price ?? item.sp ?? '')
    row.notes = item.notes || ''
    if (mappedGroup) {
      row.group_id = mappedGroup
    }
    if (item.image_url) {
      row.image_url = item.image_url
    }
    row.custom_data = Object.entries(item.custom_fields || {}).reduce<Record<string, unknown>>((acc, [label, value]) => {
      customLabels.add(label)
      acc[getBoqCustomColumnKey(label)] = value
      return acc
    }, {})
    return row
  })

  const rows: TableDocumentRow[] = []
  sectionRows.forEach(({ row }) => {
    rows.push(row)
    rows.push(...importedItems.filter((item) => item.group_id === row.group_id))
  })
  rows.push(...importedItems.filter((item) => !item.group_id || !sectionRows.some(({ row }) => row.group_id === item.group_id)))

  return {
    ...current,
    title: payload.title?.trim() || current.title,
    vendor_name: payload.client_name?.trim() || payload.vendor_name?.trim() || current.vendor_name,
    vendor_contact: payload.site?.trim() || payload.vendor_contact?.trim() || current.vendor_contact,
    table_rows: rows.map((row, index) => ({ ...row, sort_order: index })),
    custom_fields: {
      ...(current.custom_fields || {}),
      columnConfig: ensureBoqCustomColumns(
        normalizeBoqColumns(current.custom_fields?.columnConfig),
        Array.from(customLabels),
      ),
    },
  }
}
