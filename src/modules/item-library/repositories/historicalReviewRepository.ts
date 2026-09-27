import type { TenantClient } from '@/lib/tenantClient'
import { buildHistoricalReviewCases } from '../domain/historicalReview'
import { normalizeItemText } from '../domain/suggestionRanking'
import type {
  CreateHistoricalReviewItemRequest,
  HistoricalReviewCatalogRef,
  HistoricalReviewMutationResult,
  HistoricalReviewRawOccurrence,
  HistoricalReviewResult,
  ItemReviewedSeparatePair,
  KeepCatalogItemsSeparateRequest,
  KeepHistoricalReviewCandidateSeparateRequest,
  LinkHistoricalReviewCaseRequest,
} from '../types'

const HISTORICAL_REVIEW_PAGE_SIZE = 1000
const HISTORICAL_REVIEW_MAX_ROWS = 5000
const HISTORICAL_REVIEW_MAX_PAGES = HISTORICAL_REVIEW_MAX_ROWS / HISTORICAL_REVIEW_PAGE_SIZE

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

type HistoricalReviewParentDoc = {
  document_number: string | null
  document_date: string | null
  client_name: string | null
}

function normalizeHistoricalReviewOccurrence(
  row: Record<string, unknown>,
  sourceType: 'invoice' | 'quotation',
  tenantSchema: string | null,
  parentDoc: HistoricalReviewParentDoc | null,
): HistoricalReviewRawOccurrence {
  const description = String(row.description || '')

  return {
    row_id: String(row.id || ''),
    tenant_schema: tenantSchema || '',
    source_type: sourceType,
    source_document_id: String(sourceType === 'invoice' ? row.invoice_id || '' : row.quotation_id || ''),
    source_document_number: parentDoc?.document_number || null,
    document_date: parentDoc?.document_date || null,
    client_name: parentDoc?.client_name || null,
    item_id: row.item_id ? String(row.item_id) : null,
    row_type: row.row_type ? String(row.row_type) : null,
    description,
    normalized_description: normalizeItemText(description),
    unit: row.unit ? String(row.unit) : null,
    make: row.make ? String(row.make) : null,
    quantity: toNumber(row.quantity),
    unit_price: toNumber(row.unit_price),
    group_name: row.group_name ? String(row.group_name) : null,
    group_id: row.group_id ? String(row.group_id) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  }
}

function normalizeHistoricalReviewCatalogRef(
  row: Record<string, unknown>,
  refKind: 'catalog' | 'alias',
): HistoricalReviewCatalogRef {
  return {
    ref_kind: refKind,
    item_id: String(row.item_id || row.id || ''),
    name: String(row.name || ''),
    normalized_text: normalizeItemText(String(row.normalized_text || row.normalized_name || row.normalized_alias_text || row.name || row.alias_text || '')),
    matched_text: String(row.matched_text || row.alias_text || row.name || ''),
    is_active: typeof row.is_active === 'boolean' ? row.is_active : true,
    is_retired: typeof row.is_retired === 'boolean' ? row.is_retired : false,
    standard_price: toNumber(row.standard_price),
    usage_count: toNumber(row.usage_count),
    last_sold_price: toNumber(row.last_sold_price),
    last_used_at: row.last_used_at ? String(row.last_used_at) : null,
  }
}

async function loadHistoricalReviewSourceRows(
  tableName: 'invoice_items' | 'quotation_items',
  client: TenantClient,
): Promise<{ rows: Record<string, unknown>[]; truncated: boolean }> {
  const rows: Record<string, unknown>[] = []
  let pageStart = 0
  let truncated = false

  while (pageStart < HISTORICAL_REVIEW_MAX_ROWS) {
    const pageEnd = Math.min(pageStart + HISTORICAL_REVIEW_PAGE_SIZE - 1, HISTORICAL_REVIEW_MAX_ROWS - 1)
    // ponytail: flat columns only. PostgREST embeds need a declared FK;
    // invoice_items has no FK to invoices, so invoices(...) fails with PGRST200.
    // Parent metadata loads in one batched query below instead.
    const relation =
      tableName === 'invoice_items'
        ? 'id, invoice_id, item_id, description, row_type, unit, make, quantity, unit_price, group_name, group_id, updated_at'
        : 'id, quotation_id, item_id, description, row_type, unit, make, quantity, unit_price, group_name, group_id, updated_at'

    const { data, error } = await client
      .from(tableName)
      .select(relation)
      .is('item_id', null)
      .order('updated_at', { ascending: false })
      .range(pageStart, pageEnd)

    if (error) throw error

    const pageRows = Array.isArray(data) ? (data as Record<string, unknown>[]) : []
    rows.push(...pageRows)

    if (pageRows.length < HISTORICAL_REVIEW_PAGE_SIZE) break
    pageStart += HISTORICAL_REVIEW_PAGE_SIZE
    if (pageStart >= HISTORICAL_REVIEW_MAX_ROWS) truncated = true
  }

  return { rows, truncated }
}

