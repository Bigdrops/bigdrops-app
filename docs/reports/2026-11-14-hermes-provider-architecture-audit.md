# Hermes-Derived AI Provider Architecture — Audit and Reconciliation

This report was written by Inkling 2 Small Free (OpenCode) on 2026-11-14.

Audit task: AUDIT AND RECONCILE THE HERMES-DERIVED AI PROVIDER ARCHITECTURE ACROSS THE BOURXE PRD AND DESIGN LAB.
Strictly zero-code audit. No application, test, configuration, migration or documentation file was modified by this audit. The only file created by this audit is this report.

Skills consulted (from `docs/PROJECTSKILLINDEX.md`): `typescript-advanced-types`, `openapi-to-typescript`, `react-dev` (inspected for conformity; none applied, because no code was changed). No AI-architecture-specific skill exists in the index; the index was read as required.
Documentation standard: ASD-STE100 Simplified Technical English.

Writing note: the task requires this report under `docs/Reports/`. The project already holds `docs/reports/` (lowercase). On this case-insensitive filesystem both paths resolve to the same folder. This report was written to `docs/Reports/2026-11-14-hermes-provider-architecture-audit.md` as instructed and is the only file this audit created.

## Evidence labels

- **VERIFIED** — repository evidence or cited external official documentation supports the finding.
- **PARTIALLY VERIFIED** — some evidence exists; a part is missing, simulated, stale or unverified.
- **NOT FOUND** — no evidence in the repository.
- **CONFLICTING** — repository artifacts state different things and the conflict is not resolved.
- **REQUIRES APPROVAL** — a product-owner or security decision is needed before the item can proceed.

Two evidence classes are used throughout:

- **[REPO]** — found by static inspection of this repository on 2026-11-14.
- **[EXT-DOC]** — from external provider or project documentation consulted for this audit (Google DeepMind model card and Google blog, Cursor model list, Google AI developer blog, Hermes Agent repository and docs). External documentation describes provider capabilities, not BOURXE behaviour. Provider limits and availability change; external findings are marked as of 2026-11-14 and must not be treated as permanent.

---

## 1. Executive Summary

BOURXE holds a layered AI provider architecture. It is not one system. It is three related artifacts that were never reconciled:

1. **The runtime chain** (`src/lib/ai-assistant/providerCatalog.ts`, `chat.ts`, `protocol.ts`, `keys.ts`) — used by the legacy invoice-assistant prototype in the browser/native client. Four preconfigured rows (NVIDIA NIM, OpenRouter, AMD Token Factory, Google AI Studio), static failover, keys in native app-private storage or browser session memory.
2. **The wide catalog** (`src/lib/ai-assistant/providerRegistry.ts`) — a 14-provider tier-1 catalog plus a custom-provider form and validator. It is consumed only by the Design Lab provider-settings simulation. It is never imported by the runtime client.
3. **The new Bolu runtime** (`src/lib/ai-assistant/bolu-*`, `api/bolu-chat.ts`) — uncommitted pre-existing work that serves one fixed AMD Token Factory endpoint through a Vercel server route, holds the key server-side in the environment, and does deterministic intent matching instead of model tool calls.

The Hermes connection is real but thin. Three comments in `providerRegistry.ts` state that the catalog entry shape follows the Hermes provider entries, that Hermes calls a user-supplied endpoint a "named provider", and that custom-provider validation "mirrors Hermes". The PRD (`provider-catalog.md`) states the same. No Hermes source file, commit hash, URL, copyright notice or licence reference exists anywhere in the repository. The implementation that exists is an independent TypeScript re-implementation of the concept, not a copy of Hermes code. The concept matches the Hermes Agent custom-provider model (a base URL, a key and model ids over an OpenAI-compatible endpoint).

The PRD set is in DRAFT FOR REVIEW status with explicit requirement dispositions recorded on 2026-11-13. FR-18 (14-provider catalog), FR-19 (model discovery), FR-20 (model pill), FR-21 (custom providers) and FR-22 (four layouts) are all recorded as **PROPOSED — not approved for the first release**. FR-12 (credential custody) and FR-13 (privacy consent) are **UNRESOLVED**. FR-10 and FR-11 (chain and quota readout) are **PROPOSED**. The implementation evidence does not support any of these being production-complete.

The Design Lab provider-settings experience is a session-memory simulation. It is labelled as such in its own UI. It is not production functionality and must not be cited as evidence that provider selection, testing or discovery works.

Both target expansions can fit the existing architecture **without a new provider system**:

- **Gemini 4 Hydrogen** is an OpenAI-compatible catalog row change (a model id) plus, optionally, capability metadata (context window). Google AI Studio exposes the documented OpenAI-compatible endpoint used by the existing `gemini` row. No adapter is needed. Free-tier limits and model availability must be verified in AI Studio before reliance.
- **NumeS** cannot be verified from any repository evidence or from public official documentation found during this audit. It may only enter the architecture through the existing custom-provider path (FR-21 shape) with the base URL, key prefix rule, declared models and data-handling terms supplied and approved by the product owner. It must not be treated as OpenAI-complete.

Recommended direction: keep the OpenAI-chat-completions abstraction, keep the catalog-row approach, reuse `protocol.ts`/`keys.ts`, and extend narrowly (capability metadata per model, optional live `/models` discovery, a consent gate, honest `Retry-After` handling, and one server-vs-client key-custody decision). Do not add a per-provider adapter layer, do not add OmniRoute as a dependency, do not store quota tables, and do not build a second provider system.

**Top three decisions the product owner must make** before any Gemini/NumeS work:

1. Provider chain order and which providers may appear in a shipping build (conflicting PRD orders: Readme §4.1 lists NVIDIA first; architecture.md DEC-17/DEC-18 put Cloudflare first and AMD second; `providerCatalog.ts` keeps nvidia→openrouter→amd→gemini while flagging the conflict as unresolved).
2. Key custody: client-side Capacitor private file (FR-12 draft) versus server-side Vercel environment key (the uncommitted Bolu path). Both exist in the repository today. This is FR-12, explicitly UNRESOLVED.
3. Whether AMD Token Factory and free-tier Gemini may process tenant business data at all (terms-of-service and free-tier data-training exposure), which gates FR-13 and every free provider.

---

## 2. Hermes Source Provenance and Implementation Mapping

### 2.1 Which Hermes repository was used

| Item | Finding | Label |
|---|---|---|
| Repository named in repository evidence | None. No Hermes URL, commit, version or file path exists in any project file, commit message, ticket, PRD or report. | NOT FOUND |
| Hermes references in code | Three comments in `src/lib/ai-assistant/providerRegistry.ts`: lines 4–6 ("The shape follows the Hermes provider entries…"), line ~294 ("Hermes calls this a named provider."), line ~364 ("Validation mirrors Hermes…"). One PRD statement: `docs/prd/conversational-document-assistant/provider-catalog.md` line 10 ("The shape follows the Hermes agent provider entry…"). | VERIFIED [REPO] |
| Hermes references in Design Lab | One simulated discovered model id: `nousresearch/hermes-4-70b` in `src/components/design-lab/assistant-chat-providers.ts` line 160 (inside `simulateModelDiscovery`, a demo artifact). | VERIFIED [REPO] |
| Hermes references elsewhere | `docs/tickets/free-claude-code-evaluation.md` names Hermes as one of 12 agent harnesses (unrelated). `docs/tickets/local-ai-model-swap-and-speedup.md` unrelated. `.hermes/` directory exists at repository root (agent-harness config mirroring skills; contains no provider implementation). | VERIFIED [REPO] |
| Candidate external repository | The shape described (a provider entry of name, base URL, key rule, declared model list, optional live model list, custom OpenAI-compatible endpoint, API key + base URL + model contract) matches Nous Research's **Hermes Agent** — `github.com/NousResearch/hermes-agent` (MIT licence, Nous Research) [EXT-DOC, verified 2026-11-14]. Hermes Agent documents named OpenAI-compatible providers, a `model.base_url` override, a custom endpoint wizard (`hermes model`), and a `custom-endpoints-settings` desktop UI with name, base URL, API key, model and api mode. | PARTIALLY VERIFIED [EXT-DOC] |
| Licence of the candidate repository | MIT (GitHub repository page states "MIT license"). [EXT-DOC, 2026-11-14] | PARTIALLY VERIFIED [EXT-DOC] |

**Limitation.** The task required the Hermes repository to be recovered from project evidence. The repository contains no URL. The identification of `NousResearch/hermes-agent` is external web evidence, not project evidence. If the project used a different "Hermes" (for example the React Native Hermes engine, or an internal fork), the repository evidence does not show it. This report proceeds on the NousResearch/hermes-agent identification because the vocabulary matches exactly ("named provider", "custom endpoint", OpenAI-compatible base URL + key + model + `/v1/models` discovery, desktop settings UI with name/baseURL/key/model), and marks every such claim PARTIALLY VERIFIED.

### 2.2 What was copied, adapted or merely inspired

