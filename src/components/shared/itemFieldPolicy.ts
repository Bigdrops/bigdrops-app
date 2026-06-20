export type ItemContext = 'invoice' | 'waybill'

export const ITEM_FIELD_POLICY: Record<
  ItemContext,
  {
    root: string[]
    custom: string[]
  }
> = {
  invoice: {
    root: [
      'item_id',
      'description',
      'sub_description',
      'quantity',
      'unit',
      'unit_price',
      'make',
      'partNo',
      'condition',
      'install_rate',
      'install_rate_override',
      'vat_rate',
      'discount_rate',
      'custom_data',
      'image_url',
      'row_type',
    ],
    custom: [],
  },

  waybill: {
    root: [
      'description',
      'sub_description',
      'quantity',
      'unit',
      'make',
      'partNo',
      'condition',
      'custom_data',
      'image_url',
      'row_type',
    ],
    custom: ['item_id'],
  },
}
