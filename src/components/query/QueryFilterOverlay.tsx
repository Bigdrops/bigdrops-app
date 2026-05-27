// ============================================================================
// FILTER TOOLBAR — Capability-driven inline filter system
// Renders based on FILTER_CAPABILITIES config. No module-specific conditionals.
// Chip composition is fully segregated per filter dimension:
//   • DateRangeFilter   → temporal only (date_from / date_to)
//   • AmountRangeFilter → financial only (min_amount / max_amount), gated by caps.amountRange
//   • ClientFilter      → identity only, gated by caps.client
//   • SortMatrix        → dual-axis (Time + Value), capability-driven
//   • Status            → enumerated, capability-driven
// No modal, no backdrop, no Apply/Cancel global workflow.
// ============================================================================

import { useRef, useState } from "react";
import { Calendar, ChevronDown, DollarSign, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentQuery } from "@/context/DocumentQueryContext";
import { FILTER_CAPABILITIES, STATUS_FILTERS } from "@/config/filterCapabilities";
import { feedback } from "@/lib/feedback";
import type { ModuleScope } from "@/types/queryPlatform";

// ─── CURRENCY FORMATTING HELPERS ─────────────────────────────────────────

function formatWithCommas(value: string): string {
  const cleaned = value.replace(/[^0-9]/g, "");
  if (!cleaned) return "";
  return Number(cleaned).toLocaleString("en-NG");
}

function stripCommas(value: string): string {
  return value.replace(/,/g, "");
}

// ─── POPOVER KEY DOMAIN — one open at a time ─────────────────────────────

type PopoverKey = "status" | "dateRange" | "amountRange" | "client" | "sort";

interface QueryFilterOverlayProps {
  open: boolean;
  onClose: () => void;
  module: ModuleScope;
}

export default function QueryFilterOverlay({
  open,
  onClose,
  module,
}: QueryFilterOverlayProps) {
  const { state, patchUpdate } = useDocumentQuery();
  const caps = FILTER_CAPABILITIES[module];

  const [activePopover, setActivePopover] = useState<PopoverKey | null>(null);
  const closePopover = () => setActivePopover(null);

  if (!open || !caps) return null;

  const statusOptions = STATUS_FILTERS[module];
  const currentStatuses: string[] = (state as any)?.statuses || [];

  // ─── STATUS (enumerated, immediate) ────────────────────────────────────

  const toggleStatus = (status: string) => {
    const next = currentStatuses.includes(status)
      ? currentStatuses.filter((s: string) => s !== status)
      : [...currentStatuses, status];
    patchUpdate({ statuses: next } as any);
  };
  const clearStatuses = () => patchUpdate({ statuses: [] } as any);

  return (
    <div className="relative border-b border-[hsl(var(--bd-border))]/30 bg-[hsl(var(--bd-surface))] px-4 py-3">
      {/* Chip row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status — enumerated, inline */}
        {caps.status && statusOptions && (
          <ChipTrigger
            label="Status"
            value={currentStatuses.length > 0 ? currentStatuses.join(", ") : "All"}
            active={currentStatuses.length > 0}
            isOpen={activePopover === "status"}
            onClick={() =>
              setActivePopover((prev) => (prev === "status" ? null : "status"))
            }
          />
        )}

        {/* Date Range — TEMPORAL ONLY */}
        {caps.dateRange && (
          <DateRangeFilter
            isOpen={activePopover === "dateRange"}
            onToggle={() =>
              setActivePopover((prev) => (prev === "dateRange" ? null : "dateRange"))
            }
            onClose={closePopover}
          />
        )}

        {/* Amount Range — FINANCIAL ONLY (gated by capability) */}
        {caps.amountRange && (
          <AmountRangeFilter
            isOpen={activePopover === "amountRange"}
            onToggle={() =>
              setActivePopover((prev) =>
                prev === "amountRange" ? null : "amountRange"
              )
            }
            onClose={closePopover}
          />
        )}

        {/* Client — IDENTITY ONLY */}
        {caps.client && (
          <ClientFilter
            isOpen={activePopover === "client"}
            onToggle={() =>
              setActivePopover((prev) => (prev === "client" ? null : "client"))
            }
            onClose={closePopover}
          />
        )}

        {/* Close toolbar */}
        <button
          type="button"
          onClick={onClose}
          className="ml-auto flex-shrink-0 p-1.5 rounded-lg text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))] transition-colors"
          aria-label="Close filters"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ─── INLINE POPOVERS ─── */}

      {/* Status */}
      {activePopover === "status" && caps.status && statusOptions && (
        <PopoverPanel>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">
              Status
            </span>
            {currentStatuses.length > 0 && (
              <button
                type="button"
                onClick={clearStatuses}
                className="text-[9px] font-bold text-primary hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {statusOptions.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => toggleStatus(status)}
                className={cn(
                  "h-7 px-2.5 rounded-md border text-[10px] font-bold transition-all",
                  currentStatuses.includes(status)
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface))]"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </PopoverPanel>
      )}

      {/* Sort — Dual-Axis Matrix (now merged into Date/Amount chips) */}
    </div>
  );
}

