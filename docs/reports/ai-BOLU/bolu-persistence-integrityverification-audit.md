# Bolu Persistence Integrity — Independent Verification Audit

Date: 2026-11-18
Repository: `C:\Users\DELL\Desktop\bigdrops-app` (branch `main`, HEAD `8ba6950e3a838885c8b27e591cba41fc73fdb188`)
Task class: audit and verification only. No application code was changed by this audit.

Label conventions used throughout:

- **OBSERVATION** — a fact read directly from the repository, schema dump, or a command result in this session.
- **REFERENCE** — an existing standard or product document.
- **PROPOSAL** — a suggested remediation, not approved and not implemented.
- **DECISION** — a requirement already approved by the user.

---

## 1. Executive summary

The previous implementation agent's report was treated as a claim set, not evidence. The numbering repair, the audit-provenance module, the composer gate state machine, and the proposal rendering path all exist and are wired as described. Three claims do not survive verification:

1. **Invoice idempotency does not work.** `findPersistedOperation` filters on `custom_fields->>operation_id`, but `invoices.custom_fields` is a `text` column (not `jsonb`). PostgreSQL has no `->>` operator for `text`, so the query cannot succeed; the surrounding `catch` converts that failure into "no existing operation". The durable replay guard is therefore inert for invoices.
2. **Idempotency is not concurrency-safe for either family.** No database object enforces uniqueness or an atomic claim on `operation_id` (zero matches in `supabase/`). A lookup-before-insert is the only guard. Two concurrent Gate 2 requests using the same `opId` both pass the lookup and both insert.
3. **The prefix defect is narrowed, not eliminated.** Bolu now reads tenant prefixes, which fixes the reported `INV-000001` symptom when the settings read succeeds. A failed settings read still returns `undefined`, and `resolvePrefix` then silently returns the global `INV`/`QTN` default. The original symptom is therefore still reachable, silently, on exactly the failure class that produced it.

A fourth area is materially weaker than reported: the new test suite is predominantly static source-pattern matching (`readFileSync` + `assert.match`), so its 46 passing tests cannot detect defects 1 or 3.

Everything else inspected — Gate 1/Gate 2 state transitions, the removal of typed-save interception, the merge-invalidates-approval rule, the audit actor derivation, the provenance marker, and the preview card field list — matches the stated intent in source.

**Status: PARTIALLY COMPLETED.** Material claims remain unverified or defective, and hosted verification was not possible.

---

## 2. Scope and evidence examined

OBSERVATION — Files inspected in full or in targeted windows:

| Area | Evidence |
|---|---|
| Governance | `AGENTS.md`, `docs/PROJECTSKILLINDEX.md` (skill index; no skill was needed to establish these facts, so none was loaded as authority) |
| Numbering | `src/domain/documentNumbering.ts`, `src/domain/prefixConstants.ts`, `src/domain/documentConversion.ts` (usage), `src/hooks/useInvoiceSave.ts`, `src/hooks/useQuotationSave.ts`, `src/hooks/useSettings.js` |
| Persistence | `src/lib/ai-assistant/bolu-document-service.ts` (all four persist functions), `api/bolu-save.ts`, `src/lib/withUniqueRetry.ts` |
| Audit | `src/lib/ai-assistant/bolu-audit.ts`, `src/lib/audit.ts`, `supabase/migrations/20260520089999_audit_activity_bootstrap.sql`, `20260809040000_invoice_audit_schema_aware.sql`, `live-public-schema.sql` |
| Gates | `src/lib/ai-assistant/hooks/useBoluThread.ts`, `src/lib/ai-assistant/bolu-generation.ts`, `src/lib/ai-assistant/bolu-reducer.ts`, `src/components/ai-assistant/chat/assistant-chat-composer.tsx` |
| Rendering | `src/components/ai-assistant/chat/assistant-chat-thread.tsx`, `src/components/ai-assistant/chat/assistant-chat-parts.tsx`, `src/lib/ai-assistant/bolu-operations.ts` |
| Schema | `live-public-schema.sql` (table and function definitions), `supabase/migrations/20260915194332_tenant_template_seed.sql`, `20261107120000_document_numbering_uniqueness_constraints.sql` |
| Tests | `src/tests/ai-assistant/bolu-canonical-persistence-and-context.test.js`; `git diff` of the two changed expectation files |

