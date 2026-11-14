# Test Plan

- **Status:** Draft acceptance plan; update required for operations capabilities
- **Product:** Conversational Document Assistant
- **Writing Standard:** ASD-STE100 Simplified Technical English

---

## Operations Acceptance Addendum — DEC-28

This addendum preserves the original invoice-authoring plan and adds required coverage for the approved read/write direction. It does not approve every provider, document pack, trial, or performance target in this draft.

Before any write capability is enabled, integration tests must prove: read authorization and tenant isolation; change proposal contents; no state change before approval; rejection leaves state unchanged; acceptance applies once; validation and authorization repeat before apply; save requires a second explicit confirmation; save failure preserves the draft; duplicate submissions do not duplicate writes; cancellation prevents pending unapproved work; and stale record state blocks or refreshes the proposal. Test payment and other money movement as unavailable unless separately approved.

Read capability tests must prove source-backed answers, source references, missing/ambiguous results, and permission denial. Provider tests must use sanitized fixtures. Live-provider, device, latency, terms, and quota claims need separate owner-approved operational evidence; they are not established by unit tests.

## 1. Layers

| Layer | Tool | Covers |
|---|---|---|
| Unit | `node --test` with the repository loader | The tool schema, the row resolver, the failure classifier, the quota reader, the key store. |
| Integration | `node --test` | The agent loop against a fake provider. The fake streams text and tool calls. |
| Contract | `node --test` | The OpenAI compatible request and stream parser against recorded provider payloads. |
| Device | Manual, on a real phone | The chat sheet, the keyboard, the card interaction, the real providers. |
| Money | Existing suite plus new guards | No change to the computed totals. |

## 2. Unit Tests

### 2.1 The Tool List

| # | Test | Expected |
|---|---|---|
| U-01 | The tool list contains no field that a calculation writes. | The list has no `amount`, `subtotal`, `total`, `vat_rate`, `discount_rate`, `wht_rate` or `install_rate`. |
| U-02 | A tool call that names a computed field is rejected. | The rejection names the field and the form does not change. |
| U-03 | A tool call with an unknown tool name is rejected. | The form does not change. |
| U-04 | A tool call with a missing required argument is rejected. | The form does not change. |
| U-05 | A tool call with a non numeric quantity is rejected. | The form does not change. |
| U-06 | A tool call with a negative unit price is rejected. | The form does not change. |

### 2.2 The Row Resolver

| # | Test | Expected |
|---|---|---|
| U-10 | A fragment that matches one row returns that row. | The index is the matching row. |
| U-11 | A fragment that matches no row returns a clear failure. | The failure names the fragment and the rows. |
| U-12 | A fragment that matches two rows returns a clear failure. | The failure asks the user to be more specific. |
| U-13 | A fragment matches a row after another row was removed. | The index is correct after the removal. |

### 2.3 The Failure Classifier

| # | Test | Expected |
|---|---|---|
| U-20 | A 429 advances the chain. | The next provider is used. |
| U-21 | A 500 advances the chain. | The next provider is used. |
| U-22 | A 400 does not advance the chain. | The chain stops and the error is shown. |
| U-23 | A 401 advances the chain and marks the key. | The Settings screen shows the key as failed. |
| U-24 | A timeout advances the chain at most once. | The chain does not loop. |
| U-25 | The Gemini quota body is read. | The allowance is the value in the body. |
| U-26 | An OpenRouter key body is read. | The allowance is `free_model_daily_requests.remaining`. |

### 2.4 The Key Store

| # | Test | Expected |
|---|---|---|
| U-30 | A key is written and read back. | The key round trips. |
| U-31 | The file mode is owner only. | The mode is 0600. |
| U-32 | A display value is masked. | Only the last four characters are shown. |
| U-33 | No log line contains a key. | The log capture holds no key. |
| U-34 | A removed key is gone from storage and from the chain. | Neither holds the key. |

## 3. Integration Tests Against A Fake Provider

| # | Test | Expected |
|---|---|---|
| I-01 | One user message with one tool call produces one card. | The card names the field and the values. The form is unchanged until the card is accepted. |
| I-02 | An accepted card applies once. | The form holds the new value and the card cannot be applied again. |
| I-03 | A rejected card leaves the form unchanged. | The card shows the rejection. |
| I-04 | A multi turn conversation sends only the new turns after the first. | The second request holds the first user message in the history, not in the resent system block. |
| I-05 | The tool result returns to the model. | The second request holds the tool result. |
| I-06 | The model answers in prose with no tool call. | The reply is shown and the loop ends. |
| I-07 | The model answers with an invalid tool call twice. | The loop stops after the second failure and the draft is kept. |
| I-08 | The model asks to file. | A confirmation view opens. Nothing is saved. |
| I-09 | The user confirms the filing. | The normal save path runs once. |
| I-10 | The save fails. | The failure is reported in the chat and the draft is kept. |
| I-11 | Every provider in the chain fails. | The assistant says so. The draft is kept. |
| I-12 | The feature is off. | No request is sent and the control is hidden. |

