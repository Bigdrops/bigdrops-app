import type { CommercialDocumentData } from '../industryAdapter'

const MIN_DESCRIPTION_WIDTH = 120

/**
 * Standard column widths in points for the industrial engineering schedule
 * based on physical millimeter specifications in commercial-industrial.html
 */
const INDUSTRIAL_FIXED_WIDTHS: Record<string, number> = {
  num: 26, // 9mm
  quantity: 34, // 12mm
  unit: 40, // 14mm
  make: 56,
  unit_price: 72, // 25mm
  amount: 80, // 28mm
  install_rate: 68,
  vat_rate: 36,
  discount_rate: 42,
}

/**
 * Narrowest legible width for each fixed column. These bounds let the widest
 * supported optional-column combination fit without overflowing the page.
 */
const INDUSTRIAL_MIN_WIDTHS: Record<string, number> = {
  num: 22,
  quantity: 30,
  unit: 34,
  make: 44,
  unit_price: 62,
  amount: 70,
  install_rate: 56,
  vat_rate: 32,
  discount_rate: 36,
}

function roundWidth(value: number): number {
  return Math.max(0, Math.round(value * 100) / 100)
}

/**
 * Allocate column widths that always sum to the available table width.
 *
 * Fixed columns keep their preferred width while they fit. When optional
 * columns would overflow, fixed columns shrink toward their legible minimums
 * before the description loses any space.
 */
export function resolveIndustrialTableWidths(
  columns: CommercialDocumentData['table']['columns'],
  availableWidth: number,
): Array<{ width: { fixed: number } }> {
  if (columns.length === 0) return []

  const descIndex = columns.findIndex((column) => column.key === 'description')
  const desired = columns.map((column) => {
    if (column.key === 'description') return 0
    if (column.width && column.width > 0) return column.width
    return INDUSTRIAL_FIXED_WIDTHS[column.key] ?? 56
  })
  const minimums = columns.map((column) =>
    column.key === 'description' ? MIN_DESCRIPTION_WIDTH : INDUSTRIAL_MIN_WIDTHS[column.key] ?? 44,
  )

  const fixedTotal = desired.reduce((sum, value, index) => (index === descIndex ? sum : sum + value), 0)
  const fixedMinimumTotal = minimums.reduce((sum, value, index) => (index === descIndex ? sum : sum + value), 0)

  let widths = desired.slice()

  if (descIndex >= 0) {
    const descFloor = Math.min(MIN_DESCRIPTION_WIDTH, Math.max(0, availableWidth - fixedMinimumTotal))
    widths[descIndex] = Math.max(descFloor, availableWidth - fixedTotal)
  }

  const total = () => widths.reduce((sum, value) => sum + value, 0)

  if (total() > availableWidth) {
    const overflow = total() - availableWidth
    const shrinkable = desired.reduce((sum, value, index) => {
      if (index === descIndex) return sum
      return sum + Math.max(0, value - minimums[index])
    }, 0)

    if (shrinkable > 0) {
      const factor = Math.min(1, overflow / shrinkable)
      widths = widths.map((value, index) => {
        if (index === descIndex) return value
        return value - Math.max(0, desired[index] - minimums[index]) * factor
      })
    }

    if (total() > availableWidth) {
      const scale = availableWidth / total()
      widths = widths.map((value) => value * scale)
    }
  }

  const rounded = widths.map(roundWidth)
  if (rounded.length > 0) {
    const remainderIndex = descIndex >= 0 ? descIndex : rounded.length - 1
    const others = rounded.reduce((sum, value, index) => (index === remainderIndex ? sum : sum + value), 0)
    rounded[remainderIndex] = roundWidth(availableWidth - others)
  }

  return rounded.map((value) => ({ width: { fixed: value } }))
}

/**
 * Extract an explicit group letter from a supplied group label such as
 * "GROUP A — Electrical". Labels without a supplied letter keep their full
 * text and never receive an invented letter.
 */
export function parseGroupHeader(label: string): { key: string | null; title: string } {
  const trimmed = label.trim()
  const match = trimmed.match(/^group\s+([a-z0-9]{1,3})\s*[-–—:.]?\s+(.+)$/i)
  if (match && match[2].trim()) {
    return { key: match[1].toUpperCase(), title: match[2].trim() }
  }
  return { key: null, title: trimmed }
}
