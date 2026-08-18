// ============================================================================
// DOCUMENT QUERY PLATFORM — MODULE ADAPTER REGISTRY
// Maps each ModuleScope to its data-fetching adapter
// ============================================================================

import type {
  AdapterFetchContext,
  DocumentAdapter,
  DocumentQueryState,
  FinancialQueryState,
  LogisticsQueryState,
  ModuleScope,
  ProjectQueryState,
} from "@/types/queryPlatform";
import type { TenantClient } from "@/lib/tenantClient";
import { readListCache, writeListCache, isListCacheFresh } from "@/lib/cache/listCache";

// Document list fetches always target the tenant schema. The caller
// (DocumentQueryContext) supplies the resolved tenant client. Missing or
// not-ready client is a hard error — never fall back to public.
function requireFetchClient(ctx?: AdapterFetchContext): TenantClient {
  const client = ctx?.tenantClient;
  if (!client || !client.isReady) {
    throw new Error("Tenant client is required for document queries");
  }
  return client;
}

// --- Shared Helpers ---

function applyDateFilter(query: any, dateRange: DocumentQueryState["dateRange"]) {
  if (dateRange.from) {
    query = query.gte("created_at", dateRange.from);
  }
  if (dateRange.to) {
    query = query.lte("created_at", dateRange.to);
  }
  return query;
}

function applySortOrder(query: any, sortBy: string, sortDirection: "asc" | "desc") {
  return query.order(sortBy, { ascending: sortDirection === "asc" });
}

// --- Cache Bypass Detection ---
// If any filter/sort is non-default, skip the cache and go network-direct.

function hasActiveFilters(query: DocumentQueryState): boolean {
  if (query.search.trim()) return true;
  if (query.dateRange.from || query.dateRange.to) return true;
  if (query.client) return true;
  if (query.sortDirection !== "desc") return true;
  if (query.sortBy !== "created_at") return true;

  // Check type-specific fields
  if ("statuses" in query && (query as any).statuses?.length > 0) return true;
  if ("amountRange" in query) {
    const ar = (query as any).amountRange;
    if (ar?.min !== null || ar?.max !== null) return true;
  }
  return false;
}

// --- Invoice Status Mapping (DB values → UI canonical) ---

const INVOICE_STATUS_DB_MAP: Record<string, string> = {
  paid: "paid",
  "fully_paid": "paid",
  "fully paid": "paid",
  "partially_paid": "partially paid",
  partial: "partially paid",
  "partially paid": "partially paid",
  unpaid: "unpaid",
  overdue: "overdue",
};

// --- Local Filter Helpers (applied to cached rows) ---

function applyDateRangeLocally(rows: any[], dateRange: DocumentQueryState["dateRange"]): any[] {
  if (!dateRange.from && !dateRange.to) return rows;

  const from = dateRange.from || "1970-01-01";
  const to = dateRange.to || new Date().toISOString().split("T")[0];

  return rows.filter((row) => {
    const rowDate = (row.created_at || row.date || row.issue_date || "").slice(0, 10);
    if (!rowDate) return true;
    return rowDate >= from && rowDate <= to;
  });
}

function applyClientLocally(rows: any[], client: string | null): any[] {
  if (!client || client === "All") return rows;
  const lower = client.toLowerCase();
  return rows.filter((row) => {
    const clientName = (row.client_name || "").toLowerCase();
    const vendorName = (row.vendor_name || "").toLowerCase();
    return clientName.includes(lower) || vendorName.includes(lower);
  });
}

function applySortLocally(rows: any[], sortBy: string, sortDirection: "asc" | "desc"): any[] {
  const sorted = [...rows];
  const dir = sortDirection === "asc" ? 1 : -1;

  sorted.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    // Numeric comparison for known numeric fields
    if (sortBy === "total" || sortBy === "project_value") {
      return (Number(aVal || 0) - Number(bVal || 0)) * dir;
    }

    // String/date comparison
    const aStr = String(aVal || "");
    const bStr = String(bVal || "");
    return aStr.localeCompare(bStr) * dir;
  });

  return sorted;
}

