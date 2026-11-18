# Functional Requirements

- **Status:** Core product direction approved; detailed requirements remain under review
- **Product:** Bolu Conversational Business Operations Assistant
- **Writing Standard:** ASD-STE100 Simplified Technical English

## Authority and requirement disposition — Reconciled 2026-11-14

DEC-28 approves Bolu as a conversational business operations assistant with read and write capabilities. Read-only Business Intelligence is one capability, not the complete product. Users must approve each proposed change before it is applied and separately confirm before a document is saved or filed.

On 2026-11-14, DEC-30 records the completed application-side implementation and verification (against a deterministic mock boundary with 49 passing tests) for the reference Invoice document family. Live provider connectivity and other document families remain deferred.

The following disposition applies:

| Requirement | Disposition | Note |
|---|---|---|
| FR-01 | RETAINED — proposed | Shared assistant access works from dashboard and bottom sheet. Mobile responsive visibility verified. |
| FR-02 | IMPLEMENTED & TESTED (Live Adapter) | Streaming SSE tokens and buffered JSON normalized in `api/bolu-chat.ts` and `bolu-runtime.ts`. Verified with automated integration tests. |
| FR-03 | IMPLEMENTED & TESTED (Live & Mock) | Implemented in `bolu-operations.ts` (`create-document`, `modify-document`). Live model returns structured JSON; app validates and executes. |
| FR-04 | IMPLEMENTED & TESTED (Live & Mock) | Two-gate lifecycle implemented in `AssistantSheet.tsx` and `bolu-reducer.ts`. Gate 1: User explicitly approves proposal card before apply. |
| FR-05 | IMPLEMENTED & TESTED (Live & Mock) | Existing calculation engine (`Calculations.ts` / `calculateDocument`) strictly authoritative. Model math stripped. |
| FR-06 | IMPLEMENTED (Mock & Live Prompts) | Contradiction detection handled in prompt rules; model asks for clarification instead of guessing. |
| FR-07 | PROPOSED — needs definition | Title, notes, and terms proposals need business-approved defaults and document-specific scope. |
| FR-08 | IMPLEMENTED & TESTED (Live & Mock) | Required field validation implemented. Missing customer or line items trigger explicit questions, never hallucinated values. |
| FR-09 | IMPLEMENTED & TESTED (Live & Mock) | Gate 2 explicit confirmation required before persistence. "File it" prepares save preview; persistence executes via `bolu-document-service.ts`. |
| FR-10 | IMPLEMENTED (Configurable Adapter) | Configurable OpenAI-compatible provider adapter (`api/bolu-chat.ts`, `bolu-provider.ts`) with timeout and error classification implemented. |
| FR-11 | PROPOSED — needs design | Dynamic quota display requires provider evidence and operational design. |
| FR-12 | IMPLEMENTED (Server-Only Architecture) | Credential custody strictly server-side (`process.env`). Zero exposure to browser code. |
| FR-13 | UNRESOLVED — product decision | External-provider disclosure, consent, default state, and feature availability require approval. |
| FR-14 | IMPLEMENTED & TESTED (Live & Mock) | Manual workflows remain completely authoritative and usable when Bolu is off, broken, or rejected. |
| FR-15 | UNRESOLVED — product decision | Trial toggle and rollout audience are not approved by the product direction. |
| FR-16 | IMPLEMENTED & TESTED (Live & Mock) | Calculation authority, authorization, tenant isolation, two-gate controls, idempotency, and persistence atomicity implemented & verified. |
| FR-17 | PARTIAL — invoice reference | Shared assistant architecture implemented for invoices. Remaining seven document families deferred. |
| FR-18 | PROPOSED — first release scope | The 14-provider catalog is not approved for the first release. |
| FR-19 | PROPOSED — first release scope | Live model discovery is not approved for the first release. |
| FR-20 | PROPOSED — first release scope | Model switching UI is not approved for the first release. |
| FR-21 | PROPOSED — first release scope | Custom providers are not approved for the first release. |
| FR-22 | PROPOSED — design review | Four viewport layouts remain a design proposal; production responsive acceptance must be approved. |
| FR-29 | PROPOSED — 2026-11-14 | One application-owned AI engine with interchangeable provider/model pool. Automatic selection and failover. Not approved for first release. |
| FR-30 | PROPOSED — 2026-11-14 | Dynamic model inventory: add, deprioritise or retire models as availability, cost, reliability or terms change. Not approved for first release. |
| FR-31 | PROPOSED — 2026-11-14 | Free-first eligibility ranking; paid inference denied by default. Not approved for first release. |
| FR-32 | PROPOSED — 2026-11-14 | Capability-aware selection; unknown capabilities are not treated as confirmed. Not approved for first release. |
| FR-33 | PROPOSED — 2026-11-14 | Bounded failover that preserves conversation context; no endless retries. Not approved for first release. |
| FR-34 | PROPOSED — 2026-11-14 | Universal document-intelligence pipeline (source intake → faithful observation → normalization → reconciliation → calculation → review → approved action). Not approved for first release. |
| FR-35 | PROPOSED — 2026-11-14 | Canonical objects (SourceDocument, ExtractedObservation, NormalizedItem, MatchCandidate, Calculation, ReviewDecision) and evidence classification (extracted, calculated, inferred, matched, unverified, conflicting). Not approved for first release. |
| FR-36 | PROPOSED — 2026-11-14 | Workflow status lifecycle (not_found → information_found → possible_match → awaiting_confirmation → confirmed → priced_verified); AI never self-promotes to confirmed. Not approved for first release. |
| FR-37 | PROPOSED — 2026-11-14 | Source traceability and preservation; conflicting observations retained; no silent overwrite. Not approved for first release. |
| FR-38 | PROPOSED — 2026-11-14 | Matching considers description, specification, unit, quantity and identifiers; serial number alone never confirms; family-specific extensible rules. Not approved for first release. |
| FR-39 | APPROVED PRINCIPLE — 2026-11-14; details proposed | Application owns arithmetic; inputs, formula, result and currency/unit basis recorded; no verified extension under unit ambiguity; provisional vs verified amounts distinct. |
| FR-40 | PROPOSED — 2026-11-14 | Attachment intake, application-owned; external AI to structured Markdown is interchange only; no provider dependence; no invented values; formats, limits, retention, providers and privacy unresolved. Not approved for first release. |
| FR-41 | PROPOSED — 2026-11-14 | Document-family extensions; solar-pump BOQ is the first acceptance case; no first-release family declared. Not approved for first release. |
| FR-42 | IMPLEMENTED & TESTED — 2026-11-14 | In-App Administrator Secret Management & Protected Storage in Settings. |
| FR-43 | IMPLEMENTED & VERIFIED — 2026-11-16 | Assistant Identity — Bolu Only. Standalone B icon, BOURXE badge, and decorative subtitles removed from header. |
| FR-44 | IMPLEMENTED & VERIFIED — 2026-11-16 | Unified Bolu Identity & Active Model Picker in Single Compact Header Row (Left: Bolu, Right: Model Picker). |
| FR-45 | IMPLEMENTED & VERIFIED — 2026-11-16 | Direct AI Infrastructure Navigation from Bolu Assistant More menu to `/settings?section=bolu-provider`. |
| FR-46 | IMPLEMENTED & VERIFIED — 2026-11-16 | AI Infrastructure Mobile Responsiveness & Overflow Correction across connection cards and models manager. |
| FR-47 | IMPLEMENTED & VERIFIED — 2026-11-16 | Unified assistant message rendering and complete-response copy action. |
| FR-48 | IMPLEMENTED & VERIFIED — 2026-11-16 | Isolated fenced code blocks with independent copy actions. |
| FR-49 | IMPLEMENTED & VERIFIED — 2026-11-16 | Safe Markdown content handling: no HTML path, safe link schemes, inert code. |
| FR-50 | IMPLEMENTED & VERIFIED — 2026-11-16 | Structured artifact and attachment presentation on existing typed payloads. |
| FR-51 | IMPLEMENTED & VERIFIED — 2026-11-16 | User message editing and copying, with in-place update of the original request. |
| FR-52 | IMPLEMENTED & VERIFIED — 2026-11-16 | Assistant response regeneration and copying; all message actions are icon-only. |
| FR-53 | IMPLEMENTED & VERIFIED — 2026-11-16 | Conversation branch integrity: dependent turns are superseded, never silently reused. |
| FR-54 | IMPLEMENTED & AUTOMATED-VERIFIED — 2026-11-16 | Two restrained pulses only: response start and optional completion. No interaction haptics. Android device behaviour not verified. |
| FR-55 | IMPLEMENTED & AUTOMATED-VERIFIED — 2026-11-16 | Device narration with a native Android engine and a browser fallback. Android device behaviour not verified. |
| FR-62 | IMPLEMENTED & AUTOMATED-VERIFIED — 2026-11-18 | Write intents retrieve relevant business records before proposal construction. Live provider behaviour not verified. |
| FR-63 | IMPLEMENTED & AUTOMATED-VERIFIED — 2026-11-18 | Client discovery and conservative resolution with a preview-card picker. Hosted-database behaviour not verified. |
| FR-64 | IMPLEMENTED & AUTOMATED-VERIFIED — 2026-11-18 | Reusable contextual clarification for pending operations. Four-viewport visual behaviour not verified. |
| FR-65 | IMPLEMENTED & AUTOMATED-VERIFIED — 2026-11-18 | Invoice and quotation schema parity, including named extra charges and their tax flag. |
| FR-66 | IMPLEMENTED & AUTOMATED-VERIFIED — 2026-11-18 | Custom named extra charges preserve their tax treatment and stay separate from fixed charges and line items. |
| FR-67 | IMPLEMENTED & AUTOMATED-VERIFIED — 2026-11-18 | Quotation modification through the existing authorized update transaction. Not exercised against a hosted database. |
| FR-68 | IMPLEMENTED & AUTOMATED-VERIFIED — 2026-11-18 | Enter inserts a newline, Gate 1 is editable, Gate 2 is confirmation-only and a correction invalidates approval. Four-viewport visual behaviour not verified. |
| FR-69 | IMPLEMENTED & AUTOMATED-VERIFIED — 2026-11-18 | Deterministic commercial parsing and standardization for invoices and quotations. Live-provider compliance not verified. |
| FR-70 | IMPLEMENTED — HOSTED VERIFICATION PENDING — 2026-11-18 | Gate 2 authorization now requests canonical create/edit actions. Verified against the service contract only. |

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

