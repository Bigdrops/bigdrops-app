import { resolveInstallRate } from './columns'
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
    discountType: discountType || 'fixed',
    discountTiming: discountTiming || 'after',
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
    discountType: saved.discountType || customFields?.discountType || 'fixed',
    discountTiming: saved.discountTiming || customFields?.discountTiming || 'after',
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

  const discountType = customFields?.discountType || 'fixed'
  const discountTiming = customFields?.discountTiming || 'after'
  const whtType = customFields?.whtType || 'percent'
  const standardItems = (items || []).filter((item) => item.row_type === 'standard')
  const subtotal = standardItems.reduce(
    (sum, item) => sum + Number(item.quantity || 1) * Number(item.unit_price || 0),
    0,
  )
  const extraWithTax = (customFields?.extraCharges || [])
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
  const useGlobalDiscountInput = standardItems.some(
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
  discountType,
  discountTiming,
  whtType,
}: {
  items: InvoiceItem[]
  columns: ColumnConfig[]
  invoice: InvoiceTotalsSource
  discountType: CalculationInputs['discountType']
  discountTiming: CalculationInputs['discountTiming']
  whtType: CalculationInputs['whtType']
}): CalculationResult {
  const installCol = columns.find((column) => column.key === 'install_rate')
  const globalVatPct = Number(invoice.vat || 0)
  const globalDiscountInput = Number(invoice.discount || 0)
  const standardItems = items.filter((item) => item.row_type === 'standard')
  const rawSubtotal = standardItems.reduce(
    (sum, item) => sum + Number(item.quantity || 1) * Number(item.unit_price || 0),
    0,
  )

  const rowCalcs = standardItems.map((item) => {
    const rowAmount = Number(item.quantity || 1) * Number(item.unit_price || 0)
    const installRate = resolveInstallRate(item, installCol)
    const rowVatPct = resolveRowVat(item, globalVatPct)

    let rowDiscountPct
    if (item.discount_rate === null || item.discount_rate === undefined) {
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

  const installRateTotal = installCol?.visible
    ? rowCalcs.reduce((sum, row) => sum + row.installRate, 0)
    : 0

  const customColTotal = columns
    .filter((column) => column.key.startsWith('custom_') && column.includeInTotal && column.type === 'number')
    .reduce(
      (columnSum, column) =>
        columnSum + standardItems.reduce((sum, item) => sum + Number((item.custom_data || {})[column.key] || 0), 0),
      0,
    )

  const extraWithTax = (invoice._extraCharges || [])
    .filter((charge) => charge.withTax)
    .reduce((sum, charge) => sum + Number(charge.value || 0), 0)
  const extraWithoutTax = (invoice._extraCharges || [])
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
