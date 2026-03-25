import type { InvoiceItem } from '@/domain/invoice'

import type { OverwriteTarget, ResolvedImportData } from './types'
import { getColumnLabel, getStandardRowEntries, hasCellContent } from './utils'

function getCurrentValue(item: InvoiceItem, columnKey: string) {
  if (columnKey === 'description' || columnKey === 'sub_description' || columnKey === 'unit') {
    return item[columnKey] || ''
  }
  if (columnKey === 'quantity' || columnKey === 'unit_price') {
    return item[columnKey] ?? ''
  }
  return item.custom_data?.[columnKey] ?? ''
}

export function detectOverwriteTargets(
  resolved: ResolvedImportData,
  existingItems: InvoiceItem[],
): OverwriteTarget[] {
  const rowEntries = getStandardRowEntries(existingItems)
  const targets: OverwriteTarget[] = []

  resolved.items.forEach((item) => {
    if (!item.row_number) return
    const targetRow = rowEntries.find((entry) => entry.rowNumber === item.row_number)
    if (!targetRow) return

    Object.entries(item.baseFields).forEach(([columnKey, nextValue]) => {
      if (nextValue === undefined) return
      const currentValue = getCurrentValue(targetRow.item, columnKey)
      if (!hasCellContent(currentValue)) return

      targets.push({
        id: `${item.row_number}:${columnKey}`,
        rowNumber: item.row_number,
        columnKey,
        columnLabel: getColumnLabel(columnKey, resolved.columns),
        currentValue: currentValue as string | number,
        nextValue: nextValue as string | number,
      })
    })

    Object.entries(item.customFields).forEach(([columnKey, nextValue]) => {
      if (nextValue === undefined) return
      const currentValue = getCurrentValue(targetRow.item, columnKey)
      if (!hasCellContent(currentValue)) return

      targets.push({
        id: `${item.row_number}:${columnKey}`,
        rowNumber: item.row_number,
        columnKey,
        columnLabel: getColumnLabel(columnKey, resolved.columns),
        currentValue: currentValue as string | number,
        nextValue: nextValue as string | number,
      })
    })
  })

  return targets
}
