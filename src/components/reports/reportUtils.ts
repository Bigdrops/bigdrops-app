import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'
import { DatePreset, InvoiceFinancialRow, MetricTone } from './reportTypes'

export const formatMoney = (value: number | null | undefined) => formatNaira(value)

export const formatDate = (value: string | null | undefined) =>
  formatDisplayDate(value, {
    fallback: '—',
    locale: 'en-NG',
    dateOptions: { day: 'numeric', month: 'short', year: 'numeric' },
  })

export const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
export const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0)
export const startOfQuarter = (date: Date) => new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1)

export const toDateInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const safeDate = (val: string | null | undefined) => (val && val.trim() !== '' ? val : null)

export const getPresetRange = (preset: DatePreset, customStart: string, customEnd: string) => {
  const now = new Date()
  if (preset === 'this_month') return { start: toDateInput(startOfMonth(now)), end: toDateInput(endOfMonth(now)) }
  if (preset === 'last_month') {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return { start: toDateInput(startOfMonth(lastMonth)), end: toDateInput(endOfMonth(lastMonth)) }
  }
  if (preset === 'this_quarter') return { start: toDateInput(startOfQuarter(now)), end: toDateInput(now) }
  return { start: customStart || '', end: customEnd || '' }
}

export const isWithinRange = (value: string | null | undefined, start: string, end: string) => {
  if (!value) return true
  if (start && value < start) return false
  if (end && value > end) return false
  return true
}

export const isPastDue = (dueDate: string | null | undefined, balanceDue: number | null | undefined) => {
  const balance = Number(balanceDue || 0)
  if (balance <= 0 || !dueDate) return false
  const due = new Date(dueDate)
  if (Number.isNaN(due.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return due < today
}

export const getReceivableStatus = (row: Pick<InvoiceFinancialRow, 'computed_status' | 'balance_due' | 'due_date'>) => {
  const normalized = String(row.computed_status || '').toLowerCase()
  if (normalized === 'paid' || Number(row.balance_due || 0) <= 0) return 'paid'
  if (normalized === 'partial' || normalized === 'partially_paid') return 'partially_paid'
  return 'unpaid'
}

export const getReceivableStatusLabel = (row: Pick<InvoiceFinancialRow, 'computed_status' | 'balance_due' | 'due_date'>) => {
  if (isPastDue(row.due_date, row.balance_due)) return 'Past Due'
  const status = getReceivableStatus(row)
  if (status === 'partially_paid') return 'Partially Paid'
  if (status === 'paid') return 'Paid'
  return 'Unpaid'
}

export const getAgingBucket = (dueDate: string | null | undefined) => {
  if (!dueDate) return 'Current'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - due.getTime()) / 86400000)
  if (diff <= 0) return 'Current'
  if (diff <= 30) return '1–30'
  if (diff <= 60) return '31–60'
  return '61+'
}

export const getStatusClass = (status: string | null | undefined) => {
  switch (String(status || '').toLowerCase()) {
    case 'paid':
      return 'bg-emerald-500 text-white'
    case 'past_due':
      return 'bg-red-500 text-white'
    case 'partially_paid':
      return 'bg-amber-500 text-white'
    case 'unpaid':
    case 'active':
    case 'current':
      return 'bg-blue-500 text-white'
    case 'completed':
    case 'open':
      return 'bg-slate-500 text-white'
    default:
      return 'bg-slate-500 text-white'
  }
}

export const getMetricToneClasses = (tone: MetricTone) => {
  switch (tone) {
    case 'green':
      return { card: 'border-emerald-200 bg-emerald-50/60', icon: 'bg-emerald-100 text-emerald-700', value: 'text-emerald-700' }
    case 'red':
      return { card: 'border-red-200 bg-red-50/60', icon: 'bg-red-100 text-red-700', value: 'text-red-700' }
    case 'amber':
      return { card: 'border-amber-200 bg-amber-50/70', icon: 'bg-amber-100 text-amber-700', value: 'text-amber-700' }
    default:
      return { card: 'border-blue-200 bg-blue-50/60', icon: 'bg-blue-100 text-blue-700', value: 'text-blue-700' }
  }
}

export const getAgingBadgeClass = (aging: string) => {
  switch (aging) {
    case 'Current':
      return 'bg-blue-500 text-white'
    case '1–30':
      return 'bg-amber-500 text-white'
    case '31–60':
      return 'bg-orange-500 text-white'
    case '61+':
      return 'bg-red-500 text-white'
    default:
      return 'bg-slate-500 text-white'
  }
}

export const getLeftBorderClass = (status: string | null | undefined) => {
  switch (String(status || '').toLowerCase()) {
    case 'paid':
      return 'border-l-4 border-l-emerald-500'
    case 'past_due':
      return 'border-l-4 border-l-red-500'
    case 'partially_paid':
      return 'border-l-4 border-l-amber-500'
    case 'unpaid':
    case 'active':
    case 'current':
      return 'border-l-4 border-l-blue-500'
    case 'completed':
    case 'open':
      return 'border-l-4 border-l-slate-500'
    default:
      return 'border-l-4 border-l-slate-300'
  }
}
