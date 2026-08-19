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

export function getPdfSummaryLabels(document: SupportedDocument) {
  const customFields = parseCustomFields(document?.custom_fields)
  const calculationInputs = customFields.calculationInputs || {}
  const vatPercentage = toFiniteNumber(calculationInputs.vatPercent ?? customFields.vatPercent)
  const discountPercentage =
    (calculationInputs.discountType ?? customFields.discountType) === 'percent'
      ? toFiniteNumber(calculationInputs.discountValue ?? customFields.discountValue)
      : null
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
