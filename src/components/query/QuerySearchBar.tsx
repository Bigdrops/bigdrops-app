// ============================================================================
// QUERY SEARCH BAR — Fixed 48px, debounced, zero-reflow
// ============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentQuery } from "@/context/DocumentQueryContext";

interface QuerySearchBarProps {
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export default function QuerySearchBar({
  placeholder = "Search...",
  debounceMs = 300,
  className,
}: QuerySearchBarProps) {
  const { state, dispatch } = useDocumentQuery();
  const [localValue, setLocalValue] = useState(state.search);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local value when store resets externally
  useEffect(() => {
    setLocalValue(state.search);
  }, [state.search]);

  const dispatchSearch = useCallback(
    (value: string) => {
      dispatch({ type: "SET_SEARCH", payload: value });
    },
    [dispatch]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 200); // Max 200 chars
    setLocalValue(value);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => dispatchSearch(value), debounceMs);
  };

  const handleClear = () => {
    setLocalValue("");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => dispatchSearch(""), debounceMs);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      className={cn(
        "h-12 flex-shrink-0 flex items-center gap-2 px-4 border-b border-bd-border/40 bg-bd-surface",
        className
      )}
    >
      <Search className="h-4 w-4 flex-shrink-0 text-bd-text-muted" />
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={200}
        className="flex-1 h-full bg-transparent border-0 outline-none text-sm text-bd-text placeholder:text-bd-text-muted whitespace-nowrap overflow-hidden"
        style={{ textOverflow: "ellipsis" }}
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="flex-shrink-0 p-1 rounded-md hover:bg-bd-surface-muted transition-colors"
          aria-label="Clear search"
        >
          <X className="h-4 w-4 text-bd-text-muted" />
        </button>
      )}
    </div>
  );
}
