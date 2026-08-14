import { normalizeQuantity } from './normalize'
import { normalizeVisibilityMode, resolveColumnBehavior, resolveInstallRate, shouldIncludeColumnInTotals } from './columns'
import { normalizeExtraCharges } from './factories'
import type {
  CalculationInputs,
  CalculationResult,
  ColumnConfig,
  EditableCalculationInputs,
  InvoiceCustomFields,
  InvoiceItem,
  InvoiceTotalsSource,
  LegacyCalculationState,
} from './types'

type SummaryLabelOverrides = {
  vat?: string
  discount?: string
  wht?: string
}

export function resolveExtraCharges(
  customFields?: InvoiceCustomFields | null,
  invoice?: InvoiceTotalsSource | null,
) {
  if (Array.isArray(customFields?.extraCharges)) {
    return normalizeExtraCharges(customFields.extraCharges)
  }

  if (Array.isArray(invoice?._extraCharges)) {
    return normalizeExtraCharges(invoice._extraCharges)
  }

  return []
}

export function buildCalculationInputs({
  invoice,
  discountType,
  discountTiming,
  whtType,
}: {
  invoice?: InvoiceTotalsSource | null
  discountType?: CalculationInputs['discountType']
  discountTiming?: CalculationInputs['discountTiming']
  whtType?: CalculationInputs['whtType']
}): CalculationInputs {
  const vatRate = Number(invoice?.vat || 0)
  return {
    vatRate,
    vatPercent: vatRate,
    discountValue: Number(invoice?.discount || 0),
    whtValue: Number(invoice?.wht || 0),
    discountType: discountType || 'percent',
    discountTiming: discountTiming || 'before',
    whtType: whtType || 'percent',
  }
}

export function extractCalculationInputs(
  invoice?: InvoiceTotalsSource | null,
  customFields: InvoiceCustomFields = {},
): CalculationInputs {
  const saved = customFields?.calculationInputs || {}
  const savedVatRate = Number(saved.vatPercent ?? saved.vatRate ?? invoice?.vat ?? 0)
  return {
    vatRate: savedVatRate,
    vatPercent: savedVatRate,
    discountValue: Number(saved.discountValue ?? invoice?.discount ?? 0),
    whtValue: Number(saved.whtValue ?? invoice?.wht ?? 0),
    discountType: saved.discountType || customFields?.discountType || 'percent',
    discountTiming: saved.discountTiming || customFields?.discountTiming || 'before',
    whtType: saved.whtType || customFields?.whtType || 'percent',
  }
}

export function buildEditableCalculationInputs(
  calculationInputs: CalculationInputs,
  {
    useGlobalVatInput = true,
    useGlobalDiscountInput = true,
  }: {
    useGlobalVatInput?: boolean
    useGlobalDiscountInput?: boolean
  } = {},
): EditableCalculationInputs {
  return {
    ...calculationInputs,
    vatRate: useGlobalVatInput ? calculationInputs.vatRate : 0,
    vatPercent: useGlobalVatInput ? calculationInputs.vatRate : 0,
    discountValue: useGlobalDiscountInput ? calculationInputs.discountValue : 0,
  }
}

