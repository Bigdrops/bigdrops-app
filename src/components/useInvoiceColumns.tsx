import { useCallback, useState } from 'react'
import type { ColumnConfig } from '../domain/invoice/types'
import { canUseColumnLabel, createUniqueColumnLabel } from '@/domain/financial/columnIdentity'

import {
  BUILTIN_COLUMNS,
  makeEmptyItem,
  makeEmptyGroup,
  makeFieldEntry,
  makeExtraCharge,
  ensureUiKey,
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
  getResetColumnConfigs,
} from '../domain/invoice'

export {
  BUILTIN_COLUMNS,
  makeEmptyItem,
  makeEmptyGroup,
  makeFieldEntry,
  makeExtraCharge,
  ensureUiKey,
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

export interface InvoiceColumn extends ColumnConfig {
  width?: string
  [key: string]: any
}

export function useInvoiceColumns(initial?: InvoiceColumn[], builtins: InvoiceColumn[] = BUILTIN_COLUMNS) {
  const [columns, setColumns] = useState<InvoiceColumn[]>(
    (initial || builtins).map((column) => normalizeColumnConfig({ ...column }) as InvoiceColumn),
  )
  
  const getColumn = useCallback((key: string) => columns.find(c => c.key === key), [columns])
  
  const isVisible = useCallback((key: string) => {
    const column = columns.find(c => c.key === key)
    return column ? (column.visibilityMode || 'show') === 'show' : false
  }, [columns])
  
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
    setColumns(cols => {
      if (field === 'label' && !canUseColumnLabel(cols, key, value)) return cols
      return cols.map(c => c.key === key ? normalizeColumnConfig({ ...c, [field]: value }) as InvoiceColumn : c)
    })
    
  const addCustomColumn = () => 
    setColumns(cols => {
      const title = createUniqueColumnLabel('New Column', cols)

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
    setColumns(
      (builtins === BUILTIN_COLUMNS ? getResetColumnConfigs() : builtins)
        .map(c => normalizeColumnConfig({ ...c }) as InvoiceColumn),
    )
    
  const moveColumn = (key: string, targetIdx: number) => setColumns(cols => {
    const idx = cols.findIndex(c => c.key === key)
    if (idx < 0) return cols
    if (key === 'description') return cols
    if (targetIdx === idx) return cols

    let newIdx = targetIdx
    if (newIdx < 0 || newIdx >= cols.length) return cols
    if (newIdx === 0) newIdx = 1

    const next = [...cols]
    const [col] = next.splice(idx, 1)
    next.splice(newIdx, 0, col)
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
