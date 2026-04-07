import { Rfq, RfqItem } from './types';
import { createRfqFromContract } from './factories';

export const rfqImportAdapter = {
  parseJson: (raw: string): Partial<Rfq> | null => {
    try {
      const data = JSON.parse(raw);
      if (typeof data !== 'object' || data === null) return null;
      
      // Basic validation: must have items or some RFQ fields
      if (!data.items && !data.title && !data.vendor_name) return null;

      return createRfqFromContract(data);
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
  "brand_name_override": "",
  "background_mode": "palette",
  "palette_name": "Coastal Midnight",
  "background_primary": "#447794",
  "background_secondary": "#061222",
  "text_color": "#061222",
  "accent_color": "#123249",
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