// --- Invoice Adapter ---

const invoicesAdapter: DocumentAdapter<FinancialQueryState, any> = {
  initialSortBy: "created_at",
  statusOptions: [],
  cacheKey: "bd:list:invoices:v1:all",
  cacheTtlMs: 5 * 60 * 1000,

  async fetcher(query, ctx) {
    // Bypass cache when any filter/sort is active — go network-direct
    const cached = readListCache<any>(invoicesAdapter.cacheKey);
    if (!hasActiveFilters(query) && cached && isListCacheFresh(cached, invoicesAdapter.cacheTtlMs)) {
      return cached.rows;
    }

    const client = requireFetchClient(ctx);

    let q = client
      .from("invoices")
      .select("id, invoice_number, client_name, issue_date, due_date, created_at, total, status, project_id, custom_fields, payments(cash_amount, wht_amount, amount, voided_at)")
      .is("archived_at", null);

    if (query.search.trim()) {
      const term = query.search.trim().replace(/,/g, " ");
      q = q.or(`invoice_number.ilike.%${term}%,client_name.ilike.%${term}%`);
    }

    // Server-side status filtering
    // DB only stores "unpaid" and "paid". PARTIALLY PAID and OVERDUE are computed
    // from payments array and due_date respectively — resolved client-side after fetch.
    if (query.statuses.length > 0 && !query.statuses.includes("All")) {
      const upperStatuses = query.statuses.map((s) => s.toUpperCase());
      const hasPaid = upperStatuses.includes("PAID");
      const hasUnpaid = upperStatuses.includes("UNPAID");
      const hasPartiallyPaid = upperStatuses.includes("PARTIALLY PAID");
      const hasOverdue = upperStatuses.includes("OVERDUE");

      // Determine which raw DB statuses we need to fetch
      const dbStatuses: string[] = [];
      if (hasPaid) dbStatuses.push("paid");
      if (hasUnpaid || hasPartiallyPaid || hasOverdue) dbStatuses.push("unpaid");

      if (dbStatuses.length > 0 && dbStatuses.length < 2) {
        q = q.eq("status", dbStatuses[0]);
      }
      // If both "paid" and "unpaid" needed, no server filter (fetch all)
    }

    // Server-side amount filtering
    if (query.amountRange.min !== null) {
      q = q.gte("total", query.amountRange.min);
    }
    if (query.amountRange.max !== null) {
      q = q.lte("total", query.amountRange.max);
    }

    // Server-side client filtering
    if (query.client && query.client !== "All") {
      q = q.ilike("client_name", `%${query.client}%`);
    }

    q = applyDateFilter(q, query.dateRange);
    q = applySortOrder(q, query.sortBy, query.sortDirection);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data as any[]) || [];
    // Only write to cache on unfiltered fetches
    if (!hasActiveFilters(query)) {
      writeListCache(invoicesAdapter.cacheKey, rows);
    }

    // Client-side status resolution for computed states
    if (query.statuses.length > 0 && !query.statuses.includes("All")) {
      return resolveInvoiceStatusFilter(rows, query.statuses);
    }

    return rows;
  },
};

/**
 * Resolves computed invoice statuses client-side.
 * DB only stores "unpaid" | "paid". Derived states:
 *   PARTIALLY PAID = status "unpaid" + has non-voided payments + paid < total
 *   OVERDUE = status "unpaid" + due_date < today
 *   UNPAID (pure) = status "unpaid" + no payments (or paid === 0)
 */