| Hermes concept ([EXT-DOC]) | Repository counterpart | Relationship | Label |
|---|---|---|---|
| Provider entry = base URL + key + declared models + optional live list ([EXT-DOC] concept; PRD line 10 states it as the source) | `AIProviderDefinition` in `providerRegistry.ts` (name, baseUrl, keyPrefix, defaultModel, models[], supportsModelList) | **Adapted.** Field set is similar but re-typed in TypeScript with BOURXE tiers (`first-party` / `aggregator` / `custom`), `keyHint`, `signupUrl`, `note`, optional `authScheme`. No Hermes code was found verbatim. | PARTIALLY VERIFIED |
| Custom / named OpenAI-compatible endpoint (name, base URL, key, model; [EXT-DOC] "api_mode") | `CustomProviderDraft` + `validateCustomProvider()` (lines ~294–409): display name, `https://…/v1` base URL, key, model IDs (comma/newline), optional JSON extra headers, optional context window ≥ 1000. `custom:<slug>` id scheme. | **Adapted and extended.** Validation rules (HTTPS-only, path ends `/v1`, ≥ 1 model id, string-valued JSON headers, context window minimum) are BOURXE-specific. No extra api_mode equivalent exists. | VERIFIED [REPO] |
| `base_url` override precedence / auth wiring per provider ([EXT-DOC]) | No equivalent. BOURXE keeps one bearer header per request (`Authorization: Bearer <key>`) in `chat.ts` and `api/bolu-chat.ts`. `authScheme` exists in the type but is never read. | **Not implemented.** | VERIFIED [REPO] |
| Fallback / model routing (`fallback_chain`, `fallbacks` arrays, `MODEL_FALLBACKS` in sister tools) | Not Hermes-derived. BOURXE `chat.ts` walks `AI_PROVIDER_ORDER` on every call. No stickiness, no retry-after, no benching, no per-provider cooldown. | **Independent implementation.** Not faithful to either Hermes or the failover research in `docs/tickets/free-model-failover-stack.md` (which documents our-free-model `classify.js` benching behaviour — also not implemented). | VERIFIED [REPO] |
| Live `/models` discovery (`GET /v1/models`, [EXT-DOC]; ticket `free-model-failover-stack.md` Not-verified section) | `supportsModelList` flags in registry; `simulateModelDiscovery` in Design Lab (650 ms fake delay, canned lists, includes an OpenRouter row inventing `nousresearch/hermes-4-70b` and `qwen/qwen3-coder-480b`). No production discovery code. | **Simulated only.** | VERIFIED [REPO] |
| Desktop provider-settings UI (Hermes `custom-endpoints-settings.tsx`, [EXT-DOC]) | Design Lab `assistant-chat-settings.tsx` + `assistant-chat-model-pill.tsx` (badges, key field, test, model dropdown, custom form). Comments and layout differ; local `ac-*` CSS. | **Inspired by, re-implemented.** No Hermes component or markup found. | PARTIALLY VERIFIED |

### 2.3 Faithfulness and changes for BOURXE

**Faithful to the source:** only the *idea* that a provider is a declarative entry (base URL + key rule + default model + declared models) and that a custom endpoint is the same shape with a user-supplied base URL. That is the entire Hermes footprint.

**Changed for BOURXE:**

- Request path is fixed to OpenAI chat completions with `stream: true` and `max_tokens: 700` (`protocol.ts`). Hermes supports `api_mode` auto-detection and an Anthropic Messages path; BOURXE does not.
- Failover is a flat static order with HTTP-status classification in `protocol.ts` (429/401/403/404/5xx advance; others stop). No `Retry-After` handling, no exponential backoff, no provider benching.
- Key custody is split: native Capacitor `Directory.Private` file (unencrypted, path `ai-assistant/keys.json`) for the legacy client path, or server-side environment key for the uncommitted Bolu path. Neither is a Hermes mechanism.
- 14 declared provider rows with Nigeria-oriented notes (AMD on China site, OpenRouter free-tier rules). These are BOURXE research artifacts, not Hermes content.
- Design Lab preview scaffolding, four viewport shells, scripted invoice demo. No Hermes equivalent.

**What is missing relative to Hermes ([EXT-DOC]):** named-provider precedence and per-endpoint key handling, `api_mode` selection, cached `/models` merge with failure preservation (BOURXE has the *declared-list-survives-failure* rule only in docs/PRD and in the Design Lab simulation), and any attribution. Hermes is MIT, which requires retention of the copyright notice only for copied substantial portions; no substantial verbatim copy was found, so MIT is probably not triggered, but see §8.4 and §11.

### 2.4 Attribution and licensing

- No `LICENSE`, `NOTICE`, `COPYING` or `THIRD_PARTY` file in the repository root or `docs/` mentions Hermes or Nous Research. **NOT FOUND [REPO].**
- The three code comments name "Hermes" without a URL, version or licence. If a future contributor copies Hermes code into BOURXE, MIT requires that the copyright notice be preserved. The current comments are not sufficient attribution and are not a substitute for it.
- Recommendation (no action without approval): add a one-line provenance note in the next provider-catalog documentation update stating the concept source and its MIT licence, or remove the Hermes name from comments if the team cannot confirm the derivation.
- REQUIRES APPROVAL: whether to add a `THIRD_PARTY_NOTICES` entry for Hermes Agent (MIT) as a precaution.

---

## 3. Existing BOURXE Provider Architecture (as implemented)

### 3.1 Two runtimes, one UI lab

| Layer | File(s) | Role | Status |
|---|---|---|---|
| Runtime provider rows (client) | `src/lib/ai-assistant/providerCatalog.ts` | 4 rows: `nvidia`, `openrouter`, `amd`, `gemini`. `AI_PROVIDER_ORDER` = declaration order. `getAIProviderRow`, `orderedAIProviderRows`. Comment records the unresolved DEC-17/DEC-18 chain conflict; Cloudflare omitted because base URL needs an account id. | VERIFIED — exists, works as written (not executed) |
| Client failover and streaming | `src/lib/ai-assistant/chat.ts` | `sendAssistantChat()` walks rows in order; first key present and non-empty answer wins. 429/401/403/404/5xx advance; other non-OK stops; network errors advance; empty answer advances. SSE consumption via `consumeStream`. AbortError rethrown. No Retry-After handling, no stickiness, no quota readout. | VERIFIED — implemented; not the approved direction (Bolu) |
| Protocol helpers | `src/lib/ai-assistant/protocol.ts` | `buildChatRequestBody` (model/messages/stream/max_tokens only, `AI_CHAT_MAX_TOKENS = 700`), `classifyProviderFailure`, `extractSseText`, `maskKey`, `readProviderErrorBody` (sanitises provider error body; clips at 240 chars). | VERIFIED — implemented; unit-tested by `src/tests/ai-assistant/protocol.test.js` (exists; not run in this audit) |
| Key custody (client) | `src/lib/ai-assistant/keys.ts` | Native: Capacitor `Filesystem.readFile/writeFile` at `Directory.Private`, path `ai-assistant/keys.json`, UTF-8 JSON. Browser: in-memory `memoryKeys` only, no localStorage. `listConfiguredProviders`, `hasAnyProviderKey`, `getProviderKey`, `setProviderKey`, `removeProviderKey`. No file-mode/permission setting in code; no encryption; no integrity check. | VERIFIED — implemented with the noted limits. Note: FR-12 acceptance "file mode owner only" is NOT evidenced in code (no mode flags are set). |
| Wide catalog + custom provider | `src/lib/ai-assistant/providerRegistry.ts` | 14 rows (OpenRouter, Anthropic, OpenAI, Gemini, Groq, DeepSeek, Mistral, Together, Fireworks, Cerebras, xAI, Cohere, NVIDIA, AMD) with key prefixes, signup URLs, declared models, `supportsModelList`, `authScheme?` (never read), `AI_PROVIDER_REGISTRY`, `getProviderDefinition`. Custom provider: `slugifyProviderName`, `parseModelIds`, `parseExtraHeaders`, `validateCustomProvider` (https + `/v1` path, ≥1 model id, context window ≥ 1000, string-only JSON headers). **Not imported by `chat.ts` or any production route** — only by Design Lab (`assistant-chat-providers.ts`, `assistant-chat-settings.tsx`). | VERIFIED — implemented as data; not wired into production |
| Bolu production server path (pre-existing, uncommitted) | `src/lib/ai-assistant/bolu-provider.ts`, `bolu-runtime.ts`, `bolu-transport.ts`, `bolu-context.ts`, `bolu-data.ts`, `bolu-capabilities.ts`, `api/bolu-chat.ts`, `src/components/ai-assistant/BoluAssistantProvider.tsx` | Server-side proxy: Vercel function authenticates Supabase user, reads `BOLU_AMD_API_KEY` from environment, posts to hard-coded AMD endpoint (`https://developer.amd.com.cn/radeon/api/v1/chat/completions`), model `DeepSeek-V4-Flash`, streams SSE back to client. Bolu does deterministic intent matching (`matchBoluIntent`); no model tool calling; message bounds (`MAX_MESSAGES=24`, 4000 chars/message, 12k total, 8k facts). AMD key is server-side only; user never pastes a key. | VERIFIED — implemented; uncommitted in working tree; NOT documented in the PRD |
| Design Lab simulation | `src/components/design-lab/assistant-chat-providers.ts`, `assistant-chat-settings.tsx`, `assistant-chat-model-pill.tsx`, `assistant-chat-preview.tsx`, `assistant-chat-layouts.tsx` | Session-memory provider state, seeded fake keys for `openrouter` and `gemini`, simulated test (`simulateConnection`, 700 ms delay, always OK for ≥ 12 chars + prefix match), simulated discovery (`simulateModelDiscovery`, canned/generated ids), four viewport shells, badges derived from memory. Labelled "Preview simulation · no provider calls" and "Simulate test". | VERIFIED — simulation; not production |

### 3.2 Capability-by-capability status

