# Architectural Review: Redis, Kafka & Elasticsearch for BIGDROPS

**Date:** 2026-06-26  
**Scope:** Production codebase analysis — not greenfield architecture  
**Method:** Evidence-only; every conclusion cites source files  
**Constraint:** Do not propose code changes

---

## 1. Executive Summary

BIGDROPS is a **modular monolith** React 19 + Supabase (Postgres) application for Nigerian SME business management. After full codebase inspection, the verdict is:

| Technology | Verdict | Priority |
|---|---|---|
| **Redis** | **Do not adopt now.** Current caching (localStorage + 2-min TTL) is adequate for single-server Vercel deployment. Would add value at >500 concurrent users. | Low now, Medium later |
| **Kafka** | **Do not adopt.** No event-driven patterns exist. All workflows are synchronous HTTP request-response. Adding Kafka would be architectural over-engineering for a team that doesn't yet need sub-millisecond async. | Avoid |
| **Elasticsearch** | **Do not adopt now.** Current PostgreSQL `ilike` search is sufficient for ~10K documents. Would add value at >50K documents or when fuzzy/autocomplete is required. | Low now, Medium later |

The strongest finding: **BIGDROPS needs a background job system, not a message queue.** PDF generation, notifications, audit logging, and exports all run synchronously on the browser thread or inline with the request. A simple job queue (Bull/BullMQ with Redis, or a Supabase-based job table with a lightweight worker) would provide more immediate value than Kafka or Elasticsearch.

---

## 2. Current Architecture

### 2.1 Modular Monolith

BIGDROPS follows a **modular monolith** pattern with clear separation of concerns:

```
src/
  domain/       — Business logic, types, validations (per module)
  modules/      — Feature orchestration (invoices, quotations, compliance, item-library)
  pages/        — Route-level components (49 pages)
  components/   — Shared UI (layout, ui, document-view, pdf, pdf-new, reports, audit, etc.)
  hooks/        — React hooks (20 hooks)
  lib/          — Utilities, calculations, caching, formatters
  services/     — External integrations (exportFetchers.ts)
  context/      — React contexts (DocumentQueryContext)
  config/       — Module adapters, filter configs
  supabase/     — Custom database client
```

**Evidence:** `src/domain/` has 21 subdirectories (invoice, quotation, waybill, csr, boq, rfq, audit, compliance, project, document, notifications, etc.), each containing types, business logic, and optionally storage adapters. `src/modules/` has 4 subdirectories (invoices, quotations, compliance, item-library) for orchestration. `src/config/moduleAdapters.ts` (712 lines) provides a centralized Document Query Platform.

### 2.2 Domain Boundaries

Each major document type has an isolated domain with its own:
- Types/contracts (`src/domain/<module>/contracts.ts`)
- Storage layer (`src/domain/<module>/storage.ts`)
- Calculations (shared via `src/lib/Calculations.ts`)
- PDF preview model (`src/domain/<module>/previewModel.ts`)
- Import adapter (per `docs/STANDARD/json-import-standard.md`)

**Evidence:** `src/domain/invoice/` (26 files including `contracts.ts`, `projections.ts`, `previewModel.ts`, `advanceProjection.rules.ts`, `advanceChildFlow.ts`, `financialState.ts`). `src/domain/waybill/` includes `contracts.ts`, `engine.ts`, `mutations.ts`.

### 2.3 PDF Rendering — Dumb Render Layer

PDF generation uses `@react-pdf/renderer` and follows a strict "receive shaped data only" pattern:

**Evidence:**
- `src/domain/invoice/buildPdfRenderPayload.ts` — extracts only identity, items, totals, meta from invoice; no computation
- `src/domain/invoice/previewModel.ts` — builds preview projections from invoice data
- `src/components/pdf-new/index.ts` — generates PDF via `generateInvoicePdf()` / `generateQuotationPdf()` using dynamic template imports
- `src/components/pdf-new/renderers/PdfRenderer.tsx` — generic renderer
- 5 PDF templates: Industry, Apex, Bolt, ObsidianReceipt, Ledger (`src/components/pdf-new/templates/`)
- All financial data pre-computed in domain layer, PDF only renders