function resolveInvoiceStatusFilter(rows: any[], statuses: string[]): any[] {
  const upper = statuses.map((s) => s.toUpperCase());
  const wantPaid = upper.includes("PAID");
  const wantUnpaid = upper.includes("UNPAID");
  const wantPartial = upper.includes("PARTIALLY PAID");
  const wantOverdue = upper.includes("OVERDUE");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return rows.filter((row) => {
    const rawStatus = (row.status || "").toLowerCase();

    // PAID — straightforward
    if (rawStatus === "paid") {
      return wantPaid;
    }

    // Everything below is for "unpaid" rows — compute derived state
    if (rawStatus !== "unpaid") return false;

    // Calculate paid amount from payments array
    const payments: any[] = Array.isArray(row.payments) ? row.payments : [];
    const activePaidAmount = payments
      .filter((p: any) => !p.voided_at)
      .reduce((sum: number, p: any) => sum + Number(p.amount || p.cash_amount || 0), 0);

    const totalAmount = Number(row.total || 0);
    const isPartiallyPaid = activePaidAmount > 0 && activePaidAmount < totalAmount;

    // Check overdue
    const isOverdue = (() => {
      if (!row.due_date) return false;
      const due = new Date(row.due_date);
      return !isNaN(due.getTime()) && due < today;
    })();

    // Match against requested filters
    if (wantPartial && isPartiallyPaid) return true;
    if (wantOverdue && isOverdue && !isPartiallyPaid) return true;
    if (wantUnpaid && !isPartiallyPaid) return true;

    return false;
  });
}

function filterInvoicesLocally(rows: any[], query: FinancialQueryState): any[] {
  let filtered = rows;

  if (query.statuses.length > 0 && !query.statuses.includes("All")) {
    const normalizedStatuses = query.statuses.map((s) => s.toUpperCase());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    filtered = filtered.filter((row) => {
      const rawStatus = (row.status || "").toLowerCase().trim();

      // Normalize variant database strings to canonical UI status
      let canonical: string;
      if (rawStatus === "fully_paid" || rawStatus === "fully paid") {
        canonical = "PAID";
      } else if (rawStatus === "partially_paid" || rawStatus === "partial") {
        canonical = "PARTIALLY PAID";
      } else {
        canonical = rawStatus.toUpperCase();
      }

      // Check if row qualifies as OVERDUE (unpaid + past due_date)
      const isOverdue = (() => {
        if (canonical !== "UNPAID") return false;
        if (!row.due_date) return false;
        const due = new Date(row.due_date);
        return !isNaN(due.getTime()) && due < today;
      })();

      // Match against selected statuses
      if (normalizedStatuses.includes(canonical)) return true;
      if (normalizedStatuses.includes("OVERDUE") && isOverdue) return true;
      return false;
    });
  }

  if (query.amountRange.min !== null) {
    filtered = filtered.filter((row) => Number(row.total || 0) >= query.amountRange.min!);
  }
  if (query.amountRange.max !== null) {
    filtered = filtered.filter((row) => Number(row.total || 0) <= query.amountRange.max!);
  }

  filtered = applyDateRangeLocally(filtered, query.dateRange);
  filtered = applyClientLocally(filtered, query.client);
  filtered = applySortLocally(filtered, query.sortBy, query.sortDirection);

  return filtered;
}

// --- Quotations Adapter ---