export function inferLegacyCalculationInputs({
  invoice,
  items,
  customFields = {},
}: {
  invoice?: InvoiceTotalsSource | null
  items: InvoiceItem[]
  customFields?: InvoiceCustomFields
}): CalculationInputs {
  const saved = customFields?.calculationInputs
  if (saved) return extractCalculationInputs(invoice, customFields)

  const discountType = customFields?.discountType || 'percent'
  const discountTiming = customFields?.discountTiming || 'before'
  const whtType = customFields?.whtType || 'percent'
  const standardItems = (items || []).filter((item) => item.row_type === 'standard')
  const subtotal = standardItems.reduce(
    (sum, item) => sum + Number(item.quantity || 1) * Number(item.unit_price || 0),
    0,
  )
  const extraWithTax = resolveExtraCharges(customFields, invoice)
    .filter((charge) => charge.withTax)
    .reduce((sum, charge) => sum + Number(charge.value || 0), 0)
  const vatAmount = Number(invoice?.vat || 0)
  const discountAmount = Number(invoice?.discount || 0)
  const whtAmount = Number(invoice?.wht || 0)
  const grandTotal = Number(invoice?.total || 0) + whtAmount
  const hasGlobalVatRows = standardItems.some((item) => item.vat_rate === null || item.vat_rate === undefined)
  const hasRowVatOverride = standardItems.some((item) => item.vat_rate !== null && item.vat_rate !== undefined)
  const hasRowDiscountOverride = standardItems.some((item) => item.discount_rate !== null && item.discount_rate !== undefined)

  let vatRate = 0
  if (hasGlobalVatRows || !hasRowVatOverride) {
    const vatBase = Math.max(
      subtotal + extraWithTax - (discountTiming === 'before' && !hasRowDiscountOverride ? discountAmount : 0),
      0,
    )
    vatRate = vatBase > 0 ? (vatAmount / vatBase) * 100 : 0
  } else {
    vatRate = Number(invoice?.vat || 0)
  }

  let discountValue = discountAmount
  if (discountType === 'percent' && !hasRowDiscountOverride) {
    discountValue = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0
  }

  let whtValue = whtAmount
  if (whtType === 'percent') {
    whtValue = grandTotal > 0 ? (whtAmount / grandTotal) * 100 : 0
  }

  return {
    vatRate: Number.isFinite(vatRate) ? Number(vatRate.toFixed(4)) : 0,
    vatPercent: Number.isFinite(vatRate) ? Number(vatRate.toFixed(4)) : 0,
    discountValue: Number.isFinite(discountValue) ? Number(discountValue.toFixed(4)) : 0,
    whtValue: Number.isFinite(whtValue) ? Number(whtValue.toFixed(4)) : 0,
    discountType,
    discountTiming,
    whtType,
  }
}

export function inferLegacyCalculationState({
  invoice,
  items,
  customFields = {},
}: {
  invoice?: InvoiceTotalsSource | null
  items: InvoiceItem[]
  customFields?: InvoiceCustomFields
}): LegacyCalculationState {
  const calculationInputs = inferLegacyCalculationInputs({ invoice, items, customFields })
  const standardItems = (items || []).filter((item) => item.row_type === 'standard')
  const useGlobalVatInput = standardItems.some(
    (item) => item.vat_rate === null || item.vat_rate === undefined,
  )
  // The global discount is independent of row-level discount overrides.
  // When the document persisted calculation inputs, calculationInputs.discountValue
  // is the authoritative global discount and must hydrate regardless of row rates.
  // Only documents without persisted calculation inputs fall back to the legacy
  // row heuristic, because rate inference from totals is unreliable there.
  const savedDiscountValue = customFields?.calculationInputs?.discountValue
  const useGlobalDiscountInput =
    savedDiscountValue !== undefined && savedDiscountValue !== null
      ? true
      : standardItems.some(
          (item) => item.discount_rate === null || item.discount_rate === undefined,
        )

  return {
    calculationInputs,
    editableInputs: buildEditableCalculationInputs(calculationInputs, {
      useGlobalVatInput,
      useGlobalDiscountInput,
    }),
    useGlobalVatInput,
    useGlobalDiscountInput,
  }
}

export function resolveRowVat(item: InvoiceItem, globalVatPct: number): number {
  if (item.vat_rate !== null && item.vat_rate !== undefined) return Number(item.vat_rate)
  return Number(globalVatPct || 0)
}

