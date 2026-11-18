# Bolu Application-Side Reconciliation Against The Document-Intelligence PRD

This report was written by Inkling 2 Small Free (OpenCode) on 2026-11-14.

Task: BOLU APPLICATION-SIDE DOCUMENT-INTELLIGENCE RECONCILIATION AUDIT.
Strictly zero-code audit. Nothing in the application, tests, configuration, schema, migrations, PRD or roadmap was modified by this audit. The only file created by this audit is this report.

Skills consulted (from `docs/PROJECTSKILLINDEX.md`): `typescript-advanced-types`, `react-dev`, `writing-clearly-and-concisely` (inspected for conformity; none applied, because no code was changed). Documentation standard: ASD-STE100 Simplified Technical English.

Report location and filename: this repository's established reporting convention is `docs/reports/ai/<YYYY-MM-DD>-<topic>.md` (see the three sibling 2026-11-14 reports cited in §14). This report follows that convention. The earlier two audit reports from this working session live at `docs/reports/2026-11-14-*.md`; on this case-insensitive filesystem `docs/Reports/` resolves to the same directory. No new reporting directory was created.

Evidence class tags:
- **[REPO]** — this repository, statically inspected 2026-11-14 (HEAD `cdfca468`, branch `main`, 16 commits ahead of `origin/main`).
- **[REPORT]** — sibling structured reports under `docs/reports/ai/` created by prior tasks today. Used for cross-checking only; not treated as proof without source inspection.
- **[PRD]** — the canonical PRD set under `docs/prd/conversational-document-assistant/`.

Classification vocabulary (per task §C.4): IMPLEMENTED · PARTIAL · MOCK-ONLY · FRONTEND-ONLY · DISCONNECTED · MISSING · OBSOLETE · UNVERIFIABLE.

---

## 1. Executive summary

**Overall application readiness:** the Bolu application today is a read-path assistant plus an **invoice create/modify proposal pipeline that is genuinely wired to a live server-side provider boundary and to real persistence** — but it contains **zero document-intelligence capability**. There is no intake, no extraction, no normalization-from-source, no evidence classification, no matching, no canonical objects, no provisional-versus-verified amounts, and no workflow lifecycle. The canonical architecture (DEC-32/DEC-33, FR-34 to FR-41) describes a product this codebase does not start to contain yet. What exists is the strongest possible substrate for it: a typed two-gate proposal contract, application-owned arithmetic, transactional persistence with idempotency measures, and authorization-gated reads.

**Main reusable assets:** (1) the two-gate proposal lifecycle (`BoluOperationContract` + `bolu-reducer.ts` + AssistantSheet gate cards); (2) the deterministic `calculateDocument` lock (`bolu-operations.ts` → `Calculations.ts`); (3) the transactional persistence path (`bolu-document-service.ts`) with collision-safe numbering, compensating rollback, and re-read/revalidation; (4) the mock fixture provider for contract tests; (5) 62 in-repo `test()` calls across 8 suites covering the contract boundaries.

**Most consequential gaps:** all six canonical objects (SourceDocument, ExtractedObservation, NormalizedItem, MatchCandidate, Calculation-as-a-record, ReviewDecision) are missing or only trivially shadowed by proposal constructs; evidence classification does not exist; the workflow lifecycle is unrepresented; attachment intake is absent; the solar-pump BOQ acceptance case cannot be expressed in the current type system.

**Can implementation safely begin?** Yes — after decisions, not before. The safe first milestone is **DI-3 (canonical contracts + evidence classification + workflow status as types and pure functions)**, then **DI-1/DI-2 (intake + extraction interchange)** behind a feature lane, then **DI-4/DI-5/DI-6** (matching, calculation records, gates over intelligence proposals), then **DI-8** (acceptance suite). The two-gate boundary must be reused unchanged; nothing about DEC-28/DEC-29/DEC-30/DEC-34 is weakened. Before write-capable document-intelligence workflows ship to tenants, the two-gate + idempotency + post-apply revalidation design must extend to the new lanes with the same rigor, and live-provider production verification (token custody, terms approval, E2E RLS) must be complete.

**Priority callout.** The live-provider activation report claims test suites that do not exist on disk (`bolu-reducer.test.js`, `bolu-calculations.test.js`, `bolu-document-service.test.js`, `bolu-mock-provider.test.js`, `bolu-security.test.js`, `bolu-ui-flow.test.js`); the existing 8 suites hold 62 `test()` calls with counts redistributed across real files [REPO]. The total happens to match; the suite roster does not. Reports must cite present files, not invented ones.

---

## 2. Audit scope and methodology

### 2.1 Directories and components inspected

