import { generateImportPrompt } from '@/domain/import/promptGenerator'
import { makeEmptyItem, makeExtraCharge, makeEmptyGroup, type ColumnConfig, type ExtraCharge, type InvoiceGroup, type InvoiceItem } from '@/domain/invoice'
import type { ApplyImportResult, ImportMode } from '@/domain/import/types'

export const invoiceImportAdapter = {
  documentType: 'invoice' as const,
  prompts: (columns: ColumnConfig[], mode: ImportMode, currentItemCount: number) => 
    generateImportPrompt(columns, mode, 'invoice', currentItemCount),
  createItem: () => makeEmptyItem(),
  applyResult({
    result,
    setColumns,
    setItems,
    updateTopLevelField,
    setExtraCharges,
    setGroups,
  }: {
    result: ApplyImportResult
    setColumns: (columns: ColumnConfig[]) => void
    setItems: (items: InvoiceItem[]) => void
    updateTopLevelField: (field: 'title' | 'po_number' | 'notes' | 'terms', value: string) => void
    setExtraCharges: (charges: ExtraCharge[]) => void
    setGroups: (groups: InvoiceGroup[]) => void
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
    if (result.groups && result.groups.length > 0) {
      setGroups(result.groups.map((g) => ({ ...makeEmptyGroup(g.name), id: g.id })))
    }
  },
}
