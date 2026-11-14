# Architecture

- **Status:** Core product direction approved; architecture details under review
- **Product:** Conversational Document Assistant
- **Writing Standard:** ASD-STE100 Simplified Technical English

## Approved Product Boundary — DEC-28

Bolu is a conversational business operations assistant with read and write capabilities. Read-only Business Intelligence is one capability, not the complete product. This direction does not approve the detailed architecture below as final.

The system must separate these responsibilities:

1. Conversation UI and session state.
2. Route, record, and draft context supplied by the application.
3. Tenant-authorized record retrieval.
4. Capability selection and document-specific adapters.
5. Structured change proposals.
6. Application validation and permission checks.
7. Explicit user approval before applying a proposal.
8. Explicit save/filing confirmation and existing persistence path.
9. Provider transport, streaming, failure handling, and cancellation.

The model may interpret user language and propose a structured operation. It does not own tenant scope, authorization, calculation, document rules, persistence, or execution. A proposal approval and a persistence confirmation are separate gates.

## Dynamic Multi-Model Engine — Target Shape (2026-11-14, PROPOSED; NOT implemented)

DEC-29 records the approved product direction: one application-owned engine, multiple interchangeable providers and models, automatic selection, automatic bounded failover, free-first among eligible models, paid inference denied by default, dynamic add/deprioritise/retire of models. This section states the target shape. It is not a description of the code in this repository. Today: one Bolu AMD path on a server boundary, a legacy static failover walk, and a Design Lab simulation.

The target keeps the existing OpenAI-compatible foundation and extends it narrowly. It does not introduce a second provider system, an external routing dependency, a gateway as a product component, or stored quota tables.

| Layer | Target responsibility |
|---|---|
| Declared floor | One catalog of providers and models. Each entry carries provider identity, model id, context window, modalities, tool/structured-output support (true/false/unverified), streaming, limitations, free-tier status with a verification date. |
| Eligibility | The app computes which models may serve a request: terms gate, capability gate, health gate, policy gate (free-first; paid denied by default; user excludes/prefers/pins). The model never sees or influences this. |
| Selection | Deterministic ranker: terms-eligible → healthy → free → declared free, then ordered preference. Context capacity and required capabilities filter before ranking. |
| Failover | Bounded attempts per turn. Retry-After honoured when supplied. 429 cools the model; 5xx advances; 400 stops. Authorization failures never retry indefinitely. Malformed user requests never switch providers. |
| Continuity | Messages carried verbatim. Windows declared per model; oldest turns truncated to the smallest eligible window, never silently exceeded. Facts rendered outside the model survive a switch unchanged. |
| Health ledger | Observed runtime health per model (consecutive failures, cooldown-until, last-ok). Kept separate from declared capability metadata. Not persisted until an owner decision approves a store. |
| Visibility | The engine trace (which model answered, why a failover happened) is visible in-session behind a Settings toggle, never silent, per-turn. |

Open decisions are listed in DEC-29. Nothing in this section approves a provider, a custody model, or a release.

## Document Intelligence — Universal Pipeline (2026-11-14, agreed direction; NOT implemented)

DEC-32 records the agreed direction: one universal pipeline for source documents and attachments, with document-family extensions. This section states the architecture. It is not a description of shipped code. Today the repository holds the invoice mock-boundary operations pipeline (DEC-30) and read-only Bolu retrieval; none of it implements extraction, evidence classification, matching, or the canonical objects.

### Pipeline and boundaries

```
source intake & preservation  ->  extraction (faithful observations)
   ->  normalization (typed records, nulls, provenance)
   ->  reconciliation (match candidates, differences, review)
   ->  calculation (deterministic, application-owned)
   ->  human review (confirm / correct / reject / approve)
   ->  approved business-document creation or modification
```

The pipeline never invents. Each stage requires the evidence it consumes. Document-family extensions attach to stages 2–5; they do not fork the pipeline.

### Canonical objects (contracts, not schema decisions)

| Object | Meaning |
|---|---|
| SourceDocument | Identity, source type, original reference, author/supplier where stated, date where stated, processing status. Original preserved unchanged. |
| ExtractedObservation | Faithful source content: original wording, extracted values, source location/reference, extraction confidence or uncertainty where supported. |
| NormalizedItem | Standardized business representation. Unknown values are explicit nulls. Every field references supporting observations. |
| MatchCandidate | Proposed relationship between records. Evidence, unresolved differences, confidence, review state. |
| Calculation | Explicit inputs, formula, result, currency/unit basis, reproducibility. |
| ReviewDecision | Human confirmation, rejection, correction or approval. Traceable to affected evidence and records. |

