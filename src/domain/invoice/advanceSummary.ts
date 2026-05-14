import {
  ADVANCE_PRIMARY_LABEL_DEFAULT,
  ADVANCE_SECONDARY_LABEL_DEFAULT,
} from './advanceChildFlow'
import {
  getAdvanceInvoiceMetadata,
} from './advanceMetadata'

type AdvanceInvoiceLike = {
  custom_fields?: any
  total?: number | string | null
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
  return getAdvanceInvoiceMetadata(invoice) !== null
}

export function getAdvanceSummaryValues(
  invoice: AdvanceInvoiceLike | null | undefined,
): AdvanceSummaryValues | null {
  const parentMetadata = getAdvanceInvoiceMetadata(invoice)

  if (!parentMetadata) return null

  const contractValue = Math.max(0, toNumber(parentMetadata.contract_value ?? invoice?.total))
  const thisAdvance = Math.max(0, toNumber(parentMetadata.amount ?? invoice?.total))
  const balanceRemaining = Math.max(0, contractValue - thisAdvance)

  const advancePercent = contractValue > 0 ? (thisAdvance / contractValue) * 100 : 0
  const balancePercent = Math.max(0, 100 - advancePercent)
  const roundedAdvancePercent = Math.round(advancePercent)
  const roundedBalancePercent = Math.round(balancePercent)

  const primaryLabel =
    parentMetadata.primary_label ||
    ADVANCE_PRIMARY_LABEL_DEFAULT
  const secondaryLabel =
    parentMetadata.secondary_label ||
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