export function calcTotals({
  items,
  columns,
  invoice,
  customFields,
  discountType,
  discountTiming,
  whtType,
}: {
  items: InvoiceItem[]
  columns: ColumnConfig[]
  invoice: InvoiceTotalsSource
  customFields?: InvoiceCustomFields
  discountType: CalculationInputs['discountType']
  discountTiming: CalculationInputs['discountTiming']
  whtType: CalculationInputs['whtType']
}): CalculationResult {
  const installCol = columns.find((column) => column.key === 'install_rate')
  const hideVatFully = normalizeVisibilityMode(columns.find((column) => column.key === 'vat_rate')) === 'hide_full'
  const hideDiscountFully = normalizeVisibilityMode(columns.find((column) => column.key === 'discount_rate')) === 'hide_full'
  const visibleColumns = resolveColumnBehavior(columns, items, 'form')
  const visibleCustomColumnKeys = new Set(visibleColumns.filter((column) => column.key.startsWith('custom_')).map((column) => column.key))
  const globalVatPct = hideVatFully ? 0 : Number(invoice.vat || 0)
  const globalDiscountInput = hideDiscountFully ? 0 : Number(invoice.discount || 0)
  const standardItems = items.filter((item) => item.row_type === 'standard')
  const rawSubtotal = standardItems.reduce(
    (sum, item) => sum + normalizeQuantity(item.quantity, 1) * Number(item.unit_price || 0),
    0,
  )

  const rowCalcs = standardItems.map((item) => {
    const rowAmount = normalizeQuantity(item.quantity, 1) * Number(item.unit_price || 0)
    const installRate = resolveInstallRate(item, installCol)
    const rowVatPct = hideVatFully ? 0 : resolveRowVat(item, globalVatPct)

    let rowDiscountPct
    if (hideDiscountFully) {
      rowDiscountPct = 0
    } else if (item.discount_rate === null || item.discount_rate === undefined) {
      rowDiscountPct = discountType === 'percent' ? globalDiscountInput : 0
    } else if (item.discount_rate === 0) {
      rowDiscountPct = 0
    } else {
      rowDiscountPct = Number(item.discount_rate)
    }

    let rowDiscount = rowAmount * (rowDiscountPct / 100)
    if (
      discountType === 'fixed' &&
      discountTiming === 'before' &&
      !(item.discount_rate !== null && item.discount_rate !== undefined)
    ) {
      rowDiscount = rawSubtotal > 0 ? globalDiscountInput * (rowAmount / rawSubtotal) : 0
    }

    const rowVatBase = discountTiming === 'before'
      ? Math.max(rowAmount - rowDiscount, 0)
      : rowAmount
    const rowVat = rowVatBase * (rowVatPct / 100)

    return { rowAmount, installRate, rowVat, rowDiscount }
  })

  const installRateTotal = shouldIncludeColumnInTotals(installCol)
    ? rowCalcs.reduce((sum, row) => sum + row.installRate, 0)
    : 0

  const customColTotal = columns
    .filter((column) => visibleCustomColumnKeys.has(column.key) && column.includeInTotal && column.type === 'number' && shouldIncludeColumnInTotals(column))
    .reduce(
      (columnSum, column) =>
        columnSum + standardItems.reduce((sum, item) => sum + Number((item.custom_data || {})[column.key] || 0), 0),
      0,
    )

  const extraCharges = resolveExtraCharges(customFields, invoice)
  const extraWithTax = extraCharges
    .filter((charge) => charge.withTax)
    .reduce((sum, charge) => sum + Number(charge.value || 0), 0)
  const extraWithoutTax = extraCharges
    .filter((charge) => !charge.withTax)
    .reduce((sum, charge) => sum + Number(charge.value || 0), 0)
  const fixedChargesTotal =
    Number(invoice.workmanship || 0) +
    Number(invoice.transportation || 0) +
    Number(invoice.shipping || 0)

  const hasAnyRowOverride = standardItems.some(
    (item) => item.discount_rate !== null && item.discount_rate !== undefined,
  )
  const taxableBaseBeforeDiscount = rawSubtotal + extraWithTax

  let discountAmount = 0
  if (discountType === 'percent' || hasAnyRowOverride) {
    discountAmount = rowCalcs.reduce((sum, row) => sum + row.rowDiscount, 0)
  } else {
    discountAmount = globalDiscountInput
  }

  let extraTaxableDiscount = 0
  if (discountTiming === 'before' && !hasAnyRowOverride) {
    if (discountType === 'percent') {
      extraTaxableDiscount = extraWithTax * (globalDiscountInput / 100)
      discountAmount += extraTaxableDiscount
    } else if (discountType === 'fixed') {
      extraTaxableDiscount = taxableBaseBeforeDiscount > 0
        ? globalDiscountInput * (extraWithTax / taxableBaseBeforeDiscount)
        : 0
    }
  }

  const taxableExtraBase = Math.max(extraWithTax - extraTaxableDiscount, 0)
  const vatAmount = rowCalcs.reduce((sum, row) => sum + row.rowVat, 0) + taxableExtraBase * (globalVatPct / 100)

  let taxableBase = rawSubtotal + extraWithTax
  if (discountTiming === 'before') taxableBase -= discountAmount

  let grandTotal = taxableBase + vatAmount + fixedChargesTotal + installRateTotal + extraWithoutTax + customColTotal
  if (discountTiming === 'after') grandTotal -= discountAmount

  const whtBase = Math.max(grandTotal - vatAmount, 0)
  const whtAmount = whtType === 'percent'
    ? whtBase * (Number(invoice.wht || 0) / 100)
    : Number(invoice.wht || 0)
  const totalPayable = grandTotal - whtAmount

  return {
    rawSubtotal,
    installRateTotal,
    vatAmount,
    discountAmount,
    grandTotal,
    whtAmount,
    totalPayable,
    customColTotal,
    extraWithTax,
    extraWithoutTax,
    fixedChargesTotal,
  }
}

