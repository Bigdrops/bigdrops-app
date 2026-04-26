import {
  ADVANCE_PRIMARY_LABEL_DEFAULT,
  ADVANCE_SECONDARY_LABEL_DEFAULT,
} from './advanceChildFlow'

import { safeParseJson } from '@/lib/json/safeParseJson'

type AdvanceInvoiceLike = {
  custom_fields?: any
  total?: number | string | null
  advance_primary_label?: string | null
  advance_secondary_label?: string | null
}

export type AdvanceSummaryValues = {
  contractValue: number
  thisAdvance: number
  balanceRemaining: number
  advancePercent: number
  balancePercent: number
  primaryLabel: string
  secondaryLabel: string
  primaryLabelWithPercent: string
  secondaryLabelWithPercent: string
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function isAdvanceInvoiceOutput(invoice: AdvanceInvoiceLike | null | undefined) {
  const advanceConfig = invoice?.custom_fields?.advance_invoice
  if (typeof invoice?.custom_fields === 'string') {
    const parsed = safeParseJson(invoice.custom_fields, {} as any)
    return parsed?.advance_invoice?.role === 'advance'
  }
  return advanceConfig?.role === 'advance'
}

export function getAdvanceSummaryValues(
  invoice: AdvanceInvoiceLike | null | undefined,
): AdvanceSummaryValues | null {
  if (!isAdvanceInvoiceOutput(invoice)) return null

  let advanceConfig = invoice?.custom_fields?.advance_invoice
  if (typeof invoice?.custom_fields === 'string') {
    const parsed = safeParseJson(invoice.custom_fields, {} as any)
    advanceConfig = parsed?.advance_invoice
  }

  const contractValue = Math.max(0, toNumber(advanceConfig?.contractValue))
  const thisAdvance = Math.max(0, toNumber(invoice?.total))
  const balanceRemaining = Math.max(0, contractValue - thisAdvance)

  const advancePercent = contractValue > 0 ? (thisAdvance / contractValue) * 100 : 0
  const balancePercent = Math.max(0, 100 - advancePercent)
  const roundedAdvancePercent = Math.round(advancePercent)
  const roundedBalancePercent = Math.round(balancePercent)
  const primaryLabel = advanceConfig?.primaryLabel || ADVANCE_PRIMARY_LABEL_DEFAULT
  const secondaryLabel = advanceConfig?.secondaryLabel || ADVANCE_SECONDARY_LABEL_DEFAULT

  return {
    contractValue,
    thisAdvance,
    balanceRemaining,
    advancePercent: roundedAdvancePercent,
    balancePercent: roundedBalancePercent,
    primaryLabel,
    secondaryLabel,
    primaryLabelWithPercent: `${primaryLabel} (${Math.round(advancePercent)}%)`,
    secondaryLabelWithPercent: `${secondaryLabel} (${Math.round(balancePercent)}%)`,
  }
}