OBSERVATION — Not available in this environment: any hosted Supabase project, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_API_URL`, deployed Vercel environment, or an authenticated browser session with a seeded tenant. No production read or write was attempted.

DECISION — No production document creation, no schema migration, no deployment, no Git mutation, no `bun run build`.

---

## 3. Initial and final Git state

OBSERVATION — Captured before any work and again after the report was written:

- Initial: 104 entries — 66 modified (`M`), 31 untracked (`??`), 7 pre-existing deletions (`D`).
- Final: 104 tracked-state entries before the report file, plus this new untracked report.
- Nothing was staged, committed, stashed, reset, checked-out, or cleaned.
- HEAD is a single commit (`📦 chore(ai): track bolu narration hook and interaction modules`); no commit was made by this audit.

OBSERVATION — Attribution uncertainty is material and unavoidable:

- The worktree mixes several unrelated bodies of work (release notifications, provider catalog, Sentry, Android reports, UI polish) with the Bolu persistence work. No commit boundary separates them.
- The difference between this audit's starting state (104 entries) and the state described by the previous agent (98 entries) consists of `src/lib/ai-assistant/bolu-audit.ts` (untracked), `bolu-commercial-language.ts`, `bolu-titles.ts`, `src/lib/sentry.ts`, `src/pages/WhatsNew.tsx`, and four new test suites. Those are consistent with the previous agent's described work, but file presence is not proof that the described behaviour is correct.
- Because nothing is committed, no file can be attributed to a specific author or task by Git alone. All attributions in this report rest on reading the current file contents.

---

## 4. Tenant document numbering findings

### 4.1 How the forms obtain their prefix

OBSERVATION — Both forms read the tenant settings map through `useSettings()` (which reads the tenant-schema `settings` row with `.eq('id', 1)`) and resolve through `resolvePrefix(settings?.document_prefixes, key)`:

- `src/hooks/useInvoiceSave.ts` — `const invoicePrefix = resolvePrefix(input.documentPrefixes, 'invoice')`.
- `src/hooks/useQuotationSave.ts` — `const quotationPrefix = resolvePrefix(documentPrefixes, 'quotation')`.
- Quotation creation additionally delegates to `persistQuotationTransaction`, which receives `documentPrefixes` from the same call site.

REFERENCE — `docs/standard/prefix-engine-settings-standard.md` §1: every generator must resolve its prefix at runtime through `resolvePrefix`; hardcoded prefixes are forbidden.

### 4.2 Where tenant prefixes live

OBSERVATION — In the entity's tenant schema: `settings.document_prefixes` (JSONB), one row (`id = 1`). The automatic cursor lives in the reserved key `__auto_seq` inside the same object. The `check_document_prefixes_format` constraint is enforced per tenant schema.

### 4.3 Does Bolu read the same authority?

OBSERVATION — Yes, in the success path. `fetchDocumentPrefixes(tenantClient)` (`src/domain/documentNumbering.ts`) reads `settings.document_prefixes` through the tenant client and both create paths call:

```ts
const documentPrefixes = await fetchDocumentPrefixes(tenantClient)
const invoicePrefix = resolvePrefix(documentPrefixes, 'invoice')   // and 'quotation'
```

OBSERVATION — The lookup uses `.limit(1).single()` without an explicit `.eq('id', 1)`, unlike the form's `id = 1` read. With one row per tenant schema the result is the same; with more than one row the result is arbitrary.

### 4.4 Same generator, cursor, and uniqueness protections?

OBSERVATION — Yes:

- Generator: `getNextInvoiceNumber` / `getNextQuotationNumber` (identical to the forms).
- Cursor: `fetchAutoCursor(tenantClient, family)` then `advanceAutoCursor(...)`, monotonic via `mergeAutoCursor`.
- Retry: `withUniqueRetry(insertFn, regenerate, /* no initialValue */)` — the automatic path, so a `23505` triggers regeneration rather than surfacing a duplicate. This matches the forms, which pass `manualNumber` only when the user typed a number.
- Uniqueness: `idx_invoices_invoice_number_unique` exists (migration `20261107120000`); `idx_quotations_quotation_number_unique` exists in `tenant_master_template` (migration `20260915194332`, line 1176). Concurrent allocation therefore collides and retries for both families.

### 4.5 Can it still silently fall back to `INV`/`QTN`?

OBSERVATION — **Yes.** `fetchDocumentPrefixes` returns `undefined` on any error, on a missing row, or on a non-object value:

```ts
if (error || !data) return undefined
...
} catch { return undefined }
```

and `resolvePrefix(undefined, 'invoice')` returns `DEFAULT_PREFIXES.invoice` (`INV`); `'quotation'` returns `QTN`. Nothing distinguishes "tenant has no configured prefix" from "the read failed". The previous agent's own new test asserts this fallback as expected behaviour (`assert.equal(resolvePrefix(undefined, 'invoice'), 'INV')`).

Impact: the reported defect (`INV-000001` instead of `SASINV-000134`) is fixed **only when the settings read succeeds**. On the failure class that plausibly produced the report (transient read error, RLS denial, missing settings row), Bolu still allocates from the global family, silently, and the resulting number is persisted and audited as if correct. This is a narrowing of the defect, not an elimination.

OBSERVATION — Parity note: the manual form has the same fallback through `resolvePrefix`, so Bolu behaviour now equals form behaviour. The defect is platform-wide, not Bolu-only.

PROPOSAL (not approved) — Fail closed in the document-creation path: if the settings read fails, return a user-facing error ("could not read your document numbering settings") instead of allocating from `INV`. Smallest change: make `fetchDocumentPrefixes` distinguish `null` (no tenant prefix configured → default is legitimate) from a thrown/errored read (→ abort), and have the create paths abort on the error case.

---

## 5. Idempotency findings

### 5.1 What is implemented

OBSERVATION — `src/lib/ai-assistant/bolu-document-service.ts`:

- `executedOperationIds` is an in-memory `Set` guard, per serverless instance.
- `findPersistedOperation(tenantClient, family, opId)` runs before each create and, when it returns a row, returns `{ success: true, documentId, documentNumber }` without writing.
- `buildBoluCustomFields` writes `operation_id: proposal.opId` into `custom_fields` for both families.

### 5.2 Defect — invoice lookup is type-invalid (PROVEN, code-level)

OBSERVATION —

```ts
.filter('custom_fields->>operation_id', 'eq', opId)
```

and the column types:

| Table | Column | Type | Source |
|---|---|---|---|
| `invoices` | `custom_fields` | `text` | `tenant_master_template` seed (invoices block) and `live-public-schema.sql` line 2686 (`"custom_fields" "text"`) |
| `quotations` | `custom_fields` | `jsonb` | template seed and `live-public-schema.sql` line 3148; the quotation RPC casts `(p_quotation_payload->>'custom_fields')::JSONB` |

Root cause: `->>` is a `jsonb`/`json` operator. Applied to `text`, PostgreSQL raises `operator does not exist: text ->> unknown`; PostgREST returns an error. `findPersistedOperation` swallows it:

```ts
} catch {
  // A lookup failure is not proof of absence ...
  return null
}
```

and the caller treats `null` as "not yet persisted".

Impact: for invoices, a retried or replayed Gate 2 confirmation creates a **second invoice** with the next number. The quotation path is unaffected here because its column is `jsonb` and its value is cast into an object, so `->>` resolves. The claim that "the document's own persisted `custom_fields.operation_id` is the durable idempotency key" is true for quotations only.

Proven by: column type + operator semantics + the swallowing catch. Not confirmable end-to-end without a hosted tenant, because no hosted credentials exist in this environment; no production write was attempted.

### 5.3 Defect — no concurrency-safe claim (PROVEN, absence of mechanism)

OBSERVATION — A repository-wide search of `supabase/` for `operation_id` returned **zero matches**. There is no unique index, no partial index, no `UNIQUE` constraint, and no advisory lock or insert-then-check transaction keyed on the operation id. The only protections are:

1. an in-process `Set` (per instance; useless across serverless invocations), and
2. a read-then-write lookup, which is a time-of-check/time-of-use race.

Race, precisely:

1. Request A and Request B both carry `opId = X`, both pass Gate checks.
2. A runs `findPersistedOperation` → no row. B runs the same → no row.
3. A allocates `SASINV-000135` and inserts. B allocates `SASINV-000136` (different number, no `23505`) and inserts.
4. Both succeed. Two documents exist for one approved operation.

The document-number unique index cannot help because the two candidates differ. `withUniqueRetry` cannot help for the same reason.

Reachable in practice through: a double-clicked Confirm button before React re-renders the card as `saving`, two open tabs on the same conversation, a client-side retry, or a proxy retry of the POST. The server accepts both `approved_pending_save` and `saving` (`api/bolu-save.ts`, and all four persist functions), so the second request is not rejected on status either.

### 5.4 Scenarios assessed

| Scenario | Invoice | Quotation |
|---|---|---|
| User retries after timeout (sequential) | **Not protected** (lookup fails, new document) | Protected (lookup returns row) |
| Provider/browser refresh, same card | **Not protected** | Protected |
| Serverless function retry (new instance) | **Not protected** | Protected, sequential only |
| Two concurrent requests, same `opId` | **Not protected** | **Not protected** |
| DB insert succeeded, response lost | **Not protected** — retry writes again | Protected |

REFERENCE — The user's own stated criterion: "A lookup-before-insert check is not sufficient proof of concurrency-safe idempotency." The implementation meets that description exactly and fails it.

PROPOSAL (not approved, requires a migration decision) — Smallest safe correction, in order of preference:

1. Add a partial unique index per family: `CREATE UNIQUE INDEX ... ON <schema>.quotations ((custom_fields->>'operation_id')) WHERE custom_fields->>'operation_id' IS NOT NULL;` and, for invoices (`text`), a functional index on `((custom_fields::jsonb)->>'operation_id')` — noting the cast will fail on non-JSON historical text, so it must be a partial index with a validity guard, or the marker must move to a dedicated `operation_id uuid` column.
2. Treat `23505` on that index as "already applied": re-read by operation id and return the existing document.
3. Keep the current lookup as a fast path; it is not the guarantee.

No migration was authored or applied, per scope.

---

## 6. Audit trail and co-creation findings

### 6.1 Mechanism and signatures

OBSERVATION — `src/lib/ai-assistant/bolu-audit.ts` calls the existing RPCs, with no second audit system:

| Call | Signature verified | Match |
|---|---|---|
| `record_audit_log` | `(p_entity_type text, p_entity_id uuid, p_entity_label text, p_action text, p_old_data jsonb, p_new_data jsonb, p_actor_id uuid, p_actor_label text, p_source text, p_scope_type text, p_reason text)` | Exact — all 11 named arguments supplied |
| `record_invoice_created` | `(p_invoice_id uuid, p_actor_id uuid, p_actor_label text, p_source text [, p_entity_id uuid])` | Call supplies 4 of 5 — see 6.3 |
| `record_quotation_created` | `(p_quotation_id uuid, p_actor_id uuid, p_actor_label text, p_source text)` | Exact |

OBSERVATION — `audit_logs.source` and `activity_events.source` are plain `text` with `DEFAULT 'web'` and **no CHECK constraint** (bootstrap migration, lines 22–35; no `source` CHECK exists anywhere in `supabase/migrations/`). Therefore `source = 'bolu'` is accepted by the schema. This claim holds.

OBSERVATION — `record_audit_log` computes `compute_jsonb_diff('{}', new_data)` and returns `null` when the diff is empty. For CREATE, `new_data` carries `invoice_number|quotation_number`, `client_name`, `total`, so the diff is non-empty and the row is inserted. The event is not silently dropped by the diff guard.

### 6.2 Actor and tenant context

OBSERVATION —

- `api/bolu-save.ts` derives the actor from the verified token: `client.auth.getUser(token)`, then `const auditActor = { id: user.id, label: user.email ?? 'user' }`. No client-supplied user id is read (`body.userId` / `proposal.userId` do not appear). The previous test asserts this and the assertion is accurate.
- The client fallback path in `useBoluThread.confirmGate2Save` derives the actor from `supabase.auth.getSession()` and passes it into the same persistence functions.
- Tenant/entity context: `record_audit_log` receives `p_entity_id = documentId`, which is the tenant-schema row id. It writes to global `public.audit_logs` by design (audit storage is global; entity data is tenant-scoped). This is consistent with the existing architecture.
- The document writes themselves go through `tenantClient` built from the **user token**, not the service-role client. `getAdminClient()` (service role) is used only for `_prov_get_schema_name`, `has_entity_permission`, and the `bolu_messages` status update. RLS on the document tables remains the write authority. The claim "no service-role writes" holds for document data.

OBSERVATION — Pre-flight permission failure handling: if `has_entity_permission` returns an **error** (not `false`), the handler logs a warning and continues. The write is then attempted under the user's token, so RLS still arbitrates; but the pre-flight is advisory, not fail-closed.

### 6.3 Suspected defect — activity event is not reliably written (SUSPECTED, evidenced)

OBSERVATION —

- `recordBoluDocumentCreationAudit` calls `record_invoice_created` with `p_invoice_id`, `p_actor_id`, `p_actor_label`, `p_source` only — **no `p_entity_id`**.
- Migration `20260809040000_invoice_audit_schema_aware.sql` added a five-argument overload that resolves the tenant schema **only when `p_entity_id` is supplied**; without it, `_audit_resolve_invoice_schema` returns `'public'` and the function executes `select * from public.invoices where id = ...`.
- The tenant-authoritative `invoices`/`quotations` rows live in `entity_*` schemas. `public.invoices` will not contain them.
- `live-public-schema.sql`, which is the schema dump in this repository, contains **only** the four-argument definition (line 1502) and lists no five-argument overload. If that dump reflects the deployed function set, the only callable definition is public-scoped.
- Both audit calls are wrapped in `try/catch` that logs `console.warn('[bolu-audit] activity event failed:', ...)` and returns.

Consequence: the `audit_logs` CREATE row (source `bolu`) is expected to be written; the paired `activity_events` CREATED row is expected **not** to be, with no user-visible error. The trail would be half-written.

Confidence: suspected, not proven. Proving it needs a hosted tenant read (`select * from public.activity_events where entity_id = ...` after a tenant save), which is outside this environment and would require a production write to generate.

OBSERVATION — This is not a Bolu-specific regression: `src/lib/audit.ts` (`recordInvoiceCreated`, `recordQuotationCreated`) uses the same four-argument call shape for manual saves. Bolu therefore preserves parity with the forms rather than introducing a new gap. Whether the gap is real in production affects both paths equally.

PROPOSAL (not approved) — If confirmed, pass the entity id through the audit helpers (`p_entity_id: entityId`) and stop swallowing the failure silently for the attribution event, or make the schema-aware overload resolve the tenant from the document id instead of requiring the caller to supply it.

### 6.4 Duplicate audit on retry

OBSERVATION — With invoice idempotency broken (§5.2), a retried Gate 2 save writes a second document **and** a second CREATE audit row and a second activity event — correctly matching the (duplicate) document, but doubling the trail. With quotations, the early return prevents both. No de-duplication key exists on `audit_logs`.

### 6.5 Provenance and view attribution

OBSERVATION — Both are persisted, not transient:

- `buildBoluCustomFields` writes `created_via: 'bolu_assistant'` and `operation_id` with the document. For invoices this is `JSON.stringify(...)` into a `text` column; for quotations the RPC casts it into `jsonb`.
- `isBoluCreatedDocument()` accepts a parsed object or a JSON string, requires exact `created_via === 'bolu_assistant'`, and returns `false` for absent, malformed, differently-cased, or array values. Manual documents therefore cannot be mislabelled.
- `ViewInvoice.tsx` uses `isBoluCreatedDocument(invoice?.custom_fields)`; `ViewQuotation.tsx` uses `isBoluCreatedDocument(quotation.custom_fields)`; `InvoiceWorkspace.tsx` renders the `Co-created with Bolu` subtitle from that boolean. Attribution survives reload and is independent of conversation state.

OBSERVATION — Limitation: no hosted row was inspected. Provenance is verified as *persisted-in-code*, not as *present in a real saved record*.

---

## 7. Gate 1 / Gate 2 interaction findings

### 7.1 The sequence, as implemented

OBSERVATION — Reconstructed from `bolu-generation.ts`, `useBoluThread.ts`, `bolu-reducer.ts`, `assistant-chat-thread.tsx`, `assistant-chat-parts.tsx`:

1. User sends a request → `sendBoluProviderRequest`; `setClerkState('responding')` during streaming.
2. On completion the envelope is parsed; a valid `create-document` payload becomes a `BoluProposal` with `status: 'pending_approval'` (reducer status `awaiting_approval`).
3. The proposal is persisted into `bolu_messages.proposal_payload`, set as `activeProposal`, and **`setClerkState('idle')`**.
4. `ProposalCardView` renders Gate 1 (Approve / Reject) from the message's `proposal`.
5. `approveGate1` persists `status: 'approved_pending_save'`, updates state, and **`setClerkState('idle')`**.
6. Gate 2 (Confirm Save / Cancel) renders from the same card.
7. `returnGate1ToReview` ("Back to review") sets `status: 'pending_approval'`, clears the prior approval, and `setClerkState('idle')`.
8. A material change regenerates the draft: `mergeDocumentCreateProposal` returns `status: 'pending_approval'`, so a new Gate 1 approval is required before Gate 2 is available again.
9. `confirmGate2Save` requires `status === 'approved_pending_save'` and matching `opId`, marks the card `saving`, calls `/api/bolu-save` (or the authenticated client fallback), and on success marks `persisted`, writes exactly one confirmation message, and clears the active proposal.
10. On failure the proposal reverts to `approved_pending_save`, the error surfaces through `feedback.error`, and `setClerkState('idle')` keeps the composer usable.
11. Thread reload: the stored proposal is restored; `pending_approval` / `approved_pending_save` restore the card and set `clerkState('idle')`.

OBSERVATION — No `setClerkState('listening')` call exists anywhere in `useBoluThread.ts`; the reported lock cause (four `listening` sites, including proposal creation and Gate 1 approval) is gone. The composer's lock predicate is now:

```ts
const isLocked = busy || (Boolean(disabled) && !editing)
```

so only genuine in-flight work (`busy`) plus a non-edit disabled state locks it; message editing survives a transient clerk state.

OBSERVATION — Typed save interception is removed. The hook comment states it explicitly, and `matchesBoluSaveIntent` / `gate2SaveRef` no longer appear in `useBoluThread.ts`. Typed "yes/confirm/save" is conversation only; the Gate 2 button is the sole save trigger on the client.

OBSERVATION — `api/bolu-save.ts` rejects any proposal whose status is not `approved_pending_save` or `saving` with HTTP 400 `gate_not_approved`, and rejects a missing `opId`. Gate 1 rejection and staleness (`isProposalStale`) are checked again in every persist function.

REFERENCE — `docs/prd/conversational-document-assistant/decision-log.md` (two-gate authority): a proposal must not be saveable without explicit human confirmation. Preserved.

### 7.2 Findings

OBSERVATION — **No client-side re-entrancy guard on Gate 2.** The only guard is React state (`status` moved to `saving`). Two clicks dispatched before the re-render both close over `approved_pending_save`; both POST. The server accepts `saving` as a valid status, and §5.3 shows no database claim exists. This is a real duplicate-document path for invoices and a theoretical one for quotations (the second request would normally hit the quotation lookup, but only after the first commit is visible).

OBSERVATION — The confirmation message is written once: `api/bolu-save.ts` contains no `successContent` and does not insert a message, while the client inserts exactly one row. Verified by source and by the suite's assertion.

OBSERVATION — "Exactly once" for the save request is therefore **not** established. It holds for a single click and for a sequential retry of a quotation; it does not hold for a double click or concurrent retry.

PROPOSAL (not approved) — Add a synchronous in-flight guard (`useRef<Set<string>>` keyed by `opId`, checked and inserted before the first `await`) to make the client single-flight, and rely on the database claim from §5.4 for the server guarantee. The ref guard alone is still per-tab, so it is a UX fix, not the integrity fix.

---

## 8. Proposal rendering findings

OBSERVATION — The response envelope is parsed by `parseStructuredOperationEnvelope` (`bolu-operations.ts`), which accepts a fenced ```json block, a raw `{... "bolu_operation" ...}` object, or a bare operation object with `operationType`. The generation pipeline then validates the payload (`validateInvoiceCreateInput`), resolves the client against the database, standardises presentation-only item notation, and builds the proposal through `buildDocumentCreateProposal` / `mergeDocumentCreateProposal`.

