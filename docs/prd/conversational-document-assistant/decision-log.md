# Decision Log

- **Status:** DRAFT FOR REVIEW
- **Product:** Conversational Document Assistant
- **Writing Standard:** ASD-STE100 Simplified Technical English

## DEC-01 - The Assistant Replaces The JSON Import Path For Invoice Creation

**Decision.** The conversational assistant is the fast path for invoice creation. The JSON import sheet stays for the cases it already handles well: a user who has a document file and wants its rows.

**Alternatives.** Keep both paths as equals. Replace the import sheet entirely.

**Reason.** The import path reads a document file that already exists. The assistant handles a live conversation. They serve different inputs. Removing the import path would remove a working feature.

## DEC-02 - The Model Sends Tool Calls, Not A Document JSON Blob

**Decision.** The model calls a small fixed tool list. The app owns the structure, the validation and the money.

**Alternatives.** The model returns the import JSON. The model returns a partial document that a second prompt turns into tools.

**Reason.** The import JSON carries structure the model gets wrong. The identifier lesson from the Item Library work is direct: a model that must copy identifiers fails, and the failure looks like a bad invoice. A tool list of nine calls with one field each is a task a free model can do.

## DEC-03 - The App Computes, The Model Never Computes

**Decision.** The model reads computed totals and never writes them.

**Reason.** A free model multiplies 5 by 95000 correctly most of the time. That is not a standard. The app already has the correct calculation. The model reads it and says it.

## DEC-04 - The Model Identifies A Row By Description, Not By Index

**Decision.** `update_line_item` and `remove_line_item` take a description fragment. The app resolves it.

**Reason.** A model that counts rows is unreliable. A model that copies a description fragment is reliable. The app owns the row identity.

## DEC-05 - Every Change Is A Card The User Accepts

**Decision.** No tool call changes the form directly. Every call produces a pending card. The user accepts or rejects it.

**Alternatives.** Apply the change at once. Apply at once with an undo.

**Reason.** An invoice is a money document. The user must see a change before it lands. A card is also the undo. An undo button is more code and is easier to get wrong than a reject button.

## DEC-06 - The Assistant Never Saves

**Decision.** The word `file it` prepares a confirmation. The user confirms. The normal save path runs.

**Reason.** A save that no human confirmed is a wrong invoice that reached a client. The confirmation view costs one screen.

## DEC-07 - Free Cloud Providers, Not The On Device Model

**Decision.** The assistant calls free cloud tiers. The on-device model work stays separate.

**Alternatives.** On-device only. Both.

**Reason.** The user requires a zero cost solution and the trial starts now. The on-device path needs a model download of 229 MB or 731 MB, a model swap, a prompt change and a runtime change before it can produce a tool call. The cloud path needs a key and a client. The free tier ceiling of 20 requests a day on some providers is handled by the chain, not by a slower build.

**Cost of this decision.** Client content leaves the device. FR-13 handles it with a disclosure.

## DEC-08 - One OpenAI Compatible Client, Many Base URLs

**Decision.** The client speaks the OpenAI chat completions interface. Each provider is a row of base URL, key and model name.

**Alternatives.** A provider adapter per provider. A local proxy that the user runs on a computer.

**Reason.** Five providers already speak the OpenAI interface. A local proxy needs a computer, a LAN route and a second process. The phone is the only device that is always present.

## DEC-09 - The Provider Chain Is Ordered And Editable

**Decision.** The chain is a list. The user reorders it and removes providers in Settings.

**Reason.** A user with only one provider key should not wait for the failures of the providers before it. A user with a fast provider should not be moved off it.

**Amendment — 2026-11-14.** The manual, user-ordered provider chain conflicts with the approved product direction of automatic model selection (see DEC-29). The ordering part of this decision is superseded for the multi-model engine. The user's role changes from chain editor to policy setter: the user may exclude providers or models, prefer a model, or pin a model for a session. The user does not maintain the failover order by hand. The original text is retained above for the historical record; DEC-29 states the governing direction. Implementation details remain under review.

## DEC-10 - The Chain Advances On Quota, Rate Limit And Server Errors, And Stops On A Bad Request

**Decision.** The failover table in `architecture.md` section 7.

**Reason.** The same request on another provider fails the same way. Retrying a 400 across the chain wastes the whole chain and hides the real error.

## DEC-11 - The Allowance Is Read From The Provider, Not Stored

**Decision.** The app reads the allowance from the provider response and from the 429 body.

**Reason.** Google states that free tier limits are not published and must be read in AI Studio. A stored table was already wrong once, in the Our Free Model registry note, which claimed 27 free models and 200 requests a day when the live answer was 15 free variants and 50 or 1000 requests a day.

## DEC-12 - Keys Live In App Private Storage, And The Browser Build Is Out Of Scope

**Decision.** The keys are in a `0600` file under `Directory.Private`. The browser build keeps the feature off.

**Alternatives.** Add a secure storage plugin. Keep the keys in `localStorage`.

**Reason.** `localStorage` is readable by any script that runs in the page. The project has no secure storage plugin, and adding one for one trial is more than the trial needs. The file is app private and the browser build is not in the trial.

## DEC-13 - No Assistant Data Is Stored In The Tenant Database During The Trial

**Decision.** The conversation lives in memory for the session. Nothing is written to the tenant database.

**Reason.** A month of trial data in the tenant schema is a migration, a rollback plan and a privacy question. The trial does not need it. If the trial succeeds, the decision becomes a product decision with a proper design.

## DEC-14 - The Tool List And The Chat Sheet Are Document Generic

**Decision.** The tool list, the chat sheet, the provider client and the failover rules live outside the invoice module.

**Reason.** FR-17. A quotation or a waybill assistant is the same work with a different tool list. The invoice module must not become the place where the chat logic lives.

## DEC-15 - Notes And Terms Are Written As Plain Text

**Decision.** The notes tool takes plain text. The app stores one paragraph block.

**Reason.** The rich text block contract is a second thing for the model to get right, for little gain in a conversation. The user can edit the result in the form.

## DEC-16 - The Feature Is Off By Default And Stays Gated For The Trial

**Decision.** A Settings toggle, off after install.

**Reason.** FR-13 and FR-14. A trial that is on by default is a trial that has already shipped to every user of the app.

## DEC-17 - Cloudflare Workers AI Leads The Provider Chain

**Decision.** The first provider in the chain is Cloudflare Workers AI on the free plan. The AMD Radeon Cloud Token Factory is second. The key for each comes from a free signup and needs no credit request.

**Alternatives.** AMD first. Gemini first. OpenRouter first.

**Reason.** Two things decide the order. The AMD allowance is the largest at about 10 US dollars of usage a day, but its endpoint is on the China site, which is a reachability and a latency risk for a user in Nigeria. Cloudflare runs on an edge network that is close to the user, its free plan gives about 3,700 conversation turns a day with the cheapest model, and it needs no card. A chain that the user cannot reach is worth less than a chain that is smaller and reachable.

