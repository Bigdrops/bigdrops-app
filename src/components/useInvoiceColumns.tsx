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
  mergeColumnConfigs,
  normalizeFieldEntries,
  normalizeExtraCharges,
  normalizeQuantity,
  toDbItem,
  buildCalculationInputs,
  extractCalculationInputs,
  buildEditableCalculationInputs,
  filterPopulatedAdditionalFields,
  resolveInstallRate,
  getActiveColumns,
  getPdfColumns,
  getPdfCellValue,
  normalizeColumnConfig,
  normalizeVisibilityMode,
  resolveColumnBehavior,
  shouldIncludeColumnInTotals,
  inferLegacyCalculationInputs,
  inferLegacyCalculationState,
  resolveRowVat,
  calcTotals,
} from '../domain/invoice'

const normalizeTitle = (title: string) => 
  title.trim().toLowerCase().replace(/\s+/g, ' ')

import {
  BUILTIN_COLUMNS,
  getResetColumnConfigs,
  normalizeColumnConfig,
} from '../domain/invoice'

export interface InvoiceColumn extends ColumnConfig {
  width?: string
  [key: string]: any
}

export function useInvoiceColumns(initial?: InvoiceColumn[]) {
  const [columns, setColumns] = useState<InvoiceColumn[]>(
    (initial || BUILTIN_COLUMNS).map((column) => normalizeColumnConfig({ ...column }) as InvoiceColumn),
  )
  
  const getColumn = (key: string) => columns.find(c => c.key === key)
  
  const isVisible = (key: string) => {
    const column = getColumn(key)
    return column ? (column.visibilityMode || 'show') === 'show' : false
  }
  
  const toggleVisible = (key: string) =>
    setColumns((cols) =>
      cols.map((column) =>
        column.key === key
          ? normalizeColumnConfig({
              ...column,
              visibilityMode: column.visibilityMode === 'show' ? 'hide_display' : 'show',
            }) as InvoiceColumn
          : column,
      ),
    )

  const toggleDisabled = (key: string) =>
    setColumns((cols) => {
      const col = cols.find((c) => c.key === key)
      if (col?.key.startsWith('custom_')) {
        return cols.filter((c) => c.key !== key)
      }
      return cols.map((column) =>
        column.key === key
          ? (normalizeColumnConfig({
              ...column,
              visibilityMode: column.visibilityMode === 'hide_full' ? 'show' : 'hide_full',
            }) as InvoiceColumn)
          : column,
      )
    })
    
  const updateColumn = (key: string, field: string, value: any) => 
    setColumns(cols => cols.map(c => c.key === key ? normalizeColumnConfig({ ...c, [field]: value }) as InvoiceColumn : c))
    
  const addCustomColumn = () => 
    setColumns(cols => {
      const activeTitles = cols
        .filter(c => (c.visibilityMode || 'show') !== 'hide_full')
        .map(c => normalizeTitle(c.label || ''))
      
      const base = 'New Column'
      let title = base
      let counter = 2
      
      while (activeTitles.includes(normalizeTitle(title))) {
        title = `${base} ${counter}`
        counter++
      }

      return [...cols, normalizeColumnConfig({ 
        key: 'custom_' + Date.now(), 
        label: title, 
        type: 'text', 
        visible: true, 
        visibilityMode: 'show',
        removable: true, 
        includeInTotal: false 
      }) as InvoiceColumn]
    })
    
  const removeCustomColumn = (key: string) => 
    setColumns(cols => cols.filter(c => c.key !== key))
    
  const resetColumns = () => 
    setColumns(getResetColumnConfigs().map(c => normalizeColumnConfig({ ...c }) as InvoiceColumn))
    
  const moveColumn = (key: string, dir: number) => setColumns(cols => {
    const idx = cols.findIndex(c => c.key === key)
    if (idx < 0) return cols
    if (key === 'description') return cols
    
    if (typeof dir === 'number' && Math.abs(dir) !== 1) {
      let newIdx = dir
      if (newIdx < 0 || newIdx >= cols.length) return cols
      if (newIdx === 0) newIdx = 1
      const next = [...cols]
      const [col] = next.splice(idx, 1)
      next.splice(newIdx, 0, col)
      return next
    }
    
    let newIdx = idx + dir
    if (newIdx < 0 || newIdx >= cols.length) return cols
    if (newIdx === 0) newIdx = 1
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
    toggleDisabled,
    updateColumn, 
    addCustomColumn, 
    removeCustomColumn, 
    resetColumns, 
    moveColumn, 
    customColumns 
  }
}
