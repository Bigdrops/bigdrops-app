export function formatStatusLabel(value, options = {}) {
  const { fallback = 'open', lowercase = false } = options
  const normalized = String(value || fallback).replace(/_/g, ' ').trim()
  const casedValue = lowercase ? normalized.toLowerCase() : normalized

  return casedValue.charAt(0).toUpperCase() + casedValue.slice(1)
}
