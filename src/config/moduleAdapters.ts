// ============================================================================
// DOCUMENT QUERY PLATFORM — MODULE ADAPTER REGISTRY
// Maps each ModuleScope to its data-fetching adapter
// ============================================================================

import type {
  DocumentAdapter,
  DocumentQueryState,
  FinancialQueryState,
  LogisticsQueryState,
  ModuleScope,
  ProjectQueryState,
} from "@/types/queryPlatform";
import { supabase } from "@/supabase";
import { readListCache, writeListCache, isListCacheFresh } from "@/lib/cache/listCache";

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

// --- Invoice Adapter ---

const invoicesAdapter: DocumentAdapter<FinancialQueryState, any> = {
  initialSortBy: "created_at",
  statusOptions: ["All", "Draft", "Sent", "Paid", "Overdue", "Archived"],
  cacheKey: "bd:list:invoices:v1:all",
  cacheTtlMs: 5 * 60 * 1000,

  async fetcher(query) {
    // Check cache first
    const cached = readListCache<any>(invoicesAdapter.cacheKey);
    if (cached && isListCacheFresh(cached, invoicesAdapter.cacheTtlMs)) {
      return filterInvoicesLocally(cached.rows, query);
    }

    let q = supabase
      .from("invoices")
      .select("id, invoice_number, client_name, issue_date, created_at, total, status, project_id, custom_fields, payments(cash_amount, wht_amount, amount, voided_at)")
      .is("archived_at", null);

    if (query.search.trim()) {
      const term = query.search.trim().replace(/,/g, " ");
      q = q.or(`invoice_number.ilike.%${term}%,client_name.ilike.%${term}%`);
    }

    q = applyDateFilter(q, query.dateRange);
    q = applySortOrder(q, query.sortBy, query.sortDirection);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data as any[]) || [];
    writeListCache(invoicesAdapter.cacheKey, rows);
    return filterInvoicesLocally(rows, query);
  },
};

function filterInvoicesLocally(rows: any[], query: FinancialQueryState): any[] {
  let filtered = rows;

  if (query.statuses.length > 0 && !query.statuses.includes("All")) {
    filtered = filtered.filter((row) => query.statuses.includes(row.status || ""));
  }

  if (query.amountRange.min !== null) {
    filtered = filtered.filter((row) => Number(row.total || 0) >= query.amountRange.min!);
  }
  if (query.amountRange.max !== null) {
    filtered = filtered.filter((row) => Number(row.total || 0) <= query.amountRange.max!);
  }

  return filtered;
}

// --- Quotations Adapter ---

const quotationsAdapter: DocumentAdapter<FinancialQueryState, any> = {
  initialSortBy: "created_at",
  statusOptions: ["All", "Draft", "Sent", "Accepted", "Rejected", "Expired"],
  cacheKey: "bd:list:quotations:v1:all",
  cacheTtlMs: 5 * 60 * 1000,

  async fetcher(query) {
    const cached = readListCache<any>(quotationsAdapter.cacheKey);
    if (cached && isListCacheFresh(cached, quotationsAdapter.cacheTtlMs)) {
      return filterFinancialLocally(cached.rows, query);
    }

    let q = supabase
      .from("quotations")
      .select("id, quotation_number, client_name, issue_date, created_at, total, status, project_id")
      .is("archived_at", null);

    if (query.search.trim()) {
      const term = query.search.trim().replace(/,/g, " ");
      q = q.or(`quotation_number.ilike.%${term}%,client_name.ilike.%${term}%`);
    }

    q = applyDateFilter(q, query.dateRange);
    q = applySortOrder(q, query.sortBy, query.sortDirection);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data as any[]) || [];
    writeListCache(quotationsAdapter.cacheKey, rows);
    return filterFinancialLocally(rows, query);
  },
};

// --- Waybills Adapter ---

const waybillsAdapter: DocumentAdapter<LogisticsQueryState, any> = {
  initialSortBy: "created_at",
  statusOptions: ["All", "Draft", "In Transit", "Delivered", "Cancelled"],
  cacheKey: "bd:list:waybills:v1:all",
  cacheTtlMs: 5 * 60 * 1000,

  async fetcher(query) {
    const cached = readListCache<any>(waybillsAdapter.cacheKey);
    if (cached && isListCacheFresh(cached, waybillsAdapter.cacheTtlMs)) {
      return filterWaybillsLocally(cached.rows, query);
    }

    let q = supabase
      .from("waybills")
      .select("id, waybill_number, client_name, created_at, status, carrier_id, origin, destination")
      .is("archived_at", null);

    if (query.search.trim()) {
      const term = query.search.trim().replace(/,/g, " ");
      q = q.or(`waybill_number.ilike.%${term}%,client_name.ilike.%${term}%`);
    }

    if (query.carrierId) {
      q = q.eq("carrier_id", query.carrierId);
    }

    q = applyDateFilter(q, query.dateRange);
    q = applySortOrder(q, query.sortBy, query.sortDirection);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data as any[]) || [];
    writeListCache(waybillsAdapter.cacheKey, rows);
    return filterWaybillsLocally(rows, query);
  },
};

function filterWaybillsLocally(rows: any[], query: LogisticsQueryState): any[] {
  let filtered = rows;

  if (query.statuses.length > 0 && !query.statuses.includes("All")) {
    filtered = filtered.filter((row) => query.statuses.includes(row.status || ""));
  }

  if (query.carrierId) {
    filtered = filtered.filter((row) => row.carrier_id === query.carrierId);
  }

  return filtered;
}

// --- Projects Adapter ---

