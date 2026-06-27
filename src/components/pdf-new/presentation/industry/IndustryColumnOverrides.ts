export const INDUSTRY_COLUMN_OVERRIDES: Record<
  string,
  { width?: number; flex?: number }
> = {
  num: { width: 20, flex: 0.45 },
  description: { flex: 3.7 },
  make: { flex: 1.1 },
  quantity: { width: 44, flex: 0.8 },
  unit: { width: 44, flex: 0.85 },
  unit_price: { width: 74, flex: 1.35 },
  amount: { width: 82, flex: 1.55 },
  install_rate: { width: 74, flex: 1.3 },
  vat_rate: { width: 42, flex: 0.82 },
  discount_rate: { width: 48, flex: 0.92 },
}
