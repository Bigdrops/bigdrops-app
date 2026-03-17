import { useState } from 'react'

export const BUILTIN_COLUMNS = [
  { key: 'make', label: 'Make', visible: true, removable: false },
  { key: 'unit', label: 'Unit', visible: true, removable: false },
  { key: 'install_rate', label: 'Install Rate', type: 'install_rate', visible: true, removable: false, includeInTotal: true, formula: '' },
  { key: 'vat_rate', label: 'VAT Rate', type: 'vat_rate', visible: false, removable: false },
  { key: 'discount_rate', label: 'Discount Rate', type: 'discount_rate', visible: false, removable: false },
]

export const COLUMN_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
]

export const makeEmptyItem = () => ({
  _uiKey: 'item_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
  description: '',
  sub_description: '',
  make: '',
  quantity: 1,
  unit: '',
  unit_price: 0,
  install_rate: null,
  install_rate_override: false,
  vat_rate: null,
  discount_rate: null,
  row_type: 'standard',
  group_name: '',
  sort_order: 0,
  image_url: null,
  custom_data: {},
})

export const makeEmptyGroup = (name = '') => ({
  id: 'grp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
  name,
  showSubtotal: false,
  items: [],
})

export const makeFieldEntry = (overrides = {}) => ({
  id: 'field_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
  ...overrides,
})

export const makeExtraCharge = (overrides = {}) => ({
  id: 'charge_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
  label: '',
  value: 0,
  withTax: true,
  ...overrides,
})

