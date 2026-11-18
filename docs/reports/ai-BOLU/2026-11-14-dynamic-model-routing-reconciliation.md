# Dynamic Multi-Model Routing — PRD / Code / Design Lab Reconciliation

This report was written by Inkling 2 Small Free (OpenCode) on 2026-11-14.

Task: RECONCILE THE BOURXE AI PRD, PRODUCTION CODE AND DESIGN LAB AROUND THE DYNAMIC MULTI-MODEL ROUTING ARCHITECTURE.
This is an architecture investigation and specification reconciliation. No implementation is performed. No application, test, configuration or documentation file is modified by this audit other than this report.

Skills consulted (from `docs/PROJECTSKILLINDEX.md`): `typescript-advanced-types`, `openapi-to-typescript`, `react-dev`, `shadcn`, `ui-ux-pro-max` (inspected for conformity; none applied, because no code was changed). Documentation standard: ASD-STE100 Simplified Technical English.

Two evidence classes are used:

- **[REPO]** — static inspection of this repository on 2026-11-14 (HEAD `cdfca468`, branch `main`, 16 commits ahead of `origin/main`).
- **[EXT-DOC]** — external provider or project documentation consulted for this audit. External facts describe provider offerings, not BOURXE behaviour, and are marked as of 2026-11-14; they are not permanent.

Evidence labels: **IMPLEMENTED** · **PARTIALLY IMPLEMENTED** · **DOCUMENTED ONLY** · **SIMULATION ONLY** · **NOT IMPLEMENTED** · **CONFLICTING** · **REQUIRES PRODUCT-OWNER APPROVAL**. They are used as classification for every finding.

Reading: the sibling report `docs/reports/ai/2026-11-14-hermes-provider-architecture-audit.md` (2026-11-14) is cited as **[SELF]** where it overlaps. Its git-status appendix is superseded by §14 here.

Working-tree note: five PRD files (`architecture.md`, `decision-log.md`, `provider-catalog.md`, `risk-register.md`, `test-plan.md`) carry pre-existing owner edits reconciling the PRD with DEC-28, present at the time of this audit. They are quoted as current drafts and were not edited.

---

## 1. Executive summary

**The product direction in one line.** One engine, many interchangeable models, automatic selection, automatic failover, continuous model replacement, free-first where verified — the gun stays, the ammunition changes.

**The repository today.** BOURXE does not have a dynamic multi-model engine. It has:

- a **legacy client-side runtime** (`providerCatalog.ts` rows → `chat.ts` failover walk → `protocol.ts` SSE parsing → `keys.ts` custody) — static order, fixed model per row, no health tracking, no capability metadata, no model selection;
- a **14-row declared catalog** (`providerRegistry.ts`) — data only, consumed exclusively by the Design Lab simulation, never by a runtime;
- a **Bolu read-only runtime** (`bolu-*` + `api/bolu-chat.ts`) — one hard-coded AMD endpoint, `providerAvailable: true` hardcoded in `BoluAssistantProvider.tsx`, no selection, no failover, deterministic intent matching, no tool calling;
- a **Design Lab simulation** — session memory, seeded demo keys, fake connection tests, invented `/models` results, labelled "Preview simulation · no provider calls";
- a **PRD** whose dynamic-pool equivalent does not exist: its chain is a static, hand-ordered list (DEC-08, DEC-17, DEC-18, DEC-20) with failover classification (DEC-10, FR-10), on-demand `/models` refresh (DEC-24, FR-19), and declared-model floor (FR-19). That model is the correct substrate for the intended architecture but is materially narrower than it.

**The determination, up front.** The existing catalog-row architecture **can support the intended dynamic multi-model experience through incremental extensions — no fundamental architectural gap exists.** What is missing is not architecture but (i) metadata and lifecycle, (ii) a selection policy, (iii) a health/recovery ledger, (iv) consent and custody decisions, and (v) verification discipline. None of these requires replacing the current stack, an external routing service, or a second provider system. What is missing also includes **facts**: free-tier status, quotas, model availability and tool behaviour are unverified for every candidate model, by design of this audit.

**Prerequisites before any implementation (all REQUIRES PRODUCT-OWNER APPROVAL):**

1. Custody decision — client-side Capacitor private file (FR-12 draft) vs server-side env key (committed Bolu path). Two custody models ship today; one must be retired.
2. Consent + default-off boundary (FR-13/FR-15, RISK-01) before tenant content reaches any provider.
3. Provider chain member set + order, including the unresolved DEC-17/DEC-18 conflict.
4. Terms eligibility: AMD free trial forbids tenant production use (RISK-14); Gemini free tier permits training on content; NumeS terms unknown.
5. Whether the PRD's static chain becomes the "declared floor" of a dynamic pool, or is replaced in the same step.

**Nothing is implemented by this task.** This report is the input to those decisions.

---

## 2. Current architecture and actual implementation

All file references are as of HEAD `cdfca468` unless marked otherwise.

### 2.1 Components and roles