**Cost of this decision.** The Cloudflare free plan cannot use the strongest models. DeepSeek V4 Flash, GLM 5.2, GLM 5.3, Kimi K2.6 and Inkling 2 Small all need a paid billing method. The free plan serves Llama, Gemma 4 26B, Qwen 3 30B, Granite and GPT-OSS. RISK-18.

## DEC-18 - AMD Token Factory Is The Second Provider

**Decision.** The AMD Radeon Cloud Token Factory is the second provider. Its key comes from the free AMD AI Developer Program. No credit request is needed.

**Reason.** Its daily allowance of about 10 US dollars of usage is the largest in the chain by two orders of magnitude, and it serves frontier models that the Cloudflare free plan cannot reach. It is second because of the China site, not because of its quality.

**Cost of this decision.** The AMD terms call Token Factory a free trial and development service, not a production service, and forbid reselling access. RISK-14. The trial is inside the terms. A release to tenants is not.

## DEC-19 - Phase 1 Uses Only The OpenAI Interface

**Decision.** Every provider is called through the OpenAI chat completions interface. The AMD Anthropic Messages path is not used in phase 1.

**Reason.** One request builder and one stream parser. A second interface means a second parser, a second set of contract tests and a second set of failure cases. The Anthropic path is a fallback for a broken OpenAI path, not a phase 1 feature.

## DEC-20 - The Trial Runs Against A Local Gateway

**Decision.** The trial points the app at one OmniRoute gateway. The gateway is one OpenAI compatible endpoint on the developer computer, or on the phone in Termux. The app holds one provider row.

**Alternatives.** The app calls the free providers directly, with its own chain. The app calls one provider directly, with no chain.

**Reason.** The gateway already holds what the app would otherwise have to build. It has 150 or more free providers, a quota aware failover, live quota telemetry, a terms catalog that excludes the providers it marks as avoid, a routing decision header and a cost header. It binds `0.0.0.0`, so a phone on the same network reaches it, and it runs in Termux with no root.

**Cost of this decision.** The trial needs a gateway process. RISK-20.

## DEC-21 - The App Keeps Direct Mode For The Shipping Path

**Decision.** The app keeps the provider rows and the failover table for the direct mode. The gateway is one row among them.

**Reason.** A tenant of a shipped product will not run a Node server on their computer. The vendor can not run a gateway either without a cost that the free model budget does not cover. The direct mode, where the tenant pastes their own provider key into the app, is the shipping path. The gateway is the trial path and the developer path.

## DEC-22 - affectUI Is Evaluated For The Chat Surface And Not Adopted For The Trial

**Decision.** The change card is built inside this project. The affectUI components are not added as a dependency during the trial.

**Reason.** affectUI fits the project well: MIT, React 19, one file per component, no Tailwind and no animation library, and it installs into `src/components/ui/` with the shadcn CLI that this project already uses. Its Decision Inbox is an approval list with two answers, a live region and keyboard support, which is the shape of the change card.

The reason not to adopt it now is that the components carry their own styles and not the `bd-*` tokens of this app. The change card must show an old value, a new value and a money amount in the app's own language. Restyling a foreign component costs more than the sixty lines that the card needs. The trial does not need the trace view, the agent tree or the cost breakdown that the paid tier of affectUI covers.

**Trigger to adopt.** If the assistant grows past one document type, or if the team wants an agent trace view with cost and timing, the Tool Call Card and the Decision Inbox are the fast path. The MCP server lets Claude Code, Codex and OpenCode install them.

## DEC-23 - The Provider Catalog Is Data, Not Code Per Provider

**Decision.** Every tier 1 provider is a catalog row: name, base URL, key prefix, default model and declared models. One OpenAI compatible client serves every row.

**Alternatives.** A module per provider. A setup wizard that asks for a base URL.

**Reason.** Five providers already share the OpenAI interface, and the rest publish a compatibility route. A module per provider adds code without a behaviour change. A setup wizard asks the user for a value that the app already knows. The row keeps one paste as the whole setup cost.

## DEC-24 - The Model List Starts Declared And Refreshes On Demand

**Decision.** The dropdown opens with declared model ids. A **Fetch models** action merges the live `/models` answer. A failed fetch keeps the declared list.

**Alternatives.** Fetch on open. Ship no list and force a fetch.

**Reason.** Fetch on open adds a spinner to a control that must feel instant. A provider without a `/models` route would show an empty dropdown. The declared list is the floor, and the live list is a bonus.

## DEC-25 - A Custom Endpoint Is A First-Class Provider

**Decision.** The custom form creates a provider row with the `custom:<slug>` id. It uses the same client, the same cards and the same key rules.

**Alternatives.** A separate "advanced" chat path. A base URL field on every message.

**Reason.** An unlisted model fails for the same reasons as a listed one: a bad key, a quota, a network fault. A second chat path doubles the failure handling. One row keeps one readout and one failover rule.

## DEC-26 - Four Layouts, One State Model

**Decision.** The assistant renders in four shells that read one conversation, one invoice and one provider state. Width alone selects the shell.

**Alternatives.** One responsive column. A separate desktop product.

**Reason.** A phone needs a sheet, a foldable needs a split, a tablet needs a rail and a desktop needs an artifact column. These are layout differences, not product differences. A single state model keeps the money rule and the card rule the same in every shell.

## DEC-27 - Keep Local Chat Primitives And Do Not Add The assistant-ui Runtime

**Decision.** Keep the BOUXRE chat UI and local Chat-blocks patterns. Do not add `@assistant-ui/react` for this feature.

**Alternatives.** Adopt the full assistant-ui runtime. Copy selected primitive behavior into local components.

**Reason.** BOUXRE must own every document mutation, approval, and financial calculation. Local state and deterministic change cards keep that boundary explicit. The existing four viewport shells and BYOK transport also remain app-owned. The local Shadcn references provide the required scroll, composer, model menu, approval, and status-trace patterns without adding a runtime dependency graph. Current assistant-ui guidance also deprecates `makeAssistantToolUI` and `useAssistantToolUI` in favor of toolkit renderers or inline part overrides. Port only the UX behaviors that are needed.

## DEC-28 - Bolu Is A Conversational Business Operations Assistant

**Status:** APPROVED by the product owner on 2026-11-13.

**Status:** APPROVED by the product owner on 2026-11-13.

**Decision.** Bolu must support reading authorized business records, creating business documents, and modifying existing business documents through controlled conversation. Read-only Business Intelligence is one capability, not the complete product.

**Approval boundary.** The model may interpret intent and propose structured changes. The application owns tenant scope, authorization, validation, calculations, business rules, persistence, and execution. The user must approve each proposed change before the application applies it. The user must separately confirm before the application saves or files a document. Change approval does not authorize persistence.

**Financial and security constraints.** Existing calculation engines and system-owned values remain authoritative. Bolu must not invent missing facts, replace computed values, bypass tenant permissions, or perform unapproved payments or money movement.

