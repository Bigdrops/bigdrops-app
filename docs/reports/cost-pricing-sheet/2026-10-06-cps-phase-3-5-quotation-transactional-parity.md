# CPS Phase 3.5 — Transactional Quotation Feedback Parity

**Date:** 2026-10-06
**Scope:** Cost & Pricing Sheet (CPS) downstream feedback — Quotation path
**Status:** Complete
**Migration:** `supabase/migrations/20261006120000_tenant_rpc_cps_quotation_transaction.sql`
**Generator:** `scripts/gen-cps-phase35-tenant-rpcs.cjs`

---

## 1. Purpose

Phase 3 added one controlled capability: an approved downstream edit can flow
back into the CPS row that the document came from. It made the **Invoice** path
atomic. On the Invoice, the document save, its item rows, the CPS mutation and
both causal audit events commit in one transaction.

The **Quotation** path kept a gap. A Quotation save has no composite RPC. The
client wrote `quotation_items` with a delete and an insert, then called
`apply_cps_item_feedback_transaction` — **two separate transactions**.

Phase 3.5 closes that gap. The Quotation parent, its exact item set, the
approved CPS feedback and the causal feedback audit now commit as **one
transaction**. If any authoritative step fails, nothing commits.

Phase 3.5 does not redesign the approved-field contract, the planner, the
conversion, or the audit model. It changes the transaction boundary only.

---

## 2. The previous two-transaction gap

Phase 3 left the Quotation save in this shape:

1. read the persisted item baseline,
2. `DELETE` then `INSERT` the `quotation_items` rows,
3. call `apply_cps_item_feedback_transaction`.

Step 3 is atomic by itself: the CPS mutation and both causal audit events commit
together. But steps 2 and 3 are different transactions. If the process died
between them:

```
Quotation saved ......... COMMITTED
CPS feedback ........... never ran → CPS stale
```

The window was narrow and it was never silent. A failed RPC was logged and shown
to the user as a warning ("Saved, but the pricing sheet was not updated"), and
the user could re-save to retry, because the RPC is field-diff idempotent. But
the divergence window still existed, and the warning belonged to the old
compatibility gap. Phase 3 §6.2 and §20 documented this as the natural
follow-up. Phase 3.5 is that follow-up.

---

## 3. New composite Quotation RPC

The tenant RPC installer now ships one more function:

```
__SCHEMA__.save_quotation_with_items_transaction(
    p_entity_id       uuid,
    p_quotation_payload jsonb,
    p_items           jsonb   DEFAULT '[]'::jsonb,
    p_mode            text    DEFAULT 'create'::text,
    p_cps_feedback    jsonb   DEFAULT NULL::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
```

The name follows the existing convention (`save_invoice_with_items_transaction`),
and it mirrors that function's shape: one tenant-scoped composite save. It
returns

```json
{ "id": "<uuid>", "quotation": { ...saved row... }, "items_saved": <n> }
```

`p_cps_feedback` is **optional and defaulted to NULL**. An ordinary Quotation —
one with no chain, a duplicate, or a new draft — calls the RPC and saves
normally, with no CPS work at all.

---

## 4. Transaction boundary

Inside the one function call, in this order:

| Step | Statement | Purpose |
| --- | --- | --- |
| A | `INSERT INTO %I.quotations` (create) or `UPDATE %I.quotations` (edit) | Persist the parent |
| B | `DELETE FROM %I.quotation_items WHERE quotation_id = …` then the item `INSERT` loop | Persist the exact item set |
| C | `IF p_cps_feedback IS NOT NULL THEN PERFORM __SCHEMA__.apply_cps_item_feedback_transaction(p_entity_id, p_cps_feedback); END IF` | Apply approved feedback |
| D | `SELECT to_jsonb(t) … RETURN jsonb_build_object('id', …, 'quotation', v_row, 'items_saved', v_count)` | Read back and return |

A single `PERFORM` inside a PL/pgSQL function runs in the caller's transaction.
Feedback runs **after** the item rows exist and **before** the saved row is read
back, so the returned Quotation is the post-feedback state.

There is deliberately **no `EXCEPTION` handler**. An unhandled exception in a
PL/pgSQL function aborts the whole surrounding transaction and rolls back every
statement in it, including the parent insert, the item delete/insert and the
CPS mutation. The feedback call is guarded only by `IF p_cps_feedback IS NOT
NULL`, never by a status check that could swallow a failure. The Phase 3.5 tests
assert the absence of `EXCEPTION WHEN` and of any `raise notice` guard around the
feedback call.