| Component | File | Role | Classification |
|---|---|---|---|
| Runtime catalog rows | `src/lib/ai-assistant/providerCatalog.ts` | 4 declared rows: `nvidia` (default model `nvidia/nemotron-3.5-lightning-30b-a3b`), `openrouter` (`openrouter/free`), `amd` (`DeepSeek-V4-Flash`), `gemini` (Google AI Studio OpenAI-compat endpoint, `gemini-3.5-flash-lite`). Order = declaration order; comment preserves the unresolved DEC-17/DEC-18 conflict and deliberately follows "the PRD order". Cloudflare deliberately absent (base URL carries an account id). | PARTIALLY IMPLEMENTED (static data; untested live) |
| Client failover and streaming | `src/lib/ai-assistant/chat.ts` | `sendAssistantChat()` walks rows in order per send; first key present wins; `fetch(\`${baseUrl}/chat/completions\`)`, bearer header, 4-param body, SSE consumption; non-OK → `readProviderErrorBody`, 429/401/403/404/5xx advance, else stop; network error advances; empty answer advances. No stickiness, no `Retry-After`, no health bookkeeping, no model choice (`row.model` fixed). | PARTIALLY IMPLEMENTED (works as written; not the approved direction) |
| Protocol helpers | `src/lib/ai-assistant/protocol.ts` | `buildChatRequestBody` (`AI_CHAT_MAX_TOKENS = 700`), `classifyProviderFailure` (429/401/403/404/5xx → advance), `extractSseText`, `maskKey`, `readProviderErrorBody` (sanitises, clips 240). | IMPLEMENTED (unit-tested by `src/tests/ai-assistant/protocol.test.js`; not run in this audit) |
| Key custody (client) | `src/lib/ai-assistant/keys.ts` | Native: `Directory.Private` file `ai-assistant/keys.json`, plaintext JSON. Browser: session memory only, never localStorage. | PARTIALLY IMPLEMENTED (no file-mode bits; no encryption; no test gate) |
| Wide declared catalog | `src/lib/ai-assistant/providerRegistry.ts` | 14 tier-1 provider rows (OpenRouter, Anthropic, OpenAI, Google Gemini, Groq, DeepSeek, Mistral, Together, Fireworks, Cerebras, xAI, Cohere, NVIDIA NIM, AMD Token Factory) with base URLs, key prefixes, signup URLs, declared models, `supportsModelList`, notes. Also `validateCustomProvider` / `parseExtraHeaders` / `parseModelIds` / `slugifyProviderName` and `CustomProvider` type (`custom:<slug>` id, optional JSON extra headers, optional contextWindow ≥ 1000). `authScheme` typed but never read. **Not imported by any runtime.** | SIMULATION ONLY (consumed by Design Lab) |
| Bolu read-only runtime | `src/lib/ai-assistant/bolu-{runtime,provider,transport,context,data,capabilities}.ts`; `api/bolu-chat.ts` | Server proxy: Supabase auth check → message/context bounds → hard-coded AMD POST → SSE back. Intent via deterministic rules (`matchBoluIntent`); facts rendered deterministically; model availability treated as constant (`providerAvailable: true` in `BoluAssistantProvider.tsx`). No failover, no selection, single endpoint, `AbortSignal.timeout(45000)`, generic 502 to the client. | PARTIALLY IMPLEMENTED (no provider behaviour beyond AMD; uncommitted→now committed in `a1ed5dd5`) |
| Provider settings UI | Design Lab: `src/components/design-lab/assistant-chat-settings.tsx` | Per-provider cards: masked key, simulated test, simulated discovery, 14 rows from registry, custom-provider form, badges, "Preview simulation · no provider calls" label, "Simulate test"/"Simulate model list". Keys in component memory; two seeded demo placeholders (not credentials). | SIMULATION ONLY |
| Model pill / provider chooser | Design Lab: `assistant-chat-model-pill.tsx` | Provider-aware grouping, search, configured-expand-first, badge logic, aria dialog, keyboard handling. No production counterpart. | SIMULATION ONLY |
| Production sheet | `src/components/ai-assistant/AssistantSheet.tsx` | Global bottom sheet driven by Bolu runtime; no provider selector, no model pill, no key UI. | IMPLEMENTED (read-only BI; not a routing surface) |
| Persistence of selection | none (any layer) | Active provider/model live in Design Lab React state for the session; nothing is persisted anywhere; keys are the only persisted secret (native only). | NOT IMPLEMENTED |
| Capability metadata (context window, modalities, tool support, structured outputs, streaming, limits, pricing, health) | none (any layer) | No table, type, or fixture anywhere. `AI_CHAT_MAX_TOKENS` and Bolu message bounds are the only ceilings. `contextWindow` exists solely as optional custom-provider input, unused for requests. | NOT IMPLEMENTED |
| Health / lifecycle store | none | No `degraded`, `rateLimited`, `coolingDown`, `disabled`, `retired` concepts exist. Nothing records last-good, last-failure, or cooldown. | NOT IMPLEMENTED |
| Quota readout | none | No parser for 429 bodies (Gemini), AMD allowance headers, OpenRouter `/api/v1/key` counters, or Retry-After. DEC-11/FR-11 stand unimplemented. | NOT IMPLEMENTED |
| Live `/models` discovery | none (production); simulation only | `simulateModelDiscovery()` returns canned/generated ids after 650 ms; FR-19/DEC-24 unsatisfied in production. | SIMULATION ONLY |

### 2.2 Request path today (both paths)

```
Legacy (client):   UI → AssistantSheet → sendAssistantChat()
                   → orderedAIProviderRows() [static] → getProviderKey() → fetch
                   → classifyProviderFailure() → advance|stop → SSE text

Bolu (server):     Dashboard button (BoluAssistantProvider)
                   → runtime.submit() → matchBoluIntent() → tenant-authorized reads
                   → sendBoluProviderRequest() → /api/bolu-chat
                   → Supabase auth → validateBoluProviderRequest()
                   → fetch AMD /chat/completions (stream:true, model DeepSeek-V4-Flash)
                   → SSE → client renders facts/answer
```

Both paths funnel **all** traffic through exactly one configured model at a time, chosen by static configuration. Neither selects, both fail without a user-visible reason beyond a generic message, and neither treats the pool as interchangeable.

### 2.3 What the product owner's intended experience maps to

| Intended property | Nearest existing artifact | Distance |
|---|---|---|
| One engine, consistent experience | Shared `AssistantSheet` + Bolu runtime seam | Near |
| Multiple interchangeable models | `AI_PROVIDER_ROWS` / `AI_PROVIDER_REGISTRY` (rows are interchangeable *providers*; one model each) | Near — rows already interchangeable |
| Automatic selection by requirement | nothing | Far |
| Automatic failover | `chat.ts` advance-on-failure walk | Partial (status-only; crude; client path dead in Bolu product) |
| Continuous model replacement | declared-model lists + `/models` merge rule (FR-19) | Documented only |
| Free-first | DEC-07 (free cloud tiers); chain preference order | Documented only; no policy code |
| Zero user maintenance of the chain | chain walk in `chat.ts` | Partial and crude |

---

## 3. Existing PRD requirements versus intended product direction

