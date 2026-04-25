import { useState } from 'react'
import type { ColumnConfig } from '../domain/invoice/types'

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
  filterPopulatedAdditionalFields,
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

export interface InvoiceColumn extends ColumnConfig {
  width?: string
  [key: string]: any
}

export function useInvoiceColumns(initial?: InvoiceColumn[]) {
  const [columns, setColumns] = useState<InvoiceColumn[]>(initial || BUILTIN_COLUMNS.map(c => ({ ...c } as InvoiceColumn)))
  
  const getColumn = (key: string) => columns.find(c => c.key === key)
  
  const isVisible = (key: string) => {
    const column = getColumn(key)
    return column ? column.visible !== false : false
  }
  
  const toggleVisible = (key: string) =>
    setColumns((cols) =>
      cols.map((column) =>
        column.key === key ? { ...column, visible: column.visible === false ? true : false } : column,
      ),
    )
    
  const updateColumn = (key: string, field: string, value: any) => 
    setColumns(cols => cols.map(c => c.key === key ? { ...c, [field]: value } : c))
    
  const addCustomColumn = () => 
    setColumns(cols => [...cols, { 
      key: 'custom_' + Date.now(), 
      label: 'New Column', 
      type: 'text', 
      visible: true, 
      removable: true, 
      includeInTotal: false 
    } as InvoiceColumn])
    
  const removeCustomColumn = (key: string) => 
    setColumns(cols => cols.filter(c => c.key !== key))
    
  const resetColumns = () => 
    setColumns(BUILTIN_COLUMNS.map(c => ({ ...c } as InvoiceColumn)))
    
  const moveColumn = (key: string, dir: number) => setColumns(cols => {
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
  
  return { 
    columns, 
    setColumns, 
    isVisible, 
    getColumn, 
    toggleVisible, 
    updateColumn, 
    addCustomColumn, 
    removeCustomColumn, 
    resetColumns, 
    moveColumn, 
    customColumns 
  }
}
