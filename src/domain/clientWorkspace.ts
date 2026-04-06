import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'

export interface ClientRecord {
  id: string
  name?: string | null
  contact_person?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  category?: string | null
}

export interface ProjectRecord {
  id: string
  name: string
  project_code?: string | null
  status: string
  project_value?: number | null
  start_date?: string | null
  client_id?: string | null
}

export interface InvoiceRecord {
  id: string
  invoice_number?: string | null
  invoice_title?: string | null
  issue_date?: string | null
  total?: number | null
  status?: string | null
  balance_due?: number | null
  computed_status?: string | null
  cash_received?: number | null
  document_type?: string | null
}

export interface QuotationRecord {
  id: string
  quotation_number?: string | null
  issue_date?: string | null
  total?: number | null
  status?: string | null
}

export interface CsrRecord {
  id: string
  csr_number?: string | null
  title?: string | null
  status?: string | null
  created_at: string
  date?: string | null
}

export interface WaybillRecord {
  id: string
  waybill_number?: string | null
  status?: string | null
  date?: string | null
  created_at: string
  type?: string | null
}

export interface UnifiedActivityEvent {
  id: string
  type: 'invoice' | 'quotation' | 'csr' | 'waybill' | 'project'
  number?: string | null
  title?: string | null
  date: string
  status?: string | null
  total?: number | null
}

export const formatCurrency = (value: number | null | undefined) => formatNaira(value || 0)

export const formatDateShort = (value: string | null | undefined) => {
  if (!value) return ''
  return formatDisplayDate(value, {
    fallback: '',
    invalidFallback: '',
    locale: 'en-GB',
    dateOptions: { day: 'numeric', month: 'short', year: 'numeric' },
  })
}

export function mergeActivity(
  invoices: InvoiceRecord[],
  quotations: QuotationRecord[],
  csrs: CsrRecord[],
  waybills: WaybillRecord[],
  projects: ProjectRecord[]
): UnifiedActivityEvent[] {
  const events: UnifiedActivityEvent[] = [
    ...invoices.map(inv => ({
      id: inv.id,
      type: 'invoice' as const,
      number: inv.invoice_number,
      title: inv.invoice_title,
      date: inv.issue_date || '',
      status: inv.computed_status || inv.status,
      total: inv.total,
    })),
    ...quotations.map(q => ({
      id: q.id,
      type: 'quotation' as const,
      number: q.quotation_number,
      date: q.issue_date || '',
      status: q.status,
      total: q.total,
    })),
    ...csrs.map(c => ({
      id: c.id,
      type: 'csr' as const,
      number: c.csr_number,
      title: c.title,
      date: c.date || c.created_at,
      status: c.status,
    })),
    ...waybills.map(w => ({
      id: w.id,
      type: 'waybill' as const,
      number: w.waybill_number,
      date: w.date || w.created_at,
      status: w.status,
    })),
    ...projects.map(p => ({
      id: p.id,
      type: 'project' as const,
      number: p.project_code,
      title: p.name,
      date: p.start_date || '',
      status: p.status,
    })),
  ]

  return events
    .filter(e => !!e.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function calculateSummary(invoices: InvoiceRecord[]) {
  return invoices.reduce(
    (acc, inv) => {
      acc.total_invoiced += Number(inv.total || 0)
      acc.cash_collected += Number(inv.cash_received || 0)
      acc.outstanding += Number(inv.balance_due || 0)
      return acc
    },
    { total_invoiced: 0, cash_collected: 0, outstanding: 0 }
  )
}
