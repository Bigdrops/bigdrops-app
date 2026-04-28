import { formatCurrency } from './money'

export const PDF_CURRENCY_SYMBOL = '₦'
export const PDF_CURRENCY_WITH_SPACE = `${PDF_CURRENCY_SYMBOL} `

export function formatPdfCurrencyString(value: number | string | null | undefined): string {
  return formatCurrency(value, {
    currencySymbol: PDF_CURRENCY_WITH_SPACE,
    locale: 'en-NG',
    preserveFraction: true,
  })
}

export function isPdfCurrencyString(value: unknown): value is string {
  return typeof value === 'string' && value.trimStart().startsWith(PDF_CURRENCY_SYMBOL)
}