- `src/lib/ai-assistant/` — `bolu-operations.ts`, `bolu-reducer.ts`, `bolu-formatting.ts`, `bolu-mock-provider.ts`, `bolu-document-service.ts`, `bolu-runtime.ts`, `bolu-provider.ts`, `bolu-transport.ts`, `bolu-data.ts`, `bolu-capabilities.ts`, `bolu-context.ts`, `protocol.ts`, `chat.ts`, `providerCatalog.ts`, `providerRegistry.ts`, `keys.ts`
- `src/components/ai-assistant/` — `AssistantSheet.tsx`, `BoluAssistantProvider.tsx`, `DashboardAssistant.tsx`
- `api/bolu-chat.ts`
- `src/tests/ai-assistant/` — all 8 suites
- `docs/prd/conversational-document-assistant/` — `Readme.md`, `functional-req.md`, `architecture.md`, `decision-log.md`, `Waterfall-roadmap.md`, `risk-register.md`, `test-plan.md`, `provider-catalog.md`, `roadmap.html`
- `docs/reports/ai/` sibling reports (live-provider activation, AMD security audit, milestone close-out, PRD roadmap reconciliation, prototype audit, PRD compliance audit)

### 2.2 Canonical records reviewed

- DEC-28 (Bolu direction), DEC-29 (dynamic engine), DEC-30 (mock-boundary operations pipeline), DEC-32 (universal document-intelligence contract), DEC-33 (attachment intake + external-AI interchange), DEC-34 (server-side provider adapter), DEC-35 (AMD compatibility) — `[PRD: decision-log.md]`
- FR-34 through FR-41, FR-01…FR-28 dispositions — `[PRD: functional-req.md]`
- DI-1…DI-8, DI-01…DI-25, DI-A…DI-E — `[PRD: Waterfall-roadmap.md §21; test-plan.md §11]`

### 2.3 Method

- Static inspection only. No build, no typecheck, no lint, no tests, no runtime, no migrations, no provider or database calls.
- Call paths traced from entry points (`AppShell` → `BoluAssistantProvider` → `BoluAssistantProvider.summon` → `AssistantSheet` → `runtime.submit` → envelope parse → proposals → gates → `persistInvoiceCreation|Modification`).
- Definitions distinguished from runtime usage; mock/fixture behaviour distinguished from the production call path; type-only claims distinguished from integrated behaviour.
- Evidence is quoted with exact file paths, symbols and line ranges.

### 2.4 Explicit exclusions and limitations

- Live provider behaviour unverifiable statically; `/api/bolu-chat` defaults inferred from env names only. Runtime behaviour of the AMD/OpenRouter lane is UNVERIFIABLE here.
- `executedOperationIds` (module-scope `Set` in `bolu-document-service.ts`) cannot be shown safe under serverless cold starts from static inspection.
- No production traffic, secrets, tenant records or network calls were touched.
- PRD correctness was not audited; this audit evaluates code against the PRD.
- Test *behaviour* was not executed; counts of `test()` calls are from static inspection.

---

## 3. Existing architecture map

### 3.1 Actual pipeline stages as implemented

```
User (Dashboard button / contextual summon)
  → BoluAssistantProvider.summon()                      [src/components/ai-assistant/BoluAssistantProvider.tsx:38]
      → buildBoluPageContext()
      → createBoluRuntime deps: tenantClient, entityId, canRead, canWrite → hasAuthorization, providerAvailable: true, providerSend: sendBoluProviderRequest
      → AssistantSheet                                 [src/components/ai-assistant/AssistantSheet.tsx]
          → runtime.submit(text)                       [src/lib/ai-assistant/bolu-runtime.ts:92]
              → matchBoluIntent()                      [bolu-capabilities.ts:26 — write verbs return null]
              → IF capability: tenant-authorized reads (search/read) via bolu-data.ts (RPC, view, permission checks)
              → ELSE: providerSend()                   [bolu-transport.ts → POST /api/bolu-chat]
                  → api/bolu-chat.ts → Supabase-auth check → validateBoluProviderRequest() bounds
                  → config = getBoluProviderConfig(env) [bolu-provider.ts:73 — BOLU_PROVIDER_*; defaults: openrouter/free or AMD DeepSeek-V4-Flash; mode live|mock]
                  → fetch(config.endpoint) with SYSTEM_PREFIX + contextFacts + user messages
                  → SSE (or buffered-JSON→SSE) back to client
              → parseStructuredOperationEnvelope()      [bolu-operations.ts:405]
                  → unsupported family/operation → fail-closed message
                  → create → validateInvoiceCreateInput → buildInvoiceCreateProposal → RESULT (proposal)
                  → modify → validateInvoiceModifyInput → readBoluInvoice (re-read) → buildInvoiceModifyProposal → RESULT (proposal)
          → AssistantSheet renders proposal card (lines 142–235)
              → Gate 1: runtime.approveProposal / rejectProposal   [bolu-runtime.ts:365–378]
              → Gate 2: runtime.confirmSave
                  → persistInvoiceCreation|Modification             [bolu-document-service.ts:62–232 / 239–374]
                      → assertTenantAuthorization (tenant.isReady + canWrite(resource,'save'))
                      → opId replay check (executedOperationIds Set)
                      → isProposalStale (15-minute expiry)
                      → Gate check: status must be approved_pending_save|saving
                      → computeAuthoritativeTotals (calculateDocument)
                      → RPC save_invoice_with_items_transaction (entityId present)  |
                      → sequential fallback insert + compensating rollback          | OR
                      → withUniqueRetry numbering
                  → GATE2_SAVE_SUCCESS|FAILURE → messages
```

