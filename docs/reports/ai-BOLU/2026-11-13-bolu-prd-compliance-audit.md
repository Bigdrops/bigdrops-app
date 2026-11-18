# Bolu PRD Compliance Audit and Roadmap Reconciliation

This report was written by GPT-6 Luna on 2026-11-13 via DeepAI Code (Pi).

Skills used: requirements-clarity, writing-clearly-and-concisely, karpathy
Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Compare the Bolu implementation with the repository’s assistant requirements. Verify the implementation report against source and tests. Reconcile the existing roadmap with evidence, without changing application code or deciding product scope.

## Scope and limits

- Read the repository guidance, skill index, skill registry, assistant PRD set, roadmap representations, implementation report, production source, and Bolu tests.
- Use static inspection only.
- Do not run build, typecheck, lint, tests, migrations, or provider requests.
- Do not modify the PRD, application code, tests, configuration, database, or Design Lab.
- Update only the roadmap source, its confirmed HTML mirror, and this audit report.

## PRD and roadmap authority

### Located artifacts

- Requirement set: `docs/prd/conversational-document-assistant/functional-req.md`
- PRD index and status: `docs/prd/conversational-document-assistant/Readme.md`
- Roadmap source: `docs/prd/conversational-document-assistant/Waterfall-roadmap.md`
- Roadmap mirror: `docs/prd/conversational-document-assistant/roadmap.html`
- Decision history: `docs/prd/conversational-document-assistant/decision-log.md`
- Risks: `docs/prd/conversational-document-assistant/risk-register.md`
- Architecture: `docs/prd/conversational-document-assistant/architecture.md`
- Acceptance test plan: `docs/prd/conversational-document-assistant/test-plan.md`
- Provider catalog: `docs/prd/conversational-document-assistant/provider-catalog.md`
- Prior implementation report: `docs/reports/ai/2026-11-13-bolu-production-runtime-implementation.md`

`Readme.md` calls the PRD **DRAFT FOR REVIEW**. `functional-req.md`, `decision-log.md`, `risk-register.md`, `architecture.md`, `test-plan.md`, `provider-catalog.md`, and `Waterfall-roadmap.md` use draft status metadata. The README says `roadmap.html` is the same roadmap as a phone-first page. Therefore, this audit treats `Waterfall-roadmap.md` as the roadmap source and `roadmap.html` as its maintained mirror.

### Product authority conflict

The draft PRD specifies conversational document creation. FR-01 through FR-09 cover invoice authoring, change cards, money safeguards, missing fields, and explicit filing. The Waterfall roadmap expands this to eight authorable document types and a four-week trial.

The product direction provided for this audit identifies Conversational Business Intelligence as the first Bolu capability and says that the initial scope is read-only questions about existing business records. This conflicts with the draft PRD and roadmap. The decision log is also a draft; its decisions do not establish approval. The repository contains an advisory app-wide AI specification at `docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/ai-integration.md`, but it is not a Bolu-specific approved PRD.

This report does not resolve the conflict. Statuses below measure evidence against the draft FRs and guardrails only. They do not approve document creation or replace the stated BI direction.

## Status definitions

- **VERIFIED COMPLETE** — source and applicable acceptance evidence support completion.
- **PARTIAL** — part of the requirement exists, but required behavior or acceptance evidence is missing.
- **NOT IMPLEMENTED** — no qualifying implementation was found.
- **BLOCKED** — an unresolved prerequisite prevents a valid completion decision.
- **NOT VERIFIED** — source inspection cannot establish the behavior.
- **NOT APPLICABLE** — the PRD explicitly makes the requirement conditional and its condition is unmet.

No row is marked VERIFIED COMPLETE based only on the implementation report. No runtime acceptance was performed in this audit.

**Functional requirement totals:** 0 VERIFIED COMPLETE, 9 PARTIAL, 13 NOT IMPLEMENTED, 0 BLOCKED, 0 NOT VERIFIED, 0 NOT APPLICABLE. These counts classify evidence against this draft PRD. The product-scope conflict is recorded separately as the roadmap blocker.

