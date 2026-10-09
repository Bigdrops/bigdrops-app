import { z } from 'zod'
import type { Cps } from './types'
import { createEmptyTableRow } from '@/domain/table-document/rows'
import type { TableDocumentRow } from '@/domain/table-document/types'
import { validateImportGroupMembership } from '@/domain/import/groupMembership'
import { CPS_BUILTIN_COLUMNS, normalizeCpsColumns } from './columns'
import type { ColumnConfig } from '@/domain/invoice/types'
import {
  MAX_NEW_COLUMNS,
  inferColumnType,
  isDangerousKey,
  normalizeScalar,
  normalizeText,
} from '@/domain/import/utils'
import {
  createUniqueCustomColumnKey,
  findColumnByLogicalIdentity,
  normalizeColumnLabelIdentity,
} from '@/domain/financial/columnIdentity'

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
 *   existing CPS metadata outside CPS column configuration,
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
  custom_fields: z.record(z.string(), z.unknown()).optional().nullable(),
}).strict()

const cpsImportBaseSchema = z.object({
  title: z.string().optional().nullable(),
  groups: z.array(groupSchema).optional(),
  items: z.array(itemSchema),
}).strict()

type CpsImportPayloadBase = z.infer<typeof cpsImportBaseSchema>

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

function getCpsVisibleCustomColumns(columns: ColumnConfig[]): ColumnConfig[] {
  const seen = new Set<string>()
  const out: ColumnConfig[] = []
  for (const column of columns) {
    if (!column.key?.startsWith('custom_')) continue
    if ((column.visibilityMode || 'show') !== 'show') continue
    const identity = normalizeColumnLabelIdentity(column.label || column.key)
    if (!identity || seen.has(identity)) continue
    seen.add(identity)
    out.push(column)
  }
  return out
}

export function buildCpsImportPrompt(columnsOrCps?: ColumnConfig[] | Cps): string {
  const columns = Array.isArray(columnsOrCps)
    ? normalizeCpsColumns(columnsOrCps)
    : normalizeCpsColumns(columnsOrCps?.custom_fields?.columnConfig)
  const customColumns = getCpsVisibleCustomColumns(columns)
  const customSchema = customColumns.length > 0
    ? `,\n    "custom_fields": { ${customColumns.map((column) => `"${column.label || column.key}": string | number | null`).join(', ')} }`
    : ''
  const customRules = customColumns.length > 0
    ? `\n- Put only configured extra item attributes inside "custom_fields". Use these custom field keys exactly: ${customColumns.map((column) => `"${column.label || column.key}"`).join(', ')}.`
    : '\n- Do not add a "custom_fields" object unless the prompt lists configured custom fields.'

  return `You are a strict JSON data extractor. Follow these rules without exception:

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
    "notes": string | null${customSchema}
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
- Do not invent fields outside the shape above.${customRules}
- Groups are allowed ONLY when the source has explicit section headings or category labels. If the source has no explicit groups, omit "groups" and omit "temp_ref" and "group_id" from every item. Do not create a default group.
- When groups exist, assign each group id in order: "grp_1", "grp_2", "grp_3". Add a unique "temp_ref" to every item in order: "item_1", "item_2", "item_3". Set "group_id" on each item to its group id. List the item temp_refs in that group "itemIds" array.
- A group is one contiguous section in items[]. Once a standalone item or another group appears, the previous group is closed and must not appear again later.
- Preserve the exact global item order from the source document. Do not reorder items to cluster them by group.
- The app applies the sheet's active column configuration. Only produce the fields above.
- Output JSON only. Wrap the JSON in a code block. Paste it back into the app.`
}

export const cpsImportPrompt = buildCpsImportPrompt()

function validateCpsImportStructure(payload: CpsImportPayloadBase): string | null {
  return validateImportGroupMembership({
    groups: payload.groups || [],
    items: payload.items.map((item, index) => ({
      tempRef: item.temp_ref,
      groupId: item.group_id,
      sourceIndex: index,
    })),
  })
}

export const cpsImportSchema = cpsImportBaseSchema.superRefine((payload, ctx) => {
  const message = validateCpsImportStructure(payload)
  if (!message) return
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message,
  })
})

export type CpsImportPayload = z.infer<typeof cpsImportSchema>

type ImportCustomFieldResolution =
  | { kind: 'custom'; columnKey: string }
  | { kind: 'builtin'; columnKey: string }
  | { kind: 'drop' }

function buildCpsBuiltInImportAliases() {
  const aliases = new Map<string, string>()
  for (const column of CPS_BUILTIN_COLUMNS) {
    aliases.set(normalizeColumnLabelIdentity(column.key), column.key)
    aliases.set(normalizeColumnLabelIdentity(column.label), column.key)
  }
  aliases.set('make', 'make_brand')
  aliases.set('brand', 'make_brand')
  aliases.set('sub_description', 'specification')
  aliases.set('specification', 'specification')
  aliases.set('cost_price', 'cp')
  aliases.set('selling_price', 'sp')
  aliases.set('qty', 'quantity')
  return aliases
}

