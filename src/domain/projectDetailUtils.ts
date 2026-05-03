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
    iconWrapClassName: 'bg-[hsl(var(--bd-status-info-bg))] text-[hsl(var(--bd-status-info-text))] ring-1 ring-[hsl(var(--bd-status-info-border))]',
    labelClassName: 'text-[hsl(var(--bd-status-info-text))]',
  },
  csr: {
    label: 'CSR',
    icon: Wrench,
    iconWrapClassName: 'bg-[hsl(var(--bd-status-success-bg))] text-[hsl(var(--bd-status-success-text))] ring-1 ring-[hsl(var(--bd-status-success-border))]',
    labelClassName: 'text-[hsl(var(--bd-status-success-text))]',
  },
  quotation: {
    label: 'Quotation',
    icon: ClipboardList,
    iconWrapClassName: 'bg-[hsl(var(--bd-status-accent-bg))] text-[hsl(var(--bd-status-accent-text))] ring-1 ring-[hsl(var(--bd-status-accent-border))]',
    labelClassName: 'text-[hsl(var(--bd-status-accent-text))]',
  },
  waybill: {
    label: 'Waybill',
    icon: Truck,
    iconWrapClassName: 'bg-[hsl(var(--bd-status-warning-bg))] text-[hsl(var(--bd-status-warning-text))] ring-1 ring-[hsl(var(--bd-status-warning-border))]',
    labelClassName: 'text-[hsl(var(--bd-status-warning-text))]',
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

export const cardClassName = 'rounded-2xl border border-[hsl(var(--bd-border))] bg-card shadow-sm ring-1 ring-[hsl(var(--bd-border-soft))]'
export const inputClassName = 'w-full rounded-lg border border-[hsl(var(--bd-border))] bg-background px-3 py-2.5 text-sm text-[hsl(var(--bd-text))] outline-none transition focus:border-[hsl(var(--bd-status-success-border))] focus:ring-2 focus:ring-[hsl(var(--bd-status-success-bg))]'
export const DOC_TYPE_LABELS: Record<string, string> = {
  invoice: 'Invoice',
  quotation: 'Quotation',
  csr: 'CSR',
  waybill: 'Waybill',
}