**Scope limit.** This decision approves the product direction and control boundary only. It does not approve every FR in this draft, the first document pack, all eight packs, a provider chain, key custody, trial details, or a release schedule. Those items remain under review.

**Relationship to earlier entries.** DEC-01 through DEC-27 remain historical proposals and decisions from the draft document-authoring specification. DEC-28 supersedes any interpretation that read-only BI is sufficient as Bolu's complete direction. DEC-28 does not silently approve the detailed requirements, provider choices, trial, or schedule in those entries.

## DEC-29 - One Engine, Interchangeable Models, Automatic Selection (2026-11-14)

**Status:** APPROVED product direction (2026-11-14). Implementation details and provider choices remain PROPOSED or UNRESOLVED. This entry does not approve a provider, a chain, a custody model, a release, or a ship date.

**Decision.** BOUXRE exposes one application-owned AI engine with multiple interchangeable providers and models. The engine selects an eligible model automatically and fails over automatically when a model is unavailable, unreliable, rate-limited or unsuitable for the task. Free-first applies among eligible models. The engine may add, deprioritise or retire models as their availability, cost, reliability, or terms change, without redesigning the AI experience.

**Direction principles.**

1. One engine, many providers, many interchangeable models. The engine is consistent; the models are interchangeable inference resources.
2. Automatic selection and failover replace manual chain maintenance. A user constrains policy (exclude, prefer, pin). The user does not maintain order by hand. The DEC-09 amendment records this supersession.
3. Free-first among eligible models. Zero token price alone never decides selection. Free status is dynamic: advertised cost, account entitlement, quotas, promotions and rate limits are distinct conditions.
4. Paid inference is denied by default. Any paid escalation requires an owner-authorised policy.
5. Capabilities gate selection. Required: tools, structured output, modalities, context window, streaming. Unknown capabilities are not confirmed capabilities.
6. Failover is bounded. Retry-After is respected when supplied. 429 cools the model; 5xx advances; 400 stops. Authorization failures never retry indefinitely. Malformed user requests never switch providers.
7. The application owns tenant scope, authorization, calculations, business rules, approval flows and idempotency. A model never acquires authority over any of these. Capability selection is application-owned.
8. Conversation context is preserved where feasible across a model switch.
9. Design Lab must come to reflect the real engine's inventory, routing state and eligibility, not a disconnected simulation presented as production behaviour.
10. Implementation is proportional. No external routing service, no second provider system, no stored quota tables.

**Relationship to earlier entries.** DEC-08, DEC-10, DEC-20, DEC-21, DEC-23, DEC-24, DEC-25 remain the architectural foundation (one OpenAI-compatible client; row-based catalog; declared floor with on-demand discovery). DEC-11 stands (quota is read from the provider, never stored). DEC-17 and DEC-18 chain preferences remain historical proposals and are superseded for the shipping chain by this direction and by the DEC-09 amendment. DEC-20 is retained: OmniRoute is a developer-machine trial tool, not a product dependency. DEC-28 is unchanged: the read/write business-operations approval boundary stands, and the engine changes nothing about it. Bolu is currently read-only; any write path remains subject to separate approval and the existing safeguards.

**Current implementation, stated plainly.** The repository holds one Bolu provider path (AMD on a server boundary), a legacy static failover path, and a Design Lab simulation. None of these is the DEC-29 architecture. The catalog rows are the declared floor from which the engine will select.

**Unresolved and explicitly not approved here.** Provider set and order; custody (client-side Capacitor private file vs server-side environment key); consent text and named-provider disclosure; paid escalation policy; whether AMD, free-tier Gemini, or NumeS may process tenant data; Gemini 4 Hydrogen admission; per-provider eligibility; health-ledger persistence; manual-pin semantics; engine diagnostics visibility; attribution for the Hermes-derived concept. See `docs/reports/ai/2026-11-14-dynamic-model-routing-reconciliation.md` for the full decision list.

## DEC-30 - Bolu Application-Side Invoice Operations Pipeline & Mock Boundary Verification (2026-11-14)

**Status:** IMPLEMENTED & VERIFIED against deterministic mock boundary on 2026-11-14.

**Decision.** The application-side conversational business-operations pipeline for the reference Invoice document family is implemented and tested without live API provider dependencies.

**Architecture and Implementation:**
1. **Contract and Validation:** Defined typed operation contracts in `src/lib/ai-assistant/bolu-operations.ts` (`create-document` for `'invoice'`, `modify-document`, `read-records`). Application-side parameter sanitization ensures line-item validation, non-negative amounts, and customer association before state updates.
2. **Pure State Management:** Extracted conversation and operation lifecycle into a pure reducer (`src/lib/ai-assistant/bolu-reducer.ts`) and prompt utilities (`src/lib/ai-assistant/bolu-formatting.ts`) to avoid file bloat (<350 lines each).
3. **Two-Gate UI Lifecycle:** Enforced two explicit user gates in `AssistantSheet.tsx`:
   - Gate 1: Review proposed changes via Change Proposal Card -> Explicit Apply.
   - Gate 2: Review resulting draft document -> Separate Save Confirmation Card before persistence.
4. **Authoritative Persistence Integration:** Centralized in `src/lib/ai-assistant/bolu-document-service.ts`:
   - Reuses BOUXRE's PostgreSQL transaction RPC `save_invoice_with_items_transaction` when `entityId` is present to ensure atomic insertion.
   - Applies compensating rollback cleanup (header deletion) on line-item insertion failure during sequential fallback.
   - Wraps sequence numbering with `withUniqueRetry` from `@/lib/withUniqueRetry` to gracefully handle concurrent numbering collisions.
   - All financial totals (subtotal, total, VAT, WHT, discount) are strictly computed by `calculateDocument` from `src/lib/Calculations.ts`. Model-invented calculations are discarded.
   - Tenant isolation and permission checks (`canWrite`, `canRead`) gate both reads and writes.
5. **Deterministic Mock Testing:** Built a full fixture-based mock provider in `src/lib/ai-assistant/bolu-mock-provider.ts` covering 12 operational scenarios.
6. **Automated Verification:** Verified through 49 automated unit and integration tests across 7 test files in `src/tests/ai-assistant/`. All 49 tests pass.

**Boundary Distinction:** This decision records application-side implementation and verification against the deterministic mock boundary. It does not establish live provider connectivity, provider API key configuration, live inference reliability, or the implementation of the other seven document families (quotations, purchase orders, waybills, etc.), which remain explicitly deferred.

## DEC-31 - Mandatory Engineering Task Close-Out & Canonical Roadmap Reconciliation Policy (2026-11-14)

**Status:** APPROVED MANDATORY GOVERNANCE POLICY on 2026-11-14.

**Decision.** Continuous engineering roadmap maintenance is a mandatory requirement of every BOUXRE implementation and audit task. No engineering task is complete until the canonical roadmap (`Waterfall-roadmap.md`) and the visual presentation mirror (`roadmap.html`) are reconciled against the actual repository code state and test evidence.

