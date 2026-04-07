export type BackgroundMode = 'solid' | 'gradient' | 'palette';

export interface RfqPalette {
  name: string;
  colors: string[];
}

export const RFQ_PALETTES: RfqPalette[] = [
  {
    name: 'Arctic Pearl',
    colors: ['#F7FBFD', '#D6E6EF', '#7FA6B8', '#2A3E4B'],
  },
  {
    name: 'Midnight Sapphire',
    colors: ['#FFF1E8', '#8FAADC', '#2F5DA8', '#0C1F3F'],
  },
  {
    name: 'Coastal Midnight',
    colors: ['#447794', '#2D5B75', '#123249', '#061222'],
  },
  {
    name: 'Verdant Luxe',
    colors: ['#B67E7D', '#5DA87A', '#2E6B46', '#17402A'],
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
  issue_date: string;
  expiry_date: string;
  show_brand_name: boolean;
  brand_name_override: string;
  background_mode: BackgroundMode;
  background_primary: string;
  background_secondary: string;
  palette_name: string;
  text_color: string;
  accent_color: string;
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