**Guardrail totals:** 5 VERIFIED COMPLETE, 1 PARTIAL, 2 NOT IMPLEMENTED.

## Traceability matrix

The PRD does not define requirement priorities. Priority is therefore recorded as **Not stated** for every row.

### Functional requirements

| ID | PRD section | Requirement summary | Priority | Implementation location | Test or evidence | Audit result | Remaining work / blocker |
|---|---|---|---|---|---|---|---|
| FR-01 | `functional-req.md` §3 | Invoice-form assistant entry and simultaneous form visibility. | Not stated | `DashboardAssistant.tsx`; `AssistantSheet.tsx`; `BoluAssistantProvider.tsx` | `bolu-context.test.js` tests route metadata only. No invoice-form visual/device test. | PARTIAL | Current sheet is a global bottom sheet launched from the dashboard, not an invoice-form assistant overlay that proves form visibility at 360 px. Also draft-only scope conflicts with BI direction. |
| FR-02 | §3 | Streaming text and form updates while streaming; recover from network errors. | Not stated | `bolu-transport.ts`; `api/bolu-chat.ts`; `bolu-runtime.ts`; `AssistantSheet.tsx` | `bolu-provider.test.js` validates request shape only. No provider stream fixture or device timing test. | PARTIAL | Text SSE plumbing exists. No form updates occur. AMD SSE and first-token timing are not validated. |
| FR-03 | §3 | Model may update form only with fixed tool calls; reject free JSON. | Not stated | `bolu-capabilities.ts`; `bolu-runtime.ts`; `api/bolu-chat.ts` | `bolu-capabilities.test.js` tests rule-based intent matching. It does not test model tool calls. | NOT IMPLEMENTED | Provider request has messages and context facts only. It has no tool schema, tool choice, or tool-call parser. No invoice JSON is used, but draft tool-only form writes are absent. |
| FR-04 | §3 | Every model tool call creates an accept/reject card; accepted once, rejected unchanged. | Not stated | None in production Bolu UI/runtime. | Bolu tests do not cover change cards. Design Lab cards are separate and mocked. | NOT IMPLEMENTED | No tool call or write-to-form path exists. |
| FR-05 | §3 | `computeDocument` owns all calculations; model cannot write computed values. | Not stated | `bolu-data.ts` reads stored totals and `invoice_financials_v`; UI uses `formatNaira`. | `bolu-data.test.js` checks tenant readiness and permission, not calculations. Existing financial source is `src/lib/Calculations.ts`. | PARTIAL | Read-only BI does not calculate values, but the draft invoice tool guard and formula acceptance tests are absent. No source evidence says the new runtime invokes `computeDocument`. |
| FR-06 | §3 | Detect contradictions and ask which value is correct. | Not stated | No contradiction detector found in Bolu runtime. | No corresponding Bolu test. | NOT IMPLEMENTED | No contradictory amount/total or row correction path exists. |
| FR-07 | §3 | Propose title, notes, and terms via user-approved cards. | Not stated | None in production Bolu runtime. | No corresponding Bolu test. | NOT IMPLEMENTED | Proposal cards and business-approved defaults are absent. |
| FR-08 | §3 | Ask for missing required invoice fields using invoice rules; do not invent values. | Not stated | `bolu-runtime.ts` has read-intent fallback only. | No invoice-validation or missing-field tests. | NOT IMPLEMENTED | No invoice authoring path or invoice-domain validation adapter exists. |
| FR-09 | §3 | Explicitly prepare filing, show confirmation, then use normal save path. | Not stated | No save or filing code in Bolu runtime. | No filing/save test. | NOT IMPLEMENTED | Correctly absent from the read-only implementation; it remains a draft-PRD requirement only. |
| FR-10 | §3 | Ordered provider failover with status classification, Retry-After, provider identity, and AMD network acceptance. | Not stated | `api/bolu-chat.ts`; `bolu-provider.ts`; `bolu-transport.ts`; legacy `chat.ts` | `bolu-provider.test.js` checks message bounds. Legacy `protocol.test.js` tests old client classification, not the new Bolu server route. No AMD live request. | PARTIAL | Bolu uses one AMD endpoint. No provider chain, retry-after handling, active provider readout, or Nigeria latency test. AMD behavior remains unverified. |
| FR-11 | §3 | Live provider quota readout from provider responses. | Not stated | No Bolu quota reader or UI. | No quota tests. | NOT IMPLEMENTED | No quota headers/body parsing or readout exists. |
| FR-12 | §3 | Add/remove/test provider keys securely; native private file, browser memory, mask, removal. | Not stated | `api/bolu-chat.ts` reads server environment key `BOLU_AMD_API_KEY`; legacy `keys.ts` has per-device user key handling. | `bolu-provider.test.js` does not exercise key custody. The implementation report says no AMD environment key is configured locally. | PARTIAL | New Bolu has no key management/test UI; no key removal or display. Existing user-key manager belongs to the older runtime. Deployment secret provisioning is outstanding. |
| FR-13 | §3 | Feature off by default and provider-specific privacy consent before the first send. | Not stated | No consent or toggle in `BoluAssistantProvider` / `AssistantSheet`. | No consent/toggle test. | NOT IMPLEMENTED | New assistant is mounted in the authenticated shell and does not gate sends on consent. This is a material privacy blocker for the draft’s cloud use. |
| FR-14 | §3 | Normal form works if assistant is off, offline, or provider fails; preserve draft. | Not stated | `bolu-runtime.ts` returns verified facts on some provider failures; assistant UI is additive. | `bolu-lifecycle.test.js` tests reducer state only. No form degradation test. | PARTIAL | No feature toggle or invoice-form save flow exists to prove unaffected operation. Provider failure fallback exists only after retrieval succeeds. |
| FR-15 | §3 | Settings trial toggle, off by default, controls UI and network. | Not stated | No Bolu toggle. | No toggle test. | NOT IMPLEMENTED | Settings integration and default-off behavior are absent. |
| FR-16 | §3 | Eight guardrails (G1–G8). | Not stated | See guardrail table below. | Static source references and Bolu unit tests; no full PRD gate run in this audit. | PARTIAL | Individual guardrail results are listed below. |
| FR-17 | §3 | Shared design: chat, provider, and failover outside invoice module; support a second document type with another tool list. | Not stated | `src/lib/ai-assistant/bolu-*`; shared `AssistantSheet`; `BoluAssistantProvider` | Source imports are outside invoice module. `bolu-context.test.js` covers invoice and unknown context, but no multi-pack tool contract exists. | PARTIAL | General runtime is outside invoice code, but the runtime’s capabilities are hard-coded read-only, not per-document tool lists. No second authoring pack mounts it. |
| FR-18 | §3 | 14 preconfigured providers, declared models, one-key setup, status badges and activation. | Not stated | Legacy `providerRegistry.ts`, `providerCatalog.ts`; new `bolu-provider.ts` | Static catalog exists. No new Bolu settings tests or user-facing catalog in `AssistantSheet`. | PARTIAL | Catalog data exists for the older runtime/Design Lab. Bolu uses one fixed AMD endpoint and server secret; no 14-provider selection UX or active/configured/needs-key badges. |
| FR-19 | §3 | Declared models immediately; on-demand `/models`; dedupe/cap/failure fallback. | Not stated | `providerRegistry.ts` contains declared lists. Design Lab discovery is simulated in `assistant-chat-providers.ts`. | No production Bolu model-discovery test. | NOT IMPLEMENTED | The Bolu surface has no model selector or live discovery. The Design Lab simulation is not production evidence. |
| FR-20 | §3 | Top-bar provider/model pill and switch behavior across layouts. | Not stated | None in production Bolu UI. | No Bolu UI test. Design Lab pill is experimental. | NOT IMPLEMENTED | No pill or provider switching in the production sheet. |
| FR-21 | §3 | Custom OpenAI-compatible provider and validation. | Not stated | `providerRegistry.ts` contains `validateCustomProvider`; Design Lab has custom-provider state. | No production Bolu route/UI test. | NOT IMPLEMENTED | Existing helper/preview does not expose a custom provider in the Bolu production runtime. |
| FR-22 | §3 | Four layouts share one state; fold, tablet, desktop, scroll, composer and IME behavior. | Not stated | Production `AssistantSheet.tsx` is one bottom sheet. Four layouts exist under Design Lab only. | No production responsive test. `assistant-chat-*` preview tests do not prove production UI. | NOT IMPLEMENTED | Production interface does not implement four layouts, model/context/settings controls, Latest behavior, multiline composer, or IME contract. Design Lab remains frozen. |

