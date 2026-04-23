import type { ReactNode } from 'react'

export type ReportTab = 'receivables' | 'collections' | 'projects' | 'tax'
export type DatePreset = 'this_month' | 'last_month' | 'this_quarter' | 'custom'
export type ReceivablesFilter = 'all' | 'unpaid' | 'paid' | 'past_due'
export type MetricTone = 'green' | 'red' | 'amber' | 'blue'

export type InvoiceFinancialRow = {
  id: string
  invoice_number?: string | null
  client_name?: string | null
  issue_date?: string | null
  due_date?: string | null
  total?: number | null
  vat?: number | null
  cash_received?: number | null
  wht_received?: number | null
  balance_due?: number | null
  computed_status?: string | null
}

export type CollectionInvoiceInfo = {
  invoice_number?: string | null
  client_name?: string | null
}

export type CollectionRow = {
  id: string
  invoice_id?: string | null
  bank_account_id?: string | null
  date?: string | null
  method?: string | null
  reference?: string | null
  cash_amount?: number | null
  wht_amount?: number | null
  voided_at?: string | null
  invoices?: CollectionInvoiceInfo | CollectionInvoiceInfo[] | null
  invoice_number?: string | null
  client_name?: string | null
  account_label?: string | null
}

export type BankAccountLookupRow = {
  id: string
  bank_name?: string | null
  account_number?: string | null
}

export type ProjectFinancialRow = {
  id: string
  project_id?: string | null
  project_name?: string | null
  name?: string | null
  client_name?: string | null
  status?: string | null
  invoice_count?: number | null
  total_invoiced?: number | null
  cash_collected?: number | null
  wht_collected?: number | null
  total_collected?: number | null
  outstanding?: number | null
}

export type TaxInvoiceRow = {
  id: string
  invoice_number?: string | null
  client_name?: string | null
  issue_date?: string | null
  vat?: number | null
  wht?: number | null
  total?: number | null
  status?: string | null
}

export type Metric = {
  label: string
  value: string
  tone: MetricTone
  icon: ReactNode
}