const quotationsAdapter: DocumentAdapter<FinancialQueryState, any> = {
  initialSortBy: "created_at",
  statusOptions: [],
  cacheKey: "bd:list:quotations:v1:all",
  cacheTtlMs: 5 * 60 * 1000,

  async fetcher(query, ctx) {
    const cached = readListCache<any>(quotationsAdapter.cacheKey);
    if (!hasActiveFilters(query) && cached && isListCacheFresh(cached, quotationsAdapter.cacheTtlMs)) {
      return cached.rows;
    }

    const client = requireFetchClient(ctx);

    let q = client
      .from("quotations")
      .select("id, quotation_number, client_name, issue_date, valid_until, created_at, total, status, project_id")
      .is("archived_at", null);

    if (query.search.trim()) {
      const term = query.search.trim().replace(/,/g, " ");
      q = q.or(`quotation_number.ilike.%${term}%,client_name.ilike.%${term}%`);
    }

    // Server-side status filtering (excluding OVERDUE which needs client-side date check)
    const hasOverdue = query.statuses.length > 0 && query.statuses.map((s) => s.toUpperCase()).includes("OVERDUE");
    const nonOverdueStatuses = query.statuses.filter((s) => s.toUpperCase() !== "OVERDUE").map((s) => s.toLowerCase());

    if (nonOverdueStatuses.length > 0 && !query.statuses.includes("All")) {
      if (!hasOverdue) {
        q = q.in("status", nonOverdueStatuses);
      }
      // If OVERDUE is also selected, we fetch broader and filter client-side for the date check
    }

    if (query.amountRange.min !== null) {
      q = q.gte("total", query.amountRange.min);
    }
    if (query.amountRange.max !== null) {
      q = q.lte("total", query.amountRange.max);
    }

    if (query.client && query.client !== "All") {
      q = q.ilike("client_name", `%${query.client}%`);
    }

    q = applyDateFilter(q, query.dateRange);
    q = applySortOrder(q, query.sortBy, query.sortDirection);

    const { data, error } = await q;
    if (error) throw error;

    let rows = (data as any[]) || [];

    // Client-side OVERDUE check for quotations (valid_until expiration)
    if (query.statuses.length > 0 && !query.statuses.includes("All") && hasOverdue) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const normalizedStatuses = query.statuses.map((s) => s.toUpperCase());
      rows = rows.filter((row) => {
        const canonical = (row.status || "").toUpperCase();
        if (normalizedStatuses.includes(canonical)) return true;
        if (row.valid_until) {
          const validUntil = new Date(row.valid_until);
          if (!isNaN(validUntil.getTime()) && validUntil < today) return true;
        }
        return false;
      });
    }

    if (!hasActiveFilters(query)) {
      writeListCache(quotationsAdapter.cacheKey, rows);
    }
    return rows;
  },
};

// --- Waybills Adapter ---

const waybillsAdapter: DocumentAdapter<LogisticsQueryState, any> = {
  initialSortBy: "created_at",
  statusOptions: [],
  cacheKey: "bd:list:waybills:v1:all",
  cacheTtlMs: 5 * 60 * 1000,

  async fetcher(query, ctx) {
    const cached = readListCache<any>(waybillsAdapter.cacheKey);
    if (!hasActiveFilters(query) && cached && isListCacheFresh(cached, waybillsAdapter.cacheTtlMs)) {
      return cached.rows;
    }

    const client = requireFetchClient(ctx);

    let q = client
      .from("waybills")
      .select("id, waybill_number, type, client_name, date, created_at, status, project_id, invoice_id, vehicle_plate, delivery_location")
      .is("archived_at", null);

    if (query.search.trim()) {
      const term = query.search.trim().replace(/,/g, " ");
      q = q.or(`waybill_number.ilike.%${term}%,client_name.ilike.%${term}%`);
    }

    if (query.statuses.length > 0 && !query.statuses.includes("All")) {
      q = q.in("status", query.statuses.map((s) => s.toLowerCase()));
    }

    if (query.client && query.client !== "All") {
      q = q.ilike("client_name", `%${query.client}%`);
    }

    q = applyDateFilter(q, query.dateRange);
    q = applySortOrder(q, query.sortBy, query.sortDirection);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data as any[]) || [];
    if (!hasActiveFilters(query)) {
      writeListCache(waybillsAdapter.cacheKey, rows);
    }
    return rows;
  },
};

function filterWaybillsLocally(rows: any[], query: LogisticsQueryState): any[] {
  let filtered = rows;

  if (query.statuses.length > 0 && !query.statuses.includes("All")) {
    const normalizedStatuses = query.statuses.map((s) => s.toUpperCase());
    filtered = filtered.filter((row) => normalizedStatuses.includes((row.status || "").toUpperCase()));
  }

  filtered = applyDateRangeLocally(filtered, query.dateRange);
  filtered = applyClientLocally(filtered, query.client);
  filtered = applySortLocally(filtered, query.sortBy, query.sortDirection);

  return filtered;
}

