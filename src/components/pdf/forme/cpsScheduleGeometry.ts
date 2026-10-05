/**
 * CPS schedule table geometry.
 *
 * Forme `fraction` widths are shares of the full content width, so a
 * fractional description plus fixed money columns overflows the page.
 * Every CPS schedule therefore uses all-fixed columns: the money columns
 * keep exact widths and the description takes the exact remainder.
 * Pure arithmetic. No renderer imports. No financial math.
 */

export interface CpsScheduleGeometry {
  pageWidth: number
  sideInset: number
  fixedColumns: Record<string, number>
}

export const LEDGER_SCHEDULE_GEOMETRY: CpsScheduleGeometry = {
  pageWidth: 595.28,
  sideInset: 27,
  fixedColumns: {
    no: 28,
    qty: 42,
    unitCp: 68,
    unitSp: 68,
    totalCost: 79,
    totalSell: 79,
  },
}

export const INDUSTRY_SCHEDULE_GEOMETRY: CpsScheduleGeometry = {
  pageWidth: 595.28,
  sideInset: 32,
  fixedColumns: {
    no: 30,
    qty: 48,
    unitCp: 70,
    unitSp: 70,
    totalCost: 82,
    totalSell: 88,
  },
}

export function scheduleContentWidth(geometry: CpsScheduleGeometry): number {
  return geometry.pageWidth - geometry.sideInset * 2
}

export function resolveScheduleWidths(
  geometry: CpsScheduleGeometry,
  columns: string[],
): Array<{ width: { fixed: number } }> {
  const content = scheduleContentWidth(geometry)
  const fixedSum = columns
    .filter((key) => key !== 'description')
    .reduce((sum, key) => sum + (geometry.fixedColumns[key] ?? 0), 0)
  const description = Math.max(0, content - fixedSum)
  return columns.map((key) => ({
    width: { fixed: key === 'description' ? description : (geometry.fixedColumns[key] ?? 0) },
  }))
}