### 3.2 Boundaries

| Boundary | Kind | Evidence |
|---|---|---|
| UI ↔ runtime | in-memory, one store | `BoluAssistantProvider` via `useSyncExternalStore`; single `BoluRuntimeState` |
| runtime ↔ provider | HTTPS, SSE, server-held key | `bolu-transport.ts`; `api/bolu-chat.ts`; no key in client code [REPO] |
| runtime ↔ DB | TenantClient RPC/tables | `bolu-document-service.ts`; `bolu-data.ts` (search/read/verify) |
| Calculations | application-owned | `bolu-operations.ts:288–308` → `calculateDocument` (`src/lib/Calculations.ts`) |
| Context facts | deterministic read-only facts | `bolu-runtime.ts:176–209`; `bolu-formatting.ts` |
| Mock boundary | deterministic fixtures | `api/bolu-chat.ts:108–134` (mock mode); `bolu-mock-provider.ts` fixtures; test-only wiring otherwise |

### 3.3 State ownership

- Messages, proposals, active proposal, streaming buffer, statuses: **in-memory React state** (`bolu-reducer.ts`). Lost on unmount; not persisted server-side.
- Proposal lifecycle: `pending_approval → approved_pending_save → saving → persisted|rejected|cancelled|failed` (`bolu-operations.ts:21–28`, mirrors reducer actions).
- Persisted artefacts: only the final invoice header/items (`invoices`, `invoice_items`), with `custom_fields.created_via = 'bolu_assistant'` and `operation_id` recorded (`bolu-document-service.ts:129–133`).

---

## 4. Canonical object reconciliation

| Canonical object | Existing equivalent, if any | Path / symbols | Responsibility today | Consumers | Classification | Gap | Reuse |
|---|---|---|---|---|---|---|---|
| **SourceDocument** | *None.* Invoice rows being modified are the closest artefact; unrelated invoice/payment attachment features exist but are not intake lanes. | `src/lib/attachmentTypes.ts`, `useInvoiceHydration.ts`, `audit.ts:303` (payment attachments) — all unrelated to intelligence intake | none | none | **MISSING** | No identity, source type, preservation, processing status, stable traceability, original reference or processing-status vocabulary anywhere in assistant code [REPO: grep clean] | Create later; reuse the fact pattern for typed context envelopes if desired |
| **ExtractedObservation** | *None.* Closest construct: provider's `bolu_operation` JSON envelope | `bolu-runtime.ts:211–305`, `bolu-operations.ts:405–432` | LLM proposes a structured operation; no provenance, confidence, source location, original wording | `parseStructuredOperationEnvelope` consumers | **MISSING** (envelope is a proposal, not an observation) | No faithful-content capture; no extraction confidence; no location references; no wording preservation | Reuse envelope-parsing skeleton for *interchange* parsing, but ExtractedObservation is a new type |
| **NormalizedItem** | `BoluInvoiceItemInput` / `BoluInvoiceCreatePayload` / proposal computedTotals | `bolu-operations.ts:30–109` | Validated line items for the invoice create/modify path only | `buildInvoiceCreateProposal`, `validateInvoiceItems`, tests | **PARTIAL** (typed but provenance-free) | No provenance refs to observations, no evidence classification, no explicit-null semantics, no conflicting retention, invoice-family only | **Strong reuse**: extend with provenance + classification; becomes the canonical leaf |
| **MatchCandidate** | *None.* | — | — | — | **MISSING** | No matching of any kind; no evidence, differences, confidence, review state | Create; family-specific extension rules attach here (FR-38) |
| **Calculation** | `computeAuthoritativeTotals` + `ComputedItem/DocumentResult` | `bolu-operations.ts:288–308`; consumed in proposals + persistence | Deterministic engine call; recomputed at apply time; model totals discarded | proposals, persistence, tests | **PARTIAL** (as a runtime function: **IMPLEMENTED**; as an auditable record: **MISSING**) | No persisted Calculation artefact (inputs, formula id, result, currency/unit basis, timestamp, who approved). No provisional/verified vocabulary | **Strong reuse** of function; add Calculation *record* type + persistence seam at Gate 2 |
| **ReviewDecision** | Gate 1/Gate 2 reducer transitions + proposal status + authorization checks | `bolu-reducer.ts:187–259`; `bolu-runtime.ts:365–411`; `bolu-document-service.ts:62–100, 239–300` | Human approval gates exist with re-validation and idempotency guards | AssistantSheet, runtime, persistence | **PARTIAL** | No persisted audit record of who approved what and when; decisions live in memory; no link to evidence; no audit-query path | **Strong reuse** of flow; add ReviewDecision record + audit table or RPC |

**Net position on the six objects: zero exist as designed; three (NormalizedItem, Calculation, ReviewDecision) have credible substrates to extend.** No type, test, migration or table names the other three.

---