const projectsAdapter: DocumentAdapter<ProjectQueryState, any> = {
  initialSortBy: "created_at",
  statusOptions: ["All", "Active", "Completed", "On Hold", "Cancelled"],
  cacheKey: "bd:list:projects:v1:all",
  cacheTtlMs: 5 * 60 * 1000,

  async fetcher(query) {
    const cached = readListCache<any>(projectsAdapter.cacheKey);
    if (cached && isListCacheFresh(cached, projectsAdapter.cacheTtlMs)) {
      return filterProjectLocally(cached.rows, query);
    }

    let q = supabase
      .from("projects")
      .select("id, name, client_name, status, created_at, budget, description")
      .is("archived_at", null);

    if (query.search.trim()) {
      const term = query.search.trim().replace(/,/g, " ");
      q = q.or(`name.ilike.%${term}%,client_name.ilike.%${term}%`);
    }

    q = applyDateFilter(q, query.dateRange);
    q = applySortOrder(q, query.sortBy, query.sortDirection);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data as any[]) || [];
    writeListCache(projectsAdapter.cacheKey, rows);
    return filterProjectLocally(rows, query);
  },
};

// --- CSR Adapter ---

const csrAdapter: DocumentAdapter<ProjectQueryState, any> = {
  initialSortBy: "created_at",
  statusOptions: ["All", "Draft", "Submitted", "Approved", "Rejected"],
  cacheKey: "bd:list:csr:v1:all",
  cacheTtlMs: 5 * 60 * 1000,

  async fetcher(query) {
    const cached = readListCache<any>(csrAdapter.cacheKey);
    if (cached && isListCacheFresh(cached, csrAdapter.cacheTtlMs)) {
      return filterProjectLocally(cached.rows, query);
    }

    let q = supabase
      .from("csr_reports")
      .select("id, report_number, client_name, created_at, status, project_id, title")
      .is("archived_at", null);

    if (query.search.trim()) {
      const term = query.search.trim().replace(/,/g, " ");
      q = q.or(`report_number.ilike.%${term}%,client_name.ilike.%${term}%,title.ilike.%${term}%`);
    }

    q = applyDateFilter(q, query.dateRange);
    q = applySortOrder(q, query.sortBy, query.sortDirection);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data as any[]) || [];
    writeListCache(csrAdapter.cacheKey, rows);
    return filterProjectLocally(rows, query);
  },
};

// --- RFQs Adapter ---

const rfqsAdapter: DocumentAdapter<ProjectQueryState, any> = {
  initialSortBy: "created_at",
  statusOptions: ["All", "Draft", "Sent", "Received", "Closed"],
  cacheKey: "bd:list:rfqs:v1:all",
  cacheTtlMs: 5 * 60 * 1000,

  async fetcher(query) {
    const cached = readListCache<any>(rfqsAdapter.cacheKey);
    if (cached && isListCacheFresh(cached, rfqsAdapter.cacheTtlMs)) {
      return filterProjectLocally(cached.rows, query);
    }

    let q = supabase
      .from("rfqs")
      .select("id, rfq_number, client_name, created_at, status, project_id, title")
      .is("archived_at", null);

    if (query.search.trim()) {
      const term = query.search.trim().replace(/,/g, " ");
      q = q.or(`rfq_number.ilike.%${term}%,client_name.ilike.%${term}%,title.ilike.%${term}%`);
    }

    q = applyDateFilter(q, query.dateRange);
    q = applySortOrder(q, query.sortBy, query.sortDirection);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data as any[]) || [];
    writeListCache(rfqsAdapter.cacheKey, rows);
    return filterProjectLocally(rows, query);
  },
};

// --- BOQs Adapter ---

const boqsAdapter: DocumentAdapter<ProjectQueryState, any> = {
  initialSortBy: "created_at",
  statusOptions: ["All", "Draft", "Submitted", "Approved", "Revised"],
  cacheKey: "bd:list:boqs:v1:all",
  cacheTtlMs: 5 * 60 * 1000,

  async fetcher(query) {
    const cached = readListCache<any>(boqsAdapter.cacheKey);
    if (cached && isListCacheFresh(cached, boqsAdapter.cacheTtlMs)) {
      return filterProjectLocally(cached.rows, query);
    }

    let q = supabase
      .from("boqs")
      .select("id, boq_number, client_name, created_at, status, project_id, title, total")
      .is("archived_at", null);

    if (query.search.trim()) {
      const term = query.search.trim().replace(/,/g, " ");
      q = q.or(`boq_number.ilike.%${term}%,client_name.ilike.%${term}%,title.ilike.%${term}%`);
    }

    q = applyDateFilter(q, query.dateRange);
    q = applySortOrder(q, query.sortBy, query.sortDirection);

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data as any[]) || [];
    writeListCache(boqsAdapter.cacheKey, rows);
    return filterProjectLocally(rows, query);
  },
};

// --- Shared Local Filters ---

function filterFinancialLocally(rows: any[], query: FinancialQueryState): any[] {
  let filtered = rows;

  if (query.statuses.length > 0 && !query.statuses.includes("All")) {
    filtered = filtered.filter((row) => query.statuses.includes(row.status || ""));
  }

  if (query.amountRange.min !== null) {
    filtered = filtered.filter((row) => Number(row.total || 0) >= query.amountRange.min!);
  }
  if (query.amountRange.max !== null) {
    filtered = filtered.filter((row) => Number(row.total || 0) <= query.amountRange.max!);
  }

  return filtered;
}

function filterProjectLocally(rows: any[], query: ProjectQueryState): any[] {
  let filtered = rows;

  if (query.statuses.length > 0 && !query.statuses.includes("All")) {
    filtered = filtered.filter((row) => query.statuses.includes(row.status || ""));
  }

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