PRD artifacts referenced: `functional-req.md` (FR-01..FR-28 incl. 2026-11-13 disposition), `architecture.md`, `decision-log.md` (DEC-08..DEC-28), `provider-catalog.md`, `risk-register.md`, `Waterfall-roadmap.md`, `test-plan.md`. Pre-existing owner edits recorded 2026-11-14 reconcile the pack with DEC-28; quoted as-is.

### 3.1 Direction alignment table

| Intended direction | PRD / DEC counterpart | Disposition | Verdict |
|---|---|---|---|
| One engine | DEC-14/FR-17 (shared assistant architecture, module-agnostic); DEC-27 (local chat primitives, app-owned boundary) | REFINED — approved principle | ALIGNED |
| Multiple providers | DEC-08 (one OpenAI-compatible client, many base URLs); DEC-23 (catalog = data) | PROPOSED disposition for detail | ALIGNED (substrate) |
| Interchangeable models per provider | DEC-24/FR-19 (declared list + on-demand `/models`); FR-20 (pill to switch) | PROPOSED — not approved first release | DOCUMENTED ONLY |
| Automatic selection | none — PRD keeps a hand-ordered chain chosen at design time | n/a | NOT IN PRD — gap vs direction |
| Automatic failover | DEC-10/FR-10 (429/5xx advance; 400 stops); test plan U-20..U-26 | PROPOSED | DOCUMENTED ONLY (code: `chat.ts` PARTIAL) |
| Continuous model replacement | DEC-24 \***declared floor + live refresh**; ticket acknowledging free-model lists rot | PROPOSED | DOCUMENTED ONLY |
| Free-first | DEC-07 (free cloud tiers, not on-device); chain preference comments | n/a | DOCUMENTED ONLY — no policy engine |
| Free status dynamic (not permanent) | DEC-11 (read allowance from provider); ticket §"Registry note… wrong within a week" | n/a | ALIGNED (principle) |
| User should never maintain chain | DEC-09 (chain is ordered and editable by the user — user manages it!) | DEC-09 conflicts with the intended direction | CONFLICTING — see 3.2 |
| Custom endpoints / new free models without redesign | DEC-25/FR-21 (custom provider first-class) | PROPOSED | DOCUMENTED ONLY (validator exists; not wired) |
| Gateway option (OmniRoute) as pluggable pool | DEC-20/DEC-21; Readme §11; Waterfall stage A | Historical trial decision | NOT A PRODUCT DEPENDENCY; must remain excluded |
| Budget/spending restrictions | none — "free only" is the only policy; no paid escalation path approved | n/a | REQUIRES PRODUCT-OWNER APPROVAL — paid selection needs explicit policy |
| Manual override visibility | FR-20 pill; catalog §9 Design Lab; DEC-09 | PROPOSED | SIMULATION ONLY today |

### 3.2 DEC-09 versus the product direction

DEC-09 states the chain is a list the user reorders and prunes in Settings. The intended direction states the user must **not** maintain the chain and that models lifecycle in and out automatically. These are not reconcilable as written. Either:

- DEC-09 is amended to *"the runtime selects and fails over automatically; the user may constrain (exclude providers/models, prefer a model, set spending policy) but does not order the chain"* — the intended direction; or
- DEC-09 stands and the product ships a manually curated chain (the status quo), which does not satisfy "user should not need to manually select a replacement model".

This is **REQUIRES PRODUCT-OWNER APPROVAL** and it is the single PRD conflict that matters most for this task.

### 3.3 Bolu (DEC-28) and the provider architecture

DEC-28 approves the read/write business-operations direction but expressly does not approve the provider chain, key custody, trial, or plan. The PRD pre-existing edit (`architecture.md` DEC-28 boundary; `test-plan.md` operations addendum) reinforces that provider choice is under review. The committed Bolu runtime treats **one AMD endpoint as the engine** — the narrowest possible reading of "one engine", and none of the interchangeability the direction wants.

### 3.4 What the PRD already concedes that this task can build on

- Declared-model lists ship with rows (FR-18/19) — interchangeable-candidate floor.
- `/v1/models` refresh merges live ids onto declared ids, declared survive failure, dedupe, 200 cap, current model always present (FR-19) — the discovery spine.
- A custom endpoint is a first-class provider (FR-21) — the intake path for new free models without a redesign project.
- Error classes already classified (DEC-10/FR-10) — failover vocabulary exists.
- Catalog is data, not code per provider (DEC-23) — adding a model is a row edit, not an adapter.

---

## 4. Automatic routing capability assessment

| Requirement (from §D.3 of task) | What exists | Classification | Gap to the direction |
|---|---|---|---|
| Selection by required capabilities | none — requests carry no capability requirement | NOT IMPLEMENTED | Capability requirement inference/declaration per turn (even "text + tools" as today) |
| Selection by availability | `providerAvailable: true` hardcoded (Bolu); no probe in client | NOT IMPLEMENTED | Health ledger + cheap availability probe |
| Selection by reliability | none | NOT IMPLEMENTED | Rolling success/failure counters per model |
| Selection by rate limits | none — 429 only discovered on demand | NOT IMPLEMENTED | Cooldown windows from 429/`Retry-After` |
| Selection by context capacity | none — BOURXE never sends the model's window; `.slice(-12)` hides it | NOT IMPLEMENTED | Per-model window in declared metadata; truncation policy keyed to it |
| Free-first preference | chain order encodes a human's preference; no enforcement or expiry | DOCUMENTED ONLY | Free-first ranker over verified-free eligible set |
| Spending restrictions | none | NOT IMPLEMENTED (no paid policy approved) | Policy gate before any paid selection; all-free default |
| Model-specific limitations | `note` free-text only; `authScheme` dead field; AMD "accepted parameters" documented in tickets but never read | PARTIALLY IMPLEMENTED (documentary) | Structured `limitations` metadata + request-parameter shaping or eligibility exclusion |
| "Not selection by zero token price alone" | chain partly does pick by perceived allowance (AMD first) — AMD is **not** verified for BOURXE networks/terms | CONFLICTING with the direction's safety clause | Zero-price is a signal, never a criterion; eligibility must include health, terms, tools, window |
| Model-of-the-moment rotation for resilience | static order only | PARTIALLY IMPLEMENTED | Dynamic pool with cooldown + sticky last-good |

