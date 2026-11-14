import type { BoluCapability } from './bolu-capabilities'
import type { BoluPageContext } from './bolu-context'
import type { TenantClient } from '@/lib/tenantClient'
import { searchDocuments } from '@/modules/search/documentSearchService'

export type BoluRecord = {
  id: string
  kind: 'invoice' | 'quotation'
  number: string
  title: string | null
  clientName: string | null
  date: string | null
  status: string | null
  total: number | null
  balanceDue: number | null
  route: string
}

export type BoluFactResult =
  | { kind: 'records'; records: BoluRecord[]; hasMore: boolean }
  | { kind: 'message'; text: string }

export type BoluReadAuthorization = (resource: 'invoice' | 'quotation', action: 'view') => boolean

function assertTenantReady(tenantClient: TenantClient) {
  if (!tenantClient.isReady) throw new Error('Business records are not available yet.')
}

function normalizeSearchRecord(row: {
  document_type: string
  document_id: string
  document_number: string
  title: string | null
  client_name: string | null
  document_date: string | null
  route: string
}): BoluRecord | null {
  if (row.document_type !== 'invoice' && row.document_type !== 'quotation') return null
  return {
    id: row.document_id,
    kind: row.document_type,
    number: row.document_number,
    title: row.title,
    clientName: row.client_name,
    date: row.document_date,
    status: null,
    total: null,
    balanceDue: null,
    route: row.route,
  }
}

export async function searchBoluInvoices(
  tenantClient: TenantClient,
  term: string,
  canRead: BoluReadAuthorization,
  limit = 20,
): Promise<{ records: BoluRecord[]; hasMore: boolean }> {
  assertTenantReady(tenantClient)
  if (!canRead('invoice', 'view')) throw new Error('You do not have permission to view invoices.')

  const result = await searchDocuments(tenantClient, {
    term,
    document_types: ['invoice'],
    limit: Math.min(Math.max(limit, 1), 50),
  })

  return {
    records: result.results.map(normalizeSearchRecord).filter((row): row is BoluRecord => row !== null),
    hasMore: result.has_more,
  }
}

export async function searchBoluQuotations(
  tenantClient: TenantClient,
  term: string,
  canRead: BoluReadAuthorization,
  limit = 20,
): Promise<{ records: BoluRecord[]; hasMore: boolean }> {
  assertTenantReady(tenantClient)
  if (!canRead('quotation', 'view')) throw new Error('You do not have permission to view quotations.')

  const result = await searchDocuments(tenantClient, {
    term,
    document_types: ['quotation'],
    limit: Math.min(Math.max(limit, 1), 50),
  })

  return {
    records: result.results.map(normalizeSearchRecord).filter((row): row is BoluRecord => row !== null),
    hasMore: result.has_more,
  }
}

export async function readBoluInvoice(
  tenantClient: TenantClient,
  invoiceId: string,
  canRead: BoluReadAuthorization,
): Promise<BoluRecord | null> {
  assertTenantReady(tenantClient)
  if (!canRead('invoice', 'view')) throw new Error('You do not have permission to view invoices.')

  const [{ data: invoice, error: invoiceError }, { data: finance, error: financeError }] = await Promise.all([
    tenantClient
      .from('invoices')
      .select('id, invoice_number, invoice_title, client_name, issue_date, total')
      .eq('id', invoiceId)
      .is('archived_at', null)
      .maybeSingle(),
    tenantClient
      .from('invoice_financials_v')
      .select('balance_due, computed_status')
      .eq('id', invoiceId)
      .maybeSingle(),
  ])

  if (invoiceError) throw new Error(`Invoice lookup failed: ${invoiceError.message}`)
  if (financeError) throw new Error(`Invoice status lookup failed: ${financeError.message}`)
  if (!invoice) return null

  return {
    id: invoice.id,
    kind: 'invoice',
    number: invoice.invoice_number,
    title: invoice.invoice_title,
    clientName: invoice.client_name,
    date: invoice.issue_date,
    status: finance?.computed_status ?? null,
    total: Number(invoice.total ?? 0),
    balanceDue: finance?.balance_due == null ? null : Number(finance.balance_due),
    route: `/invoices/${invoice.id}`,
  }
}

export async function readBoluContextFacts(
  tenantClient: TenantClient,
  capability: BoluCapability,
  context: BoluPageContext,
  canRead: BoluReadAuthorization,
): Promise<BoluFactResult> {
  if (context.record?.kind === 'quotation' && capability === 'search-quotations') {
    assertTenantReady(tenantClient)
    if (!canRead('quotation', 'view')) throw new Error('You do not have permission to view quotations.')
    const { data, error } = await tenantClient
      .from('quotations')
      .select('id, quotation_number, quotation_title, client_name, issue_date, total, status')
      .eq('id', context.record.id)
      .is('archived_at', null)
      .maybeSingle()
    if (error) throw new Error(`Quotation lookup failed: ${error.message}`)
    if (!data) return { kind: 'message', text: 'I could not find that quotation in the current business records.' }
    return {
      kind: 'records',
      hasMore: false,
      records: [{
        id: data.id,
        kind: 'quotation',
        number: data.quotation_number,
        title: data.quotation_title,
        clientName: data.client_name,
        date: data.issue_date,
        status: data.status,
        total: data.total == null ? null : Number(data.total),
        balanceDue: null,
        route: `/quotations/${data.id}`,
      }],
    }
  }

  if (context.record?.kind === 'invoice' && capability === 'read-receivables') {
    const record = await readBoluInvoice(tenantClient, context.record.id, canRead)
    if (!record) return { kind: 'message', text: 'I could not find that invoice in the current business records.' }
    return { kind: 'records', records: [record], hasMore: false }
  }

  if (capability === 'read-receivables') {
    assertTenantReady(tenantClient)
    if (!canRead('invoice', 'view')) throw new Error('You do not have permission to view receivables.')
    const overdueOnly = /\b(overdue|past due)\b/i.test(context.filters.query ?? '')
    let query = tenantClient
      .from('invoice_financials_v')
      .select('id, invoice_number, client_name, issue_date, due_date, total, balance_due, computed_status')
      .gt('balance_due', 0)
    if (overdueOnly) query = query.eq('computed_status', 'overdue')
    const { data, error } = await query.order('issue_date', { ascending: false }).limit(51)
    if (error) throw new Error(`Receivables lookup failed: ${error.message}`)

    const records = (data ?? []).slice(0, 20)
      .map((row) => ({
        id: row.id,
        kind: 'invoice' as const,
        number: row.invoice_number,
        title: null,
        clientName: row.client_name,
        date: row.issue_date,
        status: row.computed_status,
        total: row.total == null ? null : Number(row.total),
        balanceDue: row.balance_due == null ? null : Number(row.balance_due),
        route: `/invoices/${row.id}`,
      }))
    return { kind: 'records', records, hasMore: (data ?? []).length > 20 }
  }

  const kind = capability === 'search-quotations' ? 'quotation' : 'invoice'
  const hasAccess = canRead(kind, 'view')
  if (!hasAccess) throw new Error(`You do not have permission to view ${kind}s.`)
  const query = context.filters.query?.trim() ?? ''
  if (query.length < 2) {
    return { kind: 'message', text: `What ${kind} number or customer name should I look for?` }
  }

  const result = kind === 'quotation'
    ? await searchBoluQuotations(tenantClient, query, canRead)
    : await searchBoluInvoices(tenantClient, query, canRead)
  return { kind: 'records', records: result.records, hasMore: result.hasMore }
}
