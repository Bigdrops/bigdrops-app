import { matchBoluWriteContext, type BoluCapability } from './bolu-capabilities'
import type { BoluPageContext } from './bolu-context'
import type { TenantClient } from '@/lib/tenantClient'
import { searchDocuments } from '@/modules/search/documentSearchService'
import { getAdvanceInvoiceMetadata } from '@/domain/invoice/advanceMetadata'
import type { BoluAdvanceCurrentSnapshot } from './bolu-operations'

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

export type BoluChangeProposal = {
  field: string
  oldValue: string | number | null
  newValue: string | number | null
  accepted: boolean
}

/**
 * The write vocabulary mirrors public.has_entity_permission exactly. The
 * canonical actions are view/create/edit/delete; there is no 'save' or
 * 'modify' action, and asking for one always fails the exact-match lookup.
 */
export type BoluWriteAuthorization = (resource: 'invoice' | 'quotation', action: 'create' | 'edit') => boolean

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

export interface BoluInvoiceAdvanceConfigSnapshot {
  id: string
  number: string
  issue_date: string | null
  due_date: string | null
  total: number
  /** Current persisted advance_invoice block, or absence; values normalized via the domain helper. */
  current: BoluAdvanceCurrentSnapshot
}

/**
 * Reads the parent invoice's persisted Advance Invoice configuration for
 * proposal building (Gate 1). The block mirrors the form's metadata exactly
 * via `getAdvanceInvoiceMetadata`; a block that exists but fails the domain
 * validity rules is treated as absent, never as authoritative.
 */
export async function readBoluInvoiceAdvanceConfig(
  tenantClient: TenantClient,
  invoiceId: string,
  canRead: BoluReadAuthorization,
): Promise<BoluInvoiceAdvanceConfigSnapshot | null> {
  assertTenantReady(tenantClient)
  if (!canRead('invoice', 'view')) throw new Error('You do not have permission to view invoices.')
  const { data, error } = await tenantClient
    .from('invoices')
    .select('id, invoice_number, issue_date, due_date, total, custom_fields')
    .eq('id', invoiceId)
    .is('archived_at', null)
    .maybeSingle()
  if (error) throw new Error(`Invoice lookup failed: ${error.message}`)
  if (!data) return null

  const row = data as Record<string, any> & { custom_fields?: unknown }
  const meta = getAdvanceInvoiceMetadata(row)
  return {
    id: String(row.id),
    number: String(row.invoice_number ?? ''),
    issue_date: (row.issue_date ?? null) as string | null,
    due_date: (row.due_date ?? null) as string | null,
    total: Number(row.total ?? 0),
    current: {
      present: Boolean(meta),
      suffix: meta?.suffix ?? null,
      mode: meta?.mode ?? null,
      value: meta?.value ?? null,
      primary_label: meta?.primary_label ?? null,
      secondary_label: meta?.secondary_label ?? null,
      contractValue: meta?.contract_value ?? Number(row.total ?? 0),
      documentNumber: meta?.document_number ?? null,
      amount: meta?.amount ?? null,
    },
  }
}

export interface BoluModifySnapshot {
  documentFamily: 'invoice' | 'quotation'
  documentId: string
  documentNumber: string
  /** Persisted row, verbatim — scalar and custom_fields baselines for the proposal. */
  document: Record<string, unknown>
  /** Persisted line items in persisted column shape — basis for Gate 1 previews and executor merges. */
  items: Array<Record<string, unknown>>
}

const INVOICE_MODIFY_SELECT =
  'id, invoice_number, invoice_title, po_number, client_id, client_name, project_id, issue_date, due_date, status, document_type, payment_terms, notes, terms, workmanship, transportation, shipping, discount, vat, wht, custom_fields, work_duration, subtotal, install_rate_total, total, amount_in_words, archived_at'

