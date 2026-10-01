import { z } from 'zod'
import type { Cps } from './types'
import { createEmptyTableRow } from '@/domain/table-document/rows'
import type { TableDocumentRow } from '@/domain/table-document/types'

/**
 * Cost & Pricing Sheet JSON extraction contract.
 *
 * This is the canonical producer contract. It is the only vocabulary the AI
 * extractor is instructed to produce.
 *
 * Price mapping (explicit and disjoint):
 *   JSON cost_price    -> CPS row.cp
 *   JSON selling_price -> CPS row.sp
 *
 * selling_price replaces unit_price at the extraction boundary. unit_price is
 * not a canonical CPS selling-price field.
 *
 * Structural identities are owned by the import protocol:
 *   group reference -> grp_1, grp_2, grp_3 (by source group order)
 *   item reference  -> item_1, item_2, item_3 (item temp_ref)
 * Source or database identifiers never become CPS relationship identities.
 *
 * The import boundary never touches:
 *   client identity (custom_fields.client_id, custom_fields.client_snapshot),
 *   client display (client_name),
 *   Site / Project (project_name),
 *   item photos (image_url),
 *   CPS column configuration (custom_fields.columnConfig),
 *   calculated financial values (TCP, TSP, profit, margin, totals).
 */

const groupSchema = z.object({
  id: z.string().optional().nullable(),
  name: z.string().min(1),
  itemIds: z.array(z.string()).optional(),
}).strict()

const itemSchema = z.object({
  temp_ref: z.string().optional().nullable(),
  group_id: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  sub_description: z.string().optional().nullable(),
  make: z.string().optional().nullable(),
  quantity: z.union([z.number(), z.string()]).optional().nullable(),
  unit: z.string().optional().nullable(),
  cost_price: z.union([z.number(), z.string()]).optional().nullable(),
  selling_price: z.union([z.number(), z.string()]).optional().nullable(),
  notes: z.string().optional().nullable(),
}).strict()

export const cpsImportSchema = z.object({
  title: z.string().optional().nullable(),
  groups: z.array(groupSchema).optional(),
  items: z.array(itemSchema),
}).strict()

export type CpsImportPayload = z.infer<typeof cpsImportSchema>

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

/**
 * Active Cost & Pricing Sheet table-column configuration.
 *
 * A supported item field is imported only when its column is active. The
 * baseline is the document table-column configuration. The live Columns
 * manager configuration (custom_fields.columnConfig) can only deactivate a
 * key. Sub Description is a per-item capability, not a column. It follows the
 * Description column.
 */
function getVisibleColumnKeys(current: Cps): Set<string> {
  const keys = new Set<string>()
  const columns = current.table_columns || []
  columns.forEach((column) => {
    if (column.visible) keys.add(column.key)
  })

  const columnConfig = current.custom_fields?.columnConfig
  if (Array.isArray(columnConfig)) {
    for (const column of columnConfig) {
      const key = typeof column?.key === 'string' ? column.key : null
      if (key && column.visible === false) keys.delete(key)
    }
  }

  return keys
}

export const cpsImportPrompt = `You are a strict JSON data extractor. Follow these rules without exception:

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
  "groups": [{ "id": string, "name": string, "itemIds": [string] }],
  "items": [{
    "temp_ref": string | null,
    "group_id": string | null,
    "description": string | null,
    "sub_description": string | null,
    "make": string | null,
    "quantity": number | null,
    "unit": string | null,
    "cost_price": number | null,
    "selling_price": number | null,
    "notes": string | null
  }]
}

Rules:
- cost_price is CP (money out). selling_price is SP (money in). Never put a cost value in selling_price. Never put a selling value in cost_price. Never copy one into the other.
- Leave cost_price null when the source shows no cost. Leave selling_price null when the source shows no selling price.
- Copy the exact digits from the source. Do not compute, round, or derive any price.
- Do not extract a client. Do not extract a vendor or a contractor. Do not extract a contact.
- Do not extract a site or a project.
- Do not extract photos or image URLs.
- Do not extract calculated values: no line totals, no TCP, no TSP, no profit, no margin, and no document totals.
- Do not add a "custom_fields" object and do not invent fields outside the shape above.
- Groups are allowed ONLY when the source has explicit section headings or category labels. If the source has no explicit groups, omit "groups" and omit "temp_ref" and "group_id" from every item. Do not create a default group.
- When groups exist, assign each group id in order: "grp_1", "grp_2", "grp_3". Add a unique "temp_ref" to every item in order: "item_1", "item_2", "item_3". Set "group_id" on each item to its group id. List the item temp_refs in that group "itemIds" array.
- Preserve the exact global item order from the source document. Do not reorder items to cluster them by group.
- The app applies the sheet's active column configuration. Only produce the fields above.
- Output JSON only. Wrap the JSON in a code block. Paste it back into the app.`

export function applyCpsImport(payload: CpsImportPayload, current: Cps): Cps {
  const groups = payload.groups || []
  const visible = getVisibleColumnKeys(current)
  const sectionRows: TableDocumentRow[] = []
  const sectionByGroupId = new Map<string, TableDocumentRow>()
  const groupIdByRef = new Map<string, string>()
  const groupIdByItemRef = new Map<string, string>()

  groups.forEach((group, index) => {
    const localGroupId = `grp_${index + 1}`
    const producerRef = group.id != null && group.id !== '' ? String(group.id) : localGroupId
    const row = createEmptyTableRow(index, 'section')
    row._uiKey = localGroupId
    row.section_title = group.name.trim()
    row.group_id = localGroupId
    sectionRows.push(row)
    sectionByGroupId.set(localGroupId, row)
    groupIdByRef.set(producerRef, localGroupId)
    group.itemIds?.forEach((itemRef) => groupIdByItemRef.set(String(itemRef), localGroupId))
  })

  const importedItems = payload.items.map((item, index) => {
    const row = createEmptyTableRow(index, 'item')

    let mappedGroup: string | undefined
    if (item.group_id != null && item.group_id !== '') {
      mappedGroup = groupIdByRef.get(String(item.group_id))
    } else if (item.temp_ref != null && item.temp_ref !== '') {
      mappedGroup = groupIdByItemRef.get(String(item.temp_ref))
    }
    if (mappedGroup) row.group_id = mappedGroup

    if (visible.has('description')) row.description = item.description || ''
    if (visible.has('description')) row.specification = item.sub_description || ''
    if (visible.has('make_brand')) row.make_brand = item.make || ''
    if (visible.has('quantity')) row.quantity = asNumber(item.quantity)
    if (visible.has('unit')) row.unit = item.unit || ''
    if (visible.has('cp')) row.cp = String(item.cost_price ?? '')
    if (visible.has('sp')) row.sp = String(item.selling_price ?? '')
    row.notes = item.notes || ''

    return row
  })

  // Global item order is preserved. A group header is emitted immediately before
  // the first item that belongs to it. A group with no members is emitted after
  // the items. The import boundary never clusters items by group.
  const rows: TableDocumentRow[] = []
  const emittedGroups = new Set<string>()
  importedItems.forEach((row) => {
    const groupId = row.group_id
    if (groupId && !emittedGroups.has(groupId)) {
      const section = sectionByGroupId.get(groupId)
      if (section) {
        rows.push(section)
        emittedGroups.add(groupId)
      }
    }
    rows.push(row)
  })
  sectionRows.forEach((row) => {
    if (row.group_id && !emittedGroups.has(row.group_id)) rows.push(row)
  })

  return {
    ...current,
    title: payload.title?.trim() || current.title,
    table_rows: rows.map((row, index) => ({ ...row, sort_order: index })),
  }
}