| Capability | Status | Evidence |
|---|---|---|
| Provider registration (client rows) | VERIFIED — static, hand-maintained rows | `providerCatalog.ts` 4 rows |
| Provider registration (14-provider catalog) | VERIFIED — data only; consumed by Design Lab only | `providerRegistry.ts`; import sites: Design Lab only (grep) |
| Provider registration (Bolu server) | VERIFIED — one hard-coded provider | `bolu-provider.ts` `getBoluProviderConfig` |
| Settings UI — production | NOT FOUND in production sheet (`AssistantSheet.tsx` hosts conversation only; provider setup is a simple key entry — see prior reports) | [REPO]; prior audit `2026-11-13-bolu-prd-compliance-audit.md` |
| Settings UI — Design Lab | VERIFIED — simulated | `assistant-chat-settings.tsx` |
| Model selection and persistence | PARTIAL — selection exists in Design Lab state; nothing is persisted across sessions anywhere; production Bolu has no model selector | `assistant-chat-providers.ts`; `bolu-runtime.ts` |
| API adapters per provider | NOT FOUND — deliberately none (one OpenAI-compatible path). AMD Anthropic Messages path explicitly not used (DEC-19). | `architecture.md` §6.6, DEC-19 |
| Request normalization | VERIFIED — `buildChatRequestBody` (4 params only) | `protocol.ts` |
| Streaming | VERIFIED — SSE `data:` line parsing shared by client path and Bolu transport (`extractSseText`) | `protocol.ts`, `bolu-transport.ts`, `chat.ts` |
| Error handling (provider) | PARTIAL — status→advance classification exists; provider error body sanitised; no `Retry-After`; no per-provider marking of failed keys in Settings; no user-visible "which provider answered" in Bolu path | `protocol.ts`, `chat.ts`, `api/bolu-chat.ts` (502 with sanitised message) |
| Model discovery | NOT IMPLEMENTED (production). Simulated in Design Lab. PRD FR-19 and DEC-24 require declared-list-with-on-demand-`/models` merge. | `assistant-chat-providers.ts` `simulateModelDiscovery` |
| Model capability metadata (context window, max output, tool support) | NOT FOUND — `contextWindow` exists only as optional custom-provider field, unused for requests; no per-model capability table anywhere. | `providerRegistry.ts` (`CustomProvider.contextWindow`), grep |
| Tool / function calling | NOT IMPLEMENTED — Bolu uses deterministic intent→capability matching; no `tools`/`tool_choice` in any request body. Design Lab script simulates tool calls. Test plan `test-plan.md` expects tool schema tests; none exists for Bolu. | `bolu-runtime.ts`, `api/bolu-chat.ts`, prior audit FR-03 |
| Structured outputs | NOT FOUND | grep for `response_format` / `structured_outputs` — no matches in src |
| Context-window handling | PARTIAL — only `AI_CHAT_MAX_TOKENS = 700` cap and Bolu message/facts bounds; no per-model context enforcement, no truncation strategy for conversation beyond `.slice(-12)` in `buildProviderMessages` (note: `contextFacts` and conversation are budgeted by `bolu-provider.ts`; full active context window of the model is never consulted) | `protocol.ts`, `bolu-runtime.ts`, `bolu-provider.ts` |
| Provider/model capability differences | NOT FOUND — no capability matrix; one request shape for all rows | — |
| Quota / rate-limit / retry handling | PARTIAL — HTTP 429 advances the chain (client path); server path returns 502 generic; no quota parsing, no `Retry-After`, no backoff, no remaining-allowance readout. PRD FR-11 and ticket research require reading `free_model_daily_requests.remaining` (OpenRouter) and 429 bodies (Gemini). | `protocol.ts`, `chat.ts`, `api/bolu-chat.ts`; ticket `free-model-failover-stack.md` |
| Fallback and routing | PARTIAL — static order walk; no session stickiness despite `architecture.md` §7 stating "A provider that answered is remembered for the session" (NOT implemented); AMD chain absent in Bolu path (single endpoint, no fallback) | `chat.ts`, `api/bolu-chat.ts` |
| Constitution of tests | PARTIAL — `protocol.test.js` (not run), Bolu test suite (`bolu-*.test.js`, not run), `assistantChatUxContracts.test.js` / `assistantChatLiquidGlass.test.js` (not run). No test for `providerRegistry.ts` validation rules; no test for Design Lab discovery simulation. | `src/tests/ai-assistant/`, `src/tests/critical/` |

### 3.3 Credential handling detail

- [REPO] No API key, token or secret was printed or copied by this audit. Demo keys in `assistant-chat-providers.ts` (`seedProviderEntries`) are explicit placeholders ("not-a-real-key") and are not credentials.
- [REPO] `keys.ts` stores raw keys in plaintext JSON in the app-private directory. The PRD accepts this trade-off (DEC-12). It is not encryption and must not be described as such.
- [REPO] `api/bolu-chat.ts` reads `BOLU_AMD_API_KEY` from `process.env`; `console.error` logs only status codes and error *names*, not bodies or keys. Good practice, but uncommitted and unverified against a deployed secret.
- [REPO] Client path sends the user's key from device memory directly to provider endpoints (browser) — subject to CORS on some providers (AMD endpoint reachability from client was never live-tested).

---

## 4. PRD vs Implementation Reconciliation

PRD set under audit: `docs/prd/conversational-document-assistant/{Readme.md, functional-req.md, architecture.md, provider-catalog.md, decision-log.md, risk-register.md, test-plan.md, Waterfall-roadmap.md, roadmap.html}`.

**Status caveat.** The PRD is DRAFT FOR REVIEW. `functional-req.md` carries an explicit 2026-11-13 authored disposition block: FR-01..FR-22 remain "preserved as proposed requirements"; FR-18, FR-19, FR-20, FR-21, FR-22 are recorded as **PROPOSED — not approved for the first release**; FR-12 and FR-13 are **UNRESOLVED**; FR-10, FR-11, FR-15 are **PROPOSED/UNRESOLVED**; FR-23…FR-28 (Bolu read/write direction, DEC-28) are the approved principles. Any implementation claim below is therefore measured against draft text, not approved scope. The PRD files themselves have **pre-existing uncommitted modifications** in the working tree (`Readme.md`, `functional-req.md`, `decision-log.md`, `Waterfall-roadmap.md`, `roadmap.html`) — treated as pre-existing and preserved by this audit.

### 4.1 Requirements implemented

| Requirement | Status | Evidence |
|---|---|---|
| FR-05 / FR-16 G4 (model never writes computed values) — read-only path | VERIFIED (partially scoped) | `bolu-runtime.ts` renders `formatRecordAmount` from retrieved rows; no model-calculated value path exists in Bolu. Legacy client path computes nothing model-side either. |
| FR-16 G8 (no assistant data written to tenant DB) | VERIFIED (static only) | No write calls to Supabase from assistant code; Bolu persists nothing. |
| Architecture §2 / FR-17 (shared assistant code outside invoice module) | VERIFIED | `src/lib/ai-assistant/` imports nothing from `src/domain/invoice/`. |
| DEC-23 / FR-18 data shape (catalog as declarative rows) | PARTIALLY VERIFIED | Registry and catalog exist as data; only Design Lab consumes the registry. |
| DEC-27 (keep local chat primitives, no assistant-ui runtime) | VERIFIED | No `@assistant-ui/*` dependency in `package.json` (grep). |

### 4.2 Requirements documented but not implemented (production)

| Requirement | Disposition in PRD (2026-11-13) | Implementation evidence | Gap |
|---|---|---|---|
| FR-10 Provider chain & failover (429 advances within 2 s; 400 stops; `Retry-After` honoured; user sees which provider answered) | PROPOSED | `chat.ts` has status classification only; no `Retry-After`; no provider-identity readout; AMD chain absent in Bolu; no device latency test | Retry-After, readout, AMD reachability, provider-visible identity |
| FR-11 Quota readout (reads provider, not stored) | PROPOSED | None. No code parses `free_model_daily_requests`, Gemini 429 quota bodies, AMD allowance headers, or OpenRouter `/api/v1/key` | Entire feature |
| FR-12 Key management (add/remove/test; private file; browser memory; mask; prefix check; removal from chain) | UNRESOLVED | `keys.ts` (client) implements most of this for the legacy browser/native path only; Bolu path has no key UI at all; no file-mode setting; no test coverage for removal; Design Lab = simulation | Production key UI in the Bolu surface; mode bits; wiring either custody model |
| FR-13 Privacy disclosure & consent (off by default; named provider; accept before first send) | UNRESOLVED | NOT FOUND — no consent gate anywhere in `BoluAssistantProvider`, `AssistantSheet` or the client path. The sheet mounts in the authenticated shell without an assistant-specific consent step. | Consent flow + default-off toggle |
| FR-15 Trial toggle (off by default, controls UI and requests) | UNRESOLVED | NOT FOUND | Settings toggle |
| FR-18 14-provider catalog | PROPOSED (not approved) | Registry exists; not wired; badges only in Design Lab | Wiring + approval |
| FR-19 Model discovery (`/models` merge, dedupe, 200 cap, declared floor) | PROPOSED (not approved) | Simulation only | Production implementation |
| FR-20 Model pill (top bar; grouped by provider; no-key → settings) | PROPOSED (not approved) | Design Lab only; production Bolu has no pill | Production implementation |
| FR-21 Custom provider | PROPOSED (not approved) | Validator exists (`validateCustomProvider`); Design Lab form works in memory; no production route, form or client wiring | Production wiring |
| FR-22 Four layouts | PROPOSED (not approved) | Design Lab only | Production layouts |
| FR-03 Tool calls only | REFINED — proposed | Not implemented (deterministic intent matching instead) | Tool-calling loop (if approved) |
| FR-04 Change cards; FR-06 contradiction detection; FR-07 title/notes/terms cards; FR-08 missing-field interrogation; FR-09 explicit filing; FR-24/FR-25/FR-26 write path | APPROVED PRINCIPLE; details proposed | None in Bolu runtime | The entire document-writing assistant (Bolu is currently read-only BI) |
| DEC-24 / FR-19 declared model list as floor; FR-12 masked display | — | `maskKey` exists; used by Design Lab; production Bolu shows no key at all | — |
| Architecture §7 "provider that answered is remembered for the session" | — | Not implemented in `chat.ts` (order re-walked per send) | Stickiness |
| Test plan U-20..U-26, U-30..U-34, I-11, C-01, C-07 | — | Not implemented / not run | Test coverage |