## 5. Capability gap matrix (DEC-32/DEC-33, FR-34 to FR-41, DI-1 to DI-8)

| Ref | Expected capability | Existing evidence | Class | Gap | Disposition |
|---|---|---|---|---|---|
| DEC-32 | Universal pipeline: intake → … → approved action | invoice create/modify pipeline only (DEC-34) | PARTIAL | 6 of 7 stages absent | EXTEND via new lanes; keep this pipeline as the reference create/modify path |
| DEC-32 | Canonical objects (6) | §4 above | MISSING/PARTIAL | 3 of 6 | CREATE (DI-3) |
| DEC-32 | Evidence classification separate from workflow status | none | MISSING | entire vocabulary | CREATE (DI-3) |
| DEC-33 | Attachment intake (application-owned) | none in assistant | MISSING | whole lane | CREATE (DI-1) |
| DEC-33 | External-AI Markdown interchange as interchange only | none | MISSING | whole lane | CREATE (DI-2) |
| DEC-33 | No invented values; uncertainty preserved | prompt forbids invention; deterministic reads for BI facts | PARTIAL | no enforcement at intake; no unverified/conflicting vocabulary | EXTEND |
| FR-34 | Pipeline exists end-to-end | invoice path only | PARTIAL | other stages absent | EXTEND |
| FR-35 | Canonical objects + evidence classification | §4 | MISSING | — | CREATE |
| FR-36 | Workflow status lifecycle (`not_found…priced_verified`) | proposal status only; different vocabulary | MISSING | no such states; runtime conflation risk | CREATE; never overload proposal status |
| FR-37 | Source preservation & traceability | no sources exist to preserve; `custom_fields.operation_id` is a weak seed | PARTIAL | no provenance chain | CREATE + EXTEND |
| FR-38 | Matching rules (description/spec/unit/qty/id; serial not enough) | none | MISSING | entire reconciliation engine | CREATE (DI-4) |
| FR-39 | Deterministic calculations, application-owned | `bolu-operations.ts:288–308` + `calculateDocument` | IMPLEMENTED | persisted Calcuation record missing; provisional/verified missing | EXTEND (DI-5) |
| FR-40 | Attachment intake + interchange | none | MISSING | entire lane | CREATE (DI-1/DI-2) |
| FR-41 | Family extensions; solar-pump case | invoice family only; quotation type-declared but runtime-rejected | MISSING | 7 of 8 families; no BOQ | CREATE per-family (DI-7); solar-pump suite (DI-8) |
| DI-1 | Intake & preservation | none | MISSING | — | CREATE |
| DI-2 | Extraction & interchange | provider JSON is a *proposal*, not Markdown interchange | MISSING | — | CREATE |
| DI-3 | Canonical contracts + status contracts | proposal contract only | PARTIAL | evidence + status vocabularies | CREATE types |
| DI-4 | Matching engine + review UX | none | MISSING | — | CREATE |
| DI-5 | Reproducible Calculation records | reproducible in-memory; not recorded; no verified/provisional | PARTIAL | record persistence; ambiguity gates | CREATE + EXTEND |
| DI-6 | Two-gate approval + persistence | implemented for invoices with idempotency + revalidation | IMPLEMENTED | extend to intelligence proposals | EXTEND carefully |
| DI-7 | Per-family extensions | none beyond invoice | MISSING | 7 families | CREATE per family, DI-7 |
| DI-8 | Solar-pump BOQ acceptance suite | none | MISSING | whole suite DI-A…DI-E | CREATE (DI-8) |

---

## 6. Pipeline lifecycle reconciliation

### 6.1 What exists

- Proposal lifecycle: `pending_approval → approved_pending_save → saving → persisted` with `rejected` / `cancelled` / `failed` terminal-ish states (`bolu-operations.ts:21–28`; mirrored in reducer actions `GATE1_APPROVE`, `GATE2_START_SAVE`, `GATE2_SAVE_SUCCESS`/`GATE2_SAVE_FAILURE`, `GATE2_CANCEL_SAVE`).
- Runtime statuses (different vocabulary again): `idle`, `sending`, `searching`, `proposing`, `awaiting_approval`, `applying`, `awaiting_save`, `saving`, `persisted`, `failed` (`bolu-reducer.ts:19–30`).
- Legacy change-card vocabulary still present (`changeCard`, `APPLY_CHANGE`, `ACCEPT_CHANGE`, `REJECT_CHANGE`, `INITIATE_SAVE|CONFIRM_SAVE|CANCEL_SAVE`) — overlapping and unused by the gate-flow paths.

### 6.2 Canonical comparison

The canonical lifecycle (`not_found → information_found → possible_match → awaiting_confirmation → confirmed → priced_verified`) and evidence classification (E/C/I/M/U/C) have **no representation** in code. The two existing vocabularies (runtime status, proposal status) describe *operation execution*, not *evidence or review progress*. They are not conflated today only because neither contains correspondence to the canonical states; the moment an intelligence lane lands these must be separate axes (evidence per item · confidence per candidate · workflow per record).

### 6.3 Findings

