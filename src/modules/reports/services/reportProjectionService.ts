import type { TenantClient } from '@/lib/tenantClient'
import type { BankAccountLookupRow, CollectionRow, InvoiceFinancialRow, ProjectFinancialRow, TaxInvoiceRow } from '@/components/reports/reportTypes'
import { fetchInvoiceFinancials, fetchProjectFinancials, fetchTaxInvoices, fetchPayments, fetchBankAccounts } from '../repositories/reportRepository'

// Phase 3: invoice aggregate reads target the tenant schema.
export async function loadReceivables(tenantClient: TenantClient, start?: string | null, end?: string | null): Promise<InvoiceFinancialRow[]> {
  return fetchInvoiceFinancials(tenantClient, start, end)
}

export async function loadProjects(tenantClient: TenantClient): Promise<ProjectFinancialRow[]> {
  return fetchProjectFinancials(tenantClient)
}

export async function loadTaxInvoices(tenantClient: TenantClient, start?: string | null, end?: string | null): Promise<TaxInvoiceRow[]> {
  return fetchTaxInvoices(tenantClient, start, end)
}

export async function loadEnrichedCollections(tenantClient: TenantClient, start?: string | null, end?: string | null): Promise<CollectionRow[]> {
  const payments = await fetchPayments(tenantClient, start, end)
  const bankAccountIds = Array.from(new Set(payments.map((p) => p.bank_account_id).filter((id): id is string => Boolean(id))))
  const bankAccounts = await fetchBankAccounts(bankAccountIds, tenantClient)
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

export async function loadOverviewData(tenantClient: TenantClient, start?: string | null, end?: string | null) {
  const [receivables, projects, taxInvoices, collections] = await Promise.all([
    loadReceivables(tenantClient, start, end),
    loadProjects(tenantClient),
    loadTaxInvoices(tenantClient, start, end),
    loadEnrichedCollections(tenantClient, start, end),
  ])
  return { receivables, projects, taxInvoices, collections }
}
