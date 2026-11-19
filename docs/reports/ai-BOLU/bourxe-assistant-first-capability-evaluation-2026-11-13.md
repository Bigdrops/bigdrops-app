# BOUXRE Assistant — First Capability Evaluation

This report was written by Buffy on 2026-11-13 via Freebuff.

## Objective

Evaluate candidate first capabilities for the BOUXRE AI assistant and recommend one for review. The recommendation uses the completed technical audit as primary evidence.

This is a product and architecture evaluation. It is not an implementation task and it does not issue an implementation prompt.

## Scope

In scope:

- Five candidate capability categories, assessed on value, workflow, reuse, risk, and scope.
- One recommended first milestone, with a complete end-to-end workflow.
- A ranked comparison, acceptance criteria, unresolved product decisions, and evidence gaps.

Out of scope:

- Application code, configuration, migrations, or migration changes.
- Changes to the untracked assistant experiment.
- Assistant identity, naming, avatar, or personality.
- A general repository re-audit.
- An implementation prompt.

## Evidence base

Primary source: `docs/reports/ai/bouxre-assistant-technical-capability-audit-2026-11-13.md`.

Specific files re-checked for this evaluation, because the candidate comparison depends on them:

| File | What it establishes |
|---|---|
| `src/modules/reports/repositories/reportRepository.ts` | `fetchInvoiceFinancials()` and `fetchProjectFinancials()` read tenant views through `tenantClient`. |
| `src/components/reports/reportTypes.ts` | `InvoiceFinancialRow` carries `total`, `vat`, `cash_received`, `wht_received`, `balance_due`, `computed_status`. |
| `supabase/migrations/20260809060000_invoice_financials_tenant_view.sql` | `GRANT SELECT ON %I.invoice_financials_v TO authenticated`; settlement is computed in SQL. |
| `src/hooks/useInvoiceDetailData.js` | Loads invoice, client, payments, `invoice_financials_v`, and items for one document. |
| `src/hooks/useInvoiceList.ts` | List query supports client filter, date range, sort, and pagination. |
| `src/hooks/useGlobalSearch.ts` | Resolves clients, projects, and document numbers with `ilike` limits. |
| `src/pages/view-quotation-actions.ts` | `loadQuotationViewData()`, `convertQuotationToInvoice()`; conversion is UI-free and idempotent. |
| `src/hooks/useQuotationActions.ts` | Conversion is wrapped in a user confirmation and navigates on success. |
| `src/pages/ViewQuotation.tsx` | `DocumentConfirmDialog` is the existing confirmation primitive. |
| `src/lib/formatters/money.ts` | `formatCurrency()` and `formatNaira()` exist. |
| `src/lib/tenant/contexts.tsx`, `src/lib/tenantClient.ts` | Tenant client and authorization context. |
| `src/lib/Calculations.ts` | Single source of truth for document math. |
| `src/lib/ai-assistant/protocol.ts` | Request body has four fields only; no tools. |

Boundary checks:

- No application file, configuration file, migration, or experimental file was modified.
- The untracked chat experiment is treated as a prototype. It is not approved production architecture.
- Prior PRDs and agent proposals are not treated as requirements.
- Small Drops is not used as identity or policy.

## 1. Executive Recommendation

**Recommendation: make the first milestone a read-only, grounded business assistant that answers questions about existing documents and receivables, cites the records it used, and opens them.** Label: PROPOSAL. This is not a decision.

Working name for this report only: "Ask BOUXRE".

The user asks a question in natural language. The assistant retrieves the relevant tenant records, quotes stored values, and links to the documents. It does not create, change, or send anything.

Why this one:

1. **It is genuinely useful.** The daily questions of an SME owner are record questions: who owes me, how much is overdue, what did I quote this client last month, what is the status of this project. The application can answer these from existing views and search, but only by hand.
2. **It is the smallest candidate that still requires real assistant behaviour.** The model must resolve intent, choose a retrieval path, handle ambiguity, combine several records, quote figures exactly, and refuse when the data is absent. That is the hard part of grounding, not a chat wrapper.
3. **It writes nothing.** There is no financial mutation, no numbering, no audit dependency, and no partial-write risk. The blast radius of a wrong answer is a wrong sentence, not a wrong invoice.
4. **It reuses the architecture that already exists.** Tenant-scoped reads, RLS, `search_documents`, `invoice_financials_v`, `project_financials_v`, `loadQuotationViewData()`, and deep links are all shipped.
5. **It builds the resolver that later actions need.** Any later action — conversion, payment, preparation — must first identify the right record. This milestone builds and proves that resolver.
6. **It has a clean acceptance test.** Scripted questions with figures that can be checked against `invoice_financials_v`, plus links that must open the right page.

Runner-up: **quotation-to-invoice conversion by instruction** (§2.2). It is the strongest action candidate and the natural second milestone. It is not first because it mutates a financial document, consumes a number, and permanently marks a quotation as converted. Those steps need a trusted resolver and a confirmation surface. The recommended milestone builds both.

## 2. Candidate Comparison

### 2.0 Summary table

| # | Candidate | User outcome | New write surface | Reuse | Relative scope | Risk | Demonstrates assistant |
|---|---|---|---|---|---|---|---|
| C1 | Grounded record Q&A with citations | Answers about documents and money | None | High | M | Low | Yes |
| C2 | Quotation → invoice by instruction | One bounded document operation | Existing RPC only | High | M | Medium | Yes |
| C3 | Natural-language invoice preparation | New draft invoice from text | Existing save path | Medium | L | High | Yes |
| C4 | Payment recording by instruction | Money recorded against an invoice | Existing RPC only | Medium | M | High | Yes |
| C5 | Single-document explanation | Answers about the open document | None | High | S | Low | Partly |

Scope key: S = days, M = one to two weeks of focused work, L = multi-week with new state and UI.

### 2.1 C1 — Grounded record search and questions (recommended)

**What the user can do.** Ask "Which clients owe me money this month?", "How much is outstanding on INV-1042?", "What did I quote Dangote in October?", "Show unpaid invoices older than 30 days." The assistant answers with figures and document references, and offers to open the record.

**End-to-end workflow.** See §3. In short: text → intent and slot extraction → tenant-scoped retrieval → application-formatted facts → answer with citations → deep link.

**Existing support.** `search_documents` for ranked document lookup; `invoice_financials_v` for balances and computed status; `project_financials_v` for project outstanding; `useInvoiceDetailData.js` for one document; `useGlobalSearch` for client and project name resolution; `formatNaira()` for money presentation.

**Missing.** A model transport that can request data (the current prototype sends only `model`, `messages`, `stream`, `max_tokens`); a fact-formatting layer; a citation and link contract; a production key-custody decision.

**Permission and tenant isolation.** Every read goes through `tenantClient` from `useEntity()`, so the tenant schema and RLS apply unchanged. The assistant must never accept a schema, entity id, or tenant id from the model or the user. `search_documents` runs with caller rights, so it inherits RLS.

**Data integrity.** Read-only. Figures come from the database view, not from the model. The model may not add, subtract, or infer an amount that the application did not supply.

**Failure and recovery.** No data → say so. Ambiguous client → ask one disambiguating question. Provider failure → plain error, no partial answer. Tenant not provisioned → the existing `TenantGate` blocks the surface.

**Scope and complexity.** Medium. Mostly a retrieval and grounding layer, plus provider transport work. No schema change.

**Does it demonstrate an assistant?** Yes, if the acceptance test includes multi-record aggregation, ambiguity, refusal, and citation correctness. It is not a search box with a chat skin when those are enforced.

### 2.2 C2 — Quotation-to-invoice conversion by instruction

**What the user can do.** Say "Convert the Dangote quotation from last week to an invoice." The assistant finds the quotation, shows number, client, and total, asks for confirmation, calls the existing conversion, and opens the new invoice.

**End-to-end workflow.** Resolve client and candidate quotation → show a confirmation card → on confirm call `convertQuotationToInvoice()` → navigate to `/invoices/<id>` → report the new invoice number.