## FR-29 - One Engine, Interchangeable Providers And Models (Proposed - 2026-11-14)

BOURXE must expose one conversational AI experience. Provider and model details stay behind the provider architecture. Conversation state, business context, authorization and tool permissions must not change when the engine selects a different model.

This requirement records the approved product direction. It does not approve an implementation. What exists today is one Bolu provider path (AMD on a server boundary), a legacy static failover path, and a Design Lab simulation. None of these is the dynamic engine.

**Acceptance criteria (proposed)**

- Provider-specific details stay behind the existing provider architecture.
- Conversation, context, authorization and tool permissions survive a model switch.
- The user sees one AI experience.

## FR-30 - Dynamic Model Inventory (Proposed - 2026-11-14)

The engine must maintain an inventory of available models across supported providers. Each entry carries metadata: provider identity, model identifier, availability, context window, modalities, tool-calling support, structured-output support, streaming support, capability limitations, free-tier status when verified, and operational health. Free-tier status, pricing, quotas, availability and terms are dynamic. Providers and models may be added, deprioritised or retired without redesigning the engine.

**Acceptance criteria (proposed)**

- Adding a declared model is a data change, not an architectural project.
- A model that fails its eligibility or health checks is removed from selection without a release-blocking redesign.
- Free-tier claims are treatments, not guarantees. Each carries a verification date.

## FR-31 - Free-First, Paid Denied By Default (Proposed - 2026-11-14)

The engine must prefer verified free models that meet the request requirements. Paid models must not be selected unless an owner-authorised policy permits it. Zero token price alone must never decide selection. Advertised cost, account entitlement, quotas, promotions and rate limits are distinct conditions. The engine must treat them as distinct.

**Acceptance criteria (proposed)**

- Selection ranks terms-eligible, healthy, free models first.
- A paid model is selected only under an explicit owner policy.
- A zero-price listing with unknown health or terms is not eligible.

## FR-32 - Capability-Aware Selection (Proposed - 2026-11-14)

Selection must consider required capabilities: tools, structured output, modalities, context window and streaming. Unknown capabilities must not count as confirmed. Models without a required capability are ineligible for that request.

**Acceptance criteria (proposed)**

- A request that requires tool calling never selects a model whose tool support is unverified or false.
- A request that requires a larger context window never selects a model declared below it.

## FR-33 - Bounded Failover (Proposed - 2026-11-14)

When a model fails — connection error, outage, rate limit, repeated timeout, invalid response, or missing capability — the engine must attempt another eligible model. The attempt must be bounded. Retry-After must be respected when supplied. Authorization failures must not retry indefinitely. Malformed user requests must not trigger provider switches. Failover must preserve conversation context where feasible.

**Acceptance criteria (proposed)**

- Every attempt is bounded per turn.
- A 429 with a Retry-After header cools the model instead of hammering it.
- A malformed request stops instead of walking the pool.
- The user can see which model answered and why a failover happened.

## FR-42 - In-App Administrator Secret Management & Protected Storage (Delivered - 2026-11-14)

Platform administrators must be able to configure, verify, rotate, and remove the shared enterprise AI inference credentials directly within the application's Settings interface without accessing cloud deployment consoles. Credentials must be protected at rest using envelope encryption and segregated from ordinary application database access.

**Acceptance criteria**

- **In-App Administration:** An authorized administrator (`profiles.role === 'admin'` or `workspace_members.role in ('owner', 'admin')`) can configure provider base URL, model identifier, and API key in Settings. Non-admin users cannot access or view configuration interfaces.
- **Envelope Encryption at Rest:** The secret key is encrypted at rest using AES-256-GCM with a server-isolated master key outside the database. Plaintext keys are never stored in database records.
- **Zero Client Read Exposure:** Row-Level Security explicitly denies all direct browser queries via PostgREST. Decryption occurs exclusively in server-side memory.
- **Sanitized Public Responses:** Administrative status queries return masked key strings (e.g. `rc-••••••••••••7766`); ciphertexts, nonces, tags, and plaintext keys are never returned to the frontend.
- **Pre-Flight Connection Test:** Administrators can run live verification tests against the provider endpoint before saving or using active credentials.
- **Runtime Precedence Hierarchy:** Inference resolution strictly enforces: In-App Database Config > Server Environment Variables > Deterministic Mock Mode.

## FR-43 - Assistant Identity: Bolu Only (Approved & Implemented - 2026-11-16)

The assistant header must visibly display only "Bolu" as the single identity. Standalone letter monograms, secondary logo marks, and corporate badges must not appear in the header.

**Acceptance criteria**

- The assistant header visibly displays only the text "Bolu".
- No standalone "B" square or circular badge remains in the header.
- No "BOURXE" badge or secondary corporate tag is displayed.
- Subtitle helper text is removed from the mobile and desktop header.
- The history rail toggle, document panel toggle, More menu, and close action remain accessible.

## FR-44 - Unified Assistant Identity and Active Model Picker in Single Compact Header Row (Approved & Implemented - 2026-11-16)

The active AI model picker must not be hidden inside secondary overflow menus, must not sit inside the composer at the bottom, and must not consume a separate dedicated vertical row beneath the header. The Bolu identity and active model picker must occupy ONE shared horizontal header row across all viewports (`fold-closed`, `fold-open`, `tablet`, `desktop`).

The header layout is arranged horizontally:
- **Left:** Conversation history drawer access (when applicable) and Bolu identity.
- **Right:** Active model picker trigger (connection name, model identifier, readiness dot, chevron) followed by compact header action controls (document panel toggle, More menu, close control).
- Both groups are vertically centered with appropriate horizontal spacing and zero additional vertical containers.

The vertical workspace hierarchy is strictly defined as:
1. One compact combined Bolu and active model header (`headerNode`).
2. Conversation stream / welcome screen / message thread (`threadNode`).
3. Message composer pinned at the bottom (`composerNode`).

**Acceptance criteria**

- The assistant header renders Bolu identity on the left and the active model picker on the right in one shared row.
- No separate `modelPickerBar` or second vertical row exists between the header and the conversation area.
- The model picker is not placed inside the message composer, and the message composer remains pinned at the bottom.
- On narrow viewports (down to 320px–360px), the model picker width is bounded and long model identifiers truncate cleanly with ellipsis without pushing Bolu off-screen.
- Tapping the model selector opens the model discovery and selection dialog with collision-aware viewport clamping: the dialog calculates available viewport boundaries on open and on window resize/scroll, guaranteeing a safe margin (>= 10px) from the screen edges so that model names, group headers, and badges are never clipped on the left or right edges on mobile screens down to 320px.
- The model picker dropdown visual surface adapts deliberately to the active application theme: in light mode, it renders a crisp slate surface with light borders, dark ink, subtle hover fills, and warm amber accents; in dark mode, it renders an elevated slate-900 surface with dark borders, light ink, and amber accents. Hardcoded non-adaptive dark rectangles are strictly prohibited.
- All existing header actions (history toggle, document panel toggle, More menu, close control) remain fully accessible and functional.
- The single-row header configuration is consistently enforced across Mobile Phone, Fold-closed, Fold-open, Tablet, and Desktop viewports.

## FR-45 - Direct AI Infrastructure Navigation (Approved & Implemented - 2026-11-16)

Selecting AI settings from the Bolu assistant interface must navigate directly to the canonical Bolu AI Infrastructure console without requiring intermediate menu traversal.

**Acceptance criteria**

- Clicking "AI Provider Settings" in the More menu navigates directly to `/settings?section=bolu-provider`.
- The Settings shell inspects URL search parameters and activates the Bolu AI Infrastructure section immediately.
- Zero intermediate settings landing menu clicks are required.

## FR-46 - Mobile Responsive AI Infrastructure & Overflow Remediation (Approved & Implemented - 2026-11-16)

The Bolu AI Infrastructure console must fit within standard mobile viewports (down to 320px–360px) without unintended horizontal page scrolling or clipped elements.

**Acceptance criteria**

- No unintended horizontal scrolling occurs on mobile viewports.
- Connection card badges (Primary, Pool P*, Health) wrap within the card boundaries on narrow screens.
- Connection card action buttons wrap gracefully without forcing overflow.
- Header title, description, and action buttons stack responsively when horizontal width is constrained.
- Models manager action bar wraps buttons cleanly without pushing container width out.

## FR-47 - Unified Assistant Message Rendering & Response Copy (Approved & Implemented - 2026-11-16)

Bolu must render every assistant message through one renderer. The renderer must separate four content types: standard text and Markdown, code, structured artifacts and attachments. The renderer must use the existing `ProductionBoluMessage` model. A second message model or a second persisted format must not exist.

The following capabilities are approved.

