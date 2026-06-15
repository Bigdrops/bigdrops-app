import { Rfq, RfqItem } from './types';
import { createRfqFromContract } from './factories';
import { createEmptyTableRow } from '@/domain/table-document/rows';
import { getDefaultColumnsForDocument } from '@/domain/table-document/templateRegistry';

export const rfqImportAdapter = {
  parseJson: (raw: string): Partial<Rfq> | null => {
    try {
      const data = JSON.parse(raw);
      if (typeof data !== 'object' || data === null) return null;
      
      // Basic validation: must have items or some RFQ fields
      if (!data.items && !data.title && !data.vendor_name) return null;

      const rfq = createRfqFromContract(data);
      return {
        ...rfq,
        template_id: rfq.template_id || 'modern',
        table_columns: rfq.table_columns || getDefaultColumnsForDocument('rfq'),
        table_rows: (rfq.items || []).map((item, index) => ({
          ...createEmptyTableRow(index, 'item'),
          description: item.description || '',
          specification: item.specification || '',
          quantity: Number(item.quantity || 0),
          unit: item.unit || '',
          notes: item.notes || '',
        })),
      };
    } catch (e) {
      console.error('Failed to parse RFQ JSON', e);
      return null;
    }
  },

  getPrompt: () => {
    return `Extract RFQ line items from the source document.

RULES:
1. Return null for any missing field — never guess or infer.
2. Return valid JSON only. No markdown, no explanation.
3. Wrap the JSON in a code block.
4. After the code block write: "Copy the JSON above and paste it back into the app."
5. This document type is isolated. Do not reuse logic from any other document type.
6. Do not create groups. RFQ is a flat item list only.

Return a JSON array of objects with this exact shape:
[
  {
    "item_name": "",
    "quantity": 1,
    "specification": null
  }
]

Fields:
- item_name (string, required) — name or description of the requested item
- quantity (number, required, must be > 0)
- specification (string or null) — technical details, model, standard, or requirements`;
  }
};