### Guardrails under FR-16

| ID | Exact rule | Evidence | Audit result | Remaining work / limitation |
|---|---|---|---|---|
| G1 | `src/lib/Calculations.ts` unchanged. | No Bolu imports or calculation writes found. Current task did not modify it; implementation report also says unchanged. | VERIFIED COMPLETE | This is a file-scope check, not a runtime calculation test. |
| G2 | No PDF renderer modified. | Bolu task source list contains no PDF renderer changes. | VERIFIED COMPLETE | Repository has unrelated concurrent changes; none observed in the PDF paths in this audit. |
| G3 | Model writes only through tool list. | Provider request has no `tools` or `tool_choice`; no model-to-form write path exists. | NOT IMPLEMENTED | A tool-call form mutation layer is absent. For BI, the right boundary is read-only application capabilities, not draft form tools. |
| G4 | Model never writes a computed field. | No model write or form tool exists; financial values are fetched from tenant data. | VERIFIED COMPLETE | Verified for the current read-only code only. |
| G5 | Model never saves. | No save, RPC write, or document mutation service imported by Bolu. | VERIFIED COMPLETE | Verified statically for the current runtime. |
| G6 | Model never invents missing values. | System prompt says not to invent, but free-form provider prose is not structurally validated. | PARTIAL | Prompt instruction is not proof of output correctness. Deterministic answer rendering/citation validation is not established. |
| G7 | Every accepted change visible before save. | No accepted-change or save action exists. | NOT IMPLEMENTED | No change-card workflow exists. It is outside the later BI read-only scope unless the PRD is approved. |
| G8 | No assistant data is written to tenant DB during trial. | Current runtime reads through tenant client and has no conversation persistence/write path. | VERIFIED COMPLETE | No live trial audit was performed. |