**Policy Rules:**
1. **Canonical Source of Truth:** `Waterfall-roadmap.md` is the primary engineering progress record. `roadmap.html` must remain strictly synchronized with it.
2. **Evidence-Based Status:** Capabilities must be recorded based on verified test evidence:
   - "Implemented & Tested" requires automated test evidence against a clearly stated boundary (e.g. mock boundary).
   - "Production-Ready" requires live environment verification, production configuration, and security/terms compliance.
   - "Partial", "In-Progress", "Blocked", and "Deferred" must be accurately differentiated.
3. **No False Completion:** Passing unit or mock tests must never be conflated with live provider connectivity or full production readiness.
4. **Mandatory Close-Out Steps:** Every future task must include:
   - Worktree inspection (`git status`).
   - Roadmap update with a dated section.
   - Synchronization of visual HTML roadmap.
   - Reconciled supporting docs (`decision-log.md`, `risk-register.md`, `architecture.md`, `functional-req.md`, `test-plan.md`).
   - Git cleanliness verification (`git diff --check`).

## DEC-32 - Universal Document-Intelligence Contract For Bolu (2026-11-14, agreed in design process; NOT implemented)

**Status:** AGREED architectural direction (design process, 2026-11-14). Implementation sequencing remains PROPOSED. This entry approves the contract shape only. It does not approve a delivery date, a first-release document family, an execution plan, or any provider.

**Decision.** Bolu must process business documents and attachments through one universal pipeline: source intake and preservation; faithful extraction of source observations; normalization into typed business records; cross-document reconciliation with match-candidate generation; deterministic calculations; human review, correction and approval; and approved business-document creation or modification. Document-family-specific extensions attach to this pipeline. They do not fork it.

**Canonical conceptual objects (contracts, not schema decisions).**

- **SourceDocument** — identity, source type, original reference, author/supplier where stated, date where stated, processing status. The original source is preserved unchanged.
- **ExtractedObservation** — faithful source content: original wording, extracted values, source location/reference, and extraction confidence or uncertainty where supported.
- **NormalizedItem** — standardized business representation. Unknown values are explicit nulls. Every field references the observations that support it.
- **MatchCandidate** — proposed relationship between business records. Matching evidence, unresolved differences, confidence, review state.
- **Calculation** — explicit inputs, formula, result, currency/unit basis, reproducibility.
- **ReviewDecision** — human confirmation, rejection, correction or approval. Traceable to the affected evidence and records.

**Evidence classification (nature of the information).** `extracted`, `calculated`, `inferred`, `matched`, `unverified`, `conflicting`. Evidence classification is not a workflow status.

**Workflow status (review progress).** `not_found` → `information_found` → `possible_match` → `awaiting_confirmation` → `confirmed` → `priced_verified`. `priced_verified` requires a confirmed match, an unambiguous price basis and unit, and verified calculation inputs. No AI-generated interpretation may promote itself to `confirmed`; promotion requires a human review decision. Conflicting evidence is retained and never silently resolved.

**Deterministic calculations.** The application owns arithmetic. AI may extract or suggest inputs but is never the authority for financial totals. Every calculation preserves inputs, formula, result and currency/unit basis. No verified extension is calculated or claimed while the unit, quantity basis or price basis is ambiguous. Provisional amounts are never presented as confirmed commercial totals.

**Matching.** Matching considers descriptions, specifications, units, quantities and source identifiers. A shared serial number alone must not establish `confirmed`. A possible match remains a candidate until review or confirmation. Matching rules are document-family-specific and extensible.

**Preservation and traceability.** Sources are preserved unchanged. Normalized values trace to observations. Conflicting observations are retained. Extracted facts, human corrections and inferred interpretations stay distinguishable. No silent overwrite of source evidence.

**Human approval is unchanged.** DEC-28 boundaries stand: the model proposes; the user approves each proposed change; the user separately confirms saving or filing. Tenant isolation, permissions, business rules and idempotency remain application-owned. Audit trails record every review decision.

**Document-family extensions.** The universal contract must support invoice, quotation, purchase order, waybill, CSR, RFQ, cost sheet and letter as candidate families, each with family-specific semantics, fields, validation and permissions. Similar-looking lines and supplier/customer roles are never interchangeable. First-release scope is explicitly NOT approved; family selection is an open decision.

**The solar-pump BOQ acceptance case.** The solar-pump BOQ and supplier-message reconciliation is the first acceptance scenario, not the basis of a BOQ-only architecture. The scenario and its acceptance cases are recorded in `functional-req.md` FR-41 and in the test-plan document-intelligence addendum.

**Explicitly unresolved (not approved here).** Supported attachment types, size limits, retention and deletion policy; extraction provider selection; privacy policy and consent for external AI processing; which document families ship first; verification cadence for external-model extraction quality; mapping of canonical objects to the database schema.

**Relationship to earlier entries.** DEC-28 stands. DEC-29 stands. DEC-30 records the implemented invoice mock-boundary pipeline; DEC-32 extends the contract it embodies to the universal intake/evidence/matching surface. DEC-31 stands; this entry was recorded per its close-out policy and does not modify it.

## DEC-33 - Source Fidelity, Interchange Interfaces And Attachment Intake (2026-11-14, agreed in design process; NOT implemented)

**Status:** AGREED architectural direction (design process, 2026-11-14). Implementation sequencing remains PROPOSED. No implementation details are approved by this entry.

**Decision.** Attachment and external-AI intake are application-owned lanes, separate from provider capabilities:

1. The application owns file intake, source preservation, processing status, identity and validation. File support never depends on a single provider.
2. External AI may convert an attachment into structured Markdown. That Markdown is an interchange representation for working purposes, never the permanent business data model.
3. Bolu must validate and normalize every incoming piece of information before it enters a business workflow. Uncertainty, omissions and source references are preserved. An external model may not invent missing values; invented values are rejected or flagged for review.
4. No provider is assumed to support file upload, image understanding, document parsing or any specific modality. Provider capability differences are handled by eligibility gates (DEC-29), not by hoping.
5. Markdown interchange preserves original wording alongside normalized values, so a reviewer can always see what the source said.
6. Extraction output that cannot be verified is marked `unverified` or `conflicting` and stays out of `confirmed` until a human reviews it.

**Unresolved (explicitly not approved here).** Supported file types and size limits; retention and deletion policy; extraction provider selection and its terms; per-provider capability matrix; consent and disclosure wording; whether extraction runs on-device, on a Vercel route, or through a provider; attachment size quotas; deletion after approval. These are owner decisions recorded here so nothing later mistakes them for agreed scope.

**Relationship to DEC-32.** DEC-32 defines the universal pipeline; DEC-33 defines the intake contract that feeds it. Both stand or fall together. Neither approves delivery scope, dates or providers.

