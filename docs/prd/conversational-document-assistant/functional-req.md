# Functional Requirements

- **Status:** Core product direction approved; detailed requirements remain under review
- **Product:** Bolu Conversational Business Operations Assistant
- **Writing Standard:** ASD-STE100 Simplified Technical English

## Authority and requirement disposition — 2026-11-13

The product owner approves Bolu as a conversational business operations assistant with read and write capabilities. Read-only Business Intelligence is one capability, not the complete product. The user must approve each proposed change before it is applied and must separately confirm before a document is saved or filed.

This direction does not approve every detailed requirement below. The existing FR-01–FR-22 remain preserved as proposed requirements pending reconciliation. The following disposition applies:

| Requirement | Disposition | Note |
|---|---|---|
| FR-01 | REFINED — proposed | Shared assistant access must work from approved surfaces. Exact invoice-form layout and 360 px visibility need UX decision. |
| FR-02 | PROPOSED | Streaming is a candidate behavior. Provider support and response-time target need evidence. |
| FR-03 | REFINED — proposed | Use application-owned capabilities for reads and writes. The model may propose structured changes; it does not directly write application state. |
| FR-04 | APPROVED PRINCIPLE; details proposed | User approval is required before each proposed change is applied. Card layout and exact interaction need acceptance design. |
| FR-05 | APPROVED PRINCIPLE; details proposed | Existing calculation engines and system-owned values remain authoritative. The exact writable input set is document-specific. |
| FR-06 | PROPOSED | Contradiction handling is useful, but supported fields and clarification behavior need definition. |
| FR-07 | PROPOSED | Title, notes, and terms proposals need business-approved defaults and document-specific scope. |
| FR-08 | APPROVED PRINCIPLE; details proposed | Bolu must not invent missing required values. Existing validators remain authoritative. The required-question flow needs document-specific definition. |
| FR-09 | REFINED — approved principle | Explicit confirmation is required before persistence. The phrase “file it” must prepare, not save. Exact preview and save-path behavior needs design. |
| FR-10 | PROPOSED | Provider chain, order, retry policy, and model/tool support remain unapproved and unverified. |
| FR-11 | PROPOSED | Dynamic quota display requires provider evidence and operational design. |
| FR-12 | UNRESOLVED | Credential custody, storage, browser support, and provider account ownership require a security/product decision. |
| FR-13 | UNRESOLVED | External-provider disclosure, consent, default state, and feature availability require approval. |
| FR-14 | APPROVED PRINCIPLE; details proposed | Manual workflows must remain usable when Bolu is unavailable. Acceptance coverage needs implementation-specific tests. |
| FR-15 | UNRESOLVED | Trial toggle and rollout audience are not approved by the product direction. |
| FR-16 | REFINED — approved principles | Calculation authority, authorization, tenant isolation, approval-before-apply, confirmation-before-save, and no unapproved money movement are approved. Per-trial storage rule remains unresolved. |
| FR-17 | APPROVED PRINCIPLE; details proposed | One shared assistant architecture must support multiple capabilities. Whether all document families ship together is unresolved. |
| FR-18 | PROPOSED | The 14-provider catalog is not approved for the first release. |
| FR-19 | PROPOSED | Live model discovery is not approved for the first release. |
| FR-20 | PROPOSED | Model switching UI is not approved for the first release. |
| FR-21 | PROPOSED | Custom providers are not approved for the first release. |
| FR-22 | PROPOSED | Four viewport layouts remain a design proposal; production responsive acceptance must be approved. |

The PRD owner must approve detailed requirements before implementation. “Approved principle” does not approve a specific provider, layout, document pack, trial, or acceptance value.

---

## FR-01 - Conversation Surface On The Invoice Form

The invoice form must expose an assistant entry point. The entry point opens a chat sheet. The chat sheet must not cover the form on a phone. The form must stay visible and must show every change as it happens.

**Acceptance criteria**

- A new invoice shows one assistant control.
- The control opens a chat sheet.
- On a 360 pixel wide phone the user can see the sheet and the top of the form at the same time.
- The control is hidden when the feature toggle is off.

## FR-02 - Streaming Replies

The assistant must answer as text. The answer must stream. The form must update while the answer streams.

**Acceptance criteria**

- The first text of a reply appears in under 2 seconds on a mid range phone.
- A form change appears before the reply finishes.
- A network error never leaves the composer in a loading state.

## FR-03 - Tool Calls Only