## Implementation report claim audit

| Claim in `2026-11-13-bolu-production-runtime-implementation.md` | Source check | Finding |
|---|---|---|
| One shared shell-owned runtime. | `BoluAssistantProvider` wraps AppShell `Routes`; Dashboard button uses `useBoluAssistant`. | Supported by source structure. Only the dashboard entry is wired. No FAB or other launcher is connected. |
| Dashboard, invoice, quotation and report context. | `buildBoluPageContext()` recognizes `/`, invoice and quotation routes, `/reports`; unknown paths return `other`. | Partial. No client, PO, CSR, RFQ, tax, receipts or project route-specific context; filters are passed as `{}` by the provider. The current `formState` exists for invoice and quotation routes, but no draft form contents are read. |
| Context changes explicit. | Route change calls runtime `open()`; reducer sets `pendingContext`; UI has “Use this context”. | Partly supported. If changed, prior state is retained until the user applies the pending context. No test covers a real route transition. |
| Invoice/quotation record references. | UUID-only route parsing in `bolu-context.ts`; `readBoluInvoice()` and direct quotation lookup re-read via tenant client. | Supported for saved detail route references; actual data authorization is checked before query. No selected quotation detail behavior was tested. |
| Read-only invoice/receivables/quotation BI. | `search_documents`, `invoice_financials_v`, direct quotation reads; capability matcher. | Partial. Invoice and quotation search results are traceable, but no reliable query plan handles client-specific receivables. Data rows are shown. Model explanation is not validated against citations. |
| AMD server boundary. | `api/bolu-chat.ts` authenticates Supabase user and reads `BOLU_AMD_API_KEY`; static endpoint/model. | Source supports server-held secret design. No local key was found by the prior report; live reachability/auth/streaming and deployed secret are unverified. |
| Graceful fallback to verified facts on provider failure. | `bolu-runtime.ts` catches provider failure after `verifiedFacts` is assigned and returns deterministic formatted facts. | Supported by code path, but no runtime or integration test demonstrates the fallback. |
| Stop/interruption behavior. | Runtime aborts the provider request; reducer status returns idle. | Partial. An in-flight database search has no abort signal, and cancellation behavior is not integration-tested. |
| Context-aware greeting/suggestions. | Module/record configuration in `bolu-context.ts`; rendered by `AssistantSheet`. | Partial. This is data-driven from route/module and record ref, but application filters/state are not propagated. Some suggestion intent paths are not matched by the rule parser. |
| Natural language invoice search and picker. | `extractBoluSearchTerm()`, `matchBoluIntent()`, `searchBoluInvoices()`, embedded picker. | Partial. Search calls existing RPC and supports invoice number/client terms. Search pagination is capped; there is no “load more” control. Picker does not display an explicit selected-state result beyond context banner. |
| Tenant permission and financial integrity. | `tenantClient.isReady`, `hasAuthorization`, view lookup. | Source supports these guards. No RLS/live tenant integration was run, and tests use small fake clients to prove call ordering only. |
| No model tool calling. | `bolu-runtime.ts` uses deterministic intent matching; API accepts messages and bounded `contextFacts`; provider payload has no tools. | Confirmed limitation, not a PRD completion for draft FR-03. |
| 18 tests pass. | Test files inspected: tests cover context mapping, phrase classifier, tenant-ready/authorization gates, reducer behavior, and request bounds. | Historical report states 18 passed before last form-state field change. This audit did not run tests; that report itself says the final field addition was not rerun. Coverage does not prove runtime/API integration or BI result correctness. |

