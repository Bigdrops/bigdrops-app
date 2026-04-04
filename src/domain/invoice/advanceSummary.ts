type AdvanceInvoiceLike = {
  thread_role?: string | null
  is_advance?: boolean | null
  total?: number | string | null
  total_contract_value?: number | string | null
}

export type AdvanceSummaryValues = {
  contractValue: number
  thisAdvance: number
  balanceRemaining: number
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

  return {
    contractValue,
    thisAdvance,
    balanceRemaining: Math.max(0, contractValue - thisAdvance),
  }
}