**Existing support.** `convertQuotationToInvoice()` in `src/pages/view-quotation-actions.ts` is UI-free, returns the created or existing invoice, is idempotent through `resolveConvertedInvoice()` and the UNIQUE index on `invoices.source_quotation_id`, calls `save_invoice_with_items_transaction`, copies lineage, advances the numbering cursor, writes audit entries, and handles the concurrency race. `DocumentConfirmDialog` already exists as a confirmation primitive. `revert_invoice_to_quotation_transaction` exists as a reversal path.

**Missing.** The assistant must load the quotation and items before calling (the function expects them); it must resolve "last week" and a client name to one quotation; it must produce a confirmation that a user can trust; and it must handle the case where the quotation is already converted.

**Permission and tenant isolation.** The RPC requires `invoice/create`. RLS applies to the reads. The assistant cannot bypass either.

**Data integrity.** No new calculation: totals are copied from the quotation row. Numbers are allocated by the existing numbering path. The quotation status changes to `converted`, which is the documented lifecycle.

**Failure and recovery.** Already-converted quotation returns the existing invoice (safe). A failed write throws and leaves no invoice, because the create is atomic. A wrong selection is the real risk; it is mitigated by showing the document number, client, and total before confirmation, and by the revert RPC after.

**Scope and complexity.** Medium. Smaller than C3, larger than C1 because it needs an action contract and a confirmation surface.

**Does it demonstrate an assistant?** Yes, strongly. It shows the assistant doing bounded work inside the product, not only talking.

### 2.3 C3 — Natural-language invoice preparation

**What the user can do.** Say "Invoice Dangote for 40 metres of 2.5mm cable and 3 socket outlets, 7.5% VAT." The assistant builds a draft invoice and asks for confirmation before saving.

**End-to-end workflow.** Resolve client → resolve items against the item library (`get_item_suggestions`) → propose quantities and prices → build a draft form state → compute totals with `computeDocument()` → show a preview → on confirm save through the invoice save path.

**Existing support.** `computeDocument()`; `save_invoice_with_items_transaction`; `get_item_suggestions`; `useInvoiceSave` strategies; PDF preview components; `useDocumentSave` feedback.

**Missing.** A headless draft model. Document form state currently lives in page components (`InvoiceFormPage.tsx`), and `useInvoiceSave` expects assembled form inputs, not a neutral draft. There is no server-side draft store, no assistant preview surface, and no item/price disambiguation flow. Prices are commercially sensitive and must come from the library or the user, never from the model.

**Permission and tenant isolation.** Same as manual creation; `invoice/create` is required.

**Data integrity.** Highest exposure of all candidates. Totals must come from `computeDocument()`, and the database will not correct bad totals. Wrong item prices, wrong VAT base, or wrong client create a valid-looking wrong invoice.

**Failure and recovery.** Partial drafts, abandoned numbers, and corrected-but-saved documents. Numbering is only consumed on save, which limits damage.

**Scope and complexity.** Large. It needs draft state, item matching, preview, confirmation, and validation reuse.

**Does it demonstrate an assistant?** Yes, but it is the riskiest way to prove the point.

### 2.4 C4 — Payment recording by instruction

**What the user can do.** Say "Record ₦250,000 cash from Dangote against INV-1042." The assistant identifies the invoice, computes the remaining balance, proposes the split, and records on confirmation.

**Existing support.** `record_payment_transaction` RPC; `normalizePaymentInput()`; `loadPaymentSheetData()`; receipts, WHT draft, attachments, and audit follow-ups.

**Missing.** Amount and method parsing, bank account selection, WHT handling, a confirmation that shows the effect on balance, and safe handling of overpayment and voiding.

**Data integrity.** Money movement with best-effort follow-ups (receipt, attachments, captions). A wrong amount is a real financial error and is harder to reverse than a wrong invoice.

**Scope and complexity.** Medium technically, high in consequence.

**Does it demonstrate an assistant?** Yes, but it should come after the resolver and confirmation pattern are proven.

### 2.5 C5 — Single-document explanation (smallest slice)

**What the user can do.** With an invoice open, ask "Why is the total ₦1.24m?", "What is still outstanding?", "Which items carry VAT?". The assistant answers from the stored document, its items, its calculation inputs, and `invoice_financials_v`.

