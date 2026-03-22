import type {
  ExtraCharge,
  InvoiceFieldEntry,
  InvoiceGroup,
  InvoiceItem,
} from './types'

export function makeEmptyItem(): InvoiceItem {
  return {
    _uiKey: 'item_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    description: '',
    sub_description: '',
    make: '',
    quantity: 1,
    unit: '',
    unit_price: 0,
    install_rate: null,
    install_rate_override: false,
    vat_rate: null,
    discount_rate: null,
    row_type: 'standard',
    group_name: '',
    sort_order: 0,
    image_url: null,
    custom_data: {},
  }
}

export function makeEmptyGroup(name = ''): InvoiceGroup {
  return {
    id: 'grp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    name,
    showSubtotal: false,
    items: [],
  }
}

export function makeFieldEntry(overrides: Partial<InvoiceFieldEntry> = {}): InvoiceFieldEntry {
  return {
    id: 'field_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    ...overrides,
  }
}

export function makeExtraCharge(overrides: Partial<ExtraCharge> = {}): ExtraCharge {
  return {
    id: 'charge_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    label: '',
    value: 0,
    withTax: true,
    ...overrides,
  }
}

export function ensureUiKey(item: InvoiceItem, prefix = 'item'): InvoiceItem {
  return {
    ...item,
    _uiKey:
      item._uiKey ||
      item.id ||
      `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  }
}

export function normalizeFieldEntries(
  entries: InvoiceFieldEntry[] | null | undefined,
  valueKey: 'value' | 'text',
): InvoiceFieldEntry[] {
  return (Array.isArray(entries) ? entries : []).map((entry) =>
    makeFieldEntry({
      ...entry,
      [valueKey]: entry?.[valueKey] || '',
    }),
  )
}

export function normalizeExtraCharges(
  charges: ExtraCharge[] | null | undefined,
): ExtraCharge[] {
  return (Array.isArray(charges) ? charges : []).map((charge) =>
    makeExtraCharge({
      ...charge,
      value: Number(charge?.value || 0),
      withTax: charge?.withTax !== false,
    }),
  )
}

export function toDbItem(
  item: InvoiceItem,
  invoiceId: string | null | undefined,
  sortOrder: number,
) {
  const { install_rate_override, _uiKey, id: _id, created_at: _ca, ...rest } = item
  return {
    ...rest,
    invoice_id: invoiceId,
    sort_order: sortOrder,
    amount: Number(item.quantity || 1) * Number(item.unit_price || 0),
    custom_data: JSON.stringify(item.custom_data || {}),
    install_rate: item.install_rate ?? null,
    install_rate_override: item.install_rate_override === true,
    vat_rate: item.vat_rate ?? null,
    discount_rate: item.discount_rate ?? null,
    image_url: item.image_url || null,
  }
}