export const ensureUiKey = (item, prefix = 'item') => ({
  ...item,
  _uiKey: item._uiKey || item.id || `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
})

export const normalizeFieldEntries = (entries, valueKey) =>
  (Array.isArray(entries) ? entries : []).map((entry) =>
    makeFieldEntry({
      ...entry,
      [valueKey]: entry?.[valueKey] || '',
    }),
  )

export const normalizeExtraCharges = (charges) =>
  (Array.isArray(charges) ? charges : []).map((charge) =>
    makeExtraCharge({
      ...charge,
      value: Number(charge?.value || 0),
      withTax: charge?.withTax !== false,
    }),
  )

export const buildCalculationInputs = ({ invoice, discountType, discountTiming, whtType }) => ({
  vatRate: Number(invoice?.vat || 0),
  discountValue: Number(invoice?.discount || 0),
  whtValue: Number(invoice?.wht || 0),
  discountType: discountType || 'fixed',
  discountTiming: discountTiming || 'after',
  whtType: whtType || 'percent',
})

export const extractCalculationInputs = (invoice, customFields = {}) => {
  const saved = customFields?.calculationInputs || {}
  return {
    vatRate: Number(saved.vatRate ?? invoice?.vat ?? 0),
    discountValue: Number(saved.discountValue ?? invoice?.discount ?? 0),
    whtValue: Number(saved.whtValue ?? invoice?.wht ?? 0),
    discountType: saved.discountType || customFields?.discountType || 'fixed',
    discountTiming: saved.discountTiming || customFields?.discountTiming || 'after',
    whtType: saved.whtType || customFields?.whtType || 'percent',
  }
}

export const buildEditableCalculationInputs = (
  calculationInputs,
  { useGlobalVatInput = true, useGlobalDiscountInput = true } = {},
) => ({
  ...calculationInputs,
  vatRate: useGlobalVatInput ? calculationInputs.vatRate : 0,
  discountValue: useGlobalDiscountInput ? calculationInputs.discountValue : 0,
})

// Strip client-only fields before saving to Supabase
export const toDbItem = (item, invoiceId, sortOrder) => {
  const { install_rate_override, _uiKey, id: _id, created_at: _ca, ...rest } = item
  return {
    ...rest,
    invoice_id: invoiceId,
    sort_order: sortOrder,
    amount: Number(item.quantity || 1) * Number(item.unit_price || 0),
    custom_data: JSON.stringify(item.custom_data || {}),
    vat_rate: item.vat_rate ?? 0,
    discount_rate: item.discount_rate ?? 0,
    image_url: item.image_url || null,
  }
}

export function useInvoiceColumns(initial) {
  const [columns, setColumns] = useState(initial || BUILTIN_COLUMNS.map(c => ({ ...c })))
  const isVisible = (key) => !!(columns.find(c => c.key === key) || {}).visible
  const getColumn = (key) => columns.find(c => c.key === key)
  const toggleVisible = (key) => setColumns(cols => cols.map(c => c.key === key ? { ...c, visible: !c.visible } : c))
  const updateColumn = (key, field, value) => setColumns(cols => cols.map(c => c.key === key ? { ...c, [field]: value } : c))
  const addCustomColumn = () => setColumns(cols => [...cols, { key: 'custom_' + Date.now(), label: 'New Column', type: 'text', visible: true, removable: true, includeInTotal: false }])
  const removeCustomColumn = (key) => setColumns(cols => cols.filter(c => c.key !== key))
  const resetColumns = () => setColumns(BUILTIN_COLUMNS.map(c => ({ ...c })))
  const moveColumn = (key, dir) => setColumns(cols => {
    const idx = cols.findIndex(c => c.key === key)
    if (idx < 0) return cols
    if (typeof dir === 'number' && Math.abs(dir) !== 1) {
      const newIdx = dir
      if (newIdx < 1 || newIdx >= cols.length) return cols
      const next = [...cols]
      const [col] = next.splice(idx, 1)
      next.splice(newIdx, 0, col)
      return next
    }
    const newIdx = idx + dir
    if (newIdx < 1 || newIdx >= cols.length) return cols
    const next = [...cols]
    ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
    return next
  })
  const customColumns = columns.filter(c => c.key.startsWith('custom_'))
  return { columns, setColumns, isVisible, getColumn, toggleVisible, updateColumn, addCustomColumn, removeCustomColumn, resetColumns, moveColumn, customColumns }
}

export function resolveInstallRate(item, installCol) {
  if (item.install_rate_override && item.install_rate !== null) return Number(item.install_rate)
  if (installCol?.formula) {
    const factor = parseFloat(installCol.formula)
    if (!isNaN(factor) && factor > 0) return factor * Number(item.quantity || 1) * Number(item.unit_price || 0)
  }
  if (!installCol?.formula && item.install_rate !== null && item.install_rate !== undefined) {
    return Number(item.install_rate || 0)
  }
  return 0
}

export function getActiveColumns(columns = []) {
  const orderedColumns = Array.isArray(columns) && columns.length
    ? columns
    : BUILTIN_COLUMNS
  return orderedColumns.filter((column) => column.visible !== false)
}

export function getPdfColumns(columns = []) {
  const activeColumns = getActiveColumns(columns)
  const getColumn = (key) => activeColumns.find((column) => column.key === key)
  const customColumns = activeColumns.filter((column) => column.key.startsWith('custom_'))

  const orderedColumns = [
    { key: 'num', label: '#', kind: 'builtin', align: 'center', pdfWidth: 20, pdfFlex: 0.45 },
    { key: 'description', label: 'Description', kind: 'builtin', align: 'left', pdfWidth: 0, pdfFlex: 2.9 },
    getColumn('make')
      ? { key: 'make', label: getColumn('make').label || 'Make', kind: 'builtin', align: 'left', pdfWidth: 48, pdfFlex: 1.25 }
      : null,
    { key: 'quantity', label: 'Qty', kind: 'builtin', align: 'center', pdfWidth: 28, pdfFlex: 0.7 },
    getColumn('unit')
      ? { key: 'unit', label: getColumn('unit').label || 'Unit', kind: 'builtin', align: 'center', pdfWidth: 34, pdfFlex: 0.85 }
      : null,
    { key: 'unit_price', label: 'Unit Price', kind: 'builtin', align: 'right', pdfWidth: 54, pdfFlex: 1.2 },
    { key: 'amount', label: 'Amount (NGN)', kind: 'builtin', align: 'right', pdfWidth: 62, pdfFlex: 1.35 },
    getColumn('install_rate')
      ? { key: 'install_rate', label: getColumn('install_rate').label || 'Install Rate', kind: 'builtin', align: 'right', pdfWidth: 54, pdfFlex: 1.15 }
      : null,
    getColumn('vat_rate')
      ? { key: 'vat_rate', label: getColumn('vat_rate').label || 'VAT %', kind: 'builtin', align: 'center', pdfWidth: 32, pdfFlex: 0.8 }
      : null,
    getColumn('discount_rate')
      ? { key: 'discount_rate', label: getColumn('discount_rate').label || 'Disc %', kind: 'builtin', align: 'center', pdfWidth: 40, pdfFlex: 0.95 }
      : null,
    ...customColumns.map((column) => ({
      key: column.key,
      label: column.label || 'Custom',
      kind: 'custom',
      type: column.type || 'text',
      align: column.type === 'number' ? 'right' : 'left',
      pdfWidth: column.type === 'number' ? 52 : 64,
      pdfFlex: column.type === 'number' ? 1.05 : 1.25,
    })),
  ]

  return orderedColumns.filter(Boolean)
}

const formatPdfPercentValue = (value, zeroLabel) => {
  if (value === null || value === undefined || value === '') return '-'
  if (Number(value) === 0) return zeroLabel
  return `${Number(value).toLocaleString()}%`
}

export function getPdfCellValue(column, item, helpers = {}) {
  if (column.key === 'description') return item.description || ''
  if (column.key === 'make') return item.make || ''
  if (column.key === 'quantity') return item.quantity ?? ''
  if (column.key === 'unit') return item.unit || ''
  if (column.key === 'unit_price') return Number(item.unit_price || 0).toLocaleString()
  if (column.key === 'amount') return Number(helpers.amount || 0).toLocaleString()
  if (column.key === 'install_rate') {
    const installValue = resolveInstallRate(item, helpers.installColumn)
    return installValue > 0 ? installValue.toLocaleString() : '-'
  }
  if (column.key === 'vat_rate') return formatPdfPercentValue(item.vat_rate, 'Exempt')
  if (column.key === 'discount_rate') return formatPdfPercentValue(item.discount_rate, 'No disc')
  if (column.kind === 'custom') {
    const value = (item.custom_data || {})[column.key]
    if (value === null || value === undefined || value === '') return '-'
    return column.type === 'number' ? Number(value).toLocaleString() : String(value)
  }
  return ''
}

export function inferLegacyCalculationInputs({ invoice, items, customFields = {} }) {
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
    discountValue: Number.isFinite(discountValue) ? Number(discountValue.toFixed(4)) : 0,
    whtValue: Number.isFinite(whtValue) ? Number(whtValue.toFixed(4)) : 0,
    discountType,
    discountTiming,
    whtType,
  }
}

export function inferLegacyCalculationState({ invoice, items, customFields = {} }) {
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

export function resolveRowVat(item, globalVatPct) {
  if (item.vat_rate !== null && item.vat_rate !== undefined) return Number(item.vat_rate)
  return Number(globalVatPct || 0)
}

export function calcTotals({ items, columns, invoice, discountType, discountTiming, whtType }) {
  const installCol = columns.find(c => c.key === 'install_rate')
  const globalVatPct = Number(invoice.vat || 0)
  const globalDiscountInput = Number(invoice.discount || 0)
  const standardItems = items.filter(i => i.row_type === 'standard')
  const rawSubtotal = standardItems.reduce(
    (sum, item) => sum + Number(item.quantity || 1) * Number(item.unit_price || 0),
    0,
  )

  const rowCalcs = standardItems.map(item => {
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
    ? rowCalcs.reduce((s, r) => s + r.installRate, 0)
    : 0

  const customColTotal = columns
    .filter(c => c.key.startsWith('custom_') && c.includeInTotal && c.type === 'number')
    .reduce((cs, col) => cs + standardItems.reduce((s, item) => s + Number((item.custom_data || {})[col.key] || 0), 0), 0)

  const extraWithTax = (invoice._extraCharges || []).filter(c => c.withTax).reduce((s, c) => s + Number(c.value || 0), 0)
  const extraWithoutTax = (invoice._extraCharges || []).filter(c => !c.withTax).reduce((s, c) => s + Number(c.value || 0), 0)
  const fixedChargesTotal = Number(invoice.workmanship || 0) + Number(invoice.transportation || 0) + Number(invoice.shipping || 0)

  const hasAnyRowOverride = standardItems.some(item => item.discount_rate !== null && item.discount_rate !== undefined)
  const taxableBaseBeforeDiscount = rawSubtotal + extraWithTax

  let discountAmount = 0
  if (discountType === 'percent' || hasAnyRowOverride) {
    discountAmount = rowCalcs.reduce((s, r) => s + r.rowDiscount, 0)
  } else {
    discountAmount = globalDiscountInput
  }

  let extraTaxableDiscount = 0
  if (discountTiming === 'before' && !hasAnyRowOverride) {
    // Global before-tax discounts reduce the entire taxable base, including taxable extras.
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
  const vatAmount = rowCalcs.reduce((s, r) => s + r.rowVat, 0) + taxableExtraBase * (globalVatPct / 100)

  let taxableBase = rawSubtotal + extraWithTax
  if (discountTiming === 'before') taxableBase -= discountAmount

  let grandTotal = taxableBase + vatAmount + fixedChargesTotal + installRateTotal + extraWithoutTax + customColTotal
  if (discountTiming === 'after') grandTotal -= discountAmount

  const whtAmount = whtType === 'percent'
    ? grandTotal * (Number(invoice.wht || 0) / 100)
    : Number(invoice.wht || 0)
  const totalPayable = grandTotal - whtAmount

  return { rawSubtotal, installRateTotal, vatAmount, discountAmount, grandTotal, whtAmount, totalPayable, customColTotal, extraWithTax, extraWithoutTax, fixedChargesTotal }
}