### Roll-back semantics

| Failing step | Result |
| --- | --- |
| Parent insert/update | Nothing commits; the error surfaces to the caller. |
| Item insert (e.g. a bad payload) | Parent and items roll back; the feedback is never reached. |
| `apply_cps_item_feedback_transaction` | Parent, items **and** any partial CPS work roll back. CPS is unchanged. |

If required feedback fails, **the Quotation is not saved**.

---

## 5. Feedback reuse

Phase 3.5 does **not** create a second implementation of the feedback rules.
`apply_cps_item_feedback_transaction` is reused **unchanged** and is now the
shared transactional feedback authority for both composite saves:

- `save_invoice_with_items_transaction` (Invoice) — Phase 3,
- `save_quotation_with_items_transaction` (Quotation) — Phase 3.5.

The test `I34` extracts both the Invoice RPC body and the feedback helper body
from the Phase 3.5 migration and from the Phase 3 migration and asserts they are
**byte-identical**. The approved-field contract

```sql
IF v_field NOT IN ('sp', 'description', 'image_url') THEN
```

appears exactly once in the whole migration.

### Feedback contract (unchanged)

| Downstream field | CPS field |
| --- | --- |
| `unit_price` | `sp` |
| `description` | `description` |
| `image_url` | `image_url` |

Nothing else feeds back. `cp` is never a feedback target, and the string `'cp'`
still does not appear anywhere in the migration. The composite RPC adds no new
writable CPS field of its own and contains no `UPDATE %I.cps_rows` statement —
only the reused helper writes `cps_rows`.

---

## 6. Authority handling

The SQL-side authority gate from Phase 3 stays mandatory and is re-run **inside
the transaction**. A stale or forged client plan cannot retarget a CPS row.

Before mutating CPS, `apply_cps_item_feedback_transaction` re-validates:

1. tenant permission for the document type,
2. `chainId` / `sourceDocumentId` / `sourceCpsId` are present,
3. the authority row exists
   (`conversion_chain_id = v_chain_id AND feedback_authority IS NOT NULL`),
4. the authority **stage** equals the saving document type,
5. the authority **document id** equals the document being saved,
6. the CPS root is re-derived from the chain owner,
7. exactly one persisted item row matches the mutation's lineage,
8. the originating CPS row still exists,
9. the field is in the approved tuple,
10. the field actually changed (field-diff idempotency).

### The three authority states on the Quotation path

| State | Behaviour |
| --- | --- |
| **Active** — the Quotation owns authority | The planner produces a plan; the transaction applies it atomically. |
| **Inactive** — authority moved to the Invoice after conversion | The planner returns no plan (`authority-mismatch`); the RPC is called with `p_cps_feedback` **omitted entirely**; the Quotation still saves. |
| **Reverted** — the Invoice reverted to a Quotation in the same chain | Authority is back on the Quotation; its next valid edit plans and applies feedback atomically. |

The client spreads the feedback argument only when a plan exists:

```ts
...(p_cps_feedback ? { p_cps_feedback } : {})
```

so an inactive or non-CPS Quotation sends no feedback argument at all and the
inactive save never fails merely because it lacks feedback authority.

---

## 7. Lineage handling

Lineage rules are unchanged and are enforced in SQL, not merely in the planner.

A mutation targets a CPS row only through the exact persisted pair:

```
source_cps_id + source_cps_row_id
```

In the helper, the item lookup matches on `it.quotation_id = v_source_doc_id AND
it.source_cps_id = v_cps_id AND it.source_cps_row_id = v_cps_row_id`. The test
`D16` strips comments from the helper body and asserts that the lookup reads **no
other item column** — not description, sub-description, make, `item_id`,
`sort_order`, `unit_price`, quantity, unit, `image_url`, `group_id`,
`group_name`, `amount`, VAT rate or discount rate — and that no fuzzy comparison
(`similarity`, `ILIKE`, `LIKE '…'`) exists.