Database schema, APIs and migrations are deliberately unspecified here. They follow approval of FR-34 to FR-41 and DEC-32; they are not designed in this draft.

### Evidence classification (nature of the information)

`extracted` · `calculated` · `inferred` · `matched` · `unverified` · `conflicting`. These describe how information came to exist. They are not workflow statuses and are never used as them.

### Workflow status (review progress)

`not_found` → `information_found` → `possible_match` → `awaiting_confirmation` → `confirmed` → `priced_verified`

- Promotion to `confirmed` requires a human ReviewDecision. Inference never promotes itself.
- `priced_verified` requires: confirmed match; unambiguous price basis and unit; verified calculation inputs.
- `conflicting` pairs are retained side by side until a person resolves them; resolution is recorded as a ReviewDecision, never as a silent overwrite.
- Status and classification are tracked independently.

### Source preservation and traceability

- Original sources are preserved unchanged and are the only evidence of what was said.
- Normalized fields trace to observations; observations trace to source locations and original wording.
- Extracted facts, human corrections and inferred interpretations are distinguishable at every stage.
- A human correction records a new ReviewDecision alongside the evidence; it never edits the source.

### Matching and reconciliation

Matching considers descriptions, specifications, units, quantities and source identifiers. A shared serial number alone does not establish `confirmed`. Possible matches stay candidates until review or confirmation. Matching rules are document-family-specific and extensible; the universal contract defines the candidate envelope, not the family-specific heuristics.

### Deterministic calculations

The application owns arithmetic (`src/lib/Calculations.ts` is the existing authority and is unchanged). AI may extract or suggest calculation inputs but is never the authority for totals. Every Calculation preserves inputs, formula, result and currency/unit basis and is reproducible from them alone. Where a unit, quantity basis or price basis is ambiguous, no verified extension may be calculated or claimed; provisional calculations are labelled provisional and distinct from confirmed commercial totals.

### Attachment intake and external-AI interchange

Application-owned lanes, separate from provider capabilities (DEC-33):

- File intake, preservation, identity and processing status are application-owned. File support never depends on one provider.
- External AI may convert an attachment into structured Markdown; that Markdown is a working interchange representation, never the business data model.
- Bolu validates and normalizes every incoming value before it enters business workflows. Uncertainty, omissions and source references are preserved. External models may not invent missing values; invented values are rejected or flagged.
- No provider is assumed to support file upload, images, or document parsing; modality differences are eligibility decisions (DEC-29), not assumptions.
- Extraction output that cannot be verified stays `unverified` and never reaches `confirmed` without human review.

### Human approval and business actions

DEC-28 is preserved. The model proposes; the user approves each change; the user separately confirms saving or filing. Tenant scope, permissions, calculations and idempotency stay application-owned. Every review decision is auditable. Duplicate application of an approved action is prevented at the persistence boundary (verify-before-apply; apply-once tokens; re-read at save).

### Document-family extensions

Invoice, quotation, purchase order, waybill, CSR, RFQ, cost sheet and letter are candidate families with family-specific semantics, fields, validation and permissions. Similar-looking lines and supplier/customer roles are never interchangeable. First-release family selection is explicitly unresolved and approved for nobody.

### The solar-pump BOQ acceptance case

FR-41 defines the acceptance scenario: the solar-pump BOQ and supplier-message reconciliation. It exercises 300W panels (New/Tokunbo, overwritten New price), mounting structures (component offers that do not prove the lot scope), 10mm² cables (handwritten digits uncertain), 4mm cable (spec must confirm), MC4 pricing per item against pair quantities, serial-number-only supplier entries, missing units, civil-materials-without-pricing, and calculations that must stay provisional. The system must not invent specifications, silently choose condition, overstate match confidence or present provisional amounts as confirmed. This acceptance case does not turn the architecture into a BOQ tool; it is one family among the eight-plus candidates, chosen because it exercises every pipeline stage unusually hard.

### What this architecture deliberately does not do

- It does not choose an extraction provider, file types, size limits, retention or privacy policy (open decisions; DEC-33).
- It does not decide the first release's document families.
- It does not design the database schema, migrations or endpoints.
- It does not change the two-gate approval model, tenant isolation, or the calculation authority.