**Assessment.** No automatic routing exists. The only router embryo is `sendAssistantChat()`'s static order walk, which is (a) on the legacy path only, (b) provider-granular not model-granular, (c) unaware of capability, health, or entitlement. Zero changes to selection logic are possible without new metadata — which is why §11 and §13 sequence metadata first.

---

## 5. Automatic failover capability assessment

| Requirement (§D.4) | What exists | Classification | Gap |
|---|---|---|---|
| Connection failures | advance to next row (client); server path: 502 generic | PARTIALLY IMPLEMENTED | Unified handling across both paths; user-facing reason (which provider failed, why) |
| Provider outage | same — advance; AMD-only Bolu: none | PARTIALLY IMPLEMENTED | Pool eligibility excludes down providers temporarily |
| Rate limits | 429 → advance (client) | PARTIALLY IMPLEMENTED | `Retry-After` honoured; per-model cooldown; do not re-walk exiled model next turn |
| Repeated timeouts | network error → advance once per row; no repeat policy | PARTIALLY IMPLEMENTED | Bounded retry counters; timeout budget; circuit breaker |
| Invalid/unavailable model responses | empty answer advances; non-200 with body stops unless classifiable; AMD 400s kill the chain silently into generic error | PARTIALLY IMPLEMENTED | Detect "model unavailable" (404 model, "model not found" bodies) → exclude model for the session, not the request only |
| Unsupported request capabilities | nothing — no tool calling requests exist yet | NOT IMPLEMENTED | Eligibility filter before selection (tools/structured output required → ineligible) |
| Retry-After respected | NOT — body parsed, header ignored | NOT IMPLEMENTED | One `Retry-After` read; bounded wait or immediate advance (whichever is smaller for UX); log without key |
| Bounded retries | chain is finite by construction; loop risk none today | PARTIALLY IMPLEMENTED | Per-turn attempt budget (e.g. max N models); global kill-switch |
| Retryable vs permanent | 400 stops; rest advances — directionally correct | PARTIALLY IMPLEMENTED | 401/403: mark key failed for session, advance, never retry same key blindly; 429: cooldown; 5xx: advance; 400/other 4xx: stop |
| No auto-switch on malformed user request | honoured by the 400-stops rule | IMPLEMENTED (by accident of classification) | Keep; add tests |
| No duplicate writes after partial failure | no writes exist today | N/A — must be built with the write path | Idempotency keys/verify-before-apply at adapter; proposal approval re-validated at apply time |
| Failover visibility to user | none — Bolu hides it entirely; legacy surfaces last-failure text only on total failure | NOT IMPLEMENTED | "Answered by X after Y failed" + settings-visible history |

**Assessment.** Failover is **PARTIALLY IMPLEMENTED on the legacy path and NOT IMPLEMENTED on the Bolu path.** The skeleton (ordered candidates, advance on classifiable failure) is sound and matches the direction. What it lacks is everything dynamic: cooldown state, Retry-After, attempt budgets, health memory, and any guarantee for writes. The good news: none of this requires new services — it is a bounded amount of state and three or four pure functions living next to `protocol.ts`.

---

## 6. Model inventory and lifecycle assessment

### 6.1 Required inventory metadata vs repository reality

| Required metadata (task §D.2) | Exists today | Note |
|---|---|---|
| Provider identity | yes — `id`, `label` | keep |
| Model identifier | yes — declared `id` + `label` | keep |
| Availability status | no | health ledger (new, small) |
| Context-window capacity | no | per declared model |
| Input/output modalities | no | per declared model |
| Tool-calling support | no | per declared model, tri-state (true/false/unverified) |
| Structured-output support | no | per declared model, tri-state |
| Streaming support | implicit `true` everywhere | must be declared per row; AMD OK (streams), Google OK, OpenRouter per-model |
| Relevant capability limitations | free-text `note` only | structured `limitations[]` per model (e.g. "no tool calls on free lane", "requires thinking param dropped") |
| Pricing / free-tier status when verified | prose notes only (e.g. "500 requests a day") — unverifiable as written, and numbers rot | `freeTier: 'verified' | 'advertised' | 'unknown'`, plus `verifiedAt` date; never a stored counter |
| Operational health | no | rolling counts + last-failure-at + consecutive-failure count + cooldown-until |

Do not duplicate catalog metadata into the health ledger: capability/pricing facts belong beside the declared model; only *observed runtime health* lives in the ledger.

### 6.2 Lifecycle states — existing vs proposed

Existing states: **none.** `AIProviderDefinition` has status-like UI badges only in the Design Lab (`active | configured | needs-key`), which are *configuration* states, not health states. No availability, degraded, rate-limited, unavailable, disabled, retired concept exists anywhere.

Minimal lifecycle (all derived from health ledger + catalog flags; no per-model code):

| State | Meaning | Entry | Exit |
|---|---|---|---|
| `available` | eligible for selection | probe OK or successful call | any health failure |
| `degraded` | succeeds but slow/truncated/odd output | consecutive soft failures below threshold | half-life timeout → probe |
| `rate-limited` | 429 observed | capture `Retry-After` or backoff window | window elapses → probe |
| `temporarily-unavailable` | transport failure / 5xx / model-not-found | N consecutive hard failures | exponential probe (e.g. 60s→15min cap) |
| `disabled` | owner or policy switched off | settings/policy flag | owner action |
| `retired` | removed from declared catalog or provider dropped it | catalog edit or repeated 404/“model not found” | catalog restoration |

Model add/remove = editing catalog data (DEC-23 honored) — **no architectural project per model change**, which is exactly the requirement.

### 6.3 Where the inventory lives

Three candidate homes; decision deferred to product owner:

1. **Catalog module only** (`providerRegistry.ts` + health ledger in memory) — zero schema, restart-fragile, fine for sessions;
2. **Catalog + tiny Supabase health table** (`provider_health(model_id, last_ok_at, consecutive_failures, cooldown_until …)`) — survives restarts, shared across devices of the tenant; needs migration, RLS, DEC;
3. **User preferences in settings storage** (local/native file) — tenant-local, simple, but diverges across devices.

Recommended for approval: (1) for the first step; (2) only when cross-device consistency is wanted. Never store quota counters.

---

## 7. Free-first policy assessment

| Distinction (task §D.8) | Repository reality | Treatment |
|---|---|---|
| Advertised zero pricing | catalog notes scatter prose claims ("500 req/day", "40 RPM", "no per-token billing") | keep as `freeTier: 'advertised'` + `verifiedAt`; never cite as entitlement |
| Actual account entitlement | never checked — no key probe outside Design Lab simulation | selection checks entitlement lazily: first failure routes away; healthy 401/403/429 marks key/model |
| Free-tier quotas | documented in tickets (OpenRouter 15 free variants, 50/day < $10 lifetime credits; 1000/day ≥ $10) — **stale-prone**, ticket itself proves one-week rot | read from provider at runtime (DEC-11); never from a table |
| Temporary promotions | Ampersand ended 2026-11-14 (ticket); free lists change weekly | promotion entries always carry `expiresAt` + auto-demote after expiry or first 429 |
| Provider rate limits | 20 RPM / 50 RPD etc. — unstored, unverified | used only as cooldown hints from live 429s |
| Paid models | no paid selection path requested; no spending policy exists; DEC-07 already forbids paid in trial | gate: paid requires explicit policy + per-request consent; default deny |
| Free ≠ unrestricted | honored in principle (chain), violated in practice (Bolu treats AMD as always-available) | free-first ranks *verified-healthy free* first, never free *first forever* |
| AMD "free" | terms: trial/dev only, not production (DEC-18, RISK-14) | exclude AMD from any shipping chain regardless of allowance |
| Gemini free | content may be used to improve Google products | exclude from tenant PII unless FR-13 consent names it; else ineligible |

**Assessment.** Free-first is an **ethical scheduling policy** over the dynamic pool: rank eligible models by (policy gate → terms-eligible → verified-healthy free → declared free → unverified), never by token price alone. None of this exists in code today; the catalog *order* is the closest artifact and is wrong as a policy engine. Free-first also interacts with §9: the tool-calling pool tail (Baidu/ERNIE etc.) is free but tool-capable only on some lanes.

---

## 8. Conversation continuity and tool compatibility

### 8.1 What exists

- Legacy `chat.ts`: messages pass verbatim; window-blind truncation never happens (short conversations in practice), but `AI_CHAT_MAX_TOKENS = 700` caps *output*, not carried context. No tool schemas (no tools exist). No model-switch mid-thread — the chain re-walks per send, and a silent switch between turns happens already without anyone noticing (different answers from different models in one thread).
- Bolu `bolu-runtime.ts`: `buildProviderMessages` slices `.slice(-12)`, filters roles, strips nothing; `contextFacts` bundle ≤ 8,000 chars; system preamble identical every turn. Deterministic facts are rendered outside the model, so a mid-thread model switch does **not** corrupt factual answers — the design already isolates the model from being the source of truth.
- No tool schemas are transmitted by either path; tool compatibility analysis is therefore about the *approved write direction* (DEC-28), not the present build.

### 8.2 Continuity requirements for the pool architecture

1. **Carry messages verbatim** — never rewrite history on model switch; conversation state (`BoluRuntimeState` / messages array) is model-agnostic by construction. Keep it that way.
2. **Context windows** — declare per model; truncate oldest non-system turns to the *smallest window in the eligible pool* (or refuse with a clear message); never exceed a model's window silently. Hydrogen/Nemotron-class 1M windows widen the pool but cannot be assumed for unknown entries — treat undeclared windows as 32k conservatively until verified.
3. **Tool schemas** — send the tool list only; it is stable across providers (architecture §6.3: "The client keeps the tool list stable so that the cache holds"). A model switch keeps the same tools, the same parameter contract, the same change-card flow. **Never** let the selected model choose the tool list or permissions — application-owned, always.
4. **Structured outputs** — tri-state support per model; if the approved flow needs structured proposals, models without structured-output support are eligible only via the prose→parse path with bounded re-ask, else ineligible.
5. **Prompt interpretation differences** — system preamble must be provider-neutral (it is, today); never depend on vendor-specific prompt dialect; verify with recorded fixtures per provider before adding it to the eligible set (test-plan C-01 exists for this shape).
6. **Mid-thread switch semantics** — switching must not re-trigger side effects; for read-only BI it already has none. For the write direction, proposals are anchored to record state (re-read at apply time), so a switch cannot smuggle stale data into a write.
7. **Empty/odd answers** — validator rejects empty/non-answer and advances; never render "empty success" to the user (already directionally true in `chat.ts`).

**Assessment.** Conversation continuity is **structurally ready** (model-agnostic state, facts isolated from model prose) but **verification-pending** (no cross-provider fixture tests; prompt interpretation unproven per provider; truncation policy missing). Tool compatibility is **NOT IMPLEMENTED** because tools are not implemented; the architecture must keep capability selection application-owned from day one of the write path.

---

## 9. Business-operation safety

BOURXE supports conversational business operations (DEC-28). Current Bolu is read-only. The direction requires:

| Safety property (task §D.6) | Status today | Requirement in the pool architecture |
|---|---|---|
| Tenant isolation | IMPLEMENTED in reads (`tenantClient` + `hasAuthorization` gates; server function re-auths) | Selection must never see or carry tenant scope; model gets no tenant identifiers; catalog config is global, health ledger per-tenant-optional but scope-free |
| Authorization | IMPLEMENTED (read gate); write path not built | Eligibility is app-computed; model may not elevate; authorization re-checked at apply and at save |
| Explicit confirmation / approval gates | no writes exist; approval UX is Design Lab-only simulation | Gates are outside the model entirely; model proposes, app enforces two separate gates (apply vs save) |
| Replacement model cannot bypass tool permissions | trivially true today (no tools) | Enforce by construction: capability set requested by the app, never by the model; tools rejected before they reach a form path |
| No duplicate writes after provider failure | no writes | Idempotency at the adapter: re-read record at apply; reject if state changed; apply-once token for each approved proposal; failure after apply leaves the card marked and blocks silent re-apply; failure **before** any tool executes is safe to fail over freely |
| Approval/transaction boundaries survive model switch | n/a — no writes | Proposal objects carry (capability, recordRef, expectedVersion, diff); any model may produce one, none may execute without user gate; persistence path identical regardless of which model drafted the proposal |
| Partial write then failure | probabilistic if implemented naively | Forbid multi-mutation proposals in one call *or* stage mutations as pending cards; persist only at the save gate; never let a provider execute mid-approval |
| Money movement | forbidden by DEC-28 explicitly | hard-blocked at the capability level, not by prompt |

**Assessment.** Safety today rests on the fact that **Bolu cannot write anything**. That is the strongest guarantee available and must be preserved until the write path is deliberately built with the above properties. The pool architecture does not weaken any of them, provided capability selection is application-owned — which is the one non-negotiable design rule this reconciliation adds to the PRD (see §11, rule R-B).

---

## 10. Design Lab requirements

The Design Lab is currently a 14-provider **simulation** with seeded demo keys and invented test/discovery results. For the dynamic-pool direction, the Lab must evolve from *fake provider test bench* to **read-only mirror of the real engine configuration** — still no network, still no keys, but driven by the same eligibility/health logic the production engine uses.

### 10.1 Required experience elements (Design Lab)

| Element | Requirement |
|---|---|
| Model inventory | Every declared model across every eligible provider: provider, model id, tier (free/paid/unknown), context window, tools/structured-output tri-state, health (available/degraded/cooling/disabled), last-verified date |
| Provider availability | Per-provider roll-up: key state, endpoint reachability badge, last failure reason, cooldown countdown |
| Active model indicator | Top-bar pill shows *the model that answered the last turn*, plus "Auto" marker when the engine chose it; switching visible only as session override, clearly labelled |
| Routing visibility | Per turn: which model was selected, on which attempt number, and why a failover occurred ("429 on X → Y") — rendered as a collapsible trace, not a modal |
| Failover visibility | Session list: failovers with reason, excluded keys, cooled-down models, in Settings an "engine diagnostics" block |
| Health | Rolling per-model health: last ok, consecutive failures, cooldown-until; a manual "re-check now" that is labelled simulation until wired |
| Preferred models and exclusions | Owner/user settings: exclude provider or model from the pool; prefer a model for quality; never silently override eligibility |
| Manual override | Optional per-session pin; must re-join pool on next failure or stay pinned per explicit persistent choice — **pinning must not disable safe failover unless the user explicitly disables auto-failover for the session** (task §D.10) |
| First-run honesty | Copy must state the pool is free-first, terms-dependent, and may change without notice; consent gate visible in the flow |
| Simulation honesty | Every simulated action labelled; no "Connected" copy from fake timers in a shipping build; simulated latency clearly labelled |

### 10.2 Explicit non-goals for the Lab

- Not a production configuration surface (DEC-28 boundary).
- Not a key entry point for real secrets during preview sessions.
- Not evidence of production provider behaviour — acceptance never cites the Lab.

---

## 11. Minimal architectural changes required

**Rule zero: the catalog-row architecture is sufficient.** No adapters, no external router, no second registry, no gateway dependency. The changes below are all inside `src/lib/ai-assistant/` and the two custody candidates already named.

### 11.1 Declared model + catalog changes (data + types only)

1. Extend `AIProviderModel` with optional `{ contextWindow?: number; maxOutput?: number; modalities?: string[]; tools?: boolean|'unverified'; structuredOutputs?: boolean|'unverified'; streaming?: boolean; limitations?: string[]; freeTier?: 'verified'|'advertised'|'unknown'; verifiedAt?: string }`.
2. Collapse the two catalogs: one declared source (either extend `providerCatalog.ts` or fold its 4 rows into the registry and re-export) — one place, no duplication. **REQUIRES PRODUCT-OWNER APPROVAL (E).**
3. Add the dynamic pool types: `ModelHealth` (per model: consecutiveFailures, cooldownUntil, lastOkAt), `Eligibility` (computed: allowed | excluded(reason)).
4. Keep `keys.ts` unchanged in shape; the custody decision affects only *which* store is used by which path (§12, decision B).

### 11.2 Selection and failover (pure functions next to `protocol.ts`)

5. `selectModel(pool, caps, policy): ModelRef` — pure ranker: terms-eligible → policy (paid allowed?) → verified-healthy free → declared free → ordered rest. Deterministic; unit-testable with fixtures.
6. Extend `classifyProviderFailure` or add `classifyFailure(status, retryAfterHeader, errorBody)` returning `{ action: advance|stop|cooldown(ms)|markKeyFailed, retryAfterMs }` — 401/403 mark the key for the session (advance, no infinite retry); 429 cooldown + advance; 5xx advance; 400 other-4xx stop; 404-with-model-wording excludes the model for the session.
7. `sendAssistantChat`/`sendBoluProviderRequest` rewritten to: pick → attempt → classify → exclude/cooldown/advance → bounded attempts (e.g. 3) → render result + which-model-answered metadata. One shared transport used by both client and server (or server-only, per decision B). No duplicate logic.
8. Sticky last-good per session; re-probe cooled models on a schedule, never before their window.
9. Request body unchanged (`model, messages, stream, max_tokens`) plus optional `tools` only when the write path is approved. Never emit parameters a provider drops (AMD `thinking`) unless verified per model — express as limitation, never as a guess.

### 11.3 Lifecycle, inventory, UX

10. In-memory health ledger (step 6.3 option 1) behind a tiny module; no migration in phase 1.
11. Settings/diagnostics block: preferred/excluded lists, pin override, clear-session-health button, engine trace toggle — all read/write the same modules.
12. Consent gate + default-off toggle wired into the authenticated shell before any real send (FR-13/15). Without this, every other item is moot.
13. `/v1/models` refresh as an **explicit action** (FR-19), never blocking first paint.

