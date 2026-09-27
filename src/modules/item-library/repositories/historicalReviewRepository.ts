import type { TenantClient } from '@/lib/tenantClient'
import { buildHistoricalReviewCases } from '../domain/historicalReview'
import { normalizeItemText } from '../domain/suggestionRanking'
import type {
  HistoricalReviewCatalogRef,
  HistoricalReviewRawOccurrence,
  HistoricalReviewResult,
} from '../types'

const HISTORICAL_REVIEW_PAGE_SIZE = 1000
const HISTORICAL_REVIEW_MAX_ROWS = 5000
const HISTORICAL_REVIEW_MAX_PAGES = HISTORICAL_REVIEW_MAX_ROWS / HISTORICAL_REVIEW_PAGE_SIZE

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeHistoricalReviewOccurrence(
  row: Record<string, unknown>,
  sourceType: 'invoice' | 'quotation',
  tenantSchema: string | null,
): HistoricalReviewRawOccurrence {
  const document = sourceType === 'invoice' ? (row.invoices as any) : (row.quotations as any)
  const description = String(row.description || '')

  return {
    row_id: String(row.id || ''),
    tenant_schema: tenantSchema || '',
    source_type: sourceType,
    source_document_id: String(sourceType === 'invoice' ? row.invoice_id || '' : row.quotation_id || ''),
    source_document_number:
      sourceType === 'invoice'
        ? document?.invoice_number ? String(document.invoice_number) : null
        : document?.quotation_number ? String(document.quotation_number) : null,
    document_date: document?.issue_date ? String(document.issue_date) : null,
    client_name: document?.client_name ? String(document.client_name) : null,
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
    const relation =
      tableName === 'invoice_items'
        ? 'id, invoice_id, item_id, description, row_type, unit, make, quantity, unit_price, group_name, group_id, updated_at, invoices(invoice_number, issue_date, client_name)'
        : 'id, quotation_id, item_id, description, row_type, unit, make, quantity, unit_price, group_name, group_id, updated_at, quotations(quotation_number, issue_date, client_name)'

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
    ...invoiceRowsResult.rows.map((row) => normalizeHistoricalReviewOccurrence(row, 'invoice', client.schemaName)),
    ...quotationRowsResult.rows.map((row) => normalizeHistoricalReviewOccurrence(row, 'quotation', client.schemaName)),
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
