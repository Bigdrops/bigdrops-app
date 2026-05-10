import type { InvoiceFinancialState } from '@/domain/invoice/financialState'

export class InvoiceWorkflowError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvoiceWorkflowError'
  }
}

export function guardCanDeleteInvoice(financials: InvoiceFinancialState | null) {
  const hasPayments = (financials?.settledAmount || 0) > 0
  if (hasPayments) {
    throw new InvoiceWorkflowError('Cannot delete an invoice with recorded payments. Void payments first.')
  }
}

export function guardCanRevertInvoice(financials: InvoiceFinancialState | null) {
  const hasPayments = (financials?.settledAmount || 0) > 0
  if (hasPayments) {
    throw new InvoiceWorkflowError('Cannot revert an invoice with recorded payments. Void payments first.')
  }
}

export function guardCanArchiveInvoice(invoice: any) {
  if (invoice?.archived_at) {
    throw new InvoiceWorkflowError('Invoice is already archived.')
  }
}
