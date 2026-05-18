import type { InvoiceItem } from '@/domain/invoice'

import type { ImportMode, NormalizedImportData, ValidatedImportData } from './types'
import { hasMeaningfulStandardRows } from './tableState'
import { MAX_IMPORTED_ROWS, getStandardRowEntries } from './utils'

export function validateImportData(
  mode: ImportMode,
  normalized: NormalizedImportData,
  existingItems: InvoiceItem[],
): { ok: true; data: ValidatedImportData } | { ok: false; message: string } {
  if (normalized.items.length > MAX_IMPORTED_ROWS) {
    return {
      ok: false,
      message: `You can import up to ${MAX_IMPORTED_ROWS} rows at a time.`,
    }
  }

  if (mode === 'Add') {
    const validItems = []
    const skippedRows = []

    for (const item of normalized.items) {
      const description = String(item.baseFields.description || '').trim()
      if (!description) {
        skippedRows.push({
          sourceIndex: item.sourceIndex,
          message: 'Description is required.',
        })
        continue
      }
      validItems.push(item)
    }

    if (validItems.length === 0) {
      return {
        ok: false,
        message: 'All imported rows are invalid. Description is required for each row.',
      }
    }

    return {
      ok: true,
      data: {
        topLevel: normalized.topLevel,
        items: validItems,
        unknownCandidates: normalized.unknownCandidates,
        skippedRows,
        groups: normalized.groups || [],
      },
    }
  }

  const standardRows = getStandardRowEntries(existingItems)
  if (standardRows.length === 0 || !hasMeaningfulStandardRows(existingItems)) {
    return {
      ok: false,
      message: 'Update is only available after the table has at least one real item row.',
    }
  }

  const usedRowNumbers = new Set<number>()

  for (const item of normalized.items) {
    const rowNumber = item.row_number

    if (!Number.isInteger(rowNumber) || Number(rowNumber) < 1) {
      return {
        ok: false,
        message: `Row ${item.sourceIndex + 1} must include a valid 1-based row_number.`,
      }
    }

    if (usedRowNumbers.has(rowNumber)) {
      return {
        ok: false,
        message: `Duplicate row_number ${rowNumber} is not allowed in Update mode.`,
      }
    }

    if (rowNumber > standardRows.length) {
      return {
        ok: false,
        message: `row_number ${rowNumber} does not match an existing row.`,
      }
    }

    usedRowNumbers.add(rowNumber)
  }

  return {
    ok: true,
    data: {
      topLevel: normalized.topLevel,
      items: normalized.items,
      unknownCandidates: normalized.unknownCandidates,
      skippedRows: [],
      groups: normalized.groups || [],
    },
  }
}
