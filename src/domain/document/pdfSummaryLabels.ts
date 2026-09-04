import { parseCustomFields } from '@/domain/invoice'

type SupportedDocument = {
  custom_fields?: unknown
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatPercentage(value: number): string {
  return `${value.toFixed(4).replace(/\.?0+$/, '')}%`
}

function buildLabel(baseLabel: string, percentage: number | null): string {
  if (percentage === null) return baseLabel
  return `${baseLabel} (${formatPercentage(percentage)})`
}

/**
 * Discount label extras.
 *
 * For a percent discount, discountPercentEquivalent equals the configured
 * discount percentage (e.g. 5 means 5%).
 *
 * For a fixed discount, discountPercentEquivalent is the equivalent
 * percentage the calculation engine already derived from its own
 * discount base. This value is display-only and must not be
 * recalculated at this layer.
 */
export type DiscountLabelExtras = {
  discountType?: 'percent' | 'fixed'
  discountPercentEquivalent?: number
}

export function getPdfSummaryLabels(
  document: SupportedDocument,
  extras?: DiscountLabelExtras,
) {
  const customFields = parseCustomFields(document?.custom_fields)
  const calculationInputs = customFields.calculationInputs || {}
  const vatPercentage = toFiniteNumber(calculationInputs.vatPercent ?? customFields.vatPercent)
  const discountType =
    (calculationInputs.discountType ?? customFields.discountType) as string | undefined

  // Determine the discount percentage to display.
  // For percent discounts, read the configured rate directly.
  // For fixed discounts, use the pre-computed equivalent from the
  // calculation engine. Never derive the percentage here.
  let discountPercentage: number | null = null
  if (discountType === 'percent') {
    discountPercentage = toFiniteNumber(calculationInputs.discountValue ?? customFields.discountValue)
  } else if (
    extras?.discountType === 'fixed' &&
    extras?.discountPercentEquivalent != null &&
    extras.discountPercentEquivalent > 0
  ) {
    discountPercentage = extras.discountPercentEquivalent
  }

  const whtPercentage =
    (calculationInputs.whtType ?? customFields.whtType) === 'percent'
      ? toFiniteNumber(calculationInputs.whtValue ?? customFields.whtValue)
      : null

  return {
    vat: buildLabel('VAT', vatPercentage),
    wht: buildLabel('WHT', whtPercentage),
    discount: buildLabel('Discount', discountPercentage),
  }
}
