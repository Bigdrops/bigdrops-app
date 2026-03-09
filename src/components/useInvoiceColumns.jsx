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

// Strip client-only fields before saving to Supabase
export const toDbItem = (item, invoiceId, sortOrder) => {
  const { install_rate_override, id: _id, created_at: _ca, ...rest } = item
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
  // "dir" may be ±1 to move stepwise, or a non‑±1 number treated
  // as an absolute index position. This lets the ColumnManager perform
  // drag‑and‑drop by passing the destination index directly.
  const moveColumn = (key, dir) => setColumns(cols => {
    const idx = cols.findIndex(c => c.key === key)
    if (idx < 0) return cols

    // absolute reposition when dir is a number not equal to ±1
    if (typeof dir === 'number' && Math.abs(dir) !== 1) {
      const newIdx = dir
      if (newIdx < 1 || newIdx >= cols.length) return cols
      const next = [...cols]
      const [col] = next.splice(idx, 1)
      next.splice(newIdx, 0, col)
      return next
    }

    // otherwise treat dir as relative offset (±1)
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
  // No formula, no override — use raw value
  if (!installCol?.formula && item.install_rate !== null && item.install_rate !== undefined) {
    return Number(item.install_rate || 0)
  }
  return 0
}

export function resolveRowVat(item, globalVatPct) {
  if (item.vat_rate !== null && item.vat_rate !== undefined) return Number(item.vat_rate)
  return Number(globalVatPct || 0)
}

export function calcTotals({ items, columns, invoice, discountType, discountTiming, whtType }) {
  const installCol = columns.find(c => c.key === 'install_rate')
  const globalVatPct = Number(invoice.vat || 0)
  const globalDiscountInput = Number(invoice.discount || 0)  // either flat amount or percent value
  const standardItems = items.filter(i => i.row_type === 'standard')

  const rowCalcs = standardItems.map(item => {
    const rowAmount = Number(item.quantity || 1) * Number(item.unit_price || 0)
    const installRate = resolveInstallRate(item, installCol)
    const rowVatPct = resolveRowVat(item, globalVatPct)
    const rowVat = rowAmount * (rowVatPct / 100)

    // Per-row discount logic:
    // discount_rate === null  → row follows global setting (percent of its amount, or flat handled at total level)
    // discount_rate === 0     → this row is explicitly excluded from discount
    // discount_rate > 0       → this row uses that specific percent regardless of global
    let rowDiscountPct
    if (item.discount_rate === null || item.discount_rate === undefined) {
      // Always use global percent for null rows (if global is percent mode)
      // For flat mode, discount is applied at total level, not per row
      rowDiscountPct = discountType === 'percent' ? globalDiscountInput : 0
    } else if (item.discount_rate === 0) {
      rowDiscountPct = 0  // explicitly excluded
    } else {
      rowDiscountPct = Number(item.discount_rate)  // row-specific override
    }
    const rowDiscount = rowAmount * (rowDiscountPct / 100)

    return { rowAmount, installRate, rowVat, rowDiscount }
  })

  const rawSubtotal = rowCalcs.reduce((s, r) => s + r.rowAmount, 0)
  const installRateTotal = installCol?.visible
    ? rowCalcs.reduce((s, r) => s + r.installRate, 0)
    : 0

  const customColTotal = columns
    .filter(c => c.key.startsWith('custom_') && c.includeInTotal && c.type === 'number')
    .reduce((cs, col) => cs + standardItems.reduce((s, item) => s + Number((item.custom_data || {})[col.key] || 0), 0), 0)

  const extraWithTax = (invoice._extraCharges || []).filter(c => c.withTax).reduce((s, c) => s + Number(c.value || 0), 0)
  const extraWithoutTax = (invoice._extraCharges || []).filter(c => !c.withTax).reduce((s, c) => s + Number(c.value || 0), 0)
  const fixedChargesTotal = Number(invoice.workmanship || 0) + Number(invoice.transportation || 0) + Number(invoice.shipping || 0)
  const vatAmount = rowCalcs.reduce((s, r) => s + r.rowVat, 0) + extraWithTax * (globalVatPct / 100)

  // Discount amount:
  // - percent mode: sum of per-row discounts (each row uses its rate or global %)
  // - fixed mode: flat amount applied at total level (per-row overrides still take effect as % though)
  const hasAnyRowOverride = standardItems.some(item => item.discount_rate !== null && item.discount_rate !== undefined)

  let discountAmount = 0
  if (discountType === 'percent' || hasAnyRowOverride) {
    // Always compute from per-row amounts
    discountAmount = rowCalcs.reduce((s, r) => s + r.rowDiscount, 0)
  } else {
    // Pure flat mode with no per-row overrides
    discountAmount = globalDiscountInput
  }

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
