import { useState } from 'react'
export {
  BUILTIN_COLUMNS,
  COLUMN_TYPES,
  makeEmptyItem,
  makeEmptyGroup,
  makeFieldEntry,
  makeExtraCharge,
  ensureUiKey,
  normalizeFieldEntries,
  normalizeExtraCharges,
  toDbItem,
  buildCalculationInputs,
  extractCalculationInputs,
  buildEditableCalculationInputs,
  resolveInstallRate,
  getActiveColumns,
  getPdfColumns,
  getPdfCellValue,
  inferLegacyCalculationInputs,
  inferLegacyCalculationState,
  resolveRowVat,
  calcTotals,
} from '../domain/invoice'

import {
  BUILTIN_COLUMNS,
} from '../domain/invoice'

export function useInvoiceColumns(initial) {
  const [columns, setColumns] = useState(initial || BUILTIN_COLUMNS.map(c => ({ ...c })))
  const getColumn = (key) => columns.find(c => c.key === key)
  const isVisible = (key) => {
    const column = getColumn(key)
    return column ? column.visible !== false : false
  }
  const toggleVisible = (key) =>
    setColumns((cols) =>
      cols.map((column) =>
        column.key === key ? { ...column, visible: column.visible === false ? true : false } : column,
      ),
    )
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