**Existing support.** `useInvoiceDetailData.js` already loads every needed row. `custom_fields.calculationInputs` records the rates that produced the totals. `formatNaira()` formats.

**Missing.** Only the transport and a context builder. No cross-record retrieval and no ambiguity handling.

**Scope.** Small.

**Why not first.** It is a subset of C1 and a weaker demonstration of end-to-end business value. It is the right first slice if the team wants a low-risk demonstration before the aggregation cases.

### 2.6 Ranking

| Rank | Candidate | Reason |
|---|---|---|
| 1 | C1 | Useful, read-only, reuses shipped reads, proves grounding, builds the resolver. |
| 2 | C2 | Best action candidate; bounded by existing atomic, idempotent operation. |
| 3 | C5 | Smallest slice of C1; use as an internal de-risking step, not a separate milestone. |
| 4 | C3 | High value, but needs draft state and carries the highest financial-integrity risk. |
| 5 | C4 | Money movement; defer until confirmation and resolver patterns are proven. |

Why C1 is preferable to C2, the closest alternative: C2's value is real, but its success depends on the assistant identifying one specific document and on a confirmation the user trusts. C1 builds exactly that identification and grounding layer, with no side effects. Sequencing C1 first makes C2 cheaper and safer, and avoids proving the assistant on a write.

Why C1 is not the "easy option": a chatbot that answers from general knowledge would be easier and useless. C1 is constrained to tenant data, must cite records, must quote stored figures, must handle ambiguity, and must refuse when data is missing. That is the assistant capability the product needs.

## 3. Detailed End-to-End Workflow for the Recommended Candidate

Scenario: "Which clients owe me money, and how much is overdue?"

| Stage | Behaviour | Evidence base |
|---|---|---|
| 1. Entry | The user opens the assistant surface and types the question. The surface is not chosen here; the existing sheet or a new page can host it. | `AssistantSheet.tsx` (prototype only) |
| 2. Tenant context | The surface reads `useEntity()` for `tenantClient`, entity, and `hasAuthorization`. If the tenant is not ready, the surface does not open a data path. | `src/lib/tenant/contexts.tsx`, `src/lib/tenantClient.ts` |
| 3. Plan | The application asks the model for a plan from a closed tool list: `search_documents`, `list_receivables`, `get_document`, `list_projects`. Unknown intents return "I cannot answer that from your records." | PROPOSAL; no tool layer exists today |
| 4. Resolve names | A client or project name is resolved through tenant reads with a small limit. More than one match → one disambiguating question with the candidates. | `useGlobalSearch.ts` pattern |
| 5. Retrieve | `list_receivables` reads `invoice_financials_v` with a status and date filter. `get_document` reads the invoice, items, payments, and financials view. | `reportRepository.ts`, `useInvoiceDetailData.js` |
| 6. Compute in the application, not the model | The application sums `balance_due` per client, counts overdue rows, and formats with `formatNaira()`. The model receives totals as fixed strings and ids. | `src/lib/formatters/money.ts` |
| 7. Answer with citations | The answer names each client, the amount, the document count, and the oldest due date, and lists document numbers as links to `/invoices/<id>`. | Routes in `AppShell.tsx` |
| 8. Open | Tapping a citation opens the document view. No new route is needed. | `AppShell.tsx` line ~322 |
| 9. Feedback | Loading state, empty state ("No unpaid invoices in that period"), and error state through existing feedback primitives. | `src/lib/feedback.ts` |
| 10. Failure | Provider failure → "The assistant is unavailable. Your data was not changed." No partial figures. Unauthorized resource → "You do not have permission to view payments." | `useAuthorization` |
| 11. No persistence | The exchange is not written to any table in this milestone. | No conversation store exists |

Design constraints carried from the audit:

- The model never sees another tenant's rows, because every read is tenant-scoped and RLS-filtered.
- The model never performs arithmetic that reaches the user unverified. Aggregates are computed by application code over database values.
- Record text (client names, titles, notes) is untrusted content. It enters the prompt as data, never as instruction.

## 4. Existing Components Reusable

