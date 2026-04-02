import { getDocumentActionState, getProjectActionState } from '@/domain/document/documentActionState'

function toNumber(value) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function buildInvoiceViewModel({
  invoice,
  items,
  payments,
  relatedCsrs,
  relatedWaybills,
  financials,
  project,
  sourceDocument,
}) {
  const safeInvoice = invoice || {}
  const safePayments = Array.isArray(payments) ? payments : []
  const safeRelatedCsrs = Array.isArray(relatedCsrs) ? relatedCsrs : []
  const safeRelatedWaybills = Array.isArray(relatedWaybills) ? relatedWaybills : []

  const computedStatus = financials?.computed_status || safeInvoice.status || 'draft'
  const statusLabel = String(computedStatus || '').replace(/_/g, ' ')
  const invoiceTotal = toNumber(safeInvoice.total)
  const cashReceived = toNumber(financials?.cash_received)
  const settledTotal = toNumber(financials?.settled_total || cashReceived)
  const balanceDue = Math.max(0, toNumber(financials?.balance_due ?? invoiceTotal - settledTotal))

  const paymentHistory = (() => {
    let runningBalance = invoiceTotal
    return safePayments.map((payment) => {
      const cash = toNumber(payment.cash_amount)
      const total = cash + toNumber(payment.wht_amount)
      if (!payment.voided_at) {
        runningBalance = Math.max(0, runningBalance - total)
      }
      return {
        ...payment,
        cash,
        total,
        runningBalance,
      }
    })
  })()

  const activePaymentCount = safePayments.filter((payment) => !payment.voided_at).length
  const activePaymentTotal = safePayments.reduce((sum, payment) => {
    if (payment.voided_at) return sum
    return sum + toNumber(payment.cash_amount) + toNumber(payment.wht_amount)
  }, 0)
  const paymentCount = safePayments.length
  const paymentTotal = safePayments.reduce((sum, payment) => {
    return sum + toNumber(payment.cash_amount) + toNumber(payment.wht_amount)
  }, 0)

  const relatedDocuments = [...safeRelatedCsrs, ...safeRelatedWaybills]
  const projectState = getProjectActionState({ projectId: safeInvoice.project_id, project })
  const documentState = getDocumentActionState({ sourceDocument, relatedDocuments })

  const statusBadgeClass =
    computedStatus === 'paid'
      ? 'bg-emerald-50 text-emerald-700'
      : computedStatus === 'overdue'
        ? 'bg-red-50 text-red-700'
        : computedStatus === 'sent'
          ? 'bg-blue-50 text-blue-700'
          : computedStatus === 'partial'
            ? 'bg-amber-50 text-amber-700'
            : 'bg-slate-100 text-slate-700'

  const canRecordPayment = computedStatus !== 'paid'

  return {
    computedStatus,
    statusLabel,
    statusBadgeClass,
    invoiceTotal,
    cashReceived,
    settledTotal,
    balanceDue,
    paymentHistory,
    paymentCount,
    activePaymentCount,
    paymentTotal,
    activePaymentTotal,
    hasLinkedDocuments: documentState.hasLinkedDocuments,
    hasProject: projectState.hasProject,
    canRecordPayment,
    projectActionLabel: projectState.label,
    documentActionLabel: documentState.label,
  }
}