1. Every completed assistant response supports copying the complete response.
2. Fenced code in an assistant Markdown response renders as an isolated code block.
3. Each code block has an independent copy action.
4. Code copying preserves the source formatting and indentation.
5. Standard Markdown content receives consistent rendering.
6. Inline code and fenced code are visually distinct.
7. Structured artifacts have dedicated rendering.
8. Attachments have dedicated rendering.
9. Rendering works for streamed messages and for persisted messages.
10. The application does not execute untrusted AI-generated content.
11. Markdown and link rendering follow safe content-handling rules.
12. The four supplied Chat-blocks components are the primary design references.
13. mdxcn remains an optional technical reference. It is not an obligatory dependency.

**Acceptance criteria**

- A completed assistant response shows a copy action below the response text.
- The copy action copies the response text only. It does not copy labels, buttons, timestamps or decorative elements.
- The copy action reports success only after the clipboard write succeeds.
- The copy action reports a failure when the clipboard is not available.
- The copy action is not offered while the response streams.
- A streamed response and the same persisted response render the same way.
- A failed response shows the error card. It does not show a copy action.
- Copy works in the desktop browser, the mobile browser and the native shell through the existing `copyToClipboard` utility.

### FR-47.1 Design reference mapping

The following files are the primary visual and interaction references. They are references, not approved production components. They import components that do not exist in BOURXE. They are not copied directly.

| Reference | Use in BOURXE |
|---|---|
| `chat-default.tsx` | Message turn anatomy, the prose and fence split, and the Markdown to code-block handoff. |
| `code-block-default.tsx` | Code surface, language label, header action row and per-block copy. |
| `artifact-default.tsx` | Artifact header with type, title, status and an action cluster, then a structured body. |
| `attachment-default.tsx` | Attachment chip: media identity, name, metadata line and trailing action. |

Line numbers, download actions, wrap toggles, run actions, share actions and regenerate actions from the references are not approved. The current backend does not support them on this surface.

### FR-47.2 Documentation source classification

- **Approved product requirements:** capabilities 1 to 13 and the acceptance criteria above.
- **Existing implementation observations (2026-11-16 audit):** the assistant turn rendered `message.content` as plain text in a `whitespace-pre-wrap` paragraph, so fenced code appeared as raw prose. No copy action existed for a response or for a code block. Artifacts already rendered through `ProposalCardView` with the DEC-05 two-gate flow. `ProductionBoluMessage` had no typed attachment payload. No Markdown parser, syntax highlighter or sanitizer was wired into the chat surface.
- **Technical implementation decisions:** a local dependency-free Markdown parser and renderer, one isolated code block component, one shared copy control, typed attachment presentation, and reuse of the existing `copyToClipboard` utility.
- **Optional technical proposals (not approved):** syntax highlighting, adopting mdxcn components, artifact run, download and share actions, composer attachment upload, and a persisted attachment payload.

## FR-48 - Isolated Code Blocks & Code Copy (Approved & Implemented - 2026-11-16)

Fenced code in an assistant Markdown response must render as an independent code block. It must not render as ordinary inline text.

**Requirements**

- The block shows the declared language identifier when the response declares one.
- The block uses a monospaced surface with a clear boundary.
- The block keeps every space, tab and line break of the source.
- The block has its own copy action.
- The block scrolls horizontally inside its own container. The conversation must not scroll horizontally.
- Inline code stays inline. It must not receive the code-block interface.
- The block accepts any language identifier. An unknown identifier must not stop rendering.
- The block does not show or copy line numbers.
- The block does not execute or evaluate code.
- No syntax highlighter is loaded. The project has no approved highlighter dependency for this surface.

**Acceptance criteria**

- Copying a block copies only that block's source text.
- The copied text excludes the language label and the copy control.
- The copied text keeps the original indentation and line breaks.
- A block with no language identifier shows the neutral label `Code`. The application does not invent a language.
- A block that is still open while the response streams disables its copy action until the response completes.
- The copy action uses `copyToClipboard`, so the native shell, the secure browser context and the legacy fallback all work.

## FR-49 - Safe Markdown Content Handling (Approved & Implemented - 2026-11-16)

Assistant responses must render the approved Markdown elements consistently. Rendered content must not become executable content.

**Supported elements**

Paragraphs, headings (levels 1 to 4), bold, italic, ordered lists, unordered lists, one level of list nesting, blockquotes, inline code, fenced code blocks, links, tables and horizontal separators.

**Safety rules**

- The renderer builds text and React elements only. It does not accept HTML input and does not use `dangerouslySetInnerHTML`.
- A link renders only for `http:`, `https:` or `mailto:` schemes.
- A link with any other scheme renders as plain text. Protocol-relative links are rejected.
- An external link opens with `target="_blank"` and `rel="noopener noreferrer nofollow ugc"`.
- Missing or unsupported syntax renders as text. It must not stop rendering or show an error.
- No Markdown extension is enabled. Raw HTML, MDX, images and embedded media are not supported.
- The response copy action copies the response source text. It does not copy rendered HTML.

**Acceptance criteria**

- A response with `javascript:`, `data:` or `vbscript:` links shows no clickable link.
- A response with an unclosed fence still renders while it streams.
- The renderer adds no page-level horizontal overflow.
- The Markdown renderer is the only renderer for assistant prose.

## FR-50 - Structured Artifact & Attachment Presentation (Approved & Implemented - 2026-11-16)

Structured artifacts and attachments must be visually separate from assistant prose. They must use the existing typed payloads.

**Artifacts**

- A structured artifact renders through the artifact component. The visual anatomy follows `artifact-default.tsx`: a header with type, title, status and an action cluster, then a structured body.
- The artifact keeps its type label and title where the payload provides them.
- The artifact shows its structured preview: line items, field change and authoritative totals.
- The artifact keeps the DEC-05 two-gate actions. Gate 1 approval, Gate 1 rejection, Gate 2 confirmation and Gate 2 cancellation must not change.
- The artifact provides a plain-text copy action. The copy reads only the typed proposal payload. It does not replace a document action.
- The artifact does not save or modify a business record by itself.
- The artifact does not show an action that the backend does not support.
- Arbitrary prose or JSON-looking text must not become an artifact. Only a typed `BoluProposal` payload renders an artifact.

**Attachments**

- An attachment renders only from a typed `metadata.attachments` entry with a non-empty name.
- The attachment shows the file name. It shows the media type and the size only when the payload provides them.
- An attachment opens or downloads through its existing URL. The application does not build a storage path.
- Only `https:` URLs and same-origin absolute paths are openable.
- A file with no usable URL renders as a disabled identity chip. It does not crash the thread.
- The application does not invent an attachment URL and does not show a private storage path or a credential.

**Acceptance criteria**

- A persisted message with a proposal payload renders the artifact with both gates intact.
- A message with no proposal payload renders no artifact.
- A message with no typed attachments renders no attachment section.
- A malformed attachment entry is skipped. The remaining entries render.
- The artifact copy action copies the typed summary only.

## FR-51 - User Message Editing & Copying (Approved & Implemented - 2026-11-16)

A user must be able to correct an earlier request without starting a new conversation.

**User message actions**

- The only actions on a user message are Edit and Copy.
- Both actions are icon-only. They show a pencil icon and a copy icon from the existing icon library.
- Each action has an accessible name. A tooltip or a `title` is available. Both actions work with a keyboard.
- A user message shows no visible action words.

**Edit behaviour**

- Edit is available only on a message with role `user`.
- Edit loads the original text into the existing composer. The composer shows an explicit editing state and a cancel control.
- Cancel, and the Escape key, restore the original message. The original text is not changed.
- Sending the edit updates the original row in place. The row keeps its identifier, its position, its conversation and its tenant.
- An edit must not insert a second user message.
- A message from another user, another conversation or another business entity cannot be edited.
- Editing is not available while a response streams.
- Copy copies the original user text only. It excludes controls, timestamps and status labels.

**Acceptance criteria**

- The unedited text remains in the database until the edited text is saved.
- After an edit, the conversation shows the edited request in its original position.
- The response is regenerated from the edited request.

## FR-52 - Assistant Response Regeneration & Copying, Icon-Only Actions (Approved & Implemented - 2026-11-16)

**Assistant message actions**

- The only actions on a completed assistant response are Regenerate, Copy and Read aloud.
- An assistant message never has an Edit action.
- All three actions are icon-only. They use refresh, copy and speaker icons. Pause, resume and stop icons replace the speaker icon while narration is active.
- Accessible names, tooltips and focus states remain. No visible action words are shown in the action row.
- Regenerate is disabled while a response streams.
- Copy copies the complete response source text. It preserves paragraph breaks and Markdown source. It excludes UI controls, timestamps, status labels and internal operation envelopes.
- Existing code-block copy and artifact copy behaviour is unchanged.

**Regeneration behaviour**

- Regeneration reuses the original user request. It does not append a new user message.
- Regeneration reuses the conversation context before that request.
- The selected assistant response is replaced in its existing row. Its identifier and position are preserved.
- Later dependent turns are invalidated. See FR-53.
- Regeneration never approves, saves, executes or files a proposal. The two approval gates stay in place.
- No business document and no external record is deleted or changed by regeneration.

**Acceptance criteria**

- A regenerated response keeps the same row and the same position.
- The user message count does not increase.
- A regenerated proposal starts in the pending state and needs both gates again.

## FR-53 - Conversation Branch Integrity (Approved & Implemented - 2026-11-16)

An edited request or a regenerated response changes the answer for every later turn. Dependent later turns must not remain presented as valid answers.

**Approved behaviour**

