import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'
import type { DatePreset, InvoiceFinancialRow, MetricTone } from './reportTypes'

export const formatMoney = (value: number | null | undefined) => formatNaira(value)

type ReportTaxInvoiceLike = {
  vat?: number | null
  wht?: number | null
}

type ReportTaxPaymentLike = {
  wht_amount?: number | null
}

export const computeReportTaxMetrics = (
  invoices: ReportTaxInvoiceLike[],
  payments: ReportTaxPaymentLike[],
) => {
  const vatChargedValue = invoices.reduce((sum, row) => sum + Number(row?.vat || 0), 0)
  const expectedWhtExposureValue = invoices.reduce((sum, row) => sum + Number(row?.wht || 0), 0)
  const actualWhtDeductedValue = payments.reduce((sum, row) => sum + Number(row?.wht_amount || 0), 0)
  const vatLessActualWhtValue = vatChargedValue - actualWhtDeductedValue

  return {
    vatChargedValue,
    expectedWhtExposureValue,
    actualWhtDeductedValue,
    vatLessActualWhtValue,
  }
}

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
      return 'border-[hsl(var(--bd-status-success-border))] bg-[hsl(var(--bd-status-success-bg))] text-[hsl(var(--bd-status-success-text))]'
    case 'past_due':
      return 'border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] text-[hsl(var(--bd-status-danger-text))]'
    case 'partially_paid':
      return 'border-[hsl(var(--bd-status-warning-border))] bg-[hsl(var(--bd-status-warning-bg))] text-[hsl(var(--bd-status-warning-text))]'
    case 'unpaid':
    case 'active':
    case 'current':
      return 'border-[hsl(var(--bd-status-info-border))] bg-[hsl(var(--bd-status-info-bg))] text-[hsl(var(--bd-status-info-text))]'
    case 'completed':
    case 'open':
      return 'border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))]'
    default:
      return 'border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))]'
  }
}

export const getMetricToneClasses = (tone: MetricTone) => {
  switch (tone) {
    case 'green':
      return {
        card: 'border-[hsl(var(--bd-status-success-border))] bg-[hsl(var(--bd-status-success-bg))]',
        icon: 'bg-[hsl(var(--bd-status-success-bg))] text-[hsl(var(--bd-status-success-text))]',
        value: 'text-[hsl(var(--bd-status-success-text))]',
      }
    case 'red':
      return {
        card: 'border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))]',
        icon: 'bg-[hsl(var(--bd-status-danger-bg))] text-[hsl(var(--bd-status-danger-text))]',
        value: 'text-[hsl(var(--bd-status-danger-text))]',
      }
    case 'amber':
      return {
        card: 'border-[hsl(var(--bd-status-warning-border))] bg-[hsl(var(--bd-status-warning-bg))]',
        icon: 'bg-[hsl(var(--bd-status-warning-bg))] text-[hsl(var(--bd-status-warning-text))]',
        value: 'text-[hsl(var(--bd-status-warning-text))]',
      }
    default:
      return {
        card: 'border-[hsl(var(--bd-status-info-border))] bg-[hsl(var(--bd-status-info-bg))]',
        icon: 'bg-[hsl(var(--bd-status-info-bg))] text-[hsl(var(--bd-status-info-text))]',
        value: 'text-[hsl(var(--bd-status-info-text))]',
      }
  }
}

export const getAgingBadgeClass = (aging: string) => {
  switch (aging) {
    case 'Current':
      return 'border-[hsl(var(--bd-status-info-border))] bg-[hsl(var(--bd-status-info-bg))] text-[hsl(var(--bd-status-info-text))]'
    case '1–30':
      return 'border-[hsl(var(--bd-status-warning-border))] bg-[hsl(var(--bd-status-warning-bg))] text-[hsl(var(--bd-status-warning-text))]'
    case '31–60':
      return 'border-[hsl(var(--bd-status-warning-border))] bg-[hsl(var(--bd-status-warning-bg))] text-[hsl(var(--bd-status-warning-text))]'
    case '61+':
      return 'border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] text-[hsl(var(--bd-status-danger-text))]'
    default:
      return 'border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))]'
  }
}

export const getLeftBorderClass = (status: string | null | undefined) => {
  switch (String(status || '').toLowerCase()) {
    case 'paid':
      return 'border-l-4 border-l-[hsl(var(--bd-status-success-border))]'
    case 'past_due':
      return 'border-l-4 border-l-[hsl(var(--bd-status-danger-border))]'
    case 'partially_paid':
      return 'border-l-4 border-l-[hsl(var(--bd-status-warning-border))]'
    case 'unpaid':
    case 'active':
    case 'current':
      return 'border-l-4 border-l-[hsl(var(--bd-status-info-border))]'
    case 'completed':
    case 'open':
      return 'border-l-4 border-l-[hsl(var(--bd-border))]'
    default:
      return 'border-l-4 border-l-[hsl(var(--bd-border))]'
  }
}
