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
    return `Extract the Request for Quote (RFQ) details into this JSON format:
{
  "title": "Short descriptive title",
  "vendor_name": "Vendor name",
  "issue_date": "YYYY-MM-DD",
  "show_brand_name": false,
  "show_vendor_identity": false,
  "brand_name_override": "",
  "background_color": "#FFFFFF",
  "text_color": "#1F2937",
  "border_color": "#D1D5DB",
  "accent_color": "#1D4ED8",
  "preset_name": "Clean Slate",
  "notes": "General conditions or notes",
  "items": [
    {
      "description": "Item name/desc",
      "quantity": 10,
      "unit": "PCS",
      "specification": "Technical specs",
      "notes": "Item specific notes"
    }
  ]
}`;
  }
};
