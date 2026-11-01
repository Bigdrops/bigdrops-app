type TotalsInput = {
  lines: Array<{ label: string; value: string; isDeduction?: boolean }>
  mainLine: { label: string; value: string } | null
  amountInWords: string
  balanceDue: { label: string; value: string } | null
}

export function buildTotalsLines(
  totals: TotalsInput
): Array<{ label: string; value: string; isDeduction?: boolean }> {
  return totals.lines
}

export function getMainTotal(
  totals: TotalsInput
): { label: string; value: string } | null {
  return totals.mainLine || null
}

export function getBalanceDue(
  totals: TotalsInput
): { label: string; value: string } | null {
  return totals.balanceDue || null
}

export function getAmountInWords(totals: TotalsInput): string {
  return totals.amountInWords || ''
}
