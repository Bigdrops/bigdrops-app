type AdvanceInvoiceLike = {
  thread_role?: string | null
  is_advance?: boolean | null
  total?: number | string | null
  total_contract_value?: number | string | null
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
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function isAdvanceInvoiceOutput(invoice: AdvanceInvoiceLike | null | undefined) {
  return invoice?.thread_role === 'advance' || invoice?.is_advance === true
}

export function getAdvanceSummaryValues(
  invoice: AdvanceInvoiceLike | null | undefined,
): AdvanceSummaryValues | null {
  if (!isAdvanceInvoiceOutput(invoice)) return null

  const contractValue = Math.max(0, toNumber(invoice?.total_contract_value))
  const thisAdvance = Math.max(0, toNumber(invoice?.total))
  const balanceRemaining = Math.max(0, contractValue - thisAdvance)

  const advancePercent = contractValue > 0 ? (thisAdvance / contractValue) * 100 : 0
  const balancePercent = Math.max(0, 100 - advancePercent)

  return {
    contractValue,
    thisAdvance,
    balanceRemaining,
    advancePercent: Math.round(advancePercent),
    balancePercent: Math.round(balancePercent),
    primaryLabel: invoice?.advance_primary_label || 'Advance Payable Now',
    secondaryLabel: invoice?.advance_secondary_label || 'Balance upon Completion',
  }
}
