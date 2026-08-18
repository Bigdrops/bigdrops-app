/**
 * EXPORT FETCHERS — Parametric Database Extraction Adapters
 *
 * This module handles all database queries for export operations.
 * Key principles:
 * - No pagination limits (full dataset extraction)
 * - Parametric filter application (respects inherited context)
 * - Type-safe query building
 * - Optimized for large result sets
 * - Proper error handling and logging
 */

import type { TenantClient } from '@/lib/tenantClient';
import type {
  ExportModuleDomain,
  InheritedExportContext,
} from '../types/exportHub';

/**
 * Maps export domains to their primary database table names.
 * Used for dynamic query routing.
 */
const TABLE_MAP: Record<ExportModuleDomain, string> = {
  INVOICES: 'invoices',
  QUOTATIONS: 'quotations',
  WAYBILLS: 'waybills',
  PROJECTS: 'projects',
  RFQS: 'rfqs',
  BOQS: 'boqs',
  PRICE_HISTORY: 'price_history',
  CLIENTS: 'clients',
  CSR: 'client_service_records',
};

/**
 * Defines which domains support nested line-item relationships.
 * These domains will include their child items in the export.
 */
const DOMAINS_WITH_ITEMS: Set<ExportModuleDomain> = new Set([
  'INVOICES',
  'QUOTATIONS',
  'BOQS',
]);

/**
 * Maps domains to their line-item table names.
 */
const ITEMS_TABLE_MAP: Record<string, string> = {
  INVOICES: 'invoice_items',
  QUOTATIONS: 'quotation_items',
  BOQS: 'boq_items',
};

/**
 * Compiles and executes an un-paginated index scan query against Supabase.
 * Dynamically applies active filter criteria constraints from the inherited context.
 *
 * Features:
 * - Full dataset extraction (no limit/offset pagination)
 * - Parametric filter application
 * - Nested relationship inclusion for line items
 * - Proper sorting and ordering
 * - Type-safe error handling
 *
 * @param domain - Export domain (INVOICES, QUOTATIONS, etc.)
 * @param context - Inherited filter context from source view
 * @returns Array of records matching the filter criteria
 * @throws Error if the database query fails
 */
export async function fetchExportDataset(
  domain: ExportModuleDomain,
  context: InheritedExportContext,
  tenantClient: TenantClient
): Promise<Record<string, unknown>[]> {
  const table = TABLE_MAP[domain];

  if (!table) {
    throw new Error(`Unknown export domain: ${domain}`);
  }

  // Build select clause with nested relationships
  let selectClause = '*';
  if (DOMAINS_WITH_ITEMS.has(domain)) {
    const itemsTable = ITEMS_TABLE_MAP[domain];
    selectClause = `*, ${itemsTable}(*)`;
  }

  // Start building the query
  let query = tenantClient.from(table).select(selectClause);

  // Apply parametric filters from inherited context
  if (context.clientId) {
    query = query.eq('client_id', context.clientId);
  }

  // Status filter (handles multiple statuses)
  if (context.statuses && context.statuses.length > 0) {
    query = query.in('status', context.statuses);
  }

  // Date range filters
  if (context.dateRange?.start) {
    query = query.gte('created_at', context.dateRange.start);
  }
  if (context.dateRange?.end) {
    query = query.lte('created_at', context.dateRange.end);
  }

  // Amount range filters (for domains with total/amount fields)
  if (
    context.amountRange?.min !== null &&
    context.amountRange?.min !== undefined
  ) {
    query = query.gte('total', context.amountRange.min);
  }
  if (
    context.amountRange?.max !== null &&
    context.amountRange?.max !== undefined
  ) {
    query = query.lte('total', context.amountRange.max);
  }

  // Apply sorting
  const sortField = context.sortBy || 'created_at';
  const sortAscending = context.sortDirection === 'asc';
  query = query.order(sortField, { ascending: sortAscending });

  // Execute query
  const { data, error } = await query;

  if (error) {
    console.error(`Export fetch error for domain ${domain}:`, error);
    throw new Error(
      `Failed to fetch ${domain} data: ${error.message || 'Unknown error'}`
    );
  }

  // Type-safe cast: data is either the result array or null
  if (!Array.isArray(data)) {
    return [];
  }

  return data as unknown as Record<string, unknown>[];
}

/**
 * Fetches a specific domain's data with full context inheritance.
 * This is the main entry point for export operations.
 *
 * @param domain - Export domain
 * @param context - Inherited filter context
 * @returns Complete dataset for export
 */
export async function getExportData(
  domain: ExportModuleDomain,
  context: InheritedExportContext,
  tenantClient: TenantClient
): Promise<Record<string, unknown>[]> {
  try {
    const data = await fetchExportDataset(domain, context, tenantClient);
    return data;
  } catch (error) {
    console.error(`Export data retrieval failed for ${domain}:`, error);
    throw error;
  }
}

/**
 * Validates that the export context is valid before attempting a fetch.
 * Prevents unnecessary database queries with invalid parameters.
 *
 * @param context - Context to validate
 * @returns true if context is valid, false otherwise
 */
export function isValidExportContext(context: InheritedExportContext): boolean {
  // At minimum, context should have valid sort parameters
  if (!context.sortBy || !context.sortDirection) {
    return false;
  }

  // Date range should be properly ordered if both are specified
  if (
    context.dateRange?.start &&
    context.dateRange?.end &&
    context.dateRange.start > context.dateRange.end
  ) {
    return false;
  }

  // Amount range should be properly ordered if both are specified
  if (
    context.amountRange?.min !== null &&
    context.amountRange?.max !== null &&
    context.amountRange.min > context.amountRange.max
  ) {
    return false;
  }

  return true;
}

/**
 * Gets a human-readable summary of the applied filters.
 * Useful for logging and debugging export operations.
 *
 * @param context - Export context
 * @returns Filter summary string
 */
export function getFilterSummary(context: InheritedExportContext): string {
  const filters: string[] = [];

  if (context.clientId) {
    filters.push(`client: ${context.clientId}`);
  }

  if (context.statuses?.length) {
    filters.push(`statuses: ${context.statuses.join(', ')}`);
  }

  if (context.dateRange?.start || context.dateRange?.end) {
    const start = context.dateRange?.start || 'any';
    const end = context.dateRange?.end || 'any';
    filters.push(`dates: ${start} to ${end}`);
  }

  if (
    context.amountRange?.min !== null ||
    context.amountRange?.max !== null
  ) {
    const min = context.amountRange?.min ?? 'any';
    const max = context.amountRange?.max ?? 'any';
    filters.push(`amounts: ${min} to ${max}`);
  }

  if (context.searchTokens?.length) {
    filters.push(`search: ${context.searchTokens.join(', ')}`);
  }

  return filters.length > 0 ? filters.join(' | ') : 'no filters applied';
}
