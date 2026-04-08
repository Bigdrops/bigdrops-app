import { Rfq, RfqItem, RFQ_PRESETS } from './types';

export const createEmptyRfqItem = (sort_order: number): RfqItem => ({
  _uiKey: crypto.randomUUID(),
  sort_order,
  description: '',
  quantity: 0,
  unit: '',
  specification: '',
  notes: '',
});

export const createEmptyRfq = (): Rfq => {
  const defaultPreset = RFQ_PRESETS[0]; // Clean Slate
  
  return {
    rfq_number: '',
    title: '',
    vendor_name: '',
    vendor_contact: '',
    show_vendor_identity: false,
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    show_brand_name: false,
    brand_name_override: '',
    background_color: defaultPreset.background,
    text_color: defaultPreset.text,
    border_color: defaultPreset.border,
    accent_color: defaultPreset.accent,
    preset_name: defaultPreset.name,
    export_order_seed: Math.floor(Math.random() * 1000000),
    notes: '',
    custom_fields: {},
    items: [createEmptyRfqItem(0)],
  };
};

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