// --- Projects Adapter ---

const projectsAdapter: DocumentAdapter<ProjectQueryState, any> = {
  initialSortBy: "created_at",
  statusOptions: [],
  cacheKey: "bd:list:projects:v1:all",
  cacheTtlMs: 5 * 60 * 1000,

  async fetcher(query, ctx) {
    const cached = readListCache<any>(projectsAdapter.cacheKey);
    if (!hasActiveFilters(query) && cached && isListCacheFresh(cached, projectsAdapter.cacheTtlMs)) {
      return cached.rows;
    }

    let q = requireFetchClient(ctx)
      .from("projects")
      .select("id, name, project_code, client_name, status, project_value, start_date, created_at")
      .is("archived_at", null);

    if (query.search.trim()) {
      const term = query.search.trim().replace(/,/g, " ");
      q = q.or(`name.ilike.%${term}%,client_name.ilike.%${term}%`);
    }

    if (query.statuses.length > 0 && !query.statuses.includes("All")) {
      q = q.in("status", query.statuses.map((s) => s.toLowerCase()));
    }

    if (query.client && query.client !== "All") {
      q = q.ilike("client_name", `%${query.client}%`);
    }

    q = applyDateFilter(q, query.dateRange);
    q = applySortOrder(q, query.sortBy, query.sortDirection);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data as any[]) || [];
    if (!hasActiveFilters(query)) {
      writeListCache(projectsAdapter.cacheKey, rows);
    }
    return rows;
  },
};

// --- CSR Adapter ---

const csrAdapter: DocumentAdapter<ProjectQueryState, any> = {
  initialSortBy: "created_at",
  statusOptions: [],
  cacheKey: "bd:list:csr:v1:all",
  cacheTtlMs: 5 * 60 * 1000,

  async fetcher(query, ctx) {
    const cached = readListCache<any>(csrAdapter.cacheKey);
    if (!hasActiveFilters(query) && cached && isListCacheFresh(cached, csrAdapter.cacheTtlMs)) {
      return cached.rows;
    }

    let q = requireFetchClient(ctx)
      .from("csrs")
      .select("id, csr_number, client_name, equipment_type, make, date, created_at, status, linked_invoice_id, project_id")
      .is("archived_at", null);

    if (query.search.trim()) {
      const term = query.search.trim().replace(/,/g, " ");
      q = q.or(`csr_number.ilike.%${term}%,client_name.ilike.%${term}%,equipment_type.ilike.%${term}%`);
    }

    if (query.statuses.length > 0 && !query.statuses.includes("All")) {
      q = q.in("status", query.statuses.map((s) => s.toLowerCase()));
    }

    if (query.client && query.client !== "All") {
      q = q.ilike("client_name", `%${query.client}%`);
    }

    q = applyDateFilter(q, query.dateRange);
    q = applySortOrder(q, query.sortBy, query.sortDirection);
    // Secondary sort by csr_number for deterministic ordering when created_at ties
    if (query.sortBy === "created_at") {
      q = q.order("csr_number", { ascending: query.sortDirection === "asc" });
    }

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data as any[]) || [];
    if (!hasActiveFilters(query)) {
      writeListCache(csrAdapter.cacheKey, rows);
    }
    return rows;
  },
};

// --- RFQs Adapter ---