### 11.4 Hard rules (to encode in the PRD)

- **R-A.** The model never selects tenant scope, authorization, calculations, or permissions. The app computes eligibility.
- **R-B.** Capability selection is application-owned; the model cannot add tools, cannot raise limits, cannot choose providers.
- **R-C.** No free-tier quota number is stored in the repository. Provider truth is read at runtime; the declared floor exists only to keep the UI instant.
- **R-D.** AMD is ineligible for any tenant-facing release until its terms change; Gemini free tier ineligible for tenant PII until consent names it; NumeS ineligible until facts and terms are supplied.
- **R-E.** Pinned manual override never disables safe failover unless the user explicitly disables auto-failover for that session (labelled).
- **R-F.** Unverified tool/structured-output support is `unverified`, not `true`. Selection filters on it accordingly.
- **R-G.** Every failover is visible in-session (which model, why). Silence is a defect.

---

## 12. Unresolved product decisions

Reusing and extending the audit's decision list; all REQUIRES PRODUCT-OWNER APPROVAL.

| # | Decision | Blocking |
|---|---|---|
| A | Provider chain member set + authoritative order; does Cloudflare (account-id-shaped row) join now or later? | §4, §7 |
| B | **Custody**: Capacitor private file per tenant (FR-12) **or** server-side env key per deployment (Bolu). Both exist; one wins; the other is deleted | R-1 drift; §5 |
| C | Consent text naming every eligible provider + default-off toggle; which providers may appear in tenant-facing builds | FR-13; RISK-01; §9 |
| D | AMD eligibility: trial-only forever? Removed from pool? **(Default: ineligible)** | DEC-18; RISK-14; §7 |
| E | Merge the two catalogs into one; which shape survives (registry data shape recommended) | DEC-23; §11.1 |
| F | DEC-09 amendment: manual chain order → policy-constrained automatic selection (**the** direction conflict) | §3.2; §4 |
| G | Paid escalation: may the engine ever select a paid model, under what per-user policy and consent | §7 |
| H | Health-ledger home: memory-only first, or Supabase table now (RLS, retention, purge) | §6.3 |
| I | `gemini-4-hydrogen` and other Hydrogen-class models: eligible only after AI Studio verification of the free tier for the BOURXE project, or defer | §6(extended);[EXT-DOC] |
| J | NumeS admission: supply docs/URL/auth/model ids/ToS; interim = custom provider only, no declared row | §7 |
| K | Write path (DEC-28) sequencing vs pool work — pool first (read-only, low risk), then tools; two gates preserved | §9 |
| L | Attribution/provenance note for Hermes-derived concept (MIT) | [SELF §2.4] |
| M | Whether the legacy client path is retired once custody is decided, and on what date | R-1 |
| N | Engine diagnostics default visibility (off by default, toggle in Settings) and retention of failover history | §10 |
| O | Re-verification cadence for declared metadata (weekly auto-mark `verifiedAt` stale?) | §6; §7 |

---

## 13. Recommended implementation sequence

Phase order is gated on §12 answers; nothing starts before B, C, D, and F.

**Phase 0 — Decisions (owner, no code).** A–F (+L). Record in decision-log; amend DEC-09 per F; record AMD disposition per D.

**Phase 1 — Pool core (server-side first if B = server).**
1. Collapse catalogs to one source (E). Add capability + health types (11.1).
2. Pure `selectModel` + `classifyFailure` with fixture tests (sanitized). 300 lines cap; no deps.
3. Rewire the transport both paths share; preserve message shapes; preserve `BoluRuntimeState` transitions; keep deterministic facts outside the model.
4. Bounded attempts; cooldown; sticky-last-good; visible "answered by" trace behind a Settings toggle. Kill-switch env flag.

**Phase 2 — Consent & safety gates.** FR-13 disclosure with named providers; default-off; AMD excluded (D); per-provider eligibility flags; client PII blocked where no consent (C). Read-only remains the only enabled capability.

**Phase 3 — Inventory UX (Design Lab first, production second).** Read-only inventory + diagnostics block in the Lab mirrored from the real engine; then production Settings section: preferred/excluded, pin override with explicit "auto-failover off" label (E-R-E), health readout. No key changes yet.

**Phase 4 — Discovery & verification.** Explicit `/v1/models` refresh (FR-19); declared-floor kept; failure preserves declared list; first per-provider fixture recordings for the eligible set (debate: Gemini/AMD/OpenRouter/NVIDIA/Groq); capability tri-states flip from `unverified` to verified only with evidence dated in the row. Hydrogen admitted only after AI Studio evidence (I). NumeS admitted as `custom:` only after operator pack (J).

**Phase 5 — Write path (DEC-28) — separate program.** Capabilities (tools), proposals, two approval gates, idempotent adapter, verify-before-apply, duplicate-write protection, full operations test addendum (`test-plan.md` already sketches this). Only after Phases 1–4 are stable and the owner approves FR-03/04/05/09/24/25/26 details.

**Continuous.** Weekly metadata-drift sweep of declared rows; any row whose provider changes terms, limits or ids is auto-marked `unverified` and ineligible until re-verified (rule C, O).

**Anti-sequence:** do not build the tool loop first; do not adopt OmniRoute; do not add an AI SDK dependency; do not design the health table until Phase 1 proves the memory ledger insufficient.

---

## 14. Exact files and evidence inspected

### 14.1 Git and repository state
- `git status --porcelain=v1` before and after (this audit; see §15), `git log --oneline -10`, `git diff` of the five pre-existing PRD edits (quoted), `package.json` (no AI SDK dependencies; scripts confirmed; `audit:load` exists).

### 14.2 Prior audit (authoritative sibling)
- `docs/reports/ai/2026-11-14-hermes-provider-architecture-audit.md` — provenance, tier-row mapping, custody finding, PRD vs implementation disposition, Gemini 4 Hydrogen external verification, NumeS unverifiability, recommendation (reuse + narrow extensions).