- **Conflation present:** `failed` mixes persistence failure, validation failure, stale proposal, network failure and model malfunction into one bucket with no subtyping.
- **Missing transitions:** no `information_found`, `possible_match`, `awaiting_confirmation`, `confirmed`, `priced_verified` equivalents; no provisional-vs-verified distinction in money paths.
- **Implicit transitions:** provider envelope → proposal creation happens inside one function without an explicit interchange-state stage (there is no `extracted`/`normalized` representation to hang a transition on).
- **Invalid transition risk:** nothing in the reducer/service prevents semantically invalid jumps at the data level (e.g., a proposal already `persisted` could in theory be re-gated by stale reducer replay; the opId replay guard blocks duplicates but only in-process).
- **Human boundaries:** correctly enforced for invoices (two gates present, re-validated, idempotent). Absent for canonical records because they do not exist.
- **Retire candidate:** reducer legacy change-card actions (`APPLY_CHANGE`/`ACCEPT_CHANGE`/`REJECT_CHANGE`, `INITIATE_SAVE`/`CONFIRM_SAVE`/`CANCEL_SAVE`, `changeCard`) are superseded by the gate flow; retire only with owner approval since no code is authorized in this task.

---

## 7. Integration and trust-boundary analysis

### 7.1 Provider abstraction and orchestration

- One server-side boundary (`api/bolu-chat.ts`) holds the key; client passes Supabase session token only [REPO, lines 86–144, 172–174]. Server builds messages with SYSTEM_PREFIX + contextFacts injection marked "untrusted data, not instructions" [REPO: lines 147–175].
- Provider is OpenAI-compatible; config env-driven (`BOLU_PROVIDER_NAME`, `BOLU_PROVIDER_BASE_URL`, `BOLU_PROVIDER_API_KEY` — fallback `BOLU_AMD_API_KEY`, `BOLU_PROVIDER_MODEL` — defaults by provider), `normalizeChatEndpoint` idempotent, `mode: 'mock' | 'live'` with fixtures for mock [REPO: `bolu-provider.ts:63–99`].
- Error classification: 401/403→502, 429→429, 400→502, 5xx→502, timeout→504 [REPO: `api/bolu-chat.ts:37–47, 197–204`]. No failover, no retry, no hedging; single provider per deployment.

### 7.2 Markdown / interchange boundaries

- No Markdown interchange lane. The `bolu_operation` JSON envelope is a **proposal**, not source-fidelity Markdown. There is nothing to validate against a source, nothing to trace to a location, and no extracted-observation contract.

### 7.3 Application-owned validation and normalization

- Intake → validation exists for *operations* (`validateInvoiceCreateInput`, `validateInvoiceModifyInput`, `validateInvoiceItems`) [REPO]. Normalization from *source material* does not exist.
- `providerAvailable: true` is hardcoded at the call site (`BoluAssistantProvider.tsx:29`) — an availability lie; server 503s are the only backstop [REPO]. UNVERIFIABLE at runtime.

### 7.4 Deterministic calculation ownership

- `calculateDocument` recomputed at proposal build **and at persist** (`bolu-document-service.ts:96`, `bolu-operations.ts:288`). Model totals discarded unconditionally [REPORT: DEC-34 verification; REPO lines match]. Cannot overstate: no Calculation *record* is kept.

### 7.5 Persistence and idempotency

- opId replay guard: in-memory `Set` in `bolu-document-service.ts:34, 80, 257, 364` — **not durable across serverless cold starts**; UNVERIFIABLE for duplicate protection in production.
- Modify path re-reads current row, checks `oldValue` vs DB with archived guard (`bolu-document-service.ts:273–299`) — real revalidation. `itemsChange` path swaps items wholesale with no base-snapshot comparison — weaker boundary (partial).
- Fallback writes: compensating delete on item insert failure (`bolu-document-service.ts:201–214`) — correct for sequential mode. RPC mode relies on the RPC transaction.
- `withUniqueRetry` for numbering; `advanceAutoCursor` after save [REPO: lines 98–107, 154–188, 216–220].

### 7.6 Tenant authorization and isolation

- `assertTenantAuthorization` checks `tenantClient.isReady`, `schemaName`, `canWrite(resource,'save')` [REPO: 46–57].
- RPC `save_invoice_with_items_transaction` takes `p_entity_id` (entity/tenant) explicitly [REPO: 163–169].
- Reads re-check `canRead` before facts; modify checks read-act-as-`modify` authorization (`:252`) — note the action is named `modify` while writes check `save` (same `hasAuthorization` function backs both in `BoluAssistantProvider.tsx`, `:27–28`) — zero RBAC granularity, acceptable for MVP, worth flagging.
- Authorization is **not** carried inside proposals; it is re-evaluated at persist — correct pattern.

### 7.7 Error handling, retries, failover

- Client runtime catches abort/provider failures; verified facts survive failure (rendered without provider) — resilience pattern exists [REPO: `bolu-runtime.ts:309–328`].
- No retry on transient provider errors; no failover; 429 surfaced raw as HTTP status to client (`api/bolu-chat.ts:40–42`). A failed model cannot corrupt state (fail-closed).
- Empty answer handling exists (`bolu-transport.ts:55`).