### 4.3 Implementation behaviour not documented in the PRD

| Behaviour | Where | Finding |
|---|---|---|
| Uncommitted Bolu server runtime and `/api/bolu-chat.ts` | bolu-*, api/bolu-chat.ts | The PRD never mentions a Vercel server proxy for provider calls, `BOLU_AMD_API_KEY`, or a single hard-coded AMD provider. This directly conflicts with architecture §6.2/§8 (gateway or device-private keys, not a vendor server) and with DEC-21 (direct tenant keys as the shipping path). |
| AMD chosen as the Bolu provider with `DeepSeek-V4-Flash` | `bolu-provider.ts` | PRD §4.2/DEC-18 contemplates AMD in a chain, second position, with explicit China-site and terms risks (RISK-14, RISK-15, RISK-16). The implementation treats AMD as the sole provider with no chain, no reachability test from Nigeria, and no terms decision recorded. |
| Deterministic intent matching instead of model tool calls | `bolu-capabilities.ts` | PRD FR-03 and the architecture require model tool calls. The read-only Bolu avoids them deliberately; the PRD does not document this boundary. |
| `authScheme` typed but unused | `providerRegistry.ts` | Undocumented dead field. |
| Design Lab seeds demo "keys" | `assistant-chat-providers.ts` | Documented in provider-catalog §9 ("two demo keys"); acceptable as preview data; not a credential. |
| Generic 502 from `/api/bolu-chat.ts` | api/bolu-chat.ts | PRD wants surfaced provider status/message; server hides both (deliberate, but stricter than PRD). |

### 4.4 Conflicting architectural descriptions

| Conflict | Evidence A | Evidence B | Label |
|---|---|---|---|
| Provider chain order | `Readme.md` §4.1 table: 1 NVIDIA, 2 Cloudflare, 3 AMD, 4–7 OpenRouter, 6 Gemini, 8 Groq… | `decision-log.md`: DEC-17 Cloudflare first, DEC-18 AMD second (both declared final) | CONFLICTING |
| Chain order (code) | `providerCatalog.ts` keeps nvidia→openrouter→amd→gemini and its own comment flags DEC-17 vs DEC-18 as "that conflict is unresolved, so this list keeps the PRD order and does not invent a third answer" | `architecture.md` §6.3 table lists OmniRoute gateway first, Cloudflare second… | CONFLICTING |
| Provider catalog authority | `provider-catalog.md`: "The code source of truth is `src/lib/ai-assistant/providerRegistry.ts`" | `architecture.md` §6.7: "`providerCatalog.ts` holds the catalog… The runtime chain in `providerCatalog.ts`" | CONFLICTING — two "source of truth" files that are never kept in sync (registry = 14 rows, catalog = 4) |
| OmniRoute gateway (DEC-20/DEC-21) | `architecture.md` §6.2; Readme §11 measured setup (OmniRoute 3.8.51 on dev machine) | No OmniRoute code, config, scripts or dependency anywhere in the repository | NOT FOUND — the gateway exists only as a developer-machine experiment and PRD text |
| Key custody | FR-12 draft + DEC-12: Capacitor private file, browser out of scope | `api/bolu-chat.ts` + `bolu-provider.ts`: server-side env key, all callers share it | CONFLICTING — FR-12 marked UNRESOLVED; BOURXE has shipped (uncommitted) both custody models |
| Read-only BI vs draft invoice authoring | `functional-req.md` disposition (2026-11-13): direction = read + controlled write, Bolu; FR-23…28 approved principles | `architecture.md`/`Readme.md` still describe invoice creation assistant with tool calls | CONFLICTING — known; tracked by prior audit; not resolved here |
| AMD provider production eligibility | DEC-18: trial only, "A release to tenants is not [inside the terms]"; RISK-14 | Bolu production path uses AMD as its only provider | CONFLICTING — REQUIRES APPROVAL |
| Gemini data handling | providerRegistry note: "The free tier may use content to improve its products."; Readme §4.4 requires disclosure | FR-13 NOT implemented; Bolu has no disclosure | CONFLICTING (docs vs code) — REQUIRES APPROVAL |

### 4.5 Decisions that need product-owner approval (do not resolve silently)

1. Chain order and member set for any shipped build (nvidia/openrouter/amd/gemini today; Cloudflare absent).
2. Whether the 14-provider catalog (FR-18) ships at all in the first release (currently "PROPOSED — not approved").
3. Key custody model and whether the AMD env-key server path supersedes FR-12.
4. AMD for any tenant-facing release (terms forbid production).
5. Enabling Bolu for any user without a consent disclosure and a default-off toggle.
6. Removal of the name "Hermes" from code comments, or addition of provenance notices.
7. Whether `providerCatalog.ts` (4 rows) and `providerRegistry.ts` (14 rows) should converge or remain two artifacts.

---

## 5. Design Lab vs Production Reconciliation

### 5.1 What the Design Lab actually is

Route `/design-lab/assistant-chat` (registered in `AppShell.tsx`, renders `AssistantChatExperiment.tsx` → `AssistantChatPreview`). The preview is a deterministic scripted simulation. It mounts no network client, sends no request to any provider, and persists nothing to Supabase. [REPO]

| Element | Design Lab behaviour | Production behaviour | Gap |
|---|---|---|---|
| Provider rows (14) | `initialProviderEntries()` from `AI_PROVIDER_REGISTRY` | Runtime uses `AI_PROVIDER_ROWS` (4) or Bolu server (1) | Registry not wired; two "catalogs" |
| Keys | Component memory only; seeded demo keys; never storage | `keys.ts` (native private file / browser memory); Bolu server env key | Production has two different custody stories |
| Connection test | `simulateConnection` — 700 ms sleep, prefix + length ≥ 12 check, always "Connected. N models available" | No production test action exists | Simulation presents capability that does not exist |
| Model discovery | `simulateModelDiscovery` — canned ids for openrouter/custom, invented `${id}-vision-preview` / `${id}-embed` for others | None | Simulation |
| Badges | `providerStatus` from memory (active/configured/needs-key); deterministic | None in production | Simulation |
| Model pill | Provider-aware grouping, configured-only expand, search, keyboard/pointer close, aria dialog | Not present in production sheet | Design Lab only |
| Custom provider | Form + `validateCustomProvider`; adds to memory list; `custom:<slug>` id | Validator reusable; no form/route exists | Validator shared, UI not |
| Four viewports | Fold-closed, fold-open, tablet, desktop shells | Production `AssistantSheet` = one bottom sheet | Design Lab only |
| Persistence | None (session state; "Reset demo" reseeds) | None (keys only, native) | Parity at "nothing persists" except keys |
| Network | None | `chat.ts` client fetch (legacy) or `/api/bolu-chat` (Bolu) | Simulation vs real path differ entirely |

### 5.2 Answers to the required questions

- **Does provider selection match the existing architecture?** Partially. The Design Lab reads the same `AI_PROVIDER_REGISTRY` names the discovery PRD wants, but the production runtime never reads that registry. Selecting "NVIDIA NIM" in the Design Lab has no effect on anything production does.
- **Is model selection provider-aware?** Yes in the Design Lab (per-provider declared models, active provider expands first, badge logic). No in production.
- **Are settings persisted correctly?** No. Design Lab settings live in React state for the session. The production legacy path persists keys (native only). The PRD's browser rule (session memory, no localStorage) is honoured in both. No keys are ever written to design-lab storage — correct.
- **Does the UI reflect actual backend capabilities?** No. It reflects *simulated* capabilities (connection success, model counts, discovery) independent of any provider's real behaviour. Copy is honest ("Preview simulation · no provider calls", "Simulate test", "Simulate model list"), so the UI does not lie, but a screenshot alone would look like a working provider manager.
- **Duplicated or competing provider configuration concepts?** Yes — three: (1) `providerCatalog.ts` runtime rows, (2) `providerRegistry.ts` 14-row catalog consumed only by the Design Lab, (3) `bolu-provider.ts` hard-coded AMD single provider. Plus the PRD's & architecture's OmniRoute gateway concept, which has no code at all.
- **Does simulation correspond to production?** No. The simulation is a design exploration. Using it as acceptance evidence for FR-18..FR-22 would be a category error; the prior audit (`2026-11-13-bolu-prd-compliance-audit.md`) already flags this explicitly (FR-19/FR-20/FR-21 "not implemented for production").