The assistant must update the form only through tool calls. The model must not return a document JSON blob. The app must reject any model output that is not a valid tool call.

**Acceptance criteria**

- The model receives a fixed tool list. The list is not built from tenant data.
- A model reply that contains free JSON is rejected and shown as an error.
- No code path copies model text into the invoice fields.

## FR-04 - Pending Change Cards

Every tool call must produce a change card in the chat. A card names the change and offers accept and reject. A rejected card must not change the form. An accepted card must apply the change once.

**Acceptance criteria**

- A card shows the field, the old value and the new value.
- A money value is the most visible element of its card.
- A rejected card is marked and is not applied.
- An accepted card cannot be applied twice.

## FR-05 - The App Computes All Money

The model must never send a computed value. Amount, subtotal, discount, VAT, withholding tax and total are computed by `computeDocument`. The assistant reads those computed values to talk about them. It must never write them.

**Acceptance criteria**

- The tool list contains no field that a calculation writes.
- A tool call that names a computed field is rejected before it reaches the form.
- A quantity of 5 and a unit price of 95000 show an amount of 475000.
- The assistant states the computed amount, never a computed amount of its own.

## FR-06 - Contradiction Detection

The app must detect a contradiction between the user text and the current form. The app must ask which value is right. The app must not guess.

**Acceptance criteria**

- A stated total that differs from the computed total raises a question.
- A stated price that differs from the price in the row raises a question.
- The assistant asks one question at a time.

## FR-07 - Title, Notes And Terms Proposals

The assistant must propose a title, a note set and a term set. Each proposal is a card. The user accepts or rejects it. The assistant must not write them without a card.

**Acceptance criteria**

- A title proposal appears before the invoice is filed.
- A notes proposal uses the note set from the business decision list.
- A terms proposal uses the term set from the business decision list.
- The proposed notes use the rich text block contract that the invoice form already accepts.

## FR-08 - Missing Field Interrogation

The assistant must ask for the fields that a valid invoice needs and that the conversation did not supply. The list of required fields comes from the invoice rules. The assistant must not invent a value for a missing field.

**Acceptance criteria**

- The client is asked for when it was not named.
- The due date is asked for when no term implies one.
- The assistant never invents a client name.

## FR-09 - Explicit Filing

The assistant must not file the invoice. Filing needs an explicit instruction and a confirmation view. The filing must use the normal save path of the invoice form.

**Acceptance criteria**

- The word `file it` prepares a filing. It does not save.
- A confirmation view shows the invoice before the save.
- The save path is the same path the save button uses.
- A save failure is reported in the chat and the draft is kept.

## FR-10 - Provider Chain And Failover

The assistant must hold an ordered chain of providers. A provider that returns a quota error, a rate limit error or a server error must advance the chain. A provider that returns a bad request error must not advance the chain, because the same request would fail on the next provider.

**Acceptance criteria**

- A 429 moves to the next provider within 2 seconds.
- A 429 with a `Retry-After` header waits for that period before the next attempt on the same provider.
- A 500 moves to the next provider.
- A 400 does not move to the next provider and does not repeat the request.
- The user sees which provider answered.
- When every provider fails, the assistant says so and the draft is kept.
- The AMD provider is reachable from the user network. A device test from Nigeria answers in under 5 seconds.
- The request holds only the accepted parameters. It holds no `stop`, no `seed`, no `logit_bias`, no `logprobs`, no `top_k`, no `min_p`, no `repetition_penalty` and no `thinking`.

## FR-11 - Quota Readout

The assistant must show the remaining allowance of the active provider. The app must read the allowance from the provider, not from a stored table, because the providers do not publish stable numbers.

**Acceptance criteria**

- The Settings screen shows the last known allowance per provider.
- A 429 updates the allowance of that provider from the error body.
- The OpenRouter allowance comes from the key information endpoint.
- The AMD allowance comes from the response headers, and the readout shows the reset time in the user timezone.
- The Gemini allowance comes from the quota value in the error body.

## FR-12 - Provider Key Management

The user must be able to add, remove and test a provider key in Settings. A key is stored in app private storage. A key is never written to a log, an error message, an analytics event or a crash report.

**Acceptance criteria**

- A key is stored in the app private file directory with file mode owner only.
- A browser build keeps the key in memory for the session and writes no `localStorage` entry.
- The Settings screen shows only the last four characters of a key.
- A key never appears in a log line.
- Removing a key removes it from storage and from the chain.
- A key prefix check names the prefix and never repeats the key.

