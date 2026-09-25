/**
 * Pure ISO-date helpers for the shared DateField picker.
 *
 * No DOM, no React, no timezone reinterpretation of stored values.
 * Stored dates are opaque `YYYY-MM-DD` strings; display is derived by
 * splitting the string, never `new Date(value)`.
 */

export interface IsoDate {
  y: number
  m: number
  d: number
}

export function isIsoDateString(value: string): boolean {
  return parseIsoDate(value) !== null
}

export function parseIsoDate(value: string): IsoDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const probe = new Date(y, m - 1, d)
  if (probe.getFullYear() !== y || probe.getMonth() !== m - 1 || probe.getDate() !== d) return null
  return { y, m, d }
}

export function toIsoDate(y: number, m: number, d: number): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${String(y).padStart(4, "0")}-${pad(m)}-${pad(d)}`
}

export function formatIsoDisplay(value: string, placeholder = "DD/MM/YYYY"): string {
  const parsed = parseIsoDate(value)
  if (!parsed) return placeholder
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(parsed.d)}/${pad(parsed.m)}/${parsed.y}`
}

export function compareIso(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function addMonths(y: number, m: number, delta: number): IsoDate {
  const base = new Date(y, m - 1 + delta, 1)
  return { y: base.getFullYear(), m: base.getMonth() + 1, d: 1 }
}

export interface CalendarDay extends IsoDate {
  inMonth: boolean
}

/** Monday-first month grid with complete weeks. Pure calendar math only. */
export function getMonthGrid(y: number, m: number): CalendarDay[][] {
  const first = new Date(y, m - 1, 1)
  // Monday-first offset: Sunday (0) -> 6, else day - 1.
  const lead = (first.getDay() + 6) % 7
  const daysInMonth = new Date(y, m, 0).getDate()
  const daysInPrevMonth = new Date(y, m - 1, 0).getDate()
  const cells: CalendarDay[] = []
  for (let i = lead - 1; i >= 0; i -= 1) {
    const d = daysInPrevMonth - i
    const prev = addMonths(y, m, -1)
    cells.push({ y: prev.y, m: prev.m, d, inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({ y, m, d, inMonth: true })
  }
  const next = addMonths(y, m, 1)
  let d = 1
  while (cells.length % 7 !== 0) {
    cells.push({ y: next.y, m: next.m, d, inMonth: false })
    d += 1
  }
  const weeks: CalendarDay[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7))
  }
  return weeks
}

/** Narrow Monday-first weekday labels for the grid header. */
export function getWeekdayLabels(): string[] {
  const formatter = new Intl.DateTimeFormat("en", { weekday: "narrow" })
  const labels: string[] = []
  // 2024-01-01 was a Monday.
  for (let i = 0; i < 7; i += 1) {
    labels.push(formatter.format(new Date(2024, 0, 1 + i)))
  }
  return labels
}

export function todayIso(): string {
  const now = new Date()
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

export function isOutOfRange(iso: string, min?: string, max?: string): boolean {
  if (min && isIsoDateString(min) && compareIso(iso, min) < 0) return true
  if (max && isIsoDateString(max) && compareIso(iso, max) > 0) return true
  return false
}
