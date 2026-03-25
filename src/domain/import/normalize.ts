import type { ImportMode, ParsedImportRoot, NormalizedImportData, NormalizedImportItem } from './types'
import {
  inferColumnType,
  isDangerousKey,
  normalizeScalar,
  normalizeText,
  normalizeUnitValue,
  parseNumberish,
  toSnakeCase,
} from './utils'

const BASE_FIELDS = new Set(['description', 'sub_description', 'quantity', 'unit', 'unit_price', 'row_number'])

function detectCollisions(record: Record<string, unknown>, contextLabel: string) {
  const seen = new Map<string, string>()

  for (const rawKey of Object.keys(record)) {
    if (isDangerousKey(rawKey)) {
      return {
        ok: false as const,
        message: `Import blocked: dangerous key "${rawKey}" is not allowed in ${contextLabel}.`,
      }
    }

    const normalizedKey = toSnakeCase(rawKey)
    const previousRawKey = seen.get(normalizedKey)
    if (previousRawKey && previousRawKey !== rawKey) {
      return {
        ok: false as const,
        message: `Import blocked: "${previousRawKey}" and "${rawKey}" both normalize to "${normalizedKey}" in ${contextLabel}.`,
      }
    }
    seen.set(normalizedKey, rawKey)
  }

  return { ok: true as const }
}

export function normalizeImportData(
  input: ParsedImportRoot,
  mode: ImportMode,
): { ok: true; data: NormalizedImportData } | { ok: false; message: string } {
  const rootCollisionCheck = detectCollisions(input as Record<string, unknown>, 'the top-level object')
  if (rootCollisionCheck.ok === false) return rootCollisionCheck

  const candidateMap = new Map<
    string,
    {
      labels: Set<string>
      values: unknown[]
    }
  >()

  const items = []

  for (const [sourceIndex, item] of input.items.entries()) {
    const collisionCheck = detectCollisions(item, `item row ${sourceIndex + 1}`)
    if (collisionCheck.ok === false) return collisionCheck

    const baseFields: NormalizedImportItem['baseFields'] = {}
    const extraFields: Record<string, unknown> = {}

    Object.entries(item).forEach(([rawKey, rawValue]) => {
      if (isDangerousKey(rawKey)) return
      const key = toSnakeCase(rawKey)
      if (!key) return

      if (key === 'description' || key === 'sub_description') {
        const value = normalizeText(rawValue)
        if (mode === 'Update Table' && !value) return
        if (value !== undefined) baseFields[key] = value
        return
      }

      if (key === 'unit') {
        const value = normalizeUnitValue(rawValue)
        if (mode === 'Update Table' && !value) return
        if (value !== undefined) baseFields.unit = value
        return
      }

      if (key === 'quantity' || key === 'unit_price' || key === 'row_number') {
        const value = parseNumberish(rawValue)
        if (value !== null) baseFields[key] = value
        return
      }

      if (!BASE_FIELDS.has(key)) {
        const normalizedValue = normalizeScalar(rawValue)
        if (mode === 'Update Table' && (normalizedValue === undefined || normalizedValue === '')) return
        if (normalizedValue === undefined) return
        extraFields[key] = normalizedValue

        const current = candidateMap.get(key) || { labels: new Set<string>(), values: [] }
        current.labels.add(String(rawKey))
        current.values.push(normalizedValue)
        candidateMap.set(key, current)
      }
    })

    items.push({
      sourceIndex,
      row_number: typeof baseFields.row_number === 'number' ? baseFields.row_number : undefined,
      baseFields,
      extraFields,
    })
  }

  const poNumber = normalizeText(input.po_number)
  const notes = normalizeText(input.notes)
  const terms = normalizeText(input.terms)

  return {
    ok: true,
    data: {
      topLevel: {
        po_number: mode === 'Update Table' && !poNumber ? undefined : poNumber,
        notes: mode === 'Update Table' && !notes ? undefined : notes,
        terms: mode === 'Update Table' && !terms ? undefined : terms,
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
    },
  }
}