// ============================================================================
// CHIP A — DateRangeFilter (TEMPORAL ONLY)
// Binds exclusively to state.dateRange.{from,to}.
// ============================================================================

interface FilterChipProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

function DateRangeFilter({ isOpen, onToggle, onClose }: FilterChipProps) {
  const { state, patchUpdate } = useDocumentQuery();
  const [dateFrom, setDateFrom] = useState<string>(state.dateRange.from || "");
  const [dateTo, setDateTo] = useState<string>(state.dateRange.to || "");
  const [hasError, setHasError] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const handleToggle = () => {
    if (!isOpen) {
      setDateFrom(state.dateRange.from || "");
      setDateTo(state.dateRange.to || "");
      setHasError(false);
      // Show custom inputs if a date range is already active
      setShowCustom(!!(state.dateRange.from || state.dateRange.to));
    }
    onToggle();
  };

  const applyTimeSort = (direction: "desc" | "asc") => {
    patchUpdate({ sortBy: "created_at", sortDirection: direction } as any);
    onClose();
  };

  const apply = () => {
    // Boundary validation: from must not exceed to
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setHasError(true);
      feedback.error("Minimum boundary cannot exceed Maximum boundary");
      return;
    }
    setHasError(false);
    patchUpdate({
      dateRange: { from: dateFrom || null, to: dateTo || null },
    } as any);
    onClose();
  };

  const clear = () => {
    setDateFrom("");
    setDateTo("");
    setHasError(false);
    patchUpdate({ dateRange: { from: null, to: null } } as any);
    onClose();
  };

  const label = (() => {
    if (state.dateRange.from && state.dateRange.to)
      return `${state.dateRange.from} – ${state.dateRange.to}`;
    if (state.dateRange.from) return `From ${state.dateRange.from}`;
    if (state.dateRange.to) return `Until ${state.dateRange.to}`;
    return "Anytime";
  })();

  const isInvalid = hasError || (dateFrom && dateTo && dateFrom > dateTo);

  return (
    <>
      <ChipTrigger
        label="Date"
        value={label}
        active={!!(state.dateRange.from || state.dateRange.to)}
        isOpen={isOpen}
        onClick={handleToggle}
        icon={<Calendar className="h-3 w-3" />}
      />
      {isOpen && (
        <PopoverPanel>
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">
              Time
            </span>
            {/* 3-option quick menu */}
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => applyTimeSort("desc")}
                className={cn(
                  "h-8 px-3 rounded-md text-left text-[11px] font-bold transition-all",
                  state.sortBy === "created_at" && state.sortDirection === "desc"
                    ? "bg-primary/10 text-primary"
                    : "text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))]"
                )}
              >
                Newest
              </button>
              <button
                type="button"
                onClick={() => applyTimeSort("asc")}
                className={cn(
                  "h-8 px-3 rounded-md text-left text-[11px] font-bold transition-all",
                  state.sortBy === "created_at" && state.sortDirection === "asc"
                    ? "bg-primary/10 text-primary"
                    : "text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))]"
                )}
              >
                Oldest
              </button>
              <button
                type="button"
                onClick={() => setShowCustom(true)}
                className={cn(
                  "h-8 px-3 rounded-md text-left text-[11px] font-bold transition-all",
                  showCustom
                    ? "bg-primary/10 text-primary"
                    : "text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))]"
                )}
              >
                Custom Range
              </button>
            </div>

            {/* Custom date inputs — revealed on "Custom" */}
            {showCustom && (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-bold text-[hsl(var(--bd-text-muted))]">Start</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => { setDateFrom(e.target.value); setHasError(false); }}
                      className={cn(
                        "w-full h-9 px-2.5 rounded-md border bg-[hsl(var(--bd-surface-muted))] text-sm text-[hsl(var(--bd-text))] outline-none focus:border-primary",
                        isInvalid ? "border-red-400" : "border-[hsl(var(--bd-border))]"
                      )}
                    />
                  </div>
                  <span className="text-[hsl(var(--bd-text-muted))] text-xs mt-4">–</span>
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-bold text-[hsl(var(--bd-text-muted))]">End</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => { setDateTo(e.target.value); setHasError(false); }}
                      className={cn(
                        "w-full h-9 px-2.5 rounded-md border bg-[hsl(var(--bd-surface-muted))] text-sm text-[hsl(var(--bd-text))] outline-none focus:border-primary",
                        isInvalid ? "border-red-400" : "border-[hsl(var(--bd-border))]"
                      )}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={clear}
                    className="flex-1 h-8 rounded-md border border-[hsl(var(--bd-border))] text-[10px] font-bold text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))]"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={apply}
                    disabled={!!isInvalid}
                    className={cn(
                      "flex-1 h-8 rounded-md text-[10px] font-bold text-primary-foreground",
                      isInvalid
                        ? "bg-primary/40 cursor-not-allowed"
                        : "bg-primary hover:bg-primary/90"
                    )}
                  >
                    Apply
                  </button>
                </div>
              </>
            )}
          </div>
        </PopoverPanel>
      )}
    </>
  );
}

