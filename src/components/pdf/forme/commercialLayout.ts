import type { CommercialDocumentData } from '../industryAdapter'

type WidthSettings = {
  preferred: Record<string, number>
  minimums: Record<string, number>
  minDescription: number
  fallbackPreferred: number
  fallbackMinimum: number
}

function roundWidth(value: number): number {
  return Math.max(0, Math.round(value * 100) / 100)
}

/**
 * Allocate table widths that sum exactly to the available width. Fixed
 * columns shrink toward their legible minimums before the description loses
 * space, so optional columns never overflow the page.
 */
export function resolveCommercialTableWidths(
  columns: CommercialDocumentData['table']['columns'],
  availableWidth: number,
  settings: WidthSettings,
): Array<{ width: { fixed: number } }> {
  if (columns.length === 0) return []

  const descIndex = columns.findIndex((column) => column.key === 'description')
  const desired = columns.map((column) => {
    if (column.key === 'description') return 0
    if (column.width && column.width > 0) return column.width
    return settings.preferred[column.key] ?? settings.fallbackPreferred
  })
  const minimums = columns.map((column) =>
    column.key === 'description'
      ? settings.minDescription
      : settings.minimums[column.key] ?? settings.fallbackMinimum,
  )

  const fixedTotal = desired.reduce((sum, value, index) => (index === descIndex ? sum : sum + value), 0)
  const fixedMinimumTotal = minimums.reduce((sum, value, index) => (index === descIndex ? sum : sum + value), 0)

  let widths = desired.slice()

  if (descIndex >= 0) {
    const descFloor = Math.min(settings.minDescription, Math.max(0, availableWidth - fixedMinimumTotal))
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

export function resolveCellAlign(column: CommercialDocumentData['table']['columns'][number]): 'left' | 'center' | 'right' {
  return column.align === 'right' ? 'right' : column.align === 'center' ? 'center' : 'left'
}

export function readDescription(cell: unknown): { main: string; sub: string } {
  if (cell && typeof cell === 'object') {
    const entry = cell as { main?: unknown; sub?: unknown }
    return {
      main: entry.main === null || entry.main === undefined ? '' : String(entry.main),
      sub: entry.sub === null || entry.sub === undefined ? '' : String(entry.sub),
    }
  }
  return { main: cell === null || cell === undefined ? '' : String(cell), sub: '' }
}

export function displayCellValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}