| Case | Behaviour |
| --- | --- |
| No lineage pair | The row is not indexed; it can never create or attach to a CPS row. |
| Incomplete / non-persistable pair | Not indexed and not reported; it never claimed ancestry. |
| Lineage key appears more than once | `ambiguous-lineage`; both occurrences refused. |
| Key absent from the before-state (added downstream) | `row-not-in-baseline`; refused. Never creates a CPS row. |
| `section` / `group_header` row | `section-row`; never participates. |
| CPS origin row no longer exists | The mutation is skipped (`Originating CPS row unavailable for …`) and recorded as `FEEDBACK_SKIPPED`. |

The helper only ever `UPDATE`s an existing `cps_rows` row. It contains no
`INSERT INTO __SCHEMA__.cps_rows` and no `DELETE FROM __SCHEMA__.cps_rows`, so a
missing origin is never recreated.

---

## 8. Causal audit

The Phase 3 event model is preserved and now commits **inside** the Quotation
transaction:

1. `DOWNSTREAM_ITEM_UPDATED` — the human edit (`actorType: 'user'`), written
   first, its id captured with `RETURNING id INTO v_parent_id`.
2. `CPS_FEEDBACK_APPLIED` — the automatic consequence
   (`actorType: 'automated-feedback'`), with
   `parentEventId = v_parent_id` and `chainId = v_chain_id`.
3. `FEEDBACK_SKIPPED` — the diagnostic event for a refused mutation, with the
   diagnostics joined via `array_to_string(v_diagnostics, ' ')`.

Because the helper runs inside the composite transaction, both the CPS mutation
and both causal events commit with the Quotation, or none of them do. The
composite Quotation transaction becomes the authoritative Quotation
causal-audit path.

**No audit event is written outside the transaction after success.** The
`afterSave` step in the hook still writes the ordinary document audit
(`recordAuditLog`) on both paths, but it contains **no** `recordCpsAuditEvent`
call and no reference to `DOWNSTREAM_ITEM_UPDATED` or `CPS_FEEDBACK_APPLIED`.
The test `E11` asserts this.

---

## 9. Idempotency

The two Phase 3 layers still hold on the Quotation path.

1. **Plan level.** When the three approved fields do not change,
   `planCpsFeedback` returns zero mutations, `buildCpsFeedbackPayload` returns
   `null`, and the transaction is opened with no feedback argument.
2. **Field-diff level.** Inside the helper, a mutation whose approved fields
   already hold the incoming values writes nothing
   (`IF v_mutation_applied = 0 THEN CONTINUE`). A retry cannot duplicate a
   feedback event.

The composite RPC performs no field comparison of its own; the helper owns it.

---

## 10. Client persistence layer

The transaction logic lives in a new domain module, not in the React hook, so no
diff logic hides inside a save hook and no component owns the transaction.

`src/domain/quotation/quotationSaveTransaction.ts` (205 lines) exports:

- `serializeQuotationItems(items)` — maps items through the existing
  `toDbItem(item, null, index)` serializer. The composite RPC supplies
  `quotation_id` itself, so the id column is not part of the payload contract.
- `persistQuotationTransaction(input)` — the authoritative save.
- Types `QuotationTransactionInput` and `QuotationTransactionResult`.

`persist` returns:

- **Create** — one RPC call site with `p_mode: 'create'` and
  `p_cps_feedback: null`, wrapped in `withUniqueRetry` for number collisions. A
  manual number surfaces `23505` immediately; only a system-generated candidate
  retries. The automatic cursor advances only for a system-generated number.
- **Update** — `p_mode: 'update'`; feedback is planned **before** the RPC from
  the persisted baseline, then spread into the same call.

There is **no fallback here after an error**. Both create and update map every
RPC error through `quotationSaveError(error)` and return `{ data: null, error }`.
`quotationSaveError` maps SQLSTATE `42501` (or an "insufficient permissions"
message) to a friendly "You don't have permission to save this quotation."
Failing visibly is preferred over silently switching to a weaker consistency
model.

### Persisted baseline

The before-state is the **persisted database baseline**, read before the
transaction:

```ts
const chainId = normalizeChainId(input.initialQuotationSnapshot?.conversion_chain_id)
if (!chainId) return null
beforeRows = await loadCpsFeedbackRows(tenantClient, 'quotation', id)
```

A **baseline read failure throws** and the save fails. It is never flattened
into an empty baseline, because an empty baseline would classify every linked row
as newly added and would silently suppress the feedback the user performed. The
test `a failed baseline read fails the save instead of sending an unverified
diff` asserts the plan function `throw`s and does not `return null` in its
`catch`.