### 5.3 Worktree caveat

The Design Lab files have pre-existing uncommitted modifications (`assistant-chat-*.tsx/ts/css`, `assistant-chat-clerk.tsx`, `assistant-chat-launcher-lab.*`, tests under `src/tests/critical/`). These were read as they exist in the working tree. They are owned by concurrent work and were not edited, judged or relied on beyond presence checks.

---

## 6. Gemini Compatibility Assessment

Two layers must be kept apart: the **Gemini API as an OpenAI-compatible row** (existing abstraction) and **Gemini 4 Hydrogen as a model offering** (new).

### 6.1 What the repository already has

| Item | Finding | Label |
|---|---|---|
| `gemini` row in runtime chain | `providerCatalog.ts`: base URL `https://generativelanguage.googleapis.com/v1beta/openai`, model `gemini-3.5-flash-lite`, key hint "Starts with AIza", signup URL `https://aistudio.google.com/apikey` | VERIFIED [REPO] |
| Gemini in wide catalog | `providerRegistry.ts`: same base URL, declared models `gemini-3.5-flash-lite` (default), `gemini-3.5-flash`, `gemini-3.5-pro`; note "The free tier may use content to improve its products."; `supportsModelList: true` | VERIFIED [REPO] |
| Gemini in PRD catalog | `provider-catalog.md` tier 1: default `gemini-3.5-flash-lite`, same endpoint | VERIFIED [REPO] |
| Production use of Gemini | None observed. Bolu server path uses AMD only; client legacy path supports Gemini via the chain but is the old prototype path | VERIFIED [REPO] |
| Token/capability metadata | None for any Gemini model | NOT FOUND [REPO] |

### 6.2 External provider documentation ([EXT-DOC], 2026-11-14)

| Item | Source | Finding |
|---|---|---|
| OpenAI-compatibility endpoint | Google AI developer blog / Google AI Studio docs; community forum confirming base path `https://generativelanguage.googleapis.com/v1beta/openai` | VERIFIED — Chat Completions and embeddings are supported; **partial coverage** of the OpenAI surface (limited structured output / multimodal); not all OpenAI features exist. BOURXE's request body (model, messages, stream, max_tokens) is inside the supported subset. |
| Key type | AI Studio API keys (`AIza…`) | VERIFIED — matches the repo's `AIza` prefix rule |
| Gemini 4 Hydrogen | Google DeepMind model card ("Gemini 4 Hydrogen"), Google blog "Introducing Gemini 4 Hydrogen", Google Cloud developer guide, Cursor model list | VERIFIED — official model id `gemini-4-hydrogen`; 1M-token unified context window; 64K default synchronous output (up to 1M via background long decode); four thinking levels (low/medium/high/xhigh, default high); built for agentic tool loops; rolling out across Google AI Studio, the Gemini API and the Gemini app |
| Gemini 4 Hydrogen tool calling | Model card / Google blog position it for "agentic workflows… tool-heavy work" | PARTIALLY VERIFIED — strongly implied by launch positioning; tool-schema behaviour through the OpenAI-compat layer for this exact model was **not** independently verified by this audit, and must be probed before FR-03 tool calls are planned against it |
| Gemini 4 Hydrogen free-tier availability & quotas | Google blog says Hydrogen is coming to "all tiers of Google AI Studio" | PARTIALLY VERIFIED — free-tier rate limits are not published as stable numbers (Google states limits must be read in AI Studio); **no quota figure may be stored in the repo** (DEC-11 stands). Availability of the specific free tier for `gemini-4-hydrogen`, its RPM/RPD and whether it substitutes for `gemini-3.5-flash-lite` must be read from AI Studio at integration time |
| Pricing | None assumed; blog references paid pricing for some access lanes; free tier terms (content may be used to improve Google products) apply to AI Studio free usage | REQUIRES explicit disclosure text; see §8 |
| Data handling | AI Studio free tier: Google may use submitted content to improve products; human reviewers may see content | VERIFIED via PRD citation of Google docs; consistent with [EXT-DOC] statements in Cursor listings ("do not submit personal or confidential data" for free NVIDIA endpoints; Google free tier content terms analogous). For a B2B invoicing product, this is a business decision, not a technical one |

### 6.3 Compatibility verdict

| Question | Answer |
|---|---|
| Can Gemini 4 Hydrogen reuse the existing abstraction? | **Yes.** It is a new declared row/model id on the existing OpenAI-compatible `gemini` entry. No new adapter, no new client, no new parsing path. The `supportsModelList: true` flag means a `/v1/models` refresh (if implemented) would surface it automatically when Google lists it. |
| Needs a narrowly scoped extension? | **Yes, two small ones (not to be built now):** (1) a per-model capability metadata block (context window, max output, tool support, tier) so FR-19/FR-11 can enforce and display limits; (2) verification of the AI Studio free tier and the PRD/FR-13 consent text naming Gemini as the provider. Neither requires a new provider architecture. |
| Does OpenAI compatibility imply full OpenAI support? | **No.** [EXT-DOC] confirms partial coverage. Concrete limits: embeddings/chat only on the compat path historically; structured outputs "only limited support"; image upload limited. BOURXE's 4-parameter body is safe; tool calling and structured outputs must be verified per-model, not assumed. |
| Free-tier quota handling | Do not store numbers. Read 429 body / AI Studio. The `readProviderErrorBody` helper already surfaces the provider message safely; the chain advances on 429 today (legacy path only). |
| Data-governance fit for BOURXE tenant data | **REQUIRES APPROVAL.** Free AI Studio usage likely permits training on submitted content. Invoice content includes client PII and amounts. This is the same exposure RISK-01 covers. |

**Bottom line:** Gemini 4 Hydrogen is the cheapest possible extension — one declared model id plus optional capability metadata plus a verified disclosure. It is not a reason to extend the architecture in any other way.

---

## 7. NumeS Compatibility Assessment

### 7.1 What is known

| Item | Finding | Label |
|---|---|---|
| "NumeS" as a provider | **NOT FOUND** in repository, in the PRD, in tickets, in Git history, or in official public documentation reachable during this audit. Searches for `NumeS`, `Numes`, `Nume.sh` return no recognised LLM-hosting service. | NOT FOUND |
| Described offering | Requester describes: OpenAI-compatible API endpoint; provider-specific authentication and base URL; free hosted models including GLM, Kimi, DeepSeek and Nemotron variants | Given by requester; unverified |
| Similar known offerings ([EXT-DOC], 2026-11-14) | The free hosted open-model families named (GLM, Kimi, DeepSeek, Nemotron) are served by NVIDIA NIM (`build.nvidia.com`), OpenRouter, and other OpenAI-compatible hosts. If "NumeS" is such a host, the existing catalog-row pattern applies unchanged. It may also be a misremembered name for one of these. | PARTIALLY VERIFIED |
| Model identifiers | Unknown. GLM ids look like `glm-4.x` / zai-org paths; Kimi ids like `moonshot/kimi-k2.x`; DeepSeek `deepseek-…`; Nemotron `nvidia/nemotron-…` — but BOURXE must take exact ids from the provider's own model list or documentation | Requires operator input |
| Rate limits / availability | Unknown and variable; free tiers change without notice (see ticket: OpenRouter free list changes, Ampersand free window ended 2026-11-14, Our Free Model registry numbers stale within a week) | VERIFIED for the class of provider [REPO: ticket] |
| Tool-calling / structured-output compatibility | Unknown per model; OpenAI compatibility is endpoint-level, not feature-level | Do not assume |
| Data handling | Unknown; likely logged/training-use like comparable free tiers | REQUIRES ToS review |
| Repository status | No `numes`/`nume` entry anywhere (grep clean) | VERIFIED [REPO] |

### 7.2 Compatibility verdict

| Question | Answer |
|---|---|
| Can it reuse existing abstractions? | **Conditionally yes.** If NumeS exposes `POST {baseUrl}/chat/completions` and (ideally) `GET {baseUrl}/models` over HTTPS with a bearer key, it is exactly a custom provider row (`custom:<slug>`) or a new tier-1 row after approval. No adapter, no parser change, no new transport. The one-paste flow and `/v1/models` merge rules apply as written. |
| What must be supplied before anything is built? | Base URL (with `/v1`), key format/prefix, exact model ids to declare, rate-limit behaviour, tool-calling support per model id, structured-output support, streaming support, Terms of Use (especially training on submitted data and any production-use restriction), data residency, and an operational point of contact. |
| What should NOT be assumed? | (a) That free means permanent; (b) that OpenAI-compatible means all OpenAI features; (c) that tool calling works for every listed model — must be probed per model before the FR-03 tool loop is designed against it; (d) that quotas can be stored in a table; (e) that the provider's limits will be read from headers — verify per endpoint; (f) data-handling terms permit invoice PII. |
| Preferable path | Add NumeS as a **custom provider** via the existing FR-21 validator once the operator supplies the above; promote to a tier-1 row only after the terms and reliability review, and only if the product owner approves. Do not add it to `providerCatalog.ts` or the runtime chain before that review. |
| Risk if rushed | Same class of risk as AMD/China endpoint: reachability from Nigeria unverified, terms unreviewed, quotas unknown, no `Retry-After` verified, key custody undecided. |

**Bottom line:** NumeS is an evidence problem, not an architecture problem. The architecture accommodates it the day the provider facts are supplied. Nothing should be coded now.

---

## 8. Security, Privacy and Data-Governance Implications

### 8.1 Where the sensitive data goes

