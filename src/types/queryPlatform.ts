// ============================================================================
// DOCUMENT QUERY PLATFORM — CORE TYPE LAYER
// Single polymorphic type system for all document module filtering
// ============================================================================

// --- Base Query State (shared by all modules) ---

export type BaseQueryState = {
  search: string;
  dateRange: { from: string | null; to: string | null };
  sortBy: string;
  sortDirection: "asc" | "desc";
  client: string | null;
};

// --- Module-Specific Variants (discriminated by `type`) ---

export type FinancialQueryState = BaseQueryState & {
  type: "financial";
  statuses: string[];
  amountRange: { min: number | null; max: number | null };
};

export type LogisticsQueryState = BaseQueryState & {
  type: "logistics";
  statuses: string[];
  carrierId: string | null;
};

export type ProjectQueryState = BaseQueryState & {
  type: "project";
  statuses: string[];
};

// --- Discriminated Union ---

export type DocumentQueryState =
  | FinancialQueryState
  | LogisticsQueryState
  | ProjectQueryState;

// --- Module Scope (all 7 document modules) ---

export type ModuleScope =
  | "invoices"
  | "quotations"
  | "waybills"
  | "projects"
  | "csr"
  | "rfqs"
  | "boqs"
  | "receipts";

// --- Compile-Time Module → QueryState Mapping ---

export type ModuleQueryMap = {
  invoices: FinancialQueryState;
  quotations: FinancialQueryState;
  waybills: LogisticsQueryState;
  projects: ProjectQueryState;
  csr: ProjectQueryState;
  rfqs: ProjectQueryState;
  boqs: ProjectQueryState;
  receipts: FinancialQueryState;
};

// --- Module → Type Discriminator Mapping ---

export type ModuleTypeMap = {
  invoices: "financial";
  quotations: "financial";
  waybills: "logistics";
  projects: "project";
  csr: "project";
  rfqs: "project";
  boqs: "project";
  receipts: "financial";
};

// --- Adapter Interface ---

import type { TenantClient } from "@/lib/tenantClient";

export interface AdapterFetchContext {
  tenantClient?: TenantClient | null;
}

export interface DocumentAdapter<T extends DocumentQueryState = DocumentQueryState, R = any> {
  fetcher: (query: T, ctx?: AdapterFetchContext) => Promise<R[]>;
  initialSortBy: string;
  statusOptions: string[];
  cacheKey: string;
  cacheTtlMs: number;
}

// --- Reducer Actions ---

export type QueryAction<T extends DocumentQueryState = DocumentQueryState> =
  | { type: "PATCH"; payload: Partial<T> }
  | { type: "RESET" }
  | { type: "SET_SEARCH"; payload: string }
  | { type: "SET_SORT"; payload: { sortBy: string; sortDirection: "asc" | "desc" } };

// --- Filter Chip Representation (for UI) ---

export type FilterChip = {
  category: string;
  label: string;
  value: string;
  onRemove: () => void;
};