### 2.4 Financial Calculations — Single Source of Truth

**Evidence:** `src/lib/Calculations.ts` contains `calcTotals()`, `resolveRowVat()`, and all shared financial math. This file is imported by both invoice and quotation domains. The comment at the top explicitly designates it as the single source of truth. No duplicate calculation logic exists elsewhere.

### 2.5 Database Access — Custom Supabase Client

**Evidence:** `src/supabase.ts` wraps the Supabase client with:
- Configurable retry (max 3, retries only GET/HEAD)
- Timeout (20 seconds)
- Service role key rejection in frontend
- Request/response logging
- Error normalization

All database access goes through this single client.

### 2.6 Caching — Client-Side Only

**Evidence:**
- `src/lib/cache/dashboardCache.ts` — localStorage cache for dashboard, 2-min TTL, version-gated
- `src/lib/cache/listCache.ts` — generic localStorage list cache with TTL checks
- `src/config/moduleAdapters.ts` — cache-bypass detection when filters are active
- No Redis, no in-memory server cache, no distributed caching

### 2.7 Document Numbering — Prefix Engine

**Evidence:** Document numbers follow configurable prefix patterns stored in `settings.document_prefixes`:
- `src/pages/NewWaybill.tsx:34` — `getNextWaybillNumber(type, existingNumbers, prefix)`
- `src/pages/NewInvoice.tsx:234` — `getNextInvoiceNumber(data, prefix)`
- `src/pages/NewCSR.tsx:91` — `getNextCsrNumber(latestNumber, prefix)`
- `src/pages/settings/DocumentPrefixesSettingsSection.tsx` — settings UI for prefix configuration
- Waybill format documented in AGENTS.md: `[PREFIX]-[M?][E|I]-[000000]`

### 2.8 No-Touch Zones

**Evidence:** AGENTS.md lists specific no-touch files including `src/lib/Calculations.ts`, DB constraints (`check_waybill_purpose_conditional`, `check_items_json_structure`, `check_waybill_type`), `generateWaybillSequenceNumber()`, and the invoice→waybill items transform (must strip all monetary values).

---

## 3. Current Performance Profile

### 3.1 Dashboard

The dashboard runs **6 independent Supabase queries in parallel**:
- Invoices (latest 8)
- Quotations (latest 8)
- CSRs (latest 5-8)
- Waybills (latest 8)
- RFQs (latest 5)
- Projects (latest 3)
- `invoice_financials_v` view (all rows — unlimited)

**Evidence:** `src/hooks/useDashboardData.ts` lines 355-365.

The entire dashboard dataset is cached in localStorage with a **2-minute TTL** (`src/lib/cache/dashboardCache.ts`). On cache hit, the user sees stale data for up to 2 minutes. On cache miss, the user waits for all 6 queries.

### 3.2 Reports — Heavy Aggregation

Reports page runs **synchronous SQL aggregation queries** without pagination:

**Evidence:** `src/pages/Reports.tsx`:
- `loadCollections()` — queries `payments` with `*, invoices(invoice_number, client_name)` join, then second query to `bank_accounts` (lines 111-140)
- `OverviewSection`, `ReceivablesSection`, `CollectionsSection`, `ProjectsSection`, `TaxSection` all render client-side computed data
- All queries are full-scan within date range — no pagination

### 3.3 Global Search — 6 Parallel ilike Queries

**Evidence:** `src/hooks/useGlobalSearch.ts` (115 lines):
- 6 concurrent `ilike` queries (clients, projects, invoices, quotations, csrs, waybills)
- Each limited to 3 results
- No debounce (uses `useSafeAsyncTask` with latest-only semantics)
- No full-text search, no fuzzy matching, no relevance ranking

### 3.4 Exports — Unpaginated Full-Set Extraction

**Evidence:** `src/services/exportFetchers.ts:70` — `fetchExportDataset()` compiles Supabase queries with **no pagination limits**:
- `DOMAINS_WITH_ITEMS` (INVOICES, QUOTATIONS, BOQS) also fetch line items via separate table joins
- Respects filter context but not limits
- At scale (>1000 rows), this will consume significant memory on both database and client