const QUOTATION_MODIFY_SELECT =
  'id, quotation_number, quotation_title, po_number, client_id, client_name, project_id, issue_date, valid_until, status, notes, terms, workmanship, transportation, shipping, discount, vat, wht, custom_fields, subtotal, install_rate_total, total, amount_in_words, archived_at'

/**
 * Reads the persisted state a modification proposal must be based on (Gate 1).
 * The scalar baselines and the extra-charge / calculation-input blocks are all
 * captured here so the executor can fail closed on any concurrent change.
 */
export async function readBoluModifySnapshot(
  tenantClient: TenantClient,
  documentFamily: 'invoice' | 'quotation',
  documentId: string,
  canRead: BoluReadAuthorization,
): Promise<BoluModifySnapshot | null> {
  assertTenantReady(tenantClient)
  if (!canRead(documentFamily, 'view')) {
    throw new Error(`You do not have permission to view ${documentFamily}s.`)
  }
  const table = documentFamily === 'quotation' ? 'quotations' : 'invoices'
  const itemsTable = documentFamily === 'quotation' ? 'quotation_items' : 'invoice_items'
  const itemsKey = documentFamily === 'quotation' ? 'quotation_id' : 'invoice_id'
  const numberColumn = documentFamily === 'quotation' ? 'quotation_number' : 'invoice_number'

  // Branch per family so the typed client resolves one table at a time.
  const snapshotQuery = documentFamily === 'quotation'
    ? tenantClient.from('quotations').select(QUOTATION_MODIFY_SELECT)
    : tenantClient.from('invoices').select(INVOICE_MODIFY_SELECT)
  const { data, error } = await snapshotQuery
    .eq('id', documentId)
    .is('archived_at', null)
    .maybeSingle()
  if (error) throw new Error(`${documentFamily === 'quotation' ? 'Quotation' : 'Invoice'} lookup failed: ${error.message}`)
  if (!data) return null

  const { data: items, error: itemsError } = await (tenantClient.from(itemsTable) as any)
    .select('*')
    .eq(itemsKey, documentId)
    .order('sort_order', { ascending: true })
  if (itemsError) {
    throw new Error(`${documentFamily === 'quotation' ? 'Quotation' : 'Invoice'} items lookup failed: ${itemsError.message}`)
  }

  const row = data as Record<string, unknown>
  return {
    documentFamily,
    documentId: String(row.id),
    documentNumber: String(row[numberColumn] ?? ''),
    document: row,
    items: Array.isArray(items) ? (items as Array<Record<string, unknown>>) : [],
  }
}

/**
 * Resolves a presentation-scope signatory reference against the tenant's
 * signatory projection. UUID references are looked up by id; free-text
 * references attempt an exact case-insensitive name match, then a unique
 * case-insensitive substring match. Ambiguity, errors or absence fail closed.
 */
export type BoluSignatoryResolution =
  | { kind: 'resolved'; id: string; name: string; role: string }
  | { kind: 'ambiguous'; query: string; matches: Array<{ id: string; name: string; role: string }> }
  | { kind: 'not_found'; query: string }
  | { kind: 'error'; query: string; error: string }

