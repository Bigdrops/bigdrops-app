import { getPdfSummaryLabels } from '@/domain/document/pdfSummaryLabels'
import { buildSummaryRows } from '../calculations'
import { getAdvanceSummaryValues } from '../advanceSummary'
import type { AdvanceSummaryValues } from '../advanceSummary'
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
  const summaryLabels = getPdfSummaryLabels(invoice, input.pdfOutput)

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
      valueClassName: row.tone === 'danger' ? 'text-red-600' : undefined,
    })),
    { label: 'Total', value: formatMoney(invoiceTotal), emphasis: true, valueClassName: 'text-slate-950' },
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
  const advanceSummary = getAdvanceSummaryValues(invoice)
  if (!advanceSummary) return null
  return {
    ...advanceSummary,
    requestedAmount: advanceSummary.thisAdvance,
  }
}