- When a user message is edited, every later turn in that conversation becomes inactive.
- When an assistant response is regenerated, every later turn becomes inactive.
- Inactive turns are not shown in the active conversation branch.
- Earlier independent context is preserved and is sent to the model.
- Inactive turns are marked, not deleted. The current schema has no branch column, so this requirement is met with `metadata.superseded = true` and `status = 'stopped'`.
- A pending proposal that belongs to an invalidated turn is cleared from the active proposal state.
- Already persisted business documents are never rolled back by this behaviour.
- If the supersession write fails, the edit or regeneration stops and reports an error. The app does not continue with a branch that may still hold stale turns.

**Acceptance criteria**

- After an edit, no response to the previous wording remains visible below the edited message.
- Reloading the conversation shows the same active branch.
- Superseded rows still exist in `bolu_messages` for audit.
- No migration is required for this behaviour.

**Limitation**

- The model keeps only the active branch. An older branch cannot be restored from the interface in this release. A branch tree needs a schema change and is recorded as a proposal only.

## FR-54 - Haptic Feedback & Preferences (Approved & Implemented - 2026-11-16)

Bolu must give restrained haptic feedback on a device that supports it.

**Approved behaviour**

- Haptics are enabled by default.
- One short pulse fires when a response starts to show visible output. It fires once per response, never per token, per chunk or per render.
- A response that is empty or fails before visible output does not pulse.
- An optional completion pulse is independent from the start pulse. It is enabled by default. It is a short double tap, never a long vibration.
- Meaningful actions pulse lightly: send, save edit, regenerate, copy success, narration start and edit start.
- The setting is a device preference. It is stored in `bolu_interaction_preferences` in device storage, following the existing Bolu device-preference convention.
- A disabled master switch suppresses every Bolu pulse immediately, including the completion pulse.
- An unsupported device or a rejected native call produces no feedback and no error. Chat is not blocked.
- No Android permission is added unless the chosen implementation needs it. The browser Vibration API needs `android.permission.VIBRATE` on Android, so that normal permission is declared.

**Acceptance criteria**

- Exactly one start pulse occurs per response.
- Streaming a long response does not repeat the pulse.
- Turning haptics off stops all Bolu vibration on the next interaction.
- The completion pulse can be turned off without turning off the start pulse.

### FR-54.1 Haptic scope refinement (Approved & Implemented - 2026-11-16)

The intended interaction is one pulse when Bolu starts replying, plus one optional pulse when the reply completes. No other interaction vibrates.

- Copy, edit, regenerate, send, narration start, pause and resume do not vibrate.
- The start pulse fires once per response identifier, after visible output exists. Streaming tokens, chunk flushes and re-renders cannot repeat it.
- The completion pulse uses a short double tap. It needs the master switch and keeps its own switch.
- A device without the Vibration API produces no feedback and no error.
- The application does not override Android system vibration settings and does not request a runtime permission.
- A native haptics plugin is not required for this behaviour. The guarded Web Vibration API delivers both pulses, and the manifest declares the normal `VIBRATE` permission once.
- A preference change applies to the next response. Restarting Bolu is not necessary.

**Verification status:** automated tests pass. Device behaviour is NOT VERIFIED.

## FR-55 - Device Text-to-Speech Narration (Approved & Implemented, browser engine - 2026-11-16)

The device speaks the written response. The application does not generate audio and does not use a cloud voice provider.

**Approved behaviour**

- The speaker action starts narration of one completed assistant response.
- Narration is user-initiated. A response is never read automatically.
- The action is not offered on a streaming response. It becomes available when the response completes.
- While narration is active the row shows pause and stop. A paused response shows resume and stop.
- Starting another response stops the current one. Two responses never speak at the same time.
- Closing the workspace, changing conversation or unmounting the thread stops narration.
- Narration can be turned off in settings independently from haptics.
- The speaking rate is configurable. The voice is the device default for the device language.
- An unsupported speech engine, a missing voice or a speech error is reported as a state. It never crashes the thread.
- The narration preference is stored in the same device preference record as haptics.

**Narration text**

- Narration uses the human-readable response only. It excludes internal operation envelopes, tool payloads, hidden metadata, UI labels and internal identifiers.
- Headings, paragraphs and list items are read as sentences with pauses.
- Table rows are read cell by cell in row order.
- Inline code is read as words. Markdown symbols are not read.
- Link text is read. The URL is dropped. A bare URL is read as "link".
- A fenced code block is announced in one short sentence. Its source is not read line by line.
- A response that carries a typed proposal adds one short sentence that a proposal is shown for review. It does not read the payload.
- Attachments are not described as if their contents had been read.

**Engine selection (Implemented - 2026-11-16)**

The runtime selects the engine from measured capability. It does not assume the engine from the platform name.

| Engine | Selected when | Notes |
| :--- | :--- | :--- |
| Native Android Text-to-Speech | The `BoluSpeech` bridge reports a working engine with available language data. | Preferred on Android. Android System WebView does not reliably provide `speechSynthesis`. |
| Browser Speech Synthesis | The native engine is not usable and the browser exposes `speechSynthesis`. | Keeps desktop browsers and other supported environments working. |
| None | Neither engine is usable. | The speaker action is disabled and explains why. The rest of the chat keeps working. |

**Native Android bridge**

- A local Capacitor plugin (`BoluSpeechPlugin`) wraps `android.speech.tts.TextToSpeech`.
- The plugin is registered in `MainActivity` with the existing local plugins. There is no new package dependency, no Gradle change and no third-party speech SDK.
- The Android manifest declares the `android.intent.action.TTS_SERVICE` query. Android 11 and later require this query to bind a Text-to-Speech engine. The change adds no permission.
- The bridge speaks only the prepared narration text. It never transmits message text to a network service, never stores audio and needs no credential.
- The engine is released when the plugin is destroyed, so speech cannot outlive the activity.
- A missing engine, missing language data and rejected calls become states. They never crash the chat.

**Pause and resume**

- Android has no reliable pause inside one utterance. The web layer therefore sends one sentence-sized chunk at a time.
- Pause stops the current chunk. Resume sends that chunk again, so at most one sentence repeats.
- Stop clears the session and releases the engine.
- Starting another response stops the current response first.
- A session token discards late callbacks from a previous response, a closed conversation or an unmounted thread.

**Verification status:** engine selection, chunk preparation and lifecycle guards have automated tests. Native speech on a physical Android device is NOT VERIFIED.

**Acceptance criteria**

- The speaker action reads only the selected response.
- Pause, resume and stop reflect the real speech state.
- A second response stops the first.
- No internal JSON is spoken.
- With narration disabled, the action is disabled and no speech starts.

### FR-55.1 Source classification for FR-51 to FR-55

- **Approved product requirements:** the behaviour and acceptance criteria in FR-51 to FR-55.
- **Existing implementation observations (2026-11-16 audit):** the thread had no user-message actions and only a text-labelled response copy action. Submission inserted a user message and then a separate assistant message. No edit or regenerate path existed. `bolu_messages` has no parent or branch column. `@capacitor/haptics` was not installed and the Android manifest had no `VIBRATE` permission; the only existing haptic pattern was a guarded `navigator.vibrate`. No Text-to-Speech bridge or `speechSynthesis` usage existed.
- **Technical implementation decisions:** mark superseded turns in `metadata` instead of changing the schema; replace assistant rows in place for regeneration; use the guarded browser Vibration API with the required normal Android permission; use browser Speech Synthesis as the first available narration engine; store haptics and narration as device preferences.
- **Optional technical proposals (not approved, not implemented):** a branch tree with restore, the official `@capacitor/haptics` plugin, voice selection, and server-stored interaction preferences. The native Android Text-to-Speech bridge was delivered in the 2026-11-16 hardening pass and is no longer a proposal.

### FR-55.2 Source classification for the hardening pass (2026-11-16)

- **Approved requirements:** reliable Android narration, browser fallback, start/pause/resume/stop, cleanup on conversation change and unmount, silent ordinary interactions, one-shot start pulse.
- **Observations:** the Android project already had four registered local Capacitor plugins, minSdk 24 and compileSdk 36, and no speech bridge. Android System WebView does not reliably provide `speechSynthesis`. The first implementation also pulsed on copy, edit, regenerate, send, narration and save.
- **Decisions:** add a small local Capacitor plugin instead of a third-party dependency; keep browser synthesis as the fallback; chunk native speech in the web layer to support pause and resume; restrict vibration to the response-start pulse and the optional completion pulse; store the edited request before superseding dependent turns, and restore the original text if the branch write fails.
- **Proposals:** native haptics plugin, branch tree with restore, voice selection, account-scoped interaction preferences.

## FR-56 - Mobile Conversation Experience, Document Preview Redesign & Conversation Titles (Approved & Implemented - 2026-11-17)

Bolu 2.0 mobile conversation and document review surfaces must deliver a cohesive, touch-first assistant experience:

1. **Assistant Message Alignment & Sparkles Avatar:**
   - The Sparkles indicator is retained in a compact avatar gutter (`size-7`, 28px).
   - Message text utilizes the full remaining width (`flex-1 min-w-0 w-full`) without decorative laser walls, pseudo-elements, or obstructive rails.
   - Headings, lists, tables, and code blocks wrap and align consistently.

2. **Document Artifact Preview Redesign:**
   - Structured document review surface replacing generic modal presentation.
   - Compact header with document type, draft status, reference number, and close action.
   - Authoritative total receives strong visual prominence with currency formatting.
   - Line items render responsively without clipping descriptions or price columns.
   - Natural sheet height hugging content up to `max-h-[85dvh]` on mobile, eliminating blank void regions.

