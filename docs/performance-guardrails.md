# BigDrops Performance Guardrails

This document outlines the architectural rules and standards required to maintain a high-performance, low-latency operational environment. Following these rules prevents Supabase load spikes, frontend bloat, and UI lag.

## 1. Data Fetching & Caching

### Cache-First List Pages
Every operational list page (Invoices, Quotations, Clients, Projects, etc.) **must** prioritize local cache over network requests.
- **Rule**: Read from `localStorage` using `readListCache` immediately on mount.
- **Goal**: Sub-100ms "Time to First Render" for all primary list views.

### Stale-While-Revalidate (SWR)
- Render stale data from the cache immediately.
- If the cache is older than the TTL (default 5-10m), trigger a background fetch.
- Update the UI and the cache quietly once the network request completes.

### No "Select All" on Lists
- **Rule**: Never use `.select('*')` on mount for list pages.
- **Standard**: Repositories must define lightweight projections containing only the fields needed for the list row (e.g., `id, number, client_name, status, total`).
- **Exception**: Detailed views (e.g., `ViewInvoice`) may use broad selects as they fetch a single record.

### Mutation Cache Invalidation
- After a successful mutation (Create, Update, Delete), you must either:
    1.  **Patch**: Manually update the local cache/state with the changed data.
    2.  **Invalidate**: Call `invalidateListCache` and trigger a background re-fetch.
- **Rule**: Users should never have to manually refresh the page to see their changes.

---

## 2. Component Architecture

### No Fetch in Presentational Components
- **Rule**: Components in `src/components` must receive data via props. 
- **Exception**: "Container" components or "Shells" that specifically manage a document's lifecycle.
- **Reason**: Moving fetches into leaf components causes "Hidden Load" (multiple components fetching the same data independently) and makes testing difficult.

### Lazy-Load Panels & Sheets
- **Rule**: Data fetching inside Sheets, Dialogs, or Tabs must be gated by an `open` or `isActive` flag.
- **Anti-Pattern**: Using a `useEffect` that fetches data regardless of whether the panel is visible.

### Heavy Fallback Scans
- **Rule**: Any query that performs a broad scan over millions of rows (e.g., scanning `invoice_items` for unlinked matches) must be gated by an explicit `includeHeavyFallbacks` flag.
- **Policy**: These scans are strictly for "Cleanup" or "Admin" modes, never for standard page loads.

---

## 3. Code & Bundle Discipline

### File Size Thresholds
- **Limit**: **600 lines** per file.
- **Guideline**: If a component or hook exceeds 600 lines, it is likely doing too much. Split it into sub-components or utility hooks.

### Bundle Separation
- **Heavy Modules**: PDF rendering (`@react-pdf/renderer`), rich text editors, and complex charts must be imported lazily or inside a `Suspense` boundary.
- **Import Rule**: Do not import heavy document templates at the top level of a route if they are only used inside a "Download" action.

---

## 4. Verification Checklist

Before submitting a PR or finishing a feature, verify:
1. [ ] List page mounts instantly from cache.
2. [ ] No `.select('*')` is used in a repository list method.
3. [ ] All Sheets/Dialogs only fetch data when opened.
4. [ ] `npm run audit:load` passes with zero critical warnings.
5. [ ] `npm run build` shows no unexpected chunk size increases.
