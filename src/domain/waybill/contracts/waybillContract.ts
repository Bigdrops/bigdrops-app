/**
 * Waybill Canonical Contract v2
 *
 * Single source of truth for the waybill item data contract.
 * All enforcement points (normalizeWaybillItem, persistence, import, PDF)
 * must reference this module — never re-derive types inline.
 *
 * RULES:
 * 1. custom_data is the ONLY extension mechanism — must always exist, never be dropped
 * 2. No schema structure changes, no new fields outside custom_data
 * 3. Form and PDF MUST share identical column definitions, visibility rules, data structure
 * 4. Visibility never mutates persistence data
 * 5. Templates cannot alter item schema
 */

// ── Canonical item type ──────────────────────────────────────────────

export type ItemCondition = 'good' | 'damaged' | 'partial'

export interface WaybillItemCustomData {
  [key: string]: string | number | boolean | null
}

export interface WaybillItem {
  description: string
  quantity: number
  unit: string | null
  condition?: ItemCondition
  custom_data: WaybillItemCustomData
  row_type?: 'standard' | 'group_header'
}

// ── Standard columns (shared between Form and PDF) ───────────────────

export interface StandardColumn {
  key: string
  label: string
  /** Whether this column is rendered in Form by default */
  defaultVisible: boolean
}

/**
 * Standard item columns. Keys must match WaybillItem top-level fields.
 * Form renders these gated by columnVisibility; PDF renders identically.
 */
export const STANDARD_ITEM_COLUMNS: StandardColumn[] = [
  { key: 'description', label: 'Description', defaultVisible: true },
  { key: 'quantity',    label: 'Qty',         defaultVisible: true },
  { key: 'unit',        label: 'Unit',        defaultVisible: true },
  { key: 'make',        label: 'Make',        defaultVisible: false },
  { key: 'partNo',      label: 'Part No',     defaultVisible: false },
  { key: 'condition',   label: 'Condition',   defaultVisible: false },
]

// ── Contract predicates ──────────────────────────────────────────────

/** Returns true if the value is a valid WaybillItem-shaped object. */
export function isWaybillItemShaped(value: unknown): value is WaybillItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.description === 'string' &&
    typeof obj.quantity === 'number' &&
    obj.quantity > 0 &&
    (typeof obj.unit === 'string' || obj.unit === null) &&
    typeof obj.custom_data === 'object' &&
    obj.custom_data !== null &&
    !Array.isArray(obj.custom_data)
  )
}

/**
 * Canonical shape keys for a WaybillItem.
 * Any key not in this set AND not inside custom_data is a contract violation.
 */
export const WAYBILL_ITEM_KEYS = new Set<keyof WaybillItem>([
  'description',
  'quantity',
  'unit',
  'condition',
  'custom_data',
  'row_type',
])

// ── Assertion: custom_data exists and is non-empty ───────────────────

export function assertCustomDataExists(
  item: WaybillItem,
  context: string,
): asserts item is WaybillItem & { custom_data: WaybillItemCustomData } {
  if (!item.custom_data || typeof item.custom_data !== 'object' || Array.isArray(item.custom_data)) {
    throw new Error(`[${context}] custom_data must exist and be a non-null object`)
  }
}

// ── Assertion: custom_data is preserved through a transform ──────────

export function assertCustomDataPreserved(
  source: WaybillItem,
  target: WaybillItem,
  context: string,
): void {
  assertCustomDataExists(source, `${context}:source`)
  assertCustomDataExists(target, `${context}:target`)
  for (const key of Object.keys(source.custom_data)) {
    if (!(key in target.custom_data)) {
      throw new Error(
        `[${context}] custom_data key "${key}" was dropped during transform`,
      )
    }
    const srcVal = source.custom_data[key]
    const tgtVal = target.custom_data[key]
    if (srcVal !== undefined && tgtVal === undefined) {
      throw new Error(
        `[${context}] custom_data key "${key}" value was changed from ${JSON.stringify(srcVal)} to undefined`,
      )
    }
  }
}

// ── Assertion: no extension fields outside custom_data ───────────────

export function assertNoExtensionFieldsOutsideCustomData(
  item: WaybillItem,
  context: string,
): void {
  for (const key of Object.keys(item)) {
    if (!WAYBILL_ITEM_KEYS.has(key as keyof WaybillItem)) {
      throw new Error(
        `[${context}] Extension field "${key}" found outside custom_data. ` +
        `All non-standard fields must live inside custom_data.`,
      )
    }
  }
}

// ── Assertion: visibility does not mutate persistence data ────────────

export function assertVisibilityDoesNotMutateData(
  dataBeforeVisibility: WaybillItem,
  dataAfterVisibility: WaybillItem,
  context: string,
): void {
  assertCustomDataExists(dataBeforeVisibility, `${context}:before`)
  assertCustomDataExists(dataAfterVisibility, `${context}:after`)

  if (dataBeforeVisibility.description !== dataAfterVisibility.description) {
    throw new Error(`[${context}] description mutated by visibility change`)
  }
  if (dataBeforeVisibility.quantity !== dataAfterVisibility.quantity) {
    throw new Error(`[${context}] quantity mutated by visibility change`)
  }
  if (dataBeforeVisibility.unit !== dataAfterVisibility.unit) {
    throw new Error(`[${context}] unit mutated by visibility change`)
  }
  if (dataBeforeVisibility.condition !== dataAfterVisibility.condition) {
    throw new Error(`[${context}] condition mutated by visibility change`)
  }

  assertCustomDataPreserved(dataBeforeVisibility, dataAfterVisibility, `${context}:visibility`)
}

// ── Assertion: unknown fields preserved through normalizeWaybillItem ─

export function assertUnknownFieldsPreserved(
  source: unknown,
  result: WaybillItem,
  context: string,
): void {
  const record = source && typeof source === 'object' && !Array.isArray(source)
    ? (source as Record<string, unknown>)
    : null
  if (!record) return

  for (const key of Object.keys(record)) {
    if (WAYBILL_ITEM_KEYS.has(key as keyof WaybillItem)) continue
    if (key === 'qty') continue
    if (!(key in result.custom_data)) {
      throw new Error(
        `[${context}] Source field "${key}" was lost during normalizeWaybillItem (not in custom_data)`,
      )
    }
  }
}
