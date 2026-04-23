function toTrimmedString(value) {
  if (value === null || value === undefined) return ''
  const text = String(value).trim()
  return text
}

function isTemporaryMediaUrl(value) {
  return /^(blob:|file:|content:|capacitor:\/\/|filesystem:)/i.test(value)
}

export function resolvePersistedMediaUrl(...values) {
  for (const value of values) {
    const text = toTrimmedString(value)
    if (!text) continue
    if (isTemporaryMediaUrl(text)) continue
    return text
  }

  return null
}

export function resolveCanonicalItemImageUrl(item) {
  if (!item || typeof item !== 'object') return null

  return resolvePersistedMediaUrl(
    item.image_url,
    item.imageUrl,
  )
}

export function resolveCanonicalLogoUrl(value) {
  if (value && typeof value === 'object') {
    return resolvePersistedMediaUrl(
      value.company_logo_url,
      value.companyLogoUrl,
      value.imageUrl,
    )
  }

  return resolvePersistedMediaUrl(value)
}

export function formatMergedQtyUnit(quantity, unit) {
  const quantityText = toTrimmedString(quantity)
  const unitText = toTrimmedString(unit)

  if (!quantityText) return ''
  if (!unitText) return quantityText

  return `${quantityText}${unitText}`
}