### 7.8 Boundaries unable to be verified statically

- Whether deployed env holds a valid key (live mode) — UNVERIFIABLE.
- Whether Supabase RLS on `invoices`/`invoice_items` enforces tenant isolation at row level independently — UNVERIFIABLE from assistant code alone.
- Cold-start behaviour of `executedOperationIds` — UNVERIFIABLE.
- Whether `save_invoice_with_items_transaction` RPC validates `p_entity_id` internally — UNVERIFIABLE from this audit.
- Provider response compatibility beyond documented contract (streaming chunks) — UNVERIFIABLE.

---

## 8. Reusable assets

| Asset | Why reusable | Limitations |
|---|---|---|
| `bolu-operations.ts` — proposal contract, validation, envelope parser | Type-safe operation envelope, stale detection, authority recomputation; directly extensible to NormalizedItem proposals | Invoice-family only; no evidence vocabulary; no provenance |
| `bolu-reducer.ts` — two-gate state machine | Correctly models approval/save; actions clean; activation by future lanes identical | Legacy change-card handlers co-resident; `failed` untyped error bucket |
| `bolu-document-service.ts` — transactional persistence | RPC reuse, collision retry, rollback, re-read/revalidate; the strongest asset | opId set is non-durable; items change-set not base-snapshot-compared; invoice-only |
| `bolu-runtime.ts` — provider orchestration + read facts | Fail-closed parsing, streaming, deterministic fact answers survive provider failure; unsupported family rejection | No interchange stage; envelope parsing lives here (would move or grow with DI-2) |
| `bolu-formatting.ts`, `bolu-capabilities.ts`, `bolu-context.ts` | Deterministic fact rendering; read-only BI path; context envelope | Read-only; zero intelligence content |
| `bolu-mock-provider.ts` | Deterministic fixtures; ideal contract boundary for DI lanes (no keys) | Mock only; 12 fixtures scoped to invoice create/modify |
| Test suites (`src/tests/ai-assistant/`) | 62 `test()` calls; mock tenant client pattern reusable; integration tests exercise full proposal flow | Zero coverage of DI requirements; activation report overstates suite roster |
| `Calculations.ts` (`computeDocument`/`calculateDocument`) | Authoritative money; untouched by assistant layers | UI-level; no Calculation record persistence |

---

## 9. Required changes (recommendations only)

**EXTEND**

- `BoluInvoiceItemInput` family of types → extend with provenance (`sources?: { observationId, locator }[]`), `evidence: EvidenceClass`, explicit `null` markers. *Evidence: §4, FR-35.*
- `BoluRuntimeState`/reducer: add `Draft-for-intelligence` sub-state rather than overloading proposal states; retire legacy change-card actions after owner sign-off. *Evidence: §6.*
- `computeAuthoritativeTotals` call sites: emit a `Calculation` record object at persist time from the same call (zero new math; provenance added). *Evidence: §5 FR-39, DI-5.*
- `persistInvoiceModification`: add base-snapshot comparison for `itemsChange` (expected items passed in the proposal). *Evidence: §7.5.*
- opId idempotency: promote `executedOperationIds` Set into a durable record (unique constraint or idempotency RPC) before multi-instance deploys. *Evidence: §7.5.*

**CONNECT**

- The proposal path to the DI-2 interchange lane: proposal results gain an `interchangeRef` only after DI-2 exists; do not ship placeholder references.
- `AssistantSheet` proposal card → future MatchCandidate review card family (same gate components likely).

**REPLACE**

- Replace `providerAvailable: true` hardcode (`BoluAssistantProvider.tsx:29`) with an explicit availability signal from server config/mode (mock vs live), so failures surface honestly (503 paths already exist server-side). *Evidence: §7.3.*
- Replace the activation report's suite-roster claims with file-scoped evidence in the next documentation pass (docs-only change; out of scope here). *Evidence: §1, §14.*

**RETIRE**

- Legacy change-card reducer actions and `changeCard` state — after owner approves. *Evidence: §6.3.*
- `providerCatalog.ts`-based legacy client path (`chat.ts`) remains dead for Bolu; retire only via owner decision (cross-referenced in earlier audits). *Evidence: [SELF] prior audits; this audit did not edit it.*

**CREATE**

- `SourceDocument` type + preservation seam (identity, type, original reference, status) — DI-1.
- `ExtractedObservation` type + extraction orchestration boundary (interchange-agnostic) — DI-2.
- `NormalizedItem` extension layer + explicit `null` handling + conflicting-pair retention — DI-3.
- `MatchCandidate` + family-extensible matcher + review state machine — DI-4.
- `Calculation` record type + persistence seam — DI-5.
- `ReviewDecision` record + audit persistence (RPC or table with RLS) — DI-6 support.
- Workflow status type (`not_found…priced_verified`) + evidence classification type — DI-3.
- DI-8 solar-pump fixture pack (BOQ + WhatsApp messages; sanitised) — DI-8.

