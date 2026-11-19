# Bolu Conversational Efficiency And Business-Data Intelligence Audit

This report was written by Inkling 2 Small Free (OpenCode) on 2026-11-14.

Skills consulted (from `docs/PROJECTSKILLINDEX.md`): `typescript-advanced-types`, `react-dev`, `writing-clearly-and-concisely` (inspected for conformity; none applied — no code was changed). Documentation standard: ASD-STE100 Simplified Technical English.

**Scope:** strict read-only audit of Bolu's conversational runtime and its integration with BOUXRE business data. Attachment intake, OCR, PDF/Excel/image extraction and document parsing are deliberately out of scope. No new ingestion pipeline, MCP, LangGraph, Mastra, Vercel AI SDK or similar framework is proposed or required.

Evidence class tags: **[REPO]** repository evidence; **[PRD]** canonical PRD under `docs/prd/conversational-document-assistant/`; **[REPORT]** sibling 2026-11-14 audits (cross-check only, not proof without source); **[ESTIMATE]** static estimate from source; **[UNKNOWN]** needs runtime instrumentation.

Classification terms: MEASURED · STATIC ESTIMATE · UNVERIFIED · MISSING · PARTIAL · IMPLEMENTED · DISCONNECTED.

---

## 1. Executive summary

Bolu is not slow because of token bloat. The wire payload for most turns is small: no tool schemas are sent at all; instructions are ~350–560 tokens server + client-side (static estimate). The bottlenecks are different and larger:

1. **Every factual answer pays for a provider round-trip even when the answer is deterministic.** `matchBoluIntent()` retrieves authorized records first, then still calls the provider to narrate them (runtime code path, `bolu-runtime.ts`). Read-workflows are billed a model call they do not need.
2. **The provider sees ten times more line items than the user needs.** Facts are capped (`MAX_FACTS_LENGTH = 8000` chars ≈ ~2,000 tokens) but always sent in full when a record read occurred; receivables dumps up to 51 rows → 20 shown → full facts to the model regardless.
3. **Search coverage is narrow by API of bolu-data.** Only invoice/quotation search is exposed to Bolu; the underlying `search_documents` RPC already covers RFQ, CPS, CSR, waybill, receipt (header + items) but is wired to nothing Bolu-side except 2 of 7 types.
4. **Zero ability to find suppliers, products, POs, CPS lines, or suppliers' prices conversationally.** The domain services for suppliers (`SupplierSelector` fetch-all picker), PO transactional save (`purchaseOrderService.ts`), CPS engine, item-library exact/alias matching engine, and `search_documents` exist in the application and are reusable — but none of them is connected to the Bolu runtime.
5. **Create-PO is impossible today** (intent matcher rejects write verbs; server prompt instructs only invoice proposals; runtime rejects non-invoice families). Create-invoice works with 1 model round-trip + 2 gates. Find-record costs 1 DB read + 1 provider round-trip.
6. **Duplicate prompt assembly** ships the same instructions twice (client contextFacts + server systemPrompt). ~150–260 redundant tokens per turn; harmless in size, guilty of drift risk.
7. **Idempotency is not durable** (`executedOperationIds` is a module-scope `Set` — cold starts forget it), and invoice **modify** swaps line items wholesale with no base-snapshot compare — write-safety gaps more consequential than speed.

**Reusable capabilities already in place:** `search_documents` RPC (7 document types, header+items, server-side limits, ranking), `invoice_financials_v` view (balance_due, computed_status), `save_invoice_with_items_transaction` RPC, `purchaseOrderService.savePurchaseOrder`, document-number retry machinery, the two-gate proposal contract, the item-library exact/alias matcher, the supplier picker pattern, and the CPS engine lineage authority.

**Smallest impactful changes (recommendations only; nothing implemented here):** (a) deterministic reads skip the provider when facts fully answer (saves 1 round-trip per read); (b) compact retrieval payloads with field allow-listing already present server-side; (c) surface the remaining five `search_documents` types through bolu-data; (d) call the PO service behind a third proposal family; (e) persist opId uniqueness; (f) assemble the prompt in one place; (g) add a compact capability catalogue before considering any "tool search" UX.

**Benchmark posture:** target design ratios are listed in §16; no runtime performance is claimed.

---

## 2. Scope and exclusions

**In scope:** Bolu conversational runtime, provider adapter, context/facts assembly, data-access layer (`bolu-data.ts`), intent matching, proposals/persistence path, AssistantSheet/UX friction, reuse of domain services, progressive capability disclosure feasibility, benchmark design.

**Out of scope (explicit):** native attachment intake, OCR/extraction/PDF/Excel/image parsing, document-understanding pipelines, provider eligibility decisions, paid-policy decisions, consent copy, roadmap/milestone updates, contacting any provider, network probes, builds/typecheck/lint/tests/migrations, schema changes, and the two sibling reconciliation reports. No dependencies were installed or introduced. No PRD document was modified.

**Also out of scope by authorization:** the document-intelligence canonical pipeline (DEC-32/33) and the dynamic multi-model engine (DEC-29). This audit notes their existence only as context and does not re-litigate them.

