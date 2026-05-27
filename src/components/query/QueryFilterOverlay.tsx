// ============================================================================
// QUERY FILTER TOOLBAR — Inline step-down filter system
// Renders beneath search bar, pushes list downward. No modal, no backdrop.
// Filters apply immediately on selection. No Apply/Cancel workflow.
// ============================================================================

import { useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentQuery } from "@/context/DocumentQueryContext";
import type { ModuleScope } from "@/types/queryPlatform";

// ─── LOCAL UI CONTRACT: Safe static filter options per module ───
const STATUS_FILTERS: Partial<Record<ModuleScope, string[]>> = {
  invoices: ["UNPAID", "PARTIALLY PAID", "PAID"],
  quotations: ["OPEN", "CONVERTED"],
  projects: ["ACTIVE", "COMPLETED", "ON HOLD", "CANCELLED"],
};

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
  const statusOptions = STATUS_FILTERS[module];

  // Popover state — only one open at a time
  const [activePopover, setActivePopover] = useState<string | null>(null);

  // Advanced range panel (local draft — only place Apply exists)
  const [rangeMin, setRangeMin] = useState<string>("");
  const [rangeMax, setRangeMax] = useState<string>("");

  if (!open) return null;

  const currentStatuses = (state as any)?.statuses || [];
  const sortLabel = state.sortDirection === "asc" ? "Oldest" : "Newest";

  const togglePopover = (id: string) => {
    setActivePopover((prev) => (prev === id ? null : id));
  };

  const closePopover = () => setActivePopover(null);

  // Immediate status toggle
  const toggleStatus = (status: string) => {
    const next = currentStatuses.includes(status)
      ? currentStatuses.filter((s: string) => s !== status)
      : [...currentStatuses, status];
    patchUpdate({ statuses: next } as any);
  };

  const clearStatuses = () => {
    patchUpdate({ statuses: [] } as any);
  };

  // Immediate sort change
  const applySort = (option: string) => {
    const direction = option === "Oldest" ? "asc" : "desc";
    const sortBy = option.includes("Value") ? "total" : "created_at";
    patchUpdate({ sortBy, sortDirection: direction } as any);
    closePopover();
  };

  // Range panel apply (local confirmation only)
  const applyRange = () => {
    const min = rangeMin ? Number(rangeMin) : null;
    const max = rangeMax ? Number(rangeMax) : null;
    patchUpdate({ amountRange: { min, max } } as any);
    closePopover();
  };

  const clearRange = () => {
    setRangeMin("");
    setRangeMax("");
    patchUpdate({ amountRange: { min: null, max: null } } as any);
    closePopover();
  };

  return (
    <div className="relative border-b border-[hsl(var(--bd-border))]/30 bg-[hsl(var(--bd-surface))] px-4 py-3">
      {/* Chip row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status chip */}
        {statusOptions && statusOptions.length > 0 && (
          <FilterChipTrigger
            label="Status"
            value={currentStatuses.length > 0 ? currentStatuses.join(", ") : "All"}
            active={currentStatuses.length > 0}
            isOpen={activePopover === "status"}
            onClick={() => togglePopover("status")}
          />
        )}

        {/* Sort chip */}
        <FilterChipTrigger
          label="Sort"
          value={sortLabel}
          active={state.sortDirection === "asc" || state.sortBy !== "created_at"}
          isOpen={activePopover === "sort"}
          onClick={() => togglePopover("sort")}
        />

        {/* Amount range chip (financial only) */}
        {state.type === "financial" && (
          <FilterChipTrigger
            label="Value"
            value={
              (state as any).amountRange?.min || (state as any).amountRange?.max
                ? "Custom"
                : "Any"
            }
            active={!!(state as any).amountRange?.min || !!(state as any).amountRange?.max}
            isOpen={activePopover === "range"}
            onClick={() => {
              setRangeMin(String((state as any).amountRange?.min ?? ""));
              setRangeMax(String((state as any).amountRange?.max ?? ""));
              togglePopover("range");
            }}
          />
        )}

        {/* Carrier chip (logistics only) */}
        {state.type === "logistics" && (
          <FilterChipTrigger
            label="Carrier"
            value={(state as any).carrierId || "All"}
            active={!!(state as any).carrierId}
            isOpen={activePopover === "carrier"}
            onClick={() => togglePopover("carrier")}
          />
        )}

        {/* Close toolbar button */}
        <button
          type="button"
          onClick={onClose}
          className="ml-auto flex-shrink-0 p-1.5 rounded-lg text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))] transition-colors"
          aria-label="Close filters"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ─── POPOVERS (anchored, inline-positioned) ─── */}

      {/* Status popover */}
      {activePopover === "status" && statusOptions && (
        <PopoverPanel onClose={closePopover}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">
              Status
            </span>
            {currentStatuses.length > 0 && (
              <button type="button" onClick={clearStatuses} className="text-[9px] font-bold text-primary hover:underline">
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

      {/* Sort popover */}
      {activePopover === "sort" && (
        <PopoverPanel onClose={closePopover}>
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

      {/* Amount range popover (financial only) */}
      {activePopover === "range" && state.type === "financial" && (
        <PopoverPanel onClose={closePopover}>
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
                onClick={clearRange}
                className="flex-1 h-8 rounded-md border border-[hsl(var(--bd-border))] text-[10px] font-bold text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={applyRange}
                className="flex-1 h-8 rounded-md bg-primary text-[10px] font-bold text-primary-foreground hover:bg-primary/90"
              >
                Apply
              </button>
            </div>
          </div>
        </PopoverPanel>
      )}

      {/* Carrier popover (logistics only) */}
      {activePopover === "carrier" && state.type === "logistics" && (
        <PopoverPanel onClose={closePopover}>
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">
              Carrier
            </span>
            <input
              type="text"
              placeholder="Enter carrier ID..."
              value={(state as any).carrierId || ""}
              onChange={(e) => {
                patchUpdate({ carrierId: e.target.value || null } as any);
              }}
              className="w-full h-9 px-2.5 rounded-md border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-sm text-[hsl(var(--bd-text))] outline-none focus:border-primary"
            />
            {(state as any).carrierId && (
              <button
                type="button"
                onClick={() => { patchUpdate({ carrierId: null } as any); closePopover(); }}
                className="text-[9px] font-bold text-primary hover:underline"
              >
                Clear carrier
              </button>
            )}
          </div>
        </PopoverPanel>
      )}
    </div>
  );
}

// ─── CHIP TRIGGER ───

function FilterChipTrigger({
  label,
  value,
  active,
  isOpen,
  onClick,
}: {
  label: string;
  value: string;
  active: boolean;
  isOpen: boolean;
  onClick: () => void;
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
      <span className="whitespace-nowrap">{label}: {value}</span>
      <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
    </button>
  );
}

// ─── POPOVER PANEL (anchored, inline) ───

function PopoverPanel({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="absolute left-4 right-4 top-full mt-1 z-50 rounded-xl border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] p-3 shadow-lg">
      {children}
    </div>
  );
}
