export type InvoicePaymentState =
  | 'paid'
  | 'partially_paid'
  | 'unpaid'
  | 'overpaid'
  | 'archived'
  | 'cancelled'
  | 'void'
  | 'deleted'

export type InvoiceStatusTone = 'success' | 'warning' | 'info' | 'danger' | 'neutral'

export interface InvoiceFinancialState {
  settledAmount: number
  cashReceived: number
  whtSettled: number
  balanceDue: number
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
  const { invoiceTotal, status, payments = [], tolerance = 1 } = input

  // 1. Preserve terminal statuses
  const normalizedStatus = (status || '').toLowerCase()
  const terminalStatuses: Record<string, { state: InvoicePaymentState; label: string; tone: InvoiceStatusTone }> = {
    archived: { state: 'archived', label: 'Archived', tone: 'neutral' },
    cancelled: { state: 'cancelled', label: 'Cancelled', tone: 'danger' },
    canceled: { state: 'cancelled', label: 'Cancelled', tone: 'danger' },
    void: { state: 'void', label: 'Void', tone: 'danger' },
    deleted: { state: 'deleted', label: 'Deleted', tone: 'danger' },
  }

  if (terminalStatuses[normalizedStatus]) {
    const terminal = terminalStatuses[normalizedStatus]
    return {
      settledAmount: 0, // We don't necessarily care about settlement for archived/cancelled in this view
      cashReceived: 0,
      whtSettled: 0,
      balanceDue: Math.max(0, invoiceTotal),
      paymentState: terminal.state,
      displayStatus: terminal.label,
      statusTone: terminal.tone,
    }
  }

  // 2. Aggregate valid payments
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

  // 3. Determine payment state
  let paymentState: InvoicePaymentState = 'unpaid'
  let displayStatus = 'Unpaid'
  let statusTone: InvoiceStatusTone = 'info'

  if (settledAmount >= invoiceTotal - tolerance) {
    if (settledAmount > invoiceTotal + tolerance) {
      paymentState = 'overpaid'
      displayStatus = 'Overpaid'
      statusTone = 'warning'
    } else {
      paymentState = 'paid'
      displayStatus = 'Paid'
      statusTone = 'success'
    }
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
    paymentState,
    displayStatus,
    statusTone,
  }
}
