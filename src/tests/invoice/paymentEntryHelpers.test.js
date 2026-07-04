import {
  OVER_BALANCE_MESSAGE,
  getPaymentEntrySummary,
  validatePaymentEntry,
} from '../../components/invoice/paymentEntryHelpers.ts'

const test = globalThis.test || ((name, fn) => fn())
const expect = globalThis.expect || ((value) => ({
  toBe: (expected) => {
    if (value !== expected) {
      throw new Error(`Expected ${expected} but got ${value}`)
    }
  },
}))

test('cash 100, balance 100 -> valid settlement 100', () => {
  const summary = getPaymentEntrySummary({ balanceDue: 100, cashReceived: 100 })
  const validation = validatePaymentEntry({ balanceDue: 100, cashReceived: 100 })

  expect(summary.settlementTotal).toBe(100)
  expect(summary.remainingBalance).toBe(0)
  expect(validation.isValid).toBe(true)
})

test('cash 0 -> invalid', () => {
  const validation = validatePaymentEntry({ balanceDue: 100, cashReceived: 0 })

  expect(validation.isValid).toBe(false)
  expect(validation.message).toBe('Enter cash received before recording payment.')
})

test('cash exceeds balance -> invalid over-balance', () => {
  const validation = validatePaymentEntry({ balanceDue: 100, cashReceived: 101 })

  expect(validation.isValid).toBe(false)
  expect(validation.message).toBe(OVER_BALANCE_MESSAGE)
})

test('negative cash -> invalid', () => {
  const validation = validatePaymentEntry({ balanceDue: 100, cashReceived: -1 })

  expect(validation.isValid).toBe(false)
  expect(validation.cashError).toBe('Cash received cannot be negative.')
})
