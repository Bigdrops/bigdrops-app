const SETTLEMENT_TOLERANCE = 0.01

const roundCurrency = (value: number) => Math.round(value * 100) / 100

const normalizeAmount = (value: number | null | undefined) => {
  const numericValue = Number(value ?? 0)
  return Number.isFinite(numericValue) ? numericValue : 0
}

export interface PaymentEntrySummaryInput {
  balanceDue: number
  cashReceived: number | null | undefined
}

export interface PaymentEntrySummary {
  balanceDue: number
  cashReceived: number
  settlementTotal: number
  remainingBalance: number
  exceedsBalance: boolean
}

export interface PaymentEntryValidationResult {
  isValid: boolean
  message: string
  cashError: string
}

export const OVER_BALANCE_MESSAGE =
  'Cash received cannot exceed the remaining balance.'

export function getPaymentEntrySummary({
  balanceDue,
  cashReceived,
}: PaymentEntrySummaryInput): PaymentEntrySummary {
  const normalizedBalance = Math.max(0, normalizeAmount(balanceDue))
  const normalizedCash = normalizeAmount(cashReceived)
  const settlementTotal = roundCurrency(normalizedCash)
  const exceedsBalance = settlementTotal > normalizedBalance + SETTLEMENT_TOLERANCE
  const remainingBalance = roundCurrency(
    Math.max(0, normalizedBalance - Math.min(settlementTotal, normalizedBalance))
  )

  return {
    balanceDue: normalizedBalance,
    cashReceived: normalizedCash,
    settlementTotal,
    remainingBalance,
    exceedsBalance,
  }
}

export function validatePaymentEntry(input: PaymentEntrySummaryInput): PaymentEntryValidationResult {
  const summary = getPaymentEntrySummary(input)
  const cashError = summary.cashReceived < 0 ? 'Cash received cannot be negative.' : ''

  if (cashError) {
    return { isValid: false, message: cashError, cashError }
  }

  if (summary.settlementTotal <= 0) {
    return { isValid: false, message: 'Enter cash received before recording payment.', cashError: '' }
  }

  if (summary.exceedsBalance) {
    return { isValid: false, message: OVER_BALANCE_MESSAGE, cashError: '' }
  }

  return { isValid: true, message: '', cashError: '' }
}