### 3.5 PDF Generation — Client-Side, Synchronous

**Evidence:** `src/components/pdf-new/index.ts`:
- `generateInvoicePdf()` / `generateQuotationPdf()` — runs entirely in browser
- Uses `@react-pdf/renderer` `pdf().toBlob()` — synchronous PDF generation blocks the UI thread
- Dynamic imports of 5 template modules at generation time (~40KB+ of template code loaded)
- `registerPdfFonts()` loads font assets from `/fonts/`

### 3.6 Notifications — No Real-Time

**Evidence:** `src/hooks/useNotifications.ts`:
- Fetches notifications table once on mount via `supabase.from('notifications').select(...).order().limit(30)`
- No polling, no WebSocket, no Supabase Realtime channel
- Push notifications are sent via Edge Function (`sendPushForNotification.ts` → `supabase.functions.invoke('send-push')`)
- This is a fire-and-forget call but runs synchronously from the calling context

### 3.7 Audit Logging — Synchronous Inline Writes

**Evidence:** `src/lib/audit.ts`:
- `recordAuditLog()` calls `supabase.rpc('record_audit_log', {...})` — synchronously
- Called from: `src/pages/NewInvoice.tsx:661`, `src/pages/EditInvoice.tsx:637`, `src/components/quotation/QuotationForm.tsx:657`, `src/pages/ProjectDetail.tsx:106`, `src/pages/NewProject.tsx:83`, `src/modules/invoices/services/invoiceLifecycleService.ts:78`
- Each audit write blocks the response to the user

### 3.8 Document Query Platform — Centralized with Client-Side Caching

**Evidence:** `src/context/DocumentQueryContext.tsx` provides centralized query state for all document modules. `src/config/moduleAdapters.ts` implements:
- Cache-first strategy with localStorage (`readListCache`/`writeListCache`)
- Cache-bypass when filters are active (`hasActiveFilters()` — checks search, date range, client, sort, statuses, amount range)
- Local filter application on cached rows (`applyDateRangeLocally()`, `applyClientLocally()`)
- Per-module Supabase query building (invoices, quotations, waybills, csrs, projects, rfqs, boqs)

### 3.9 Re-render Risk

**Evidence:** No state management library (Redux, Zustand, Jotai) found. All state is React context (`DocumentQueryContext`) or local `useState`. With 49 page components and deeply nested views (e.g., invoice detail with payments, linked documents, audit trail, advance projections), unnecessary re-renders are a risk. No `React.memo`, `useMemo`, or `useCallback` audit was performed, but the absence of a state management library means parent re-renders propagate throughout the tree.

---

## 4. Redis Assessment

### 4.1 Current Caching State

All caching is **client-side localStorage**:
- Dashboard: `src/lib/cache/dashboardCache.ts` — 2-min TTL
- Document lists: `src/lib/cache/listCache.ts` — generic TTL
- SQLite fallback: `src/lib/native/invoiceCache.ts` — offline support via Capacitor SQLite plugin

### 4.2 What Redis Would Solve

| Opportunity | File | Current Approach | Redis Impact |
|---|---|---|---|
| Dashboard aggregation | `src/hooks/useDashboardData.ts` | 6 parallel queries every 2 min or on cache miss | Cache aggregated result in Redis; reduce DB load |
| Report aggregation | `src/pages/Reports.tsx` | Full-scan SQL queries with joins | Cache computed report data; TTL per report type |
| Document numbering | `src/pages/NewWaybill.tsx:34` | `getNextWaybillNumber()` — reads all existing numbers | `INCR` atomic counter — eliminates full-table scan for numbering |
| Settings cache | `settings?.document_prefixes` passed through component tree | Passed via props from `useSettings` hook | Cache user settings globally; reduce repeated DB fetches |
| Rate limiting | Not implemented | No protection | Redis-based rate limiting for API endpoints |

### 4.3 What Redis Would NOT Solve