## DEC-34 - Server-Side Configurable AI Provider Architecture & Live Invoice Operation Activation (2026-11-14)

**Status:** APPROVED AND DELIVERED (2026-11-14).

**Context.**
Bolu's application-side operations architecture was verified at the mock boundary (DEC-30). However, connecting live AI inference required a secure, provider-agnostic bridge that preserves application authority over financial arithmetic, authorization, tenant isolation, and two-gate human approval, without hardcoding third-party providers or leaking secrets to browser clients.

**Decision.**
1. **Server-Side Interchangeable Provider Adapter (`api/bolu-chat.ts`, `src/lib/ai-assistant/bolu-provider.ts`):**
   - The server endpoint connects to any OpenAI-compatible `/chat/completions` API using standard Bearer authorization and streaming Server-Sent Events (SSE).
   - Base URLs are idempotently normalized via `normalizeChatEndpoint` to guarantee proper `/chat/completions` path construction.
   - Converts both `text/event-stream` and buffered `application/json` provider responses into uniform SSE tokens so client-side streaming functions unconditionally.
   - Provider credentials remain strictly server-side; browser code has zero visibility of keys.
2. **Server-Only Minimal Environment Contract:**
   - `BOLU_PROVIDER_NAME`: Provider identifier string (default: `'generic-openai'`).
   - `BOLU_PROVIDER_BASE_URL`: Root API URL (default: `'https://openrouter.ai/api/v1'`).
   - `BOLU_PROVIDER_API_KEY`: Server-only secret key (backward-compatible with `BOLU_AMD_API_KEY`).
   - `BOLU_PROVIDER_MODEL`: Model identifier (default: `'meta-llama/llama-3.3-70b-instruct:free'`).
   - `BOLU_PROVIDER_TIMEOUT_MS`: Request timeout (default: `30000`ms, clamped 5000-120000ms).
   - `BOLU_PROVIDER_MODE`: Operational mode (`'live'` or `'mock'`; defaults to `'live'` if an API key is set, `'mock'` otherwise).
3. **Fail-Closed Structured Operation Contract:**
   - Server system prompt restricts models to returning structured JSON envelopes (`"bolu_operation"` with `create-document` for `'invoice'` or `modify-document`).
   - Models are explicitly forbidden from calculating totals or emitting financial summaries.
   - Client-side parser catches syntax errors and malformed envelopes, preventing invalid proposal generation.
   - Unsupported operations (`delete-document`, `pay-invoice`) and unsupported document families (`quotation`, `purchase-order`, etc.) are rejected fail-closed with user-facing alerts.
4. **Authoritative Calculation Lock:**
   - All financial math (`subtotal`, `total`, `vat`, `wht`, `discount`) is recomputed by `calculateDocument` in `src/lib/Calculations.ts`. Model math is discarded unconditionally.
5. **Two-Gate Approval Lifecycle Preserved:**
   - Gate 1 (proposal review before working draft modification) and Gate 2 (explicit confirmation before database persistence) remain strictly enforced. Provider failures, timeouts, and rate limits cannot trigger approval or persistence.
6. **Authoritative RPC Persistence:**
   - Persistence integrates with PostgreSQL RPC `save_invoice_with_items_transaction` with compensating rollback and `withUniqueRetry` sequence retry.
7. **Verification Evidence:**
   - Verified by 62 automated unit and integration tests across 8 test suites in `src/tests/ai-assistant/`.

**Explicit Boundary: Implemented vs. Production-Ready.**
The server-side adapter, parsing, calculation locking, and two-gate workflow are fully implemented and automated-tested. However, live third-party network inference in production and trial rollouts remain deferred pending owner key custody, privacy disclosure, and terms compliance (RISK-14).

**Relationship to Prior Decisions.**
- Supersedes the temporary mock boundary in DEC-30 by activating the live adapter path while preserving mock testing.
- Fulfills the provider independence and server-side credential mandates in DEC-29.
- Preserves the two-gate approval and application authority principles in DEC-28.
- Conforms to the mandatory roadmap reconciliation policy in DEC-31.

## DEC-35 - AMD Token Factory Provider Compatibility, Auto-Detection & Server-Only Key Configuration (2026-11-14)

**Status:** APPROVED AND VERIFIED (2026-11-14).

**Context.**
The user provided an AMD API key from the AMD AI Developer Program / AMD Radeon Cloud Token Factory and requested activation as the primary live inference provider for Bolu. The security of the key-handling pipeline and technical compatibility of AMD's endpoint required authoritative verification.

**Decision.**
1. **AMD Token Factory Compatibility Verified:**
   - Base URL: `https://developer.amd.com.cn/radeon/api/v1`
   - Chat Completions Endpoint: `https://developer.amd.com.cn/radeon/api/v1/chat/completions`
   - Protocol: OpenAI-compatible HTTP POST `/chat/completions` with SSE streaming.
   - Auth Format: `Authorization: Bearer rc-...` (key prefix `rc-`).
   - Default Model: `DeepSeek-V4-Flash` (1M context window).
   - Headers: Clean standard headers (`Content-Type: application/json`, `Authorization`). Vendor-specific headers (e.g. OpenRouter `HTTP-Referer`, `X-Title`) are omitted.
2. **Server-Side Secret Custody Verified:**
   - Keys are accessed exclusively in serverless route `api/bolu-chat.ts` via `process.env`.
   - Zero exposure to client-side bundles, React components, browser state, logs, error responses, or `VITE_*` variables.
   - Keys are not stored in `localStorage`, `sessionStorage`, browser cookies, or database records.
   - Missing keys fail safe with HTTP 503 without initiating network calls. Mock mode bypasses provider network calls completely.
3. **Smart Provider Auto-Detection Added (`src/lib/ai-assistant/bolu-provider.ts`):**
   - The runtime automatically infers `providerName = 'amd'` when `BOLU_AMD_API_KEY` is present or the API key begins with `rc-`.
   - Automatically resolves default AMD base URL and model `DeepSeek-V4-Flash` without requiring redundant manual variable overrides.
4. **No Frontend Settings Key Input:**
   - In-app key input in frontend Settings is rejected. Storing API keys in tenant database rows or client memory violates security boundaries.
   - Server-side environment variables in the deployment platform (Vercel Project Settings) remain the sole authorized configuration path.
5. **Operational Boundaries:**
   - AMD Token Factory operates on the China site (`developer.amd.com.cn`). Terms designate it as a free trial and development service (not for production). Live commercial rollout remains deferred pending owner terms evaluation (RISK-14).

**Relationship to Prior Decisions.**
- Implements the provider-agnostic live adapter mandate of DEC-34 for the AMD provider.
- Conforms to the server-side credential isolation required by DEC-29.
- Follows the mandatory roadmap reconciliation policy of DEC-31.

## DEC-36 - Hermes-Inspired Guided CLI Provider Setup & Deployment Integration Architecture (2026-11-14)

**Status:** APPROVED AND DELIVERED (2026-11-14).

