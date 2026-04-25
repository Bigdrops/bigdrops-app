function toFiniteAmount(value: number | string | null | undefined): number {
  const parsed =
    typeof value === 'string'
      ? Number(value.replace(/[^0-9.-]/g, '') || 0)
      : Number(value || 0)

  return Number.isFinite(parsed) ? parsed : 0
}

export interface CurrencyOptions {
  currencySymbol?: string
  locale?: string
  preserveFraction?: boolean
  round?: boolean
}

export function formatCurrency(value: number | string | null | undefined, options: CurrencyOptions = {}): string {
  const {
    currencySymbol = '₦',
    locale = 'en-NG',
    preserveFraction = false,
    round = false,
  } = options

  const numericAmount = round ? Math.round(toFiniteAmount(value)) : toFiniteAmount(value)
  const hasFraction = preserveFraction && Math.abs(numericAmount % 1) > 0.000001

  return `${currencySymbol}${numericAmount.toLocaleString(locale, {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  })}`
}

export function formatNaira(value: number | string | null | undefined, options: CurrencyOptions = {}): string {
  return formatCurrency(value, {
    currencySymbol: '₦',
    locale: 'en-NG',
    ...options,
  })
}