---

## 11. Removing the normal two-transaction path

The normal production path now runs exactly **one** authoritative write:

```
save_quotation_with_items_transaction(  parent, items, cps_feedback  )
```

The hook `src/hooks/useQuotationSave.ts` (464 lines, down from 606) no longer
writes the items itself and no longer calls feedback after the save. It sets a
module-level `_quotationPersistMode` and delegates:

| Mode | When set | What happens |
| --- | --- | --- |
| `'offline'` | native offline draft | No tenant write; nothing to commit. |
| `'rpc'` | `entityId` is present | Delegates the whole save to `persistQuotationTransaction`. |
| `'legacy'` | no tenant `entityId` | The isolated compatibility fallback. |

`afterSave` reads `const compositePersisted = _quotationPersistMode === 'rpc'`
and wraps **all** item writes **and** the `runCpsDownstreamFeedback` call inside
`if (!compositePersisted) { … }`. There is exactly **one**
`runCpsDownstreamFeedback(tenantClient` call site in the whole file, and the
test `A5` asserts it sits after the `if (!compositePersisted) {` branch, so it is
unreachable once the composite transaction persisted the save.

---

## 12. Compatibility / fallback policy

The only remaining non-transactional path is the pre-cutover compatibility
fallback, isolated and labelled twice with `COMPATIBILITY FALLBACK ONLY`.

| Property | Policy |
| --- | --- |
| When entered | Only when there is **no tenant `entityId`** to scope the RPC, or a native offline draft. |
| When the RPC is available | Never used. `entityId` present ⇒ `_quotationPersistMode = 'rpc'`. |
| After an authoritative RPC error | **Never** entered. All RPC errors return `{ data: null, error }`; nothing retries through the legacy path. |
| The old warning | "Saved, but the pricing sheet was not updated" is **never** shown on the authoritative transactional path. |
| Labelling | Exactly two `COMPATIBILITY FALLBACK ONLY` labels, in `persist` and `afterSave`. |

The test `an RPC error never silently falls back to the weaker path` asserts the
transaction module contains no `_quotationPersistMode`, no
`COMPATIBILITY FALLBACK`, and no direct `quotations` insert/update.

### Expected no-feedback vs. failed required feedback

| Situation | Behaviour |
| --- | --- |
| Non-CPS Quotation (no chain) | Save succeeds; the feedback path is never invoked. |
| Inactive-authority Quotation | Save succeeds; no CPS change; the feedback argument is omitted. |
| Duplicated Quotation | Save succeeds; no lineage, no feedback. |
| **Active authority, required feedback fails** | **Save rolls back**; a clear save error is returned. |

---

## 13. Tenant installer changes

The migration is generated by `scripts/gen-cps-phase35-tenant-rpcs.cjs` (481
lines) from the Phase 3 installer
(`20261005160000_tenant_rpc_cps_downstream_feedback.sql`). The generator applies
**exactly one** edit: it appends block 30,
`save_quotation_with_items_transaction`. Every other tenant RPC body stays
byte-identical to Phase 3.

### Generator protections

The generator keeps its `edit(label, find, replace)` helper with loud guards:

- `ANCHOR MISSING` — thrown when an anchor does not appear at all.
- `ANCHOR NOT UNIQUE (n)` — thrown when an anchor expected once appears more
  than once.

Contract probes assert the key anchors appear exactly once (the `PERFORM` call,
the `p_cps_feedback jsonb DEFAULT NULL::jsonb` default, the
`COALESCE(NULLIF(p_quotation_payload` custom-fields cast, the
`(v_item->>'custom_data')::jsonb` cast), that `'cp'` is absent, and that the
feedback helper is installed **before** the Quotation RPC. A silent anchor drift
cannot happen.

### Provisioned / unprovisioned schemas

One installer remains authoritative:
`public._prov_install_tenant_rpcs`. It now ships all three functions to every
future tenant:

- `save_quotation_with_items_transaction`,
- `save_invoice_with_items_transaction`,
- `apply_cps_item_feedback_transaction`.

The backfill guard re-runs the installer only against schemas that contain all
required tables — a schema missing any of them is skipped, so a partially
provisioned or in-progress tenant never aborts the migration:

```
activity_events, audit_logs, invoices, invoice_items,
quotations, quotation_items, cps_sheets, cps_rows
```