3. **In-Preview Two-Gate Decision Actions:**
   - Dedicated sticky action footer inside the document preview exposes Reject and Approve Changes (Gate 1) controls.
   - Gate 2 exposes Cancel Save and Confirm & Save controls.
   - Actions call the identical handlers as the in-chat approval card with unified state updates.
   - Submission lock prevents duplicate rapid submissions. Closing the preview executes no state change.

4. **Conversation History Sidebar & Identity:**
   - Replaces standalone "B" with approved `BxLogo` and eliminates redundant stacked branding headers.
   - Groups threads by date: Today, Yesterday, Previous 7 days, Older.
   - Displays user identity block at bottom with Google profile avatar or initials fallback.
   - Clean, touch-accessible row actions for selection and deletion.

5. **Topic-Derived Conversation Titles:**
   - Derives clean topic titles deterministically from the first user message (e.g. "Tecno Power Quotation", "Outstanding Invoices", "Add Transport ₦5,670").
   - Safe, controlled background backfill for historical generic "New Conversation" titles without touching custom or user-renamed titles.

6. **Mobile Connection Dialog Structural Responsive Layout (Google Modern Web Guidance):**
   - Dialog viewport geometry: uses `w-[calc(100vw-2rem)] max-w-lg min-w-0 box-border` with horizontal centering (`left-1/2 -translate-x-1/2`) and `max-h-[90dvh] overflow-y-auto overscroll-contain`.
   - Close button clearance: header enforces `pr-8 sm:pr-10` and `break-words` on descriptions, ensuring close control remains inside the visible header area.
   - Child intrinsic sizing: every section, input, and select trigger enforces `min-w-0 w-full box-border` so children never demand minimum widths exceeding the viewport.
   - Form responsiveness: Priority rank, paid tier, protocol, and auth scheme form grids collapse to single-column on mobile (`grid-cols-1 sm:grid-cols-2`), with unclipped readable text.
   - Target model discovery: header uses `flex flex-wrap items-center justify-between gap-1.5 min-w-0 w-full` so discovery actions never clip on narrow screens (Fold closed).
   - Component roots: shared `dialog.tsx` and `select.tsx` primitives enforce `min-w-0 box-border` and value truncation at the root level.

7. **Bolu 2.0 Mobile UX Final Remediation (Text Flow, Draggable FAB, Proposal Handlers, Drawer Alignment):**
   - **Assistant Text Flow Around Orb:** `.ac-turn` uses `display: flow-root;` with `.ac-turn-avatar` floated left (`float: left; margin: 1px 10px 4px 0;`). Markdown prose uses `display: block;` allowing inline text to flow naturally beneath the 28px orb after lines 1–2 to utilize full content width, while block elements (`.ac-card`, `.ac-code`, `.ac-md-table-wrap`, `.ac-actions`) clear both sides.
   - **Draggable & Repositionable Bolu FAB:** `BoluFloatingActionButton` supports pointer/touch dragging with 6px threshold tap/drag disambiguation, boundary clamping (min 12px viewport and safe area margins), position persistence in `localStorage` under `bolu_fab_position:v1`, window resize/orientation re-clamping, and full keyboard/screen-reader accessibility (`Enter`/`Space`).
   - **Two-Gate Proposal Operations & Feedback:** Proposal card views (`ProposalCardView`) and `InvoicePanel` wire shared Gate 1 (`approveGate1`, `rejectGate1`) and Gate 2 (`confirmGate2Save`, `cancelGate2Save`) handlers with immediate `feedback` notifications and `submitting` guards preventing duplicate submissions.
   - **Drawer Geometry & Aesthetics:** Mobile drawer sheets eliminate background color mismatch gaps (`bg-[var(--ac-muted-surface)]`), assign `w-full border-r-0` to the rail within mobile drawers, provide crisp active thread borders (`border border-[var(--ac-accent-line)]`), enhance the New Conversation button, and anchor the Google account footer with safe-area padding.

**Acceptance criteria**
- No decorative boundary obstructs assistant message width, and text flows under the avatar after lines 1–2.
- Bolu FAB can be dragged and repositioned smoothly across touch and pointer devices, persisting coordinates across reloads without triggering unwanted launches.
- Preview and chat cards display functioning Gate 1 and Gate 2 action buttons synchronized with thread state, displaying immediate toast notifications.
- Conversation drawer renders without blank white strips, highlighting the active thread cleanly.
- Conversation sidebar uses approved BxLogo, user avatar fallback, and 4-tier date grouping.
- Conversation titles describe actual topics rather than generic "New Conversation".
- Custom endpoint connection dialog contains zero horizontal scrolling and zero content clipping across mobile viewports (320px–390px, Fold closed, Fold open).




## FR-57 - Save Diagnostics, Safe Tenant Persistence, Message-Edit Lifecycle & Proposal Payload Integrity (Approved & Implemented - 2026-11-17)

Corrects diagnostic preservation, Gate 2 document save reliability, user-message editing lifecycle, and AI proposal payload validation:

1. **Diagnostic Preservation & Secret Redaction (`feedback.error`):**
   - Preserves `options.description` diagnostic context into `errorRegistry` entries rather than discarding it.
   - Automatically sanitizes sensitive data from diagnostics: Bearer tokens (`Bearer [REDACTED]`), API keys (`[REDACTED_KEY]`), JWT credentials (`[REDACTED_JWT]`), PostgreSQL connection URLs with passwords (`postgres://[REDACTED]@`), and sensitive key-value pairs (`[REDACTED]`).
   - Caps diagnostic length at 4000 characters to prevent `localStorage['bd-error-registry']` storage exhaustion.

2. **Safe Tenant Schema Resolution & Persistence Atomicity (`/api/bolu-save`):**
   - Server-side persistence strictly resolves the entity's tenant schema (`entities.schema_name`). If unresolved or null, it fails closed with HTTP 422 and code `tenant_schema_unresolved`. It never silently defaults to `'public'`.
   - Client-side fallback to authenticated tenant client is permitted **only** when the primary operation is known not to have committed (HTTP 404 unmounted endpoint, or `code: 'server_config_missing'` where the server aborted before opening a database transaction).
   - On database transaction failures, HTTP 500 errors, or interrupted network connections, the client does not execute a second write, preventing duplicate document creation and requiring safe reconciliation.

3. **Bolu User-Message Edit Availability & Error Visibility:**
   - The Bolu composer remains editable and submittable during user-message editing (`editingMessageId` present), even if an active proposal is pending or a previous save operation failed (`clerkState !== 'idle'`).
   - Active streaming lockout is strictly preserved: the composer locks during generation to prevent stream corruption.
   - `BoluChatWorkspace` destructures and surfaces thread errors via `feedback.error('Message update failed', { description: error })`. If edit submission fails, the edited text is preserved in the composer draft for user recovery.
   - Canceling edit restores the original message and clears the draft.

4. **Quotation Proposal Validation & Extra Charges Integrity:**
   - Explicitly validates proposal payloads against supported domain models. Model-injected arbitrary keys such as `extra_charges` or `extraCharges` are rejected with clear user guidance: `'The "extra_charges" field is not supported in document proposals. Please include transport or additional charges as standard line items with a description, quantity, and unit price.'`
   - Preserves authoritative application calculations (`computeAuthoritativeTotals`) and guarantees model arithmetic never overrides business records.

5. **AI Provider Settings Structured Error Classification:**
   - Preserves structured error codes in `/api/bolu-provider-config`: permission/RLS denial (HTTP 403 `forbidden`), server vault/encryption key missing (HTTP 500 `server_config_missing`), and unreachable remote endpoint/network timeout (HTTP 502 `endpoint_blocked`).
   - Unknown exceptions fall back safely to generic HTTP 500 `operation_failed` without exposing internal stack traces or secrets to the browser.

**Acceptance criteria**
- `feedback.error()` retains full diagnostic descriptions in the system error registry with all credentials redacted.
- `/api/bolu-save` returns `tenant_schema_unresolved` when schema lookup fails; never runs tenant RPCs through `public`.
- No duplicate persistence writes occur after uncertain server responses or database write failures.
- Proposals containing `extra_charges` are rejected with actionable guidance; valid line-item transport charges persist cleanly.
- Users can edit and resubmit their messages when a proposal is pending or a save has failed.
- Failed message edits retain the draft in the composer and surface immediate actionable feedback.
- Provider settings errors return accurate HTTP status codes and structured codes for known failure modes.

## FR-58 - Canonical Tenant Schema Resolution & User-Scoped Transaction Authorization (Approved & Implemented - 2026-11-17)

Eliminates Gate 2 document save failures by establishing canonical tenant schema resolution and user-scoped transaction authorization in `/api/bolu-save`:

1. **Canonical Database Tenant Schema Resolution (`_prov_get_schema_name`):**
   - Resolves tenant schema using the canonical database function `public._prov_get_schema_name(p_entity_id uuid)` via `adminClient.rpc('_prov_get_schema_name', { p_entity_id: targetEntityId })`, eliminating queries for the non-existent `entities.schema_name` column.
   - Enforces strict regex validation against `TENANT_SCHEMA_PATTERN = /^entity_[a-z0-9-]+_[a-z0-9-]+$/i`.
   - Rejects `null`, empty, whitespace-only, malformed, or `'public'` values, failing closed with HTTP 422 and structured code `tenant_schema_unresolved`.

