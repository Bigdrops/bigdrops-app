// ============================================================================
// QUERY FILTER TRACK — Fixed 48px, horizontal scroll, zero vertical growth
// ============================================================================

import { useMemo } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentQuery } from "@/context/DocumentQueryContext";
import type { FilterChip } from "@/types/queryPlatform";

interface QueryFilterTrackProps {
  onOpenOverlay: (category?: string) => void;
  className?: string;
}

export default function QueryFilterTrack({
  onOpenOverlay,
  className,
}: QueryFilterTrackProps) {
  const { state, patchUpdate } = useDocumentQuery();

  // Derive active filter chips from current state
  const chips = useMemo<FilterChip[]>(() => {
    const result: FilterChip[] = [];

    // Status chips
    if ("statuses" in state && state.statuses.length > 0) {
      for (const status of state.statuses) {
        if (status === "All") continue;
        result.push({
          category: "status",
          label: `Status: ${status}`,
          value: status,
          onRemove: () => {
            const next = (state as any).statuses.filter((s: string) => s !== status);
            patchUpdate({ statuses: next } as any);
          },
        });
      }
    }

    // Date range chip
    if (state.dateRange.from || state.dateRange.to) {
      const label = state.dateRange.from && state.dateRange.to
        ? `${state.dateRange.from} – ${state.dateRange.to}`
        : state.dateRange.from
          ? `From ${state.dateRange.from}`
          : `Until ${state.dateRange.to}`;
      result.push({
        category: "dateRange",
        label: `Date: ${label}`,
        value: "dateRange",
        onRemove: () => patchUpdate({ dateRange: { from: null, to: null } } as any),
      });
    }

    // Amount range chip (financial only)
    if ("amountRange" in state) {
      const { min, max } = (state as any).amountRange;
      if (min !== null || max !== null) {
        const label = min !== null && max !== null
          ? `₦${min} – ₦${max}`
          : min !== null
            ? `Min ₦${min}`
            : `Max ₦${max}`;
        result.push({
          category: "amountRange",
          label: `Amount: ${label}`,
          value: "amountRange",
          onRemove: () => patchUpdate({ amountRange: { min: null, max: null } } as any),
        });
      }
    }

    // Carrier chip (logistics only)
    if ("carrierId" in state && (state as any).carrierId) {
      result.push({
        category: "carrierId",
        label: `Carrier: ${(state as any).carrierId}`,
        value: (state as any).carrierId,
        onRemove: () => patchUpdate({ carrierId: null } as any),
      });
    }

    return result;
  }, [state, patchUpdate]);

  return (
    <div
      className={cn(
        "h-12 flex-shrink-0 flex items-center gap-2 px-4 overflow-x-auto overflow-y-hidden border-b border-[hsl(var(--bd-border))]/20",
        className
      )}
    >
      {/* Filter trigger button */}
      <button
        type="button"
        onClick={() => onOpenOverlay()}
        className={cn(
          "flex-shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-colors",
          chips.length > 0
            ? "border-primary/30 bg-primary/5 text-primary"
            : "border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface))]"
        )}
      >
        <SlidersHorizontal className="h-3 w-3" />
        <span>Filters</span>
        {chips.length > 0 && (
          <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-primary-foreground">
            {chips.length}
          </span>
        )}
      </button>

      {/* Active filter chips */}
      {chips.map((chip) => (
        <div
          key={`${chip.category}-${chip.value}`}
          className="flex-shrink-0 flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-md border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-[10px] font-bold text-[hsl(var(--bd-text))]"
        >
          <span className="whitespace-nowrap">{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="flex-shrink-0 p-0.5 rounded hover:bg-[hsl(var(--bd-surface))] transition-colors"
            aria-label={`Remove ${chip.label} filter`}
          >
            <X className="h-3 w-3 text-[hsl(var(--bd-text-muted))]" />
          </button>
        </div>
      ))}
    </div>
  );
}
