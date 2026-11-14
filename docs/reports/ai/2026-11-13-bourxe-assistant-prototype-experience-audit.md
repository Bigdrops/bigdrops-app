# BOURXE Assistant — Existing Prototype and Experience Audit

This report was written by GPT-6 Luna on 2026-11-13 via DeepAI Code (Pi).

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Inspect the existing BOURXE assistant implementation, Design Lab work, suggestions, and AMD provider configuration. Assess how they can support the approved Conversational Business Intelligence direction.

This is a static, zero-code-change audit. The prior conversational document-assistant PRD was inspected only where needed to assess the requested suggestion demo. It is not treated as the approved specification.

## Scope and method

- Read repository guidance and relevant application, provider, and Design Lab files.
- Locate the requested paths and verify whether they exist.
- Trace assistant entry points and the app route shell.
- Inspect the configured request shape and AMD provider row.
- Do not run the app, contact a provider, or run build, typecheck, lint, or tests.
- Do not modify application or experimental files.

## Git status before inspection

Branch: `main`, ahead of `origin/main` by 7 commits.

Pre-existing changes included three modified Design Lab files:

- `src/components/design-lab/assistant-chat-layouts.tsx`
- `src/components/design-lab/assistant-chat-preview.tsx`
- `src/components/design-lab/assistant-chat-workspace.css`

The worktree also contained many untracked scratch artifacts and `video-json-tutorial/`. These files were left untouched. The three modified Design Lab files were read as they exist in the worktree; their tracked baseline may differ.

## Executive Summary

- The production assistant is a small, text-only bottom sheet. It is opened by one AI button in the dashboard header. It has no page or record context, no business-data retrieval, and no contextual suggestions.
- `AssistantSheet` contains the message state and is mounted by `DashboardAssistant`, which owns its own open state. A second dashboard-style launcher elsewhere would create a second independent sheet and conversation unless the state and renderer move to a shared shell-level owner.
- `/design-lab/assistant-chat` is a scripted invoice interaction preview. It demonstrates reusable visual patterns for responsive layouts, message blocks, confirmation cards, contextual panels, and suggested follow-ups. It is not a production interface or real assistant integration.
- The Design Lab preview is focused on invoice drafting, while the approved first capability is Conversational Business Intelligence. Reuse its presentation patterns selectively; do not carry over its document-writing assumptions as product requirements.
- The requested `docs/prd/conversational-document-assistant/Chat-blocks/suggestion-default.tsx` exists. It defines six fixed prompts and canned replies. Its demo fallback explicitly tells users to choose a listed suggestion. It should not supply production suggestions or imply bounded assistant capability.
- AMD is configured as an OpenAI-compatible endpoint at `https://developer.amd.com.cn/radeon/api/v1` with model id `DeepSeek-V4-Flash`. The current client sends streaming chat-completions requests directly from the browser/native app. Static code does not prove live AMD availability, model behavior, quotas, latency, or terms.
- Recommended direction: one shell-owned assistant controller and one shared interface. Every launcher sends page metadata and, where applicable, a record reference to that controller. Resolve any record data through existing tenant and authorization paths; do not treat route metadata as business data or send full records by default.
- Conversation persistence, switching records, navigation behavior, and whether new context changes the current conversation remain product decisions. This report recommends safe defaults but does not claim approval.

## Existing Assistant Implementation

### Verified files and roles

| File | Current role |
|---|---|
| `src/components/ai-assistant/DashboardAssistant.tsx` | Dashboard AI button; owns local `open` state and mounts `AssistantSheet`. |
| `src/components/ai-assistant/AssistantSheet.tsx` | Production sheet, conversation state, API key setup, message composer, response/error display. |
| `src/lib/ai-assistant/chat.ts` | Provider request, fallback order, SSE stream consumption, provider error handling. |
| `src/lib/ai-assistant/protocol.ts` | Message/request types, request construction, SSE parsing, error classification and key masking. |
| `src/lib/ai-assistant/providerCatalog.ts` | Runtime provider rows, configured models and order. |
| `src/lib/ai-assistant/providerRegistry.ts` | Wider provider/model registry consumed by the Design Lab provider settings. |
| `src/lib/ai-assistant/keys.ts` | Provider key storage. |
| `src/pages/AssistantChatExperiment.tsx` | Design Lab route wrapper for the scripted preview. |

### Current production interface and interaction