2. **Authenticated User-Scoped Client & Dual Authorization (`getUserClient`):**
   - Resolves the calling user and extracts the verified Bearer token from the `Authorization` request header in `resolveUser(request)`.
   - Instantiates a user-scoped Supabase client (`getUserClient(token)`) configured with the caller's JWT: `headers: { Authorization: Bearer <token> }`.
   - Binds the tenant client via `createTenantClient(userClient, schemaName)` so that PostgREST and PostgreSQL assign `auth.uid() = user.id`.
   - Database transactional RPCs (`save_quotation_with_items_transaction` and `save_invoice_with_items_transaction`) successfully execute their internal permission gate: `public.has_entity_permission(p_entity_id, auth.uid(), '<resource>', '<action>')`.
   - Maps database error code `42501` (`insufficient_privilege`) and permission denial exceptions to HTTP 403 `forbidden`.

3. **Server-Side Pre-Flight Authorization Check:**
   - Performs an explicit pre-flight permission check via `adminClient.rpc('has_entity_permission', { p_entity_id: targetEntityId, p_user_id: user.id, p_resource: resource, p_action: action })` before opening tenant transactions.
   - If pre-flight check returns `false`, execution halts immediately with HTTP 403 `forbidden`.

4. **Preserved Administrative Boundary:**
   - Retains the service-role client (`adminClient`) exclusively for schema resolution, pre-flight authorization verification, and updating/inserting `bolu_messages` records in the `public` schema.

**Acceptance criteria**
- `/api/bolu-save` resolves schemas strictly through `public._prov_get_schema_name(p_entity_id)` and validates with `^entity_[a-z0-9-]+_[a-z0-9-]+$`.
- Requests lacking valid authentication fail with HTTP 401 `unauthorized`.
- Unresolved or invalid schemas fail with HTTP 422 `tenant_schema_unresolved` and never execute queries against `public`.
- Forbidden operations fail closed with HTTP 403 `forbidden`.
- Tenant transactional RPCs receive a user-scoped client carrying `Authorization: Bearer <token>`, ensuring `auth.uid()` evaluates to the authenticated user ID.
- Message history (`bolu_messages`) updates and confirmation inserts continue through the administrative boundary.


## FR-34 - Universal Document-Intelligence Pipeline (Proposed — 2026-11-14)

Bolu must process business documents and attachments through one consistent pipeline:

1. Source intake: the application accepts source documents and attachments, preserves them, and records their identity and processing status.
2. Faithful extraction: the system records source observations without embellishment.
3. Normalization: observations are normalized into typed business records, with explicit nulls for unknown values and references to the supporting observations.
4. Reconciliation: records are matched across sources; match candidates are proposed for review.
5. Deterministic calculations: the application computes authoritative arithmetic from recorded inputs.
6. Human review: a person confirms, corrects, rejects or approves.
7. Business action: approved creation or modification of business documents.

The pipeline is universal. Document families add extensions. No family gets its own separate architecture.

**Acceptance criteria (proposed)**

- Every stage above is traceable from input to approved output.
- The canonical objects are conceptual contracts, not schema decisions. Database design is a separate, later decision.
- Any stage may be entered only with the evidence it requires.

## FR-35 - Canonical Objects And Evidence Classification (Proposed — 2026-11-14)

The pipeline works with six conceptual canonical objects. These are contracts, not tables.

| Object | Meaning |
|---|---|
| SourceDocument | Identity, source type, original reference, author/supplier where stated, date where stated, processing status. |
| ExtractedObservation | Faithful source content: original wording, extracted values, source location/reference, extraction confidence or uncertainty where supported. |
| NormalizedItem | Standardized business representation. Unknown values are explicit nulls. Each field references the observations that support it. |
| MatchCandidate | Proposed relationship between records. Matching evidence, unresolved differences, confidence and review state. |
| Calculation | Explicit inputs, formula, result, currency/unit basis, reproducibility. |
| ReviewDecision | Human confirmation, rejection, correction or approval. Traceable to affected evidence and records. |

Evidence classification is separate from workflow status. Information items are classified as one of:

- `extracted` — taken from a source as stated.
- `calculated` — derived by the application from stated inputs.
- `inferred` — interpreted, not stated.
- `matched` — proposed relationship between records.
- `unverified` — present but not confirmed.
- `conflicting` — sources disagree and the conflict is retained.

Classifications describe the evidential nature of information. They are not workflow statuses.

**Acceptance criteria (proposed)**

- An item carries exactly one evidence classification.
- Conflicting source observations are retained, side by side, until a human resolves them.
- An inferred item is never displayed or stored as extracted fact.

## FR-36 - Workflow Status Lifecycle (Proposed — 2026-11-14)

Workflow status describes review progress, not evidence quality. The lifecycle is:

`not_found` → `information_found` → `possible_match` → `awaiting_confirmation` → `confirmed` → `priced_verified`

`priced_verified` additionally requires: the match is confirmed, the price basis and unit are unambiguous, and the calculation inputs are verified.

Transitions require the evidence and the review action their name implies. No AI-generated interpretation may silently promote itself to `confirmed`. Promotion to `confirmed` requires a human review decision. Promotion of a conflicting pair requires the conflict to be resolved by a person and recorded.

**Acceptance criteria (proposed)**

- `confirmed` is never reached without a ReviewDecision.
- `priced_verified` is never reached while any required input is `unverified`, `conflicting` or unit-ambiguous.
- Workflow status and evidence classification are queryable separately.

## FR-37 - Source Traceability And Preservation (Proposed — 2026-11-14)

- Original sources are preserved unchanged. The system never overwrites source evidence.
- Every normalized field traces to its supporting observations.
- Conflicting observations are retained with their sources.
- Extracted facts, human corrections and inferred interpretations are distinguishable at every stage.
- A human correction is a new review decision, recorded alongside the evidence it corrects, never a silent edit of the source.

**Acceptance criteria (proposed)**

- Deleting or altering a source is impossible inside the workflow.
- A normalized value can be traced back to its source location and original wording.
- A corrected value shows both the original evidence and the correcting decision.

## FR-38 - Matching And Reconciliation (Proposed — 2026-11-14)

Matching considers descriptions, specifications, units, quantities and source identifiers. A shared serial number alone must not establish `confirmed`. A possible match stays a candidate until the required review or confirmation occurs. Matching rules are document-family-specific and extensible. Candidates carry evidence, differences, confidence and review state.

**Acceptance criteria (proposed)**

- No candidate reaches `confirmed` on one identifier alone.
- Every candidate lists its supporting evidence and unresolved differences.
- A low-confidence match is presented as a question to the user, not resolved silently.

## FR-39 - Deterministic Calculations (Approved Principle — 2026-11-14; details proposed)

The application owns authoritative arithmetic. AI may extract or suggest calculation inputs but is never the authority for financial totals. Every Calculation preserves its inputs, formula, result, and currency/unit basis, and is reproducible. Where the unit, quantity basis or price basis is ambiguous, no verified extension may be calculated or claimed — only provisional ones, labelled as such. Provisional amounts are never presented as commercially verified totals.

**Acceptance criteria (proposed)**

- A total is reproducible from its recorded inputs and formula alone.
- A calculation whose unit basis is ambiguous is labelled provisional and cannot reach `priced_verified`.
- No model output can overwrite a system calculation.

## FR-40 - Attachment Intake And External-AI Interchange (Proposed — 2026-11-14)

Attachment intake is application-owned and separate from provider capabilities. No provider is assumed to support file upload, image understanding, or document parsing. DEC-33 records the intake direction; these decisions stay unresolved: supported file types, size limits, retention and deletion policy, extraction provider selection, privacy policy, and consent.

External AI may convert attachments into structured Markdown. That Markdown is an interchange representation, not the business data model. Bolu must validate and normalize all incoming information before it enters business workflows. Uncertainty, omissions and source references are preserved; an external model may not invent missing values. Attachment support must not depend on one provider.

**Acceptance criteria (proposed)**

- An attachment that cannot be processed fails loudly and preserves the source.
- External-Markdown output is validated and normalized before use; invented values are rejected or flagged.
- The pipeline works with the attachment lane disabled.

## FR-41 - Document-Family Extensions And The Solar-Pump BOQ Acceptance Case (Proposed — 2026-11-14)

The universal contract supports invoice, quotation, purchase order, waybill, CSR, RFQ, cost sheet and letter as candidate families with family-specific semantics, fields, validation and permissions. Similar-looking lines or supplier/customer roles are never interchangeable. No family is declared first-release scope by this requirement.

The solar-pump BOQ and supplier-message reconciliation is the first acceptance case, not the basis of a BOQ-only architecture. Acceptance requires all of the following:

- 300W panel pricing with New and Tokunbo alternatives, including an overwritten New price.
- Mounting-structure component offers that may relate to a BOQ lot but do not prove the complete scope.
- 10mm² cable candidate matches with uncertain handwritten specification digits.
- 4mm cable candidate match requiring specification confirmation.
- MC4 pricing expressed per individual item where the BOQ quantity is in pairs.
- Supplier price entries carrying serial numbers without descriptions.
- Missing price units and ambiguous price bases.
- Civil materials mentioned without complete pricing.
- Calculations that remain provisional while the match or unit basis is unverified.

**Acceptance criteria (proposed)**

- The system invents no specification and chooses no product condition silently.
- Match confidence is never overstated.
- Provisional amounts are never presented as confirmed commercial totals.
- The solar-pump case passes without any BOQ-specific redesign of the universal pipeline.

---

## FR-23 - Read Authorized Business Records (Approved Capability Principle)

Bolu must answer supported questions about existing business records. The application must retrieve facts through the existing tenant-aware repositories and permission checks. A record id is a reference, not authorization. The model must not select a tenant, entity, schema, or permission scope.

**Acceptance criteria**