## 1. Shape Of The System

| Part | Exists today | Location |
|---|---|---|
| The invoice form and its setters | Yes | `src/pages/InvoiceFormPage.tsx` |
| The money rules | Yes | `src/domain/invoice/calculations.ts` through `computeDocument` |
| A chat surface pattern | Yes | `src/modules/item-library/components/ItemLibraryLocalAIJobPanel.tsx` |
| A provider client with failover | No | New |

The new part is small. The agent loop, the tool set, the provider client and the failover rules are about 400 lines. The bulk of the work is the user interface and the tests.

## 2. Module Layout

```ts
src/lib/ai-assistant/
  providerClient.ts      one OpenAI compatible client, many base URLs
  providerCatalog.ts     the chain, the base URLs, the model names
  failover.ts            classify a failure, advance the chain
  keys.ts                read and write provider keys in app private storage
  quota.ts               read the allowance from an error body
  tools.ts               the tool schemas, shared by all document types
  loop.ts                the agent loop: message in, tool calls out
src/components/ai-assistant/
  AssistantSheet.tsx     the chat sheet, generic over the tool list
  ChangeCard.tsx         one pending change, with accept and reject
  ProviderSettings.tsx   the keys, the chain order, the quota readout
src/domain/invoice/assistant/
  invoiceTools.ts        the invoice tool list and its validation

`srclib/ai-assistant/` must not import from `src/domain/invoice/`. The invoice tool list is the only invoice specific part. This is FR-17.
```

## 3. The Agent Loop

The loop runs on the app side. The model never owns the form.

```ts
user text
  -> loop.ts builds the request
       system prompt: role, rules, the tool list, the current form state
       messages: the conversation so far
  -> providerClient posts to the active provider
  -> the provider streams
       text tokens        -> chat sheet
       tool call tokens   -> collected
  -> if the model asked for tools:
       validate each tool call against the tool schema
       reject a call that names a field the app does not own
       apply nothing yet
       produce a pending change card per call
       send the tool result back to the model
       the model continues
  -> if the model asked to file:
       prepare the filing, show the confirmation view, wait for the user
```

The loop stops when the model stops asking for tools. The user sees the reply and the cards.

### 3.1 The System Prompt

The system prompt carries four blocks.

1. **Role.** The assistant helps an SME owner write an invoice by conversation.
2. **Rules.** The rules from the PRD, plus the rules the domain already holds: never invent a value, never set a computed field, never save, ask when a value is missing.
3. **Tools.** The JSON schema of the tool list.
4. **Form state.** A compact snapshot of the current invoice: client, dates, the rows, the charges, and the computed totals.

The form state must be compact. It is sent on every turn. A full invoice with many rows is large. Send only the fields the tools can change, plus the computed totals as read only values.

### 3.2 Prompt Size

The import prompt is long because the JSON contract is long. The assistant prompt is short because the tool list is short.

| Part | Approximate tokens |
|---|---|
| Role and rules | 250 |
| Tool schemas | 400 |
| Form state | 150 for a 3 row invoice |
| Total for turn 1 | 800 |

A 10 turn conversation costs 8000 tokens if the whole form state is resent on every turn. The loop must send only the new turns after the first, plus the current form state. A provider that charges nothing still charges quota, and quota is the scarce resource here.

## 4. The Tool Set

The tool set is small and fixed. Every tool maps to a setter that already exists on the invoice form.

| Tool | Arguments | Maps to |
|---|---|---|
| `set_client` | `name`, optional `client_id` | `updateInvoice('client_name')` and `updateInvoice('client_id')` |
| `set_document_field` | `field`, `value` | `updateInvoice` for `issue_date`, `due_date`, `po_number` |
| `add_line_item` | `description`, `quantity`, `unit_price`, optional `unit`, optional `sub_description` | `addItem` then `updateItem` |
| `update_line_item` | `row_index`, `description`, `quantity`, `unit_price`, optional `unit`, optional `sub_description` | `updateItem` |
| `remove_line_item` | `row_index` | `removeItem` |
| `add_extra_charge` | `label`, `value` | `setExtraCharges` |
| `set_title` | `value` | `setInvoiceTitle` |
| `set_notes` | `blocks` | the notes setter |
| `set_terms` | `blocks` | the terms setter |
| `file_invoice` | none | prepares the confirmation view |

