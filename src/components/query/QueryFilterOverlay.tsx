// ============================================================================
// QUERY FILTER OVERLAY — Portal-mounted, draft/commit pattern
// Bottom drawer on mobile, dialog on desktop
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { useDocumentQuery } from "@/context/DocumentQueryContext";
import { getAdapter } from "@/config/moduleAdapters";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import type { DocumentQueryState, ModuleScope } from "@/types/queryPlatform";

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
  const adapter = getAdapter(module);

  // Draft state — local clone, mutations don't touch the store
  const [draft, setDraft] = useState<Partial<DocumentQueryState>>({});

  // Clone current state into draft when overlay opens
  useEffect(() => {
    if (open) {
      setDraft({ ...state });
    }
  }, [open]);

  const updateDraft = (patch: Partial<DocumentQueryState>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  // Commit draft to store
  const handleApply = () => {
    patchUpdate(draft as any);
    onClose();
  };

  // Cancel — discard draft, zero global mutations
  const handleCancel = () => {
    setDraft({});
    onClose();
  };

  // Status filter controls
  const currentStatuses = (draft as any)?.statuses || [];

  const toggleStatus = (status: string) => {
    if (status === "All") {
      updateDraft({ statuses: [] } as any);
      return;
    }
    const next = currentStatuses.includes(status)
      ? currentStatuses.filter((s: string) => s !== status)
      : [...currentStatuses, status];
    updateDraft({ statuses: next } as any);
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <SheetContent
        side="bottom"
        className="max-h-[80vh] rounded-t-2xl px-4 pb-6 pt-4 md:max-w-lg md:mx-auto"
      >
        <SheetHeader className="pb-4 border-b border-[hsl(var(--bd-border))]/30">
          <SheetTitle className="text-sm font-black uppercase tracking-wider text-[hsl(var(--bd-text))]">
            Filters
          </SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-5 overflow-y-auto max-h-[50vh]">
          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {adapter.statusOptions.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleStatus(status)}
                  className={`h-8 px-3 rounded-lg border text-[11px] font-bold transition-all ${
                    status === "All" && currentStatuses.length === 0
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : currentStatuses.includes(status)
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface))]"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Range (financial modules only) */}
          {state.type === "financial" && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">
                Amount Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={(draft as any)?.amountRange?.min ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    updateDraft({
                      amountRange: {
                        min: val,
                        max: (draft as any)?.amountRange?.max ?? null,
                      },
                    } as any);
                  }}
                  className="flex-1 h-10 px-3 rounded-lg border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-sm text-[hsl(var(--bd-text))] outline-none focus:border-primary"
                />
                <span className="text-[hsl(var(--bd-text-muted))] text-xs">–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={(draft as any)?.amountRange?.max ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    updateDraft({
                      amountRange: {
                        min: (draft as any)?.amountRange?.min ?? null,
                        max: val,
                      },
                    } as any);
                  }}
                  className="flex-1 h-10 px-3 rounded-lg border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-sm text-[hsl(var(--bd-text))] outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {/* Carrier ID (logistics modules only) */}
          {state.type === "logistics" && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">
                Carrier
              </label>
              <input
                type="text"
                placeholder="Carrier ID"
                value={(draft as any)?.carrierId ?? ""}
                onChange={(e) => updateDraft({ carrierId: e.target.value || null } as any)}
                className="w-full h-10 px-3 rounded-lg border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-sm text-[hsl(var(--bd-text))] outline-none focus:border-primary"
              />
            </div>
          )}
        </div>

        <SheetFooter className="pt-4 border-t border-[hsl(var(--bd-border))]/30 flex gap-2">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            className="flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest"
          >
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