OBSERVATION — User-facing prose is cleaned by `cleanAssistantProse` (`assistant-chat-thread.tsx`), which strips four envelope shapes (fenced `bolu_operation`, `json:bolu_operation`, a generic `operationType` object, and an unfenced top-level envelope) before rendering Markdown. Raw JSON therefore does not reach the bubble. The structured card is rendered separately by `<ProposalCardView proposal={message.proposal} .../>`.

OBSERVATION — Streaming and completed responses share one path: the streaming buffer only updates `content`; parsing, persistence of `proposal_payload`, and card attachment happen once on the completed text. There is no second parse that could differ.

OBSERVATION — Malformed envelope behaviour: `parseStructuredOperationEnvelope` returns `{ hasOperation: true, error: 'Malformed structured operation JSON payload.' }` with **no** `rawOperation`. The generation pipeline tests only `envelope.hasOperation && envelope.rawOperation`, so a malformed envelope yields no card, no error surfaced to the user, and (because `cleanAssistantProse` strips the block) possibly an empty or prose-only reply. This fails safe against JSON leakage but fails silently; the user is not told the operation was unreadable.

OBSERVATION — Duplicate confirmation messages: removed server-side (§7.2). A superseded draft's card is cleared when a correction merges into a new message (`proposal_payload` set to `null` on the superseded row), so only one live card remains per operation.