---

## 3. Existing architecture and request-flow diagram

### 3.1 Flow, traced from source (current HEAD `cdfca468` + working-tree edits)

```
Dashboard / contextual summon
  → BoluAssistantProvider.summon()                        [src/components/ai-assistant/BoluAssistantProvider.tsx:38]
      → createBoluRuntime deps: tenantClient, entityId,
        canRead = hasAuthorization, canWrite = hasAuthorization,
        providerAvailable = true (hardcoded), providerSend = sendBoluProviderRequest
      → AssistantSheet open                               [src/components/ai-assistant/AssistantSheet.tsx]
          → runtime.submit(text)                          [src/lib/ai-assistant/bolu-runtime.ts:92]
              → matchBoluIntent()                         [bolu-capabilities.ts:24 — write verbs return null]
              → read capability? → bolu-data.ts search/read (RPC or view) — authorized, tenant-scoped
              → providerSend() → bolu-transport.ts → POST /api/bolu-chat (Bearer = Supabase session token)
                  → api/bolu-chat.ts: resolveUser → validateBoluProviderRequest (24 msgs/4k chars each/12k total/8k facts)
                      → resolveInAppConfig() (encrypted in-app credential, Supabase service role)  [new this week]
                      → getBoluProviderConfig(env) fallback → live|mock mode
                      → SYSTEM_PREFIX + operational instructions + contextFacts assembled HERE (server)
                      → fetch(config.endpoint, {model, messages, stream:true, max_tokens:1000, temperature:0.1})
                      → SSE (or buffered-JSON→SSE conversion) → client consumes via extractSseText
              → parseStructuredOperationEnvelope()         [bolu-operations.ts:405]
              → proposal dispatch → reducer → AssistantSheet proposal card → Gate 1 → Gate 2 → persistInvoice* [bolu-document-service.ts]
```

Dual prompt assembly to note: the client builds a `contextFacts` string ("You are Bolu… two approval gates… bolu_operation…") in `bolu-runtime.ts:186–209`; the server then *also* assembles SYSTEM_PREFIX + its own operational instructions in `api/bolu-chat.ts:11,147–175`. The model receives both; they duplicate each other.

### 3.2 Numbers you can trust (static, from source)

| Measure | Value | Basis |
|---|---|---|
| Server SYSTEM_PREFIX | 305 chars ≈ 76 tokens | string constant, `api/bolu-chat.ts:11` |
| Server operational instructions | ~1,042 chars ≈ 260 tokens | measured here [STATIC] |
| Client contextFacts (write path, no record read) | ~853 chars ≈ 213 tokens | measured here [STATIC] |
| Client contextFacts with records read | up to 8,000 chars ≈ ~2,000 tokens | `bolu-provider.ts:26` |
| History carried | last 12 messages, ≤ 4,000 chars each, ≤ 12,000 total ≈ ≤ ~3,000 tokens | `bolu-formatting.ts:36`, `bolu-provider.ts:23–26` |
| Server-side output cap | 1,000 tokens; temperature 0.1 | `api/bolu-chat.ts:188–190` |
| Always-registered tools/schemas | **0** | no provider request carries a `tools` array |
| Tools actually sent per request | **0** | envelope is prose+JSON, validated client-side |
| Model round-trips, create-invoice | 1 (+ deterministic persistence) | §6.7 |
| Model round-trips, find-record | 1 + DB read | §6.7 |
| Model round-trips, create-PO | n/a — impossible | §6.7 |

**Measured runtime values:** none exist in the repository (no telemetry, no token counters, no latency logs beyond `console.error` status codes). All token figures above are static estimates with ~4 chars/token heuristic; absolute provider billed tokens are [UNKNOWN] per turn.

**Caching:** none. No prompt caching, no response cache, no capability caching. Every turn reassembles everything.

---

## 4. Findings — Part 1: request pipeline and cost