**Context.**
Manual navigation through cloud deployment consoles (Vercel Project Settings) introduces friction and configuration errors when setting up Bolu's AMD API key. An administrator requires a streamlined, guided setup experience inspired by the Hermes agent setup wizard, while respecting BOUXRE's serverless deployment architecture.

**Decision.**
1. **Guided PowerShell Setup CLI (`scripts/setup-bolu-provider.ps1`, `bun run bolu:setup`):**
   - Implements an interactive CLI wizard for AMD Token Factory setup, testing, and rotation.
   - Accepts API keys securely via `Read-Host -AsSecureString` to prevent visual exposure and shell history retention, zeroing memory pointers after use.
2. **Pre-Flight Live Verification (`Test-AmdConnection`):**
   - The CLI performs a lightweight pre-flight request directly to AMD's `/chat/completions` endpoint using in-memory credentials before writing configuration.
   - Validates reachability, authentication (401/403 detection), and rate limits (429) without revealing credentials.
3. **Local & Remote Deployment Synchronization:**
   - **Local (.env.local):** Writes or updates `BOLU_PROVIDER_*` variables in `.env.local` and verifies `.gitignore` protection.
   - **Remote (Vercel):** Connects to Vercel CLI (`vercel env rm` / `vercel env add`) to configure `production` and `preview` environments.
4. **Honest Deployment Authorization Boundary:**
   - Explicitly acknowledges that local PC commands cannot mutate remote cloud environments without authenticated deployment access.
   - Automatically detects Vercel CLI availability and login state (`vercel whoami`), providing one-time authorization instructions (`vercel login`) rather than simulating remote synchronization.
5. **Key Replacement & Rotation:**
   - Full support for rotating keys cleanly, replacing existing entries without duplication.
6. **Verification Evidence:**
   - Verified by 67 automated tests across 9 test suites in `src/tests/ai-assistant/`, including `bolu-provider-setup.test.js`.

**Relationship to Prior Decisions.**
- Operationalizes the server-side configuration requirements established in DEC-34 and DEC-35.
- Complies with DEC-31 mandatory roadmap reconciliation.

## DEC-37 - In-App Administrator Provider Secret Management & Envelope Encryption (2026-11-14)

**Status:** APPROVED AND DELIVERED (2026-11-14).

**Context.**
Prior decisions (DEC-35, DEC-36) relied on deployment-environment variables (`process.env`) and external CLI tooling (`scripts/setup-bolu-provider.ps1`) to configure Bolu's shared AMD provider key. The user requested an in-app administrator configuration experience inspired by LibreChat's encrypted provider key pattern, adapted to BOUXRE's platform assistant architecture.

**Decision.**
1. **Architectural Model:** Single application-level shared enterprise credential (not per-employee BYOK). Platform administrators configure the AMD Token Factory key via in-app Settings without visiting cloud deployment consoles.
2. **Secret Storage & Envelope Encryption:**
   - Dedicated table `public.app_ai_provider_config` with columns for ciphertext, 12-byte nonce, 16-byte authentication tag, key version, masked key, and audit metadata.
   - Encryption: AES-256-GCM envelope encryption using a server-isolated master key derived from `BOLU_ENCRYPTION_KEY` or `SUPABASE_SERVICE_ROLE_KEY` via HMAC-SHA256 with domain salt.
   - Database Row-Level Security (RLS): Strictly denies client access (`USING (false)` for `authenticated, anon`), ensuring zero direct browser reads or writes via PostgREST. Decryption occurs exclusively in serverless memory.
3. **Serverless Management Endpoints (`api/bolu-provider-config.ts`):**
   - Admin authorization check: verifies `profiles.role === 'admin'` or `workspace_members.role in ('owner', 'admin')`.
   - `GET`: Returns sanitized public status (masked key `rc-••••••••••••7766`, model, active source, updated timestamp). Plaintext and ciphertext are never returned.
   - `POST`: Supports `'save'` (encrypts & upserts), `'test'` (pre-flight test to AMD endpoint), and `'remove'` (deletes row).
4. **Runtime Precedence Hierarchy in `api/bolu-chat.ts`:**
   - Level 1: In-App Database Config (`app_ai_provider_config`, decrypted in server memory).
   - Level 2: Server Environment Variables (`BOLU_PROVIDER_*` or `BOLU_AMD_API_KEY`).
   - Level 3: Deterministic Mock Mode (`BOLU_PROVIDER_MODE=mock` or unconfigured fallback).
5. **In-App Administrator UI (`BoluProviderSettingsSection.tsx`):**
   - Mounted in `src/pages/Settings.tsx` (`bolu-provider` section) with `adminOnly: true`.
   - Features real-time connection testing, masked preview, model selection (`DeepSeek-V4-Flash`), key replacement, and credential removal.
6. **Verification Evidence:**
   - 74 automated tests passing in `src/tests/ai-assistant/`, including `bolu-secret-vault.test.js`.

**Relationship to Prior Decisions.**
- Adapts and elevates the server-side secret principles of DEC-35 into a first-class, administrator-managed in-app experience.
- Preserves the application authority boundaries of DEC-28 and live inference pipeline of DEC-34.
- Complies with DEC-31 mandatory roadmap reconciliation.

## DEC-38 - Bolu Provider Configuration Response Parsing Resilience & Local Dev API Middleware (2026-11-14)

**Status:** APPROVED AND DELIVERED (2026-11-14).

**Context.**
When administrators tested or deployed provider configurations from `/settings`, an unhandled client exception occurred: `Failed to execute 'json' on 'Response': Unexpected end of JSON input`. Investigation revealed two root causes:
1. In `BoluProviderSettingsSection.tsx`, `res.json()` was called unconditionally without validating response status, content type, or body length. When an empty response or non-JSON response was returned, the browser's JSON parser threw an unhandled syntax error.
2. In local development (`bun run dev`), Vite dev server served static assets and unhandled `/api/*` routes, returning a 0-byte HTTP 404 response.

**Decision.**
1. **Defensive Response Parser (`safeParseApiResponse` in `bolu-secret-vault.ts`):**
   - Implemented a resilient response parsing helper that reads response text via `.text()` before parsing.
   - Handles 0-byte empty responses gracefully (e.g. 404, 500, or 204), returning clear, user-safe diagnostics without throwing syntax errors.
   - Handles non-JSON HTML error responses (e.g. 502/504 Bad Gateway from edge routers or proxies), strips HTML markup, and formats concise error descriptions.
   - Extracts server-side error messages from `{ error: string }` or `{ ok: false, message: string }` payloads.
   - Protects credentials: ensures API keys and secrets are never reflected in error messages.
2. **Decoupled Post-Mutation Refresh:**
   - In `handleSave` and `handleRemove`, status refresh calls are decoupled so that transient network delays during post-mutation refresh do not trigger false failure notifications when the save/remove mutation has already succeeded.