### 14.3 Implementation (`src/`, `api/`)
- `src/lib/ai-assistant/providerCatalog.ts`, `providerRegistry.ts`, `protocol.ts`, `keys.ts`, `chat.ts`, `bolu-provider.ts`, `bolu-runtime.ts`, `bolu-transport.ts`
- `src/components/ai-assistant/BoluAssistantProvider.tsx` (hardcoded `providerAvailable: true`), `AssistantSheet.tsx`, `DashboardAssistant.tsx` (roles per prior audit)
- `src/components/design-lab/assistant-chat-providers.ts`, `assistant-chat-settings.tsx`, `assistant-chat-model-pill.tsx`, `assistant-chat-preview.tsx`, `assistant-chat-layouts.tsx`, `assistant-chat-script.ts`
- `api/bolu-chat.ts`
- `src/tests/ai-assistant/*.test.js`, `src/tests/critical/*.test.js` (exist; not run)

### 14.4 PRD and tickets
- `docs/prd/conversational-document-assistant/{Readme.md, functional-req.md, architecture.md, decision-log.md, provider-catalog.md, risk-register.md, test-plan.md, Waterfall-roadmap.md}` (+5 pre-existing owner edits quoted verbatim by file)
- `docs/tickets/free-model-failover-stack.md` (OpenRouter/Our Free Model/registry-rot evidence), `docs/tickets/local-ai-model-swap-and-speedup.md`, `docs/tickets/free-claude-code-evaluation.md`
- `docs/reports/ai/2026-11-13-bolu-prd-compliance-audit.md`, `docs/reports/ai/2026-11-13-bourxe-assistant-prototype-experience-audit.md`, `docs/reports/ai/2026-11-13-bolu-production-runtime-implementation.md` (existence/roles), `docs/reports/ai/bigdrops-local-ai-llamacpp-android-poc-2026-09-27.md`

### 14.5 External documentation ([EXT-DOC], 2026-11-14; provider facts — not permanent)
- NousResearch/hermes-agent (MIT) — provider/base-URL/custom-endpoint model (see [SELF] §2)
- Google DeepMind Gemini 4 Hydrogen model card; blog.google Hydrogen announcements; Google Cloud Hydrogen developer guide; Cursor model list — id `gemini-4-hydrogen`, 1M context, AI Studio distribution
- Google AI Studio OpenAI-compatibility coverage (Chat Completions/embeddings; partial), quota-not-published guidance
- OpenRouter free-tier mechanics (`/api/v1/key`, `free_model_daily_requests`), 15 free variants stat from ticket; AMD China-site terms (trial/dev only); NVIDIA NIM free endpoints (trial-use wording)
- NumeS: **no official documentation found**; treated as unverified throughout

### 14.6 Verification restrictions
- `bun run build`: not run (permanently prohibited for this host). `bun run typecheck`: not run. `bun run lint`: not run. `bun run test`: not run. No migrations, no provider calls, no network probes. Read-only file access only; the single write is this report.

---

## 15. Git status verification (before / after this reconciliation)

### 15.1 Before (captured at task start; HEAD `cdfca468`, `main`, 16 ahead of `origin/main`)

```
 M docs/prd/conversational-document-assistant/architecture.md        (owner, DEC-28 boundary)
 M docs/prd/conversational-document-assistant/decision-log.md        (owner, DEC-28 wording)
 M docs/prd/conversational-document-assistant/provider-catalog.md    (owner, catalog now flagged proposal)
 M docs/prd/conversational-document-assistant/risk-register.md      (owner, status line)
 M docs/prd/conversational-document-assistant/test-plan.md           (owner, operations addendum)
?? docs/reports/2026-11-14-hermes-provider-architecture-audit.md     (prior audit, untracked)
?? video-json-tutorial/                                               (pre-existing, untouched)
```

### 15.2 After (captured immediately after this report was written)

```
 M docs/prd/conversational-document-assistant/architecture.md
 M docs/prd/conversational-document-assistant/decision-log.md
 M docs/prd/conversational-document-assistant/provider-catalog.md
 M docs/prd/conversational-document-assistant/risk-register.md
 M docs/prd/conversational-document-assistant/test-plan.md
?? docs/reports/2026-11-14-dynamic-model-routing-reconciliation.md    ← this report
?? docs/reports/2026-11-14-hermes-provider-architecture-audit.md
?? video-json-tutorial/
```

### 15.3 Delta attributable to this task

Exactly one new file: `docs/reports/2026-11-14-dynamic-model-routing-reconciliation.md`. No application source, tests, configuration, migrations, PRD files, or existing reports were modified. The five PRD modifications pre-date this task (owner's in-flight DEC-28 reconciliation; present in the §15.1 capture) and are preserved unedited. No commits, pushes, stashes or branch operations were performed. `bun run build`/`typecheck`/`lint`/`test`: not run.

---

## Final determination

**The existing BOURXE architecture supports the product owner's intended model-switching experience through incremental extensions. A fundamental architectural gap does not exist — but an implementation gap and a decision gap do.**

Concretely:

- The substrate is right: declarative catalog rows, one OpenAI-compatible transport, shared SSE parser, shared key custody, deterministic facts isolated from model prose, approval-gated writes.
- The missing pieces are (i) capability + health metadata, (ii) a pure selection policy, (iii) failover with Retry-After and cooldown, (iv) one catalog source, (v) consent and custody gates, (vi) removal of AMD from any tenant-facing path, (vii) verification discipline for free tiers. All are small, local, and dependency-free.
- The blockers are decisions, not engineering: DEC-09 amendment (F), custody (B), consent (C), terms (D/J), Hydrogen admission (I), paid policy (G). Until they land, the honest state of the product remains: one engine, one provider, one model — interchangeable in principle, singular in fact.
- Acceptance test for the direction: *a new free provider row is added as data (one file, no code), becomes eligible automatically after `/models` verification, is preferred for eligible workloads when healthy, is bypassed transparently when 429ing, is visible in-session as the answering model, and disappears from the pool when removed — all without a migration, an adapter, or a release.* Today's architecture passes the shape of that test with Phase 1 alone.

**Do not implement until the product owner has reviewed this reconciliation and recorded decisions A–F (and J).**
