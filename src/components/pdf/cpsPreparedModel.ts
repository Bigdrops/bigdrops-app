/**
 * Shared CPS PDF prepared model.
 *
 * Renderer-neutral contract consumed by every CPS Forme template
 * (Schedule, Compact, Ledger, Industry). Templates own presentation.
 * The handler owns mapping. The calculation engine owns financial truth.
 *
 * This module carries the shared contract plus tiny presentation-neutral
 * helpers with more than one template consumer. No renderer imports.
 * No calculations.
 */

export type CpsPdfColumnKey = 'no' | 'description' | 'qty' | 'cp' | 'sp' | 'total'

export interface CpsPdfRow {
  key: string
  kind: 'group' | 'item' | 'group-subtotal'
  number: string
  groupId: string | null
  title: string
  description: string
  specification: string
  make: string
  quantityText: string
  quantityValue: number
  unitText: string
  cpText: string
  spText: string
  totalText: string
  totalCostText: string
  imageDataUri: string | null
  imageHref: string | null
}

export interface CpsPdfGroup {
  id: string
  title: string
  itemCount: string
  subtotalText: string
  costSubtotalText: string
}

export interface CpsPdfModel {
  title: string
  number: string
  issueDate: string
  status: string
  currency: string
  companyName: string
  logoDataUri: string | null
  companyLines: string[]
  clientName: string
  clientLines: string[]
  site: string
  notes: string
  fontFamily: string
  accent: string | null
  orientation: 'portrait' | 'landscape'
  visibleColumns: CpsPdfColumnKey[]
  rows: CpsPdfRow[]
  groups: CpsPdfGroup[]
  totals: Array<{ label: string; display: string; emphasis?: boolean }>
}

/**
 * Keys of item rows that sit inside a group wall, in document order.
 * Lets templates continue side boundaries without render-phase mutation.
 */
export function groupedItemKeys(rows: CpsPdfRow[]): Set<string> {
  const keys = new Set<string>()
  let open: string | null = null
  for (const row of rows) {
    if (row.kind === 'group') open = row.groupId
    else if (row.kind === 'group-subtotal') open = null
    else if (open !== null && row.groupId === open) keys.add(row.key)
  }
  return keys
}

/**
 * Display formatting for a prepared quantity. Formatting only;
 * the numeric value arrives prepared from view data.
 */
export function formatQuantityValue(value: number): string {
  return Number(value || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })
}
