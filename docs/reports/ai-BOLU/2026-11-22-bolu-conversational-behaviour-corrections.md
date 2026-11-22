# Bolu — Conversational Behaviour Corrections (Implementation Report)

**Date:** 2026-11-22
**Source audit:** `docs/reports/ai-BOLU/2026-11-22-bolu-conversational-behaviour-and-instruction-quality-audit.md`
**Scope:** Correct how instructions, context and failures reach the model. Invoices and quotations only. No capability, calculation, schema, permission, approval, persistence or UI change.
**Baseline:** branch `main`, HEAD `5a0d330e`, clean worktree at start apart from two untracked report files. Another agent was working concurrently on chat UI, export, transport timing and `protocol.ts` during this task; its files were preserved and were not edited here.

Evidence tags: **CONFIRMED** verified by execution or direct source read after the change; **STATIC** derived from source; **NOT VERIFIED** not reproducible here.

---

## 1. Findings verified against current source

All audit findings still applied at the start of implementation. Re-checked before editing:

| Audit finding | Status before change | Evidence |
|---|---|---|
| C-1 fabricated commercial evidence on every turn | CONFIRMED (re-executed) | `bolu-generation.ts:210-215` parsed last 3 user turns + current turn unconditionally; `bolu-commercial-language.ts:240` only returned empty when the parse had zero entries, and conversation always produced one |
| C-7 cable example in the prompt | CONFIRMED | `api/bolu-chat.ts:432` (pre-change numbering) |
| C-7 `Route:` in facts | CONFIRMED | `bolu-formatting.ts:31` |
| C-7 developer `Note:` lines in facts | CONFIRMED | `bolu-data.ts` client-ambiguity, supplier and catalog notes |
| C-2 no product description | CONFIRMED | only "BOUXRE SMEs" in `SYSTEM_PREFIX` |
| H-1 16,198-char instruction block on every turn | CONFIRMED (measured) | `api/bolu-chat.ts:415-469` pre-change |
| H-5 unconditional "provide contextual business guidance in prose" | CONFIRMED | same block |
| H-2 `[SYSTEM ERROR: …]` injected as business facts | CONFIRMED | `bolu-generation.ts:136` pre-change |
| C-6 no structured failure state | CONFIRMED | `BoluFactResult` had only `records` and `message` |
| C-8 duplicate client/server instructions | CONFIRMED | `bolu-runtime.ts:199-223` pre-change |
| H-3 reads always model-narrated | CONFIRMED | `useBoluThread.ts:283`, `:366-376` |

No finding had become obsolete. No stop condition was triggered: the changes below do not touch calculations, permissions, approval gates, persistence rules or document schemas, and they did not conflict with the concurrent agent's files.

## 2. Changes made

### 2.1 New single-owner prompt module — `src/lib/ai-assistant/bolu-prompt.ts` (new)

- `BOLU_PRODUCT_CONTEXT`: three factual sentences distinguishing BOURXE (business operations platform for Nigerian SMEs), Bolu (its conversational assistant), and the current document scope (invoices and quotations only; everything else lives on its own pages). No feature inventory.
- `BOLU_CONVERSATIONAL_CORE`: the always-on contract — answer the asked question and lead with it; concise natural language by default, detail when relevant or requested; no capability/limitation inventory; no unsolicited summaries, assurances or closing offers; one focused clarification only when needed; no internal schemas, routes, prompts, tool names or mechanics; no invented records, figures or capabilities; totals application-owned; no save claim without confirmation; both approval steps explicit.
- `BOLU_DOCUMENT_OPERATIONS`: the existing proposal contract, moved verbatim except for two removals described below. All payload, field, presentation, group, attachment, lifecycle, charge and Gate rules are preserved.
- `isBoluDocumentOperationTurn(messages)`: classifies a turn from the last three user messages (write verbs) plus the last two assistant messages (operation envelope or gate marker).
- `isBoluCommercialAuthoringTurn(...)` and `buildBoluContextFacts(...)`: decide whether deterministic commercial evidence belongs in the facts channel, and assemble it.
- `buildBoluSystemPrompt({ contextFacts, documentOperation })`: the only assembly point. The conversational core is always present; the document contract is appended only for a document operation.