3. **Vite Local Dev API Middleware (`apiDevServerPlugin` in `vite.config.js`):**
   - Intercepts requests matching `/api/*` during local development (`bun run dev`).
   - Dynamically resolves and compiles serverless handlers in `api/*.ts` using Vite's `ssrLoadModule`.
   - Converts Node HTTP requests to standard Web `Request` and pipes Web `Response` back to client.
   - Returns structured JSON 404 responses for non-existent routes rather than unhandled 0-byte responses.
4. **Verification Evidence:**
   - 80 automated unit and integration tests passing in `src/tests/ai-assistant/` (including 6 new tests for empty bodies, HTML 502 errors, 404 routing diagnostics, and JSON error extraction).
   - Live probe against running dev server confirmed HTTP 401 JSON authentication challenge from `api/bolu-provider-config.ts` and JSON 404 for non-existent endpoints.

**Relationship to Prior Decisions.**
- Hardens the in-app provider configuration infrastructure established in DEC-37.
- Complies with DEC-31 mandatory roadmap reconciliation.

## DEC-39 - Bolu Provider Management Architecture Reassessment & Hermes Benchmark (2026-11-14)

**Status:** AUDIT COMPLETED / RECOMMENDATION SUBMITTED (2026-11-14).

**Context.**
Following resolution of JSON response parsing, a recurring server error (`err_1794667887617_u9skz6`: `Internal server configuration error.`) occurred on `/settings`. An audit-first investigation was commissioned to identify the failure cause and assess whether the provider system is comparable to Hermes Agent.

**Findings & Decision.**
1. **Root Cause Confirmed:** The failure is caused by missing `SUPABASE_SERVICE_ROLE_KEY` in Node's execution environment under Vite dev server. While Bun automatically loads `.env`, Vite dev server runs in Node and does not inject non-`VITE_*` variables into `process.env`. When authenticated requests pass a JWT, `getAdminClient()` throws, which is caught and collapsed into a generic 500 error.
2. **Hermes Capability Comparison:** BOUXRE achieves 10/20 (50%) implemented, 5/20 (25%) partial, and 5/20 (25%) missing capabilities compared to Hermes Agent. BOUXRE exceeds Hermes in database persistence, AES-256-GCM envelope encryption, and mobile responsiveness, but lacks multi-provider storage, model discovery, and non-destructive switching.
3. **Architecture Evaluation:** The current implementation is a single-provider credential form (`id = 'primary'`), not a provider-management subsystem. Storing a new provider destroys previous credentials.
4. **Recommendation:** Phased refactoring (P0: environment loading fix; P1: RBAC and dedicated encryption key; P2: multi-connection schema `app_ai_provider_connections`; P3: UX overhaul with model discovery).
## DEC-40 - Bolu Document Capability Parity: Advance Invoice Configuration & Modification Integrity (2026-11-18)

**Status:** Stage 0–0.3 COMPLETED with documented residual Finding F1. Stage 1 COMPLETED (unit-level verification; live DB outstanding). Stage 2 PARTIALLY COMPLETED (responsive viewport inspection outstanding). Stage 3+ PROPOSED, not approved.

**Context.**
The Bolu conversational document pipeline had two integrity gaps verified across three audits: (1) the document modification path could destroy persisted item lineage and ignored tenant catalog state; (2) Advance Invoice existed only as a hard-coded form flow with no conversational path. A bounded, repository-authorized repair sequence on an empty disposable project (`svrpqsdagtgtclnrlmbm`) plus application-layer work on branch `main` addressed these in three stages.

**Decision & disposition.**

1. **Stage 0–0.3 — Document modification integrity.** OBSERVATION: preservation contract implemented and verified at application layer; disposable-project migration chain repaired additively (`20261014150000`, `20261014158000`, `20261014159000`, `20261014170000`); 161/161 migrations applied and matched; scratch tenant provisioned; 23/23 live application-path checks; 34/34 Stage 0.2 tests. RESIDUAL **Finding F1**: tenant `invoice_items`/`quotation_items` lack `item_id` FKs; a direct RPC/database path accepts a well-formed nonexistent catalog UUID. Application-layer guards remain the effective protection. PROPOSED: restore the FKs after schema/lifecycle/orphan-row/installer-path review with separate authorization; production parity not established.
2. **Stage 1 — Advance Invoice service & operations.** OBSERVATION: `BoluAdvanceConfigProposal` + `persistAdvanceInvoiceConfig`; parent-invoice `custom_fields.advance_invoice` metadata only; configure/update/remove lifecycle; five editable fields; optimistic `oldValue` guard on all five (executor-enforced gate on removal); no child invoice rows; domain helpers reused, no parallel calculation engine; 40/40 reported tests; typecheck exit 0; live disposable execution outstanding. Replay protection is in-process only (`executedOperationIds`); no durable `operation_id` is persisted for this metadata-only path.
3. **Stage 2 — Conversational wiring & `warnings[]` UI.** OBSERVATION: `advance-invoice-config` envelope routed end-to-end (generation + parallel runtime + thread hook), parent resolution via tenant-scoped `readBoluInvoiceAdvanceConfig`, Gate 1 preview with exact before/after and clamp disclosure, Gate 2 explicit confirmation, executor warnings persisted verbatim onto the assistant execution message and rendered as a visible banner; 22/22 thread-flow tests; full Bolu directory 534 pass / 1 pre-existing unrelated failure (stale mock missing `.limit(1)`); typecheck exit 0. **Responsive viewport inspection was not performed** (no emulation tool; dev server exited before inspection); Stage 2 is recorded as Partially completed, not Completed.
4. DECISION (unchanged): no new migrations, no production contact, no `bun run build`, no commits by the implementing agents. Any production rollout of these repairs/features requires separate explicit authorization.

**Relationship to Prior Decisions.**
- Implements the bounded Stage 0–2 program recorded in the bolu-document-capability-parity audit.
- Complies with DEC-30 (application-owned operations), DEC-31 (roadmap reconciliation; see Waterfall-roadmap.md §36), DEC-32/33 (no pipeline stage claimed implemented).
- Retains the Stage 0.3 finding F1 explicitly; does not convert the DISPOSABLE verification into a production claim.

## DEC-41 - Bolu Document Capability Parity: Stage 3 Implementation Blueprint

**Status:** ADOPTED AS BLUEPRINT — no implementation started. Stage 2 recorded ACCEPTED with explicit qualifications (commit `e099eab2`). Stage 3+ beyond this blueprint remains PROPOSED, not approved scope.

