type InvoiceWhtLike = {
  wht?: number | string | null
}

type PaymentWhtLike = {
  id: string
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
  const receiptByPaymentId = new Map(receipts.map((receipt) => [receipt.payment_id, receipt]))

  const awaitingReceiptPayments = payments.filter((payment) => {
    const paymentWht = getAmount(payment.wht_amount)
    if (paymentWht <= 0) return false

    const receipt = receiptByPaymentId.get(payment.id)
    return !receipt || receipt.receipt_status !== 'verified'
  })

  return {
    expectedWhtAmount: expectedWhtInvoices.reduce((sum, invoice) => sum + getAmount(invoice.wht), 0),
    expectedWhtInvoiceCount: expectedWhtInvoices.length,
    actualWhtAwaitingReceiptAmount: awaitingReceiptPayments.reduce(
      (sum, payment) => sum + getAmount(payment.wht_amount),
      0,
    ),
    actualWhtPaymentCount: awaitingReceiptPayments.length,
  }
}
