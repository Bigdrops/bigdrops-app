/**
 * Exact monetary arithmetic (blueprint section 9).
 * Binary floating-point is prohibited for money in the accounting foundation.
 * One precision and one rounding mode for the whole foundation.
 */
import Decimal from 'decimal.js'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export function toDecimal(value: string | number | Decimal): Decimal {
  if (value instanceof Decimal) return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Non-finite money value')
    }
    return new Decimal(String(value))
  }
  return new Decimal(value)
}

export function isZero(value: string | number | Decimal): boolean {
  return toDecimal(value).isZero()
}

export function isNegative(value: string | number | Decimal): boolean {
  return toDecimal(value).isNegative()
}

export function sum(...values: (string | number | Decimal)[]): Decimal {
  return values.reduce<Decimal>((acc, value) => acc.plus(toDecimal(value)), new Decimal(0))
}

/**
 * Serialize an exact amount to a kobo-scale string (2 decimal places).
 * Used at the domain boundary; storage scale is an implementation decision.
 */
export function toKoboString(value: string | number | Decimal): string {
  return toDecimal(value).toFixed(2)
}