OBSERVATION — The card shows the candidate number only when it matches `^[A-Z0-9]{2,6}-\d{3,}$`; the draft placeholders `INV-DRAFT` / `QTN-DRAFT` never qualify, and the card states that the number is assigned on save from the business prefix. No fabricated document number is presented as authoritative.

OBSERVATION — Limitation: no rendered card was inspected in a browser. These findings are from source and from static assertions, not from a rendered DOM.

---

## 9. Preview / persistence consistency findings

OBSERVATION — Field-by-field, where the proposal carries a value:

| Field | Preview (card) | Persisted | Consistent |
|---|---|---|---|
| Unit | `{quantity} {unit} × {description}` | `toDbItem({ unit })` | Yes |
| Unit price | `formatNaira(item.unit_price) each` | `unit_price` on the item row | Yes |
| Sub-description | meta line | `sub_description` column | Yes |
| Make | `Make: ...` | `make` column | Yes |
| Part number | `Part no: ...` | `custom_data.partNo` (no column exists) | Yes, with a caveat |
| Condition | `Condition: ...` | `custom_data.condition` | Yes, with a caveat |
| Issue date | `Issue date:` | `issue_date` | Yes |
| Due / validity date | `Due date:` / `Valid until:` | `due_date` (invoice) / `valid_until` (quotation) | Yes |
| Payment terms | `Payment terms:` | `payment_terms` (invoice) / folded into `terms` for quotations | Invoice yes; **quotation: not separately persisted** |
| Terms | `Terms:` | `terms` (`payload.terms \|\| payment_terms`) | Yes |
| Notes | `Notes:` | `notes` | Yes |
| Extra charges | `ProposalCommercialBreakdown` | `custom_fields.extraCharges` as `{label, value, withTax}` | Yes, same shape as the form |
| Fixed charges | Breakdown (workmanship/transportation/shipping) | Dedicated columns; folded into the calculation's `fixedExtraCharges` | Yes |
| Custom header fields / signatory / reference links / per-item custom columns / PDF settings | Not rendered | Not written | Acknowledged gaps, not implemented |

