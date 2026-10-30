import type { CsrMaterialItem } from '@/domain/pdf/resolver/csr/csrPreparedContract'

/** The portrait schedule never stacks more than six cards in a column. */
export const PORTRAIT_MATERIALS_ROWS_PER_COLUMN = 6

/**
 * Portrait partition rule: every material is a vertical card, each column
 * holds at most six rows, and the item count decides the column count.
 *
 * - columns = ceil(count / 6)
 * - rows are balanced; the remainder goes to earlier columns
 * - items stay in source order and fill a column top to bottom
 *
 * Examples: 7 = 4 + 3, 8 = 4 + 4, 9 = 5 + 4, 13 = 5 + 4 + 4.
 */
export function distributePortraitMaterialColumns(
  materials: readonly CsrMaterialItem[],
): CsrMaterialItem[][] {
  const count = materials.length
  if (count === 0) return []

  const columnCount = Math.ceil(count / PORTRAIT_MATERIALS_ROWS_PER_COLUMN)
  const baseRows = Math.floor(count / columnCount)
  const remainder = count % columnCount

  const columns: CsrMaterialItem[][] = []
  let cursor = 0
  for (let g = 0; g < columnCount; g += 1) {
    const rows = baseRows + (g < remainder ? 1 : 0)
    columns.push(materials.slice(cursor, cursor + rows))
    cursor += rows
  }
  return columns
}