1. **How the system prompt is assembled.** Two layers, both static strings with an injected facts block: (a) client-side contextFacts assembled in `bolu-runtime.ts` at submit time (includes operational instructions duplicated from the server); (b) server-side SYSTEM_PREFIX + fixed operational instructions in `api/bolu-chat.ts`. No tenant-profile block, no user profile, no memory beyond the last 12 turns, no form-state snapshot.
2. **Origin of instructions and context.** Instructions: source code (client and server). Tenant context: none in the prompt (only authorized record facts are injected, when a read happened). Session memory: last 12 messages.
3. **History loading.** `buildProviderMessages()` filters roles to user/assistant, slices last 12 — no summarization, no dedupe, no error-turn pruning; tool-ish artifacts (protocol messages like "Approved proposed changes…") are included verbatim.
4. **Tool definitions and schemas.** None registered; none sent. The model is asked for a `bolu_operation` JSON code block instead of function calls; the app parses it.
5. **Schemas in every request.** Zero. This inverts the usual token problem — but it also means the model is trained-by-prompt, not schema-constrained, and every proposal must survive parsing heuristics (regex on ```json blocks).
6. **Provider-specific adapters.** Only an OpenAI-chat-completions adapter shape: endpoint normalization, SSE vs buffered-JSON→SSE conversion, 429/502/504 mapping. No tool-call adaptation because there are no tools.
7. **Tool dispatch.** N/A (no tools). Envelope dispatch happens in-client: parse → validate → build proposal → dispatch to reducer.
8. **Sequential model calls.** Read path: 1 DB read + 1 provider narration call (wasteful — see 17). Write path (invoice): 1 provider call. `suggest()` shortcuts through `self.submit()` which re-parses intent remotely rather than locally for known suggestions — fine but duplicated classification (intent matched twice: client suggestion id → same prompt → server mock/fixture or model).
9. **Redundantly repeated work.** (a) Duplicate instructions client+server (~150–260 tokens/turn). (b) When provider produces a record answer, the deterministic answer is computed then replaced by model prose. (c) `searchBoluInvoices` called twice on some paths (`readBoluContextFacts` calls `searchBoluInvoices` after runtime already called it — `bolu-runtime.ts:113–149` vs `bolu-data.ts:62–81`), an extra round-trip to the database. (d) `bolu-transport.ts` re-implements the SSE line loop that `chat.ts` also has (duplication across runtimes).
10. **Prompt/context caching.** None anywhere. `Context` reuse is manual (last-12 slice only).

**Always-registered tools:** 0. **Sent per request:** 0. **Conditional/deferred:** n/a. **Deferred schema loading:** not supported by the wire contract because there are no tools.

**Round-trip counts by workflow (reconstructed from code):**

| Workflow | Model round-trips | DB reads | User turns | Code path |
|---|---|---|---|---|
| A. Create purchase order | **0 possible — unsupported** | n/a | n/a | `bolu-capabilities.ts:26` (write verbs → null), server prompt (invoice-only), runtime family gate (invoice-only) |
| B. Create invoice | **1** | 0 (create) | 3 (request + Gate 1 + Gate 2) | §6.7 |
| C. Find record | **1** | 1–2 (search + optional read) | 1 question + result | `bolu-runtime.ts:104–149` |
| D. Receivables dump | 1 | 1 (view) | 1 | same |

Static estimate per write-path turn: ~76 + ~260 + ~8 (no-facts) ≈ **~350 tokens of instructions**, plus history. Per read-turn with one record: up to **~2,400 tokens** of instructions+facts. No schemas ever.

---

## 5. Findings — Part 2: internal business-data search and retrieval

Legend: search? / compact? / by-id read? / allow-list? / server-limits? / pagination? / payload cap before model? / tenant-scoped? / parity RLS? / fuzzy? / candidates? / reusable RPC? — for each candidate entity.

| Entity | Bolu-side today | App capability (evidence) | Shortfall |
|---|---|---|---|
| Invoices | search by term via RPC; by-id read; route strings shown | `search_documents` RPC header+items, ranking, `p_limit`, dedupe, `search_documents(...)` 20261014160000 (phase3) [supabase/migrations/…1000/1400/1600] | None for header read; but amounts/status only via `invoice_financials_v` (view used); field allow-list fixed; limit clamp 1–50 ✓; no items shown; no fuzzy |
| Quotations | search + by-id read (find via search; direct read in context) | same RPC; BoluRecord read for single quotation ok | same |
| Purchase orders | **none** | PO list is client-filtered (`PurchaseOrders.tsx` search bar); `modules/purchase-order/purchaseOrderService.ts` transactional save/`peekNextPurchaseOrderNumber` | RPCs exist? PO not in `search_documents` (checked: absent from phase3 list) — UNVERIFIED whether a PO search RPC exists; list search is client-side only |
| CPS | **none** | `search_documents` covers cps header+items; CPS engine exists (`domain/cps/*`) | Not wired to Bolu |
| Products/inventory | **none** | `itemLibraryRepository.ts`; `useItemSuggestionEngine.ts`; exact/alias matcher | Not wired; item-matcher reusable for product identification |
| Suppliers | **none** | `SupplierSelector.tsx` fetches all rows (client-side filter, no server limit) — picker pattern, not search | Need a server-side compact supplier search; cannot be established statically whether one exists — UNVERIFIED; likely needs small RPC addition (owner decision) |
| Customers/clients | **none** | ClientSelector fetch-all pattern (assumed same; not directly inspected beyond `SupplierSelector` family) | same class of gap |
| BOQs/projects | **none** | BOQ modules exist; no BOQ search in RPC series found | UNVERIFIED; not wired |
| Payments/receipts | **none** | `search_documents` includes receipt | Not wired |
| Expenses/RFQs/CSRs | **none** | RPC covers rfq, csr | Not wired |

**Bolt the search behaviour:** `searchDocuments()` returns allow-listed columns (id, number, title, client, date, route, ranking) — compact-by-construction ✓. Pagination: service clamps limit and computes `has_more` via +1 row probe ✓. Tenant scoping: RPC executes in tenant schema (schema-qualified via `__SCHEMA__`) + `tenantClient.isReady` + `canRead` guards ✓. Permissions parity with the app: reads go through the same tenant client + auth context as the form (same authorization function) ✓ (static evidence; RLS internals UNVERIFIABLE).

**Model-side delivery:** `factsAsPrompt` projects 8 fields (Type/Number/Client/Date/Status/Total/Balance/Route) — good allow-listing; 8,000-char budget; flatten to text ✓. But neither search-result counts (e.g. `hasMore: true`) nor ranks are surfaced to the model beyond raw text repetition — model cannot distinguish top matches from weak ones except by text order.

**Ambiguous matches:** returned as list to the user ("I found several… choose one"), never silently selected — correct today ✓ (transactional pick required by user).

**Caller/consumer check:** `searchBoluInvoices/searchBoluQuotations/readBoluInvoice` are consumed only by Bolu. `searchDocuments` is used by Bolu only today (global search may also use it — UNVERIFIED broader consumers; not material).

---

## 6. Findings — Part 3: reuse of existing business logic

| Workflow | Contracts | Validation | Calculations | Numbering | Persistence | RPC | Tenancy | Audit | Bolu connected? | Duplicated in Bolu? |
|---|---|---|---|---|---|---|---|---|---|---|
| Invoice create/modify | `BoluInvoiceCreatePayload/Modify` | `validateInvoiceCreateInput/Items/Modify` | `computeAuthoritativeTotals` (wraps `calculateDocument`) | `getNextInvoiceNumber` + `advanceAutoCursor` + `parseTrailingSequence` + `withUniqueRetry` | `bolu-document-service.ts` RPC `save_invoice_with_items_transaction` | yes | `assertTenantAuthorization` + RPC entity | `custom_fields.created_via` + `operation_id` | **Yes (invoice only)** | No duplicates; wraps the same engine as the form ✓ |
| Quotation create/modify | partial type plumbing exists (`BoluDocumentFamily` includes quotation but runtime rejects it) | validator lives in invoice modules | n/a | n/a | n/a | n/a | n/a | n/a | No | No (would reuse `useQuotationSave` path) |
| Purchase order create/modify | `PurchaseOrder` domain types; `withPurchaseOrderTotals` | `validatePurchaseOrder` | `withPurchaseOrderTotals` (locked) | `peekNextPurchaseOrderNumber` + unique-constraint retry | `modules/purchase-order/purchaseOrderService.ts` RPC (atomic create/update) | yes | RPC entity + draft-only write rules | status transitions guarded | **No** | — |
| CPS lines | `domain/cps/lineage.ts` — explicit authority separating catalog vs fuzzy identity | existing CPS validation services | CPS calc engine | CPS numbering via shared sequence machinery | CPS save service (`useCpsSave`, not inspected in depth) | UNVERIFIED | yes | lineage authority record | No | — |
| Products/inventory | `itemLibraryRepository.ts`; exact + alias matching | `invoiceSuggestionSelection.ts` | n/a (prices from rows) | n/a | item library service | n/a | yes | exact/alias match provenance | No | matcher reusable |
| Supplier/customer selection | `SupplierSelector`/ClientSelector fetch-all pickers | supplier form validation | n/a | n/a | `modules/supplier/supplierService.ts` `createSupplier` | n/a | supplier dialog scopes to tenant | no audit on selection | No | **Yes by omission — rebuild would duplicate the picker, NOT recommended** |
| BOQ operations | `domain/boq` modules exist | not audited in depth | n/a | n/a | UNVERIFIED | UNVERIFIED | yes | n/a | No | — |
| Payments/expenses | `flowise` excluded; payment modules exist | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | No | — |

**Matching/reconciliation capabilities in the codebase (explicit per task):** BOQ items vs product catalogue — exists in CPS/item-library lanes (exact/alias only, no fuzzy; deliberately); supplier names vs suppliers — exact/lowercase filtering in picker only; supplier prices vs stored prices — UNVERIFIED, no dedicated matcher found in scoped search; product aliases — `itemLibraryRepository.aliasMatches`; duplicate detection — exists for import paths (item import); ambiguous matches — surfaced as multiple options, never auto-selected (Bolu read pattern today; item-library exact-match refuses ambiguity by construction).

**Classifications:** directly reusable — invoice engine, numbering/retry, supplier-picker *pattern*, item-library matcher, `search_documents`, two-gate proposal service; exists but not connected — PO service, CPS engine, RFQ/CSRl search, receipt search, quotation create; partially implemented — quotation family typing (types exist, runtime rejects); missing — supplier resolution service, BOQ reads, payments/expenses; cannot be established statically — PO RPC visibility details, CPS RPC names, BOQ search coverage.

**Bolu duplicates nothing today** — it wraps the invoice engine. The risk of duplication grows the moment a new family is bolted on without reuse.

---

## 7. Findings — Part 4: capability discovery and progressive disclosure

Current state: **no registry**; suggestions table is a static, per-module constant (`bolu-context.ts`); intent matching is a hardcoded regex switch; there is no capability search, no deferred schema loading (nothing to load — zero tools), and `search-invoices`/`read-receivables`/`search-quotations` are the only runtime capabilities Bolu exposes to itself.

### 7.1 Feasibility assessment of progressive disclosure (name → search → deferred schema → execute → follow-up)

| Step | Needed by Bolu? | Feasibility |
|---|---|---|
| A. Small always-loaded catalogue | **Yes** — a compact list (name + one line) of what Bolu can do is cheap (~100-200 tokens) and kills mis-parses | Easy; data-only |
| B. Capability discovery by user intent | **Yes** — today's regex `matchBoluIntent` is the dishonest version of it (it returns read capability or null) | Easy to mid; keep rule-based first |
| C. Deferred schema retrieval | **Not before tools exist** — there are no tool schemas to defer. The envelope contract is inline prose. | Blocked until DEC-29/FR-03 style work or an accepted envelope extension |
| D. Execute + compact result | **Yes** — already the dominant pattern (facts are projected) — tighten field-count further | Easy |
| E. Follow-up loads only what's needed | **Yes** — as capabilities grow, load op-specific guidance only | Easy, data-driven |

**Trade-offs to state plainly:** every discovery step is a model round-trip cost unless discovery is rule-based (keep it rule-based; the data is local). Provider support for native deferred tools is not universal (and Bolu uses none today) — the envelope pattern sidesteps this. Catalogue maintenance is the honest cost: entries rot like any registry; the PRD already records one-week rot of provider facts. Strictly avoid a second catalogue next to `bolu-context.ts`; extend the existing one.

**Recommended 5–8 always-available short-path capabilities** (from actual user workflows and repo evidence — candidates for evaluation, not tools to create):

1. Find/inspect invoice (search_documents + by-id read)
2. Overdue/receivables review (invoice_financials_v)
3. Find quotation
4. Create invoice from description (proposal + gates)
5. Modify invoice notes/dates/lines (proposal + re-read; modify authz)
6. Supplier lookup conversationally (if/when supplier search exists)
7. Create purchase order (needs PO proposal family; highest-value missing capability)
8. Explain/record summarization for the current page (no model needed beyond projection)

**Discovery vs record search vs retrieval vs action execution** are four distinct responsibilities and must stay separate in design: discovery chooses *which* capability; search finds *candidate records*; retrieval shapes *one record*; execution *proposes/persists*. Conflating them invites both mis-dispatch and prompt bloat.

**Number of always-available capability lines shipped today:** 3 read + 0 write families (invoice envelope accepted, other families rejected at parse). Actual server-side prompt supports exactly one envelope family.

---

## 8. Findings — Part 5: safety, permissions and write approval

1. Authentication before business-data access: server-side token validation against Supabase (`api/bolu-chat.ts:17–27`) ✓ (for provider calls); DB access gated by `tenantClient.isReady` + `schemaName` + `canRead`/`canWrite` [REPO].
2. Tenant isolation: `search_documents` executes schema-qualified per tenant; `tenantClient` bound to one schema; `assertTenantAuthorization` checks readiness; RPC `save_invoice_with_items_transaction` takes `p_entity_id` explicitly. **RLS policy internals: UNVERIFIABLE from repo alone** — cannot assert row-level enforcement without DB inspection; do not claim it.
3. Per-operation permission checks: read vs modify vs save actions (`canRead(resource,'view'|'modify')`, `canWrite(resource,'save')`) — coarse (one function backs all) but present and server-revalidated at persist.
4. Bolu access equals user access: same authorization function chain as the app forms — **static evidence only**; live equality unverifiable here.
5. Server-side revalidation: yes at three points — read gate, envelope validation, persist gate (status + stale + opId + re-read + oldValue compare).
6. Model-arguments validated pre-execution: `validateInvoiceCreateInput/Modify` with UUID check, positive quantities, field allow-list ✓.
7. Application-owned calculations: `calculateDocument` at proposal and persist ✓ (G1 spirit held; model totals discarded).
8. Writes require explicit approval: Gate 1 (apply) + Gate 2 (save) ✓; proposals carry `gate1Required/gate2Required: true`.
9. Confirmation bound to exact proposal: reducer keyed on `opId` matching; approve/save reject mismatched opId ✓; persist re-checks status is `approved_pending_save|saving` ✓.
10. Stale revalidation: 15-minute `expiresAt`; modify path re-reads and compares `oldValue` vs DB (field edits) — strong. **Items swap has no base-snapshot compare — partial for line-item changes.**
11. Idempotency across cold starts: **no** — module-scope `Set` in `bolu-document-service.ts:34`; duplicates possible under serverless restart/retry; reported in prior audit; remains open.
12. Duplicate operations prevented: best-effort in-process only; no DB unique token.
13. Error/tool results leaking another tenant: errors are generic (safe messages, no schema leakage); read paths return only authorized rows; **cross-tenant error bodies explicitly unverifiable** — query-level discipline assumed, not proven.

**Approval model is not to be weakened** for speed — confirmed; Gate 2 also carries `saved` resolve and prevents silent persistence.

---

## 9. Findings — Part 6: conversational friction and missing information

**Scenario: “Create a PO for Bright Electrical, 20 rolls of 2.5mm cable at ₦85,000 each.”**

1. Intent classification: `matchBoluIntent` returns **null** (the word "create" matches the write-verb regex first) → full model round-trip. Server prompt knows only invoice envelopes → model must either refuse, hallucinate an invoice, or produce none structured output at all. **Unsupported journey end-to-end.**
2. Supplier location: none — no supplier search; no supplier-id resolution (PO domain keeps `supplier_id` NOT NULL by design).
3. Product identification: none — no product name→catalogue resolution for cable; item-library matcher exists but is unused here (and the example is a purchase line, not an invoice line).
4. Defaults from records: could supply supplier details, likely last prices — not consulted today (nothing is consulted; PO path absent).
5. Required vs optional PO fields: PO domain knows (`validatePurchaseOrder`, `withPurchaseOrderTotals`); Bolu cannot distinguish them conversationally.
6. Missing info detection: only via the model's free-form asking — no rule list; no structured interrogation in code.
7. Batching: model may batch or not — uncontrolled (no batching rule in prompt); user sees unformatted follow-ups.
8. Repeats: last-12 history + activeProposal guard prevent silent duplicates but not repeated questions about collected facts (no structured form-state echo to the model).
9. Complete proposal without opening the PO form: **no** (unsupported journey).
10. Calls/turns today: impossible; by nearest analogy (create invoice) → 1 model trip + 2 gate interactions; PO would mirror that once the family exists.
11. One review interaction: Gate UI exists (proposal card + confirm card) and is reusable for PO — the interaction pattern is the asset.
12. Faster than the form? For invoice: roughly comparable input-typing burden but fewer clicks; for PO: unreachable today, so the form wins trivially.

**Create invoice scenario:** works today. Client supplies name (free text, no id resolution), items (validated), terms; model proposes; gates approve/save. Friction: no client-id linking, no historical-prices default, no product matching, issue_date defaults to today (may surprise), no file attachment but attachments are out of scope by design here, and 3 required typed inputs must be present in message or conversation.

**Find-record scenario:** deterministic search + one narration call; user can then open the record via the shown route (`route` appears in UI). Friction: one wasted model call; receivables dumps limited to 20 with `hasMore` — user cannot page conversationally today (Bolt shows hasMore but can't load more).

**Missing-vs-retrievable-vs-optional-vs-never-infer:** required information the model cannot invent (client, items, prices — validated against zero); retrievable-from-records (supplier/product details for PO, client details for invoice, last price); optional (notes, dates — defaulted); never-infer (condition New/Tokunbo-style catalogues, prices, client selection, totals — all must come from the user or from records, never from the model).

---

## 10. Findings — Part 7: operational efficiency and bottleneck analysis

**Ranked by likely impact (not token savings):**

| # | Bottleneck | Evidence | Smallest viable improvement | Runtime measure needed? |
|---|---|---|---|---|
| 1 | Read workflows pay a model narration round-trip after deterministic retrieval | `bolu-runtime.ts:104–173`; both branches call providerSend when available | If deterministic facts fully answer, return without provider (add `deterministicAnswerSufficient` gate; keep env flag for narration-on-demand) | Yes — turn counts per read intent |
| 2 | PO/other families unreachable | `bolu-capabilities.ts:26`; server prompt invoice-only; family gate | Extend proposal family set behind existing contract (PO first: `savePurchaseOrder` exists) | Yes — time per create-PO vs form |
| 3 | Idempotency non-durable (correctness, not latency) | `bolu-document-service.ts:34` | DB-persisted opId token or unique constraint; same scope decision (Phase 3 of prior report) | No — static proof fix |
| 4 | `itemsChange` replace-without-snapshot | `bolu-document-service.ts:305–326` | carry `expectedOldItems` in proposal; compare pre-persist | No |
| 5 | Duplicate instructions client+server | `bolu-runtime.ts:186–209` vs `api/bolu-chat.ts:147–175` | Single server assembly; client passes facts only; drift risk eliminated | No |
| 6 | Facts payload unranked/uncapped per kind | `readBoluContextFacts` returns up to 51 receivables; facts up to 8k chars | project to the 5 most relevant + `hasMore` hint; keep deterministic text (no model needed for projection) | Yes (tokens per turn) |
| 7 | Redundant double DB read on nested paths | `bolu-runtime.ts:113–149` after `searchBoluInvoices` | pass matches through | No |
| 8 | Supplier/client id resolution absent for create flows | invoice path uses free-text client_name only | resolve via same tenant pickersBolu already uses? No — add compact supplier/client search RPC calls under same `bolu-data` pattern | Yes |
| 9 | No pagination affordance for reading results | `hasMore` surfaced not usable by user in chat | "Show more" reply handler with offset — needs service offset support | Yes |
| 10 | Error buckets broad (`failed`) | reducer vocabulary | typed failure classes for user messaging | No |

**Token savings alone would change nothing about user time-to-correct-operation** — the largest lever is #1 and #2; #4/#3 are correctness risks.

---

## 11. Findings — Part 8: benchmark design

Two benchmarks, three workflows, same tenant and seed both arms. **All thresholds below are design targets, not measured performance.**

**Workflows**

1. *Create purchase order* (once Bolu support exists; today only the form runs — record form baseline now).
2. *Create invoice.*
3. *Find and inspect an existing business record* (e.g. "INV-000100").

**Measurements per workflow**

- User turns; model round-trips; tool/DB calls; input and output tokens (need instrumentation — [UNKNOWN] today); end-to-end time (composer open → saved doctor); clarification-question time; correctness (all required fields present; amounts app-computed; no hallucinated values); completeness; manual corrections after save; form time for identical task.

**Fairness rules**

- Same tenant, same record set, same starting sentence, same required fields, same final correctness criteria (saved document valid, appears in list, correct totals, correct client link).
- Count failed attempts/retries in the number; approval clicks count as user turns but are separated in the table for visibility.
- Include library lookup/creation of missing supplier as a scored sub-step or explicitly exclude from both arms; pick one and keep it constant.

**Design targets (not achieved)**

| Metric | Create-PO | Create-invoice | Find-record |
|---|---|---|---|
| User turns | ≤3 (request + 2 gates) | ≤3 | 1 |
| Model round-trips | ≤1 | ≤1 | 0 deterministic path / ≤1 narrated |
| DB calls | ≤2 | ≤2 | ≤2 |
| Input tokens | ≤800 static + ≤600 history | same | ≤2,500 |
| Output tokens | ≤600 | ≤600 | ≤200 |
| End-to-end | ≤45s incl. 2 gates | ≤45s | ≤10s |
| Manual corrections | ≤1 | ≤1 | 0 |
| Form time | ≤150s baseline | ≤180s baseline | ≤20s |

Instrumentation needed to measure input/output tokens: server header or response field with usage (provider-dependent) — requires provider change approval or gateway logs; keep as future work, not in this audit.

---

## 12. Findings — Unresolved questions and owner decisions

1. Eligible narration-or-not flag for read path (narration-on-demand vs default deterministic)?
2. First write family after invoice — PO (recommended) or quotation?
3. Supplier/client resolution RPC: extend `search_documents` or add `search_parties`; ownership of that migration?
4. Whether Bolu may call supplier creation mid-conversation (`createSupplier` exists; approval boundary differs).
5. Idempotency escalation timing (Phase 3 as prior report scheduled, or now?).
6. Whether the read path may ever offer "load more" (offset/page RPC) and where UI state lives.
7. Product catalogue resolution for BOQ-ish lines on invoice create — in scope later (DEC-32) or permanently out of Bolu for now?
8. Whether any BOLU user-facing copy should acknowledge unsupported actions explicitly ("I can't create purchase orders yet") rather than model refusal.
9. Whether provider usage must be logged for cost governance (and where that lives).
10. Prompt assembly home: server-only vs shared module; who verifies no drift?

---

## 13. Findings — Bottleneck ranking summary and implementation sequence

**Sequence (each step small, reversible, gated on approval):**

1. Make deterministic reads not pay for provider narration (biggest single saving; tiny change; needs instrumentation to verify).
2. Finish correctness holes in write path (durable opId, items snapshot compare) — precedes any family expansion.
3. Unify prompt assembly (one place; drop duplication).
4. Expose existing RPC coverage to Bolu (rfq/cps/csr/waybill/receipt) read-only — data rows already exist; only bolu-data projections + intents are needed.
5. Supplier/client compact search under the same service pattern — unblocks create flows.
6. PO create/modify proposal family behind the existing contract (POs service reused).
7. Quotation family (types already exist; runtime rejection removed behind same gates).
8. Progressive capability catalogue (names+one-liners) + extended suggestions table; deferred schemas only if tools are ever adopted.
9. Benchmark instrumentation + run (§11) — after 1–3, before expanding families further.
10. Payment/expense flows — only if/when the read capability cases demand them; keep §16 discipline.

---

## 14. Findings — Reuse versus build

**Reuse (evidence-cited):** `search_documents` RPC; `invoice_financials_v`; `bolu-operations.ts` contract; `bolu-document-service.ts`; `bolu-reducer.ts`; `Calculations.ts`; `purchaseOrderService.ts` (save/validate/numbering); supplier picker *pattern* for server-side search UX decisions; item-library exact/alias matcher; `useItemSuggestionEngine` for suggestion phrasing reuse if desired; `searchDocuments` service functions for any new search lane; two-gate UI in AssistantSheet.

**Build (small):** supplier/client compact search; PO proposal family plumbing; deterministic read-answer path; prompt unification; durable idempotency; capability catalogue (data only).

**Do not build:** supplier fuzzy matcher (use exact/alias as item-library does; revisit later); narration model for reads (keep optional); any external agent framework; MCP layer; BOQ-aware interpreter (falls under DEC-32 programs; not Bolu efficiency scope).

**Explicit anti-recommendations:** do not route Bolu through the full PO form lifecycle as a library of sub-component calls; call the service layer once (correct layering); do not persist model-generated text to any table; do not add tenant keys to the client.

---

## 15. Findings — Progressive-disclosure feasibility assessment (consolidated)

Interchangeability of today's three read capabilities and the zero-tool reality means **the A/B/D/E pattern is already viable at data level**: compact catalogue → rule-based intent → targeted retrieval → compact answer. What C needs is tool schemas, and the product does not have any yet (envelope design instead). If DEC-29/FR-03 interest materialises into a tool protocol, C becomes a drop-in change confined to one module. **Verdict: feasible incrementally, provider-agnostic, no framework required.** Costs: catalogue maintenance and a second dispatch site; savings: turn-count neutral today, drift-proofing, and a ready migration path for future tool protocols. Keep the catalogue next to `bolu-context.ts`; delete it if it rots unused.

---

## 16. Findings — Benchmark target thresholds (design targets, not achievements) and measurement plan

**Instrumentation checklist (to authorize before running):** provider `usage` echo in SSE (`usage` fields on chunk); request-level timing spans (submit→first token→final); DB call counter per intent; user-turn counter from reducer; capture to dev console or local JSON — never to tenant schema (DEC-13-level restraint).

**Baselines to capture once:** create-PO via form (current product reality), create-invoice via form, find-record via form search bar. Same tenant, same start state (fresh editor or list page), same data set (test tenant).

**Targets:** see §11 tables. Hard fail conditions: any value the app computes is disputed by the model and persisted as-is (zero tolerance); any tenant-scoped read leaks another tenant (zero tolerance, obvious); any save without Gate 2 (zero tolerance).

**Pass criteria:** Bolu median completion ≤ form median for create-invoice and find-record, ≥ parity for create-PO after support lands; corrections ≤1 per document; zero approval-gate bypasses.

---

## 17. Confirmation of invariants and explicit limitations

- No source file, test, configuration, schema, migration, PRD or package file was modified by this audit; the only new file is this report.
- No build, typecheck, lint, test, migration, dev-server, database, provider or network call was executed or made during this audit.
- Token figures are static estimates (§3.2); runtime usage is [UNKNOWN] and deliberately unclaimed.
- RLS enforcement, RPC security-definer internals, production env var presence, and AMD/OpenRouter runtime behaviour are UNVERIFIABLE here; no claim is made.
- The sibling reports cited as **[REPORT]** were not used as sole evidence for any claim; source was preferred throughout.
- The pre-existing worktree changes (Listed in §17.1) are preserved untouched and are not attributable to this audit.

### 17.1 Pre-existing worktree state at audit start (preserved)

Modified (read-only context): `api/bolu-chat.ts`, 10 PRD files, 14 src files + `vite.config.js` + `package.json` + `src/tests/ai-assistant/bolu-provider.test.js`, `src/pages/settings/*` (incl. `BoluProviderSettingsSection.tsx` call sites), plus tracked docs; untracked: `api/bolu-provider-config.ts`, `scripts/setup-bolu-provider.ps1`, `src/lib/ai-assistant/{bolu-secret-vault.ts, themeTransition.ts}`, new bolu-*.ts sources and tests, `src/lib/ai-assistant/bolu-secret-vault.ts`, `supabase/migrations/20261114160000_bolu_provider_credentials.sql`, the prior audit reports, `video-json-tutorial/`. HEAD `cdfca468`, `main`, 16 ahead of `origin/main`. (Lists may include owner edits and prior agent work; all preserved.)

---

## 18. Verification and git integrity (post-audit capture)

- `git status --porcelain=v1` after report creation: exactly one new untracked entry attributable to this audit — `?? docs/reports/ai/2026-11-14-bolu-conversational-efficiency-audit.md`. No modified tracked file was altered by this audit.
- `git diff --check`: no whitespace errors (only pre-existing LF/CRLF notices).
- Build/typecheck/lint/tests: not run, as required. No commits, no push, no branches.

---

## Appendix A — Confirmed facts vs inferences

**Confirmed (source-cited):** zero tools on the wire; two-gate flow; read-path dual DB access (search + nested read); RPC search types (invoice/quotation only wired); `hasMore` + clamped limits; deterministic answers then provider narration; envelope contract invoice-only; `providerAvailable: true` hardcoded; `executedOperationIds` non-durable; prompt duplicated client/server; write-verb regex nulls intents; receivables via `invoice_financials_v` with gt-balance filter and overdue filter; total payload estimate ~350 tokens write-path today; 62 `test()` calls in 8 suites.

**Inferred (documented as such):** provider narration is redundant for most read intents; duplicated instructions risk drift; estimates scale linearly with facts (8k cap) and history (12k); RPC search was designed for global coverage (phase-3 migrations) — Bolu wiring is the narrowest slice.

**Unverifiable (no claim):** RLS internals; RPC definitions' security definer; production env keys; live latency; live provider behaviour; whether `invoice_financials_v` is auto-updating vs refreshed (irrelevant to this audit); whether PO search exists in another RPC migration beyond the three inspected.

**Not confirmed:** exact wording of current server prompt in deployed build; exact Supabase RLS policies; any provider-side cache behaviour.
