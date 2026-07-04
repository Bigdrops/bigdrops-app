import type { BankAccountLookupRow, CollectionRow, InvoiceFinancialRow, ProjectFinancialRow, TaxInvoiceRow } from '@/components/reports/reportTypes'
import { fetchInvoiceFinancials, fetchProjectFinancials, fetchTaxInvoices, fetchPayments, fetchBankAccounts } from '../repositories/reportRepository'

export async function loadReceivables(start?: string | null, end?: string | null): Promise<InvoiceFinancialRow[]> {
  return fetchInvoiceFinancials(start, end)
}

export async function loadProjects(): Promise<ProjectFinancialRow[]> {
  return fetchProjectFinancials()
}

export async function loadTaxInvoices(start?: string | null, end?: string | null): Promise<TaxInvoiceRow[]> {
  return fetchTaxInvoices(start, end)
}

export async function loadEnrichedCollections(start?: string | null, end?: string | null): Promise<CollectionRow[]> {
  const payments = await fetchPayments(start, end)
  const bankAccountIds = Array.from(new Set(payments.map((p) => p.bank_account_id).filter((id): id is string => Boolean(id))))
  const bankAccounts = await fetchBankAccounts(bankAccountIds)
  const bankMap = new Map<string, BankAccountLookupRow>(bankAccounts.map((b) => [b.id, b]))
  return payments.map((payment) => {
    const invoice = Array.isArray(payment.invoices) ? payment.invoices[0] : payment.invoices
    const account = payment.bank_account_id ? bankMap.get(payment.bank_account_id) : null
    return {
      ...payment,
      invoice_number: invoice?.invoice_number || '—',
      client_name: invoice?.client_name || '—',
      account_label: account?.bank_name ? `${account.bank_name} — ${account.account_number || 'No account'}` : payment.method || '—',
    } as CollectionRow
  })
}

export async function loadOverviewData(start?: string | null, end?: string | null) {
  const [receivables, projects, taxInvoices, collections] = await Promise.all([
    loadReceivables(start, end),
    loadProjects(),
    loadTaxInvoices(start, end),
    loadEnrichedCollections(start, end),
  ])
  return { receivables, projects, taxInvoices, collections }
}
