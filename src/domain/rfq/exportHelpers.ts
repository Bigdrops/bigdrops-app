import { Rfq, RfqItem } from './types';

/**
 * Splits items into chunks based on a limit.
 * This ensures the export is readable and doesn't create one giant uncontrolled image.
 */
export function chunkRfqItems(items: RfqItem[], chunkSize: number = 6): RfqItem[][] {
  const chunks: RfqItem[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Reshuffles items based on the rfq's export_seed.
 * Use the same seeded random logic from preview.
 */
export function getReshuffledItems(rfq: Rfq, items: RfqItem[]): RfqItem[] {
  if (!rfq.export_order_seed) return items;
  
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  return [...items].sort((a, b) => {
    const seedA = rfq.export_order_seed! + (a.sort_order || 0);
    const seedB = rfq.export_order_seed! + (b.sort_order || 0);
    return seededRandom(seedA) - seededRandom(seedB);
  });
}
