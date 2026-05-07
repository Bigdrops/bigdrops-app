const SETTLEMENT_TOLERANCE = 0.01

const roundCurrency = (value: number) => Math.round(value * 100) / 100

const normalizeAmount = (value: number | null | undefined) => {
  const numericValue = Number(value ?? 0)
  return Number.isFinite(numericValue) ? numericValue : 0
}

export interface PaymentEntrySummaryInput {
  balanceDue: number
  cashReceived: number | null | undefined
  whtDeducted: number | null | undefined
}

export interface PaymentEntrySummary {
  balanceDue: number
  cashReceived: number
  whtDeducted: number
  settlementTotal: number
  remainingBalance: number
  exceedsBalance: boolean
}

export interface PaymentEntryValidationResult {
  isValid: boolean
  message: string
  cashError: string
  whtError: string
}

export const OVER_BALANCE_MESSAGE =
  'Settlement cannot exceed the remaining balance. Cash received plus WHT deducted is greater than the amount due.'

export function getPaymentEntrySummary({
  balanceDue,
  cashReceived,
  whtDeducted,
}: PaymentEntrySummaryInput): PaymentEntrySummary {
  const normalizedBalance = Math.max(0, normalizeAmount(balanceDue))
  const normalizedCash = normalizeAmount(cashReceived)
  const normalizedWht = normalizeAmount(whtDeducted)
  const settlementTotal = roundCurrency(normalizedCash + normalizedWht)
  const exceedsBalance = settlementTotal > normalizedBalance + SETTLEMENT_TOLERANCE
  const remainingBalance = roundCurrency(
    Math.max(0, normalizedBalance - Math.min(settlementTotal, normalizedBalance))
  )

  return {
    balanceDue: normalizedBalance,
    cashReceived: normalizedCash,
    whtDeducted: normalizedWht,
    settlementTotal,
    remainingBalance,
    exceedsBalance,
  }
}

export function validatePaymentEntry(input: PaymentEntrySummaryInput): PaymentEntryValidationResult {
  const summary = getPaymentEntrySummary(input)
  const cashError = summary.cashReceived < 0 ? 'Cash received cannot be negative.' : ''
  const whtError = summary.whtDeducted < 0 ? 'WHT deducted cannot be negative.' : ''

  if (cashError || whtError) {
    return {
      isValid: false,
      message: cashError || whtError,
      cashError,
      whtError,
    }
  }

  if (summary.settlementTotal <= 0) {
    return {
      isValid: false,
      message: 'Enter cash received, WHT deducted, or both before recording payment.',
      cashError: '',
      whtError: '',
    }
  }

  if (summary.exceedsBalance) {
    return {
      isValid: false,
      message: OVER_BALANCE_MESSAGE,
      cashError: '',
      whtError: '',
    }
  }

  return {
    isValid: true,
    message: '',
    cashError: '',
    whtError: '',
  }
}

export function buildFullPaymentPreset(balanceDue: number, whtDeducted = 0) {
  const normalizedBalance = Math.max(0, normalizeAmount(balanceDue))
  const normalizedWht = Math.max(0, normalizeAmount(whtDeducted))
  return {
    cashReceived: roundCurrency(Math.max(0, normalizedBalance - normalizedWht)),
    whtDeducted: roundCurrency(normalizedWht),
  }
}