function applyCpsBuiltInCustomField(
  row: TableDocumentRow,
  columnKey: string,
  rawValue: unknown,
  visible: Set<string>,
) {
  if (columnKey !== 'specification' && !visible.has(columnKey)) return

  if (columnKey === 'description') row.description = normalizeText(rawValue) || ''
  else if (columnKey === 'specification') row.specification = normalizeText(rawValue) || ''
  else if (columnKey === 'make_brand') row.make_brand = normalizeText(rawValue) || ''
  else if (columnKey === 'quantity') row.quantity = asNumber(rawValue)
  else if (columnKey === 'unit') row.unit = normalizeText(rawValue) || ''
  else if (columnKey === 'cp') row.cp = String(rawValue ?? '')
  else if (columnKey === 'sp') row.sp = String(rawValue ?? '')
}

function resolveCpsCustomFieldColumns(
  items: CpsImportPayload['items'],
  current: Cps,
): {
  columns: ColumnConfig[]
  resolutions: Map<string, ImportCustomFieldResolution>
} {
  const columns = normalizeCpsColumns(current.custom_fields?.columnConfig)
  const nextColumns = columns.map((column) => ({ ...column }))
  const builtinAliases = buildCpsBuiltInImportAliases()
  const resolutions = new Map<string, ImportCustomFieldResolution>()
  const valuesByIdentity = new Map<string, unknown[]>()
  const labelsByIdentity = new Map<string, string>()

  for (const item of items) {
    if (!item.custom_fields || typeof item.custom_fields !== 'object') continue
    for (const [rawLabel, rawValue] of Object.entries(item.custom_fields)) {
      if (isDangerousKey(rawLabel)) throw new Error(`Import blocked: dangerous custom field "${rawLabel}" is not allowed.`)
      const identity = normalizeColumnLabelIdentity(rawLabel)
      if (!identity) continue
      const values = valuesByIdentity.get(identity) || []
      values.push(rawValue)
      valuesByIdentity.set(identity, values)
      if (!labelsByIdentity.has(identity)) labelsByIdentity.set(identity, normalizeText(rawLabel) || rawLabel)
    }
  }

  let createdCount = 0
  for (const [identity, values] of valuesByIdentity.entries()) {
    const builtinKey = builtinAliases.get(identity)
    if (builtinKey) {
      resolutions.set(identity, { kind: 'builtin', columnKey: builtinKey })
      continue
    }

    const label = labelsByIdentity.get(identity) || identity
    const existing = findColumnByLogicalIdentity(
      nextColumns.filter((column) => column.key.startsWith('custom_')),
      label,
    )
    if (existing) {
      resolutions.set(identity, { kind: 'custom', columnKey: existing.key })
      continue
    }

    if (createdCount >= MAX_NEW_COLUMNS) {
      resolutions.set(identity, { kind: 'drop' })
      continue
    }

    const column = {
      key: createUniqueCustomColumnKey(label, nextColumns),
      label,
      type: inferColumnType(values),
      visible: true,
      visibilityMode: 'show',
      removable: true,
      includeInTotal: false,
    } satisfies ColumnConfig
    nextColumns.push(column)
    resolutions.set(identity, { kind: 'custom', columnKey: column.key })
    createdCount += 1
  }

  return { columns: nextColumns, resolutions }
}

export function applyCpsImport(payload: CpsImportPayload, current: Cps): Cps {
  const structureError = validateCpsImportStructure(payload)
  if (structureError) throw new Error(structureError)

  const groups = payload.groups || []
  const visible = getVisibleColumnKeys(current)
  const customFieldColumns = resolveCpsCustomFieldColumns(payload.items, current)
  const hasExistingColumnConfig = Array.isArray(current.custom_fields?.columnConfig)
  const hasImportedCustomFields = payload.items.some(
    (item) => item.custom_fields && Object.keys(item.custom_fields).length > 0,
  )
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
    if (item.custom_fields && typeof item.custom_fields === 'object') {
      Object.entries(item.custom_fields).forEach(([rawLabel, rawValue]) => {
        const identity = normalizeColumnLabelIdentity(rawLabel)
        const resolution = customFieldColumns.resolutions.get(identity)
        if (!resolution || resolution.kind === 'drop') return
        if (resolution.kind === 'builtin') {
          applyCpsBuiltInCustomField(row, resolution.columnKey, rawValue, visible)
          return
        }
        const value = normalizeScalar(rawValue)
        if (value === undefined) return
        row.custom_data = {
          ...(row.custom_data || {}),
          [resolution.columnKey]: value,
        }
      })
    }

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
    custom_fields: {
      ...(current.custom_fields || {}),
      ...(hasExistingColumnConfig || hasImportedCustomFields ? { columnConfig: customFieldColumns.columns } : {}),
    },
  }
}