- The dashboard header button is 36 by 36 pixels and uses the text “AI”. It has an accessible label, `aria-haspopup="dialog"`, and `aria-expanded` state.
- The button opens a bottom sheet that is 86vh high. The sheet uses the shared `Sheet` UI primitive.
- If no provider key is configured, the sheet shows provider selection, key entry, save feedback, and a native-versus-browser storage note.
- If a key exists, the sheet shows a simple message list, empty-state copy, text input, send button, loading indicator, and inline error message.
- Enter sends a message; Shift+Enter is not intercepted by the production input, which is a single-line `Input` rather than a multiline composer.
- Message state is held in React state. The component does not load prior conversations, create thread records, or persist messages.
- The assistant text states that it cannot read documents or totals and cannot create or change records. This matches the inspected request path: it sends chat text only.
- The production layout is a bottom sheet, including on wider screens. No responsive desktop workspace, conversation rail, or record panel is integrated in this sheet.

### Reuse potential

The sheet is reusable as an early shell for one shared interface, but it needs a context-aware owner and prop/API changes. Its current local conversation state and launch ownership are not suitable for independent mounting at many routes. Its provider-key setup, basic message rendering, and loading/error states may be retained if later product and security decisions support them.

## Existing Design Lab Work

### Route and behavior

`src/components/app/AppShell.tsx` registers `/design-lab/assistant-chat`, and lazy-loads `src/pages/AssistantChatExperiment.tsx`. The page renders `AssistantChatPreview`.

The preview is a deterministic scripted simulation. It does not call `sendAssistantChat`, persist to Supabase, or use live invoice records. Its invoice begins with the fixed sample number `INV-000131`; messages advance named scripted turns, and local state updates the simulated invoice after a user accepts a card.

### Preview elements with reuse value

- One assistant thread and composer, placed in different responsive shells.
- Four viewport presets: fold-closed phone, fold-open, tablet, and desktop.
- Phone sheet, tablet drawer, and desktop side panel patterns.
- Message blocks for status, text, and cards; pending cards expose accept/reject actions.
- A context/artifact panel whose displayed totals derive from local invoice state, not assistant prose.
- User-visible context labels, provider settings, scroll-to-latest behavior, and suggested follow-up buttons.
- In the preview, suggestions and quick actions call the same `onSend` flow as typed input. The composer’s “Sample” and “Fix price” pills insert editable text instead of sending directly.

### Reuse limits and worktree note

- The preview’s responsive stage is valuable for evaluating a shared interface, but it is a visual experiment with mocked data and scripted outputs. It is not evidence that production flows or accessibility have been validated.
- The invoice-specific live-document panel, draft-writing language, and change-card behavior do not directly represent Conversational Business Intelligence. A BI context view should present read-relevant context and evidence, not imply invoice mutation.
- The provider-settings UI is also simulation-oriented. `simulateConnection` waits locally; model discovery returns generated example entries. It is not an AMD connection test.
- The target Design Lab files have pre-existing local modifications. Evaluate current state before any later reuse; do not assume those changes are committed or approved.

## FAB and Global Summon Integration

### Existing launchers

- The only verified general assistant launcher is `DashboardAssistant`, rendered in `DashboardOverview.tsx` dashboard header.
- `DashboardOverview.tsx` labels this button as opening the assistant sheet.
- There is no general assistant FAB in the inspected source. Other FABs, such as the client-create FAB, perform module-specific actions and are not assistant launchers.
- The Design Lab rail and its “New conversation” control are sample UI, not app-wide summon controls.

### Safest integration point

`AppShell` wraps the authenticated route tree and is already within `AuthorizationProvider`. It is the strongest candidate for a single shared assistant owner/renderer, after confirming the surrounding tenant-context provider placement and route exclusions. Keep one assistant instance and expose a summon action to the dashboard button, the future FAB, and any contextual entry points.

This avoids multiple sheet instances, duplicated message state, and inconsistent dismissal behavior. The dashboard button and any FAB should be launch controls only; neither should own a second assistant interface. Preserve the dashboard as the primary assistant home. The always-available launcher is a shortcut to that same interface, not a separate mode.

Do not mount an authenticated assistant into unauthenticated, public-share, or special routes without checking their authorization and data boundaries. Confirm exact route coverage and native navigation behavior during implementation planning.

## Context Propagation Architecture

### Separate page metadata from business-record data

Use two distinct concepts:

1. **Invocation metadata** describes the UI origin. Examples: module/page key, route kind (list/detail/form/report), current filters or date range, and launcher type (dashboard/header/FAB/context action). This explains where the assistant was opened. It is not evidence of record facts.
2. **Record reference and data** identify a relevant business object and the authorized data retrieved for the active user and tenant. The reference can contain a typed entity kind and stable record id. Resolve actual fields through existing tenant-aware reads and authorization; do not trust a route label or model-supplied id as authorization.