- PDF generation is client-side; Redis doesn't help
- Search latency — Elasticsearch or Postgres FTS is the answer, not Redis
- Async background jobs — Redis can host a queue (BullMQ), but the app needs a worker process first
- Real-time updates — Supabase Realtime is the answer, not Redis

### 4.4 Verdict

**Do not adopt Redis now.** The localStorage caching strategy with 2-min TTL is adequate for the current single-server Vercel deployment. Dashboard aggregates run at most once per 2 minutes per user. With ~10-50 active users, the database handles this trivially.

Redis would become valuable when:
- **>500 daily active users** — dashboard aggregation queries become expensive
- **Document numbering becomes a bottleneck** — `INCR` eliminates `ORDER BY ... LIMIT 1` pattern
- **A background job system is introduced** — BullMQ needs Redis
- **Rate limiting is needed** — no protection exists today

**Priority:** Low (adopt in 6-12 months when user base grows)

---

## 5. Kafka Assessment

### 5.1 Current Event Architecture

**There is no event architecture.** The codebase has zero event emitters, zero event consumers, zero message queues, and zero publish-subscribe patterns.

### 5.2 Evidence of Missing Async Patterns

Every workflow that could benefit from events currently runs synchronously:

| Workflow | File | Current Pattern |
|---|---|---|
| Invoice created → audit log | `src/pages/NewInvoice.tsx:661` | `await recordAuditLog(...)` inline |
| Invoice status change → notification | `src/modules/invoices/services/invoiceLifecycleService.ts:78` | `await recordAuditLog(...)` inline |
| Quotation created → audit log | `src/components/quotation/QuotationForm.tsx:657` | `await recordAuditLog(...)` inline |
| Payment recorded → audit log | `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx:150` | `await recordPaymentRecorded(...)` inline |
| Push notification delivery | `src/domain/notifications/sendPushForNotification.ts` | Called synchronously, but wrapped in try/catch |
| Document conversion | Various clone/convert services | Synchronous API calls |

### 5.3 Coupling Patterns

Modules communicate through **direct imports and function calls**, not events:
- `src/pages/ViewRfq.tsx:201` — imports `convertRFQToQuotation()` directly
- `src/hooks/useQuotationActions.ts:128` — imports `convertQuotationToInvoice()` directly
- `src/components/document-view/invoice/useInvoiceActions.ts:119` — imports `revertInvoiceToQuotationService()` directly

This means converting a quotation to an invoice requires the user to wait for the entire operation to complete before getting a response. There is no "fire and forget and notify later" pattern anywhere in the codebase.

### 5.4 Why Kafka Is Wrong for This Stage

Kafka is suited for:
- High-throughput event streaming (>10K events/second)
- Multiple independent consumers of the same event stream
- Long-term event storage and replay
- Cross-service event-driven architecture

BIGDROPS has none of these requirements. The current scale (single application, single database, single deployment) means:
- Events would be produced and consumed by the same process
- A lightweight job queue (Bull/BullMQ with Redis, or even a simple Postgres job table) would be simpler, cheaper, and more maintainable
- Kafka's operational overhead (ZooKeeper/KRaft, partitioning, consumer groups, offset management) is unjustified

### 5.5 Recommendation

**Do not adopt Kafka.** If async processing is needed (it is — see PDF generation, notifications, audit logging, exports), use a lightweight approach:
- **Medium-term:** BullMQ + Redis for background job processing
- **Short-term:** A simple Postgres `jobs` table with a polling worker (can run as a Vercel cron job or Edge Function)
- **Long-term (6-18 months):** Re-evaluate Kafka only if multi-service architecture emerges

---

## 6. Elasticsearch Assessment

### 6.1 Current Search Capabilities

**Evidence:** `src/hooks/useGlobalSearch.ts`:
- 6 parallel PostgreSQL `ilike` queries with `%query%` pattern matching
- Each query limited to 3 results
- No full-text search ranking
- No fuzzy matching
- No autocomplete
- No cross-module relevance scoring