- A read request checks the caller's current permission before data retrieval.
- The application returns only the minimum fields needed for the request.
- Invoice status and settlement values come from authoritative application or database sources.
- Quotation and other document status values use the document's existing status authority.
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

## FR-62 - Business Context Discovery On Write Requests (Implemented - 2026-11-18)

Bolu must retrieve the business records a write request needs before it constructs a proposal. A write verb must not disable record discovery.

**Approved behaviour**

- Read-intent classification stays separate from record discovery. A read capability still does not hijack a write request.
- A create request for a named client searches the client directory before generation.
- A create request for a quotation searches the client directory before generation.
- A request that names a document number retrieves that invoice or quotation before generation.
- A quoted item phrase may retrieve catalog suggestions. A suggestion never links an item and never reserves stock.
- Only records relevant to the request are retrieved. Results are bounded and contain only the fields the task needs.
- Every retrieval stays inside the authenticated user's authorized tenant. Another tenant's records are never supplied to the model.
- Discovery is read-only. It never persists a document, a client or an inventory change.

**Acceptance criteria**

- A write intent retrieves the relevant client or document record.
- An unrelated message retrieves nothing and fabricates no client.
- Existing read capabilities keep working.
- A tenant that is not ready reports a search failure instead of an empty result.

## FR-63 - Client Discovery And Resolution (Implemented - 2026-11-18)

Bolu must resolve a client to a verified record before an invoice or quotation proposal is complete.

**Approved behaviour**

- Search covers client name, phone, email and contact person where the tenant schema supports them. Archived clients are excluded.
- Matching tolerates letter case, surrounding whitespace, common punctuation and phone formatting. A multi-word phrase is retried by its distinctive words.
- Matching is conservative. The outcomes are exact match, one plausible match, several plausible matches, no match and search failure.
- Several plausible matches require the user to choose. Bolu never silently selects one.
- No match keeps the proposal. The collected document type, items, quantities, prices, dates, notes, terms, fixed charges, custom charges and discounts are preserved.
- A search failure is reported as a failure. It is never presented as an empty directory.
- A selected client always resolves to a stable record ID that is read back in the current tenant.
- The preview card contains a searchable client picker. The picker is the fallback for an unresolved, ambiguous or manually overridden client. It is not a permanent second panel.
- Selecting a client updates the pending proposal and preserves every other field.

**Acceptance criteria**

- Exact, partial, phone, email and contact-person searches resolve where the schema supports them.
- Several matches produce a question, not a guess.
- No match keeps the draft and offers the picker.
- A search error is reported accurately.
- Cross-tenant records never appear.
- Manual selection preserves all pending document fields.

## FR-64 - Reusable Contextual Clarification (Implemented - 2026-11-18)

Bolu must ask a focused question with selectable options when a request is ambiguous or a required decision is missing.

**Approved behaviour**

- Clarification is a reusable conversational capability. It is not a client-only feature.
- A clarification holds one or several related questions. Each question explains what Bolu needs and offers concise options.
- A question may allow a free-text answer and may be deferred by leaving the draft unchanged.
- Bolu does not ask for information it already holds.
- An answer updates the existing pending proposal. It does not discard the original request, the collected fields or validated data.
- An answer is not approval. Selecting an option never authorizes client creation, document creation, document modification, inventory reservation or payment.
- An answer is bound to one operation. An answer for a replaced, approved or cancelled operation is rejected and is never applied to another operation.
- The controls are compact and keyboard operable. They are not a full-screen questionnaire.

**Acceptance criteria**

- Single-question and multi-question clarifications render.
- Options and free-text answers both work.
- The pending proposal survives clarification.
- A stale answer changes nothing.
- An answer never changes the proposal out of the review gate.
- Two pending operations cannot receive each other's answers.

## FR-65 - Invoice And Quotation Field Parity (Implemented - 2026-11-18)

The Bolu operation contract must represent the fields the standard BOURXE document workflows support.

**Supported document fields**

Client identity, issue date, due date (quotation: valid until), notes, payment terms, document title, purchase order number, project reference, work duration, fixed workmanship, fixed transportation, fixed shipping, discount value with type and timing, WHT value with type, global VAT percent, and custom named extra charges.

**Supported line-item fields**

Description, quantity, unit price, unit, sub-description, make, catalog item ID, group name, group ID, discount rate, installation rate and installation taxability. A row type is normalized to a standard item.

**Approved behaviour**

- Invoices and quotations keep separate candidate numbers, permission resources and table families. Their payload is not assumed to be interchangeable at the persistence layer.
- Every supported field survives operation construction, validation, the Gate 1 proposal, the preview, the Gate 2 payload and persistence.
- A field that the persistence contract cannot hold is reported, not silently dropped.
- Document numbering, project linkage, status rules, audit behaviour and tenant authorization are unchanged.
- No database column is added for the convenience of the model schema.

**Acceptance criteria**

- Invoice and quotation proposals preserve their verified fields.
- Line-item fields survive validation and proposal construction.
- Existing non-Bolu form workflows are unchanged.

## FR-66 - Custom Extra Charges And Commercial Correctness (Implemented - 2026-11-18)

A named commercial charge must keep the user's intended classification. Bolu must not convert a charge into an ordinary line item.

**Approved behaviour**

- A custom named charge uses the existing `{ name, amount, withTax }` shape and is stored with the other commercial metadata in `custom_fields`.
- Fixed workmanship, fixed transportation, fixed shipping, custom named charges and ordinary line items stay distinct.
- A custom charge keeps its name, amount and taxability flag.
- The authoritative `calculateDocument` engine computes every total. Bolu does not implement a second calculation path.
- A taxable custom charge grows the VAT base. A non-taxable custom charge does not. Fixed charges keep the established non-taxable treatment of the form.
- A charge is never written as a line item to work around a schema gap. If the intended treatment is unclear, Bolu asks.

**Acceptance criteria**

- Taxable and non-taxable custom charges produce the same VAT result as the standard form path.
- Fixed charges remain separate and untaxed.
- The preview and the persisted document agree.
- Validation accepts the canonical and alias charge shapes and rejects invalid entries.

## FR-67 - Quotation Modification (Implemented - 2026-11-18)

Bolu may modify an existing quotation through the same safe path as an invoice.

**Approved behaviour**

- The generation pipeline accepts a `modify-document` operation for a quotation.
- The target quotation resolves to a verified record ID in the current tenant before the proposal is shown.
- Gate 1 and Gate 2 remain required.
- The existing `save_quotation_with_items_transaction` RPC with `p_mode = 'update'` performs the write. No alternate write path is added.
- A stale proposal is rejected when the stored value changed after the proposal was built.
- A duplicate submission of the same operation is rejected.
- If the sequential fallback used outside the RPC replaces items, the previous items are restored when the replacement fails.

**Acceptance criteria**

- An unapproved quotation modification performs no database write.
- An approved and confirmed modification writes through the authorized transaction.
- A stale modification is rejected.
- The original quotation remains available until the approved change is saved.

**Limitation:** the update RPC was not exercised against a hosted database in this change.

## FR-68 - Composer Enter Key And Gate Boundaries (Implemented - 2026-11-18)

The Bolu composer and the two approval gates must match the reviewed lifecycle: an explicit send action, editable Gate 1, confirmation-only Gate 2, and a conversation that stays usable while a document preview exists.

**Approved behaviour**

- Enter in the composer inserts a newline. It never submits. The explicit send button submits, and Escape cancels a message edit.
- Mobile soft-keyboard Enter therefore composes multiline text, and IME composition and paste are untouched.
- A pending document proposal never disables or covers the composer. On a phone the in-thread proposal card is the preview; the bottom sheet is opened deliberately.
- Gate 1 allows document review and correction: client selection, items, prices, dates and commercial charges, through the picker, the clarification card and conversational correction.
- Gate 2 is confirmation only. It shows the client, the document identity and the final amount, and exposes no editable field and no client replacement.
- A correction sent while a draft is open updates the same operation (`opId` retained), preserves fields the correction did not mention, replaces the supplied item set, recalculates authoritative totals, and returns the proposal to `pending_approval`.
- The superseded proposal card is cleared so only one operation has a live preview.
- Returning to review from Gate 2 clears the earlier approval. The user must approve the edited proposal again before Gate 2 is available.
- Cancellation remains an explicit user action and is never the only way to reach the composer.

**Acceptance criteria**

- Multi-line text can be composed and Enter never sends a message.
- A user can create an invoice, see the preview, send a correction and receive an updated preview without cancelling.
- Gate 2 cannot silently change a document, and a post-Gate-1 change invalidates the approval.
- The payload sent at Gate 2 is the proposal the user approved at Gate 1.

**Limitation:** the composer, the gate controls and the mobile sheet were typechecked and covered by source-level and behaviour tests. They were not inspected in the four viewport classes.

## FR-69 - Commercial Description Intelligence (Implemented - 2026-11-18)

Invoices and quotations must read commercial shorthand, standardize it, and suggest improvements without interrogating the user or inventing product specifications. The capability is reusable; only invoices and quotations use it today.

**Approved behaviour**

- Deterministic parsing handles pasted WhatsApp-style lists, timestamps, list markers, `15k` amounts, description lines that carry a quantity, and a separate price list.
- A separate price list is matched to the descriptions in order only when the counts agree. A different count is reported as a mismatch and no price is attached.
- Standardization normalizes unit notation and casing and expands the approved cable shorthand (`1.5mm green` becomes `1.5mm² Single-Core Cable – Green`). Size and colour are preserved exactly.
- No brand, manufacturer, grade, packaging, voltage, model, material, extra core count or dimension is added.
- A sufficient description stays as it is: `Salt` remains `Salt`.
- Suggestions (unpriced item, missing unit, absent payment terms, unset title) are displayed for the user and are never applied silently.
- Ordinary goods stay ordinary line items. A custom charge is only used for a named charge the user supplies as a charge.
- A supplied transaction date becomes the document date instead of today's date.
- Parsed evidence is supplied to the model as the user's own ordered words, not as instructions.

