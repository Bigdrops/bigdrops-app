import { numberToWords } from '@/lib/formatters/money'

export type AmountInWordsInput = {
  stored?: string | null
  show?: boolean
  payableTotal?: number | null
}

export function resolveAmountInWords({ stored, show, payableTotal }: AmountInWordsInput): string {
  if (show === false) return ''

  const storedValue = typeof stored === 'string' ? stored : ''
  if (storedValue.trim()) return storedValue

  if (typeof payableTotal !== 'number' || !Number.isFinite(payableTotal)) return ''

  return numberToWords(payableTotal)
}
