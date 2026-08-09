import { supabase } from '@/supabase'
import type { TenantClient } from '@/lib/tenantClient'
import type { BankAccountLookupRow, CollectionRow, InvoiceFinancialRow, ProjectFinancialRow, TaxInvoiceRow } from '@/components/reports/reportTypes'

export type PaymentWithInvoice = {
  id: string
  invoice_id?: string | null
  bank_account_id?: string | null
  date?: string | null
  method?: string | null
  reference?: string | null
  cash_amount?: number | null
  wht_amount?: number | null
  voided_at?: string | null
  invoices?: { invoice_number?: string | null; client_name?: string | null } | { invoice_number?: string | null; client_name?: string | null }[] | null
}

// Phase 3: invoices/payments/invoice_financials_v are aggregate → tenant.
// bank_accounts and project_financials_v remain public.
export async function fetchInvoiceFinancials(tenantClient: TenantClient, start?: string | null, end?: string | null): Promise<InvoiceFinancialRow[]> {
  let query = tenantClient.from('invoice_financials_v').select('*').order('issue_date', { ascending: false })
  if (start) query = query.gte('issue_date', start)
  if (end) query = query.lte('issue_date', end)
  const result = await query
  return (result.data || []) as InvoiceFinancialRow[]
}

export async function fetchProjectFinancials(): Promise<ProjectFinancialRow[]> {
  let query = supabase.from('project_financials_v').select('*').order('outstanding', { ascending: false })
  const result = await query
  return (result.data || []) as ProjectFinancialRow[]
}

export async function fetchTaxInvoices(tenantClient: TenantClient, start?: string | null, end?: string | null): Promise<TaxInvoiceRow[]> {
  let query = tenantClient
    .from('invoices')
    .select('id, invoice_number, client_name, issue_date, vat, wht, total, status')
    .not('status', 'eq', 'archived')
    .is('archived_at', null)
    .order('issue_date', { ascending: false })
  if (start) query = query.gte('issue_date', start)
  if (end) query = query.lte('issue_date', end)
  const result = await query
  return (result.data || []) as TaxInvoiceRow[]
}

export async function fetchPayments(tenantClient: TenantClient, start?: string | null, end?: string | null): Promise<PaymentWithInvoice[]> {
  let query = tenantClient
    .from('payments')
    .select('*, invoices(invoice_number, client_name)')
    .is('voided_at', null)
    .order('date', { ascending: false })
  if (start) query = query.gte('date', start)
  if (end) query = query.lte('date', end)
  const result = await query
  return (result.data || []) as PaymentWithInvoice[]
}

export async function fetchBankAccounts(ids: string[]): Promise<BankAccountLookupRow[]> {
  if (ids.length === 0) return []
  const { data } = await supabase
    .from('bank_accounts')
    .select('id, bank_name, account_number')
    .in('id', ids)
  return (data || []) as BankAccountLookupRow[]
}