### 4.1 The Row Index Problem

`update_line_item` and `remove_line_item` need a row index. A model that counts rows is unreliable.

The fix is a name instead of an index. The tool takes a description fragment and the app resolves it against the rows. The app returns the resolved row index in the tool result, or a clear failure when the fragment matches more than one row. The model then knows which row it changed.

This is the same lesson as the Item Library work: the model must not carry identifiers that the app owns.

### 4.2 The Notes And Terms Contract

The invoice form stores notes and terms as rich text blocks. The model must not invent that structure.

The tool takes plain text. The app converts the text into a single paragraph block. The user can edit the result in the form. A proposal card shows the plain text.

The rich text block array stays a human feature. The assistant writes plain text into it.

## 5. Money

The app computes. The model reads.

`computeDocument` in `src/lib/Calculations.ts` is the source of truth and is not modified. The assistant reads the computed totals and shows them.

The tool list has no money fields other than `unit_price`, `quantity` and the extra charge `value`. These are inputs to the calculation. They are not results.

A tool call that names `amount`, `subtotal`, `total`, `vat_rate`, `discount_rate`, `wht_rate` or `install_rate` is rejected before it reaches the form. The rejection is a tool result, not a crash. The model then tries another route.

### 5.1 Contradiction Detection

The app compares the user text with the form before the model sees it. This is a string and number check, not a model call.

| Check | Example | Action |
|---|---|---|
| Stated total against the computed total | `total 475000` against lines that sum to 47500 | Ask which value is right. |
| Stated price against the price in the row | `price is 95000 not 9500` | The correction is explicit, so apply it. |
| Stated quantity against the quantity in the row | `make it 10 not 5` | The correction is explicit, so apply it. |
| Currency ambiguity | `9500` against a form in dollars | Ask once. The answer is remembered for the session. |

A contradiction where the user states a replacement value is a correction. A contradiction where the user states a total is a question.

## 6. The Provider Client

One client, one interface, many base URLs. The interface is OpenAI chat completions with tool calling.

### 6.1 Two Modes

The app holds a provider table. Every row is a base URL, a key and a model name. A row can point at a provider or at a gateway.

| Mode | The row points at | The app owns |
|---|---|---|
| Gateway mode, the default for the trial | A local gateway that is one OpenAI compatible endpoint | The base URL, the key, the model name, the tool loop and the change cards |
| Direct mode | One provider, for example Cloudflare or OpenRouter | The same, plus the failover and the quota readout |

In gateway mode the app makes one call. The gateway picks the provider, fails over when one is exhausted, tracks the quota and refuses the providers that its own terms catalog marks as avoid. The app does not know that a chain exists.

Gateway mode removes from the app build the work of 150 provider signups, the per provider allowance math, the failover table and the terms triage.

### 6.2 The Gateway Choice

OmniRoute is the gateway for the trial. It is MIT, it is an npm package, and it is an OpenAI compatible endpoint at `http://localhost:20128/v1` by default.

| Property | Value |
|---|---|
| Base URL | `http://{host}:20128/v1` |
| Key | One bearer token, `Authorization: Bearer` |
| Bind address | `0.0.0.0` by default, so a phone on the same network reaches it |
| Deployment on the phone | Termux, `pkg install nodejs && npx -y omniroute`, no root |
| Deployment on a computer | npm, Docker or the Electron desktop app |
| Free providers | 150 or more, across 34 documented free tier pools |
| Routing | 20 strategies. The default sticks to the last provider that worked. |
| Provider readout | The `X-OmniRoute-Decision` header names the strategy, the provider and the latency that served the request |
| Cost and quota readout | The `X-OmniRoute-*` headers carry the cost and the usage of every response |
| Model discovery | `GET /v1/models` and `POST /v1/models/query` |
| Terms handling | Providers that its terms catalog marks as avoid are excluded from the automatic routing |

Two deployments serve the trial.

1. The gateway runs on the developer computer. The phone reaches it at `http://{computer-lan-ip}:20128/v1`. The computer must be on and on the same network.
2. The gateway runs on the phone in Termux. The app reaches it at `http://127.0.0.1:20128/v1`. Nothing leaves the phone network except the provider calls. Android may stop the Termux process, and the app must show that state.

### 6.3 The Provider Rows