The migration ends with `NOTIFY pgrst, 'reload schema';`.

No table, column or index is added. No synchronization queue, feedback job table,
event bus or polling table is introduced. Phase 3.5 is transactional parity, not
distributed synchronization.

---

## 14. Schemas updated

Verified live against the hosted project:

| Check | Result |
| --- | --- |
| Migration applied (Local == Remote) | `20261006120000` on both |
| `save_quotation_with_items_transaction` present | **11 of 11** provisioned schemas, `pronargs = 5` |
| `save_invoice_with_items_transaction` | still `pronargs = 5` in 11 of 11 |
| `apply_cps_item_feedback_transaction` | 11 of 11 |
| Installer `prosrc` length | 80832; contains all three RPC names |
| Schemas skipped | **3** (agam, issa-certified, ororo — no CPS tables) |
| Probe rows leaked | 0 (`probe_quotations: 0`, `probe_items: 0`) |

Provisioned schemas: adel, agbado, alarm, allan, anthropology, azerbaijan, jig,
lomo, main, ogombo, opaque.

---

## 15. Files changed

### New in this phase

| File | Lines | Role |
| --- | --- | --- |
| `src/domain/quotation/quotationSaveTransaction.ts` | 205 | Authoritative Quotation save transaction, planner call, error mapping |
| `scripts/gen-cps-phase35-tenant-rpcs.cjs` | 481 | Migration generator (one append edit) |
| `supabase/migrations/20261006120000_tenant_rpc_cps_quotation_transaction.sql` | 2419 | Tenant RPCs (block 30 + backfill + reload) |
| `src/tests/critical/cpsQuotationTransactionParity.test.js` | 729 | Focused suite, 34 tests |

### Modified in this phase

| File | Change |
| --- | --- |
| `src/hooks/useQuotationSave.ts` | Delegates to `persistQuotationTransaction`; isolates the compatibility fallback behind `_quotationPersistMode` |
| `src/tests/critical/cpsDownstreamFeedback.test.js` | One Phase 3 test renamed to describe the isolated fallback |

The Phase 3 test rename is:

```text
- the Quotation path applies feedback after its rows persist and reports failure
+ the Quotation compatibility fallback applies feedback after its rows persist and reports failure
```

That path is now the isolated fallback, not the primary path. The test `the
Phase 3 suite was updated to describe the fallback, not the primary path` asserts
the rename and keeps the ordering contract inside the branch.

---

## 16. Tests

`src/tests/critical/cpsQuotationTransactionParity.test.js` — **34 tests, 34
pass**, covering numbered cases **1–37** across the A–I matrix plus five
failure/wiring tests.

| Group | Cases | Content |
| --- | --- | --- |
| A | 1–5 | One RPC persists parent, items and feedback; feedback planned before and passed inside; parent → items → feedback → return ordering; roll-back has no exception handler; the hook runs no second feedback call |
| B | 6–12 | The three approved fields map to `sp` / `description` / `image_url`; `cp`, quantity, unit and make are inert; the shared helper is reused, not copied |
| C | 13–15 | Active authority plans; inactive authority sends nothing but still saves; reverted authority plans again; inactive omits the argument entirely |
| D | 16–20 | SQL lineage gate requires the exact pair with no heuristic column; lineage-null, added and ambiguous rows are refused; a missing origin is auditable and never recreated |
| E | 21–25 | The causal pair commits inside the transaction; `DOWNSTREAM_ITEM_UPDATED` precedes `CPS_FEEDBACK_APPLIED`; `RETURNING id INTO v_parent_id`; `chainId` matches; `FEEDBACK_SKIPPED` remains supported; no audit outside the transaction |
| F | 26–27 | Unchanged save sends no payload; repeated identical save writes no new event |
| G | 28–30 | No-chain Quotation does no CPS work (zero reads); duplicate never feeds back; the RPC still persists an ordinary Quotation; no CPS special-case in the save path |
| H | 31–33 | Installer ships the composite RPC to future tenants; backfill targets provisioned schemas only; generator guards stay wired; `NOTIFY pgrst` present |
| I | 34–37 | Invoice RPC and helper byte-identical to Phase 3; invoice hook untouched; the RPC computes nothing; conversion stays one-way and the CPS side never writes downstream |

