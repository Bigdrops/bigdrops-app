function toTrimmedString(value: any): string {
  if (value === null || value === undefined) return ''
  const text = String(value).trim()
  return text
}

function isTemporaryMediaUrl(value: string): boolean {
  return /^(blob:|file:|content:|capacitor:\/\/|filesystem:)/i.test(value)
}

export function resolvePersistedMediaUrl(...values: (string | null | undefined)[]): string | null {
  for (const value of values) {
    const text = toTrimmedString(value)
    if (!text) continue
    if (isTemporaryMediaUrl(text)) continue
    return text
  }

  return null
}

export function resolveCanonicalItemImageUrl(item: any): string | null {
  if (!item || typeof item !== 'object') return null

  return resolvePersistedMediaUrl(
    item.image_url,
    item.imageUrl,
  )
}

export function resolveCanonicalLogoUrl(value: any): string | null {
  if (value && typeof value === 'object') {
    return resolvePersistedMediaUrl(
      value.company_logo_url,
      value.companyLogoUrl,
      value.logo_url,
      value.imageUrl,
    )
  }

  return resolvePersistedMediaUrl(value)
}

export function formatMergedQtyUnit(quantity: string | number | null | undefined, unit: string | null | undefined): string {
  const quantityText = toTrimmedString(quantity)
  const unitText = toTrimmedString(unit)

  if (!quantityText) return ''
  if (!unitText) return quantityText

  return `${quantityText}${unitText}`
}