| Provider | Base URL | Key header |
|---|---|---|
| OmniRoute gateway | `http://{host}:20128/v1` | `Authorization: Bearer` |
| Cloudflare Workers AI | `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1` | `Authorization: Bearer` |
| AMD Radeon Cloud Token Factory | `https://developer.amd.com.cn/radeon/api/v1` | `Authorization: Bearer` |
| Google AI Studio | `https://generativelanguage.googleapis.com/v1beta/openai` | `Authorization: Bearer` |
| OpenRouter | `https://openrouter.ai/api/v1` | `Authorization: Bearer` |
| Groq | `https://api.groq.com/openai/v1` | `Authorization: Bearer` |
| Cerebras | `https://api.cerebras.ai/v1` | `Authorization: Bearer` |
| NVIDIA NIM | `https://integrate.api.nvidia.com/v1` | `Authorization: Bearer` |

Every provider is OpenAI compatible. One request builder and one stream parser cover all of them. A provider that does not support tool calling is removed from the chain.

The whole OpenRouter free tier accepts the tool list, so the OpenRouter lane keeps every free model as a candidate and the filter does not reduce it. The chain narrows on the provider, not on the model. The tool support of a Cloudflare model must be checked on its model page before it enters the chain.

The Cloudflare base URL carries the account id. The key is the Cloudflare API token. The account id is not a secret and can sit in the provider row next to the base URL.

The request carries the tool list on every turn. Some providers cache the tool list between turns. The client keeps the tool list stable so that the cache holds.

### 6.4 The Readout Headers

The app reads the response headers when they are present. When they are absent, because the row points at a provider and not at a gateway, the app shows the row name instead.

| Header | Use |
|---|---|
| `X-OmniRoute-Decision` | The provider that answered, the strategy and the latency. This answers FR-10. |
| `X-OmniRoute-*` cost and usage headers | The cost and the usage of the turn. This answers FR-11. |

The app must never fail because a header is missing. The headers are a bonus, not a contract.

### 6.5 Cloudflare Workers AI Notes

| Behaviour | Consequence for the app |
|---|---|
| The endpoint accepts `options.rejectIfBusy` in the request body. | The client sets it. A busy model fails at once and the chain advances, instead of the request waiting in a capacity queue. |
| The allowance is measured in neurons, not in requests. | The readout converts neurons into turns with the published rate of the active model. |
| The strongest models need a paid billing method. | The chain uses the free models on the free plan. RISK-18. |
| The daily reset is 00:00 UTC, which is 01:00 in Lagos time. | The readout shows the reset time in the user timezone. |

### 6.6 AMD Token Factory Notes

The AMD endpoint is first party and the largest allowance in the chain. Four behaviours change the client.

| Behaviour | Consequence for the app |
|---|---|
| The endpoint is on the China site. | The reachability and the latency from the user's network must be tested before the trial. RISK-15. |
| The daily cap resets at 00:00 Beijing time, which is 17:00 in Lagos time. | The allowance readout must show the reset time in the user's own timezone. |
| A 429 carries a `Retry-After` header. | The failover must honour the header before it advances, and must not hammer the endpoint. |
| Every response carries the remaining allowance in its headers. | The quota readout reads the headers. It does not need a second call. |

The endpoint also rebuilds the request body. Parameters outside its accepted set are dropped without an error, and a `thinking` parameter returns a 400. The client therefore sends only the parameters it needs: `model`, `messages`, `tools`, `tool_choice`, `stream`, `max_tokens` and `reasoning_effort`.

The endpoint also serves the Anthropic Messages interface at the same base, including a `count_tokens` path. Phase 1 does not use it. One parser for one interface is cheaper than two parsers for two interfaces. The Anthropic path is the fallback if the OpenAI path of a provider proves broken.

### 6.7 The Preconfigured Catalog

`src/lib/ai-assistant/providerRegistry.ts` holds the catalog. Each entry is a name, a base URL, a key prefix, a default model and a declared model list. The runtime chain in `providerCatalog.ts` reads the same rows that it already uses, so the catalog does not change the request parser. These are the current declared floor. DEC-29 supersedes the fixed chain order as the selection mechanism; the catalog remains the substrate.

The settings panel reads the catalog. It adds no network dependency to the first paint:

- The declared model list fills the dropdown.
- A **Fetch models** action merges `{baseUrl}/models` into the declared list.
- A failed fetch keeps the declared models, because some endpoints have no model route.
- A custom endpoint is stored as `custom:<slug>` with a base URL, a key, model ids, optional headers and an optional context window.
- The active provider and model live in component state for the session. A catalog file holds no key.

