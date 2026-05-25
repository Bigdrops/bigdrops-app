type InvoiceWhtLike = {
  id?: string | null
  wht?: number | string | null
}

type PaymentWhtLike = {
  id: string
  invoice_id?: string | null
  wht_amount?: number | string | null
}

type WhtReceiptLike = {
  payment_id: string
  receipt_status?: string | null
}

export interface ComplianceWhtSummary {
  expectedWhtAmount: number
  expectedWhtInvoiceCount: number
  actualWhtAwaitingReceiptAmount: number
  actualWhtPaymentCount: number
}

const getAmount = (value?: number | string | null) => Number(value || 0)

export function summarizeComplianceWht(
  invoices: InvoiceWhtLike[],
  payments: PaymentWhtLike[],
  receipts: WhtReceiptLike[],
): ComplianceWhtSummary {
  const expectedWhtInvoices = invoices.filter((invoice) => getAmount(invoice.wht) > 0)
  const whtInvoiceIds = new Set(
    expectedWhtInvoices.map((invoice) => invoice.id).filter(Boolean)
  )

  const receiptByPaymentId = new Map(receipts.map((receipt) => [receipt.payment_id, receipt]))

  // Cross-reference payments with their parent invoices:
  // A payment is considered WHT-relevant if it belongs to an invoice with configured WHT.
  const awaitingReceiptPayments = payments.filter((payment) => {
    if (!payment.invoice_id || !whtInvoiceIds.has(payment.invoice_id)) return false

    const receipt = receiptByPaymentId.get(payment.id)
    return !receipt || receipt.receipt_status !== 'verified'
  })

  // Compute expected WHT per payment based on the parent invoice's configured WHT amount.
  const invoiceWhtMap = new Map(
    expectedWhtInvoices.map((invoice) => [invoice.id, getAmount(invoice.wht)])
  )

  return {
    expectedWhtAmount: expectedWhtInvoices.reduce((sum, invoice) => sum + getAmount(invoice.wht), 0),
    expectedWhtInvoiceCount: expectedWhtInvoices.length,
    actualWhtAwaitingReceiptAmount: awaitingReceiptPayments.reduce(
      (sum, payment) => {
        // Use the payment's recorded wht_amount if available (historical data),
        // otherwise fall back to the invoice-level configured WHT as the baseline.
        const paymentWht = getAmount(payment.wht_amount)
        if (paymentWht > 0) return sum + paymentWht
        return sum + (invoiceWhtMap.get(payment.invoice_id!) || 0)
      },
      0,
    ),
    actualWhtPaymentCount: awaitingReceiptPayments.length,
  }
}
