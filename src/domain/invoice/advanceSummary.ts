import {
  ADVANCE_PRIMARY_LABEL_DEFAULT,
  ADVANCE_SECONDARY_LABEL_DEFAULT,
} from './advanceChildFlow'
import {
  getAdvanceInvoiceMetadata,
  isAdvanceInvoiceChild,
} from './advanceMetadata'

import { safeParseJson } from '../../lib/json/safeParseJson'

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
  return isAdvanceInvoiceChild(invoice)
}

export function getAdvanceSummaryValues(
  invoice: AdvanceInvoiceLike | null | undefined,
): AdvanceSummaryValues | null {
  const parentMetadata = getAdvanceInvoiceMetadata(invoice)
  const isChildOutput = isAdvanceInvoiceOutput(invoice)

  if (!parentMetadata && !isChildOutput) return null

  let advanceConfig = invoice?.custom_fields?.advance_invoice
  if (typeof invoice?.custom_fields === 'string') {
    const parsed = safeParseJson(invoice.custom_fields, {} as any)
    advanceConfig = parsed?.advance_invoice
  }

  const contractValue = Math.max(
    0,
    toNumber(parentMetadata?.contract_value ?? advanceConfig?.contractValue ?? invoice?.total),
  )
  const thisAdvance = Math.max(
    0,
    toNumber(parentMetadata?.amount ?? invoice?.total),
  )
  const balanceRemaining = Math.max(0, contractValue - thisAdvance)

  const advancePercent = contractValue > 0 ? (thisAdvance / contractValue) * 100 : 0
  const balancePercent = Math.max(0, 100 - advancePercent)
  const roundedAdvancePercent = Math.round(advancePercent)
  const roundedBalancePercent = Math.round(balancePercent)
  const primaryLabel =
    parentMetadata?.primary_label ||
    advanceConfig?.primaryLabel ||
    advanceConfig?.primary_label ||
    ADVANCE_PRIMARY_LABEL_DEFAULT
  const secondaryLabel =
    parentMetadata?.secondary_label ||
    advanceConfig?.secondaryLabel ||
    advanceConfig?.secondary_label ||
    ADVANCE_SECONDARY_LABEL_DEFAULT

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