// ============================================================================
// CHIP B — AmountRangeFilter (FINANCIAL ONLY)
// Dual-state controlled input: display commas, dispatch raw numeric.
// Boundary validation: min > max → red border + toast + disabled Apply.
// Mobile viewport: bounded width, responsive positioning.
// ============================================================================

function AmountRangeFilter({ isOpen, onToggle, onClose }: FilterChipProps) {
  const { state, patchUpdate } = useDocumentQuery();
  const [displayMin, setDisplayMin] = useState<string>("");
  const [displayMax, setDisplayMax] = useState<string>("");
  const [hasError, setHasError] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);

  const handleToggle = () => {
    if (!isOpen) {
      const min = (state as any)?.amountRange?.min;
      const max = (state as any)?.amountRange?.max;
      setDisplayMin(min != null ? formatWithCommas(String(min)) : "");
      setDisplayMax(max != null ? formatWithCommas(String(max)) : "");
      setHasError(false);
      // Show custom if amount range is already active
      setShowCustom(min != null || max != null);
    }
    onToggle();
  };

  const applyValueSort = (direction: "desc" | "asc") => {
    patchUpdate({ sortBy: "total", sortDirection: direction } as any);
    onClose();
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayMin(formatWithCommas(raw));
    setHasError(false);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayMax(formatWithCommas(raw));
    setHasError(false);
  };

  const getRawMin = (): number | null => {
    const stripped = stripCommas(displayMin);
    return stripped ? Number(stripped) : null;
  };

  const getRawMax = (): number | null => {
    const stripped = stripCommas(displayMax);
    return stripped ? Number(stripped) : null;
  };

  const isInvalid = (() => {
    const min = getRawMin();
    const max = getRawMax();
    if (min !== null && max !== null && min > max) return true;
    return hasError;
  })();

  const apply = () => {
    const min = getRawMin();
    const max = getRawMax();

    if (min !== null && max !== null && min > max) {
      setHasError(true);
      feedback.error("Minimum boundary cannot exceed Maximum boundary");
      return;
    }

    setHasError(false);
    // Open-ended: null max means unlimited (>= min)
    patchUpdate({ amountRange: { min, max } } as any);
    onClose();
  };

  const clear = () => {
    setDisplayMin("");
    setDisplayMax("");
    setHasError(false);
    patchUpdate({ amountRange: { min: null, max: null } } as any);
    onClose();
  };

  const label = (() => {
    const ar = (state as any)?.amountRange;
    if (!ar) return "Any";
    if (ar.min != null && ar.max != null) return `₦${Number(ar.min).toLocaleString()} – ₦${Number(ar.max).toLocaleString()}`;
    if (ar.min != null) return `Min ₦${Number(ar.min).toLocaleString()}`;
    if (ar.max != null) return `Max ₦${Number(ar.max).toLocaleString()}`;
    return "Any";
  })();

  const isActive =
    !!(state as any)?.amountRange?.min || !!(state as any)?.amountRange?.max;

  return (
    <>
      <ChipTrigger
        label="Amount"
        value={label}
        active={isActive}
        isOpen={isOpen}
        onClick={handleToggle}
        icon={<DollarSign className="h-3 w-3" />}
      />
      {isOpen && (
        <AmountPopoverPanel>
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">
              Value
            </span>
            {/* 3-option quick menu */}
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => applyValueSort("desc")}
                className={cn(
                  "h-8 px-3 rounded-md text-left text-[11px] font-bold transition-all",
                  state.sortBy === "total" && state.sortDirection === "desc"
                    ? "bg-primary/10 text-primary"
                    : "text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))]"
                )}
              >
                Highest Value
              </button>
              <button
                type="button"
                onClick={() => applyValueSort("asc")}
                className={cn(
                  "h-8 px-3 rounded-md text-left text-[11px] font-bold transition-all",
                  state.sortBy === "total" && state.sortDirection === "asc"
                    ? "bg-primary/10 text-primary"
                    : "text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))]"
                )}
              >
                Lowest Value
              </button>
              <button
                type="button"
                onClick={() => setShowCustom(true)}
                className={cn(
                  "h-8 px-3 rounded-md text-left text-[11px] font-bold transition-all",
                  showCustom
                    ? "bg-primary/10 text-primary"
                    : "text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))]"
                )}
              >
                Custom Range
              </button>
            </div>

            {/* Custom amount inputs — revealed on "Custom" */}
            {showCustom && (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-bold text-[hsl(var(--bd-text-muted))]">Min</label>
                    <input
                      ref={minRef}
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={displayMin}
                      onChange={handleMinChange}
                      className={cn(
                        "w-full h-9 px-2.5 rounded-md border bg-[hsl(var(--bd-surface-muted))] text-sm text-[hsl(var(--bd-text))] outline-none focus:border-primary",
                        isInvalid ? "border-red-400" : "border-[hsl(var(--bd-border))]"
                      )}
                    />
                  </div>
                  <span className="text-[hsl(var(--bd-text-muted))] text-xs mt-4">–</span>
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-bold text-[hsl(var(--bd-text-muted))]">Max</label>
                    <input
                      ref={maxRef}
                      type="text"
                      inputMode="numeric"
                      placeholder="Unlimited"
                      value={displayMax}
                      onChange={handleMaxChange}
                      className={cn(
                        "w-full h-9 px-2.5 rounded-md border bg-[hsl(var(--bd-surface-muted))] text-sm text-[hsl(var(--bd-text))] outline-none focus:border-primary",
                        isInvalid ? "border-red-400" : "border-[hsl(var(--bd-border))]"
                      )}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={clear}
                    className="flex-1 h-8 rounded-md border border-[hsl(var(--bd-border))] text-[10px] font-bold text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))]"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={apply}
                    disabled={!!isInvalid}
                    className={cn(
                      "flex-1 h-8 rounded-md text-[10px] font-bold text-primary-foreground",
                      isInvalid
                        ? "bg-primary/40 cursor-not-allowed"
                        : "bg-primary hover:bg-primary/90"
                    )}
                  >
                    Apply
                  </button>
                </div>
              </>
            )}
          </div>
        </AmountPopoverPanel>
      )}
    </>
  );
}