The model pill and the settings panel read the same active pair, so the top bar cannot disagree with the panel.

The interface has four shells on the same state: a phone frame with bottom sheets, a fold-open split, a tablet rail plus drawer, and a desktop window with an artifact column. The document panel reads computed values from the invoice state, not from model text.

## 7. Failover

The failover table applies to direct mode, where the app calls the providers itself. In gateway mode the gateway owns the failover and the app holds one row.

| Failure | Action |
|---|---|
| 429, quota error, rate limit text | Advance to the next provider. Read the allowance from the error body or the response headers. Honour a `Retry-After` header before the next attempt on the same provider. |
| 500, 502, 503, 504, 529 | Advance to the next provider. |
| 401, 403 | Advance. The key is wrong. Mark the key in Settings. |
| 404, model not found | Advance. The model name is wrong for this provider. |
| 400, other 4xx | Stop. The request is wrong. Retrying it on another provider fails the same way. |
| Timeout or network error | Advance to the next provider, at most once. |

In gateway mode the app still needs one rule of its own. A gateway that cannot be reached is a network error, not a provider error. The app shows that the gateway is down and keeps the draft. It does not walk a chain that does not exist.

A provider that answered is remembered for the session. The next turn goes to the same provider. The chain is walked again only when that provider fails.

## 8. Key Storage

The project has `@capacitor/filesystem` and no secure storage plugin. The keys go in the app private file directory.

| Property | Value |
|---|---|
| Location | `Directory.Private` |
| Path | `ai-assistant/keys.json` |
| File mode | Owner read and write only |
| Format | JSON, one entry per provider id, the key masked for display |
| Read at | Start of a chat session |
| Written at | The moment the user saves a key |

The keys never reach a log, an error message, an analytics event or a crash report. The masking helper is the only place that formats a key.

A browser build has no app private directory. In the browser, the feature is off and the Settings screen says so. The browser build is not in the trial scope.

## 9. Settings

The Settings screen gets one section, next to the Local AI section.

| Control | Behaviour |
|---|---|
| Enable the assistant | Off by default. Controls the UI and the network calls. |
| Provider rows | Add, remove and test one row. A row is a base URL, a key and a model. A gateway row is one row. |
| The gateway row | The trial uses one gateway row. The base URL is the computer address or `127.0.0.1` for Termux. |
| Model picker | The model names come from the row. In gateway mode they come from the gateway model list endpoint. |
| Allowance readout | The last known allowance per row. In gateway mode the readout comes from the response headers. |
| Privacy disclosure | The full text. Shown before the first use and reachable later. |

## 10. What This Design Deliberately Does Not Do

- It does not send a document JSON blob to a model. The model sends tool calls.
- It does not let a model write a computed field.
- It does not let a model save.
- It does not keep assistant history in the tenant database during the trial.
- It does not modify `src/lib/Calculations.ts`.
- It does not modify a PDF renderer.
- It does not use a paid provider.
- It does not need the on-device model work in `docs/tickets/local-ai-model-swap-and-speedup.md`.

## 11. Bolu Application-Side Invoice Operations Architecture (Implemented 2026-11-14)

### 11.1 Architectural Overview

The application-side conversational business operations pipeline is implemented for the reference Invoice document family without external inference dependencies. The architecture decouples model communication from application state, calculations, tenant authorization, and persistence.

```
User Conversation
      │
      ▼
BoluAssistantProvider (Context & Dispatch)
      │
      ├──> bolu-mock-provider.ts (Deterministic Fixtures)
      │       or Future Live Provider (DEC-29)
      │
      ▼
bolu-reducer.ts (Pure Multi-Turn State Machine)
      │
      ▼
AssistantSheet.tsx (Two-Gate UI Lifecycle)
      │
      ├── Gate 1: Change Proposal Card [Review -> Explicit Apply]
      │
      ├── Working Document State (calculateDocument lock)
      │
      └── Gate 2: Save Confirmation Card [Review Draft -> Explicit Save]
              │
              ▼
      bolu-document-service.ts (Authoritative Persistence)
              │
              ├── Tenant Isolation & RBAC (canWrite / canRead / RLS)
              ├── Numbering Retry (withUniqueRetry + generateDocumentNumber)
              ├── Postgres RPC Transaction (save_invoice_with_items_transaction)
              └── Sequential Fallback with Header Cleanup Rollback
```