Caveats, stated precisely:

- **Part number / condition** live in item `custom_data` because the item tables have no such columns. They survive save and reload, but they are not first-class columns and are not searchable as such. The card displays them; the persisted document displays them only where the existing item renderer reads `custom_data`. This is a documented compromise, not full parity.
- **Quotation payment terms**: `persistQuotationCreation` writes `terms: payload.terms || payload.payment_terms` and has no `payment_terms` column in its payload, whereas the card renders `payment_terms` separately. If a proposal carries both a distinct `payment_terms` and a `terms`, the quotation persists only `terms`. The invoice path persists both. This is a genuine proposal/preview/persistence divergence for quotations.
- The card's `computedTotals` come from `computeAuthoritativeTotals`, which calls the canonical `calculateDocument` from `src/lib/Calculations.ts` — the same engine the forms use. No model-supplied total is displayed or persisted (`validateInvoiceCreateInput` strips them; the persistence path recomputes).
- Extra charges are never converted into line items: they are passed as `extraCharges` with their VAT flag, and the non-taxable case leaves VAT unchanged (asserted and independently confirmed in `computeAuthoritativeTotals`). Transport/workmanship/shipping remain fixed charges in dedicated columns.

OBSERVATION — Preview→persistence consistency is therefore **mostly correct**, with one confirmed divergence (quotation payment terms) and one documented compromise (item extension fields in `custom_data`).

