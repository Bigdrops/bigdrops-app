import type { QuotationStatus } from '@/domain/quotation'

export const QUOTATION_STATUSES: QuotationStatus[] = [
  'draft',
  'sent',
  'accepted',
  'rejected',
]

export function formatQuotationStatus(status: string | null | undefined): string {
  const value = String(status || 'draft')
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function quotationStatusTone(status: string | null | undefined) {
  const value = String(status || 'draft').toLowerCase()
  if (value === 'accepted') return 'bg-emerald-100 text-emerald-700'
  if (value === 'rejected') return 'bg-rose-100 text-rose-700'
  if (value === 'sent') return 'bg-blue-100 text-blue-700'
  return 'bg-slate-100 text-slate-700'
}
