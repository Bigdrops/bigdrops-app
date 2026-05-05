import { calculateInvoiceFinancialState } from '../../domain/invoice/financialState'

// Small mock for Jest-like environment if not present, though we assume a runner exists if "feasible"
const describe = globalThis.describe || ((name, fn) => fn())
const test = globalThis.test || ((name, fn) => fn())
const expect = globalThis.expect || ((val) => ({ toBe: (expected) => { if (val !== expected) throw new Error(`Expected ${expected} but got ${val}`) } }))

describe('calculateInvoiceFinancialState', () => {
  const tolerance = 1

  test('invoice total 100, no payments -> unpaid', () => {
    const result = calculateInvoiceFinancialState({
      invoiceTotal: 100,
      payments: [],
      tolerance,
    })
    expect(result.paymentState).toBe('unpaid')
    expect(result.displayStatus).toBe('Unpaid')
    expect(result.balanceDue).toBe(100)
  })

  test('invoice total 100, payment amount 40 -> partially paid, balance 60', () => {
    const result = calculateInvoiceFinancialState({
      invoiceTotal: 100,
      payments: [{ amount: 40 }],
      tolerance,
    })
    expect(result.paymentState).toBe('partially_paid')
    expect(result.displayStatus).toBe('Partially Paid')
    expect(result.balanceDue).toBe(60)
    expect(result.settledAmount).toBe(40)
  })

  test('invoice total 100, cash 40 + WHT 10 -> partially paid', () => {
    const result = calculateInvoiceFinancialState({
      invoiceTotal: 100,
      payments: [{ cash_amount: 40, wht_amount: 10 }],
      tolerance,
    })
    expect(result.paymentState).toBe('partially_paid')
    expect(result.displayStatus).toBe('Partially Paid')
    expect(result.balanceDue).toBe(50)
    expect(result.settledAmount).toBe(50)
  })

  test('invoice total 100, payment amount 100 -> paid', () => {
    const result = calculateInvoiceFinancialState({
      invoiceTotal: 100,
      payments: [{ amount: 100 }],
      tolerance,
    })
    expect(result.paymentState).toBe('paid')
    expect(result.displayStatus).toBe('Paid')
    expect(result.balanceDue).toBe(0)
  })

  test('invoice total 100, cash 95 + WHT 5 -> paid', () => {
    const result = calculateInvoiceFinancialState({
      invoiceTotal: 100,
      payments: [{ cash_amount: 95, wht_amount: 5 }],
      tolerance,
    })
    expect(result.paymentState).toBe('paid')
    expect(result.displayStatus).toBe('Paid')
    expect(result.balanceDue).toBe(0)
  })

  test('invoice total 100, cash 101 -> overpaid', () => {
    const result = calculateInvoiceFinancialState({
      invoiceTotal: 100,
      payments: [{ cash_amount: 101 }],
      tolerance,
    })
    expect(result.paymentState).toBe('overpaid')
    expect(result.displayStatus).toBe('Overpaid')
    expect(result.balanceDue).toBe(0)
  })

  test('archived invoice preserves status', () => {
    const result = calculateInvoiceFinancialState({
      invoiceTotal: 100,
      status: 'archived',
      payments: [{ amount: 40 }],
    })
    expect(result.paymentState).toBe('archived')
    expect(result.displayStatus).toBe('Archived')
  })

  test('cancelled invoice preserves status', () => {
    const result = calculateInvoiceFinancialState({
      invoiceTotal: 100,
      status: 'cancelled',
      payments: [],
    })
    expect(result.paymentState).toBe('cancelled')
    expect(result.displayStatus).toBe('Cancelled')
  })

  test('tolerance: total 100, settled 99.5 with tolerance 1 -> paid', () => {
    const result = calculateInvoiceFinancialState({
      invoiceTotal: 100,
      payments: [{ amount: 99.5 }],
      tolerance: 1,
    })
    expect(result.paymentState).toBe('paid')
    expect(result.displayStatus).toBe('Paid')
  })

  test('voided payments are ignored', () => {
    const result = calculateInvoiceFinancialState({
      invoiceTotal: 100,
      payments: [
        { amount: 50 },
        { amount: 50, voided_at: '2023-01-01' }
      ],
      tolerance,
    })
    expect(result.paymentState).toBe('partially_paid')
    expect(result.settledAmount).toBe(50)
  })
})
