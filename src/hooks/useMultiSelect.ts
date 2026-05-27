import { useCallback, useMemo, useState } from "react";

export interface MultiSelectState {
  selectedIds: Set<string>;
  isSelectionModeActive: boolean;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
}

/**
 * Isolated multi-select state for document list batch operations.
 * Selection mode auto-deactivates when the set drains to 0.
 */
export function useMultiSelect(): MultiSelectState {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionModeActive, setIsSelectionModeActive] = useState(false);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      // Auto-deactivate if set drains to 0
      if (next.size === 0) {
        setIsSelectionModeActive(false);
      } else {
        setIsSelectionModeActive(true);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    const next = new Set(ids);
    setSelectedIds(next);
    // Always activate selection mode when explicitly called (even with 0 items)
    setIsSelectionModeActive(true);
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectionModeActive(false);
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  return useMemo(
    () => ({
      selectedIds,
      isSelectionModeActive,
      toggle,
      selectAll,
      clear,
      isSelected,
    }),
    [selectedIds, isSelectionModeActive, toggle, selectAll, clear, isSelected]
  );
}
