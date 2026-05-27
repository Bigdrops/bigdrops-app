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

  async fetcher(query) {
    // Check cache first
    const cached = readListCache<any>(invoicesAdapter.cacheKey);
    if (cached && isListCacheFresh(cached, invoicesAdapter.cacheTtlMs)) {
      return filterInvoicesLocally(cached.rows, query);
    }

    let q = supabase
      .from("invoices")
      .select("id, invoice_number, client_name, issue_date, due_date, created_at, total, status, project_id, custom_fields, payments(cash_amount, wht_amount, amount, voided_at)")
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

  async fetcher(query) {
    const cached = readListCache<any>(quotationsAdapter.cacheKey);
    if (cached && isListCacheFresh(cached, quotationsAdapter.cacheTtlMs)) {
      return filterFinancialLocally(cached.rows, query);
    }

    let q = supabase
      .from("quotations")
      .select("id, quotation_number, client_name, issue_date, valid_until, created_at, total, status, project_id")
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
  statusOptions: [],
  cacheKey: "bd:list:waybills:v1:all",
  cacheTtlMs: 5 * 60 * 1000,

  async fetcher(query) {
    const cached = readListCache<any>(waybillsAdapter.cacheKey);
    if (cached && isListCacheFresh(cached, waybillsAdapter.cacheTtlMs)) {
      return filterWaybillsLocally(cached.rows, query);
    }

    let q = supabase
      .from("waybills")
      .select("id, waybill_number, type, client_name, date, created_at, status, project_id, invoice_id, vehicle_plate, delivery_location")
      .is("archived_at", null);

    if (query.search.trim()) {
      const term = query.search.trim().replace(/,/g, " ");
      q = q.or(`waybill_number.ilike.%${term}%,client_name.ilike.%${term}%`);
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

  async fetcher(query) {
    const cached = readListCache<any>(projectsAdapter.cacheKey);
    if (cached && isListCacheFresh(cached, projectsAdapter.cacheTtlMs)) {
      return filterProjectLocally(cached.rows, query);
    }

    let q = supabase
      .from("projects")
      .select("id, name, project_code, client_name, status, project_value, start_date, created_at")
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
  statusOptions: [],
  cacheKey: "bd:list:csr:v1:all",
  cacheTtlMs: 5 * 60 * 1000,

  async fetcher(query) {
    const cached = readListCache<any>(csrAdapter.cacheKey);
    if (cached && isListCacheFresh(cached, csrAdapter.cacheTtlMs)) {
      return filterProjectLocally(cached.rows, query);
    }

    let q = supabase
      .from("csrs")
      .select("id, csr_number, client_name, equipment_type, make, date, created_at, status, linked_invoice_id, project_id")
      .is("archived_at", null);

    if (query.search.trim()) {
      const term = query.search.trim().replace(/,/g, " ");
      q = q.or(`csr_number.ilike.%${term}%,client_name.ilike.%${term}%,equipment_type.ilike.%${term}%`);
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
  statusOptions: [],
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
  statusOptions: [],
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
