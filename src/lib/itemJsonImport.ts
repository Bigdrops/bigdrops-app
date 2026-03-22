import type { ColumnConfig, CustomDataMap, InvoiceItem } from '@/domain/invoice'

type ImportedJsonResult = {
  items?: InvoiceItem[]
  columns?: ColumnConfig[]
  error?: string
}

type ImportJsonOptions = {
  text: string
  columns?: ColumnConfig[]
  createItem: () => InvoiceItem
}

const FIELD_ALIASES: Record<string, keyof InvoiceItem | 'install_rate'> = {
  brand: 'make',
  description: 'description',
  detail: 'sub_description',
  details: 'sub_description',
  install: 'install_rate',
  install_rate: 'install_rate',
  make: 'make',
  qty: 'quantity',
  quantity: 'quantity',
  rate: 'unit_price',
  unit: 'unit',
  unit_price: 'unit_price',
}

function normalizeKey(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function parseNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const trimmed = value.trim().replace(/,/g, '')
  if (!trimmed) return null
  const numeric = Number(trimmed)
  return Number.isFinite(numeric) ? numeric : null
}

function hasMeaningfulValue(value: unknown) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim() !== ''
  return true
}

function inferColumnType(values: unknown[]): ColumnConfig['type'] {
  const meaningful = values.filter(hasMeaningfulValue)
  if (!meaningful.length) return 'text'
  return meaningful.every((value) => parseNumber(value) !== null) ? 'number' : 'text'
}

function addColumnAliases(map: Map<string, ColumnConfig>, column: ColumnConfig) {
  const keyAlias = normalizeKey(column.key)
  if (keyAlias) map.set(keyAlias, column)
  const labelAlias = normalizeKey(column.label)
  if (labelAlias) map.set(labelAlias, column)
}

function nextCustomLabel(columns: ColumnConfig[]) {
  const usedNumbers = new Set(
    columns
      .map((column) => {
        const match = /^custom\s+(\d+)$/i.exec(String(column.label || '').trim())
        return match ? Number(match[1]) : null
      })
      .filter((value): value is number => value !== null),
  )

  let index = 1
  while (usedNumbers.has(index)) index += 1
  return `Custom ${index}`
}

function makeCustomColumn(rawKey: string, existingColumns: ColumnConfig[], values: unknown[]) {
  const trimmedLabel = String(rawKey || '').trim()
  const normalizedBase = normalizeKey(trimmedLabel)
  const label = trimmedLabel || nextCustomLabel(existingColumns)
  const fallbackLabel = nextCustomLabel(existingColumns)
  const finalLabel = normalizedBase ? label : fallbackLabel
  const baseKey = normalizedBase || normalizeKey(finalLabel)

  let suffix = 1
  let key = `custom_${baseKey}`
  const existingKeys = new Set(existingColumns.map((column) => column.key))
  while (existingKeys.has(key)) {
    suffix += 1
    key = `custom_${baseKey}_${suffix}`
  }

  return {
    key,
    label: finalLabel,
    type: inferColumnType(values),
    visible: true,
    removable: true,
    includeInTotal: false,
  } satisfies ColumnConfig
}

function applyKnownField(item: InvoiceItem, field: keyof InvoiceItem | 'install_rate', value: unknown) {
  if (field === 'quantity') {
    const quantity = parseNumber(value)
    if (quantity !== null) item.quantity = quantity
    return
  }

  if (field === 'unit_price') {
    const unitPrice = parseNumber(value)
    if (unitPrice !== null) item.unit_price = unitPrice
    return
  }

  if (field === 'install_rate') {
    const installRate = parseNumber(value)
    if (installRate !== null) {
      item.install_rate = installRate
      item.install_rate_override = true
    }
    return
  }

  item[field] = String(value ?? '')
}

function mapExistingColumn(
  item: InvoiceItem,
  column: ColumnConfig,
  value: unknown,
  customData: CustomDataMap,
) {
  if (column.key === 'make') {
    applyKnownField(item, 'make', value)
    return
  }
  if (column.key === 'unit') {
    applyKnownField(item, 'unit', value)
    return
  }
  if (column.key === 'install_rate') {
    applyKnownField(item, 'install_rate', value)
    return
  }
  if (column.key === 'vat_rate') {
    const vatRate = parseNumber(value)
    if (vatRate !== null) item.vat_rate = vatRate
    return
  }
  if (column.key === 'discount_rate') {
    const discountRate = parseNumber(value)
    if (discountRate !== null) item.discount_rate = discountRate
    return
  }

  customData[column.key] =
    column.type === 'number' ? parseNumber(value) ?? null : String(value ?? '')
}

export function importJsonItems({
  text,
  columns = [],
  createItem,
}: ImportJsonOptions): ImportedJsonResult {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    return { error: 'Invalid JSON.' }
  }

  const sourceItems = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown[] }).items)
      ? (parsed as { items: unknown[] }).items
      : null

  if (!sourceItems?.length) {
    return { error: 'No items found.' }
  }

  const rows = sourceItems.filter(
    (entry): entry is Record<string, unknown> =>
      !!entry && typeof entry === 'object' && !Array.isArray(entry),
  )

  if (!rows.length) {
    return { error: 'No items found.' }
  }

  const nextColumns = columns.map((column) => ({ ...column }))
  const columnAliases = new Map<string, ColumnConfig>()
  nextColumns.forEach((column) => addColumnAliases(columnAliases, column))

  const generatedColumns = new Map<string, ColumnConfig>()
  const items = rows.map((row, rowIndex) => {
    const item = {
      ...createItem(),
      row_type: 'standard' as const,
      group_id: null,
      group_name: '',
      sort_order: rowIndex,
    }
    const customData: CustomDataMap = { ...(item.custom_data || {}) }

    Object.entries(row).forEach(([rawKey, rawValue]) => {
      const normalizedKey = normalizeKey(rawKey)
      if (!normalizedKey) return

      const mappedField = FIELD_ALIASES[normalizedKey]
      if (mappedField) {
        applyKnownField(item, mappedField, rawValue)
        return
      }

      const matchedColumn = columnAliases.get(normalizedKey)
      if (matchedColumn) {
        mapExistingColumn(item, matchedColumn, rawValue, customData)
        return
      }

      let customColumn = generatedColumns.get(normalizedKey)
      if (!customColumn) {
        customColumn = makeCustomColumn(
          rawKey,
          [...nextColumns, ...generatedColumns.values()],
          rows.map((entry) => entry[rawKey]),
        )
        generatedColumns.set(normalizedKey, customColumn)
        nextColumns.push(customColumn)
        addColumnAliases(columnAliases, customColumn)
      }

      customData[customColumn.key] =
        customColumn.type === 'number' ? parseNumber(rawValue) ?? null : String(rawValue ?? '')
    })

    item.custom_data = customData
    return item
  })

  return { items, columns: nextColumns }
}