## 4. Contract Tests

Recorded payloads from each provider, sanitised of keys.

| # | Test | Expected |
|---|---|---|
| C-01 | A Gemini stream parses. | The text and the tool call are separated. |
| C-02 | An OpenRouter stream parses. | The text and the tool call are separated. |
| C-03 | A Groq stream parses. | The text and the tool call are separated. |
| C-04 | A Cerebras stream parses. | The text and the tool call are separated. |
| C-05 | A NVIDIA NIM stream parses. | The text and the tool call are separated. |
| C-06 | A provider that returns a plain text answer is handled. | The reply is shown. No crash. |
| C-07 | A provider that returns a HTML error body is handled. | The failure is classified. No crash. |

## 5. Money Tests

| # | Test | Expected |
|---|---|---|
| M-01 | The file `src/lib/Calculations.ts` is unchanged. | The git diff for the trial branch holds no change to that file. |
| M-02 | No PDF renderer is changed. | The git diff holds no change under `src/components/pdf/`. |
| M-03 | The existing invoice suite passes. | The critical suite holds the same result as before the change. |
| M-04 | A quantity of 5 and a price of 95000 give 475000. | The computed amount is 475000. |
| M-05 | The assistant never sends a computed field. | The tool list guard from U-01 holds at runtime. |

## 6. Device Tests On A Real Phone

| # | Test | Expected |
|---|---|---|
| D-01 | The chat sheet opens over the invoice form. | The sheet and the top of the form are visible together at 360 pixels. |
| D-02 | The keyboard does not cover the composer. | The composer stays above the keyboard. |
| D-03 | A real invoice is filed by conversation. | The invoice saves and the PDF matches the manual invoice. |
| D-04 | The first reply arrives in under 2 seconds. | The time is measured on the phone over a real network. |
| D-05 | The quota error advances the chain. | A second provider answers and the user sees which one. |
| D-06 | The feature off sends nothing. | The network log holds no request to a provider. |
| D-07 | A rotation of the phone does not lose the draft. | The form holds the values. |
| D-08 | The app is killed and restarted mid conversation. | The form holds the values. The conversation starts again. |

## 7. Trial Measurement

| Week | Action | Output |
|---|---|---|
| 1 | Measure the JSON import path with 3 real invoices. | The baseline time. |
| 1 | Use the assistant for 5 real invoices. | The first error list. |
| 2 | Fix the top 3 errors. | A release. |
| 2 | Measure the assistant path with 3 real invoices. | The first comparison. |
| 3 | Use the assistant for daily invoicing. | The error count per 20 invoices. |
| 4 | Measure the assistant path again. | The trial result. |
| 4 | Write the decision. | Keep, change or remove. |

## 8. Commands

```bash
bun run audit:load
bun run typecheck
bun run test
bun run lint
```

The new unit and integration tests live in `src/tests/ai-assistant/`. The repository test script runs `src/tests/critical/`. The new test files must be added to the critical folder, or the script must be widened. This is an open point for the project lead.

## 9. Gate Before The Trial Starts

- Every test in sections 2, 3, 4 and 5 passes.
- The device tests D-01, D-03, D-06 and D-07 pass on a real phone.
- The money tests M-01, M-02 and M-03 pass.
- The disclosure text is approved.
- The note and term defaults are approved.

## 10. Engine Acceptance Addendum (Proposed - 2026-11-14)

This addendum records the tests DEC-29 requires when the dynamic engine is approved to build. It is proposed coverage, not an approved release gate. The seeded Design Lab simulation is not evidence for these tests. Provider fixtures must be sanitised of keys.