**Stage 0–2 final disposition.** Stage 2 acceptance with qualifications: commit `e099eab2` (22 files, +1656/−81, `✨ feat(assistant): conversational advance invoice + warnings`); verified per `stage-2-final-verification.md` — 22/22 thread-flow tests, full Bolu directory 534 pass / 1 pre-existing unrelated failure (stale gate-lifecycle mock missing `.limit(1)`, classified via isolated `git archive 1d7d6d75` comparison as environment/harness defect, not a regression); typecheck exit 0. Qualifications carried forward: (a) full application-shell visual inspection outstanding (dev server fails to boot: `504 Outdated Optimize Dep`; authenticated bootstrap unavailable); (b) hook-level `useBoluThread` rendering untested in-repo (no React test renderer; adding dependencies not authorized). Stage 2 surfaces were verified at 375/680/768/1280/1440 px with no horizontal overflow. Stage 1 remains completed at unit level; live disposable execution outstanding. Finding F1 retained (tenant `invoice_items`/`quotation_items` lack `item_id` FKs; application-layer guard effective; FK restoration PROPOSED separately, production parity not established).

**Stage 3 outline adopted** — four phases, in order 3A.1 → 3A.2 → 3B → 3C; each phase complete only with Gate 1/Gate 2, preservation invariants, stale guard and executor result/warning contracts verified and reported:

1. **Stage 3A.1 — Core Contract Integrity & Natural-Language Calculation Behavior (strictly bounded).** Approved fixes:
   - F3-01: quotation `payment_terms` at creation persist into `custom_fields.payment_terms` (mirror of the modification path); the silent drop is removed.
   - F3-02: quotation `work_duration` is rejected or stripped with warning; never silently ignored.
   - F3-11: the executor verifies `project_id` against the tenant's active `projects` before write; invalid/unowned IDs are discarded with a warning (same semantics as the `item_id` discard path), precluding PostgreSQL `23503`.
   - F3-07: `notes` / `terms` are normalized by the application rich-text normalizer (`parseRichText` / `normalizeRichTextHtml`); structured headings/lists/bold runs supported; raw/unmatched model HTML blocked.
   - Prompt gains explicit negative-capability refusal rules for unsupported actions (e.g., status transitions) — refusal in-domain language, never silent failure.
   - Natural-Language Business Communication Standard: calculation responses carry business outcomes ("I've applied the VAT and updated your invoice total"), never internal module references.
   - Explicitly excluded: broad existing-document commercial field modifications (deferred to 3A.2).
2. **Stage 3A.2 — Existing-Document Field Modifications.** Expand `modify-document` with the established contract (Gate 1 preview, Gate 2 confirmation, `oldValue` optimistic guards, preservation invariants, domain-engine arithmetic only) for: `terms`, `po_number`, `invoice_title` / `quotation_title`, `project_id`, `work_duration` (invoice only), fixed charges (`workmanship`, `transportation`, `shipping`), `extraCharges`, and `calculationInputs` (VAT %, discount, WHT).
3. **Stage 3B — Custom Document Rows, Group Sections & Direct Preview-Card Item Image Management.** Typed create/modify operations for `custom_fields.header` and `custom_fields.additionalFields` (`{ label, value }` pairs, sibling merge) repairing F3-04; typed `row_type: 'group_header'` and `groupMeta` (`name`, `showSubtotal`) repairing F3-05/F3-13; and direct preview-card item image management (`image_url`) — add/preview/replace/remove on invoice and quotation preview cards via the existing secure tenant storage path, without returning to the document form.
4. **Stage 3C — PDF Presentation & Contextual Recommendations.** Verified signatory resolution (`signatoryId`); `notesTitle` / `termsTitle`; `chargeLabels`; `pdfOutput` toggles (`showBankDetails`, `bankAccountId` verified against the tenant projection, `showBalanceDue`, `showAmountInWords`, `compact`); proactive recommendation guidance in `api/bolu-chat.ts` teaching Bolu when and why to suggest custom header rows, site/delivery chips, rich-text clauses, group breakdowns and commercial settings (F3-09), grounded in verified facts and always optional under the gates.

**Explicitly out of scope (PROPOSAL, separate authorization).** Finding F1 tenant `item_id` FK restoration (schema/lifecycle/orphan-row/installer-path review); deep CPS ↔ quotation ↔ invoice parity; a server-side Gate 2 executor for advance-invoice-config; the pre-existing stale gate-lifecycle mock failure (`createPersistenceMock()` missing `.limit(1)`) — repair requires separate authorization; all production migration/deployment/contact; any new migration not separately authorized.

**Relationship to Prior Decisions.**
- DEC-40 recorded Stage 0–2 outcomes; this decision records Stage 2 acceptance and the Stage 3 blueprint.
- Complies with DEC-30 (application-owned operations), DEC-31 (roadmap reconciliation; `Waterfall-roadmap.md` §37), DEC-32/33 (no pipeline stage claimed implemented; Stage 3 remains bounded to the four phases).
- Retains Finding F1 explicitly; does not convert disposable verification into a production claim.


## DEC-42 - Bolu Document Capability Parity: Stage 3B Implementation (2026-11-19)

**Decision.** Stage 3B typed operations were delivered through the existing modify-document envelope: custom field entries via `customFieldsChange` (add/update/remove on the header and additionalFields families, labels unique and required, matched by id then case-insensitive label, snapshot-fingerprinted and re-checked at Gate 2), and grouped line items via `groupsChange` (application-minted `grp_*` ids, members matched by unique description, header rows persisted as `group_header`, `groupMeta` merged verbatim, ungrouped disposition explicit for removals with `ungroup-items` or `delete-items`, `reorder-groups` requires the full group list). Item photo review and clearing are supported conversations: the assistant can clear an existing photo (`image_url: null` through itemsChange). Adding or replacing item photos through the assistant is **not** supported, and no unsigned upload path was adopted: the only item-image upload in the application is an unsigned Cloudinary preset, which does not meet the authorization bar (no tenant, user, document or item scoping, no guaranteed authorization before an upload executes), and the task's security requirements forbid inventing a weaker mechanism or a new storage provider without separate authorization. The conversational remove capability reuses the persisted image reference and clears only that reference at save time.

**Alternatives.** Accept the unsigned Cloudinary path for conversational uploads (rejected: cannot scope or authorize uploads per tenant/document/item, and no guaranteed authorization path exists to verify before persist). Mint a tenant-scoped `item-images` storage bucket now (deferred: requires a migration and storage policies, which this stage does not authorize). Build a parallel Bolu-specific upload client (rejected: no new upload service may be introduced).

**Resolution contract.** Proposals that touch items, groups or fields self-verify against the persisted snapshot at Gate 1 (fingerprint of the items+groupMeta set; per-family fingerprint of the field entries) and re-verify identically at Gate 2 before any write. Preview and save share one deterministic engine (`bolu-document-ops.ts`), so preview and saved result cannot drift. Items and `groupsChange` may not be combined in one proposal. Ambiguous item descriptions or ambiguous custom-field matches never resolve silently. Removals of groups or photos carry explicit dispositions.

**Known gaps recorded at the time of writing.** No live tenant verification; no four-viewport inspection; image add/replace blocked on a tenant-scoped storage decision (authorization-dependent, separate task). Group rows persist identity for the lifetime of the document, so replacing a group header's persisted identity is not supported in 3B. Reordering items within a group is deferred; only group-level reordering and member assignment are supported.