## Traceability matrix — 22 functional requirements

The PRD does not assign priorities. Each row states “Not stated”. Results below refer to the draft PRD, not approved Bolu scope.

| ID | PRD section | Requirement summary | Priority | Source / symbol | Test / evidence | Audit result | Remaining work / blocker |
|---|---|---|---|---|---|---|---|
| FR-01 | `functional-req.md` §3 | Assistant entry on new invoice form; sheet and form visible at 360 px; hidden when toggle off. | Not stated | `DashboardAssistant`; `AssistantSheet`; no form adapter | No matching test. | PARTIAL | Dashboard launcher and sheet exist, but not invoice-form entry, split visibility, or toggle. Scope conflict. |
| FR-02 | §3 | Stream reply and update form before completion; network error resets state. | Not stated | `bolu-transport.ts`, `api/bolu-chat.ts`, `bolu-runtime.ts` | No AMD/provider stream test. | PARTIAL | SSE text plumbing exists. No form stream updates. Live provider contract and <2 s gate unverified. |
| FR-03 | §3 | Fixed tool calls only; reject free JSON and non-tool writes. | Not stated | `bolu-runtime.ts`, `api/bolu-chat.ts` | `bolu-capabilities.test.js` only tests local intent classification. | NOT IMPLEMENTED | No provider tool schemas/parser or form-write capability. |
| FR-04 | §3 | One accept/reject card per tool call; apply once. | Not stated | No production component. | No matching test. | NOT IMPLEMENTED | Change cards only exist in Design Lab simulation; frozen. |
| FR-05 | §3 | App calculation authority; no model-calculated or writable totals/tax. | Not stated | `bolu-data.ts`; `invoice_financials_v`; `formatNaira` in sheet | `bolu-data.test.js` checks authorization/readiness only. | PARTIAL | Read-only facts avoid calculation, but draft tool guard and M-04 tests absent. |
| FR-06 | §3 | App detects contradictions and asks which value is correct. | Not stated | No contradiction resolver. | No matching test. | NOT IMPLEMENTED | No authoring intent pipeline. |
| FR-07 | §3 | Title, notes, terms proposals as cards. | Not stated | No production implementation. | No matching test. | NOT IMPLEMENTED | No proposal defaults/cards. |
| FR-08 | §3 | Ask for missing required fields using invoice rules; do not invent. | Not stated | `bolu-runtime.ts` only rule-matches read intents. | No matching test. | NOT IMPLEMENTED | No form validation adapter. |
| FR-09 | §3 | Explicit filing instruction, preview confirmation, normal save path. | Not stated | No save code in runtime. | No matching test. | NOT IMPLEMENTED | No invoice mutation path; excluded by current read-only direction. |
| FR-10 | §3 | Ordered provider chain, failover classifications, Retry-After, provider identity, AMD Nigeria <5 s. | Not stated | `api/bolu-chat.ts`; `bolu-provider.ts`; old `chat.ts` unrelated to new runtime | `protocol.test.js` exercises legacy classification only. No live provider validation. | PARTIAL | Bolu uses only AMD, no failover, quota retry or provider readout. No live proof. |
| FR-11 | §3 | Dynamic quota readout from provider body/headers. | Not stated | No quota implementation. | No matching test. | NOT IMPLEMENTED | No quota API or settings UI. |
| FR-12 | §3 | Add/remove/test keys; private native file; browser session memory; masking. | Not stated | Legacy `keys.ts`; new server env `BOLU_AMD_API_KEY` | No Bolu key management test; implementation report says key not configured locally. | PARTIAL | Server secret boundary exists in code; key configuration UX/removal/test/masking absent for Bolu. |
| FR-13 | §3 | Off by default, named-provider privacy disclosure and consent. | Not stated | No consent/toggle in provider or sheet. | No matching test. | NOT IMPLEMENTED | A cloud provider request can occur without assistant-specific consent. Product/provider approval is unresolved. |
| FR-14 | §3 | Assistant failure/offline does not block normal invoice form; draft kept. | Not stated | `bolu-runtime.ts` fallback to verified facts after provider failure | No form degradation integration test. | PARTIAL | Factual fallback exists after data retrieval; no invoice authoring integration or proof the form is unaffected. |
| FR-15 | §3 | Settings toggle off by default controls UI and calls. | Not stated | No Bolu settings toggle. | No matching test. | NOT IMPLEMENTED | Toggle absent. |
| FR-16 | §3 | Guardrails G1–G8. | Not stated | See guardrail table above. | Static review only. | PARTIAL | Individual results are in §Guardrails. |
| FR-17 | §3 | Generic assistant/tool architecture outside invoice module; second document can provide another list. | Not stated | `src/lib/ai-assistant/bolu-*`; shared `AssistantSheet` | No multi-form adapter or tool-list test. | PARTIAL | Runtime is outside invoice module and reads invoice/quotation, but tool lists and write adapters are not generic because they do not exist. |
| FR-18 | §3 | Catalog of 14 providers with models, one-key setup, badges/selection. | Not stated | `providerRegistry.ts`, `providerCatalog.ts`; Bolu provider config is one AMD row. | Static old catalog only. | PARTIAL | Catalog exists outside Bolu runtime. Bolu does not use the catalog or expose its setup controls. |
| FR-19 | §3 | Declared model list plus live `/models` discovery and merge rules. | Not stated | Registry lists declared models; Design Lab helper simulates discovery. | No Bolu discovery test. | NOT IMPLEMENTED | No production model discovery. |
| FR-20 | §3 | Model pill selects provider/model across layouts. | Not stated | None in Bolu production UI. | No matching test. | NOT IMPLEMENTED | No production pill. |
| FR-21 | §3 | Custom OpenAI-compatible provider form and validation. | Not stated | `validateCustomProvider` in old registry; Design Lab preview. | No Bolu production test. | NOT IMPLEMENTED | No custom provider controls in Bolu. |
| FR-22 | §3 | Four shared-state viewport shells and listed stream/composer interactions. | Not stated | Production sheet is one bottom sheet; four shells in Design Lab only. | No production responsive tests. | NOT IMPLEMENTED | The production sheet does not meet the four-layout or IME acceptance criteria. |