const rfqsAdapter: DocumentAdapter<ProjectQueryState, any> = {
  initialSortBy: "created_at",
  statusOptions: [],
  cacheKey: "bd:list:rfqs:v1:all",
  cacheTtlMs: 5 * 60 * 1000,

  async fetcher(query, ctx) {
    const cached = readListCache<any>(rfqsAdapter.cacheKey);
    if (!hasActiveFilters(query) && cached && isListCacheFresh(cached, rfqsAdapter.cacheTtlMs)) {
      return cached.rows;
    }

    let q = requireFetchClient(ctx)
      .from("rfqs")
      .select("id, rfq_number, client_name, created_at, status, project_id, title")
      .is("archived_at", null);

    if (query.search.trim()) {
      const term = query.search.trim().replace(/,/g, " ");
      q = q.or(`rfq_number.ilike.%${term}%,client_name.ilike.%${term}%,title.ilike.%${term}%`);
    }

    if (query.statuses.length > 0 && !query.statuses.includes("All")) {
      q = q.in("status", query.statuses.map((s) => s.toLowerCase()));
    }

    if (query.client && query.client !== "All") {
      q = q.ilike("client_name", `%${query.client}%`);
    }

    q = applyDateFilter(q, query.dateRange);
    q = applySortOrder(q, query.sortBy, query.sortDirection);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data as any[]) || [];
    if (!hasActiveFilters(query)) {
      writeListCache(rfqsAdapter.cacheKey, rows);
    }
    return rows;
  },
};

// --- Receipts Adapter ---

const receiptsAdapter: DocumentAdapter<FinancialQueryState, any> = {
  initialSortBy: "created_at",
  statusOptions: [],
  cacheKey: "bd:list:receipts:v1:all",
  cacheTtlMs: 5 * 60 * 1000,

  async fetcher(query, ctx) {
    const cached = readListCache<any>(receiptsAdapter.cacheKey);
    if (!hasActiveFilters(query) && cached && isListCacheFresh(cached, receiptsAdapter.cacheTtlMs)) {
      return cached.rows;
    }

    const client = requireFetchClient(ctx);

    let q = client
      .from("receipts")
      .select("*");

    if (query.search.trim()) {
      const term = query.search.trim().replace(/,/g, " ");
      q = q.or(`receipt_number.ilike.%${term}%,invoice_number.ilike.%${term}%,client_name.ilike.%${term}%`);
    }

    if (query.statuses.length > 0 && !query.statuses.includes("All")) {
      q = q.in("status", query.statuses.map((s) => s.toLowerCase()));
    }

    if (query.amountRange.min !== null) {
      q = q.gte("payment_amount", query.amountRange.min);
    }
    if (query.amountRange.max !== null) {
      q = q.lte("payment_amount", query.amountRange.max);
    }

    if (query.client && query.client !== "All") {
      q = q.ilike("client_name", `%${query.client}%`);
    }

    q = applyDateFilter(q, query.dateRange);
    q = applySortOrder(q, query.sortBy, query.sortDirection);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data as any[]) || [];
    if (!hasActiveFilters(query)) {
      writeListCache(receiptsAdapter.cacheKey, rows);
    }
    return rows;
  },
};

// --- BOQs Adapter ---

const boqsAdapter: DocumentAdapter<ProjectQueryState, any> = {
  initialSortBy: "created_at",
  statusOptions: [],
  cacheKey: "bd:list:boqs:v1:all",
  cacheTtlMs: 5 * 60 * 1000,

  async fetcher(query, ctx) {
    const cached = readListCache<any>(boqsAdapter.cacheKey);
    if (!hasActiveFilters(query) && cached && isListCacheFresh(cached, boqsAdapter.cacheTtlMs)) {
      return cached.rows;
    }

    let q = requireFetchClient(ctx)
      .from("boqs")
      .select("id, boq_number, client_name, created_at, status, project_id, title, total")
      .is("archived_at", null);

    if (query.search.trim()) {
      const term = query.search.trim().replace(/,/g, " ");
      q = q.or(`boq_number.ilike.%${term}%,client_name.ilike.%${term}%,title.ilike.%${term}%`);
    }

    if (query.statuses.length > 0 && !query.statuses.includes("All")) {
      q = q.in("status", query.statuses.map((s) => s.toLowerCase()));
    }

    if (query.client && query.client !== "All") {
      q = q.ilike("client_name", `%${query.client}%`);
    }

    q = applyDateFilter(q, query.dateRange);
    q = applySortOrder(q, query.sortBy, query.sortDirection);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data as any[]) || [];
    if (!hasActiveFilters(query)) {
      writeListCache(boqsAdapter.cacheKey, rows);
    }
    return rows;
  },
};