### 11.2 Core Architectural Modules

1. **Operation Contract (`src/lib/ai-assistant/bolu-operations.ts`):**
   - Defines strictly typed contracts for `create-document` (type: `'invoice'`), `modify-document`, and `read-records`.
   - Validates that parameters conform to business constraints (e.g. non-empty line items, positive unit prices, valid customer references) before reaching state.
2. **Pure State Reducer (`src/lib/ai-assistant/bolu-reducer.ts`):**
   - Decoupled from React renders. Manages multi-turn states: `idle`, `thinking`, `proposal_ready`, `applied`, `pending_confirmation`, `persisting`, `persisted`, `error`.
   - Keeps file sizes within project bloat limits (<350 lines). Prompt generation utilities are extracted into `src/lib/ai-assistant/bolu-formatting.ts`.
3. **Two-Gate UI Controls (`src/components/ai-assistant/AssistantSheet.tsx`):**
   - **Gate 1 (Proposal Approval):** Displays proposed changes in structured cards showing previous values and new values. The user must click "Apply Changes" before the working invoice state changes.
   - **Gate 2 (Save Confirmation):** Once the document is in draft state, persistence requires an explicit user confirmation. "File it" generates a preview confirmation card rather than an immediate save.
4. **Authoritative Persistence Integration (`src/lib/ai-assistant/bolu-document-service.ts`):**
   - **Postgres RPC Reuse:** Integrates directly with `save_invoice_with_items_transaction` when `entityId` is present to ensure all-or-nothing atomicity for invoice headers and line items.
   - **Compensating Rollback:** When falling back to sequential writes, if line-item persistence fails, the parent invoice header is deleted immediately to prevent orphaned database records.
   - **Sequence Number Collision Protection:** Wraps `generateDocumentNumber` inside `withUniqueRetry` from `@/lib/withUniqueRetry` to gracefully handle concurrent numbering race conditions.
   - **Financial Math Locking:** Strict binding to application-owned `calculateDocument` in `src/lib/Calculations.ts`. Model-supplied calculated values are ignored.
   - **Multi-Tenant Boundary:** Verification of tenant context and RBAC permissions (`canWrite`, `canRead`) on every read and write, backed by Supabase RLS.
5. **Deterministic Mock Provider (`src/lib/ai-assistant/bolu-mock-provider.ts`):**
   - Supplies deterministic fixtures across 12 operational scenarios for automated testing and CI verification without requiring API keys or external model network connectivity.

---

## 12. Bolu Live Provider Integration Architecture (Implemented 2026-11-14)

### 12.1 End-to-End Live Inference Topology

```
User Input in AssistantSheet.tsx
      │
      ▼
bolu-runtime.ts (Client Runtime Engine)
      │
      ├── matchBoluIntent() -> Read operations handled client-side via bolu-data.ts
      │
      └── POST /api/bolu-chat (Serverless Route Handler)
            │
            ├── Environment Inspection (BOLU_PROVIDER_* vars)
            │     ├── BOLU_PROVIDER_MODE === 'mock' ──> Server-side mock SSE stream
            │     └── BOLU_PROVIDER_MODE === 'live' ──> Normalized OpenAI-compatible fetch
            │
            ├── Upstream Inference Provider (e.g. OpenRouter / DeepSeek / AMD)
            │     ├── System prompt locks calculation & mandates JSON bolu_operation envelope
            │     └── Provider streams text/event-stream or buffers application/json
            │
            ├── SSE Transformer: Converts provider chunks to uniform SSE tokens
            │     └── Error Classifier (401/403 -> 502, 429 -> 429, timeout -> 504)
            │
            ▼
bolu-runtime.ts: Streaming Token Accumulator & JSON Parser
      │
      ├── Operation Schema Validator (bolu-operations.ts)
      │     ├── Catch malformed syntax -> Report error, no proposal
      │     ├── Check document family === 'invoice' -> Reject unsupported families
      │     └── Check opType in ('create-document', 'modify-document') -> Reject unsupported ops
      │
      ▼
AssistantSheet.tsx (Two-Gate Execution)
      │
      ├── Gate 1: Change Proposal Card [User Reviews & Approves]
      │     └── Working Document State (calculateDocument locks all math)
      │
      └── Gate 2: Save Confirmation Card [User Confirms Persistence]
            │
            ▼
      bolu-document-service.ts (Atomic RPC Persistence)
            ├── Null/invalid proposal fail-closed guards
            ├── withUniqueRetry sequence number retry
            └── save_invoice_with_items_transaction RPC
```

