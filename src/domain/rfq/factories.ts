import { Rfq, RfqItem } from './types';

export const createEmptyRfqItem = (sort_order: number): RfqItem => ({
  _uiKey: crypto.randomUUID(),
  sort_order,
  description: '',
  quantity: 0,
  unit: '',
  specification: '',
  notes: '',
});

export const createEmptyRfq = (): Rfq => ({
  rfq_number: '',
  title: '',
  vendor_name: '',
  vendor_contact: '',
  issue_date: new Date().toISOString().split('T')[0],
  expiry_date: '',
  show_brand_name: false,
  brand_name_override: '',
  background_mode: 'palette',
  background_primary: '#447794',
  background_secondary: '#061222',
  palette_name: 'Coastal Midnight',
  text_color: '#061222',
  accent_color: '#123249',
  export_order_seed: Math.floor(Math.random() * 1000000),
  notes: '',
  custom_fields: {},
  items: [createEmptyRfqItem(0)],
});

export const createRfqFromContract = (contract: any): Rfq => {
  const rfq = createEmptyRfq();
  return {
    ...rfq,
    ...contract,
    items: contract.items?.map((item: any, idx: number) => ({
      ...createEmptyRfqItem(idx),
      ...item,
    })) || [createEmptyRfqItem(0)],
  };
};
