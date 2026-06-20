export type ItemContext = "invoice" | "waybill"

export const ITEM_FIELD_POLICY: Record<
  ItemContext,
  {
    root: string[]
    custom: string[]
  }
> = {
  invoice: {
    root: ["item_id", "description", "quantity", "unit", "price"],
    custom: [],
  },

  waybill: {
    root: ["description", "quantity", "unit", "condition", "row_type"],
    custom: ["item_id"],
  },
}