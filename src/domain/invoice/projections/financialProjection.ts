import { getPdfSummaryLabels } from '@/domain/document/pdfSummaryLabels'
import { buildSummaryRows } from '../calculations'
import { getAdvanceSummaryValues } from '../advanceSummary'
import { calculateInvoiceFinancialState } from '../financialState'
import type { AdvanceSummaryValues } from '../advanceSummary'
import type { PaymentInput } from '../financialState'
import type {
  PreviewTotalRow,
  InvoiceLike,
  CustomFieldObjectLike,
  PdfOutputLike,
} from '../renderTypes'

export type TotalsProjectionInput = {
  invoice: InvoiceLike
  totals?: {
    rawSubtotal?: number
    vatAmount?: number
    discountAmount?: number
    whtAmount?: number
    installRateTotal?: number
  }
  customFieldObject?: CustomFieldObjectLike
  invoiceTotal: number
  balanceDue: number
  pdfOutput?: PdfOutputLike
  formatMoney: (value: number) => string
}

export function buildTotalsProjection(
  input: TotalsProjectionInput,
): PreviewTotalRow[] {
  const { invoice, totals, customFieldObject, invoiceTotal, formatMoney } = input
  const summaryLabels = getPdfSummaryLabels(invoice)

  return [
    ...buildSummaryRows({
      invoice,
      totals,
      customFields: customFieldObject,
      chargeLabels: customFieldObject?.chargeLabels,
      summaryLabels,
    }).map((row) => ({
      label: row.label,
      value: formatMoney(Number(row.amount || 0)),
      rawAmount: Number(row.amount || 0),
      valueClassName: row.tone === 'danger' ? 'text-red-600' : undefined,
    })),
    { label: 'Total', value: formatMoney(invoiceTotal), rawAmount: invoiceTotal, emphasis: true, valueClassName: 'text-slate-950' },
  ]
}

export function buildBalanceDisplayProjection(
  balanceDue: number,
  pdfOutput?: PdfOutputLike,
  formatMoney?: (value: number) => string,
): PreviewTotalRow | null {
  if (pdfOutput?.showBalanceDue === false) return null
  if (!formatMoney) return null
  return {
    label: 'Balance Due',
    value: formatMoney(balanceDue),
    emphasis: true,
    valueClassName: balanceDue > 0 ? 'text-red-600' : 'text-emerald-600',
  }
}

export function buildAmountInWordsProjection(
  invoice: InvoiceLike,
  pdfOutput?: PdfOutputLike,
): string {
  return pdfOutput?.showAmountInWords === false ? '' : String(invoice.amount_in_words || '')
}

export function buildAdvanceDisplayProjection(
  invoice: InvoiceLike,
): (AdvanceSummaryValues & { requestedAmount: number }) | null {
  // Advance summary ONLY renders when the invoice is explicitly an advance context
  // (i.e., a virtual projection). Main invoices must NEVER show advance breakdown UI.
  const isAdvanceContext = (invoice as any)?.isVirtualProjection === true
  if (!isAdvanceContext) return null

  const advanceSummary = getAdvanceSummaryValues(invoice)
  if (!advanceSummary) return null
  return {
    ...advanceSummary,
    requestedAmount: advanceSummary.thisAdvance,
  }
}

export type PaymentSummaryProjection = {
  settledTotal: number
  settledTotalFormatted: string
  cashReceived: number
  cashReceivedFormatted: string
  whtSettled: number
  whtSettledFormatted: string
  balanceDue: number
  balanceDueFormatted: string
  paymentProgress: number
  paymentState: string
  formatMoney: (value: number) => string
}

export function buildPaymentSummaryProjection(
  invoiceTotal: number,
  payments: PaymentInput[],
  formatMoney: (value: number) => string,
): PaymentSummaryProjection {
  const financialState = calculateInvoiceFinancialState({ invoiceTotal, payments })

  const paymentProgress = invoiceTotal > 0
    ? Math.min(100, Math.round((financialState.settledAmount / invoiceTotal) * 100))
    : 0

  return {
    settledTotal: financialState.settledAmount,
    settledTotalFormatted: formatMoney(financialState.settledAmount),
    cashReceived: financialState.cashReceived,
    cashReceivedFormatted: formatMoney(financialState.cashReceived),
    whtSettled: financialState.whtSettled,
    whtSettledFormatted: formatMoney(financialState.whtSettled),
    balanceDue: financialState.balanceDue,
    balanceDueFormatted: formatMoney(financialState.balanceDue),
    paymentProgress,
    paymentState: financialState.displayStatus,
    formatMoney,
  }
}