// --- Shared Local Filters ---

function filterFinancialLocally(rows: any[], query: FinancialQueryState): any[] {
  let filtered = rows;

  if (query.statuses.length > 0 && !query.statuses.includes("All")) {
    const normalizedStatuses = query.statuses.map((s) => s.toUpperCase());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    filtered = filtered.filter((row) => {
      const rawStatus = (row.status || "").toLowerCase().trim();

      // Normalize variant database strings to canonical UI status
      let canonical: string;
      if (rawStatus === "fully_paid" || rawStatus === "fully paid") {
        canonical = "PAID";
      } else if (rawStatus === "partially_paid" || rawStatus === "partial") {
        canonical = "PARTIALLY PAID";
      } else {
        canonical = rawStatus.toUpperCase();
      }

      // OVERDUE for quotations: check valid_until expiration
      const isOverdue = (() => {
        // For quotations: expired validity window
        if (row.valid_until) {
          const validUntil = new Date(row.valid_until);
          if (!isNaN(validUntil.getTime()) && validUntil < today) return true;
        }
        // For invoices: unpaid + past due_date
        if (canonical === "UNPAID" && row.due_date) {
          const due = new Date(row.due_date);
          if (!isNaN(due.getTime()) && due < today) return true;
        }
        return false;
      })();

      if (normalizedStatuses.includes(canonical)) return true;
      if (normalizedStatuses.includes("OVERDUE") && isOverdue) return true;
      return false;
    });
  }

  if (query.amountRange.min !== null) {
    filtered = filtered.filter((row) => Number(row.total || 0) >= query.amountRange.min!);
  }
  if (query.amountRange.max !== null) {
    filtered = filtered.filter((row) => Number(row.total || 0) <= query.amountRange.max!);
  }

  filtered = applyDateRangeLocally(filtered, query.dateRange);
  filtered = applyClientLocally(filtered, query.client);
  filtered = applySortLocally(filtered, query.sortBy, query.sortDirection);

  return filtered;
}

function filterProjectLocally(rows: any[], query: ProjectQueryState): any[] {
  let filtered = rows;

  if (query.statuses.length > 0 && !query.statuses.includes("All")) {
    const normalizedStatuses = query.statuses.map((s) => s.toUpperCase());
    filtered = filtered.filter((row) => normalizedStatuses.includes((row.status || "").toUpperCase()));
  }

  filtered = applyDateRangeLocally(filtered, query.dateRange);
  filtered = applyClientLocally(filtered, query.client);
  filtered = applySortLocally(filtered, query.sortBy, query.sortDirection);

  return filtered;
}

// --- Registry ---

const adapterRegistry: Record<ModuleScope, DocumentAdapter<any, any>> = {
  invoices: invoicesAdapter,
  quotations: quotationsAdapter,
  waybills: waybillsAdapter,
  projects: projectsAdapter,
  csr: csrAdapter,
  rfqs: rfqsAdapter,
  boqs: boqsAdapter,
  receipts: receiptsAdapter,
};

// --- Public API (exhaustive — compile-time safe) ---

export function getAdapter(module: ModuleScope): DocumentAdapter<any, any> {
  const adapter = adapterRegistry[module];
  if (!adapter) {
    // Exhaustiveness check — should never reach here with valid ModuleScope
    const _exhaustive: never = module as never;
    throw new Error(`No adapter registered for module: ${module}`);
  }
  return adapter;
}
