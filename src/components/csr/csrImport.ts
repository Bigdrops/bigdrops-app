import { DEFAULT_MATERIAL_ROW } from '@/components/csr/csrUtils'

export const CSR_IMPORT_PROMPT = `Extract only the CSR technical/service fields from the text below and return valid JSON only.

Ignore customer/admin/header/signature information.

Allowed keys:
system_down, problem_reported, equipment_type, equipment_location, make, model, serial_no, capacity, voltage, frequency, battery, temperature, pressure, hours, service_rendered, defects_found, engineer_remarks, start_date, end_date, materials

Requirements:
- No markdown
- No commentary
- No extra keys
- Use YYYY-MM-DD for dates if present
- Use true/false/null for system_down
- materials must be an array of { "item": "", "quantity": "", "unit": "" }
- Missing values should be empty strings, except system_down can be null`

const ALLOWED_SCALAR_KEYS = [
  'system_down',
  'problem_reported',
  'equipment_type',
  'equipment_location',
  'make',
  'model',
  'serial_no',
  'capacity',
  'voltage',
  'frequency',
  'battery',
  'temperature',
  'pressure',
  'hours',
  'service_rendered',
  'defects_found',
  'engineer_remarks',
  'start_date',
  'end_date',
] as const

const READING_KEYS = ['voltage', 'frequency', 'battery', 'temperature', 'pressure', 'hours'] as const

const KEY_ALIASES: Record<string, AllowedImportKey> = {
  equipment: 'equipment_type',
  location: 'equipment_location',
  serial: 'serial_no',
  remarks: 'engineer_remarks',
  materials_used: 'materials',
  items: 'materials',
}

type AllowedScalarKey = (typeof ALLOWED_SCALAR_KEYS)[number]
type AllowedImportKey = AllowedScalarKey | 'materials'

export type CsrImportMaterial = {
  item: string
  quantity: string
  unit: string
}

export type ParsedCsrImport = {
  fields: Partial<Record<AllowedScalarKey, string | boolean | null>>
  materials: CsrImportMaterial[]
  hasMaterials: boolean
  hasOperationalReadings: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeImportKey(key: string): AllowedImportKey | null {
  if (key === 'materials') return 'materials'
  if ((ALLOWED_SCALAR_KEYS as readonly string[]).includes(key)) return key as AllowedScalarKey
  return KEY_ALIASES[key] || null
}

function normalizeString(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizeSystemDown(value: unknown): boolean | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'boolean') return value

  const normalized = normalizeString(value).toLowerCase()
  if (normalized === 'true' || normalized === 'yes' || normalized === 'y') return true
  if (normalized === 'false' || normalized === 'no' || normalized === 'n') return false

  throw new Error('system_down must be true, false, or null.')
}

function normalizeDateValue(value: unknown, key: 'start_date' | 'end_date'): string {
  const normalized = normalizeString(value)
  if (!normalized) return ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${key} must use YYYY-MM-DD.`)
  }
  return normalized
}

function normalizeMaterialRow(value: unknown): CsrImportMaterial {
  if (typeof value === 'string') {
    return { ...DEFAULT_MATERIAL_ROW, item: normalizeString(value) }
  }

  if (!isRecord(value)) {
    throw new Error('materials entries must be objects.')
  }

  return {
    item: normalizeString(value.item),
    quantity: normalizeString(value.quantity),
    unit: normalizeString(value.unit),
  }
}

function normalizeMaterials(value: unknown): CsrImportMaterial[] {
  if (!Array.isArray(value)) {
    throw new Error('materials must be an array.')
  }

  return value.map(normalizeMaterialRow)
}

function normalizeScalarValue(key: AllowedScalarKey, value: unknown): string | boolean | null {
  if (key === 'system_down') return normalizeSystemDown(value)
  if (key === 'start_date' || key === 'end_date') return normalizeDateValue(value, key)
  return normalizeString(value)
}

function hasRealReadingValue(fields: Partial<Record<AllowedScalarKey, string | boolean | null>>): boolean {
  return READING_KEYS.some((key) => {
    const value = fields[key]
    return typeof value === 'string' && value.trim() !== ''
  })
}

export function parseCsrImportText(text: string): ParsedCsrImport {
  if (!text.trim()) {
    throw new Error('Paste JSON before importing.')
  }

  let parsedValue: unknown
  try {
    parsedValue = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON.')
  }

  if (!isRecord(parsedValue)) {
    throw new Error('Import payload must be a JSON object.')
  }

  const fields: Partial<Record<AllowedScalarKey, string | boolean | null>> = {}
  let materials: CsrImportMaterial[] = []
  let hasMaterials = false

  for (const [rawKey, rawValue] of Object.entries(parsedValue)) {
    const normalizedKey = normalizeImportKey(rawKey)
    if (!normalizedKey) continue

    if (normalizedKey === 'materials') {
      materials = normalizeMaterials(rawValue)
      hasMaterials = true
      continue
    }

    fields[normalizedKey] = normalizeScalarValue(normalizedKey, rawValue)
  }

  return {
    fields,
    materials,
    hasMaterials,
    hasOperationalReadings: hasRealReadingValue(fields),
  }
}