export async function resolveSignatoryForPresentation(
  tenantClient: TenantClient,
  requested: string,
): Promise<BoluSignatoryResolution> {
  assertTenantReady(tenantClient)
  const candidate = requested.trim()
  if (!candidate) return { kind: 'not_found', query: requested }

  if (/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(candidate)) {
    try {
      const { data, error } = await (tenantClient.from('signatories') as any)
        .select('id, name, role')
        .eq('id', candidate)
        .limit(1)
        .maybeSingle()
      if (error) return { kind: 'error', query: candidate, error: error.message }
      const id = data?.id ? String(data.id) : null
      if (!id) return { kind: 'not_found', query: candidate }
      return {
        kind: 'resolved',
        id,
        name: String(data.name ?? '').trim(),
        role: String(data.role ?? '').trim(),
      }
    } catch (err) {
      return { kind: 'error', query: candidate, error: err instanceof Error ? err.message : 'Lookup failed' }
    }
  }

  const escaped = candidate.replace(/[%_\\]/g, (ch) => `\\${ch}`)
  try {
    const { data, error } = await (tenantClient.from('signatories') as any)
      .select('id, name, role')
      .ilike('name', `%${escaped}%`)
      .limit(20)
    if (error) return { kind: 'error', query: candidate, error: error.message }
    const rows = Array.isArray(data) ? data : []
    const exact = rows.filter((row: any) => String(row?.name ?? '').trim().toLowerCase() === candidate.toLowerCase())
    const pool = exact.length > 0 ? exact : rows
    const matches = pool.map((row: any) => ({
      id: String(row?.id ?? ''),
      name: String(row?.name ?? '').trim(),
      role: String(row?.role ?? '').trim(),
    }))
    if (matches.length === 0) return { kind: 'not_found', query: candidate }
    if (matches.length === 1) return { kind: 'resolved', ...matches[0] }
    return { kind: 'ambiguous', query: candidate, matches }
  } catch (err) {
    return { kind: 'error', query: candidate, error: err instanceof Error ? err.message : 'Lookup failed' }
  }
}

/**
 * Resolves a presentation-scope bank account reference against the tenant's
 * bank-accounts projection. Missing records fail closed.
 */
export type BoluBankAccountResolution =
  | { kind: 'resolved'; id: string; label: string }
  | { kind: 'not_found'; id: string }
  | { kind: 'error'; id: string; error: string }

export async function resolveBankAccountForPresentation(
  tenantClient: TenantClient,
  requestedId: string,
): Promise<BoluBankAccountResolution> {
  assertTenantReady(tenantClient)
  const candidate = requestedId.trim()
  if (!candidate) return { kind: 'not_found', id: requestedId }
  try {
    const { data, error } = await (tenantClient.from('bank_accounts') as any)
      .select('id, bank_name, account_name, account_number, is_default')
      .eq('id', candidate)
      .limit(1)
      .maybeSingle()
    if (error) return { kind: 'error', id: candidate, error: error.message }
    if (!data) return { kind: 'not_found', id: candidate }
    const bankName = String(data.bank_name ?? '').trim()
    const accountName = String(data.account_name ?? '').trim()
    const label = [bankName, accountName].filter(Boolean).join(' · ') || candidate
    return { kind: 'resolved', id: String(data.id), label }
  } catch (err) {
    return { kind: 'error', id: candidate, error: err instanceof Error ? err.message : 'Lookup failed' }
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

export async function proposeChange(
  tenantClient: TenantClient,
  record: BoluRecord,
  field: string,
  oldValue: string | number | null,
  newValue: string | number | null,
  canWrite: BoluWriteAuthorization,
): Promise<{ ok: boolean; proposed: BoluChangeProposal; record: BoluRecord }> {
  assertTenantReady(tenantClient)
  if (!canWrite('invoice', 'edit') && !canWrite('quotation', 'edit')) {
    return { ok: false, proposed: { field: String(field), oldValue: String(oldValue ?? ''), newValue: String(newValue ?? ''), accepted: false }, record }
  }
  return {
    ok: true,
    proposed: { field: String(field), oldValue: String(oldValue ?? ''), newValue: String(newValue ?? ''), accepted: false },
    record: { ...record, [field]: newValue },
  }
}

export async function saveDocument(
  tenantClient: TenantClient,
  record: BoluRecord,
  canWrite: BoluWriteAuthorization,
): Promise<{ ok: boolean; savedRecord: BoluRecord }> {
  assertTenantReady(tenantClient)
  if (!canWrite('invoice', 'edit') && !canWrite('quotation', 'edit')) {
    return { ok: false, savedRecord: record }
  }
  // Application-owned persistence: the actual write is delegated to the form/save handler
  // which performs the authorized write and returns the persisted state
  return { ok: true, savedRecord: record }
}

export interface BoluClientMatch {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  contactPerson?: string | null
}

export type BoluClientSearchResult =
  | { status: 'exact_match'; client: BoluClientMatch }
  | { status: 'single_match'; client: BoluClientMatch }
  | { status: 'ambiguous'; matches: BoluClientMatch[]; query: string }
  | { status: 'not_found'; query: string }
  | { status: 'search_error'; query: string; error: string }

export type BoluClientValidationResult =
  | { status: 'exact_match'; client: BoluClientMatch }
  | { status: 'ambiguous'; matches: BoluClientMatch[] }
  | { status: 'not_found'; query: string }

/** Normalize a phone string to digits only for loose matching. */
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().+]/g, '')
}

