import type { ColumnConfig } from '@/domain/invoice/types'
import type { ImportMode } from '@/domain/import/types'

export const JSON_IMPORT_DISCIPLINE_SPEC = `You are a strict JSON data extractor. Follow these rules without exception:

· Return ONLY data explicitly present in the source document.
· Never infer, guess, or fabricate values.
· Missing values MUST be null.
· Do not rename or reorder fields.
· Output MUST be valid JSON only.
· Groups are allowed ONLY if explicitly present in the source document.
· Never create groups from layout, indentation, or spacing.
· Each document type is independent (no cross-domain inference).
· The identifier po_number MUST be null unless the source explicitly labels it as PO/Voucher.`

export function generateImportPrompt(columns: ColumnConfig[], mode: ImportMode, documentType: 'invoice' | 'quotation'): string {
  const DISCIPLINE_SPEC = JSON_IMPORT_DISCIPLINE_SPEC

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
    ...(mode === 'Add' ? {
      groups: [
        {
          id: "grp_1",
          name: "Section or Category Name",
          showSubtotal: false,
          itemIds: ["item_1", "item_2"]
        }
      ]
    } : {}),
    items: mode === 'Update'
      ? [{ row_number: 1, ...itemSchema }]
      : [{ temp_ref: "item_1", group_id: "grp_1", ...itemSchema }]
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
    ...(mode === 'Add' ? [
      `If source has section headings or categories, create a "groups" array`,
      `Assign each group a stable id: "grp_1", "grp_2", etc.`,
      `Add a unique "temp_ref" to every item: "item_1", "item_2", etc.`,
      `Set "group_id" on each item matching its group's "id"`,
      `List item temp_refs in the group's "itemIds" array`,
      `If no sections exist in the source, omit "groups" entirely and omit "temp_ref" and "group_id" from items`,
      `Never infer groups from indentation, indentation depth, bullet style, or visual spacing — only from explicit section headings or category labels`,
      `Preserve the exact item order from the source document — do not reorder items based on groups or any other criteria`,
    ] : []),
    `Exclude always: amount, vat_rate, discount_rate, install_rate, totals, or calculated fields`,
    `Import must reflect the active form configuration: only include shown columns.`,
  ].filter(Boolean)

  return DISCIPLINE_SPEC + "\n\n" + `Convert the source content into JSON for ${documentType} ${mode === 'Add' ? 'import' : 'update'}.

Return JSON only.

${JSON.stringify(jsonStructure, null, 2)}

Rules:
${rules.map(r => `- ${r}`).join('\n')}
- Use exactly these keys for item fields: ${mode === 'Add' ? 'temp_ref, group_id, ' : ''}${Object.keys(itemSchema).join(', ')}
${Object.keys(customSchema).length > 0 ? `- Use these keys inside "custom_fields": ${Object.keys(customSchema).join(', ')}` : ''}
- Do not guess missing values
- Do not add top-level fields outside this structure

Wrap the JSON output in a code block.
Copy the JSON above and paste it back into the app.`
}