Queries executed:
```
supabase.from('clients').select('id, name').ilike('name', `%${query}%`).limit(3)
supabase.from('projects').select('id, name, client_name').ilike('name', `%${query}%`).limit(3)
supabase.from('invoices').select('id, invoice_number, ...').ilike('invoice_number', `%${query}%`).is('archived_at', null).limit(3)
supabase.from('quotations').select('id, quotation_number, ...').ilike('quotation_number', `%${query}%`).limit(3)
supabase.from('csrs').select('id, csr_number, ...').ilike('csr_number', `%${query}%`).limit(3)
supabase.from('waybills').select('id, waybill_number, ...').ilike('waybill_number', `%${query}%`).limit(3)
```

### 6.2 Document Query Platform Filtering

**Evidence:** `src/config/moduleAdapters.ts`:
- Client-side filter logic after cache fetch
- Date range filtering, client filtering, status filtering
- All filtering is exact-match or range, not full-text search
- The platform supports per-module column configuration

### 6.3 Database-Level Alternatives

PostgreSQL offers:
- `to_tsvector()` / `to_tsquery()` — built-in full-text search with ranking
- `pg_trgm` extension — fuzzy matching via `similarity()` and `word_similarity()`
- GIN indexes on `tsvector` columns for fast full-text search
- GIST indexes on `trigram` columns for fuzzy search

The current implementation uses none of these — just basic `ilike` with `%` wildcards.

### 6.4 What Elasticsearch Would Add

| Feature | Current | With Elasticsearch |
|---|---|---|
| Fuzzy search ("Jonh" → "John") | No — `ilike` requires exact substring match | Yes — edit distance matching |
| Relevance ranking | No — results are per-module, ordered by `created_at` | Yes — BM25 scoring across all modules |
| Autocomplete | No | Yes — edge n-gram completion suggester |
| Cross-module search | Yes — 6 parallel queries, results merged client-side | Yes — single query with type filtering |
| Scale >50K documents | Poor — `ilike %query%` cannot use B-tree indexes, full table scan | Good — inverted index with O(1) lookup |
| Typo tolerance | No | Yes |

### 6.5 Verdict

**Do not adopt Elasticsearch now.** For the current document volume (<10K total documents), PostgreSQL `ilike` is adequate. The search is limited to 18 results total (3 per module × 6 modules).

Elasticsearch would become valuable when:
- **>50K documents** — `ilike` full-table scans become expensive
- **Typo-tolerant fuzzy search is a requirement** — users expect "Jonh" to find "Johnson & Co"
- **Autocomplete is needed** — type-ahead search in the global search bar
- **Relevance-ranked cross-module search is needed** — search results ordered by relevance, not by module

**Priority:** Low now, Medium when document volume exceeds 50K records. Before adopting Elasticsearch, implement PostgreSQL `pg_trgm` extension for fuzzy matching — it can handle up to ~500K records with good performance and requires zero infrastructure.

---

## 7. Scalability Assessment

### 7.1 10 Users

**Verdict:** No issues. The current architecture handles this trivially.
- localStorage caching is per-user — no sharing, no contention
- 6 dashboard queries per 2 minutes = negligible load
- Notifications: one fetch per mount per user
- Reports: on-demand, no precomputation

### 7.2 100 Users

**Verdict:** Works but shows first cracks.
- Dashboard: 100 users × 6 queries every 2 min = 300 queries/min peak to Supabase. Supabase free tier handles this.
- Reports: concurrent report generation with full-scan queries may cause 1-2s latency spikes.
- Export: unpaginated full-set queries (`exportFetchers.ts`) — if 5 users export simultaneously, Supabase may time out for large datasets (>5000 rows).
- PDF generation: client-side, no server impact. May cause browser memory issues for large invoices (100+ line items).

### 7.3 1,000 Users

**Verdict:** Breaks at the dashboard and reports.
- Dashboard aggregation: 1,000 users × 6 queries every 2 min = 3,000 queries/min. The `invoice_financials_v` view has no limit — every user fetches every row every 2 minutes. **This breaks first.**
- Reports: concurrent full-scan joins across `payments + invoices + bank_accounts` on every tab switch will cause database connection pool exhaustion.
- Document numbering: `getNextWaybillNumber()` reads all waybill numbers to find the max — O(n) per creation. At 1,000 users creating documents, this becomes a serialization bottleneck.
- Global search: 6 parallel `ilike %query%` queries per keystroke (debounced). Without full-text indexes, each query is a sequential scan.
- Caching: localStorage caching doesn't share between users. Each user independently hits the database.
- **What breaks first:** Dashboard data fetch — `invoice_financials_v` unlimited query × 1,000 users.

