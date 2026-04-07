import { Rfq, DbRfq, RfqItem, DbRfqItem } from './types';

export const normalizeDbRfq = (dbRfq: any, dbItems: any[] = []): Rfq => {
  return {
    ...dbRfq,
    custom_fields: typeof dbRfq.custom_fields === 'string' 
      ? JSON.parse(dbRfq.custom_fields) 
      : (dbRfq.custom_fields || {}),
    items: dbItems.map((item, idx) => ({
      ...item,
      _uiKey: item.id || crypto.randomUUID(),
      sort_order: item.sort_order ?? idx,
      quantity: Number(item.quantity || 0),
    })).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
  };
};

export const denormalizeToDbRfq = (rfq: Rfq): DbRfq => {
  const { items, ...rest } = rfq;
  return {
    ...rest,
    custom_fields: rfq.custom_fields || {},
  };
};

export const denormalizeToDbRfqItem = (item: RfqItem, rfqId: string): DbRfqItem => {
  const { _uiKey, ...rest } = item;
  return {
    ...rest,
    rfq_id: rfqId,
    quantity: Number(item.quantity || 0),
    sort_order: Number(item.sort_order || 0),
  };
};

export function getNextRfqNumber(
  rows: Array<{ rfq_number: string }>,
  prefix = 'RFQ',
): string {
  const maxNumber = rows
    .map((row) => String(row.rfq_number || '').trim().toUpperCase())
    .filter((value) => value.startsWith(`${prefix}-`))
    .map((value) => {
      const match = value.match(/-(\d+)$/)
      return match ? Number(match[1]) : null
    })
    .filter((value): value is number => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 0)

  return `${prefix}-${String(maxNumber + 1).padStart(3, '0')}`
}
