// ============================================================================
// FILTER CAPABILITY SYSTEM — Single source of truth for filter UI composition
// Controls which filter sections render per module.
// No module-specific conditionals allowed in UI components.
// ============================================================================

export type FilterCapabilityKey =
  | "status"
  | "dateRange"
  | "amountRange"
  | "client"
  | "sort";

export type ModuleFilterCapabilities = Record<FilterCapabilityKey, boolean>;

export const FILTER_CAPABILITIES: Record<string, ModuleFilterCapabilities> = {
  invoices: {
    status: true,
    dateRange: true,
    amountRange: true,
    client: true,
    sort: true,
  },
  quotations: {
    status: true,
    dateRange: true,
    amountRange: false,
    client: true,
    sort: true,
  },
  projects: {
    status: true,
    dateRange: true,
    amountRange: false,
    client: true,
    sort: true,
  },
  csr: {
    status: false,
    dateRange: true,
    amountRange: false,
    client: true,
    sort: true,
  },
  rfqs: {
    status: false,
    dateRange: true,
    amountRange: false,
    client: false,
    sort: true,
  },
  boqs: {
    status: false,
    dateRange: true,
    amountRange: false,
    client: false,
    sort: true,
  },
  waybills: {
    status: false,
    dateRange: true,
    amountRange: false,
    client: true,
    sort: true,
  },
};

// ─── STATUS OPTIONS PER MODULE (UI-only, not business logic) ───
export const STATUS_FILTERS: Partial<Record<string, string[]>> = {
  invoices: ["UNPAID", "PARTIALLY PAID", "PAID"],
  quotations: ["OPEN", "CONVERTED"],
  projects: ["ACTIVE", "COMPLETED", "ON HOLD", "CANCELLED"],
};