No code was written. Each CREATE item is gated on DEC-32/33 sequencing decisions in §10.

---

## 10. Dependency-aware implementation sequence

**Prerequisite decisions (owner, no code):** attachment formats/limits/retention/providers (FR-40/DEC-33); custody decision residue (FR-12); consent text naming providers (FR-13); first-release family set (DI-7 scope); paid policy (G, §12 of sibling report); health-ledger home (§6.3 of sibling report); schema approach for DI objects (table vs RPC vs JSON in existing rows).

**Phase 0 — Canonical contracts only (DI-3).** Types for SourceDocument/ExtractedObservation/NormalizedItem/MatchCandidate/Calculation/ReviewDecision; evidence + status vocabularies; pure functions; exhaustive unit tests with no provider. Smallest safe milestone; unblocks everything; zero product risk.

**Phase 1 — Intake lane (DI-1, DI-2).** Application-owned upload → preservation → extraction orchestration behind provider-neutral boundary; Markdown interchange representation; validation at intake; unsupported types fail loudly. No BOQ-specific logic; invoice context first (small).

**Phase 2 — Normalize + reconcile (DI-4, DI-5 part).** NormalizedItem builder; persisted Calculation records; MatchCandidate generation with evidence + differences; review gate reuse. Solar-pump BOQ fixtures authored here (provisional amounts visible).

**Phase 3 — Persistence + approval (DI-6).** ReviewDecision audit records; apply-time re-read for intelligence proposals; idempotency made durable; RLS-audited persistence. Supersedes nothing in DEC-30 invoice pipeline; runs parallel to it.

**Phase 4 — Families (DI-7) then acceptance (DI-8).** Family extensions behind the universal contract; solar-pump BOQ suite passes; breadth gate widened.

**Schema/API implications:** Phase 0 none; Phase 1 intake storage decision required (Supabase table vs Storage bucket refs in existing tables); Phase 2–3 audit/persistence tables or RPCs with tenant RLS; Phase 4 migrations per family. No phase touches `src/lib/Calculations.ts` (G1) or PDF renderers (G2).

**Explicitly unresolved; do not start:** attachment lanes (formats), extraction providers, paid policy, AMD/Gemini/NumeS eligibility for tenant content, first-release breadth. DEC-29 live multi-model routing is a parallel track and remains deferred by its own decision.

**Dependencies:** Phase 1 depends on intake decisions; Phase 2 on Phase 0+1; Phase 3 on Phase 2 and DEC-28/DEC-30 patterns (reusable); Phase 4 on Phase 3 and the family decision. Parallelizable: none across phases; unit tests always.

---

## 11. Risks and unresolved questions

**Risks**

- R-1: Idempotency across serverless cold starts (in-memory Set) → duplicate persistence possible under concurrency.
- R-2: `itemsChange` wholesale replacement without base-snapshot comparison → concurrent edits laundered.
- R-3: `providerAvailable: true` hardcode masks configuration absence; failures surface late and generic.
- R-4: No audit trail of approvals; in-memory decision history; dispute reconstruction impossible.
- R-5: Single provider, no failover; AMD default for inferred `rc-` keys ties trials to a China-site endpoint under trial/development terms (RISK-14/15/16).
- R-6: Proposal envelope parsing is on the render path; adversarial/adversarial-ish model output must remain fail-closed forever (currently is — keep regression tests).
- R-7: Zero intelligence tests; any DI lane added later lands on untested ground unless DI-0 contract tests are written first.
- R-8: Invoice-only pipeline creates gravity toward BOQ-as-invoice; DEC-32 explicitly forbids that shortcut.

**Unresolved questions**

1. Serverless idempotency: upgrade to durable mechanism now (with Phase 0?) or accept session-scope risk until Phase 3?
2. Should `ReviewDecision` persist into an `assistant_audit` table with tenant RLS, into `invoices.custom_fields` JSON, or a dedicated RPC? Owner decision.
3. Does Phase 2 normalization run for attachments of *existing* invoices (read enrichment) or only new intake? Scope unresolved.
4. Are `Quotation` types ever wired (the type exists and is rejected at runtime) — decide with first-release family selection.
5. Does the interchange Markdown get retained for audit, or discarded after proposal resolution? Retention decision (DEC-33).
6. `failed` subtyping: introduce typed failure classes or map to user-visible buckets? Owner's UX call.
7. Whether `bolu-operations.ts` becomes the single "operation contract" module or splits DI-2 parsing out (module boundary decision).
8. Whether to retire legacy change-card reducer actions now or with the next write-family milestone.
9. Activation report suite roster inaccuracy — who is the accountable author to correct the report?

---

## 12. Final recommendation

**Implementation is ready to begin, for Phase 0 only.** Phase 0 (canonical contracts + unit tests) is safe, requires no product decisions beyond approval to start, touches no provider, and creates maximal leverage for every later stage.

**Safest first implementation milestone:** DI-3 — canonical object types, evidence classification type, workflow status type with transition guards, exhaustive unit tests, zero runtime wiring.

