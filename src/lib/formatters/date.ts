export interface DateOptions {
  fallback?: string
  invalidFallback?: string
  locale?: string
  dateOptions?: Intl.DateTimeFormatOptions
}

export function formatDisplayTime(value: string | null | undefined): string {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function formatDisplayDate(value: string | number | Date | null | undefined, options: DateOptions = {}): string {
  const {
    fallback = '-',
    invalidFallback = (value as string) || fallback,
    locale,
    dateOptions,
  } = options

  if (!value) return fallback

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return invalidFallback

  return parsedDate.toLocaleDateString(locale, dateOptions)
}
