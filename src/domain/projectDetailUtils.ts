import { FileText, Wrench, ClipboardList, Truck, LucideIcon } from 'lucide-react'
import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'
import { formatStatusLabel } from '@/lib/formatters/status'
import { getStatusTone, getStatusClasses } from '@/lib/statusTheme'

export interface ProjectStatusConfig {
  label: string
  className: string
}

export const PROJECT_STATUS_CONFIG: Record<string, ProjectStatusConfig> = {
  active: { label: 'Active', className: getStatusClasses(getStatusTone('active')) },
  completed: { label: 'Completed', className: getStatusClasses(getStatusTone('completed')) },
  on_hold: { label: 'On Hold', className: getStatusClasses(getStatusTone('on_hold')) },
  cancelled: { label: 'Cancelled', className: getStatusClasses(getStatusTone('cancelled')) },
}

export const PAYMENT_STATUS_CONFIG: Record<string, ProjectStatusConfig> = {
  paid: { label: 'Paid', className: getStatusClasses(getStatusTone('paid')) },
  overdue: { label: 'Past Due', className: getStatusClasses(getStatusTone('overdue')) },
  partially_paid: { label: 'Partially Paid', className: getStatusClasses(getStatusTone('partially_paid')) },
  unpaid: { label: 'Unpaid', className: getStatusClasses(getStatusTone('unpaid')) },
  active: { label: 'Active', className: getStatusClasses(getStatusTone('active')) },
  completed: { label: 'Completed', className: getStatusClasses(getStatusTone('completed')) },
}

export interface DocTypeConfig {
  label: string
  icon: LucideIcon
  iconWrapClassName: string
  labelClassName: string
}

export const DOC_TYPE: Record<string, DocTypeConfig> = {
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

export const formatCurrency = (value: number | string | null | undefined): string => formatNaira(value)

export const formatDate = (value: string | number | Date | null | undefined): string =>
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

export function getPaymentStatusConfig(status: string | null | undefined): ProjectStatusConfig {
  return PAYMENT_STATUS_CONFIG[status as string] || {
    label: status ? formatStatusLabel(status) : 'Open',
    className: getStatusClasses(getStatusTone(status)),
  }
}

export const cardClassName = 'rounded-2xl border border-slate-200 bg-card shadow-sm ring-1 ring-slate-100'
export const inputClassName = 'w-full rounded-lg border border-slate-200 bg-background px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'
export const DOC_TYPE_LABELS: Record<string, string> = {
  invoice: 'Invoice',
  quotation: 'Quotation',
  csr: 'CSR',
  waybill: 'Waybill',
}
