// ============================================================================
// FILTER TOOLBAR — Capability-driven inline filter system
// Renders based on FILTER_CAPABILITIES config. No module-specific conditionals.
// No modal, no backdrop, no Apply/Cancel global workflow.
// ============================================================================

import { useState } from "react";
import { Calendar, ChevronDown, DollarSign, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentQuery } from "@/context/DocumentQueryContext";
import { FILTER_CAPABILITIES, STATUS_FILTERS } from "@/config/filterCapabilities";
import type { ModuleScope } from "@/types/queryPlatform";

const SORT_OPTIONS = ["Newest", "Oldest", "Highest Value", "Lowest Value"];

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

  // Popover state — only one open at a time
  const [activePopover, setActivePopover] = useState<string | null>(null);

  // Amount range local draft (only place with local confirm)
  const [rangeMin, setRangeMin] = useState<string>("");
  const [rangeMax, setRangeMax] = useState<string>("");

  // Date range local draft
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  if (!open || !caps) return null;

  const currentStatuses = (state as any)?.statuses || [];

  const togglePopover = (id: string) => {
    // Sync local drafts when opening range/date panels
    if (id === "amountRange") {
      setRangeMin(String((state as any)?.amountRange?.min ?? ""));
      setRangeMax(String((state as any)?.amountRange?.max ?? ""));
    }
    if (id === "dateRange") {
      setDateFrom(state.dateRange.from || "");
      setDateTo(state.dateRange.to || "");
    }
    setActivePopover((prev) => (prev === id ? null : id));
  };

  const closePopover = () => setActivePopover(null);

  // ─── IMMEDIATE ACTIONS ───

  const toggleStatus = (status: string) => {
    const next = currentStatuses.includes(status)
      ? currentStatuses.filter((s: string) => s !== status)
      : [...currentStatuses, status];
    patchUpdate({ statuses: next } as any);
  };

  const clearStatuses = () => patchUpdate({ statuses: [] } as any);

  const applySort = (option: string) => {
    const direction = option === "Oldest" || option === "Lowest Value" ? "asc" : "desc";
    const sortBy = option.includes("Value") ? "total" : "created_at";
    patchUpdate({ sortBy, sortDirection: direction } as any);
    closePopover();
  };

  // ─── DATE RANGE (local draft → immediate on confirm) ───

  const applyDateRange = () => {
    patchUpdate({ dateRange: { from: dateFrom || null, to: dateTo || null } } as any);
    closePopover();
  };

  const clearDateRange = () => {
    setDateFrom("");
    setDateTo("");
    patchUpdate({ dateRange: { from: null, to: null } } as any);
    closePopover();
  };

  // ─── AMOUNT RANGE (local draft → confirm) ───

  const applyAmountRange = () => {
    const min = rangeMin ? Number(rangeMin) : null;
    const max = rangeMax ? Number(rangeMax) : null;
    patchUpdate({ amountRange: { min, max } } as any);
    closePopover();
  };

  const clearAmountRange = () => {
    setRangeMin("");
    setRangeMax("");
    patchUpdate({ amountRange: { min: null, max: null } } as any);
    closePopover();
  };

  // ─── DERIVED LABELS ───

  const sortLabel = (() => {
    if (state.sortBy === "total") return state.sortDirection === "asc" ? "Lowest Value" : "Highest Value";
    return state.sortDirection === "asc" ? "Oldest" : "Newest";
  })();

  const dateLabel = (() => {
    if (state.dateRange.from && state.dateRange.to) return `${state.dateRange.from} – ${state.dateRange.to}`;
    if (state.dateRange.from) return `From ${state.dateRange.from}`;
    if (state.dateRange.to) return `Until ${state.dateRange.to}`;
    return "Anytime";
  })();

  const amountLabel = (() => {
    const ar = (state as any)?.amountRange;
    if (!ar) return "Any";
    if (ar.min && ar.max) return `₦${ar.min} – ₦${ar.max}`;
    if (ar.min) return `Min ₦${ar.min}`;
    if (ar.max) return `Max ₦${ar.max}`;
    return "Any";
  })();

  const statusOptions = STATUS_FILTERS[module];

  return (
    <div className="relative border-b border-[hsl(var(--bd-border))]/30 bg-[hsl(var(--bd-surface))] px-4 py-3">
      {/* Chip row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status chip */}
        {caps.status && statusOptions && (
          <ChipTrigger
            label="Status"
            value={currentStatuses.length > 0 ? currentStatuses.join(", ") : "All"}
            active={currentStatuses.length > 0}
            isOpen={activePopover === "status"}
            onClick={() => togglePopover("status")}
          />
        )}

        {/* Date Range chip */}
        {caps.dateRange && (
          <ChipTrigger
            label="Date"
            value={dateLabel}
            active={!!(state.dateRange.from || state.dateRange.to)}
            isOpen={activePopover === "dateRange"}
            onClick={() => togglePopover("dateRange")}
            icon={<Calendar className="h-3 w-3" />}
          />
        )}

        {/* Amount Range chip */}
        {caps.amountRange && (
          <ChipTrigger
            label="Amount"
            value={amountLabel}
            active={!!(state as any)?.amountRange?.min || !!(state as any)?.amountRange?.max}
            isOpen={activePopover === "amountRange"}
            onClick={() => togglePopover("amountRange")}
            icon={<DollarSign className="h-3 w-3" />}
          />
        )}

        {/* Sort chip */}
        {caps.sort && (
          <ChipTrigger
            label="Sort"
            value={sortLabel}
            active={state.sortDirection === "asc" || state.sortBy !== "created_at"}
            isOpen={activePopover === "sort"}
            onClick={() => togglePopover("sort")}
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

      {/* ─── POPOVERS ─── */}

      {/* Status */}
      {activePopover === "status" && caps.status && statusOptions && (
        <PopoverPanel>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">Status</span>
            {currentStatuses.length > 0 && (
              <button type="button" onClick={clearStatuses} className="text-[9px] font-bold text-primary hover:underline">Clear</button>
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

      {/* Date Range */}
      {activePopover === "dateRange" && caps.dateRange && (
        <PopoverPanel>
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">Date Range</span>
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
              <button type="button" onClick={clearDateRange} className="flex-1 h-8 rounded-md border border-[hsl(var(--bd-border))] text-[10px] font-bold text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))]">Clear</button>
              <button type="button" onClick={applyDateRange} className="flex-1 h-8 rounded-md bg-primary text-[10px] font-bold text-primary-foreground hover:bg-primary/90">Apply</button>
            </div>
          </div>
        </PopoverPanel>
      )}

      {/* Amount Range */}
      {activePopover === "amountRange" && caps.amountRange && (
        <PopoverPanel>
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">Amount Range</span>
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
              <button type="button" onClick={clearAmountRange} className="flex-1 h-8 rounded-md border border-[hsl(var(--bd-border))] text-[10px] font-bold text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))]">Clear</button>
              <button type="button" onClick={applyAmountRange} className="flex-1 h-8 rounded-md bg-primary text-[10px] font-bold text-primary-foreground hover:bg-primary/90">Apply</button>
            </div>
          </div>
        </PopoverPanel>
      )}

      {/* Sort */}
      {activePopover === "sort" && caps.sort && (
        <PopoverPanel>
          <div className="flex flex-col gap-1">
            {SORT_OPTIONS.map((option) => {
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
                    isActive ? "bg-primary/10 text-primary" : "text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))]"
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

// ─── CHIP TRIGGER ───

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
      <span className="whitespace-nowrap">{label}: {value}</span>
      <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
    </button>
  );
}

// ─── POPOVER PANEL (anchored, inline) ───

function PopoverPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute left-4 right-4 top-full mt-1 z-50 rounded-xl border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] p-3 shadow-lg">
      {children}
    </div>
  );
}
