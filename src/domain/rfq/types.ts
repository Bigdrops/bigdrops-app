export interface RfqPreset {
  name: string;
  background: string;
  text: string;
  border: string;
  accent: string;
}

export const RFQ_PRESETS: RfqPreset[] = [
  {
    name: 'Clean Slate',
    background: '#FFFFFF',
    text: '#1F2937',
    border: '#D1D5DB',
    accent: '#1D4ED8',
  },
  {
    name: 'Ocean Mist',
    background: '#EAEBED',
    text: '#1F2A33',
    border: '#A7BBC4',
    accent: '#006989',
  },
  {
    name: 'Moss Paper',
    background: '#F8F5F2',
    text: '#2D3A33',
    border: '#CFC7BE',
    accent: '#385144',
  },
  {
    name: 'Matcha Coal',
    background: '#EAF2EA',
    text: '#222222',
    border: '#B9CBB9',
    accent: '#4A6A55',
  },
  {
    name: 'Amber Ledger',
    background: '#F2E0D0',
    text: '#2F241C',
    border: '#D4BEAA',
    accent: '#6E88B0',
  },
];

export interface RfqItem {
  id?: string;
  rfq_id?: string;
  sort_order: number;
  description: string;
  quantity: number;
  unit: string;
  specification: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
  _uiKey?: string; // For React list rendering
}

export interface Rfq {
  id?: string;
  rfq_number: string;
  title: string;
  vendor_name: string;
  vendor_contact: string;
  show_vendor_identity: boolean;
  issue_date: string;
  expiry_date: string;
  show_brand_name: boolean;
  brand_name_override: string;
  background_color: string;
  text_color: string;
  border_color: string;
  accent_color: string;
  preset_name: string;
  export_order_seed: number;
  notes: string;
  custom_fields: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  items?: RfqItem[];
}

export interface DbRfq extends Omit<Rfq, 'items' | 'custom_fields'> {
  custom_fields: string | Record<string, any> | null;
}

export interface DbRfqItem extends RfqItem {}
