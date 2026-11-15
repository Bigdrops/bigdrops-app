export const FPS = 30;

export const SHOTS = {
  title: { from: 0, dur: 120 },
  why: { from: 120, dur: 210 },
  step1: { from: 330, dur: 240 },
  step2: { from: 570, dur: 270 },
  step3: { from: 840, dur: 300 },
  rows: { from: 1140, dur: 360 },
  result: { from: 1500, dur: 240 },
  recap: { from: 1740, dur: 210 },
} as const;

export const TOTAL = SHOTS.recap.from + SHOTS.recap.dur; // 1950 frames / 65s

export type InvoiceRow = {
  desc: string;
  sub: string;
  qty: number;
  rate: number;
  warranty: string;
};

/** Fictional demo data. No real client, supplier or price list. */
export const ROWS: InvoiceRow[] = [
  { desc: 'Cable tray, 3m galvanised', sub: 'Perforated, 100mm', qty: 24, rate: 18500, warranty: '12 months' },
  { desc: 'PVC conduit, 25mm', sub: 'Heavy gauge', qty: 60, rate: 4200, warranty: '12 months' },
  { desc: 'Distribution board, 12-way', sub: 'Surface mount', qty: 4, rate: 96500, warranty: '24 months' },
  { desc: 'Copper earth rod', sub: '1.2m, c/w clamp', qty: 12, rate: 14200, warranty: '24 months' },
  { desc: 'Circuit breaker, 32A', sub: 'Type C, MCB', qty: 18, rate: 12750, warranty: '24 months' },
  { desc: 'Cable gland set', sub: 'Brass, 25mm', qty: 40, rate: 1850, warranty: '12 months' },
  { desc: 'Installation labour', sub: 'Per point', qty: 3, rate: 45000, warranty: '6 months' },
  { desc: 'Site supervision', sub: 'Per visit', qty: 2, rate: 60000, warranty: '6 months' },
];

export const VAT_RATE = 0.075;

export function totals(rows: InvoiceRow[] = ROWS) {
  const subtotal = rows.reduce((sum, row) => sum + row.qty * row.rate, 0);
  const vat = Math.round(subtotal * VAT_RATE);
  return { subtotal, vat, total: subtotal + vat };
}
