import { FileText, Wrench, ClipboardList, Truck } from 'lucide-react'
import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'
import { formatStatusLabel } from '@/lib/formatters/status'

export const PROJECT_STATUS_CONFIG = {
  active: { label: 'Active', className: 'bg-blue-500 text-white' },
  completed: { label: 'Completed', className: 'bg-slate-500 text-white' },
  on_hold: { label: 'On Hold', className: 'bg-amber-500 text-white' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500 text-white' },
}

export const PAYMENT_STATUS_CONFIG = {
  paid: { label: 'Paid', className: 'bg-emerald-500 text-white' },
  overdue: { label: 'Past Due', className: 'bg-red-500 text-white' },
  partially_paid: { label: 'Partially Paid', className: 'bg-amber-500 text-white' },
  unpaid: { label: 'Unpaid', className: 'bg-blue-500 text-white' },
  active: { label: 'Active', className: 'bg-blue-500 text-white' },
  completed: { label: 'Completed', className: 'bg-slate-500 text-white' },
}

export const DOC_TYPE = {
  invoice: {
    label: 'Invoice',
    icon: FileText,
    iconWrapClassName: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
    labelClassName: 'text-blue-700',
  },
  csr: {
    label: 'CSR',
    icon: Wrench,
    iconWrapClassName: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    labelClassName: 'text-emerald-700',
  },
  quotation: {
    label: 'Quotation',
    icon: ClipboardList,
    iconWrapClassName: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
    labelClassName: 'text-violet-700',
  },
  waybill: {
    label: 'Waybill',
    icon: Truck,
    iconWrapClassName: 'bg-orange-50 text-orange-700 ring-1 ring-orange-100',
    labelClassName: 'text-orange-700',
  },
}

export const formatCurrency = (value) => formatNaira(value)

export const formatDate = (value) =>
  formatDisplayDate(value, {
    fallback: '',
    invalidFallback: '',
    locale: 'en-GB',
    dateOptions: {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  })

export function getPaymentStatusConfig(status) {
  return PAYMENT_STATUS_CONFIG[status] || {
    label: status ? formatStatusLabel(status) : 'Open',
    className: 'bg-slate-500 text-white',
  }
}

export const cardClassName = 'rounded-2xl border border-slate-200 bg-card shadow-sm ring-1 ring-slate-100'
export const inputClassName = 'w-full rounded-lg border border-slate-200 bg-background px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'
export const DOC_TYPE_LABELS = {
  invoice: 'Invoice',
  quotation: 'Quotation',
  csr: 'CSR',
  waybill: 'Waybill',
}
