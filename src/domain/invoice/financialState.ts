export type InvoicePaymentState =
  | 'paid'
  | 'partially_paid'
  | 'unpaid'

export type InvoiceStatusTone = 'success' | 'warning' | 'info' | 'danger' | 'neutral'

export interface InvoiceFinancialState {
  settledAmount: number
  cashReceived: number
  whtSettled: number
  balanceDue: number
  overpaymentAmount: number
  paymentState: InvoicePaymentState
  displayStatus: string
  statusTone: InvoiceStatusTone
}

export interface PaymentInput {
  amount?: number | null
  cash_amount?: number | null
  wht_amount?: number | null
  voided_at?: string | null
}

export function calculateInvoiceFinancialState(input: {
  invoiceTotal: number
  status?: string | null
  payments?: PaymentInput[]
  tolerance?: number
}): InvoiceFinancialState {
  const { invoiceTotal, payments = [], tolerance = 1 } = input

  let cashReceived = 0
  let whtSettled = 0

  for (const p of payments) {
    if (p.voided_at) continue

    const cash = Number(p.cash_amount ?? p.amount ?? 0)
    const wht = Number(p.wht_amount ?? 0)

    if (Number.isFinite(cash) && cash > 0) {
      cashReceived += cash
    }
    if (Number.isFinite(wht) && wht > 0) {
      whtSettled += wht
    }
  }

  const settledAmount = cashReceived + whtSettled
  const balanceDue = Math.max(0, invoiceTotal - settledAmount)
  const overpaymentAmount = settledAmount > invoiceTotal + tolerance ? settledAmount - invoiceTotal : 0

  let paymentState: InvoicePaymentState = 'unpaid'
  let displayStatus = 'Unpaid'
  let statusTone: InvoiceStatusTone = 'info'

  if (settledAmount >= invoiceTotal) {
    paymentState = 'paid'
    displayStatus = 'Paid'
    statusTone = 'success'
  } else if (settledAmount > tolerance) {
    paymentState = 'partially_paid'
    displayStatus = 'Partially Paid'
    statusTone = 'warning'
  }

  return {
    settledAmount,
    cashReceived,
    whtSettled,
    balanceDue,
    overpaymentAmount,
    paymentState,
    displayStatus,
    statusTone,
  }
}