**Acceptance criteria**

- The reference input (four cable descriptions, four prices, Salt and Charcoal) yields six standardized items, prices paired correctly, and a 192,000 subtotal before any tax or adjustment.
- No unsupported specification appears in a standardized description.
- A count mismatch produces a focused question rather than a guessed pairing.
- The same capability serves invoice and quotation proposals.

**Limitation:** the model still composes the payload. Deterministic standardization and evidence are applied after validation; whether a given provider follows the prompt was not verified against a live provider.

## FR-70 - Gate 2 Save Authorization (Implemented - 2026-11-18, hosted verification pending)

Bolu must save through the same authorization contract as the standard invoice and quotation forms.

**Root cause corrected**

Bolu evaluated write permission with the actions `save` and `modify`. `public.has_entity_permission` matches `resource` and `action` exactly against `entity_permissions`, whose actions are `view`, `create`, `edit` and `delete`. A role without a wildcard therefore failed a check for an action that cannot exist, and the save was reported as a permission denial even though the user could create invoices normally.

**Approved behaviour**

- Bolu requests `create` for a new document and `edit` for a modification, for both invoices and quotations. Reads request `view`.
- The persisted proposal's `requiredPermission` records the same canonical action.
- The server route keeps its schema resolution, pre-flight `has_entity_permission` check and tenant client built from the caller's token, so `auth.uid()` and RLS remain authoritative.
- A genuine denial is still a denial. No RLS, permission function or `SECURITY DEFINER` boundary is weakened, and no service-role write path is introduced.
- Failures that are not permission denials keep their own classification.

**Acceptance criteria**

- A role holding `invoice/create` can save an invoice through Gate 2.
- A role without `invoice/create` remains blocked.
- A quotation requires its own `quotation/create` grant.

**Limitation:** this was verified by unit and regression tests against the service contract, not by an end-to-end save against the hosted database. The deployment's `VITE_API_URL`, service-role configuration and live RLS behaviour were not observable from the repository.

## FR-71 - Canonical Document Numbering for Bolu Documents (Implemented - 2026-11-18, hosted verification pending)

Every document Bolu creates must allocate its number through the same authoritative path as the standard form.

**Root cause corrected**

`bolu-document-service.ts` resolved the document prefix with `resolvePrefix(undefined, 'invoice')` and `resolvePrefix(undefined, 'quotation')`. `resolvePrefix` then falls back to the global default (`INV` / `QTN`) instead of the tenant's `settings.document_prefixes` (`SASINV`, `SASQUO`, ...). Bolu therefore allocated from a different sequence family than manual creation, which is how a tenant running `SASINV-000134` could receive `INV-000001` from Bolu.

**Approved behaviour**

- Bolu reads the tenant's `settings.document_prefixes` through `fetchDocumentPrefixes(tenantClient)` and resolves the prefix with `resolvePrefix(documentPrefixes, family)`.
- Number generation remains `getNextInvoiceNumber` / `getNextQuotationNumber` plus `fetchAutoCursor`, `withUniqueRetry`, the tenant uniqueness constraint and cursor advance. Bolu does not carry a sequence of its own.
- A model-supplied or invented number is never accepted. The proposal shows a document number only when it matches the authoritative `{PREFIX}-{serial}` shape; otherwise the card states that the number is assigned on save from the business prefix.
- Existing prefix configuration, tenant scoping and concurrency protection are unchanged.

**Acceptance criteria**

- A Bolu invoice continues the tenant prefix family and sequence.
- A Bolu quotation continues the canonical quotation family.
- Concurrent or retried saves cannot create duplicate numbers or duplicate documents.

**Limitation:** verified by unit tests against the generator, the prefix resolver and a mocked tenant client. Not exercised against the hosted tenant database.

## FR-72 - Co-creation Attribution and Audit Provenance (Implemented - 2026-11-18, hosted verification pending)

A Bolu-assisted creation must be truthfully attributable to Bolu without replacing the authenticated human actor.

**Approved behaviour**

- The document is written by the authenticated user who approved Gate 1 and confirmed Gate 2. The user id comes from the verified bearer token, never from the request body.
- Creation writes the existing canonical audit event (`record_audit_log`, action `CREATE`) plus the family activity event (`record_invoice_created` / `record_quotation_created`), with `source = bolu` and the real document id, number and timestamp.
- Modification writes the existing `UPDATE` audit event with the same actor and source.
- The document's persisted `custom_fields` keeps `created_via = 'bolu_assistant'` and `operation_id`, so provenance survives reload.
- The invoice and quotation view pages show a restrained "Co-created with Bolu" note only when that persisted marker is present. Manually created documents and unreadable metadata are never labelled.
- Failed, rejected, cancelled or abandoned proposals write no creation audit event.
- No second audit system is introduced.

**Limitation:** audit rows were verified by contract and source assertions, not by reading hosted `audit_logs` after a live save.

## FR-73 - Business Context Discovery beyond Documents (Implemented - 2026-11-18)

Bolu must discover the business records a requested operation depends on before constructing it.

**Approved behaviour**

- Read capabilities remain invoices, receivables and quotations. Write-intent discovery continues through `matchBoluWriteContext` and `resolveOperationFacts` rather than loosening read-intent classification.
- Discovery resolves clients by name, phone, email and contact person; adds the resolved client's recent invoices and quotations as bounded references; searches the item catalogue read-only; and searches suppliers when a supplier or vendor is named.
- Every lookup is tenant-scoped, archived rows are excluded, and results are bounded.
- A supplier is never attached to a client field. Catalogue discovery never reserves stock, deducts inventory or starts a purchase.
- Ambiguous or missing clients preserve the proposal and surface selectable candidates. No client is invented, and a model-supplied client id is trusted only after a read of that exact record.

**Limitation:** supplier and catalogue discovery are contextual grounding only; no supplier or catalogue workflow is added to document creation.

## FR-74 - Document Field Parity (Implemented where the contract allows - 2026-11-18)

Bolu must construct every invoice and quotation field the lifecycle can actually persist.

**Supported end to end:** client identity, title, PO number, project, issue date, due date (quotation validity), payment terms, separate terms and conditions, notes, work duration, fixed workmanship/transportation/shipping charges, custom named charges with a tax flag, discount value/type/timing, VAT rate, WHT value/type, and item description, sub-description, quantity, unit, unit price, make, part number, condition, catalogue id, installation rate and taxability, VAT override, discount override and grouping.

**Deliberately not claimed:** dynamic custom header fields, signatory selection, reference links, per-item custom columns and PDF output settings are stored in document-specific `custom_fields` shapes that Bolu does not yet construct. They are reported as gaps rather than fabricated.

**Limitation:** item part number and condition are persisted in the item's `custom_data` because the item tables have no such columns; this matches the form's extension convention.

## FR-75 - Preview Card Fidelity (Implemented - 2026-11-18)

The proposal card is the user-facing document experience; raw operation JSON is not.

**Approved behaviour**

- The existing `ProposalCardView` remains the renderer. Raw `bolu_operation` envelopes are stripped from assistant prose, while ordinary code blocks still render as code.
- The card shows document type, client, title, PO number, issue date, due/validity date, payment terms, terms, notes, item quantity, unit, unit price, line total, make, part number, condition, additional charges with tax treatment, discount, VAT, WHT and total due.
- Every amount comes from `computeAuthoritativeTotals` / `calculateDocument`. When no authoritative total exists the card says the application calculates totals on save.
- Long documents scroll within the thread without forcing a JSON dump.

## FR-76 - Gate Composer Availability and No Implicit Save (Implemented - 2026-11-18)

A visible approval card must never lock the conversation, and no message may authorize a save.

**Root cause corrected**

Three paths set `clerkState('listening')` while a proposal was open: proposal creation, Gate 1 approval, reopening review, and reloading a thread whose last message held a proposal. The composer treats any non-idle clerk state as locked, so chat was disabled at Gate 1, at Gate 2 and after "Back to review".

**Approved behaviour**

- A parsed proposal lands in `pending_approval` with an idle clerk state, so corrections and questions remain possible.
- Gate 1 approval opens Gate 2 with an idle clerk state; the user can ask questions before confirming.
- "Back to review" returns the proposal to `pending_approval`, clears the earlier approval, keeps every field and item, and re-enables the composer.
- A typed "yes", "confirm", "save" or similar no longer triggers persistence. Gate 2 is the explicit button only.
- The composer still locks during active streaming and while a save is in flight, and a provider or save failure returns it to idle.
- A modified proposal always drops to `pending_approval` and needs fresh Gate 1 and Gate 2 approvals.

## FR-77 - Idempotent Gate 2 Persistence (Implemented - 2026-11-18, hosted verification pending)

- Each document stores its `operation_id` in `custom_fields`. Before writing, the service looks up a document already carrying that operation id and returns it instead of allocating a second number.
- The in-memory executed-operation set remains a fast guard within one instance; the persisted key is the durable guard across retries, reloads and serverless instances.
- The unique constraint plus `withUniqueRetry` still arbitrates concurrent allocations, and an ambiguous failure is reported rather than retried automatically.
- The server route scopes its proposal-status update to the resolved tenant and writes no second confirmation message; the thread writes exactly one.