## FR-13 - Privacy Disclosure And Consent

The feature is off by default. The first use shows a disclosure that names the provider and states that the content leaves the device. The user must accept it.

**Acceptance criteria**

- The feature is off after install.
- The disclosure appears before the first request and names the provider.
- The disclosure states that the provider may use the content to improve its product.
- The user can turn the feature off at any time and no request follows.

## FR-14 - Degradation

The assistant must never block invoice creation. If no provider works, if the toggle is off, or if the network is down, the normal invoice form must work unchanged.

**Acceptance criteria**

- A new invoice can be created and saved with the assistant off.
- A provider outage does not disable the form.
- The draft survives a chat failure.

## FR-15 - Trial Toggle

A Settings toggle controls the feature. The toggle is off by default. The toggle controls the UI and the network calls.

**Acceptance criteria**

- The toggle is in Settings, in the same section as the Local AI settings.
- The toggle is off after install.
- The toggle takes effect without a restart.

## FR-16 - Guardrails

The following rules must hold in code.

| # | Rule |
|---|---|
| G1 | `src/lib/Calculations.ts` is not modified. |
| G2 | No PDF renderer is modified. |
| G3 | The model writes only through the tool list. |
| G4 | The model never writes a computed field. |
| G5 | The model never saves. |
| G6 | The model never invents a value for a missing field. |
| G7 | Every accepted change is visible to the user before the save. |
| G8 | No assistant data is written to the tenant database during the trial. |

## FR-17 - Shared Design

The design must not block the same assistant on other document types. The tool set, the provider client and the failover rules must sit outside the invoice module.

**Acceptance criteria**

- The chat sheet, the provider client and the failover rules do not import from the invoice module.
- A second document type can mount the same chat sheet with a different tool list.

## FR-18 - Preconfigured Provider And Model Catalog

The app must ship a provider catalog. A tier 1 provider needs one key. The user must not type a base URL or a model name for a tier 1 provider.

**Acceptance criteria**

- The catalog holds these providers: OpenRouter, Anthropic, OpenAI, Google Gemini, Groq, DeepSeek, Mistral, Together AI, Fireworks AI, Cerebras, xAI Grok, Cohere, NVIDIA NIM and AMD Token Factory.
- Each row holds a base URL, a key prefix rule, a default model and a declared model list.
- A pasted key is the only required action for a tier 1 provider.
- The default model is selected before the user opens the model dropdown.
- A provider card shows one badge: `Active`, `Configured` or `Needs key`.
- The first configured provider becomes active when no other provider holds a key.

## FR-19 - Model Discovery

The app must show declared models at once. The app must refresh the list from the provider when the user asks.

**Acceptance criteria**

- The model dropdown opens with the declared models and no network wait.
- The **Fetch models** action calls `{baseUrl}/models` with the active key.
- A live id that duplicates a declared id appears once.
- A failed refresh keeps every declared model in the dropdown.
- A provider shows at most 200 models. The current model is always in the list.
- A custom provider keeps its declared model ids after a failed discovery.

## FR-20 - Model Pill Selector

The chat top bar must show the active provider and model. The user must switch the model from that control.

**Acceptance criteria**

- The top bar shows the provider name and the model id at every viewport.
- The pill opens a list grouped by provider.
- A model choice changes the next request and no earlier message.
- A provider with no key opens the settings panel instead of a model list.
- The pill and the settings panel show the same active provider.

## FR-21 - Custom Provider For An Unlisted Model

The app must accept an OpenAI compatible endpoint that is not in the catalog.

**Acceptance criteria**

- The form holds a display name, a base URL, an API key, one or more model ids, optional extra headers and an optional context window.
- The base URL must start with `https://` and end with `/v1`.
- At least one model id is required. The first id becomes the default.
- Extra headers must be a JSON object with string values.
- A valid save adds the provider, makes it active and closes the form.
- A custom provider uses the same client and the same cards as a catalog provider.
- A removed custom provider loses its key with the row.

## FR-22 - Four Viewport Layouts (Proposed)

This is a design proposal, not an approved release requirement. Keep its text for review.

The assistant must render in four layouts that share one state model.

**Acceptance criteria**