| Need | Existing component | Reuse level |
|---|---|---|
| Tenant-scoped reads | `tenantClient` from `useEntity()` (`src/lib/tenant/contexts.tsx`) | Direct |
| Permission checks | `useAuthorization()` / `has_entity_permission` | Direct |
| Document search | `search_documents` via `documentSearchService.ts` | Direct |
| Receivable figures | `fetchInvoiceFinancials()` over `invoice_financials_v` | Direct |
| Project figures | `fetchProjectFinancials()` over `project_financials_v` | Direct |
| One document's full context | `useInvoiceDetailData.js`, `loadQuotationViewData()` | Direct with extraction |
| Client and project name resolution | `useGlobalSearch.ts` query pattern | Adapt |
| Money formatting | `formatNaira()`, `formatCurrency()` | Direct |
| Calculation authority | `computeDocument()` | Read-only use for explanation |
| Error and feedback language | `feedback`, `getUserFacingMutationMessage()` | Direct |
| Navigation targets | `/invoices/:id`, `/quotations/:id`, `/clients` routes | Direct |
| Confirmation dialog (for C2 later) | `DocumentConfirmDialog` | Direct |
| AI transport prototype | `sendAssistantChat()` (untracked) | Prototype reference only |

## 5. Missing Capabilities

| Missing capability | Blocks C1 | Notes |
|---|---|---|
| Data-request protocol (tools or a structured plan) | Yes | Current request body has four fields; tests assert that no tool fields are sent. |
| Fact builder and citation contract | Yes | Nothing formats tenant rows into a model-safe fact block today. |
| Production key custody | Yes | Keys are per device; web keeps them in memory. A shipped assistant needs a decision: device keys or a server proxy. No proxy exists. |
| Answer evaluation harness | Yes for acceptance | No test covers answer correctness; 188 tests cover other behaviour. |
| Query limits and pagination policy | Yes | `fetchInvoiceFinancials()` reads all rows; an assistant must bound it. |
| Conversation persistence | No | Not needed for the milestone; also not available. |
| Spend control per user | Conditional | No quota or rate limit exists. Device keys shift cost to the user. |
| Offline answer path | No | Offline SQLite exists for invoices and quotations, but no assistant read path uses it. |

## 6. Risks and Safeguards

| Risk | Why it matters | Safeguard | Residual |
|---|---|---|---|
| Model invents or misstates an amount | Financial trust is the product | Application computes every total; model quotes supplied strings; acceptance test compares against the view | Low |
| Model answers from general knowledge | Looks authoritative, is wrong | Closed tool list; refusal path; answers must carry a citation id | Low |
| Cross-tenant leakage | Contractual and legal | Tenant-scoped client only; no tenant or schema parameter accepted from the model; test a second account | Low if tested |
| Prompt injection through record text | A client name could contain instructions | Treat record text as data; no write tool exists; instructions live in the system prompt only | Medium |
| Unbounded read costs | Large tenants slow the app | Filtered queries, `limit`, no full-table scans | Medium |
| Provider outage | Assistant appears broken | Explicit error, no partial answer | Low |
| Provider key exposure on web | Key visible to the browser user | Prefer a server proxy before public launch; device keys are acceptable for an internal pilot | High until decided |
| Misleading confidence | Users act on wrong answers | State the records used; say "not found" instead of guessing | Low |

## 7. Proposed First-Milestone Scope

In scope:

1. One assistant surface with a text input, message list, loading state, and error state.
2. A closed read-tool set: document search, receivables by status and period, one-document detail, project financials, client lookup.
3. An application-side fact builder that formats rows and computes aggregates.
4. An answer format with citations and deep links.
5. A refusal path for out-of-scope questions.
6. A permission-aware empty state and error state.
7. A scripted acceptance test set with expected figures.

Out of scope:

1. Any write, save, convert, send, or delete action.
2. Payment, invoice, or quotation creation.
3. Conversation history storage.
4. Assistant identity, avatar, or personality.
5. Offline answers.
6. Push or email notifications.
7. Cross-tenant or portfolio-wide analytics.

Size: medium. No schema change and no migration. The largest single unknown is key custody, which is a product decision, not a coding task.

## 8. Acceptance Criteria