PROPOSAL (not approved) — If quotation payment terms are meant to be distinct from terms, add the field to the quotation payload contract and the RPC rather than folding it. Not implemented: out of scope for this audit.

---

## 10. Test changes reviewed

### 10.1 The new suite

OBSERVATION — `src/tests/ai-assistant/bolu-canonical-persistence-and-context.test.js` contains 21 tests. Twelve of them read the implementation as text and assert on source patterns, for example:

- `assert.match(service, /fetchDocumentPrefixes\(tenantClient\)/)` — proves the call site exists, not that it returns a tenant prefix.
- `assert.doesNotMatch(service, /resolvePrefix\(undefined,/)` — proves the literal is absent, while `resolvePrefix(documentPrefixes, ...)` with `documentPrefixes === undefined` still falls back to `INV`.
- `assert.match(service, /custom_fields->>operation_id/)` — asserts the **broken** invoice filter as if it were the correct guard.

OBSERVATION — The behavioural tests that do exist are sound but narrow:

- `resolvePrefix` / `getNextInvoiceNumber` / cursor-skip arithmetic: real and useful; confirms `SASINV-000134` + legacy `SASINV134` → `SASINV-000135`, cursor 200 → `SASINV-000200`.
- The "replayed Gate 2" test uses a mock whose `maybeSingle` returns a row for **every** query, so it verifies only the early-return branch. It cannot detect §5.2.
- Financial tests (`computeAuthoritativeTotals`) are genuine and confirm VAT-base and fixed-charge separation.

Verdict: the suite is a regression tripwire for source shape, not evidence of end-to-end behaviour. Its 46 passing tests (this file plus the two changed files) do not support the previous agent's broader claims.

### 10.2 Changed expectation 1 — quotation status `idle` → `awaiting_approval`

OBSERVATION — `bolu-reducer.ts` sets `status: action.proposal ? 'awaiting_approval' : 'idle'` when a proposal message arrives (line 152), and `'awaiting_approval'` on `PROPOSAL_SET` (line 184). The runtime's designed state for an open proposal **is** `awaiting_approval`.

Verdict: **correct correction, not a weakening.** The old expectation was written when quotations were rejected; quotation creation is now implemented (`persistQuotationCreation`, quotation branch in `api/bolu-save.ts`, quotation payload in the card). The test's title and assertions were updated to the implemented product scope. Note that this is a scope change disguised as an expectation change: the old test asserted a capability restriction that no longer exists, so the new test does not cover "unsupported family rejection" at all. `purchase-order` and unknown families are no longer tested for rejection.

### 10.3 Changed expectation 2 — composer `busy || disabled` → `busy || (Boolean(disabled) && !editing)`

OBSERVATION — The new predicate matches the requirement that editing stays available and that only genuine in-flight work locks the composer. The test additionally asserts `content.includes('busy ||')` to keep the in-flight lock covered.

Verdict: **reflects the corrected state machine, not a weakened test** — but it remains a string-equality assertion on an implementation detail, so it would break on a behaviour-preserving refactor and pass on a subtle semantic regression that preserved the exact text.

### 10.4 Other expectation adjustments

- `requiredPermission.action: 'save' → 'create'`: aligns with `has_entity_permission`'s action vocabulary actually used by the save route (`'create' | 'edit'`). Correct.
- `computedTotals` gains `discount` and `extraChargesTotal`: matches `buildDocumentCreateProposal`, which now includes them. Correct.
- `validateBoluClient` → `resolveProposalClient`: matches the generation pipeline. Correct.