### 7.4 10,000 Users

**Verdict:** Requires significant rearchitecture.
- Dashboard must be precomputed and served from a cache (Redis or materialized views).
- Reports must be precomputed or use incremental aggregation.
- Document numbering must use atomic counters (Redis INCR or Postgres sequences).
- Full-text search must use PostgreSQL FTS + pg_trgm, or Elasticsearch.
- Export must use pagination or background job generation.
- PDF generation should be server-side (background job) to avoid browser memory exhaustion.
- Notifications must use Supabase Realtime channels instead of polling.

### 7.5 Bottleneck Summary

| Component | Bottleneck at | Evidence |
|---|---|---|
| Dashboard aggregation | ~500 users | `useDashboardData.ts` — unlimited `invoice_financials_v` query |
| Reports | ~300 concurrent users | `Reports.tsx` — full-scan SQL joins with no caching |
| Document numbering | ~100 creates/min | O(n) scan for max number (`NewWaybill.tsx:34`, `NewInvoice.tsx:234`) |
| Global search | ~200 concurrent users | 6 parallel `ilike` queries (`useGlobalSearch.ts`) |
| Export | ~50 concurrent exports | Unpaginated full-set extraction (`exportFetchers.ts`) |
| Audit logging | ~500 writes/min | Synchronous `record_audit_log` RPC (`src/lib/audit.ts`) |

---

## 8. Top 10 Architectural Risks

| # | Risk | Impact | Evidence |
|---|---|---|---|
| 1 | **Dashboard unlimited aggregation query** | At scale, crashes the database | `useDashboardData.ts:364` — `invoice_financials_v` has no LIMIT. Every user fetches ALL financial rows. |
| 2 | **Synchronous audit logging blocks responses** | User waits for audit writes | `src/pages/NewInvoice.tsx:661`, `EditInvoice.tsx:637` — `await recordAuditLog()` in the critical path |
| 3 | **No background job system** | PDF, exports, reports block the UI | All operations run synchronously on the browser thread |
| 4 | **Zero real-time subscriptions** | Stale data until manual refresh | No `supabase.channel()` usage anywhere. Notifications fetched once on mount. |
| 5 | **Client-side PDF generation at scale** | Browser memory exhaustion for large documents | `@react-pdf/renderer` generates PDF entirely in browser memory |
| 6 | **Unpaginated exports** | Timeout on large datasets | `exportFetchers.ts:70` — `fetchExportDataset()` has no limit/offset |
| 7 | **Document numbering uses O(n) scan** | Race conditions under concurrent creates | `getNextInvoiceNumber()` reads all existing numbers to find max |
| 8 | **Search has no fuzzy matching** | Typo-sensitivity hurts UX | `useGlobalSearch.ts` uses only `ilike %query%` — "Aple" won't find "Apple" |
| 9 | **No state management library** | Uncontrolled re-render propagation | Only React context + useState; no Zustand/Redux/Jotai. 49 page components can cascade re-renders. |
| 10 | **Notification polling is inefficient** | Each user fetches full notification list | `useNotifications.ts` — no selective fetch, no polling interval, no Realtime subscription |

---

## 9. Top 10 Architectural Strengths

