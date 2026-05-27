// ============================================================================
// DOCUMENT QUERY PLATFORM — CENTRALIZED STORE PROVIDER
// Single source of truth for all document module query state
// ============================================================================

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import type {
  DocumentQueryState,
  ModuleScope,
  ModuleQueryMap,
  QueryAction,
  ModuleTypeMap,
} from "@/types/queryPlatform";
import { getAdapter } from "@/config/moduleAdapters";

// --- Module → Type discriminator resolution ---

const MODULE_TYPE_MAP: Record<ModuleScope, DocumentQueryState["type"]> = {
  invoices: "financial",
  quotations: "financial",
  waybills: "logistics",
  projects: "project",
  csr: "project",
  rfqs: "project",
  boqs: "project",
};

// --- Initial State Factory ---

function getInitialState(module: ModuleScope): DocumentQueryState {
  const adapter = getAdapter(module);
  const type = MODULE_TYPE_MAP[module];

  const base = {
    search: "",
    dateRange: { from: null, to: null } as { from: string | null; to: string | null },
    sortBy: adapter.initialSortBy,
    sortDirection: "desc" as const,
    client: null as string | null,
  };

  switch (type) {
    case "financial":
      return { ...base, type: "financial", statuses: [], amountRange: { min: null, max: null } };
    case "logistics":
      return { ...base, type: "logistics", statuses: [], carrierId: null };
    case "project":
      return { ...base, type: "project", statuses: [] };
  }
}

// --- Reducer ---

function queryReducer<T extends DocumentQueryState>(state: T, action: QueryAction<T>): T {
  switch (action.type) {
    case "PATCH": {
      // Validate amountRange if present
      const payload = action.payload as any;
      if (payload?.amountRange) {
        const { min, max } = payload.amountRange;
        if (min !== null && max !== null && min > max) {
          return state; // Reject invalid range
        }
      }
      return { ...state, ...payload };
    }
    case "RESET":
      return state; // Will be handled by provider (needs module context)
    case "SET_SEARCH":
      return { ...state, search: action.payload };
    case "SET_SORT":
      return { ...state, sortBy: action.payload.sortBy, sortDirection: action.payload.sortDirection };
    default:
      return state;
  }
}

// --- Context Shape ---

interface DocumentQueryContextValue {
  state: DocumentQueryState;
  dispatch: (action: QueryAction<any>) => void;
  results: any[];
  loading: boolean;
  error: string | null;
  module: ModuleScope;
}

const DocumentQueryContext = createContext<DocumentQueryContextValue | null>(null);

// --- Provider ---

interface DocumentQueryProviderProps {
  module: ModuleScope;
  children: ReactNode;
}

export function DocumentQueryProvider({ module, children }: DocumentQueryProviderProps) {
  const initialState = useMemo(() => getInitialState(module), [module]);
  const [state, rawDispatch] = useReducer(queryReducer, initialState);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);
  const prevResultsRef = useRef<any[]>([]);

  // Wrap dispatch to handle RESET with module context
  const dispatch = useCallback(
    (action: QueryAction<any>) => {
      if (action.type === "RESET") {
        const fresh = getInitialState(module);
        rawDispatch({ type: "PATCH", payload: fresh });
      } else {
        rawDispatch(action);
      }
    },
    [module]
  );

  // Fetch data when state changes
  useEffect(() => {
    const adapter = getAdapter(module);
    const id = ++fetchIdRef.current;

    let cancelled = false;

    const doFetch = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await adapter.fetcher(state);
        if (cancelled || id !== fetchIdRef.current) return;

        // Referential stability: only update if data actually changed
        const prev = prevResultsRef.current;
        if (
          prev.length === data.length &&
          prev.every((item, i) => item === data[i])
        ) {
          setLoading(false);
          return;
        }

        prevResultsRef.current = data;
        setResults(data);
      } catch (err: any) {
        if (cancelled || id !== fetchIdRef.current) return;
        setError(err?.message || "Failed to fetch data");
        // Retain previous results on error
      } finally {
        if (!cancelled && id === fetchIdRef.current) {
          setLoading(false);
        }
      }
    };

    doFetch();

    return () => {
      cancelled = true;
    };
  }, [state, module]);

  const value = useMemo<DocumentQueryContextValue>(
    () => ({ state, dispatch, results, loading, error, module }),
    [state, dispatch, results, loading, error, module]
  );

  return (
    <DocumentQueryContext.Provider value={value}>
      {children}
    </DocumentQueryContext.Provider>
  );
}

// --- Consumer Hook (type-narrowed) ---

export function useDocumentQuery<M extends ModuleScope>(
  _module?: M
): {
  state: ModuleQueryMap[M];
  dispatch: (action: QueryAction<ModuleQueryMap[M]>) => void;
  patchUpdate: (payload: Partial<ModuleQueryMap[M]>) => void;
  reset: () => void;
  results: any[];
  loading: boolean;
  error: string | null;
} {
  const context = useContext(DocumentQueryContext);
  if (!context) {
    throw new Error("useDocumentQuery must be used within a DocumentQueryProvider");
  }

  const patchUpdate = useCallback(
    (payload: Partial<ModuleQueryMap[M]>) => {
      context.dispatch({ type: "PATCH", payload });
    },
    [context.dispatch]
  );

  const reset = useCallback(() => {
    context.dispatch({ type: "RESET" });
  }, [context.dispatch]);

  return {
    state: context.state as ModuleQueryMap[M],
    dispatch: context.dispatch as (action: QueryAction<ModuleQueryMap[M]>) => void,
    patchUpdate,
    reset,
    results: context.results,
    loading: context.loading,
    error: context.error,
  };
}
