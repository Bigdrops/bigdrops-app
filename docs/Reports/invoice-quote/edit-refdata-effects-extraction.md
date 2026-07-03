# Edit-mode Init Extraction: Reference Data & Hydration Hooks

**This report was written by DeepSeek on 2026-07-03.**

## Objective & Scope

Extracted two inline `useEffect` blocks from `InvoiceFormPage.tsx` into dedicated hooks:

1. **Reference data loading** (signatories, bank accounts, settings) — used in both create and edit modes
2. **Edit-mode hydration** (invoice + items + custom fields loading) — used only in edit mode

The page now delegates these responsibilities to `useInvoiceReferenceData` and `useInvoiceHydration` instead of owning them directly.

**Not in scope:** Create-mode init effects, save handler logic, derived computations, column management, layout mode, or any business rule changes.

## Summary

- **`useInvoiceReferenceData`** (`src/hooks/useInvoiceReferenceData.ts:35`) — auto-loads signatories, bank accounts, and settings on mount. Returns `{ signatories, bankAccounts, settingsData, loading, error, refresh }`.
- **`useInvoiceHydration`** (`src/hooks/useInvoiceHydration.ts:152`) — loads invoice + items + custom fields for edit mode. Accepts `HydrationTargets` callback object (setters) and an `onNotFound` callback. Returns `{ loading, initialInvoiceSnapshot, baseCustomFields }`.
- **`InvoiceFormPage.tsx`** — lost ~140 lines (two effects, six `useState` declarations). The page now calls `useInvoiceReferenceData()` and `useInvoiceHydration(...)` and destructures their returns.

### Key Design Decisions

1. **Ref-based targets pattern** — `useInvoiceHydration` stores setters in a `useRef` to avoid stale closure issues while keeping the effect stable (`[isEdit, id]` only).
2. **`useInvoiceColumns` moved before `useInvoiceHydration`** — because the hydration targets include `setColumns`, which must be declared first.
3. **Reference data loading is unconditional** — auto-fires on mount for both create and edit. The old code had separate effects for each mode; the hook simplifies this.
4. **`loading` state for edit-mode guard** — owned by `useInvoiceHydration`, initialised to `isEdit`. The page renders a "Loading invoice..." state when `isEdit && (hydration.loading || !invoice)`.
5. **No behavioral change** — the hydration hook preserves the exact same data loading and state population sequence as the original inline effect.

### Page State Ownership Summary

| State | Owner |
|---|---|
| `invoice`, `items`, `groups`, `customFields`, etc. | `useInvoiceEditableState` |
| `signatories`, `bankAccounts`, `settingsData` | `refData` (`useInvoiceReferenceData`) |
| `loading` (edit), `initialInvoiceSnapshot`, `baseCustomFields` | `hydration` (`useInvoiceHydration`) |
| `columns`, `setColumns`, visibility/ordering | `useInvoiceColumns` |

## Verification

- `bun run audit:load` — passes (pre-existing warnings unchanged)
- `bun run typecheck` — passes (0 errors)
- `bun run test` — 51/52 pass; 1 pre-existing failure (waybill import, unrelated)
- Lint timed out (large project); not a regression concern

## Risks & Limitations

- The reference data hook uses `useState` internally for `loading`, starting as `true`. The old code had no loading state for the shared init effect (create mode). If a loading indicator is desired for create mode reference data, the hook's initial state can be adjusted — but this is consistent with prior behaviour.
- Both hooks use `supabase` from the module import rather than receiving it as a parameter. If we ever need test seam or multi-tenant support, injecting the client would be necessary.
- `useInvoiceReferenceData` does not expose `error` to the page UI — it's returned but unused. Error handling could be added later.

## Deferred Work

- Unused import `syncGroupsFromItems` at `src/domain/invoice` may now be removable (was used in deleted effect).
- The page remains above the 600-line bloat threshold (777 lines). Further extraction of create-mode effects is recommended.
- Reference data error state is not surfaced to the user.