## Traceability matrix — FR-16 guardrails

| ID | Exact rule | Implementation evidence | Audit result | Note |
|---|---|---|---|---|
| G1 | `src/lib/Calculations.ts` unchanged. | No import/write in Bolu files; no change in audit scope. | VERIFIED COMPLETE | Static only. |
| G2 | No PDF renderer changed. | No PDF renderer in implementation files. | VERIFIED COMPLETE | Static only. |
| G3 | Model writes only through tool list. | No tool protocol or form writer exists. | NOT IMPLEMENTED | Current read-only capability does not perform form writes. |
| G4 | Model never writes computed field. | No model-to-form write path; calculations are not delegated. | VERIFIED COMPLETE | For current read-only implementation only. |
| G5 | Model never saves. | No save call/RPC imported by Bolu. | VERIFIED COMPLETE | Static only. |
| G6 | Model never invents missing value. | System prompt discourages invention; model prose is not validated. | PARTIAL | Prompt is not a correctness guarantee. |
| G7 | Every accepted change visible before save. | No change or save operation. | NOT IMPLEMENTED | No change-card path exists. |
| G8 | No assistant data written to tenant DB during trial. | In-memory conversation; read-only tenant queries; no assistant write call. | VERIFIED COMPLETE | Static only; no deployed trial audit. |