Only provide actual record values when the user asks a question that needs them and the current user can read them. Prefer a purpose-built, minimal fact representation over serializing an entire form or database row. Do not include secrets, unrelated records, hidden fields, or data from another tenant.

A future context envelope could conceptually contain `origin` metadata and an optional typed `recordRef`, with the app—not the model—resolving the referenced record. This is a recommendation, not an existing type or approved schema.

### Module context assessment

| Origin | Page metadata examples | Relevant business data, only after authorized retrieval |
|---|---|---|
| Dashboard | Dashboard key, visible date range, selected dashboard filters. | KPI and alert values only if retrieved from their authoritative dashboard/report sources. The fact that a KPI is visible is not itself a data payload. |
| Invoice | Invoice list/form/detail route kind, filters, selected tab. | For a detail route: invoice identity, client reference, stored document fields/items, and relevant settlement view values as needed. A new/edit form may contain unsaved local draft values; distinguish these from saved data. |
| Quotation | List/form/detail and filter state. | Saved quotation identity and data when a detail record exists. Unsaved edits are draft state and must not be presented as persisted facts. |
| Purchase order | List/form/detail and filter state. | Purchase-order identity and authorized supplier, line, status, and amount facts as required. Distinguish unsaved form values from persisted rows. |
| Client | Client list filters or client-detail route. | Client identity and relevant authorized profile/document/receivable facts. Avoid pulling the client’s full history unless the request needs it. |
| Reports | Report kind, selected date range, grouping, and filters. | Report rows/aggregates from existing report repositories and views. Filters describe scope; they do not supply the result values. |
| Other modules | Module key and current route/view/filter information. | Resolve CSR, waybill, project, supplier, accounting, tax, or other records only through the module’s existing data and permission path. Define the supported set before rollout. |

### Safe data boundaries

- Page metadata can drive page-specific suggestions without exposing a record payload to the model.
- Record identity is a pointer, not permission. Re-check user, active entity/tenant, and relevant read permission when resolving data.
- Existing tenant clients and row-level security remain authoritative. Do not accept tenant schema/entity selection from the model or user text.
- Context retrieval must not bypass module business logic, authorization, or tenant boundaries. Context sent to an external model also raises provider data-handling questions; AMD suitability cannot be assumed from endpoint configuration.

## Contextual Suggestion Architecture

### Existing suggestion sources

- Production `AssistantSheet`: no suggestions or quick prompts. Its empty state says “Ask anything” but does not list sample questions.
- `docs/prd/conversational-document-assistant/Chat-blocks/suggestion-default.tsx`: static array of six development-task prompts, plus hard-coded response text. It is a standalone scripted demo with no business context. Unmatched input receives “This demo only knows the suggestions. Pick one.”
- `src/components/design-lab/assistant-chat-script.ts`: one fixed sample-invoice starter and scripted reply choices, tied to the invoice flow.
- `src/components/design-lab/assistant-chat-thread.tsx`: renders the initial sample and follow-up reply buttons. They use the same send handler within that preview.
- Item Library and invoice item-autocomplete suggestions are separate domain-specific data-entry features, not conversational suggestions.

### Recommendation for BI suggestions

Define suggestions as optional, intent-oriented prompt candidates selected from the current page metadata and available authorized context. Keep module-specific selection separate from the shared rendering component. Suggested items should include user-facing text and a message payload, and should enter the same conversation through the same submit path as typed text. The app should validate and resolve any record references independently.

Examples for evaluation (not an approved prompt catalog): dashboard: “What changed in receivables this month?”; invoice detail: “Summarize this invoice and its payment status”; client detail: “What is outstanding for this client?”; reports: “Explain the largest change in this report.” Display only prompts that the current view and available data can support.

Suggestions must remain optional shortcuts. Keep the composer available, do not restrict free text to the displayed options, and do not make the demo’s “pick one” behavior part of production. An unavailable context should remove or qualify a suggestion, not silently substitute data.

## Conversation Lifecycle

Current production behavior is limited to one mounted `AssistantSheet` instance: messages survive close/reopen while its parent remains mounted, but are lost on unmount or reload. Navigation to a different route does not have a global conversation owner today. The Design Lab thread switching and persistence are sample controls/state only.