Five more tests cover the failure and wiring contracts: the isolated
compatibility fallback, a failed baseline read failing the save, an RPC error
never silently falling back, tenant scoping plus permission gating, and the
`jsonb` return shape / explicit `::jsonb` and `::date` casts.

### Two real SQL defects the harness caught

The temporary probe harness (a temp copy of the RPC run against
`entity_bigdrops-main_main` with stubbed helpers) found two genuine defects, both
fixed in the generator:

1. **Missing `::date` on `valid_until`.** `quotations.valid_until` is `date`, and
   `text` has no assignment cast to `date`, so the cast must be explicit on the
   `USING` expression. Same for `issue_date` on the update path.
2. **`v_row record` → `v_row jsonb`.** A `record` variable holding
   `SELECT to_jsonb(t)` serializes as `{"to_jsonb": {...}}`, which nests the saved
   row one level too deep and makes `result.quotation.quotation_number`
   unreadable to the caller.

A type note in the generator records the underlying cause:
`invoices.custom_fields` is `TEXT` (so the invoice RPC can pass the payload
value straight through), but `quotations.custom_fields` and
`quotation_items.custom_data` are `JSONB`, and PostgreSQL has **no assignment
cast** from `text` to `jsonb`. The cast must be explicit and must sit on the
`USING` expression.

### Live RPC verification

The composite RPC was exercised live against `entity_bigdrops-main_main` column
types:

| Check | Result |
| --- | --- |
| Create returns `{ id, quotation, items_saved }` | `quotation_number` / `issue_date` / `valid_until` readable |
| Update preserves the id | returns `total`, `status` |
| Duplicate number | raises `unique_violation: 23505` |
| Feedback plan passthrough | passed verbatim to the helper (1 call) |
| `custom_fields` stored | a jsonb **object** (not a string) |
| Item rows persist | both `standard` and `group_header` rows, correct lineage |
| Permission gates | raise `42501: Insufficient permissions: quotation/create required` and `.../quotation/edit required` |
| Probe rows leaked | 0 |

---

## 17. Verification

| Command | Result |
| --- | --- |
| `bun run typecheck` | Exit 0 |
| `bun run audit:load` | Exit 0. 871 files; 36 oversized / 8 broad selects / 1 component fetch / 4 heavy limits — same as the Phase 3 baseline. No Phase 3.5 file is flagged. |
| Focused suite (`cpsQuotationTransactionParity`) | 34 tests, 34 pass, 0 fail |
| Affected suites (10 CPS suites incl. the new one) | 227 tests, 227 pass, 0 fail |
| `bun run test` | 804 tests, 791 pass, 13 fail |
| `git diff --check` | Exit 0 |
| `git status --short` | Only the Phase 3.5 files plus concurrent non-Phase-3.5 edits |
| `bun run build` | **Not executed**, as required by the 4 GB RAM limit |

`useQuotationSave.ts` was briefly flagged oversized at 606 lines during this
phase. It was fixed by moving the transaction into
`src/domain/quotation/quotationSaveTransaction.ts`, which also keeps the domain
boundary clean (business logic in `src/domain/`, renderers/save orchestration in
the hook).

### Baseline failure identity

`bun run test` went from 770 tests / 757 pass / 13 fail (pre-Phase-3.5) to 804
tests / 791 pass / 13 fail. The 13 failures are **byte-identical** to the
documented pre-Phase-3.5 baseline:

- 3 loader failures: `cpsIndustry`, `cpsLedger`, `cpsPdf` (`.tsx` and `.woff`).
- 4 browser-environment failures: `invoiceAccountingIntegration`,
  `paymentAccountingIntegration`, `remediationContract`,
  `sourceTransactionContract`.
- 5 stale `cpsViewProductionRedesign` tests.
- 1 `itemCleanupExportImport` test (`validateFlaggedCleanupImport`).

No new failure was introduced.

### Acceptance criteria

