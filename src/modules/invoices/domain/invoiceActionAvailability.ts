import type { InvoiceFinancialState } from '@/domain/invoice/financialState'

export interface InvoiceActionAvailability {
  canEdit: boolean
  canDelete: boolean
  canArchive: boolean
  canRevert: boolean
  canRecordPayment: boolean
  canVoidPayment: boolean
  canGenerateWaybill: boolean
  canCreateAdvance: boolean
}

export function getInvoiceActionAvailability(params: {
  invoice: any
  financials: InvoiceFinancialState | null
}): InvoiceActionAvailability {
  const { invoice, financials } = params
  const status = financials?.paymentState || invoice?.status || 'unpaid'
  const isPaid = status === 'paid'
  const isArchived = !!invoice?.archived_at
  const hasPayments = (financials?.settledAmount || 0) > 0

  return {
    canEdit: !isArchived,
    canDelete: !hasPayments && !isArchived,
    canArchive: !isArchived,
    canRevert: !hasPayments && !isArchived,
    canRecordPayment: !isPaid && !isArchived,
    canVoidPayment: hasPayments && !isArchived,
    canGenerateWaybill: !isArchived,
    canCreateAdvance: !isPaid && !isArchived,
  }
}
