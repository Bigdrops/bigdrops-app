import type { QuotationStatus } from '@/domain/quotation'

export const QUOTATION_STATUSES: QuotationStatus[] = [
  'open',
  'converted',
  'archived',
]

export function formatQuotationStatus(status: string | null | undefined): string {
  const value = String(status || 'open')
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function quotationStatusTone(status: string | null | undefined) {
  const value = String(status || 'open').toLowerCase()
  if (value === 'converted') return 'bg-emerald-100 text-emerald-700'
  if (value === 'archived') return 'bg-slate-200 text-slate-700'
  if (value === 'open') return 'bg-blue-100 text-blue-700'
  return 'bg-slate-100 text-slate-700'
}