| Event | Current behavior | Recommendation for evaluation |
|---|---|---|
| Opened from different pages | Only dashboard launch exists. | Each entry point opens the same interface and submits invocation metadata. Do not create separate page-specific chats. |
| Summoned repeatedly | Dashboard state sets `open=true`; an already-open sheet stays open. | Reuse/focus the existing surface. Avoid creating a new conversation merely because the launcher was pressed again. |
| Navigate to another module | The current assistant belongs to the dashboard component and is not globally managed. | Decide whether the surface remains open and whether current page context updates. Do not silently rewrite prior messages’ context. |
| Change referenced record | No record context exists in production. | Show the active record reference clearly. Confirm whether switching the reference applies to future turns only, starts a new thread, or requires explicit user action. Do not mix two records invisibly. |
| Dismiss and reopen | State remains only while the dashboard component stays mounted; no durable save. | Decide whether an in-memory thread continues, whether reopening starts fresh, and whether any history is persisted. Dismissal should not imply deletion or durable storage without clear behavior. |

Safe default proposal: preserve one conversation within the shared mounted interface, retain the original invocation in history, and attach any later invocation as explicit context for that turn. Make the currently active record/context visible. Avoid automatic context switches across records during an active exchange. Whether this should create a new thread is unresolved.

## AMD Integration Assessment

### What static code verifies

- Runtime provider id: `amd`.
- Label: `AMD Token Factory`.
- Base URL: `https://developer.amd.com.cn/radeon/api/v1`.
- Configured model: `DeepSeek-V4-Flash`.
- Signup URL: `https://developer.amd.com.cn`.
- The row is in both `providerCatalog.ts` and `providerRegistry.ts`. The Design Lab reads the wider registry; production sends using the runtime catalog.
- The production call posts to `${baseUrl}/chat/completions` with JSON content type and `Authorization: Bearer <key>`.
- Request body contains `model`, `messages`, `stream: true`, and `max_tokens: 700`; it does not include tools, function schemas, page context, record data, or a system prompt by default.
- The response reader consumes SSE `data:` lines and extracts OpenAI-style `choices[0].delta.content` (or message content). It is streaming code, but AMD stream compatibility has not been live-tested in this audit.
- Provider rows are attempted in static order: NVIDIA, OpenRouter, AMD, Gemini. The request tries configured keys in that order and returns the first non-empty answer. Therefore AMD may serve as a fallback rather than the first choice when earlier providers have keys and succeed.
- HTTP 429, 401, 403, 404, and 5xx errors advance to the next configured provider. Other non-OK statuses stop. Network errors also advance. This is application behavior, not validation of AMD-specific responses.
- Keys are read from an app-private Capacitor file on native builds and kept in memory only in browser builds. Requests are made directly from the client to provider endpoints; no BOURXE server proxy appears in this path.

### What is not verified

- No live AMD request was made. The audit does not confirm endpoint availability, CORS behavior, authentication acceptance, stream framing, model availability, context window, BI quality, tool calling, latency, service terms, or quota.
- `providerCatalog.ts` describes AMD as having the “Largest daily allowance” and warns of possible slowness due to the China-site endpoint. These are repository comments, not measurements or independently verified provider commitments. Do not rely on them as product facts.
- The Design Lab’s “test connection” and model-discovery actions are simulations and do not verify AMD.

### Assessment for Conversational Business Intelligence

The existing integration demonstrates a configurable text-generation transport only. It does not currently provide the retrieval, grounded facts, citations, controlled tool execution, or context transmission needed for BI. Whether AMD can support the eventual request pattern must be tested against the approved architecture and data-handling policy. Do not infer support for tools or structured output from an OpenAI-compatible URL.

## Reusable Components

| Component or pattern | Reuse assessment |
|---|---|
| `AssistantSheet` | Retain as the basic shared surface only after moving ownership/state to a shared app-level controller and adding explicit context behavior. |
| `Sheet` UI primitive | Reuse for a mobile-friendly summoned surface if approved. |
| `sendAssistantChat` and protocol helpers | Possible transport prototype for text-only requests. It does not satisfy BI context/retrieval requirements, and provider behavior requires verification. |
| Dashboard AI button | Reuse as a launcher trigger, not as the owner of an independent sheet. |
| Design Lab thread/message components | Selective visual reference for loading, status, reply, and message hierarchy. Must be adapted to BI and not imported as a real backend. |
| Design Lab responsive shells | Useful for viewport evaluation. The dashboard remains the primary home; decide how summon layout should adapt to device and current route. |
| Context panel pattern | Reuse conceptually to show what page/record the assistant is using. It currently renders a simulated invoice. |
| Suggestion button patterns | Reuse only as optional chips that submit through the same conversation handler. Replace static development prompts with module-aware candidates. |
| Existing tenant and report data paths | Reuse as the only basis for business-data retrieval, after reviewing their read permissions and shaping minimal facts. |

## Gaps and Risks

### Missing functionality

