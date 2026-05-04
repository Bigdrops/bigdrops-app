import { generateImportPrompt } from '@/domain/import/promptGenerator'
import { makeEmptyItem, makeExtraCharge, type ColumnConfig, type ExtraCharge, type InvoiceItem } from '@/domain/invoice'
import type { ApplyImportResult, ImportMode } from '@/domain/import/types'

export const quotationImportAdapter = {
  documentType: 'quotation' as const,
  prompts: (columns: ColumnConfig[], mode: ImportMode) => 
    generateImportPrompt(columns, mode, 'quotation'),
  createItem: () => makeEmptyItem(),
  applyResult({
    result,
    setColumns,
    setItems,
    updateTopLevelField,
    setExtraCharges,
  }: {
    result: ApplyImportResult
    setColumns: (columns: ColumnConfig[]) => void
    setItems: (items: InvoiceItem[]) => void
    updateTopLevelField: (field: 'title' | 'po_number' | 'notes' | 'terms', value: string) => void
    setExtraCharges: (charges: ExtraCharge[]) => void
  }) {
    setColumns(result.columns)
    setItems(result.items)

    if (result.topLevel.title !== undefined) updateTopLevelField('title', result.topLevel.title)
    if (result.topLevel.po_number !== undefined) updateTopLevelField('po_number', result.topLevel.po_number)
    if (result.topLevel.notes !== undefined) updateTopLevelField('notes', result.topLevel.notes)
    if (result.topLevel.terms !== undefined) updateTopLevelField('terms', result.topLevel.terms)
    if (result.topLevel.extra_charges !== undefined) {
      setExtraCharges(result.topLevel.extra_charges.map((charge) => makeExtraCharge({ ...charge })))
    }
  },
}