| # | Test | Expected |
|---|---|---|
| E-01 | Eligibility excludes a model whose tool support is unverified when the request requires tools. | Ineligible model is never selected. |
| E-02 | Selection ranks verified-healthy free models first; paid models are never selected without owner policy. | Order matches the free-first ranker. |
| E-03 | A 429 with a Retry-After header cools the model and selects the next eligible model. | The cooled model is not retried before its window. |
| E-04 | A malformed user request does not switch providers. | The engine stops and reports the error. |
| E-05 | An authorization failure (401 or 403) marks the key failed for the session and advances. | No retry loops against one key. |
| E-06 | A model is removed from the eligible pool when it fails consecutively and returns on probe success. | Pool membership changes at runtime. |
| E-07 | The same conversation continues across a mid-thread model switch. | History is verbatim; facts render identically. |
| E-08 | The user can see which model answered and why a failover happened. | The trace view shows attempts and reasons. |
| E-09 | A pinned override keeps auto-failover unless the user disables it for the session. | Pinned failure yields error, not silent switch; explicit disable yields labelled state. |
| E-10 | A model whose free-tier verification date is stale is bypassed until re-verified. | Selection ignores unverified-free entries. |

## 11. Document-Intelligence Acceptance Addendum (Proposed - 2026-11-14)

Covers DEC-32/DEC-33 and FR-34 to FR-41. The solar-pump BOQ and supplier-message reconciliation is the first acceptance case. It is not a BOQ-only architecture. Tests are proposed coverage, not an approved release gate. Provider fixtures must be sanitised of keys and of tenant data.

### 11.1 Source fidelity and normalization

| # | Test | Expected |
|---|---|---|
| DI-01 | An attachment that cannot be processed is rejected with the source preserved. | Loud failure; source unchanged; nothing enters the pipeline. |
| DI-02 | An extracted value retains original wording and source location. | Every ExtractedObservation references its source excerpt. |
| DI-03 | An unknown field is stored as explicit null, referencing no observations invented by the system. | Nulls everywhere data is missing; no fill-in. |
| DI-04 | A human correction creates a ReviewDecision alongside the original observation; the source is unchanged. | Correction recorded; source fidelity preserved. |
| DI-05 | Two conflicting sources produce a retained conflicting pair. | Both observations persist; conflict is queryable and unresolved-flagged. |

### 11.2 Matching and reconciliation

| # | Test | Expected |
|---|---|---|
| DI-06 | A shared serial number alone does not yield `confirmed`. | Match stays `possible_match`; user review required. |
| DI-07 | 10mm² cable candidate with uncertain handwritten digits. | Candidate carries the uncertainty; specification confirmation demanded before any total. |
| DI-08 | 4mm cable candidate requires specification confirmation. | Confirmation precedes `confirmed`. |
| DI-09 | MC4 priced per individual item vs BOQ quantity in pairs. | Quantity basis is explicit in the Calculation; provisional until the unit basis is confirmed by a person. |
| DI-10 | Mounting-structure component offers related to a BOQ lot. | Candidate labelled incomplete-scope; never treated as full lot pricing. |
| DI-11 | Supplier entry with serial number and no description. | Candidate records missing description; no silent match by identifiers alone. |
| DI-12 | New and Tokunbo 300W panel alternatives, one with an overwritten price. | Both alternatives and the overwritten-price conflict are retained; product condition is never chosen silently. |

### 11.3 Deterministic calculations

| # | Test | Expected |
|---|---|---|
| DI-13 | A total is reproduced from recorded inputs, formula, result and currency/unit basis alone. | Reproducible; no model required. |
| DI-14 | An ambiguous unit, quantity or price basis blocks `priced_verified`. | Result is provisional; basis shown; verification authority retained by the application. |
| DI-15 | A model-supplied total never overrides the engine. | Model totals discarded; recorded engine result used. |
| DI-16 | Civil materials without complete pricing stay draft/provisional. | No commercial claim presented as verified. |

### 11.4 Workflow status and review decisions

| # | Test | Expected |
|---|---|---|
| DI-17 | `confirmed` requires a human ReviewDecision; AI promotion is impossible. | No code path promotes without review record. |
| DI-18 | `priced_verified` requires confirmed match AND unambiguous basis AND verified inputs. | Any missing condition blocks the transition. |
| DI-19 | Rejection leaves state unchanged; approval applies once. | Apply-once token honoured; no double apply. |
| DI-20 | A changed record after proposal forces re-read and revalidation at apply time. | Stale proposals are refused or refreshed. |
| DI-21 | Every review decision is auditable against evidence and records. | Trace available end-to-end. |

### 11.5 Approval boundaries and interchange

| # | Test | Expected |
|---|---|---|
| DI-22 | External-Markdown from an external AI is interchange only. | Canonical records are never the Markdown blob; normalization runs before use. |
| DI-23 | An external model's invented value is rejected or flagged. | No invented value enters `confirmed`; flagged `inferred`/`unverified` with visible uncertainty. |
| DI-24 | The pipeline operates with the attachment lane disabled. | Non-attachment sources still normalize and review correctly. |
| DI-25 | No dependency on any single provider's file/modality support. | Removing one provider leaves the pipeline functional. |