// ============================================================================
// CHIP C — ClientFilter (IDENTITY ONLY)
// Binds exclusively to state.client.
// ============================================================================

function ClientFilter({ isOpen, onToggle, onClose }: FilterChipProps) {
  const { state, patchUpdate, results } = useDocumentQuery();
  const currentClient: string = state.client || "";
  const [draft, setDraft] = useState<string>(currentClient);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Derive unique client names from current results
  const uniqueClients = (() => {
    const names = new Set<string>();
    for (const row of results) {
      const name = (row as any)?.client_name || (row as any)?.vendor_name;
      if (name && typeof name === "string" && name.trim()) {
        names.add(name.trim());
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  })();

  // Filter suggestions based on draft input (max 3)
  const suggestions = (() => {
    if (!draft.trim()) {
      return uniqueClients.slice(0, 3);
    }
    const lower = draft.toLowerCase();
    return uniqueClients
      .filter((name) => name.toLowerCase().includes(lower))
      .slice(0, 3);
  })();

  const handleToggle = () => {
    if (!isOpen) {
      setDraft(state.client || "");
      setShowSuggestions(false);
    }
    onToggle();
  };

  const selectClient = (name: string) => {
    setDraft(name);
    setShowSuggestions(false);
    patchUpdate({ client: name } as any);
    onClose();
  };

  const apply = () => {
    patchUpdate({ client: draft.trim() || null } as any);
    onClose();
  };

  const clear = () => {
    setDraft("");
    setShowSuggestions(false);
    patchUpdate({ client: null } as any);
    onClose();
  };

  const label = currentClient ? currentClient : "All";

  return (
    <>
      <ChipTrigger
        label="Client"
        value={label}
        active={!!currentClient}
        isOpen={isOpen}
        onClick={handleToggle}
        icon={<User className="h-3 w-3" />}
      />
      {isOpen && (
        <PopoverPanel>
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">
              Client
            </span>
            <div className="relative">
              <input
                type="text"
                placeholder="Filter by client name"
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { setShowSuggestions(false); apply(); }
                }}
                className="w-full h-9 px-2.5 rounded-md border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-sm text-[hsl(var(--bd-text))] outline-none focus:border-primary"
              />
              {/* Inline autocomplete suggestions (max 3) */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="mt-1 rounded-lg border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] shadow-sm overflow-hidden">
                  {suggestions.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => selectClient(name)}
                      className="w-full px-3 py-2 text-left text-[11px] font-bold text-[hsl(var(--bd-text))] hover:bg-[hsl(var(--bd-surface-muted))] transition-colors truncate"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clear}
                className="flex-1 h-8 rounded-md border border-[hsl(var(--bd-border))] text-[10px] font-bold text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={apply}
                className="flex-1 h-8 rounded-md bg-primary text-[10px] font-bold text-primary-foreground hover:bg-primary/90"
              >
                Apply
              </button>
            </div>
          </div>
        </PopoverPanel>
      )}
    </>
  );
}

// ─── CHIP TRIGGER ────────────────────────────────────────────────────────

function ChipTrigger({
  label,
  value,
  active,
  isOpen,
  onClick,
  icon,
}: {
  label: string;
  value: string;
  active: boolean;
  isOpen: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 h-7 pl-2.5 pr-2 rounded-md border text-[10px] font-bold transition-all",
        active || isOpen
          ? "border-primary/30 bg-primary/5 text-primary"
          : "border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface))]"
      )}
    >
      {icon}
      <span className="whitespace-nowrap">
        {label}: {value}
      </span>
      <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
    </button>
  );
}

// ─── POPOVER PANEL (anchored, inline) ────────────────────────────────────

function PopoverPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute left-4 right-4 top-full mt-1 z-50 rounded-xl border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] p-3 shadow-lg">
      {children}
    </div>
  );
}

// ─── AMOUNT POPOVER PANEL (mobile-safe, bounded viewport) ────────────────

function AmountPopoverPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute right-0 origin-top-right md:left-0 md:right-auto top-full mt-1 z-50 w-[92vw] sm:w-80 rounded-xl border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] p-3 shadow-lg">
      {children}
    </div>
  );
}
