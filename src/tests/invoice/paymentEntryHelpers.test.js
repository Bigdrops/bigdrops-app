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

test('cash 100, WHT 0, balance 100 -> valid settlement 100', () => {
  const summary = getPaymentEntrySummary({
    balanceDue: 100,
    cashReceived: 100,
    whtDeducted: 0,
  })
  const validation = validatePaymentEntry({
    balanceDue: 100,
    cashReceived: 100,
    whtDeducted: 0,
  })

  expect(summary.settlementTotal).toBe(100)
  expect(summary.remainingBalance).toBe(0)
  expect(validation.isValid).toBe(true)
})

test('cash 95, WHT 5, balance 100 -> valid settlement 100', () => {
  const summary = getPaymentEntrySummary({
    balanceDue: 100,
    cashReceived: 95,
    whtDeducted: 5,
  })
  const validation = validatePaymentEntry({
    balanceDue: 100,
    cashReceived: 95,
    whtDeducted: 5,
  })

  expect(summary.settlementTotal).toBe(100)
  expect(summary.remainingBalance).toBe(0)
  expect(validation.isValid).toBe(true)
})

test('cash 0, WHT 5, balance 100 -> valid settlement 5', () => {
  const summary = getPaymentEntrySummary({
    balanceDue: 100,
    cashReceived: 0,
    whtDeducted: 5,
  })
  const validation = validatePaymentEntry({
    balanceDue: 100,
    cashReceived: 0,
    whtDeducted: 5,
  })

  expect(summary.settlementTotal).toBe(5)
  expect(summary.remainingBalance).toBe(95)
  expect(validation.isValid).toBe(true)
})

test('cash 0, WHT 0 -> invalid', () => {
  const validation = validatePaymentEntry({
    balanceDue: 100,
    cashReceived: 0,
    whtDeducted: 0,
  })

  expect(validation.isValid).toBe(false)
  expect(validation.message).toBe('Enter cash received, WHT deducted, or both before recording payment.')
})

test('cash 100, WHT 1, balance 100 -> invalid over-balance', () => {
  const validation = validatePaymentEntry({
    balanceDue: 100,
    cashReceived: 100,
    whtDeducted: 1,
  })

  expect(validation.isValid).toBe(false)
  expect(validation.message).toBe(OVER_BALANCE_MESSAGE)
})

test('negative WHT -> invalid', () => {
  const validation = validatePaymentEntry({
    balanceDue: 100,
    cashReceived: 50,
    whtDeducted: -1,
  })

  expect(validation.isValid).toBe(false)
  expect(validation.whtError).toBe('WHT deducted cannot be negative.')
})