### 12.2 Architectural Security & Integrity Invariants

1. **Server-Side Credential Isolation:**
   - External provider API keys (`BOLU_PROVIDER_API_KEY`, `BOLU_AMD_API_KEY`) reside exclusively in serverless route environment variables (`process.env`). They are never bundled into client assets or leaked in response headers.
2. **Idempotent Endpoint Construction:**
   - `normalizeChatEndpoint()` ensures base URLs (such as `https://openrouter.ai/api/v1`) receive `/chat/completions` cleanly without path concatenation bugs.
3. **Stream Protocol Normalization:**
   - Providers returning non-streaming `application/json` (e.g. during small outputs or error fallbacks) are transparently wrapped into SSE message chunks, guaranteeing that the browser SSE reader never crashes.
4. **Authoritative Financial Calculation Boundary:**
   - The model is treated as an untrusted intent parser. Any financial totals emitted by the model are discarded. All totals, taxes, and discounts are calculated strictly by `calculateDocument` in `src/lib/Calculations.ts`.
5. **Fail-Closed Guardrails:**
   - Unsupported operations (`delete-document`, `pay-invoice`) and unsupported document families (`quotation`, `purchase-order`, etc.) are caught and rejected before state updates can occur.
   - Persistence services verify proposal presence and integrity before issuing database queries.

---

## 13. In-App Provider Configuration & Secure Secret Management Architecture (2026-11-14)

### 13.1 Architecture Overview

```
Administrator UI (BoluProviderSettingsSection.tsx)
      │  (admin-only in Settings; masked key display: rc-••••••••••••7766)
      │
      ├── GET /api/bolu-provider-config (Status Check)
      │     └── Checks profiles.role === 'admin' or workspace_members.role in ('owner', 'admin')
      │     └── Returns sanitized status (never returns ciphertext or plaintext keys)
      │
      └── POST /api/bolu-provider-config (Save / Test / Remove)
            │
            ├── Action: 'test' ──> Pre-flight test to AMD endpoint (/chat/completions)
            │
            ├── Action: 'save' ──> bolu-secret-vault.ts (AES-256-GCM Envelope Encryption)
            │                        │
            │                        ├── Master key derived from server env (outside database)
            │                        ├── Generates 12-byte random nonce and 16-byte GCM tag
            │                        └── Writes to public.app_ai_provider_config (via Service Role)
            │
            └── Action: 'remove' ──> Deletes in-app credential row (via Service Role)

Database Storage (public.app_ai_provider_config)
      │
      └── Row-Level Security (RLS): Policy strictly denies all client access (USING false)
            └── Direct PostgREST queries from browser clients return HTTP 403 / empty sets

Runtime Inference Resolution (api/bolu-chat.ts)
      │
      ├── 1. Check in-app database config via Service Role client (loadInAppProviderConfig)
      │     └── If active row exists: decrypt key in serverless memory using master key
      │
      ├── 2. If absent, fallback to process.env (BOLU_PROVIDER_* / BOLU_AMD_API_KEY)
      │
      └── 3. If unconfigured, fallback to deterministic mock mode
```

### 13.2 Security & Integrity Guarantees

1. **Envelope Encryption at Rest:**
   - Credentials are encrypted using AES-256-GCM.
   - Master key is derived using SHA-256/HMAC from server environment secrets (`BOLU_ENCRYPTION_KEY` or `SUPABASE_SERVICE_ROLE_KEY`), completely segregated from the database.
2. **Zero Client PostgREST Exposure:**
   - RLS policy `Deny public client access to app_ai_provider_config` blocks all browser and anon/authenticated queries at the database layer.
   - Decryption takes place exclusively in serverless memory.
3. **Fail-Closed Tamper Detection:**
   - AES-256-GCM authentication tags guarantee that any modification of stored ciphertext, nonce, or tag results in immediate decryption failure and fail-closed termination.
4. **Administrative Role Verification:**
   - All management endpoints require verified administrative credentials (`profiles.role === 'admin'` or `workspace_members.role in ('owner', 'admin')`). Non-admin users are rejected with HTTP 403.
