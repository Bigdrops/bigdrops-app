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

export function numberToWords(num: number): string {
  if (!num || num === 0) return 'ZERO NAIRA ONLY'
  const ones = [
    '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
    'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN',
    'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
  ]
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']
  const c = (n: number): string => {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    if (n < 1000) return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 ? ' ' + c(n % 100) : '')
    if (n < 1e6) return c(Math.floor(n / 1000)) + ' THOUSAND' + (n % 1000 ? ' ' + c(n % 1000) : '')
    if (n < 1e9) return c(Math.floor(n / 1e6)) + ' MILLION' + (n % 1e6 ? ' ' + c(n % 1e6) : '')
    return c(Math.floor(n / 1e9)) + ' BILLION' + (n % 1e9 ? ' ' + c(n % 1e9) : '')
  }
  const naira = Math.floor(num)
  const kobo = Math.round((num - naira) * 100)
  return c(naira) + ' NAIRA' + (kobo > 0 ? ' AND ' + c(kobo) + ' KOBO' : '') + ' ONLY'
}
