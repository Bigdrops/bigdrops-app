export function formatDisplayDate(value, options = {}) {
  const {
    fallback = '-',
    invalidFallback = value || fallback,
    locale,
    dateOptions,
  } = options

  if (!value) return fallback

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return invalidFallback

  return parsedDate.toLocaleDateString(locale, dateOptions)
}
