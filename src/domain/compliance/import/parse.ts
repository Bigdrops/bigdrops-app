import { COMPLIANCE_IMPORT_CONTRACTS, ComplianceRecordType } from './contracts'

export function parseJsonObject(input: string): { data: any | null; error: string | null } {
  const trimmed = input.trim()
  if (!trimmed) return { data: null, error: null }

  if (trimmed.startsWith('```')) {
    return { data: null, error: 'Remove code fences and paste raw JSON only.' }
  }

  if (trimmed.startsWith('[') || trimmed.endsWith(']')) {
    return { data: null, error: 'Paste one JSON object only. Arrays are not supported here.' }
  }

  try {
    const parsed = JSON.parse(trimmed)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { data: null, error: 'Invalid JSON. Paste a valid JSON object and try again.' }
    }
    return { data: parsed, error: null }
  } catch (e) {
    if (trimmed.includes('\n') && !trimmed.startsWith('{')) {
       return { data: null, error: 'Paste JSON only. Remove any extra explanation before or after the object.' }
    }
    return { data: null, error: 'Invalid JSON. Paste a valid JSON object and try again.' }
  }
}

export function validateRequiredFields(type: ComplianceRecordType, data: any): string[] {
  const contract = COMPLIANCE_IMPORT_CONTRACTS[type]
  const missing: string[] = []
  
  contract.requiredFields.forEach(field => {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field)
    }
  })

  return missing
}

export function normalizeDate(value: any): string | null {
  if (!value) return null
  const str = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  // Light attempt at fixing common but wrong formats if obvious
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/')
    return `${y}-${m}-${d}`
  }
  return null
}

export function normalizeNumber(value: any): number {
  if (value === undefined || value === null) return 0
  if (typeof value === 'number') return value
  const cleaned = String(value).replace(/[^0-9.-]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}