/**
 * Strips characters that can end or extend a PostgREST filter expression.
 * A client name is untrusted input and must never add filter predicates.
 */
function sanitizeClientTerm(term: string): string {
  return term
    .replace(/[,()%_\\"'`;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

/**
 * One bounded client query over the columns the tenant schema supports.
 * Archived clients are never discoverable. Read-only.
 */
async function queryClientMatches(
  tenantClient: TenantClient,
  term: string,
): Promise<{ clients: BoluClientMatch[]; error: string | null }> {
  const digits = normalizePhone(term)
  const orParts: string[] = [
    `name.ilike.%${term}%`,
    `email.ilike.%${term}%`,
    `contact_person.ilike.%${term}%`,
  ]
  // A phone search compares digits, so formatting differences do not hide a record.
  orParts.push(`phone.ilike.%${/^\d{4,}$/.test(digits) ? digits : term}%`)

  let queryBuilder = tenantClient
    .from('clients')
    .select('id, name, email, phone, contact_person')
    .is('archived_at', null)

  if (typeof (queryBuilder as any).or === 'function') {
    queryBuilder = (queryBuilder as any).or(orParts.join(','))
  } else {
    queryBuilder = queryBuilder.ilike('name', `%${term}%`)
  }

  const { data, error } = await queryBuilder.limit(15)
  if (error) return { clients: [], error: error.message }

  const clients = (data as Array<{
    id: string
    name: string | null
    email: string | null
    phone: string | null
    contact_person: string | null
  }> | null ?? []).map((d) => ({
    id: d.id,
    name: d.name ?? '',
    email: d.email ?? null,
    phone: d.phone ?? null,
    contactPerson: d.contact_person ?? null,
  }))

  return { clients, error: null }
}

/**
 * Searches clients by name, email, phone, and contact_person across the tenant.
 * Always respects archived_at IS NULL. Never writes.
 *
 * Conservative by design: a single plausible record is returned only when one
 * record matches. Two or more plausible records are reported as ambiguous so the
 * caller asks the user instead of silently selecting a client.
 */
export async function searchBoluClients(
  tenantClient: TenantClient,
  term: string,
): Promise<BoluClientSearchResult> {
  const clean = term?.trim()
  if (!clean) return { status: 'not_found', query: '' }
  const safe = sanitizeClientTerm(clean)
  if (!safe) return { status: 'not_found', query: clean }
  if (!tenantClient?.isReady) {
    return { status: 'search_error', query: clean, error: 'Business records are not available yet.' }
  }

  try {
    // The full phrase is tried first. A multi-word phrase that finds nothing is
    // retried with its distinctive words, so "Tecno Power Ltd" still finds
    // "Tecno Power Solutions" without inventing an alias.
    const attempts: string[] = [safe]
    const tokens = safe.split(' ').filter((token) => token.length >= 3)
    if (tokens.length > 1) {
      const ordered = [...tokens].sort((a, b) => b.length - a.length)
      for (const token of ordered.slice(0, 4)) {
        if (!attempts.some((attempt) => attempt.toLowerCase() === token.toLowerCase())) {
          attempts.push(token)
        }
      }
    }

    const byId = new Map<string, BoluClientMatch>()
    const phrase = safe.toLowerCase()
    for (const attempt of attempts) {
      const result = await queryClientMatches(tenantClient, attempt)
      if (result.error) {
        return { status: 'search_error', query: clean, error: result.error }
      }
      for (const client of result.clients) byId.set(client.id, client)
      const foundPhrase = [...byId.values()].some((client) =>
        client.name.toLowerCase().includes(phrase),
      )
      if (foundPhrase) break
      if (byId.size >= 15) break
    }

    const matches = [...byId.values()]
    if (matches.length === 0) {
      return { status: 'not_found', query: clean }
    }

    // Exact case-insensitive name match
    const exact = matches.find((m) => m.name.trim().toLowerCase() === phrase)
    if (exact) return { status: 'exact_match', client: exact }

    // One plausible match only
    if (matches.length === 1) return { status: 'single_match', client: matches[0] }

    // Multiple plausible matches require the user to choose.
    return { status: 'ambiguous', matches, query: clean }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[searchBoluClients] Client query failed:', err)
    return { status: 'search_error', query: clean, error: msg }
  }
}

/**
 * Pre-operation client discovery: resolves a client name hint before a write operation.
 * Returns the search result; never writes.
 */
export async function discoverClientForOperation(
  tenantClient: TenantClient,
  term: string,
  _context?: BoluPageContext,
): Promise<BoluClientSearchResult> {
  if (!tenantClient.isReady) {
    return { status: 'search_error', query: term?.trim() ?? '', error: 'Business records are not available yet.' }
  }
  return searchBoluClients(tenantClient, term)
}

/**
 * Validates a candidate client name against the tenant's clients table before draft creation.
 * Returns exact_match if an exact case-insensitive match (or solitary partial match) is found,
 * ambiguous if multiple partial matches exist, or not_found if no records match.
 *
 * Backward-compatible wrapper around searchBoluClients.
 */
export async function validateBoluClient(
  tenantClient: TenantClient | undefined | null,
  clientName: string,
): Promise<BoluClientValidationResult> {
  const clean = clientName?.trim()
  if (!clean || !tenantClient || !tenantClient.isReady) {
    return { status: 'not_found', query: clean || '' }
  }

  const result = await searchBoluClients(tenantClient, clean)

  switch (result.status) {
    case 'exact_match':
      return { status: 'exact_match', client: result.client }
    case 'single_match':
      // Treat single partial match as exact_match for backward compatibility
      return { status: 'exact_match', client: result.client }
    case 'ambiguous':
      return { status: 'ambiguous', matches: result.matches }
    case 'not_found':
      return { status: 'not_found', query: clean }
    case 'search_error':
      // Backward compat: swallow errors into not_found (old behaviour)
      console.warn('[validateBoluClient] search error swallowed for compat:', result.error)
      return { status: 'not_found', query: clean }
  }
}

/**
 * Reads a single client by stable record ID. Used to verify model-supplied
 * client IDs before they are trusted for a proposal.
 */
export async function readBoluClient(
  tenantClient: TenantClient,
  clientId: string,
): Promise<BoluClientMatch | null> {
  const clean = clientId?.trim()
  if (!clean || !tenantClient.isReady) return null
  const { data, error } = await tenantClient
    .from('clients')
    .select('id, name, email, phone, contact_person')
    .eq('id', clean)
    .is('archived_at', null)
    .maybeSingle()
  if (error || !data) return null
  return {
    id: data.id,
    name: data.name ?? '',
    email: data.email ?? null,
    phone: data.phone ?? null,
    contactPerson: data.contact_person ?? null,
  }
}

export interface BoluSupplierMatch {
  id: string
  name: string
  phone?: string | null
  email?: string | null
}

/**
 * Read-only supplier discovery. Suppliers exist in the tenant schema, so this
 * can ground a purchase-side question without inventing a workflow.
 */
export async function searchBoluSuppliers(
  tenantClient: TenantClient,
  term: string,
): Promise<BoluSupplierMatch[]> {
  const clean = term?.trim()
  if (!clean || !tenantClient?.isReady) return []
  try {
    const { data, error } = await tenantClient
      .from('suppliers')
      .select('id, name, phone, email')
      .is('archived_at', null)
      .ilike('name', `%${clean}%`)
      .limit(5)
    if (error || !data) return []
    return (data as any[]).map((row) => ({
      id: row.id,
      name: row.name ?? '',
      phone: row.phone ?? null,
      email: row.email ?? null,
    }))
  } catch (err) {
    console.warn('[searchBoluSuppliers] Supplier search failed:', err)
    return []
  }
}

/**
 * Reads the most recent documents for a resolved client so a new proposal can
 * follow the client's real patterns (their last terms, title, item wording).
 * Bounded and read-only. Never used as a financial source of truth.
 */
export async function readRecentClientDocuments(
  tenantClient: TenantClient,
  clientId: string,
): Promise<{ invoices: BoluRecord[]; quotations: BoluRecord[] }> {
  if (!clientId || !tenantClient?.isReady) return { invoices: [], quotations: [] }
  try {
    const [{ data: invoices }, { data: quotations }] = await Promise.all([
      tenantClient
        .from('invoices')
        .select('id, invoice_number, invoice_title, client_name, issue_date, total')
        .eq('client_id', clientId)
        .is('archived_at', null)
        .order('issue_date', { ascending: false })
        .limit(3),
      tenantClient
        .from('quotations')
        .select('id, quotation_number, quotation_title, client_name, issue_date, total')
        .eq('client_id', clientId)
        .is('archived_at', null)
        .order('issue_date', { ascending: false })
        .limit(3),
    ])

    return {
      invoices: (invoices ?? []).map((row: any) => ({
        id: row.id,
        kind: 'invoice' as const,
        number: row.invoice_number,
        title: row.invoice_title ?? null,
        clientName: row.client_name ?? null,
        date: row.issue_date ?? null,
        status: null,
        total: row.total == null ? null : Number(row.total),
        balanceDue: null,
        route: `/invoices/${row.id}`,
      })),
      quotations: (quotations ?? []).map((row: any) => ({
        id: row.id,
        kind: 'quotation' as const,
        number: row.quotation_number,
        title: row.quotation_title ?? null,
        clientName: row.client_name ?? null,
        date: row.issue_date ?? null,
        status: null,
        total: row.total == null ? null : Number(row.total),
        balanceDue: null,
        route: `/quotations/${row.id}`,
      })),
    }
  } catch (err) {
    console.warn('[readRecentClientDocuments] Lookup failed:', err)
    return { invoices: [], quotations: [] }
  }
}

export interface BoluCatalogMatch {
  id: string
  name: string
  standardPrice: number
  notes?: string | null
}

export interface BoluClientCreateInput {
  name: string
  phone?: string | null
  email?: string | null
  contact_person?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  category?: string | null
  notes?: string | null
}

/** Result of one client-creation attempt. Flat shape so callers never rely on narrowing. */
export type BoluClientCreationOutcome = {
  ok: boolean
  client: BoluClientMatch | null
  reused: boolean
  error: string | null
}

/**
 * Creates a new client record in the tenant database after explicit user approval.
 * Returns the stable, verified record ID. Never mutates without caller authorization.
 */
export async function createBoluClient(
  tenantClient: TenantClient,
  input: BoluClientCreateInput,
): Promise<BoluClientCreationOutcome> {
  assertTenantReady(tenantClient)
  const name = input.name?.trim()
  if (!name || name.length < 2) {
    return { ok: false, client: null, reused: false, error: 'Client name must be at least 2 characters.' }
  }

  try {
    const { data, error } = await tenantClient
      .from('clients')
      .insert({
        name,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        contact_person: input.contact_person?.trim() || null,
        address: input.address?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim() || null,
        category: input.category?.trim() || null,
        notes: input.notes?.trim() || null,
      })
      .select('id, name, email, phone, contact_person')
      .single()

    if (error) {
      return { ok: false, client: null, reused: false, error: error.message }
    }
    return {
      ok: true,
      reused: false,
      error: null,
      client: {
        id: data.id,
        name: data.name ?? name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        contactPerson: data.contact_person ?? null,
      },
    }
  } catch (err) {
    return {
      ok: false,
      client: null,
      reused: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Reads a single quotation record by UUID or quotation_number.
 * Mirrors readBoluInvoice for quotations.
 */
export async function readBoluQuotation(
  tenantClient: TenantClient,
  quotationId: string,
  canRead: BoluReadAuthorization,
): Promise<BoluRecord | null> {
  assertTenantReady(tenantClient)
  if (!canRead('quotation', 'view')) throw new Error('You do not have permission to view quotations.')

  const clean = quotationId.trim()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)
  let query = tenantClient
    .from('quotations')
    .select('id, quotation_number, quotation_title, client_name, issue_date, total, status')
    .is('archived_at', null)

  query = isUuid ? query.eq('id', clean) : query.ilike('quotation_number', `%${clean}%`)

  const { data, error } = await query.limit(1).maybeSingle()
  if (error) throw new Error(`Quotation lookup failed: ${error.message}`)
  if (!data) return null

  return {
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
  }
}

/**
 * Searches the item_catalog table for active products.
 * Read-only discovery; NEVER reserves or mutates inventory.
 */
export async function searchBoluCatalog(
  tenantClient: TenantClient,
  term: string,
): Promise<BoluCatalogMatch[]> {
  const clean = term?.trim()
  if (!clean || !tenantClient || !tenantClient.isReady) return []
  try {
    const { data, error } = await tenantClient
      .from('item_catalog')
      .select('id, name, standard_price, notes')
      .eq('is_active', true)
      .ilike('name', `%${clean}%`)
      .limit(5)

    if (error || !data) return []
    return (data as any[]).map((row) => ({
      id: row.id,
      name: row.name ?? '',
      standardPrice: Number(row.standard_price ?? 0),
      notes: row.notes ?? null,
    }))
  } catch (err) {
    console.warn('[searchBoluCatalog] Catalog search failed:', err)
    return []
  }
}

/**
 * Discovers business context facts for write/mutation requests before model generation.
 * Injects verified client, document, or catalog facts so the model builds accurate proposals.
 */
export async function resolveOperationFacts(input: {
  text: string
  tenantClient?: TenantClient
  pageContext: BoluPageContext
  canRead: BoluReadAuthorization
}): Promise<BoluFactResult | null> {
  const { text, tenantClient, canRead } = input
  if (!tenantClient || !tenantClient.isReady) return null

  const writeContext = matchBoluWriteContext(text)
  const factsList: string[] = []
  const recordsFound: BoluRecord[] = []

  // 1. Client resolution if client hint present
  if (writeContext.clientHint) {
    try {
      const clientResult = await searchBoluClients(tenantClient, writeContext.clientHint)
      if (clientResult.status === 'exact_match' || clientResult.status === 'single_match') {
        const c = clientResult.client
        factsList.push(
          `Verified client in business records:\n- ID: "${c.id}"\n- Name: "${c.name}"${c.phone ? `\n- Phone: "${c.phone}"` : ''}${c.email ? `\n- Email: "${c.email}"` : ''}`,
        )
        // The client's own recent documents are real context for a new
        // proposal. They are references only; no value is copied automatically.
        const recent = await readRecentClientDocuments(tenantClient, c.id)
        if (recent.invoices.length > 0) {
          recordsFound.push(...recent.invoices)
          factsList.push(
            `Recent invoices for this client:\n${recent.invoices
              .map((doc) => `• ${doc.number} (${doc.date || 'no date'}) - ${doc.total ?? 0}`)
              .join('\n')}`,
          )
        }
        if (recent.quotations.length > 0) {
          recordsFound.push(...recent.quotations)
          factsList.push(
            `Recent quotations for this client:\n${recent.quotations
              .map((doc) => `• ${doc.number} (${doc.date || 'no date'}) - ${doc.total ?? 0}`)
              .join('\n')}`,
          )
        }
      } else if (clientResult.status === 'ambiguous') {
        const matchesSummary = clientResult.matches
          .slice(0, 5)
          .map((m) => `• ID: "${m.id}", Name: "${m.name}"${m.phone ? ` (${m.phone})` : ''}`)
          .join('\n')
        factsList.push(
          `Multiple client candidates match "${writeContext.clientHint}":\n${matchesSummary}\nNote: Select the best match or clarify with user.`,
        )
      } else if (clientResult.status === 'not_found') {
        factsList.push(`Client search: No existing client record matches "${writeContext.clientHint}".`)
      }
    } catch (err) {
      console.warn('[resolveOperationFacts] Client discovery failed:', err)
    }
  }

  // 1b. Supplier discovery when the user names a supplier or vendor. Read-only.
  if (writeContext.supplierHint) {
    const suppliers = await searchBoluSuppliers(tenantClient, writeContext.supplierHint)
    if (suppliers.length > 0) {
      factsList.push(
        `Supplier records matching "${writeContext.supplierHint}":\n${suppliers
          .map((s) => `• ID: "${s.id}", Name: "${s.name}"${s.phone ? ` (${s.phone})` : ''}`)
          .join('\n')}\nNote: a supplier is never attached to an invoice or quotation client field.`,
      )
    }
  }

  // 2. Existing document reference if user is asking to modify or refers to a document number
  if (writeContext.documentRef) {
    try {
      if (writeContext.documentRef.type === 'invoice' || writeContext.targetFamily === 'invoice') {
        if (canRead('invoice', 'view')) {
          const inv = await readBoluInvoice(tenantClient, writeContext.documentRef.number, canRead)
          if (inv) {
            recordsFound.push(inv)
            factsList.push(
              `Existing invoice record: Number: "${inv.number}", ID: "${inv.id}", Client: "${inv.clientName}", Total: ${inv.total}, Status: "${inv.status}"`,
            )
          }
        }
      } else if (writeContext.documentRef.type === 'quotation' || writeContext.targetFamily === 'quotation') {
        if (canRead('quotation', 'view')) {
          const qtn = await readBoluQuotation(tenantClient, writeContext.documentRef.number, canRead)
          if (qtn) {
            recordsFound.push(qtn)
            factsList.push(
              `Existing quotation record: Number: "${qtn.number}", ID: "${qtn.id}", Client: "${qtn.clientName}", Total: ${qtn.total}, Status: "${qtn.status}"`,
            )
          }
        }
      }
    } catch (err) {
      console.warn('[resolveOperationFacts] Document reference discovery failed:', err)
    }
  }

  // 3. Catalog suggestions for an explicitly quoted item phrase. Read-only:
  // a suggestion never links an item, reserves stock, or changes inventory.
  const quotedTerms = [...text.matchAll(/"([^"]{2,60})"|'([^']{2,60})'/g)]
    .map((match) => (match[1] ?? match[2] ?? '').trim())
    .filter((value, index, all) => value.length >= 2 && all.indexOf(value) === index)
    .slice(0, 2)
  for (const term of quotedTerms) {
    const catalogMatches = await searchBoluCatalog(tenantClient, term)
    if (catalogMatches.length > 0) {
      const summary = catalogMatches
        .map((item) => `• ID: "${item.id}", Name: "${item.name}", Standard price: ${item.standardPrice}`)
        .join('\n')
      factsList.push(
        `Catalog suggestions for "${term}" (linking is optional, no stock is reserved):\n${summary}\nNote: confirm the intended item with the user before linking it.`,
      )
    }
  }

  if (recordsFound.length > 0) {
    return { kind: 'records', records: recordsFound, hasMore: false }
  }

  if (factsList.length > 0) {
    return { kind: 'message', text: factsList.join('\n\n') }
  }

  return null
}