---

## 11. Commands executed and exact results

All commands ran from the project root, Bun only, no build.

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `git status --porcelain=v1 \| wc -l` | 0 | `104` (initial and final tracked state) |
| 2 | `git rev-parse --abbrev-ref HEAD` / `git log -1 --format='%H %s'` | 0 | `main` / `8ba6950e3a838885c8b27e591cba41fc73fdb188 📦 chore(ai): track bolu narration hook and interaction modules` |
| 3 | `git diff -- src/tests/ai-assistant/bolu-live-provider-integration.test.js src/tests/ai-assistant/bolu-operational-remediation.test.ts` | 0 | 18 insertions, 10 deletions across the two files (diff reviewed in §10) |
| 4 | `bun run audit:load` | **0** | Completed; pre-existing ❌/🚨 warnings remain ("Audit complete. Fix the ❌ and 🚨 warnings to prevent regressions."). No new failure attributable to this audit. |
| 5 | `bun run typecheck` | **0** | `$ tsc --noEmit`, no diagnostics |
| 6 | `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/ai-assistant/bolu-canonical-persistence-and-context.test.js src/tests/ai-assistant/bolu-live-provider-integration.test.js src/tests/ai-assistant/bolu-operational-remediation.test.ts` | **0** | `tests 46`, `pass 46`, `fail 0`, `cancelled 0`, `skipped 0` |

OBSERVATION — Not run, deliberately:

- `bun run build` — prohibited on this host.
- The full 16-suite Bolu run claimed by the previous agent (195 tests), and the three `bun:test` suites (42 tests). Only the three directly relevant files were re-run. The previous agent's figures are therefore unverified, not contradicted.
- No hosted Supabase query, no migration, no deployment, no production write.

OBSERVATION — Shell note: `grep -E '^# (tests|suites…)'` returned no matches because current Node's TAP reporter prefixes summaries with `ℹ`; the counts above were read from the actual reporter output, not from an assumed format. The exit code was preserved with `set -o pipefail` and captured before any post-processing.

---

## 12. Four-viewport verification status

OBSERVATION — **Not performed.** No viewport class was inspected: Mobile / Fold Closed, Fold Open, Tablet, Desktop.

Reasons, stated plainly:

- No authenticated browser session, tenant, or seeded conversation with a live proposal exists in this environment.
- The audit scope is verification of persistence and interaction logic; launching an authenticated end-to-end session against a hosted tenant would require credentials and, to generate a proposal, provider credits — neither is available or authorized.
- CSS and layout inspection is explicitly not accepted as evidence by the user's brief and by `AGENTS.md`.

REFERENCE — `AGENTS.md` "Responsive UI Design Standard": affected UI must be inspected at all four classes where tools support it, and classes that could not be inspected must be reported. Both the composer change (`isLocked`) and the card additions (commercial breakdown, meta lines) affect responsive presentation, so this remains an open obligation.

---

## 13. Confirmed defects

### D1 — Invoice idempotency query is invalid against the column type

- **Severity:** high (data duplication, audit duplication, financial-record integrity).
- **File / function:** `src/lib/ai-assistant/bolu-document-service.ts` → `findPersistedOperation`.
- **Line of interest:** `.filter('custom_fields->>operation_id', 'eq', opId)`.
- **Reproduction conditions:** any second Gate 2 submission for the same `opId` on an invoice — retry after timeout, stale card replay, or refresh-and-resubmit.
- **Root cause:** `invoices.custom_fields` is `text`; `->>` requires `jsonb`/`json`. The query errors, the `catch` returns `null`, and the caller writes a new invoice.
- **Impact:** a retried save creates a second invoice with the next number and a second CREATE audit row. The persisted `operation_id` marker is present but unreadable by the guard.
- **Status:** **proven** at code and schema level. Not reproduced against a hosted database.
- **Smallest safe remediation:** see §5.4 (expression/partial unique index plus 23505-as-replay), or move the key to a typed column.

### D2 — No concurrency-safe claim on the operation id

- **Severity:** high.
- **File / function:** `findPersistedOperation` + `withUniqueRetry` call sites; absence of any constraint in `supabase/`.
- **Reproduction conditions:** two concurrent POSTs with the same `opId` (double click before re-render, two tabs, proxy retry).
- **Root cause:** check-then-act with no database uniqueness on `operation_id`; the per-instance `Set` does not span invocations; the document-number unique index cannot fire because candidates differ.
- **Impact:** duplicate documents for one approved operation; duplicate audit and activity records.
- **Status:** **proven by absence of mechanism**; exploitability depends on timing, which was not exercised.
- **Smallest safe remediation:** same as D1; the index is the guarantee.

### D3 — Activity event omits `p_entity_id`, and its failure is swallowed

- **Severity:** medium (attribution completeness; not a write-integrity risk).
- **File / function:** `src/lib/ai-assistant/bolu-audit.ts` → `recordBoluDocumentCreationAudit`; mirrored in `src/lib/audit.ts`.
- **Root cause:** the schema-aware `record_invoice_created` overload resolves the tenant schema only from `p_entity_id`; without it the lookup runs against `public.invoices`, where tenant rows do not exist. The repository's `live-public-schema.sql` contains only the four-argument public-scoped definition. Both calls are wrapped in `try/catch` that warns and continues.
- **Impact:** `audit_logs` CREATE row (source `bolu`) expected present; paired `activity_events` CREATED row expected absent, silently. Affects manual saves identically, so it is pre-existing rather than a Bolu regression.
- **Status:** **suspected**, evidenced by signature, dump, and catch; requires a hosted read to confirm.
- **Smallest safe remediation:** pass `p_entity_id`, or resolve the schema from the document id inside the RPC; surface the failure for the attribution event instead of only warning.