- Fold closed at 360 to 390 pixels shows one column and a bottom sheet for context and settings.
- Fold open at 720 to 840 pixels shows the chat and the live invoice together.
- Tablet shows a collapsible thread rail, the chat and a context drawer.
- Desktop shows a workspace rail, a centered chat canvas and an artifact column.
- The model pill, the settings control and the context control are present in every layout.
- The stream sticks to the bottom. A **Latest** control appears after the user scrolls up.
- The composer is one rounded card with action pills and one send or stop control.
- Enter sends, Shift and Enter adds a line, and an input method editor composition does not send.
- The money rule does not change with the layout. An accepted card applies once. A rejected card changes nothing.

---

## FR-23 - Read Authorized Business Records (Approved Capability Principle)

Bolu must answer supported questions about existing business records. The application must retrieve facts through the existing tenant-aware repositories and permission checks. A record id is a reference, not authorization. The model must not select a tenant, entity, schema, or permission scope.

**Acceptance criteria**

- A read request checks the caller’s current permission before data retrieval.
- The application returns only the minimum fields needed for the request.
- Invoice status and settlement values come from authoritative application or database sources.
- Quotation and other document status values use the document’s existing status authority.
- The response distinguishes retrieved facts, missing information, ambiguity, and unsupported requests.
- Financial values are not calculated by model output or prompt logic.
- The initial document families and query coverage remain a product decision.

## FR-24 - Create Documents Through A Controlled Conversation (Approved Capability Principle)

Bolu must support conversational creation of approved business documents. The application must map model intent to a document-specific capability. The model may propose inputs. Existing application validation and business rules remain authoritative.

**Acceptance criteria**

- Every created document starts as an unsaved draft.
- The application validates all proposed values before it applies them.
- Missing required values trigger a question. Bolu does not invent them.
- The application computes system-owned values through the existing calculation engine.
- No proposal persists until the separate save confirmation in FR-26.
- The first document family and creation fields remain unresolved until product approval.

## FR-25 - Modify Existing Documents Through A Controlled Conversation (Approved Capability Principle)

Bolu must support proposed changes to an existing document where the user has permission. The application must resolve and re-read the record through its authorized document path before preparing a change.

**Acceptance criteria**

- The interface identifies the document and its persisted or draft state.
- Each proposed change shows the target field, current value, and proposed value when the field supports comparison.
- The application rejects fields that are system-owned, calculated, immutable, or outside the approved capability.
- The user can approve or reject each change. Rejection leaves the document unchanged.
- The application revalidates the record and permission at apply time.
- Modification does not imply save or filing. FR-26 controls persistence.
- The initial modification fields and document families remain unresolved until product approval.

## FR-26 - Separate Change Approval From Persistence Confirmation (Approved Principle)

Bolu must use two distinct approval gates. First, the user approves a proposed change before the application applies it to the draft or in-memory form. Second, the user confirms before the application saves or files the document. One approval must not satisfy both gates.

**Acceptance criteria**

- An unapproved proposal cannot change the form or persisted record.
- A rejected proposal produces no application-state change.
- Accepting a proposal applies only the reviewed change and applies it once.
- Saving requires a separate confirmation view that identifies the document and relevant changes.
- The confirmation action uses the existing document save path, validation, numbering, and audit behavior.
- A failed save preserves the draft and reports the failure. Retrying cannot create a duplicate document.

## FR-27 - Preserve Authorization, Tenant Isolation, And Business Rules (Approved Principle)

Every Bolu read and write must use the current tenant, existing authorization rules, and existing business services. Bolu must not bypass row-level security or domain validation.

**Acceptance criteria**

- The model cannot supply or change tenant, entity, schema, or permission scope.
- The application checks authorization for every requested record and operation.
- The application validates again before applying a change and before persistence.
- Read or write denial returns a clear message and makes no unauthorized change.
- Tests cover another tenant, missing permission, stale record state, and changed permission where the existing test architecture permits.

## FR-28 - Handle Interrupted And Partially Failed Operations (Proposed)

The runtime must distinguish retrieval, proposal, apply, and persistence states. It must handle provider failure, cancellation, duplicate submission, stale context, and partial failure without claiming success.

**Acceptance criteria**

- Cancellation stops pending assistant work where possible and does not apply an unapproved proposal.
- Duplicate submissions and retries do not apply or persist the same operation twice.
- A provider failure after retrieval preserves and labels the verified facts. A failure before retrieval does not invent facts.
- A stale record is re-read and revalidated before apply or save.
- A partial failure reports which stage failed and preserves recoverable draft state.
- Exact retry and idempotency policy remains an architecture decision.