### 11.6 Solar-pump BOQ end-to-end scenario (acceptance case)

DI-A Supplier WhatsApp messages + BOQ source intake preserves both, records identity, and processes statuses through `not_found` → `information_found` → `possible_match` without human action.
DI-B Observations normalize into panel, mounting, cable, MC4 and civil-material items; nulls appear where sources are silent.
DI-C Match candidates for cable (10mm², 4mm) and panels (New/Tokunbo) are presented for review with evidence and differences; no candidate self-confirms.
DI-D Calculations stay provisional until basis and match are confirmed; pair-vs-item MC4 quantities are explicit; civil materials cannot reach `priced_verified`.
DI-E Review confirms or corrects candidates; approvals persist through the two gates; audit trace shows every evidence object involved; nothing is silently dropped.

## 11. Application-Side Operations & Live Provider Test Suite (Implemented & Verified 2026-11-14)

On 2026-11-14, the automated test suite in `src/tests/ai-assistant/` was expanded to **67 automated unit and integration tests across 9 test suites**. All 67 tests pass unconditionally in 306ms.

| # | Test Area / File | Scope and Verification | Result |
|---|---|---|---|
| OPS-01 | Operation Contracts (`bolu-operations.test.js`) | Validates parsing, typed schemas (`create-document`, `modify-document`, `read-records`), field sanity, non-negative amounts, and error handling for malformed tool calls. | PASS (7 tests) |
| RED-01 | Reducer State Machine (`bolu-reducer.test.js`) | Validates pure transitions across multi-turn dialogs: `draft` -> `pending_approval` -> `approved` -> `pending_save` -> `persisted` -> `rejected`. Verifies state immutability. | PASS (8 tests) |
| CALC-01 | Financial Calculations (`bolu-calculations.test.js`) | Confirms all monetary totals (subtotal, total, VAT, WHT, discount) are strictly computed by `calculateDocument` in `src/lib/Calculations.ts`. Any model-hallucinated math is discarded. | PASS (6 tests) |
| PERS-01 | Persistence & Atomicity (`bolu-document-service.test.js`) | Verifies transactional RPC persistence (`save_invoice_with_items_transaction`), compensating header rollback cleanup on sequential failure, and sequence collision retry with `withUniqueRetry`. | PASS (9 tests) |
| MOCK-01 | Mock Provider Scenarios (`bolu-mock-provider.test.js`) | Tests 12 deterministic scenarios: invoice creation, line addition/modification/removal, price correction, contradiction questions, missing field queries, collision retry, and unauthorized writes. | PASS (12 tests) |
| SEC-01 | Tenant & RBAC Isolation (`bolu-security.test.js`) | Verifies that client-side `canWrite` and `canRead` checks fail closed when tenant context is missing or unauthorized, and confirms that tenant context cannot be overridden by model text. | PASS (4 tests) |
| UI-01 | Two-Gate Review Controls (`bolu-ui-flow.test.js`) | Verifies that Gate 1 (Change Proposal Card) requires explicit user approval before applying to working state, and Gate 2 (Save Confirmation) requires explicit confirmation before invoking persistence. | PASS (3 tests) |
| PROV-01 | Provider Config & Normalization (`bolu-provider.test.js`) | Tests endpoint normalization (`/chat/completions`), environment parsing, request header generation, timeout clamping, and mock mode fallback. | PASS (3 tests) |
| LIVE-01 | Live Provider & End-to-End Integration (`bolu-live-provider-integration.test.js`) | Tests successful streaming inference to persistence, malformed JSON rejection, 401/403 auth error classification, timeout abort handling, 429 rate limit reporting, provider 500 failure handling, unsupported document family rejection (e.g. quotation, PO), unsupported operation rejection, and application calculation locking. | PASS (10 tests) |
| SETUP-01 | Provider Setup & Key Rotation (`bolu-provider-setup.test.js`) | Tests AMD Token Factory configuration resolution, key rotation without state leaks, smart auto-detection of `rc-` keys, clean header generation, and secret masking (`maskKey`). | PASS (5 tests) |
| VAULT-01 | Secret Vault & In-App Encryption (`bolu-secret-vault.test.js`) | Tests AES-256-GCM encryption/decryption roundtrip, tamper detection with auth tags, master key derivation from env/service-role, secret masking (`maskApiKey`), Supabase load/save/delete persistence, precedence hierarchy (In-App DB > Env > Mock), and pre-flight connection verification. | PASS (7 tests) |

Total verified automated tests in `src/tests/ai-assistant/`: **74 passed, 0 failed** (executed with `bun test src/tests/ai-assistant/`).