## Roadmap reconciliation

`Waterfall-roadmap.md` keeps its stage order and historical content. A dated section was added with stage statuses and the prerequisite decision. The synchronized HTML representation received a matching summary section. No decision-log entry was changed.

| Stage | Reconciled status | Reason |
|---|---|---|
| G-0 Readiness | BLOCKED | Keys, gateway, network evidence, import baseline, approved consent/defaults, and scope decisions are not evidenced. |
| A Engine | PARTIAL | A shared read-only runtime/context/API exists. The draft provider chain, quota, tool loop, key UI, generic adapter and gate evidence are absent. |
| B Invoice pack | NOT IMPLEMENTED | Read existing invoices is not invoice creation. |
| C Quotation pack | NOT IMPLEMENTED | Search/read exists, but no creation pack. |
| D Operations packs | NOT IMPLEMENTED | No PO, waybill or CSR write packs. |
| E Text/read packs | PARTIAL | Invoice, quotation and receivables reads exist; the rest are absent. |
| F Breadth gate | BLOCKED | Depends on all prior gates and acceptance evidence. |
| G Trial | NOT IMPLEMENTED | No approved toggle/consent, device validation, or measurements. |
| H Decision | NOT IMPLEMENTED | No trial data or owner decision. |

The controlling blocker is product authority: the PRD/roadmap remain drafts and describe creation, while the later product direction is read-only BI. The next actionable task is owner approval of the governing Bolu specification. No implementation task should start from this reconciliation alone.

## Scope changes

- Roadmap source updated: `docs/prd/conversational-document-assistant/Waterfall-roadmap.md`.
- Confirmed maintained mirror updated: `docs/prd/conversational-document-assistant/roadmap.html`.
- Audit report created: `docs/reports/ai/2026-11-13-bolu-prd-compliance-audit.md`.
- PRD and decision log were not modified.
- No source, tests, schema, migrations, configuration, or Design Lab files were modified by this audit.

## Verification restrictions and Git status

- `bun run build`: not run.
- `bun run typecheck`: not run.
- `bun run lint`: not run.
- `bun run test`: not run.
- Database commands/provider requests: not run.
- Initial Git status: branch `main`, ahead of `origin/main` by 8 commits. Pre-existing entries included a modified `docs/prd/conversational-document-assistant/decision-log.md`, modified production assistant files, numerous modified/untracked Design Lab files and assets, reports, scratch deletions/artifacts, and tests. These were treated as pre-existing and were not edited by this audit.
- Final Git status: recorded after the documentation changes. This audit added only `docs/reports/ai/2026-11-13-bolu-prd-compliance-audit.md` and modified only `docs/prd/conversational-document-assistant/Waterfall-roadmap.md` and `docs/prd/conversational-document-assistant/roadmap.html`. Pre-existing `decision-log.md`, application source, tests, Design Lab files, and scratch entries remain in the final status and were left untouched.
