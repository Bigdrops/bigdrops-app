// ============================================================================
// FILTER TOOLBAR — Capability-driven inline filter system
// Renders based on FILTER_CAPABILITIES config. No module-specific conditionals.
// Chip composition is fully segregated per filter dimension:
//   • DateRangeFilter   → temporal only (date_from / date_to)
//   • AmountRangeFilter → financial only (min_amount / max_amount), gated by caps.amountRange
//   • ClientFilter      → identity only, gated by caps.client
//   • Status / Sort     → enumerated, capability-driven
// No modal, no backdrop, no Apply/Cancel global workflow.
// ============================================================================

import { useState } from "react";
import { Calendar, ChevronDown, DollarSign, SlidersHorizontal, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentQuery } from "@/context/DocumentQueryContext";
import { FILTER_CAPABILITIES, STATUS_FILTERS, type ModuleFilterCapabilities } from "@/config/filterCapabilities";
import type { ModuleScope } from "@/types/queryPlatform";

// ─── SORT OPTIONS — derived strictly from capabilities ───────────────────
// Non-financial modules MUST NOT receive value-based sort options.

type SortOption = "Newest" | "Oldest" | "Highest Value" | "Lowest Value";

function buildSortOptions(caps: ModuleFilterCapabilities): SortOption[] {
  const base: SortOption[] = ["Newest", "Oldest"];
  if (caps.amountRange) {
    base.push("Highest Value", "Lowest Value");
  }
  return base;
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

  const sortOptions = buildSortOptions(caps);
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

  // ─── SORT (enumerated, capability-driven) ──────────────────────────────

  const applySort = (option: SortOption) => {
    const direction = option === "Oldest" || option === "Lowest Value" ? "asc" : "desc";
    const sortBy = option.includes("Value") ? "total" : "created_at";
    patchUpdate({ sortBy, sortDirection: direction } as any);
    closePopover();
  };

  const sortLabel: SortOption = (() => {
    if (caps.amountRange && state.sortBy === "total") {
      return state.sortDirection === "asc" ? "Lowest Value" : "Highest Value";
    }
    return state.sortDirection === "asc" ? "Oldest" : "Newest";
  })();

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

        {/* Sort — capability-driven option set */}
        {caps.sort && (
          <ChipTrigger
            label="Sort"
            value={sortLabel}
            active={state.sortDirection === "asc" || state.sortBy !== "created_at"}
            isOpen={activePopover === "sort"}
            onClick={() =>
              setActivePopover((prev) => (prev === "sort" ? null : "sort"))
            }
            icon={<SlidersHorizontal className="h-3 w-3" />}
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

      {/* ─── INLINE POPOVERS — Status & Sort (enumerated) ─── */}

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

      {activePopover === "sort" && caps.sort && (
        <PopoverPanel>
          <div className="flex flex-col gap-1">
            {sortOptions.map((option) => {
              const isActive =
                (option === "Newest" && state.sortBy === "created_at" && state.sortDirection === "desc") ||
                (option === "Oldest" && state.sortBy === "created_at" && state.sortDirection === "asc") ||
                (option === "Highest Value" && state.sortBy === "total" && state.sortDirection === "desc") ||
                (option === "Lowest Value" && state.sortBy === "total" && state.sortDirection === "asc");
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => applySort(option)}
                  className={cn(
                    "h-8 px-3 rounded-md text-left text-[11px] font-bold transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))]"
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </PopoverPanel>
      )}
    </div>
  );
}

// ============================================================================
// CHIP A — DateRangeFilter (TEMPORAL ONLY)
// Binds exclusively to state.dateRange.{from,to}.
// Never reads or writes amount, client, or status fields.
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

  // Sync local drafts on open
  const handleToggle = () => {
    if (!isOpen) {
      setDateFrom(state.dateRange.from || "");
      setDateTo(state.dateRange.to || "");
    }
    onToggle();
  };

  const apply = () => {
    patchUpdate({
      dateRange: { from: dateFrom || null, to: dateTo || null },
    } as any);
    onClose();
  };

  const clear = () => {
    setDateFrom("");
    setDateTo("");
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
              Date Range
            </span>
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-1">
                <label className="text-[9px] font-bold text-[hsl(var(--bd-text-muted))]">Start</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-md border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-sm text-[hsl(var(--bd-text))] outline-none focus:border-primary"
                />
              </div>
              <span className="text-[hsl(var(--bd-text-muted))] text-xs mt-4">–</span>
              <div className="flex-1 space-y-1">
                <label className="text-[9px] font-bold text-[hsl(var(--bd-text-muted))]">End</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-md border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-sm text-[hsl(var(--bd-text))] outline-none focus:border-primary"
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

// ============================================================================
// CHIP B — AmountRangeFilter (FINANCIAL ONLY)
// Binds exclusively to state.amountRange.{min,max}.
// Caller MUST guard with caps.amountRange — this component does not self-gate.
// ============================================================================

function AmountRangeFilter({ isOpen, onToggle, onClose }: FilterChipProps) {
  const { state, patchUpdate } = useDocumentQuery();
  const initialMin = String((state as any)?.amountRange?.min ?? "");
  const initialMax = String((state as any)?.amountRange?.max ?? "");
  const [rangeMin, setRangeMin] = useState<string>(initialMin);
  const [rangeMax, setRangeMax] = useState<string>(initialMax);

  const handleToggle = () => {
    if (!isOpen) {
      setRangeMin(String((state as any)?.amountRange?.min ?? ""));
      setRangeMax(String((state as any)?.amountRange?.max ?? ""));
    }
    onToggle();
  };

  const apply = () => {
    const min = rangeMin ? Number(rangeMin) : null;
    const max = rangeMax ? Number(rangeMax) : null;
    patchUpdate({ amountRange: { min, max } } as any);
    onClose();
  };

  const clear = () => {
    setRangeMin("");
    setRangeMax("");
    patchUpdate({ amountRange: { min: null, max: null } } as any);
    onClose();
  };

  const label = (() => {
    const ar = (state as any)?.amountRange;
    if (!ar) return "Any";
    if (ar.min && ar.max) return `₦${ar.min} – ₦${ar.max}`;
    if (ar.min) return `Min ₦${ar.min}`;
    if (ar.max) return `Max ₦${ar.max}`;
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
        <PopoverPanel>
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">
              Amount Range
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={rangeMin}
                onChange={(e) => setRangeMin(e.target.value)}
                className="flex-1 h-9 px-2.5 rounded-md border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-sm text-[hsl(var(--bd-text))] outline-none focus:border-primary"
              />
              <span className="text-[hsl(var(--bd-text-muted))] text-xs">–</span>
              <input
                type="number"
                placeholder="Max"
                value={rangeMax}
                onChange={(e) => setRangeMax(e.target.value)}
                className="flex-1 h-9 px-2.5 rounded-md border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-sm text-[hsl(var(--bd-text))] outline-none focus:border-primary"
              />
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

// ============================================================================
// CHIP C — ClientFilter (IDENTITY ONLY)
// Binds exclusively to state.client (existing query context, written via patch).
// Caller MUST guard with caps.client — this component does not self-gate.
// ============================================================================

function ClientFilter({ isOpen, onToggle, onClose }: FilterChipProps) {
  const { state, patchUpdate } = useDocumentQuery();
  const currentClient: string = (state as any)?.client || "";
  const [draft, setDraft] = useState<string>(currentClient);

  const handleToggle = () => {
    if (!isOpen) {
      setDraft((state as any)?.client || "");
    }
    onToggle();
  };

  const apply = () => {
    patchUpdate({ client: draft.trim() || null } as any);
    onClose();
  };

  const clear = () => {
    setDraft("");
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
            <input
              type="text"
              placeholder="Filter by client name"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") apply();
              }}
              className="w-full h-9 px-2.5 rounded-md border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-sm text-[hsl(var(--bd-text))] outline-none focus:border-primary"
            />
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