- Global assistant owner, shared interface, and summon API.
- Page and record context envelope, active-context display, and authorized record resolver.
- BI retrieval and grounding pipeline, including source references/citations and freshness semantics.
- Context-aware optional suggestions, with typed and suggested messages sharing one send path.
- Explicit conversation/thread lifecycle and state persistence policy.
- AMD compatibility and service suitability evidence for the eventual BI request pattern.

### Technical and product risks

- Adding launchers without central ownership can create duplicate sheets, inconsistent context, and competing conversation state.
- Confusing page metadata with business facts can produce answers that appear grounded but have no authorized data behind them.
- Automatically changing context on navigation can cause a prior question to be answered against a different record than the user expects.
- Passing full record objects to a model can expose unnecessary data and amplify prompt-injection or data-handling risks.
- The direct-client key/provider model has no BOURXE server-side request control in the inspected path. Evaluate this against the approved deployment, tenant, privacy, abuse, and cost requirements before attaching business context.
- Static AMD configuration and comments do not establish provider capability, latency, quota, or suitability.
- The Design Lab’s invoice action cards and acceptance flow could be mistaken for production behavior. Keep simulation and real app operations clearly separated.

## Recommended Experience Architecture

1. Keep the dashboard as the assistant’s primary home. Its AI entry can open the same shared interface.
2. Provide one shared assistant owner at an authenticated app-shell level, after confirming provider placement and route boundaries. The owner controls open state, conversation state, invocation metadata, and the active record reference.
3. Treat the dashboard button, future FAB, and module-specific summon controls as launchers that send an origin descriptor to the shared owner. Do not mount another chat UI per module.
4. Represent origin metadata and record references separately. Resolve record facts through existing tenant-aware reads and permissions. The model must not choose the tenant, schema, or authorization scope.
5. Use module-aware suggestion selection as optional prompt shortcuts. Route each selected suggestion through the same message path as free text; never make suggestions the only way to interact.
6. Keep active context visible and avoid silent record changes. Preserve conversation continuity only according to an explicit lifecycle decision.
7. Reuse the Design Lab as a visual evaluation asset, not as the assistant’s production implementation or approved workflow specification.
8. Evaluate AMD only with a defined BI request pattern and verified provider behavior. The current code establishes transport configuration, not capability.

## Outstanding Decisions

These are not decided by this audit:

1. Should the shared surface be a sheet on all viewports, a responsive workspace, or a route that can also be summoned?
2. Does opening from a record attach only that record reference, or should the app immediately retrieve and disclose a limited fact set?
3. Which BI queries/modules are in scope for the initial experience, and which fields may be sent to an external model?
4. What should happen when the user navigates to a new module or record during an active conversation: retain prior context, add turn-scoped context, require confirmation, or start a new thread?
5. What should dismissal and reopening do? Is conversation history in-memory only, persisted locally, or stored remotely?
6. How should the assistant surface missing permissions, missing records, stale report values, and ambiguous record references?
7. Should the global FAB be shown on every authenticated route, and what route exclusions or accessibility/native constraints apply?
8. Is AMD approved for business-data processing after provider terms, data handling, authentication, streaming, latency, and quota are verified?
9. Should provider keys and requests remain client-side, or does the approved product direction require a server-controlled provider boundary?
10. Which visual elements from the currently modified Design Lab preview are approved for further evaluation or reuse?

## Verification and Git status after inspection

- Static inspection only: completed.
- AMD network request: not made.
- `bun run build`: not run, as instructed.
- `bun run typecheck`: not run, as instructed.
- `bun run lint`: not run, as instructed.
- `bun run test`: not run, as instructed.
- Application code changed: none.
- Experimental assistant files changed: none.
- Supabase migrations or database changes: none; push not applicable.
- Report created: `docs/reports/ai/2026-11-13-bourxe-assistant-prototype-experience-audit.md` only.
- Git status after: `main` remains 7 commits ahead of `origin/main`. The final snapshot includes modified Design Lab files `assistant-chat-composer.tsx`, `assistant-chat-layouts.tsx`, `assistant-chat-model-pill.tsx`, `assistant-chat-parts.tsx`, `assistant-chat-preview.css`, `assistant-chat-preview.tsx`, `assistant-chat-settings.tsx`, `assistant-chat-thread.tsx`, and `assistant-chat-workspace.css`; untracked `src/tests/critical/assistantChatUxContracts.test.js`; untracked scratch artifacts and `video-json-tutorial/`; and this report. The initial snapshot showed only three modified Design Lab files and did not show the test file. The additional Design Lab modifications and test file appeared during the audit. They were not edited by this audit and were left untouched.

## Deferred work

Implementation, visual redesign, FAB work, live provider testing, and any implementation prompt are outside this audit. No implementation prompt is included.