export function buildSummaryRows({
  invoice,
  totals,
  customFields,
  chargeLabels = { workmanship: 'Workmanship', transportation: 'Transportation', shipping: 'Shipping' },
  summaryLabels = { vat: 'VAT', discount: 'Discount', wht: 'WHT' },
}: {
  invoice: any
  totals: any
  customFields: any
  chargeLabels?: any
  summaryLabels?: SummaryLabelOverrides
}) {
  const {
    rawSubtotal = 0,
    vatAmount = 0,
    discountAmount = 0,
    whtAmount = 0,
    installRateTotal = 0,
  } = totals || {}

  const extraCharges = resolveExtraCharges(customFields, invoice)
  const timingMode = customFields?.discountTiming === 'before' ? 'before' : 'after'

  const taxableChargeRows = extraCharges
    .filter((charge: any) => String(charge?.label || '').trim() && Number(charge?.value || 0) > 0 && charge?.withTax === true)
    .map((charge: any) => ({
      key: `extra-${charge.id}`,
      label: String(charge.label).trim(),
      amount: Number(charge.value || 0),
    }))

  const workmanship = Number(invoice.workmanship || 0)
  const transportation = Number(invoice.transportation || 0)
  const shipping = Number(invoice.shipping || 0)

  const nonTaxChargeRows = [
    workmanship > 0 ? { key: 'workmanship', label: chargeLabels.workmanship || 'Workmanship', amount: workmanship } : null,
    transportation > 0 ? { key: 'transportation', label: chargeLabels.transportation || 'Transportation', amount: transportation } : null,
    shipping > 0 ? { key: 'shipping', label: chargeLabels.shipping || 'Shipping', amount: shipping } : null,
    ...extraCharges
      .filter((charge: any) => String(charge?.label || '').trim() && Number(charge?.value || 0) > 0 && charge?.withTax === false)
      .map((charge: any) => ({
        key: `extra-${charge.id}`,
        label: String(charge.label).trim(),
        amount: Number(charge.value || 0),
      })),
  ].filter(Boolean) as any[]

  return [
    { key: 'subtotal', label: 'Subtotal', amount: rawSubtotal },
    ...(timingMode === 'before' && discountAmount > 0
      ? [{ key: 'discount', label: summaryLabels.discount || 'Discount', amount: discountAmount, tone: 'danger' as const }]
      : []),
    ...taxableChargeRows,
    ...(vatAmount > 0 || Number(invoice.vat || 0) > 0 ? [{ key: 'vat', label: summaryLabels.vat || 'VAT', amount: vatAmount }] : []),
    ...(timingMode === 'after' && discountAmount > 0
      ? [{ key: 'discount', label: summaryLabels.discount || 'Discount', amount: discountAmount, tone: 'danger' as const }]
      : []),
    ...nonTaxChargeRows,
    ...(installRateTotal > 0 ? [{ key: 'install_rate', label: 'Install Rate', amount: installRateTotal }] : []),
    ...(whtAmount > 0 ? [{ key: 'wht', label: summaryLabels.wht || 'WHT', amount: whtAmount, tone: 'danger' as const }] : []),
  ]
}
