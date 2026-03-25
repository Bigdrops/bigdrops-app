import type { ParsedImportRoot, NormalizedImportData, NormalizedImportItem } from './types'
import { inferColumnType, normalizeScalar, normalizeText, parseNumberish, toSnakeCase } from './utils'

const BASE_FIELDS = new Set(['description', 'sub_description', 'quantity', 'unit', 'unit_price', 'row_number'])

export function normalizeImportData(input: ParsedImportRoot): NormalizedImportData {
  const candidateMap = new Map<
    string,
    {
      labels: Set<string>
      values: unknown[]
    }
  >()

  const items = input.items.map<NormalizedImportItem>((item, sourceIndex) => {
    const baseFields: NormalizedImportItem['baseFields'] = {}
    const extraFields: Record<string, unknown> = {}

    Object.entries(item).forEach(([rawKey, rawValue]) => {
      const key = toSnakeCase(rawKey)
      if (!key) return

      if (key === 'description' || key === 'sub_description' || key === 'unit') {
        const value = normalizeText(rawValue)
        if (value !== undefined) baseFields[key] = value
        return
      }

      if (key === 'quantity' || key === 'unit_price' || key === 'row_number') {
        const value = parseNumberish(rawValue)
        if (value !== null) baseFields[key] = value
        return
      }

      if (!BASE_FIELDS.has(key)) {
        const normalizedValue = normalizeScalar(rawValue)
        if (normalizedValue === undefined) return
        extraFields[key] = normalizedValue

        const current = candidateMap.get(key) || { labels: new Set<string>(), values: [] }
        current.labels.add(String(rawKey))
        current.values.push(normalizedValue)
        candidateMap.set(key, current)
      }
    })

    return {
      sourceIndex,
      row_number: typeof baseFields.row_number === 'number' ? baseFields.row_number : undefined,
      baseFields,
      extraFields,
    }
  })

  return {
    topLevel: {
      po_number: normalizeText(input.po_number),
      notes: normalizeText(input.notes),
      terms: normalizeText(input.terms),
      extra_charges: Array.isArray(input.extra_charges)
        ? input.extra_charges
            .map((entry) => ({
              label: normalizeText(entry.label) || '',
              value: parseNumberish(entry.value) ?? 0,
            }))
            .filter((entry) => entry.label.trim() !== '')
        : undefined,
    },
    items,
    unknownCandidates: Array.from(candidateMap.entries()).map(([key, value]) => ({
      key,
      sourceLabels: Array.from(value.labels),
      sampleValues: value.values.slice(0, 3),
      inferredType: inferColumnType(value.values),
    })),
  }
}
