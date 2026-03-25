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
- Extract main table → items
- Keep rows in the same order as the source
- description is required
- sub_description = extra details under the same item
- Include quantity, unit, unit_price only if clearly present
- Normalize obvious unit spellings where clear (e.g. kilometer → km)
- Include extra item fields only if clearly labeled as separate columns in the source
- Do not invent or rename fields
- Put standalone charges outside table → extra_charges (label + value only)
- Do not include totals, VAT, or summary values
- Extract PO reference → po_number
- Put remarks → notes
- Put conditions / payment terms → terms
- Ignore VAT, totals, discount, client, dates, title
- Do not guess missing values
- Do not add top-level fields outside this structure`

export const quotationUpdateTablePrompt = `Convert the source content into JSON for quotation table update.

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
      "row_number": 1,
      "description": "",
      "sub_description": "",
      "quantity": 0,
      "unit": "",
      "unit_price": 0
    }
  ]
}

Rules:
- Use row_number to target existing rows
- Keep rows in the same order as the source
- Include only rows that should be updated
- Include only fields that should be updated
- Do not create new rows
- Normalize obvious unit spellings where clear (e.g. kilometer → km)
- Include extra item fields only if clearly labeled as separate columns in the source
- Do not invent or rename fields
- Put standalone charges outside table → extra_charges (label + value only)
- Do not include totals, VAT, or summary values
- Extract PO reference → po_number
- Put remarks → notes
- Put conditions / payment terms → terms
- Ignore VAT, totals, discount, client, dates, title
- Do not guess missing values
- Do not add top-level fields outside this structure`

export const quotationImportAdapter = {
  documentType: 'quotation' as const,
  prompts: {
    'Create Rows': quotationImportPrompt,
    'Update Table': quotationUpdateTablePrompt,
  },
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