async function loadHistoricalReviewPagedRows(
  createQuery: () => any,
): Promise<{ rows: Record<string, unknown>[]; truncated: boolean }> {
  const rows: Record<string, unknown>[] = []
  let truncated = false

  for (let pageIndex = 0; pageIndex < HISTORICAL_REVIEW_MAX_PAGES; pageIndex += 1) {
    const pageStart = pageIndex * HISTORICAL_REVIEW_PAGE_SIZE
    const pageEnd = pageStart + HISTORICAL_REVIEW_PAGE_SIZE - 1
    const { data, error } = await createQuery().range(pageStart, pageEnd)

    if (error) throw error

    const pageRows = Array.isArray(data) ? (data as Record<string, unknown>[]) : []
    rows.push(...pageRows)

    if (pageRows.length < HISTORICAL_REVIEW_PAGE_SIZE) break
    if (pageIndex === HISTORICAL_REVIEW_MAX_PAGES - 1) truncated = true
  }

  return { rows, truncated }
}

async function loadHistoricalReviewParentDocs(
  client: TenantClient,
  invoiceIds: string[],
  quotationIds: string[],
): Promise<Map<string, HistoricalReviewParentDoc>> {
  const docs = new Map<string, HistoricalReviewParentDoc>()

  const [invoiceDocsResult, quotationDocsResult] = await Promise.all([
    invoiceIds.length > 0
      ? client.from('invoices').select('id, invoice_number, issue_date, client_name').in('id', invoiceIds)
      : Promise.resolve({ data: [], error: null }),
    quotationIds.length > 0
      ? client.from('quotations').select('id, quotation_number, issue_date, client_name').in('id', quotationIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (invoiceDocsResult.error) throw invoiceDocsResult.error
  if (quotationDocsResult.error) throw quotationDocsResult.error

  const invoiceDocs = Array.isArray(invoiceDocsResult.data) ? invoiceDocsResult.data : []
  const quotationDocs = Array.isArray(quotationDocsResult.data) ? quotationDocsResult.data : []

  invoiceDocs.forEach((row: any) => {
    const id = String(row.id || '')
    if (!id) return
    docs.set(`invoice:${id}`, {
      document_number: row.invoice_number ? String(row.invoice_number) : null,
      document_date: row.issue_date ? String(row.issue_date) : null,
      client_name: row.client_name ? String(row.client_name) : null,
    })
  })

  quotationDocs.forEach((row: any) => {
    const id = String(row.id || '')
    if (!id) return
    docs.set(`quotation:${id}`, {
      document_number: row.quotation_number ? String(row.quotation_number) : null,
      document_date: row.issue_date ? String(row.issue_date) : null,
      client_name: row.client_name ? String(row.client_name) : null,
    })
  })

  return docs
}

export async function getHistoricalReviewCases(client: TenantClient): Promise<HistoricalReviewResult> {
  if (!client.isReady || !client.schemaName) {
    return buildHistoricalReviewCases({
      tenantSchema: client.schemaName,
      occurrences: [],
      catalogRefs: [],
    })
  }

  const [invoiceRowsResult, quotationRowsResult, catalogResult, aliasesResult, summaryResult] = await Promise.all([
    loadHistoricalReviewSourceRows('invoice_items', client),
    loadHistoricalReviewSourceRows('quotation_items', client),
    loadHistoricalReviewPagedRows(() =>
      client
        .from('item_catalog')
        .select('id, name, normalized_name, standard_price, is_active')
        .eq('is_active', true),
    ),
    loadHistoricalReviewPagedRows(() =>
      client
        .from('item_aliases')
        .select('id, item_id, alias_text, normalized_alias_text, is_active, is_retired')
        .eq('is_active', true)
        .eq('is_retired', false),
    ),
    loadHistoricalReviewPagedRows(() =>
      client
        .from('item_price_summary_v')
        .select('item_id, usage_count, last_sold_price, last_used_at')
        .eq('is_active', true),
    ),
  ])

  const parentDocsById = await loadHistoricalReviewParentDocs(
    client,
    [...new Set(invoiceRowsResult.rows.map((row: any) => String(row.invoice_id || '')).filter(Boolean))],
    [...new Set(quotationRowsResult.rows.map((row: any) => String(row.quotation_id || '')).filter(Boolean))],
  )

  const summaryByItemId = new Map(
    summaryResult.rows.map((row: any) => [
      String(row.item_id || ''),
      {
        usage_count: toNumber(row.usage_count),
        last_sold_price: toNumber(row.last_sold_price),
        last_used_at: row.last_used_at ? String(row.last_used_at) : null,
      },
    ]),
  )

  const catalogRows = catalogResult.rows
  const catalogById = new Map(
    catalogRows
      .map((row: any) => [String(row.id || ''), row as Record<string, unknown>] as [string, Record<string, unknown>])
      .filter(([itemId]) => Boolean(itemId)),
  )

  const catalogRefs = catalogRows.map((row: any) => {
    const summary = summaryByItemId.get(String(row.id || ''))
    return normalizeHistoricalReviewCatalogRef(
      {
        ...row,
        item_id: row.id,
        normalized_text: row.normalized_name,
        matched_text: row.name,
        usage_count: summary?.usage_count,
        last_sold_price: summary?.last_sold_price,
        last_used_at: summary?.last_used_at,
      },
      'catalog',
    )
  })

  const aliasRefs = aliasesResult.rows
    .map((row: any) => {
      const target = catalogById.get(String(row.item_id || ''))
      if (!target) return null
      const summary = summaryByItemId.get(String(row.item_id || ''))
      return normalizeHistoricalReviewCatalogRef(
        {
          ...row,
          id: row.item_id,
          item_id: row.item_id,
          name: target.name,
          normalized_text: row.normalized_alias_text,
          matched_text: row.alias_text,
          standard_price: target.standard_price,
          usage_count: summary?.usage_count,
          last_sold_price: summary?.last_sold_price,
          last_used_at: summary?.last_used_at,
          is_active: target.is_active !== false && row.is_active !== false,
          is_retired: row.is_retired === true,
        },
        'alias',
      )
    })
    .filter((row): row is HistoricalReviewCatalogRef => Boolean(row))

  const occurrences = [
    ...invoiceRowsResult.rows.map((row) => normalizeHistoricalReviewOccurrence(
      row,
      'invoice',
      client.schemaName,
      parentDocsById.get(`invoice:${String((row as Record<string, unknown>).invoice_id || '')}`) || null,
    )),
    ...quotationRowsResult.rows.map((row) => normalizeHistoricalReviewOccurrence(
      row,
      'quotation',
      client.schemaName,
      parentDocsById.get(`quotation:${String((row as Record<string, unknown>).quotation_id || '')}`) || null,
    )),
  ]

  return buildHistoricalReviewCases({
    tenantSchema: client.schemaName,
    occurrences,
    catalogRefs: [...catalogRefs, ...aliasRefs],
    truncated:
      invoiceRowsResult.truncated ||
      quotationRowsResult.truncated ||
      catalogResult.truncated ||
      aliasesResult.truncated ||
      summaryResult.truncated,
  })
}

export async function getActiveReviewedSeparatePairs(
  itemIds: string[],
  client: TenantClient,
): Promise<ItemReviewedSeparatePair[]> {
  if (!client.isReady || !client.schemaName) return []
  const uniqueItemIds = [...new Set(itemIds.map((itemId) => String(itemId || '').trim()).filter(Boolean))]
  if (!uniqueItemIds.length) return []

  const [leftResult, rightResult] = await Promise.all([
    client
      .from('item_reviewed_separate_pairs')
      .select('id, item_a_id, item_b_id, status')
      .eq('status', 'active')
      .in('item_a_id', uniqueItemIds),
    client
      .from('item_reviewed_separate_pairs')
      .select('id, item_a_id, item_b_id, status')
      .eq('status', 'active')
      .in('item_b_id', uniqueItemIds),
  ])

  if (leftResult.error) throw leftResult.error
  if (rightResult.error) throw rightResult.error

  const rowsById = new Map<string, Record<string, unknown>>()
  ;[...(Array.isArray(leftResult.data) ? leftResult.data : []), ...(Array.isArray(rightResult.data) ? rightResult.data : [])]
    .forEach((row: any) => {
      const id = String(row.id || '')
      if (id) rowsById.set(id, row)
    })

  return [...rowsById.values()].map((row: any) => ({
    id: String(row.id || ''),
    item_a_id: String(row.item_a_id || ''),
    item_b_id: String(row.item_b_id || ''),
    status: row.status === 'active' || row.status === 'revoked' || row.status === 'stale' ? row.status : 'active',
  })).filter((row) => row.id && row.item_a_id && row.item_b_id)
}

function normalizeMutationResult(data: unknown): HistoricalReviewMutationResult {
  const row = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  const status = String(row.status || 'failed')
  return {
    status: status === 'applied' || status === 'stale' || status === 'conflict' ? status : 'failed',
    reason: row.reason ? String(row.reason) : undefined,
    reused: typeof row.reused === 'boolean' ? row.reused : undefined,
    decision_id: row.decision_id ? String(row.decision_id) : undefined,
    target_item_id: row.target_item_id ? String(row.target_item_id) : undefined,
    created_item_id: row.created_item_id ? String(row.created_item_id) : undefined,
    linked_invoice_rows: toNumber(row.linked_invoice_rows) ?? undefined,
    linked_quotation_rows: toNumber(row.linked_quotation_rows) ?? undefined,
    current_hash: row.current_hash ? String(row.current_hash) : undefined,
  }
}

function assertHistoricalReviewClient(client: TenantClient) {
  if (!client.isReady || !client.schemaName) {
    throw new Error('Tenant schema is not available yet.')
  }
}

function baseCaseParams(request: {
  normalizedDescription: string
  caseMembershipHash: string
  invoiceRowIds: string[]
  quotationRowIds: string[]
  reason?: string | null
}) {
  return {
    p_normalized_description: request.normalizedDescription,
    p_case_membership_hash: request.caseMembershipHash,
    p_invoice_row_ids: request.invoiceRowIds,
    p_quotation_row_ids: request.quotationRowIds,
    p_reason: request.reason || null,
  }
}

export async function linkHistoricalReviewCaseToItem(
  request: LinkHistoricalReviewCaseRequest,
  client: TenantClient,
): Promise<HistoricalReviewMutationResult> {
  assertHistoricalReviewClient(client)
  const { data, error } = await client.rpc('link_historical_review_case_to_item', {
    ...baseCaseParams(request),
    p_target_item_id: request.targetItemId,
    p_source_context: {
      source: 'historical_review',
      case_membership_hash: request.caseMembershipHash,
    },
  })
  if (error) throw error
  return normalizeMutationResult(data)
}

export async function createItemFromHistoricalReviewCase(
  request: CreateHistoricalReviewItemRequest,
  client: TenantClient,
): Promise<HistoricalReviewMutationResult> {
  assertHistoricalReviewClient(client)
  const { data, error } = await client.rpc('create_item_from_historical_review_case', {
    ...baseCaseParams(request),
    p_canonical_name: request.canonicalName,
    p_source_context: {
      source: 'historical_review',
      case_membership_hash: request.caseMembershipHash,
    },
  })
  if (error) throw error
  return normalizeMutationResult(data)
}

export async function keepHistoricalReviewCandidateSeparate(
  request: KeepHistoricalReviewCandidateSeparateRequest,
  client: TenantClient,
): Promise<HistoricalReviewMutationResult> {
  assertHistoricalReviewClient(client)
  const { data, error } = await client.rpc('keep_historical_review_case_candidate_separate', {
    ...baseCaseParams(request),
    p_candidate_item_id: request.candidateItemId,
    p_source_context: {
      source: 'historical_review',
      case_membership_hash: request.caseMembershipHash,
    },
  })
  if (error) throw error
  return normalizeMutationResult(data)
}

export async function keepCatalogItemsSeparate(
  request: KeepCatalogItemsSeparateRequest,
  client: TenantClient,
): Promise<HistoricalReviewMutationResult> {
  assertHistoricalReviewClient(client)
  const { data, error } = await client.rpc('keep_item_catalog_entries_separate', {
    p_item_a_id: request.itemAId,
    p_item_b_id: request.itemBId,
    p_reason: request.reason || null,
    p_source_workflow: request.sourceWorkflow || 'cleanup_hub',
    p_source_context: request.sourceContext || {},
  })
  if (error) throw error
  return normalizeMutationResult(data)
}