The milestone is complete when all of these pass on a seeded tenant with at least two clients, three invoices, one partially paid invoice, one overdue invoice, and one quotation.

1. "How much is outstanding?" returns the exact sum of `balance_due` for unpaid and partially paid invoices.
2. "Which invoices are overdue?" lists exactly the rows whose `computed_status` is overdue for today, with the correct count.
3. "How much does <client> owe?" returns the correct per-client total and names the documents.
4. "What is outstanding on <invoice number>?" returns the figure from `invoice_financials_v`, not a recomputation, and opens the document from the answer.
5. "What did I quote <client> in <month>?" returns the right quotation number and total, or says none exists.
6. A client name shared by two clients produces one disambiguating question, not a guess.
7. A question about a period with no records returns a clear empty answer and no invented figure.
8. "Delete invoice 1042" and "Record a payment" are refused with a statement that the assistant cannot change records yet.
9. A second account cannot retrieve the first account's amounts, links, or document numbers in any phrasing.
10. A provider failure produces an error message and no partial figures.
11. Every numeric answer carries at least one document reference that matches the figure.
12. Response time stays within an agreed bound on a tenant with 500 invoices.

## 9. Unresolved Product Decisions

These are for the owner. This report does not decide them.

1. Assistant identity: name, avatar, tone, and whether it is branded BOUXRE.
2. Key custody: per-device keys for a pilot, or a server proxy with owner-funded keys and a quota.
3. Whether answers may aggregate across all clients or only within a selected client or project.
4. Whether the assistant may read WHT, VAT, and bank details, or only headline amounts.
5. Whether conversations are stored, and for how long, for support and evaluation.
6. Whether a citation must always be shown, or only for financial figures.
7. Whether the assistant appears on the dashboard, in document views, or both.
8. Whether the pilot is internal (owner and staff) or exposed to customers.
9. What the assistant says when a permission is missing.
10. Whether a free-tier provider is acceptable for production latency.

## 10. Evidence Gaps

Specific gaps that materially affect this evaluation. No broad re-audit was performed.

1. **Tool support on the chosen free tiers is unverified.** `providerCatalog.ts` names models in comments only. Whether those models support reliable tool calling, and at what rate limit, needs a live check before committing to a tool-based plan.
2. **Scale behaviour of `invoice_financials_v` is unmeasured.** The view is read in full by `fetchInvoiceFinancials()`. Whether 5,000 invoices is acceptable in a mobile session is unknown.
3. **Grant coverage was verified for `invoice_financials_v` only.** `project_financials_v` is used by the reports module, so it works in practice, but its grant statement was not read.
4. **Deployed schema state is unverified.** The audit already records migration drift for the invoice status constraint.
5. **The untracked chat prototype's provider behaviour is unverified.** Its SSE parsing and failure classification are unit-tested, but no live provider run was reviewed.
6. **No latency or cost measurement exists** for any provider in this repository.
7. **Offline coverage of assistant reads is unknown.** `invoiceCache.ts` mirrors invoices locally, but no read API for assistant use was examined.
8. **Email and notification delivery were not evaluated**, because no recommended candidate needs them.

## Verification

- Documentation standard: ASD-STE100 Simplified Technical English.
- Skills used: NONE.
- Application files changed: none.
- Configuration, migrations, or experimental files changed: none.
- `bun run build`: not run. The repository forbids it and this is a documentation task.
- `bun run typecheck`, `bun run lint`, `bun run test`: not run. No code changed.
- `supabase db push`: not applicable. No SQL changed.
- Files created: this report only.
- Claims labelled Evidence were read from the listed files. Claims labelled Inference or Proposal were not executed or measured.

## Git state

Before: branch `main` at `f8fb22c6`; 84 deletions, 3 modified files (`AppShell.tsx`, `DashboardOverview.tsx`, `designLabPreviews.ts`), untracked assistant prototype and PRD material.

After: the same entries plus this report. No pre-existing file was touched.

## Deferred work

- Owner review of this recommendation.
- Decision on key custody and pilot audience.
- Resolution of the DEC-17 / DEC-18 provider order conflict.
- Selection of the second milestone after the first is proven.