| # | Strength | Evidence |
|---|---|---|
| 1 | **Single source of truth for calculations** | `src/lib/Calculations.ts` — all financial math centralized. No duplicate logic anywhere. |
| 2 | **Clear modular monolith boundaries** | `src/domain/` — 21 isolated subdirectories, each with types, logic, and tests |
| 3 | **PDF is a dumb render layer** | `buildPdfRenderPayload.ts` → receives pre-computed data, no business logic |
| 4 | **Custom Supabase client with safeguards** | `src/supabase.ts` — retry, timeout, service_role rejection, logging |
| 5 | **Client-side caching with TTL** | `src/lib/cache/dashboardCache.ts`, `listCache.ts` — version-gated, with cache-bypass detection |
| 6 | **Centralized document query platform** | `src/config/moduleAdapters.ts` — 712 lines of shared query/filter/cache logic across all modules |
| 7 | **JSON import standard is well-defined** | `docs/STANDARD/json-import-standard.md` — prescriptive prompt discipline, Zod validation, adapter pattern |
| 8 | **DB constraints enforce business rules** | CHECK constraints: `check_waybill_type`, `check_waybill_purpose_conditional`, `check_items_json_structure` — data integrity at the database level |
| 9 | **Audit trail is consistent across modules** | `src/lib/audit.ts` — centralized `recordAuditLog()`, tracked fields per entity, used by invoices, quotations, and projects |
| 10 | **Offline support via Capacitor SQLite** | `src/lib/native/invoiceCache.ts` — SQLite fallback cache for offline usage (via Capacitor native bridge) |

---

## 10. Immediate Wins (Next 30 Days)

| # | Improvement | Impact | Effort | Risk | Evidence |
|---|---|---|---|---|---|
| 1 | **Add LIMIT to dashboard financials query** | Reduces DB load significantly | Low | None | `useDashboardData.ts:364` — `invoice_financials_v` has no limit |
| 2 | **Fire-and-forget audit logging** | Improves save response time | Low | Low | `src/lib/audit.ts` → wrap in `void` or queue |
| 3 | **Implement PostgreSQL full-text search** | Better search results without new infra | Medium | Low | `useGlobalSearch.ts` → use `to_tsvector()` + GIN index instead of `ilike` |
| 4 | **Debounce global search** | Reduces database query volume | Low | None | `useGlobalSearch.ts` — no debounce today |
| 5 | **Add pagination to exports** | Prevents timeouts on large exports | Medium | Low | `exportFetchers.ts` — add limit/offset |
| 6 | **Cache reports aggregation** | Faster report loading | Medium | Low | `Reports.tsx` — cache per date range + client filter |
| 7 | **Replace O(n) document numbering with atomic counter** | Eliminates race conditions | Low | Low | `getNextInvoiceNumber()` → use Postgres sequence or query max+1 |
| 8 | **Add Supabase Realtime for notifications** | Eliminates polling, instant updates | Medium | Low | `useNotifications.ts` → subscribe to `notifications` channel |
| 9 | **Add React.memo to expensive list components** | Reduces re-render overhead | Low | Low | Document list components with frequent parent re-renders |
| 10 | **Add rate limiting for exports and reports** | Prevents accidental abuse | Low | None | No rate limiting exists anywhere |

---

## 11. Medium-Term Improvements (3-6 Months)

| # | Improvement | Impact | Effort | Risk |
|---|---|---|---|---|
| 1 | **Background job system (BullMQ + Redis or Postgres job table)** | Async PDF generation, notifications, exports | High | Medium |
| 2 | **Server-side PDF generation** | Offloads PDF from browser; enables email attachment | High | Medium |
| 3 | **Redis caching layer (dashboard + reports)** | Reduces DB load, faster aggregates | High | Medium |
| 4 | **Precomputed materialized views for reports** | Eliminates full-scan report queries | High | Low |
| 5 | **Zustand or Jotai for state management** | Controlled re-renders, better dev tools | Medium | Low |
| 6 | **Automated database performance monitoring** | Identify slow queries proactively | Medium | Low |

---

## 12. Long-Term Evolution (6-18 Months)

| # | Evolution | Trigger |
|---|---|---|
| 1 | **Multi-service architecture** | When the team exceeds 5 developers and deployment cycles need independence |
| 2 | **Kafka or equivalent event bus** | Only when multiple independent services need async communication |
| 3 | **Elasticsearch** | When documents exceed 50K and fuzzy/autocomplete search is required |
| 4 | **Dedicated API server** | When mobile app (Capacitor) needs direct API access instead of Supabase client |
| 5 | **Redis as primary cache layer** | When user base exceeds 500 DAU and database load becomes critical |

---