| # | Criterion | Result |
| --- | --- | --- |
| 1–2 | Quotation save is an authoritative composite transaction; parent and items commit together | Pass |
| 3–4 | Approved CPS feedback and causal audit execute inside the same transaction | Pass |
| 5–6 | A feedback failure rolls back the Quotation save; an item failure prevents the CPS mutation | Pass |
| 7 | A successful save runs no post-save feedback RPC | Pass |
| 8–9 | The pure planner stays authoritative; the persisted baseline stays the before-state source | Pass |
| 10–14 | The three approved fields work; `cp` and all non-approved fields stay untouched | Pass |
| 15–17 | Active authority is enforced; an inactive Quotation saves without feedback; a reverted Quotation feeds back again | Pass |
| 18–21 | Exact lineage is mandatory; no heuristic matching; downstream-added rows create no CPS row; a missing origin stays auditable | Pass |
| 22–24 | `DOWNSTREAM_ITEM_UPDATED` is the causal parent; `CPS_FEEDBACK_APPLIED` points to it; `chainId` is consistent | Pass |
| 25–27 | A repeated identical save creates no feedback; a duplicate cannot feed back; an ordinary Quotation saves normally | Pass |
| 28–31 | Invoice transactional feedback is unchanged; commercial and CPS calculations are unchanged; conversion is unchanged | Pass |
| 32–35 | The installer is updated; future tenants receive the composite RPC; provisioned schemas receive it; incomplete schemas are skipped | Pass |
| 36–37 | No speculative table/index is introduced; no new feedback UI is introduced | Pass |
| 38–39 | `bun run typecheck` and `bun run audit:load` pass | Pass |
| 40–41 | Focused tests pass; affected suites pass with only documented pre-existing failures | Pass |
| 42–43 | `git diff --check` passes; `git status` shows the exact scope | Pass |
| 44 | `bun run build` is not executed | Pass |
| 45 | The implementation report is complete | Pass |
| 46 | The report does not claim unverified end-to-end runtime success | Pass |

---

## 18. Runtime-validation readiness

The architecture is ready for the following manual/runtime chain. Each arrow is
a single transaction:

```
CPS
→ Convert to Quote
→ Edit linked Quote item        → CPS updates atomically
→ Convert Quote to Invoice
→ Edit linked Invoice item      → CPS updates atomically
→ Edit old Quote                → CPS does NOT update
→ Revert Invoice to Quote
→ Edit reverted Quote           → CPS updates atomically
```

**No real seeded chain exists.** Live inspection found that neither `jig` nor
`main` has a CPS→Quote→Invoice conversion chain with feedback authority, so the
applied row-write path has **not** been exercised on real data. Runtime
end-to-end success is **not** claimed. The transaction boundary, the authority
gate, the lineage gate and the audit causality are covered by the focused tests
and by static review of the SQL, and the composite RPC was executed live against
real column types with stubbed helpers. The step that remains unverified on real
data is the CPS row write and its two audit events over a genuinely
CPS-derived document chain.

---

## 19. Remaining limitations

1. **The applied path has never run on real seeded data.** No tenant has a
   CPS-derived conversion chain with authority yet, so no live
   Quotation→CPS feedback has been observed end to end. See §18.

2. **The compatibility fallback still exists for the no-entity-id case.** It is
   isolated, labelled twice, and never entered when the composite RPC is
   available or after an RPC error — but it is still two transactions. It is a
   pre-cutover path, not the production normal path.

3. **Three tenants are not provisioned** (agam, issa-certified, ororo). They have
   no CPS tables and received no RPCs; the backfill guard skips them by design.
   They must be provisioned before CPS feedback can work there.

4. **`tenant_master_template` has no tenant RPCs.** The installer creates them per
   tenant. A future provisioning run must include all three functions.

5. **Last-save-wins concurrency is unchanged.** Phase 3.5 does not add optimistic
   locking or version conflicts; that is out of scope. The authority gate limits
   feedback to one document and the transaction is atomic, but a lost update
   across two sequential saves is still possible by design.

6. **No new indexes.** The composite save adds no query pattern beyond what the
   Phase 2 and 2.5 indexes already cover. A very large tenant may eventually want
   an index on `cps_rows (cps_sheet_id, id)`.

7. **The `image_url` field still lives inside the `cps_rows.cells` JSON payload.**
   Feedback writes `cells` and the `description` column. No dedicated
   `image_url` column was introduced.

---

## 20. Scope note

Phase 3.5 changes exactly two production files (`useQuotationSave.ts` and the new
`quotationSaveTransaction.ts`), adds one migration and one generator, and renames
one Phase 3 test description. The working tree also contains concurrent
non-Phase-3.5 edits (document form presentation, waybill/unit-input components,
and others) from other agents; those were left untouched. Nothing is committed.

`bun run build` was not executed at any point, as required by the host's 4 GB RAM
limit.
