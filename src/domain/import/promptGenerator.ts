import type { ColumnConfig } from '@/domain/invoice/types'
import type { ImportMode } from '@/domain/import/types'

export function generateImportPrompt(columns: ColumnConfig[], mode: ImportMode, documentType: 'invoice' | 'quotation'): string {
  const visibleColumns = columns.filter(col => 
    col.visibilityMode === 'show' || col.key === 'description'
  ).filter(col => 
    !['amount', 'vat_rate', 'discount_rate', 'install_rate'].includes(col.key)
  )

  const itemSchema: Record<string, any> = {}
  const customSchema: Record<string, string> = {}
  
  visibleColumns.forEach(col => {
    if (col.key.startsWith('custom_')) {
      customSchema[col.label || col.key] = "Value"
    } else {
      itemSchema[col.key] = col.label || col.key
    }
  })

  if (Object.keys(customSchema).length > 0) {
    itemSchema.custom_fields = customSchema
  }

  // Ensure sub_description is available as it's a common requirement for detail extraction
  if (!itemSchema.sub_description) {
    itemSchema.sub_description = "Additional details"
  }

  const jsonStructure: any = {
    title: "Document Title",
    po_number: "PO-12345",
    notes: "Remarks or internal notes",
    terms: "Payment terms or conditions",
    extra_charges: [
      { label: "Delivery", value: 5000 }
    ],
    items: mode === 'Update' 
      ? [ { row_number: 1, ...itemSchema } ] 
      : [ itemSchema ]
  }

  const rules = [
    `Extract document title into "title" (Maps to ${documentType === 'invoice' ? 'Invoice' : 'Quotation'} Title field)`,
    `Extract PO reference into "po_number"`,
    `Put remarks into "notes"`,
    `Put conditions / payment terms into "terms"`,
    `Standalone charges -> extra_charges (label + value only)`,
    `Main table -> items`,
    `JSON only.`,
    mode === 'Update' ? `row_number refers to the current visible table row numbering starting at 1` : ``,
    mode === 'Update' ? `Include only fields that should change inside each row` : ``,
    `Exclude always: amount, vat_rate, discount_rate, install_rate, totals, or calculated fields`,
    `Import must reflect the active form configuration: only include shown columns.`,
  ].filter(Boolean)

  return `Convert the source content into JSON for ${documentType} ${mode === 'Add' ? 'import' : 'update'}.

Return JSON only.

${JSON.stringify(jsonStructure, null, 2)}

Rules:
${rules.map(r => `- ${r}`).join('\n')}
- Use exactly these keys for item fields: ${Object.keys(itemSchema).join(', ')}
${Object.keys(customSchema).length > 0 ? `- Use these keys inside "custom_fields": ${Object.keys(customSchema).join(', ')}` : ''}
- Do not guess missing values
- Do not add top-level fields outside this structure`
}