**Before write-capable document workflows are enabled — all required:**

1. Human-approval boundaries proven end-to-end for intelligence proposals (not only invoice) — Phase 3 complete.
2. Durable idempotency (R-1) and base-snapshot revalidation for item changes (R-2) — fixes landed and tested.
3. Auditability of every ReviewDecision persisted with tenant RLS — Phase 3.
4. Consent/default-off gate and eligibility rules verified for whatever provide the live inference path (FR-12/13) — refer to AMD eligibility (RISK-14): not tenant-safe without new terms or a new provider decision.
5. Live-provider verification in the target environment (unblock R-3 honestly).
6. Solar-pump BOQ acceptance suite green — Phase 4.
7. Owner approval of DEC-32/33 sequencing, intake formats, retention and the first-release family set.

**Not now.** BOQ-first shortcut (R-8); AMD production enablement; any DI lane claiming production readiness from mock tests; deletion of legacy change-card handlers without approval; new schema before Phase 1 decisions.

---

## 13. Verification and Git integrity

### 13.1 Before the audit (captured at task start)

`git status --porcelain=v1` — pre-existing changes, all preserved untouched: modified (`api/bolu-chat.ts`, 10 PRD files, 14 src files, 1 test file) and untracked (`docs/reports/ai/2026-11-14-bolu-{amd-provider-security-audit,live-provider-activation-report,milestone-closeout-reconciliation,prd-roadmap-reconciliation}.md`, `docs/reports/2026-11-14-*` prior audits, new bolu-* source files and tests, `video-json-tutorial/`, `src/lib/themeTransition.ts`). HEAD `cdfca468`, `main`, ahead of `origin/main` by 16.

### 13.2 After the audit (captured immediately after report creation)

See §13.4.

### 13.3 Commands run and excluded

- Executed: `git status`, `git log`, `git diff --stat`, `git show`, file reads, `Select-String`/`grep` for scoped searches, line counts.
- **Not run:** `bun run build`, `bun run typecheck`, `bun run lint`, `bun run audit:load`, `bun run test`, any runtime/dev-server/database/provider command, migrations, installs.
- No application source, tests, configuration, migrations, schema, dependencies or PRD/roadmap/decision-log/risk/test-plan files were modified by this audit.

### 13.4 Post-audit capture

`git status --porcelain=v1` after report creation shows exactly one new entry attributable to this audit: `?? docs/reports/ai/2026-11-14-bolu-application-document-intelligence-reconciliation.md`. All pre-existing entries from §13.1 remain present and unmodified.

### 13.5 Verification limitations

No runtime, provider, database or browser verification of any claim. Build/typecheck status unknown by design. Behaviour of `/api/bolu-chat`, persistence RPCs, and Supabase RLS in production is statically reasoned, never observed. All such behaviour is labelled UNVERIFIABLE in this report where relevant.

---

## 14. Evidence register (exact references)

**[REPO — source]** `src/lib/ai-assistant/{bolu-operations.ts (lines 21–28, 30–118, 288–308, 405–432), bolu-reducer.ts (lines 19–30, 187–324), bolu-runtime.ts (lines 92–421), bolu-document-service.ts (lines 33–57, 62–232, 239–374), bolu-provider.ts (lines 59–116), bolu-transport.ts (lines 1–57), bolu-data.ts (types + diff: BoluWriteAuthorization, BoluChangeProposal, proposeChange/saveDocument), bolu-capabilities.ts (line 26), bolu-formatting.ts, bolu-context.ts}` · `api/bolu-chat.ts` · `src/components/ai-assistant/{AssistantSheet.tsx, BoluAssistantProvider.tsx, DashboardAssistant.tsx}` · `src/lib/Calculations.ts` · `src/tests/ai-assistant/*.test.js` (contents counted: 62 `test()` calls).

**[REPO — docs]** `docs/prd/conversational-document-assistant/{Readme.md, functional-req.md, architecture.md, decision-log.md, Waterfall-roadmap.md, test-plan.md, risk-register.md, provider-catalog.md, roadmap.html}` — DEC-28/29/30/32/33/34/35; FR-34…FR-41; DI-1…DI-8, DI-01…DI-25, DI-A…DI-E; disposition tables and stage status.

**[REPORT]** `docs/reports/ai/2026-11-14-bolu-live-provider-activation-report.md` (contains the suite-roster discrepancy flagged in §1/§11), `docs/reports/ai/2026-11-14-bolu-amd-provider-security-audit.md`, `docs/reports/ai/2026-11-14-bolu-prd-roadmap-reconciliation.md`, `docs/reports/ai/2026-11-14-bolu-milestone-closeout-reconciliation.md`, `docs/reports/ai/2026-11-13-bolu-prd-compliance-audit.md`, `docs/reports/ai/2026-11-13-bourxe-assistant-prototype-experience-audit.md`, and this session's `docs/reports/ai/2026-11-14-dynamic-model-routing-reconciliation.md` and `docs/reports/ai/2026-11-14-hermes-provider-architecture-audit.md` (cross-referenced; not re-litigated).
