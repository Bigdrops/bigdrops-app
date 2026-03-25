import { makeEmptyItem, makeExtraCharge, type ColumnConfig, type ExtraCharge, type InvoiceItem } from '@/domain/invoice'
import type { ApplyImportResult } from '@/domain/import/types'

export const quotationImportPrompt = `Convert the source content into JSON for quotation import.

Return JSON only.

{
  "po_number": "",
  "notes": "",
  "terms": "",
  "extra_charges": [
    { "label": "", "value": 0 }
  ],
  "items": [
    {
      "description": "",
      "sub_description": "",
      "quantity": 0,
      "unit": "",
      "unit_price": 0
    }
  ]
}

Rules:
- Extract main table -> items
- description is required
- sub_description = extra details under same item (if any)
- Include quantity, unit, unit_price only if present
- Put charges outside table -> extra_charges (label + value only)
- Ignore VAT, totals, discount, client, dates, title
- Extract PO reference -> po_number (any similar label)
- Put remarks -> notes
- Put conditions -> terms
- Allow extra item fields if clearly present
- Do not guess`

export const quotationImportAdapter = {
  documentType: 'quotation' as const,
  prompt: quotationImportPrompt,
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
    updateTopLevelField: (field: 'po_number' | 'notes' | 'terms', value: string) => void
    setExtraCharges: (charges: ExtraCharge[]) => void
  }) {
    setColumns(result.columns)
    setItems(result.items)

    if (result.topLevel.po_number !== undefined) updateTopLevelField('po_number', result.topLevel.po_number)
    if (result.topLevel.notes !== undefined) updateTopLevelField('notes', result.topLevel.notes)
    if (result.topLevel.terms !== undefined) updateTopLevelField('terms', result.topLevel.terms)
    if (result.topLevel.extra_charges !== undefined) {
      setExtraCharges(result.topLevel.extra_charges.map((charge) => makeExtraCharge({ ...charge, withTax: true })))
    }
  },
}
