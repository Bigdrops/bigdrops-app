export const DEFAULT_PREFIXES = {
  waybill: 'WBL',
  invoice: 'INV',
  boq: 'BOQ',
  rfq: 'RFQ',
  quotation: 'QTN',
  project: 'PRJ',
  csr: 'CSR',
} as const

export type DocumentPrefixKey = keyof typeof DEFAULT_PREFIXES

export type DocumentPrefixes = Record<DocumentPrefixKey, string>

export function resolvePrefix(
  documentPrefixes: Record<string, string> | null | undefined,
  key: DocumentPrefixKey,
): string {
  const value = documentPrefixes?.[key]
  if (typeof value === 'string' && /^[A-Z0-9]{2,6}$/.test(value)) {
    return value
  }
  return DEFAULT_PREFIXES[key]
}