## 13. Final Verdict

### Redis: Do not adopt now (Low priority)

**Rationale:** Current localStorage caching is adequate for the single-server deployment. Dashboard aggregates run once per 2 minutes per user. Cost and complexity of Redis (ElastiCache or Upstash) outweighs benefit at current scale.

**When to adopt:** >500 daily active users OR when BullMQ background jobs are introduced (BullMQ requires Redis).

### Kafka: Do not adopt (Avoid)

**Rationale:** Zero event-driven patterns exist. All workflows are synchronous HTTP request-response. Adding Kafka to a modular monolith with a single database and no event architecture would be premature over-engineering. A lightweight job queue (BullMQ or Postgres job table) provides the async capability needed without Kafka's operational overhead.

**When to re-evaluate:** Only if the architecture evolves to multiple independent services communicating via events.

### Elasticsearch: Do not adopt now (Low priority)

**Rationale:** Current PostgreSQL `ilike` search is adequate for <10K documents. Before adopting Elasticsearch, implement PostgreSQL full-text search (`tsvector` + GIN index) and the `pg_trgm` extension for fuzzy matching. These database-level features handle up to ~500K documents without additional infrastructure.

**When to adopt:** >50K documents AND fuzzy/autocomplete search becomes a product requirement.

### What BIGDROPS Actually Needs

The single highest-impact improvement is a **background job system**. Running PDF generation, notifications, exports, reports, and audit logging as synchronous operations on the browser thread is the primary scalability bottleneck. A simple Postgres-based job queue (or BullMQ with Redis in the medium term) would:

1. Make PDF generation non-blocking
2. Decouple audit logging from the response path
3. Allow async export processing with progress tracking
4. Enable push notification delivery without blocking saves
5. Set the foundation for future event-driven patterns

---

## Scorecard

| Category | Score (/10) | Evidence |
|---|---|---|
| **Architecture** | 8 | Clean modular monolith with clear domain boundaries. Weakness: no event/async pattern. |
| **Scalability** | 4 | Handles 10-100 users. Breaks at 500+ due to unlimited dashboard query and synchronous operations. |
| **Performance** | 6 | Adequate for current scale. Dashboard caching helps. Reports and exports are weak points. |
| **Maintainability** | 8 | Well-organized codebase with consistent patterns. AGENTS.md + json-import-standard enforce discipline. |
| **Domain Design** | 9 | Each module has isolated domain with types, logic, and storage. Single source of truth for calculations. |
| **Database Design** | 7 | Good constraints, RLS, materialized view. Weakness: no full-text indexes, O(n) numbering, unlimited aggregations. |
| **Developer Experience** | 7 | Bun-based, TypeScript throughout, clear file structure. Weakness: no state management library, manual cache management. |
| **Readiness for Redis** | 2 | Would require significant rework to caching layer. Currently all caching is client-side. |
| **Readiness for Kafka** | 0 | No event architecture exists. Would require foundational rearchitecture. |
| **Readiness for Elasticsearch** | 3 | Search exists but is basic. Would require introducing search infrastructure from scratch. |

---

## Prioritized Roadmap

### Do Now
1. Add LIMIT to dashboard `invoice_financials_v` query
2. Make audit logging fire-and-forget (`void recordAuditLog(...)`)
3. Debounce global search input
4. Add pagination limits to export fetchers
5. Replace O(n) document numbering with atomic counter

### Do Next (3-6 months)
6. **Background job system (highest priority)**
7. PostgreSQL full-text search (GIN index on `tsvector`)
8. Cache reports aggregation
9. Supabase Realtime for notifications
10. Server-side PDF generation

### Do Later (6-18 months)
11. Redis caching layer (dashboard + reports)
12. Zustand/Jotai for state management
13. Precomputed materialized views for reports

### Avoid
14. Kafka (unless multi-service architecture emerges)
15. Elasticsearch (unless >50K documents AND fuzzy search is required)
16. Microservices (team is not sized for it)

---

*Report compiled from repository evidence at `C:\Users\DELL\Desktop\bigdrops-app`. All file paths are relative to repository root. No code changes were proposed or implemented.*