| Flow | Data leaving the device | Exposure |
|---|---|---|
| Legacy client path (`chat.ts` → provider) | Full conversation + system text built from it; composer content only, no records | User-typed content to NVIDIA/OpenRouter/AMD/Gemini; per-provider terms apply |
| Bolu server path (`/api/bolu-chat` → AMD) | Conversation (≤ 12 turns) **plus 8,000 chars of authorized business facts**: client names, invoice numbers, totals, balances, statuses | **Business record content leaves to AMD Token Factory (China-site endpoint) for every Bolu turn.** This is the highest-exposure path in the repo and it is uncommitted code with no consent gate |
| Design Lab | Nothing leaves; seeded demo keys; fake data | None |

### 8.2 Findings

1. [REPO] **No assistant-specific consent or disclosure exists** (FR-13 UNRESOLVED, RISK-01 residual: accepted disclosure still exposes tenant data to a training-friendly free tier). The authenticated shell mounts the assistant today with no gate.
2. [REPO] **Two key-custody models coexist.** Client keys sit unencrypted in the app-private file (`keys.json`) or browser memory; Bolu uses one server-side environment secret shared by all users of the deployment. The server model inverts the threat model: the operator's key spends on every user's request, and abuse control must live at the Vercel function (it does — Supabase auth check + message bounds — but no per-user rate limiting or audit log exists).
3. [REPO] **AMD free trial terms exclude production use** (DEC-18, RISK-14, `free-model-failover-stack.md`). Bolu as shipped points tenant traffic at an endpoint whose terms call it "a free trial and development service… not for production." This is a legal blocker for a tenant-facing release independent of code quality.
4. [EXT-DOC] **Free tiers commonly permit training or review of content.** Gemini AI Studio free tier ("content may be used to improve Google products… may be seen by human reviewers"), NVIDIA NIM free endpoints (trial-use-only wording; data logged for improvement). Invoice content — client names, amounts, terms — is client-confidential under any reasonable SME contract.
5. [REPO] **Keys are never logged** — verified by inspection (`readProviderErrorBody` sanitises bodies; `api/bolu-chat.ts` logs status codes and error names only; masking via `maskKey`). Good baseline; not tested by an automated gate (test plan U-33 unverified; tests not run).
6. [REPO] **No analytics/telemetry events** in assistant code. Default safe.
7. [REPO] **Untrusted-data boundary is documented in prompts** (bolu-runtime facts preamble treats record text as untrusted; bolu-capabilities constrains intents). Prompt-injection resistance is best-effort prose, not a control; keep deterministic rendering where possible.
8. [REPO] **Server function `/api/bolu-chat.ts`** has no request body size limit beyond validation bounds (adequate: 12k chars), no per-user quota, no audit trail, and `AbortSignal.timeout(45000)` — acceptable shape, but the AMD upstream's own behaviour (silent parameter drops, `thinking` → 400) is untested.
9. [REPO] `.env` exists in worktree (untracked listing shows `.env`). This audit did not open it; presence alone is noted. **Do not commit it.** (Not modified by this audit.)
10. [REPO] No secrets appear in tracked source or in this report.

### 8.3 Data-governance answers required

- Is tenant business data permitted to leave to any free-tier provider? — **REQUIRES APPROVAL (product + legal).**
- May AMD be used in any shipped build? — **No for tenants under current terms (RISK-14).** Trial by the product owner only.
- May Gemini free tier carry invoice PII? — **Only with explicit, named-provider disclosure and user acceptance (FR-13), if approved at all.**
- Should Bolu facts always be sent, or only on demand? — Currently always sent per turn; minimisation review needed (FR-23 principle: only the minimum needed; current facts bundle is per-intent, which is good).

### 8.4 License / governance summary

Silent provenance (Hermes name without URL/licence), absent `NOTICE`, and unreviewed free-tier terms are the governance debts of record. None requires code to fix; all require a decision and a one-line documentation note.

---

## 9. Architectural Gaps and Risks

### 9.1 Gaps

| # | Gap | Severity | Evidence |
|---|---|---|---|
| G-1 | Two catalogs (`providerCatalog.ts` 4 rows vs `providerRegistry.ts` 14 rows) never reconciled; neither is wired to Bolu | High | Files, grep |
| G-2 | No production settings UI for providers in the authenticated shell | High | `AssistantSheet.tsx`; prior audit FR-12/18/20/21 |
| G-3 | No consent gate, no default-off toggle for the assistant | High | FR-13/FR-15 NOT FOUND |
| G-4 | No quota readout anywhere (FR-11/DEC-11/DEC-24) | Medium | No parser for 429 bodies/headers |
| G-5 | No `Retry-After` honouring (FR-10/AMD notes) | Medium | `protocol.ts` |
| G-6 | No model capability metadata (context window, max output, tool/structured-output support) | Medium | grep |
| G-7 | No live `/models` discovery (FR-19/DEC-24) | Medium | Simulation only |
| G-8 | No per-provider enable/disable or chain editing in production (DEC-09) | Medium | FR-15 absent; badges are Design Lab |
| G-9 | No stickiness/failure memory despite architecture §7 claim | Low | `chat.ts` re-walks order |
| G-10 | No tool-calling loop (if/when FR-03 approved) | Blocking for any "assistant writes documents" direction | Prior audit; `bolu-runtime.ts` |
| G-11 | No AMD reachability/latency evidence from Nigeria; no provider contract tests | Medium | Prior audit; RISK-15 |
| G-12 | No `NOTICE`/provenance for Hermes-derived concept | Low (legal hygiene) | grep |
| G-13 | Server-side `/api/bolu-chat.ts` + Bolu runtime uncommitted, unreviewed, undocumented in PRD | High (process) | git status; file headers |
| G-14 | No administrative kill-switch or feature flag for the assistant in production | Medium | FR-15 absent |

### 9.2 Risks (in addition to `risk-register.md` RISK-01/05/09/14/15/16/18/19/21 and ticket risks)

| # | Risk |
|---|---|
| R-1 | **Dual-custody drift.** Legacy client path (user key, native file) and Bolu server path (operator key, shared deployment) will diverge in security posture; one of them ships untested. |
| R-2 | **Design Lab mistaken for product.** Simulation badges and "Connected" messages can be screenshot to justify a launch that has no provider connectivity. Governance: label every export as simulation. |
| R-3 | **Free-tier terms breach via Bolu.** AMD's terms exclude tenant production use; Bolu currently sends tenant facts to that endpoint. |
| R-4 | **Quota exhaustion UX.** When the free tier ends mid-conversation, users see a generic error and no remaining-allowance signal; AGENTS/DEC-11 expects a readout. |
| R-5 | **Hydrogen-class models under partial compat.** `gemini-4-hydrogen` structured output/tool behaviour through the OpenAI-compat layer unverified; a silent behaviour change ships as "it worked in the demo". |
| R-6 | **NumeS volatility.** An undocumented provider can change base URL, auth, model ids or terms without notice; any stored row rots. |
| R-7 | **PII in prompts.** Facts preamble includes client names/amounts; sent to a training-permitted tier without consent. |
| R-8 | **Key leakage via future `/models` calls** — mitigation exists conceptually (masking rules) but no test enforces "never log the key" on the discovery path yet. |

---

## 10. Recommended Architecture and Next Steps

### 10.1 One recommended direction

**Extend the existing OpenAI-chat-completions catalog-row architecture minimally. Do not build anything new.**

The repository already contains the right shape: one request builder, one SSE parser, a declarative catalog, server-vs-client custody decision pending. The smallest extension that accommodates Gemini 4 Hydrogen and NumeS is:

**REUSE (unchanged)**

- `src/lib/ai-assistant/protocol.ts` — request body builder, SSE parser, error-body sanitiser, `classifyProviderFailure`, `maskKey`.
- `src/lib/ai-assistant/keys.ts` — native private-file custody (until the FR-12 custody decision lands).
- `src/lib/ai-assistant/providerCatalog.ts` — the runtime row pattern and the unresolved-order comment discipline (keep the "PRD order, don't invent a third answer" rule).
- `validateCustomProvider()` — the custom-endpoint contract for anything undocumented (this is the NumeS on-ramp).
- Design Lab provider-settings component structure as a **visual reference only**.
- The Bolu server boundary pattern (`api/bolu-chat.ts`) as a **candidate** custody model — pending FR-12 decision — keeping its auth check and message bounds.

**EXTEND (narrowly, each behind the approval it needs)**

1. `AIProviderDefinition`/`AIProviderRow` gains an optional `capabilities` block: `contextWindow`, `maxOutput`, `toolCalling: boolean | 'unverified'`, `structuredOutputs: boolean | 'unverified'`. Data only. No behaviour change. *(Requires FR-18/FR-19 approval)*
2. Gemini row: add `gemini-4-hydrogen` to declared models **after** AI Studio confirms availability and quota; keep `gemini-3.5-flash-lite` default until then. *(Requires FR-13 consent + §10.2 approvals)*
3. NumeS: represent first as `custom:numes` configured by the operator; promote to a declared row only after terms review. *(Requires NumeS facts + terms approval)*
4. Consent gate + default-off toggle wired to the authenticated shell before any provider sends tenant content. *(FR-13/FR-15 approval)*
5. `Retry-After` read in the 429 branch of `classifyProviderFailure`/`chat.ts` — bounded wait, then advance. *(FR-10 approval)*
6. Optional `/v1/models` discovery action merged onto declared lists (keep the declared floor). *(FR-19 approval; simulation shows UX but is not evidence)*
7. A single decision recorded in `decision-log.md`: client-side keys (FR-12) **or** server-side env key (Bolu) — one, not both.