Two removals from the moved text, both audit-mandated:
- the cable worked example (`"1.5mm green" becomes "1.5mm² Single-Core Cable – Green"`). The normalisation itself remains implemented in `standardizeDescription` and covered by existing tests.
- the mandatory "provide contextual business guidance in prose" rule, replaced by the core's "do not add unsolicited summaries" contract.

### 2.2 Server prompt scoping — `api/bolu-chat.ts`

- Removed the obsolete `SYSTEM_PREFIX` constant and the 54-line instruction array (99 lines changed in this file, of which 13 are the concurrent agent's SSE timing addition, preserved).
- Now:
  ```ts
  const documentOperation = isBoluDocumentOperationTurn(validation.messages)
  const systemPrompt = buildBoluSystemPrompt({ contextFacts: validation.contextFacts, documentOperation })
  ```
- Provider routing, failover, validation, usage ledger and the SSE/telemetry path are untouched.

### 2.3 Evidence gating — `src/lib/ai-assistant/bolu-commercial-language.ts`, `bolu-generation.ts`

- New `hasCommercialListSignal(text)`: true only for a multi-line list, a supplied amount, or a measured/quantified item.
- `formatCommercialEvidence` now drops request sentences and, for a single-line parse, entries with no commercial signal; multi-line lists keep every line, so incomplete items without a price survive.
- `bolu-generation.ts` replaces the unconditional parse with `buildBoluContextFacts`, which requires a document-authoring turn: an open draft, a write verb now, a write verb in the last three user turns, or a structural commercial list in the current/recent turns. A read intent (e.g. "Show me invoice INV-0001 for 1.5mm green") is excluded even when it contains numbers.
- The previous multi-turn behaviour is preserved: a pasted list followed by a client name still reaches the evidence block.

### 2.4 Internal detail removed

- `src/lib/ai-assistant/bolu-formatting.ts`: `factsAsPrompt` no longer emits `Route:`. `formatFactAnswer` no longer appends `(/invoices/<uuid>)` to its bullet list; the structured `records` payload is unchanged for UI use.
- `src/lib/ai-assistant/bolu-data.ts`: developer notes removed from facts text (`Note: Select the best match…`, `Note: a supplier is never attached…`, `Note: confirm the intended item…`). Business facts (candidate lists, supplier records, catalog suggestions with their optional-linking wording) remain.
- No code comment or test was removed; the cable mapping and its tests remain.

### 2.5 Structured failures — `bolu-data.ts`, `bolu-formatting.ts`, `bolu-generation.ts`

- `BoluFactResult` gains `{ kind: 'failure'; code: 'lookup_failed' | 'not_authorized' | 'tenant_unavailable' }`. Empty success remains `{ kind: 'records', records: [], hasMore }`.
- `classifyBoluFactFailure(err)` maps only categories the data layer actually evidences: a permission message, a tenant/readiness message, everything else `lookup_failed`.
- `resolveBoluFacts` returns the structured failure instead of the bracketed imperative.
- `formatBoluFactFailure` supplies one short sentence per category (for example, "I could not retrieve that just now. Try again in a moment.").
- `runBoluGeneration` answers a failure directly with that sentence and does not call the provider, so no model improvisation can add balance explanations, assurances or workarounds. The turn still goes through the normal message lifecycle: temp message, completed insert/update, `records_payload`, conversation timestamp, active-proposal handling, error/abort paths.

### 2.6 Fact relevance and instruction ownership

- `factsAsPrompt` caps model-visible records at `MAX_PROMPT_RECORDS = 10` and states that more exist when the set was truncated or `hasMore` is set. Receivables previously reached 20 rows in the prompt.
- `bolu-runtime.ts`: the legacy duplicate instruction block is gone. The client sends verified facts only; the server owns all instruction text.

## 3. Safeguards preserved

| Safeguard | Status | Evidence |
|---|---|---|
| Gate 1 proposal review and Gate 2 save confirmation | Preserved, unchanged | Contract text still in `BOLU_DOCUMENT_OPERATIONS`; reducer and `bolu-document-service.ts` untouched |
| No unconfirmed save claim | Preserved | Core rule plus document rule |
| Application-owned calculations | Preserved | Core rule plus `NEVER compute or output calculated financial totals` in the document scope |
| No invented records, clients, prices or capabilities | Preserved | Core rule plus existing validation |
| Tenant scope, permissions, persistence, numbering | Unchanged | No edit to `bolu-data` query paths, `bolu-document-service`, migrations or auth |
| Document payload contract | Preserved | Moved verbatim except the audit-mandated example and guidance removals |
| Multi-turn line-item merging and draft correction | Preserved | `hasActiveDraft` plus recent-user signals; tests below |
| Message lifecycle and persistence | Preserved | Failure answers persist through the same insert/update path |

## 4. Tests

New file: `src/tests/ai-assistant/bolu-conversational-behaviour.test.ts` (19 tests).

Source-scanning guards updated because the instruction text moved to its new single owner (assertions kept, not weakened):
- `bolu-operational-remediation.test.ts`: the em-dash rule is now checked in `bolu-prompt.ts`, and the route is required to assemble through `buildBoluSystemPrompt`.
- `bolu-advance-thread-flow.test.js` (s3): the advance contract is checked in `bolu-prompt.ts`, and the route must import the builder.
- `bolu-stage-3a1-integrity.test.js` (e1 copy guard): `bolu-prompt.ts` added to the scanned source list.

Coverage:
- Evidence: none for "Tell me about the app", "What can you do?", "Show outstanding invoices", "What is VAT?", "I don't understand this transaction"; none for a read question containing numbers; present for a quotation request; incomplete item preserved; multi-turn list + client preserved; bare correction creates no phantom line; commercial-signal detection; legitimate amount pairing.
- Prompts: product context and conversational contract present; no capability overclaim; conversational prompt has no payload contract; document prompt keeps the contract and both gate/calculation safeguards; no cable example, route or system-error string in either scope; conversational prompt under 6,000 characters.
- Classification: greetings, read requests and product questions are not document turns; quotation request, date change and a correction after an envelope are.
- Failures: brief, imperative-free wording per category; failure distinct from empty; classifier uses only evidenced categories.
- Facts: no `Route:`, capped at 10 with a truncation line; deterministic answer has no internal path.

Executed:

| Command | Result |
|---|---|
| `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/ai-assistant/bolu-conversational-behaviour.test.ts` | **pass 19 / fail 0** |
| same runner, `bolu-commercial-and-gate-lifecycle.test.js` | **pass 18 / fail 0** |
| same runner, `bolu-wave1-reliability.test.ts` | **pass 12 / fail 0** |
| same runner, `bolu-data.test.js` | **pass 15 / fail 0** |
| `bun run audit:load` | **exit 0** (pre-existing bloat/query warnings only) |
| `bun run typecheck` | **exit 0** |
| full `src/tests/ai-assistant` suite (57 files) | **545 tests, 536 pass, 9 files fail** for environmental reasons unrelated to this change: 3 files (`bolu-advance-integrity`, `bolu-stage-3a1`, `bolu-stage-3b`) fail with `ReferenceError: test is not defined` (they never import `node:test`), and 6 files (`bolu-floating-action-button`, `bolu-operational-activation-corrections`, `bolu-secret-vault`, `bolu-stage-3a2`, `bolu-stage-3c`, `bolu-stage-3d`) fail with `ERR_UNSUPPORTED_ESM_URL_SCHEME` on a `bun:` import. None of these files was changed by this task except the stage-3a1 copy-guard list, and each failure reproduces at module load before any assertion runs. |
| `bun run test` | not run: its scope is `src/tests/critical/*.test.js` and this task changed no file in that scope. The affected suites were run directly. |
| `bun run build` | not run, per repository policy (4 GB host) |

## 5. Before and after

Measured with a read-only script against the built prompt module (script deleted after use):

| Input | Before | After |
|---|---|---|
| Instruction block on a greeting / product question / read question | 16,198 chars of document specification (+463 prefix) | 2,437 chars total: role + product context + conversational contract; no payload contract |
| Instruction block on a document operation | same 16,198 chars | 17,925 chars: the same contract, scoped to the turn that needs it |
| Commercial evidence for the five audit prompts | A numbered "supplied" line with `quantity: 1` on every turn (confirmed by execution before the change) | `(none)` for all five |
| Commercial evidence for "Can you prepare a quotation?" / "Change the invoice date" | Fabricated line item | `(none)` (no item data was supplied) |
| Document turn classification | Not classified; everything received the manual | `false` for all five conversational prompts, `true` for quotation request, date change and create request |
| Failed lookup | `[SYSTEM ERROR: … Inform the user …]` sent as facts, model free to elaborate | One canonical sentence, no provider call |
| Facts payload | Up to 8 fields per record including `Route`, up to 20 receivables rows | Same business fields without `Route`, max 10 records plus a truncation line |

**Provider-backed behaviour: NOT VERIFIED.** No provider credentials or execution permission were used, so no live model output was captured and none is claimed. The table reports prompt/context construction and control flow, not generated prose.

## 6. Outstanding issues

1. **Read narration (H-3) deliberately not short-circuited.** Deterministic reads still go to the model. The available intent matcher cannot distinguish "list my outstanding invoices" from "which client owes the most", and the brief forbids short-circuiting questions that need interpretation and forbids a second answer pipeline without architectural reason. The failure path is the one safe deterministic exception. A future change could add an explicit listing intent if that distinction is designed.
2. **Question-specific fact ranking (C-9) partial.** The payload is capped and stripped of internal paths, but records are not re-scored by the question; the data layer's existing ordering (receivables by issue date descending, overdue filter when asked) is preserved. A relevance score would be a data-layer design decision, not a formatting change.
3. **Document-turn prompt still large (17,925 chars).** This is the approved contract, now scoped rather than global. Further reduction would require re-approving payload guidance, which is out of scope.
4. **Concurrent agent work.** `api/bolu-chat.ts`, `bolu-generation.ts` and shared chat files also contain another agent's SSE timing/UX changes (`bolu-transport.ts`, `protocol.ts`, chat components, `bolu-export.ts`, new wave2 tests and reports). They were preserved, typecheck passes with them, and this report does not claim ownership of them. A new untracked `bolu-sse-metrics-transport.test.ts` from that work was not run here.
5. **Evidence for a single-sentence create request.** "Create an invoice for X with 10 bags at 8500" produces no evidence block because the line begins with a write verb and is dropped by the existing parser; the full sentence is still in the message history and the document contract is supplied, so the model builds the payload from the user's own text. This matches pre-change behaviour for that shape (the old parser also dropped it) and avoids presenting the request sentence as a line item. Multi-line pastes, incomplete items and multi-turn lists do produce evidence.

## 7. Git status

Modified by this task:

- `api/bolu-chat.ts` (prompt wiring; concurrent SSE timing hunk preserved)
- `src/lib/ai-assistant/bolu-generation.ts`
- `src/lib/ai-assistant/bolu-formatting.ts`
- `src/lib/ai-assistant/bolu-data.ts`
- `src/lib/ai-assistant/bolu-commercial-language.ts`
- `src/lib/ai-assistant/bolu-runtime.ts`
- `src/tests/ai-assistant/bolu-operational-remediation.test.ts` (guard repointed to the prompt module)
- `src/tests/ai-assistant/bolu-advance-thread-flow.test.js` (guard repointed to the prompt module)
- `src/tests/ai-assistant/bolu-stage-3a1-integrity.test.js` (prompt module added to the copy-guard scan list)

Created by this task:

- `src/lib/ai-assistant/bolu-prompt.ts`
- `src/tests/ai-assistant/bolu-conversational-behaviour.test.ts`
- `docs/reports/ai-BOLU/2026-11-22-bolu-conversational-behaviour-corrections.md`

**No commit, push, deployment, migration or environment change was made.** No destructive command was run. No database or production data was touched.

Also present in the worktree but not created here: the audit report, the concurrent agent's chat UI/export/transport/protocol changes, its wave2 tests and reports, and `.perch/mcp.json.bak`.