### D4 — Silent prefix fallback on settings-read failure

- **Severity:** medium (wrong numbering family, persisted and audited as correct).
- **File / function:** `src/domain/documentNumbering.ts` → `fetchDocumentPrefixes`; `src/domain/prefixConstants.ts` → `resolvePrefix`.
- **Reproduction conditions:** tenant `settings` read fails (RLS, missing row, transient error) during a Bolu create.
- **Root cause:** every failure path returns `undefined`; `resolvePrefix` treats `undefined` as "use the global default".
- **Impact:** reproduces the originally reported `INV-000001` symptom under a failure class that has not been excluded.
- **Status:** **proven** in code; not reproduced against a hosted tenant.
- **Smallest safe remediation:** fail closed in creation paths (§4.5). Note the same fallback exists in the manual forms, so a fix has platform scope.

### D5 — Quotation payment terms are not persisted separately from terms

- **Severity:** low–medium (preview/persistence divergence).
- **File / function:** `persistQuotationCreation` (`terms: payload.terms || payload.payment_terms`) versus the card's separate `Payment terms:` row.
- **Reproduction conditions:** a quotation proposal carrying both a distinct `payment_terms` and a distinct `terms`.
- **Impact:** the preview shows a value the saved quotation does not retain separately; the invoice path is unaffected.
- **Status:** **proven** by payload construction.
- **Smallest safe remediation:** add the field to the quotation payload/RPC, or stop rendering it separately on quotation cards.

### D6 — Malformed operation envelope fails silently

- **Severity:** low (UX; no integrity risk).
- **File / function:** `bolu-generation.ts` (`if (envelope.hasOperation && envelope.rawOperation)`) versus `parseStructuredOperationEnvelope` (returns `error` without `rawOperation`).
- **Impact:** no card, raw block stripped, no explanation to the user.
- **Status:** **proven** in code.
- **Smallest safe remediation:** surface `envelope.error` as a single clarification line.

---

## 14. Unverified claims and environmental limitations

OBSERVATION — Claims that remain unverified:

1. That a Bolu-saved invoice or quotation numbers correctly **in the hosted tenant** (`SASINV-…`, `SASQUO-…`). Verified only as code path and pure-function arithmetic.
2. That an `audit_logs` row with `source = 'bolu'` and the human actor exists after a real save. Verified as call shape and signature only; no hosted row was read.
3. That `activity_events` receives the paired CREATED row. Actively doubted (D3).
4. That "Co-created with Bolu" appears on a reopened document. Verified as wiring to persisted `custom_fields`; not seen rendered.
5. That a save executes exactly once. Contradicted for double-submit (D2/D6 in §7.2).
6. That the full Bolu suite passes (the previous agent's 195 + 42 figures). Not re-run; only 46 tests in three files were executed here.
7. That the card renders correctly at any viewport class (§12).
8. That live providers comply with the extended commercial/context prompt. No provider call was made.

OBSERVATION — Environmental limitations:

- No hosted Supabase access, no service-role key, no `VITE_API_URL`, no deployed environment.
- No authenticated browser session or seeded tenant.
- `live-public-schema.sql` is a repository artifact; it may lag the deployed schema, which is why D3 is labelled suspected rather than proven.
- Pre-existing noise retained, not investigated: `audit:load` prints pre-existing ❌/🚨 warnings with exit 0; `searchBoluClients` logs `.is is not a function` from a mock in another suite.

---

## 15. Recommended next actions, prioritised by integrity risk

PROPOSAL — ordered by risk. None is approved or started.

1. **Close the duplicate-document path (D1 + D2).** Decide whether the idempotency key becomes a typed `operation_id` column or an expression index over `custom_fields`. Then treat `23505` on that index as a replay and return the existing document. Until this lands, treat any retried invoice save as capable of producing a duplicate and tell operators to check the document list before retrying.
2. **Make numbering fail closed (D4).** Distinguish "no tenant prefix configured" (default is legitimate) from "the settings read failed" (abort with a user-facing message). This removes the last silent route to `INV-000001`.
3. **Confirm or refute D3 with a single authorised hosted read.** Read `activity_events` and `audit_logs` for one Bolu-created document, on a non-production entity if one exists. If absent, pass `p_entity_id` in the audit helpers.
4. **Add a single-flight guard to Gate 2 (D6/§7.2).** A ref-keyed in-flight set prevents the double click; it is a UX guard, not the integrity fix, and should not be presented as one.
5. **Reconcile quotation payment terms (D5).** Either persist the field or stop separating it in the card.
6. **Replace static source assertions with behavioural tests** for the three highest-risk claims: the invoice replay lookup (type-correct, with a mock that returns nothing then a row), the settings-read failure path, and a concurrent double-submit. The current suite cannot detect D1 or D4 and would pass if both regressed.
7. **Complete the four-viewport inspection** once an authenticated environment exists, and record the result against §12.

---

## Status

**PARTIALLY COMPLETED**

Some verification passed — numbering arithmetic, Gate 1/Gate 2 state transitions, audit actor derivation, provenance persistence, preview field coverage, financial authority, typecheck, audit:load, and 46 targeted tests — but material requirements remain unverified or defective: invoice idempotency is inert (D1), no concurrency-safe claim exists (D2), the activity event is likely missing and silent (D3), and the prefix fallback that produced the original defect is still reachable (D4). Hosted verification and four-viewport inspection were not possible in this environment.