**DO NOT INTRODUCE**

- A per-provider adapter layer or `ProviderInterface` hierarchy.
- A second provider-management system, wizard, or registry parallel to the above.
- OmniRoute (or any gateway) as a product dependency — it remains a developer-machine trial tool (DEC-20/21).
- Stored quota tables, stored rate-limit history, stored "free model" counts.
- Native Anthropic Messages path in phase 1 (DEC-19).
- Tool-calling loop until FR-03/FR-04 details are approved.
- Any NumeS integration code before terms and identifiers are supplied.
- Any change to `src/lib/Calculations.ts`, PDF renderers, or tenant data for this work.

### 10.2 What requires product-owner approval (explicit)

| # | Decision | Why |
|---|---|---|
| A | Provider chain order and shipping member set (and Cloudflare's absence) | CONFLICTING docs (§4.4) |
| B | Custody: Capacitor private file vs server env key; retires one of the two paths | FR-12 UNRESOLVED; G-13/R-1 |
| C | May any free tier (Gemini AI Studio, NVIDIA NIM, OpenRouter, AMD) process tenant invoice PII at all? | §8; FR-13 UNRESOLVED |
| D | AMD eligibility: trial-only scope vs any tenant exposure | DEC-18/RISK-14 |
| E | Ship the 14-provider catalog (FR-18) or a reduced 4-row chain? | Functional-req disposition |
| F | Adopt `gemini-4-hydrogen` as default or non-default declared model; verify quota window in AI Studio | §6; DEC-11 |
| G | NumeS terms/data review and admission as custom provider or tier-1 row | §7 |
| H | Hermes provenance note / NOTICE; rename comments if unverified | §2.4 |
| I | Whether uncommitted Bolu code becomes the shipping path (and its documentation in the PRD) | G-13 |
| J | Traceability: FR-18..FR-22 dispositions re-opened or closed as "not first release" | PRD authority |

### 10.3 Architectural risks of the recommended direction

- Adding capability metadata without per-model verification recreates the stale-registry defect documented in the failover ticket ("27 free models / 200 req/day" was wrong within a week). Mitigation: metadata is labelled "declared, verified YYYY-MM-DD", never authoritative; the 429 path remains the real quota source.
- One OpenAI-compat path means a provider that breaks the wire format breaks it for every row. Mitigation: keep `readProviderErrorBody` + chain advance + clear user-facing "provider unavailable" copy; do not paper over with adapters.
- Server custody (Bolu) centralises abuse risk on the operator's key. Mitigation if chosen: per-user rate limit, audit log, kill-switch env flag, and tenant-facing terms gate — all small, none existing today.
- Keeping two registries in step until §4.4 conflicts are resolved invites drift. Mitigation: pick one (`providerCatalog.ts` for runtime; registry only for the settings UI), or generate one from the other's data — decision deferred to approval A/E.

### 10.4 Next steps (ordered, no code)

1. Product owner answers §10.2 A–J; record dispositions in the PRD decision log (not in this report).
2. Security review of FR-13 disclosure copy and the Bolu server function; decide custody (B).
3. Verify in AI Studio: `gemini-4-hydrogen` listing, free-tier limits, key creation for the BOURXE project; record dated evidence in the PRD (no numbers in code).
4. Request NumeS operator pack: docs URL, base URL, auth scheme, model ids, rate limits, ToS, privacy stance, contact.
5. Reconcile `providerCatalog.ts` vs `providerRegistry.ts` into one declared artifact **after** approval E — one file, no code duplication.
6. Only then implement: consent gate (D/C), Hydrogen row (F), NumeS custom row (G), `/models` merge (FR-19), capability metadata (E).
7. Re-run the Bolu PRD compliance audit against the result; do not accept the Design Lab as evidence.
8. Add Hermes provenance note or rename (H); never copy Hermes source files.

---

## 11. Explicit Unresolved Questions

1. Which Hermes artifact did the implementing agent actually read — `NousResearch/hermes-agent` (MIT), another fork, or only PRD prose? Project evidence cannot say. Owner: the agent's session log, if it exists.
2. Is the uncommitted Bolu server path (`api/bolu-chat.ts`, `src/lib/ai-assistant/bolu-*`) approved to become the shipping transport, or is it a rejected experiment to be deleted? It currently bypasses FR-12's user-custody design.
3. Should `providerRegistry.ts` (14 rows) remain a Design Lab-only catalog, or become the single declared source for both settings UI and runtime chain?
4. Which providers may appear in the first release, and what is the authoritative chain order? (Three artifacts disagree.)
5. May the AMD China endpoint be used by the product owner's own trial only, or never, given the reachability question from Nigeria (RISK-15) and the terms (RISK-14)?
6. What disclosure text names the provider(s), in which languages, before the first send, and does it name AMD/China and Gemini/training explicitly?
7. Is `gemini-4-hydrogen` actually listed for free-tier AI Studio keys at audit+30 days, and what are its RPM/RPD there? (Not published; must be read from the project dashboard.)
8. What is "NumeS" precisely — legal entity, domain, documentation URL, key prefix, and does it permit commercial/production use of submitted data? Without this, no integration decision is possible.
9. Should the legacy client path (`chat.ts` + `keys.ts`) be retired now that Bolu exists, or kept as the FR-12 native-custody path? Keeping both means maintaining two failure taxonomies.
10. Who owns the "capability metadata" table, and what is the re-verification cadence, given the demonstrated one-week decay of provider facts?
11. Does the product want tool-calling (FR-03/FR-04) at all in the first Bolu release, given no implementation exists and Hydrogen/Gemma-class models through partial compat make tool behaviour the riskiest part?
12. Is a `NOTICE`/attribution file desired for the Hermes-derived concept (§2.4)? If yes, who signs it.
13. Should the `.hermes/`, `.roo/`, `.kiro/`, `.commandcode/` harness-mirror directories (all present in the repo root) be reduced to one canonical mirror per the PROJECTSKILLINDEX note — out of scope here, but flagged.
14. Is `.env` in the working tree tracked or ignored? This audit did not open it; `.gitignore` compliance should be confirmed by the owner. (This audit did not modify it.)

---

## 12. Files Inspected and Evidence References

### 12.1 Instructions and standards
- `AGENTS.md` — stack, map, commands (Bun only; no build/typecheck/lint/test run).
- `.claude/agent-instructions/documentation.md` — report format and ASD-STE100.
- `docs/PROJECTSKILLINDEX.md` — skills index (read; `typescript-advanced-types`, `openapi-to-typescript`, `react-dev` inspected for conformity).
- `docs/SUBAGENTS.md` — not consulted beyond index pointer; no subagents used.

### 12.2 PRD — Conversational Document Assistant (`docs/prd/conversational-document-assistant/`)
- `Readme.md` (incl. §4 chain table, §4.2 AMD, §4.4 privacy, §4.5 catalog, §9 related docs, §11 validated trial, §12 four viewports)
- `functional-req.md` (incl. 2026-11-13 disposition table; FR-01…FR-22; FR-23…FR-28; G1–G8)
- `architecture.md` (§2 module layout; §3 agent loop; §6 provider client incl. §6.2 OmniRoute, §6.3 rows, §6.5 Cloudflare, §6.6 AMD, §6.7 registry/chain; §7 failover; §8 key storage; §9 settings)
- `provider-catalog.md` (line 10 Hermes provenance statement; rules C1–C10; 14-provider table; discovery rules; custom provider; badges; key rules; §9 Design Lab preview roles)
- `decision-log.md` (DEC-08..DEC-29; esp. DEC-17/18 chain order, DEC-19 OpenAI-only, DEC-20/21 gateway, DEC-23/24/25 catalog, DEC-27 assistant-ui rejection, DEC-28 Bolu direction)
- `risk-register.md`, `test-plan.md`, `Waterfall-roadmap.md`
- `Chat-blocks/*` (referenced, not fully read; out of scope)

### 12.3 Implementation source (`src/`, `api/`)
- `src/lib/ai-assistant/providerCatalog.ts` (110 lines — read fully)
- `src/lib/ai-assistant/providerRegistry.ts` (409 lines — read fully)
- `src/lib/ai-assistant/chat.ts`, `protocol.ts`, `keys.ts` (read fully)
- `src/lib/ai-assistant/bolu-provider.ts`, `bolu-runtime.ts`, `bolu-transport.ts` (read fully; `bolu-context.ts`, `bolu-data.ts`, `bolu-capabilities.ts` inspected indirectly via prior audit and grep)
- `src/components/design-lab/assistant-chat-providers.ts` (read fully), `assistant-chat-settings.tsx` (read fully), `assistant-chat-model-pill.tsx` (read fully), `assistant-chat-preview.tsx` (grep: provider wiring lines 23–27, 68, 379, 404–427), `assistant-chat-layouts.tsx` (exists; grep), `assistant-chat-script.ts` (exists; referenced by prior audit)
- `src/components/ai-assistant/AssistantSheet.tsx`, `DashboardAssistant.tsx`, `BoluAssistantProvider.tsx`, `AppShell.tsx` (presence and prior-audit roles; not re-read in full)
- `api/bolu-chat.ts` (read fully)

### 12.4 Tests and tickets
- `src/tests/ai-assistant/{protocol,bolu-capabilities,bolu-context,bolu-data,bolu-lifecycle,bolu-provider}.test.js` (exist; not run)
- `src/tests/critical/{assistantChatUxContracts,assistantChatLiquidGlass}.test.js` (exist; not run)
- `docs/tickets/free-model-failover-stack.md` (provider quotas, registry staleness, OmniRoute notes)
- `docs/tickets/free-claude-code-evaluation.md` (exists; referenced)
- `docs/tickets/local-ai-model-swap-and-speedup.md` (exists; referenced)

### 12.5 Prior audits and reports (consulted for cross-checks; not duplicated)
- `docs/reports/ai/2026-11-13-bolu-prd-compliance-audit.md`
- `docs/reports/ai/2026-11-13-bourxe-assistant-prototype-experience-audit.md`
- `docs/reports/ai/2026-11-13-bolu-production-runtime-implementation.md` (existence; not re-read in full)
- `docs/reports/ai/bourxe-assistant-technical-capability-audit-2026-11-13.md` (existence)

### 12.6 External documentation ([EXT-DOC]; not repository evidence)
- `https://github.com/NousResearch/hermes-agent` — MIT licence; Nous Research; custom endpoint/named provider concepts; `hermes model` wizard; issue #62213 (`custom-endpoints-settings.tsx`); docs on providers and `model.base_url`. (Consulted 2026-11-14.)
- `https://hermes-agent.nousresearch.com/docs/integrations/providers` and `…/configuration`, `…/developer-guide/adding-providers` — OpenAI-compatible endpoint support, base URL override semantics, api_mode auto-detection.
- `https://deepmind.google/models/model-cards/gemini-4-hydrogen` — 1M context, 64K default output, four thinking levels, adapted from Gemini 4 Carbon. (Consulted 2026-11-14.)
- `https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-hydrogen` and `…/build-with-gemini-4-hydrogen` — availability across Google AI Studio / Gemini API; agentic positioning. (Consulted 2026-11-14.)
- `https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/guides/gemini-4-hydrogen` and Cursor model list `…/docs/models/gemini-4-hydrogen` — model id `gemini-4-hydrogen`, 200k window default / 1M max. (Consulted 2026-11-14.)
- Google AI Studio OpenAI-compatibility: Google Developers Blog (2024) "Developers can access Gemini models via the OpenAI Library", community forum confirmation of base path, third-party summaries of partial coverage. (Consulted 2026-11-14.)
- Free-model ecosystem context (OpenRouter limits, NVIDIA NIM free endpoints, AMD China endpoint): ticket `free-model-failover-stack.md`, cross-checked against public listings 2026-11-14. **No quota number from any of these is to be coded into BOURXE.**

### 12.7 Not inspected / limitations
- `.env` contents not opened. `video-json-tutorial/`, `backend/`, `tools/`, `unused/` not inspected. Design Lab CSS not read line-by-line. No tests, builds, lint, migrations, typecheck, network or provider calls were executed. No live provider verification of Gemini, AMD, OpenRouter or NumeS was performed. Repository evidence is static.

---

## 13. Git Status Verification

### 13.1 Before the audit (captured 2026-11-14, branch `main`, HEAD `26f5d85c`)

`git status --porcelain=v1` showed **pre-existing** changes, preserved untouched by this audit:

- Modified (tracked): `docs/prd/conversational-document-assistant/{Readme.md, Waterfall-roadmap.md, decision-log.md, functional-req.md, roadmap.html}`; `src/components/ai-assistant/{AssistantSheet.tsx, DashboardAssistant.tsx}`; `src/components/app/AppShell.tsx`; `src/components/design-lab/{assistant-chat-composer.tsx, assistant-chat-layouts.tsx, assistant-chat-model-pill.tsx, assistant-chat-parts.tsx, assistant-chat-settings.tsx}`
- Deleted (tracked): all `scratch/*.ts` and `scratch/*.cjs` files
- Untracked: `.agents/tasks/assistant-chat-ux/`, `.agents/tasks/thinking-orbs-design-lab/`; `api/bolu-chat.ts`; `docs/prd/conversational-document-assistant/Chat-blocks/{bot.svg, bot2.svg}`; `docs/reports/ai/*2026-11-13*` (six files); `src/assets/clerk-launcher-bot.svg`; `src/components/ai-assistant/BoluAssistantProvider.tsx`; `src/components/design-lab/{assistant-chat-clerk.tsx, assistant-chat-launcher-lab.css, assistant-chat-launcher-lab.tsx}`; `src/lib/ai-assistant/{bolu-*.ts}` (6 files); `src/tests/ai-assistant/bolu-*.test.js` (5 files); `src/tests/critical/{assistantChatLiquidGlass,assistantChatUxContracts}.test.js`; `video-json-tutorial/`

The audit made **no** edits, deletes, moves or checkouts. All entries above are the product owner's in-flight work and remain in place.

### 13.2 After the audit

Captured immediately after this report was created. The branch is now `main` at `cdfca468`, **ahead of `origin/main` by 16 commits**. The worktree contains only two untracked entries:

```
?? docs/reports/2026-11-14-hermes-provider-architecture-audit.md
?? video-json-tutorial/
```

Between the §13.1 capture and this capture, eight commits dated 2026-11-14 03:11–03:15 +0100 were created by the repository owner (author `Bigdrops`), for example `a1ed5dd5 feat(assistant): Bolu production runtime and dashboard wiring`, `5491b9f0 feat(design-lab): assistant chat UX refinement and layout`, `45b09912 feat(design-lab): assistant chat clerk launcher experiment`, `30523e1f docs(assistant): reconcile Bolu PRD with approved direction`, `3aaae707 docs(assistant): prototype and experience audit`, `d28a35a4 docs(agents): thinking-orbs design-lab task evidence`, `cdfca468 chore(scratch): remove one-off import and analysis scripts`. **This audit created no commits, no stashes, no tags, no branch changes and no resets.** All inspected content was read from the working tree as it existed during the audit; where the owner's commits landed mid-audit, the committed content matches what this audit read (the same files, now committed rather than pending).

### 13.3 Verification result

- `bun run build`: not run. `bun run typecheck`: not run. `bun run lint`: not run. `bun run test`: not run. `bun run audit:load`: not run (no code changed; nothing to load).
- Application source files modified by this audit: **0**.
- Tests, configuration, migrations, package manifests modified: **0**.
- Existing documentation modified: **0**. Existing reports modified: **0**.
- New or modified file attributable to this audit: **exactly one** — `docs/Reports/2026-11-14-hermes-provider-architecture-audit.md` (surfaced by git as `docs/reports/2026-11-14-hermes-provider-architecture-audit.md`; `docs/Reports` and `docs/reports` are the same directory on this case-insensitive filesystem).
- Supabase push: not applicable.
- Working-tree delta between before and after captures: the pre-existing modified/deleted/untracked files from §13.1 were committed externally by the owner during the audit (see §13.2). Nothing in that delta was edited or committed by this audit. The surviving untracked entries are the audit's report and `video-json-tutorial/` (pre-existing, untouched).
- The audit's read-only guarantee holds: every file the audit opened was opened read-only; the only write was this report.

### 13.4 Post-audit capture (verbatim)

```
On branch main
Your branch is ahead of 'origin/main' by 16 commits.

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	docs/reports/2026-11-14-hermes-provider-architecture-audit.md
	video-json-tutorial/

nothing added to commit but untracked files present (use "git add" to track)
```

`git log --oneline -1`: `cdfca468 🔥 chore(scratch): remove one-off import and analysis scripts`.
`git log --pretty='%h %ai %an'` confirms the eight mid-audit commits carry author `Bigdrops` and timestamps 2026-11-14 03:11–03:15 +0100; none were authored or created by this audit.

---

## Appendix A — Acceptance-criteria cross-check

| Required report section | Section |
|---|---|
| 1 Executive summary | §1 |
| 2 Hermes provenance and implementation mapping | §2 |
| 3 Existing BOURXE provider architecture | §3 |
| 4 PRD vs implementation reconciliation | §4 |
| 5 Design Lab vs production reconciliation | §5 |
| 6 Gemini compatibility assessment | §6 |
| 7 NumeS compatibility assessment | §7 |
| 8 Security, privacy and data-governance implications | §8 |
| 9 Architectural gaps and risks | §9 |
| 10 Recommended architecture and next steps | §10 |
| 11 Explicit unresolved questions | §11 |
| 12 Files inspected and evidence references | §12 |
| 13 Git status verification before and after | §13 |
| Evidence labels (VERIFIED / PARTIALLY VERIFIED / NOT FOUND / CONFLICTING / REQUIRES APPROVAL) | Used throughout |
| Repository findings distinguished from external provider documentation | `[REPO]` vs `[EXT-DOC]` throughout |

## Appendix B — Explicit non-claims

- This audit does **not** verify that any provider endpoint, key, quota, model id or base URL works. No request was sent.
- This audit does **not** approve Gemini 4 Hydrogen or NumeS for use.
- This audit does **not** promote the DRAFT PRD or its FR-18..FR-22 dispositions to approved scope.
- This audit does **not** resolve the DEC-17/DEC-18 chain conflict.
- This audit does **not** claim the Hermes repository URL is `NousResearch/hermes-agent` as a project fact — it is identified externally and marked PARTIALLY VERIFIED throughout.
- This audit does **not** certify the uncommitted Bolu code as production-ready, secure, or compliant with AMD's or Google's terms.
