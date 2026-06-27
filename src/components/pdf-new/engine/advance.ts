type AdvanceInput = {
  primaryLabel: string | null
  advanceAmount: string | null
  secondaryLabel: string | null
  balanceRemaining: string | null
} | null

type AdvanceSummary = {
  primaryLabel: string
  advanceAmount: string
  secondaryLabel: string
  balanceRemaining: string
}

export function buildAdvanceSummary(
  advanceData: AdvanceInput
): AdvanceSummary | null {
  if (!advanceData) return null
  if (!advanceData.advanceAmount && !advanceData.balanceRemaining) return null

  return {
    primaryLabel: advanceData.primaryLabel || 'Advance Paid',
    advanceAmount: advanceData.advanceAmount || '',
    secondaryLabel: advanceData.secondaryLabel || 'Balance Remaining',
    balanceRemaining: advanceData.balanceRemaining || '',
  }
}
