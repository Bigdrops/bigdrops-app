import type { InvoiceCustomFields, InvoiceFieldEntry } from './types'
import { makeFieldEntry } from './factories'

function coerceText(value: unknown): string {
  return String(value || '').trim()
}

function fromLegacyText(text: string): InvoiceFieldEntry {
  const normalizedText = coerceText(text)
  if (!normalizedText) return { label: '', value: '' }

  const separatorIndex = normalizedText.indexOf(':')
  if (separatorIndex > 0 && separatorIndex < normalizedText.length - 1) {
    const label = normalizedText.slice(0, separatorIndex).trim()
    const value = normalizedText.slice(separatorIndex + 1).trim()
    if (label && value) return { label, value }
  }

  return { label: '', value: normalizedText }
}

export function normalizeAdditionalFieldEntries(
  additionalFields: InvoiceFieldEntry[] | null | undefined,
  legacyBottomFields?: InvoiceFieldEntry[] | null | undefined,
): InvoiceFieldEntry[] {
  if (Array.isArray(additionalFields) && additionalFields.length > 0) {
    return additionalFields.map((field) => ({
      ...makeFieldEntry(field),
      label: coerceText(field?.label),
      value: coerceText(field?.value),
    }))
  }

  return (Array.isArray(legacyBottomFields) ? legacyBottomFields : []).map((field) =>
    makeFieldEntry({
      ...field,
      ...fromLegacyText(coerceText(field?.text)),
    }),
  )
}

type AdditionalFieldSource = Pick<InvoiceCustomFields, 'additionalFields' | 'bottom'>

export function getAdditionalFields(customFields: AdditionalFieldSource | null | undefined): InvoiceFieldEntry[] {
  return normalizeAdditionalFieldEntries(customFields?.additionalFields, customFields?.bottom)
}

export function filterPopulatedAdditionalFields(fields: InvoiceFieldEntry[] | null | undefined): InvoiceFieldEntry[] {
  return (Array.isArray(fields) ? fields : [])
    .map((field) => ({
      ...field,
      label: coerceText(field?.label),
      value: coerceText(field?.value),
    }))
    .filter((field) => field.label || field.value)
}
