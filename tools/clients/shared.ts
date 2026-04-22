export const CLIENT_TABLE_FIELDS = [
  'name',
  'email',
  'phone',
  'address',
  'city',
  'state',
  'country',
] as const

export type ClientTableField = (typeof CLIENT_TABLE_FIELDS)[number]

export type RawClientRecord = Record<string, unknown>

export type ClientInsertRow = {
  [K in ClientTableField]: string | null
}

export type InsertedClientRow = {
  id: string
  name: string | null
}

export type FailedClientRow = {
  index: number
  name: string | null
  reason: string
}

export function normalizeClientName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

function toOptionalString(value: unknown): string | null {
  if (value == null) return null
  const normalized = String(value).trim()
  return normalized.length > 0 ? normalized : null
}

export function sanitizeClientRow(record: RawClientRecord): ClientInsertRow {
  return {
    name: toOptionalString(record.name),
    email: toOptionalString(record.email),
    phone: toOptionalString(record.phone),
    address: toOptionalString(record.address),
    city: toOptionalString(record.city),
    state: toOptionalString(record.state),
    country: toOptionalString(record.country),
  }
}
