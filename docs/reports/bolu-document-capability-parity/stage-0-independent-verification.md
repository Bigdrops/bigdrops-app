# Stage 0 — Independent Verification Audit of the Bolu Modification Integrity Fix

**Date:** 2026-11-18 · **Type:** AUDIT — Read-only verification (no files, tests, migrations or Git state were modified) · **Scope:** the three Stage 0 attributable paths against the tenant RPC contracts and adversarial item-identity cases.

**Status: Partially completed.** Two material item-identity findings prevent unconditional progression to scratch-tenant verification without an ambiguity guard (Finding A-1, A-2). Non-blocking defects and verification gaps are enumerated in §A/§B. The Stage 0 report's "Partially completed" status is upheld, not upgraded. This audit authorizes nothing further.

---

## 0. Evidence register (what was actually consulted)

- `git diff` of `src/lib/ai-assistant/bolu-document-service.ts` (729-line diff), `src/lib/ai-assistant/bolu-operations.ts` (14-line diff); `git status --porcelain=v1` (baseline recorded in §6).
- Full read of current `bolu-document-service.ts` (rename/match/serialization/persist paths) and `bolu-operations.ts` (validators).
- SQL source-of-truth: `supabase/migrations/20261118130000_bolu_tenant_rpc_installer.sql` — `save_invoice_with_items_transaction` (create at ~L40-136, update ~L150-205, item insert ~L211-273, delete at L211), `save_quotation_with_items_transaction` (update ~L2214-2265, item insert ~L2286-2340, permission gates at L59/69 (invoice create/edit) and L2126/2136 (quotation create/edit)). Verified `has_entity_permission(... 'edit')` **does** gate the `p_mode='update'` branch on both families.
- Base schemas `supabase/migrations/20260520090002_quotations.sql`, `20260520090003_invoices.sql` (column types incl. `invoices.custom_fields text`, `quotations.custom_fields jsonb`).
- `supabase/migrations/20261118120000_bolu_operation_idempotency.sql` (operation_id partial unique indexes).
- `src/lib/Calculations.ts` (`calculateDocument`, engine semantics) — not modified.
- `src/tests/ai-assistant/bolu-modify-integrity.test.js` (1028 lines) side-by-side with the SQL.
- Prior task's claims cross-checked against git (not trusted: `git archive HEAD src package.json` re-created pristine baselines for the failing critical-suite tests and the AI-assistant batch failure — both reproduced identically on HEAD).

**Not independently executed:** no database/scratch tenant attached in this environment; SQL bodies were read, never run. All "observed" runtime behavior is either harness-emulated (and is labeled as such) or source-derived.

---

## A. Blocking Stage 0 defects

### A-1 — Ambiguous similarity matches silently transfer persisted metadata to the wrong row (critical)

**Where:** `src/lib/ai-assistant/bolu-document-service.ts:287-330` (`matchBoluItems` Pass 2), especially the scoring function at `:305-313` and the per-candidate tie-break at `:322-325`.

**Contract evidence:** line 314's comment claims "greedy similarity, highest score first; ties break by position", but the loop at `:316-331` processes new items **in payload order**, not highest-score order; every item matches its remaining candidates locally. Tie-breaking at `s === bestScore` prefers the candidate **closest in position** (`Math.abs(j - i) < Math.abs(bestIdx - i)`). Positional nearness is not identity.

**Concrete failure (verified by hand-trace through the implementation):**

Current rows: `R0 = { description: 'Salt', quantity: 1, unit_price: 15000, unit: 'unit', item_id: null, image_url: 'IMG-A.jpg', source_quotation_item_id: LIO(x), custom_data: { partNo: 'S-1' } }` and `R1 = { description: 'Salt', quantity: 1, unit_price: 15000, unit: 'unit', item_id: null, image_url: 'IMG-B.jpg', source_quotation_item_id: LIO(y), custom_data: { partNo: 'S-2' } }` — two identical lines.

Model returns the unchanged list reordered: `[ { ...salt R1 fields }, { ...salt R0 } ]` (or any two identically-described rows). For new item 0, scores are 15 for **both** current rows; j=0 wins by the `s > bestScore` seeding and the tie rule cannot improve it (j=1: `Math.abs(1-0) < Math.abs(0-0)` is false). Row 0 of the payload — whatever its lineage — inherits the persisted row 0's `image_url`, `source_quotation_item_id`, `custom_data.partNo`, `install_rate_override`, `group_id/group_name` regardless of whether it actually corresponds to row 0 or row 1. Order in the payload therefore reassigns identity-bearing metadata to indistinguishable rows. The swap is invisible to the user, persists to the database, and mis-attributes `source_*` (which is used for downstream CPS/price-list feedback authority) to the wrong origin row.

Same mechanism covers: (a) identical duplicates after a user reorder; (b) two near-identical rows (`desc` equal, same qty/price/unit) — deterministic, silent, identity-unproven.

**Why the tests did not catch it:** the harness seeds rows with pairwise-distinct descriptions (`'Reactor vessel body'`, `'Mounting rig'`, `'Lifting lugs'`, and quotation's single row), so no tie or reorder occurs. No test exercises duplicates, reordering, or ambiguous ties, and no test asserts that lineage/partNo/image follows the *correct* row rather than the *nearest* row.

**Smallest safe correction to consider (do not implement here):** treat any similarity-based match involving two equally-scoring unmatched candidates as *ambiguous* and **abstain from metadata transfer** (construct the row fresh / null the transferable identity fields) OR require an identity-grade signal for transfer (`item_id` or item `id`; exact description equality alone is not identity between duplicates). Surface an ambiguity counter in the operation result rather than guessing. The mandated verdict in §D hinges on this: yes, `matchBoluItems` requires an ambiguity guard before scratch-tenant verification.

### A-2 — Weak-signal matches (score as low as 1) transfer all identity metadata (high)

**Where:** scoring at `:305-313`; `bestScore > 0` acceptance at `:327`. A match needs only **one point**: a single shared `unit` between unrelated rows. `"match"` with score 1 (unit-only), 2 (price-only or qty-only), or 3-4 (two shared secondary attributes) transfers `item_id`, `source_*` lineage, `image_url`, `custom_data.partNo/condition`, `install_rate_override`, `formula`, `show_install_rate` and group metadata between merchandise rows that may share no real identity.

**Concrete failure:** proposal contains `{ description: 'Charcoal', quantity: 4, unit_price: 50000, unit: 'unit' }` while the document holds an unrelated `{ description: 'Cement', quantity: 1, unit_price: 50000, unit: 'unit' }`. Score: desc 0 + qty 0 + price 2 + unit 1 = **3 > 0** — the unrelated Cement row's catalog link, lineage, image and custom data are copied onto the Charcoal row. The user asked only to add a line; the Cement row (unmatched, deleted) leaks its identity into the Charcoal row.

**Smallest safe correction to consider:** a transfer floor — e.g. transfer only when description matches exactly (score ≥ 10), or `item_id`/`id` matches (Pass 1), or ≥ qty+price+unit with **unambiguous uniqueness among unmatched candidates**; otherwise treat as a new row and report. A floor of 5 (desc 0 + qty 2 + price 2 + unit 1) excludes the worst cases; a hard desc≥10 floor is the conservative option; the exact threshold is an authorized decision, not this audit's call.

### A-3 — Complete description replacement silently recreates the row, resetting lineage and metadata (high)

**Where:** Pass 2 at `:327` — when the best score is 0 (`quantity`, `unit_price`, `unit` all changed, plus description rewritten), the item is matched to nothing; the RPC then **deletes the original row and inserts a new one**, and `mergeBoluItem` cannot transfer anything (`current = null`). The user sees a visually valid list; `id` is new; `item_id`, `source_*`, `image_url`, `install_rate_override`, `custom_data` are gone.

**Concrete failure:** user says "change that line to 'Charcoal, 1kg bags' at ₦9,000, 20 bags". New line matches nothing; original line deleted. Lineage and catalog identity reset with no warning.

**Smallest safe correction to consider:** abstain **explicitly** (new row, elevated to a visible notice — e.g. `result.warnings`) rather than via stealth; OR require user confirmation when no candidate scores above floor but a row is being removed. Authorized UX decision; not to be implemented inside this audit.

### A-4 — Comment/documentation misrepresents matcher semantics (medium; fix with A-1)

`:314` states "greedy similarity, highest score first". Actual behavior is payload-order per-item matching with strictly-increasing local maxima. Misleading to future maintainers and invalidates any audit that relies on the comment. Fix with A-1/A-2 guards.

---

## B. Verified guarantees (source-to-SQL correspondence)

**B-1. RPC UPDATE-written columns ⊆ snapshot.** Both modify configurations select **every** column the composite RPC UPDATE branch writes:
- Invoice UPDATE (installer migration ~L150-205): `po_number, invoice_title, client_name, project_id, issue_date, due_date, status, payment_terms, notes, terms, workmanship, transportation, shipping, discount, vat, wht, custom_fields, work_duration, subtotal, install_rate_total, total, amount_in_words` → all present in the invoice snapshot (`src/lib/ai-assistant/bolu-document-service.ts:966-968`).
- Quotation UPDATE (~L2214-2265): `po_number, quotation_title, client_name, project_id, issue_date, valid_until, status, notes, terms, workmanship, transportation, shipping, discount, vat, wht, subtotal, install_rate_total, total, amount_in_words, custom_fields` → all present in the quotation snapshot (L979-982).
- The RPC payload is `{ ...currentDoc, ...updates }` (L1143-1152) — snapshot keys ride verbatim; `id` passed explicitly. **No SQL-written column can be destroyed by omission anymore.** Note: extra snapshot keys (`document_type`, `archived_at`, `invoice_number`) are never written by the RPC (harmless), and `client_id` is never written (identity lock intact by construction).
- Limit: correspondence is source-verified and harness-enforced only. Hosted tenant RPC body is unknown to this audit; the migration may not be applied on the live instance.

**B-2. `invoices.custom_fields` (text) round-trip is verbatim.** Snapshot reads raw string; payload carries the string back; RPC writes `payload->>'custom_fields'` with no cast (text ⇒ text). No re-serialization occurs unless the user explicitly modifies quotation `payment_terms` (text branch writes `JSON.stringify` of merged object — explicitly requested edit only). Harness test 1/8 confirm semantic equality (parsed deep-equal) of the seeded advance-bearing `custom_fields` across a due-date-only modify. **Limit:** byte-for-byte preservation is not proven (JSON text comparison is semantic); hosted text round-trip not executed.

**B-3. `quotations.custom_fields` (jsonb) round-trip is semantic.** Snapshot returns a JS object; payload nests it; RPC wraps in `COALESCE(NULLIF(p->>'custom_fields',''),'{}')::jsonb`. JSONB cast normalizes lexical formatting (key order, whitespace), so byte equality is not claimed — semantic equality is the correct criterion, and the harness compares semantically (parse-then-deepEqual). `payment_terms` modify merges `{...cf, payment_terms}` (L404-407), preserving unrelated keys including `advance_invoice`-style siblings. **Limit:** live jsonb round-trip not executed.

**B-4. Computation hydration prefers persisted inputs.** Items modify recomputes through `computeDocument({ items: merged, document: currentDoc, cf, columns })` (L1116-1130), where `cf = parseCustomFields(currentDoc.custom_fields)` and `cf.calculationInputs` is used verbatim; otherwise `inferLegacyCalculationInputs` (the form's own legacy path). Never 7.5%/0/0 boilerplate. Hidden VAT/discount/install columns (`hide_full`) honoured via `cf.columnConfig`. Fixed charges and extra charges (with their VAT flags) flow from `document.workmanship/transportation/shipping` and `cf.extraCharges`. `install_rate_total` is written back for both families. **Limit:** the engine-vs-persisted check is executed against the same engine the service uses — appropriate for integrity verification, but it is not an independent re-derivation; the engine is trusted, not re-proven here.

**B-5. Items persisted via RPC insert mapping.** Invoked with `p_items` from `serializeBoluItem` → `toDbItem` (L1137-L1139 → L445-487, `src/domain/invoice/factories.ts:97-123`); payload keys align 1:1 with the RPC item INSERTs (invoice `~L225-273`, quotation `~L2286-2340`), incl. `custom_data` (jsonb cast of the stringify), `item_id`/`source_*` (NULLIF ''::uuid), `install_rate_override` (COALESCE false). `row_type` always present (RPC `INSERT` lists it; NOT NULL). **Limit:** row UUIDs of items are deleted/re-inserted (new ids); lineage survives; item identity does not — pre-existing architecture, see §C.

**B-6. Atomic RPC semantics.** With `entityId`, item change + header update ride one `p_mode='update'` RPC (L1141-L1156); failure returns error with **zero** persisted writes (harness test 7 injects RPC failure and asserts the store is untouched; in PL/pgSQL an exception rolls back the implicit transaction). Fallback path (no `entityId`) deletes items, re-inserts, and on failure re-inserts the pre-change rows, then rolls the header back never having merged partial state (harness test 14). **Limit:** fallback atomicity is best-effort (two statements, no transaction) — restored rows regain original ids; if the restore insert also fails, items remain deleted (reported as residual risk, unavoidable without RPC/transaction).

**B-7. No behavioral change to creation, gates, or finance.** Diff inspection confirms `persistInvoiceCreation` and `persistQuotationCreation` are unchanged (only the item serializer call sites remain name-compatible; the serializer's create branch is byte-compatible behavior — explicit `custom_data` contract retained verbatim: `customData.partNo = item.part_number` / `customData.condition` / `custom_data: customData` required by `bolu-canonical-persistence-and-context.test.js:259-264`). Gates: `gate1Required/gate2Required` literals untouched; `isProposalStale`/`approved_pending_save`/`saving` semantics untouched; no change to `recordBoluDocumentModificationAudit` behavior (best-effort, `console.warn` on failure). `calculateDocument` untouched; no Advance Invoice field touched (the snapshot includes all columns; nothing re-derives `advance_invoice`; `advance_invoice` payload is what the user last saved). `operation_id` write path untouched.

**B-8. Concurrency discipline of the existing gate is preserved.** The `oldValue` mismatch guard still blocks the field-update path before any write (quotation included: stale `cf.payment_terms` rejected). Items-modify still carries no version token — reported in §C, unchanged.

---

## C. Deferred architectural items (not Stage 0 blockers)

1. **`updated_at` compare-and-swap.** No guard for `items`-modify and no document-version token anywhere on the modification path; a fetch-then-RPC interleave can overwrite a concurrent writer's header fields (they ride the snapshot). Fix belongs to a dedicated concurrency milestone, not this remediation.
2. **Item row UUIDs regenerate** on every items-modify (RPC delete+insert). Anything keyed by `invoice_items.id`/`quotation_items.id` across edits breaks (C — existing architecture, affects CPS/features equally).
3. **Live scratch-tenant verification.** Populating a representative invoice and quotation in a scratch entity, performing field-only and items-only Bolu modifications, and diffing full rows incl. `custom_fields` (text vs jsonb) and item lineage — is unperformed here (no Docker/psql/tenant access). **Required before deployment.**
4. **Operation-ID migration deployment status** (`20261118120000/20261118130000`) — whether the tenant installer has run on hosted tenants is unverified.
5. **Ambiguity-warning UX.** A-1/A-3 mitigations want a user-visible warning channel (proposal warnings), not silent behavior. UI work — deferred, needs authorization.
6. **`formula`/`show_install_rate` cannot be cleared** via Bolu (read-only merge). Acceptable per "no explicit removal request possible"; revisit with the ambiguity-guard milestone.
7. **`bolu-runtime.ts` legacy duplicate** routing path unchanged; out of scope.
8. **Invoice `document_type`** and `archived_at` carried in snapshot but unwritten by RPC — harmless extras; do not "optimize" away without checking hydration readers.

---

## D. Final verdict

**Partially completed.**

Exactly what is complete: the snapshot covers every RPC-written header column; item tri-state merge preserves persisted metadata when a match exists; explicit `null` clears; group headers survive; calculation inputs hydrate from persisted data; the invoice fallback gained restore-on-failure; no creation/gate/calculation/Advance invoice behavior changed; targeted suite 16/16.

Why it is not "Completed": item identity on ambiguity is positional, not identity (A-1); weak-signal transfers leak lineage (A-2); full description replacement silently recreates rows and erases lineage (A-3); harness does not execute the RPC (D-harness caveats below); hosted RPC/tenant state is unverified. **Stage 0 must retain "Partially completed" and may not authorize deploy or scratch-tenant reliance until A-1/A-2 (or an explicitly authorized, equivalent guard) lands.** No deployment or production writes are authorized by this audit.

**Ambiguity guard required before scratch-tenant verification: YES.** Without it, a reordered duplicate list — a trivially common user edit — silently rebinds lineage/catalog/image metadata to the wrong rows, which violates the fix's own acceptance contract.

---

## E. Test harness fidelity audit

`src/tests/ai-assistant/bolu-modify-integrity.test.js` — line-by-line against the installer SQL:

| Harness element | SQL reality | Fidelity |
|---|---|---|
| `updateBranch` invoice SET list (L435-460) | UPDATE L152-179 | Match in names/COALESCE defaults incl. `custom_fields` no-guard (null when absent). Faithful. |
| `updateBranch` quotation SET list (L461-486) | UPDATE L2219-2239 | Match incl. `COALESCE(NULLIF(...,''),'{}')` semantics on `custom_fields` (L504). Faithful. |
| Items INSERT (L491-518) | Invoice L225-273 / quotation L2286-2340 | Column list identical; `NULLIF(item_id,'')::uuid` approximated by `NUL()`; `custom_data` cast via `safeJson`. **Divergence below.** |
| `safeJson` (L335-343) swallows JSON.parse errors into `{}` | `(v_item->>'custom_data')::jsonb` **throws** on malformed text ⇒ whole RPC aborts | Harness passes where SQL would error. Only reachable via a serializer bug; tests would stay green under a broken serializer that emits bad JSON. |
| Permissions | `has_entity_permission(... 'edit')` gates `p_mode='update'` on both families (L69, L2136) | Not emulated. Service pre-checks separately; SQL gate independently enforced. Untested behaviorally. |
| NOT NULL `row_type` / `quantity >= 1` (create-path CHECK) | Enforced by table | Harness `.insert` trusts serializer; unreachable via current code. |
| `.single()` on PK lookup | error when >1 row | Harness returns first; `eq('id')` unique ⇒ equivalent here. |
| `.order('sort_order')` | PostgREST requires the column; supported | Present and tested. |
| Fallback `.update()` | PostgREST partial UPDATE (only keys present) | Faithful (test 14). |
| RPC failure injection (L525-531) | PL/pgSQL exception ⇒ atomic rollback | Faithful at the granularity offered (test 7). |
| `record_audit_log` stub returns `{data:null,error:null}` (L532) | Real RPC; failure swallowed by service | No assertions on audit side effects. Acceptable; not evidenced. |

**Assertions that lean on implementation assumptions (acceptable but noteworthy):** test 2 asserts persisted totals equal `computeDocument` run on persisted inputs — correct property (persisted == engine for save semantics), but it presumes the engine is the reference; it does not re-derive independently. Tests 2/8/16 compare `custom_data` semantically (correct); test 1/8 invoice `custom_fields` byte behavior is not claimed (correct).

**Missing adversarial coverage:** duplicate rows; reordered identical lines; description/qty/price simultaneously rewritten on similar rows; ambiguity DB/type_id tie between candidates; score-3-and-below transfers (A-2 class); group-header replacement; item_id present vs absent interplay; full-description-rewrite remove+add (A-3 class); operation_id replay under modify; RPC-vs-fallback behavioral parity (they are not byte-equivalent — fallback keeps `id`, RPC regenerates it).

**Behavioral evidence vs source-pattern assertions:** tests 1-16 are behavioral against the harness (before/after store diffs) — e.g. tests 1, 6, 7, 8, 13 assert unchanged store; tests 2, 4, 5, 9, 10, 14, 16 assert exact merge outcomes. No test asserts SQL text patterns. The generator of false confidence to flag is **the harness's `safeJson`** and **the absence of duplicates/reordering**, not any individual assertion.

---

## F. Diff & scope boundary audit

- Files touched by Stage 0 are exactly: `src/lib/ai-assistant/bolu-document-service.ts` (M), `src/lib/ai-assistant/bolu-operations.ts` (M), `src/tests/ai-assistant/bolu-modify-integrity.test.js` (A), plus the Stage 0 report. No migrations, no config, no UI, no `bun run build`.
- `persistInvoiceCreation`/`persistQuotationCreation`: unchanged except serializer-compatibility (create path behavior preserved; explicit contract literals kept at L201-206).
- Gates: unchanged (`Gate 1/Gate 2` state machine, `isProposalStale`, `executedOperationIds` replay semantics).
- No Advance Invoice fields read/written/re-derived; advance metadata untouched by any change path.
- Pre-existing modified/untracked files (`.workbuddy-ai/memory/2026-11-18.md`, `docs/reports/bolu-persistence-integrity/*`, `docs/reports/bolu-document-capability-parity/` (prior audit)) are untouched by this audit — this report is the only new attributable artifact.
- Residual attribution noise: none introduced; `.baseline-check` scratch folder was created and removed during verification (verified gone; `git status` clean of it).

**Git state (at delivery):**
```
## main...origin/main [ahead 12]
 M .workbuddy-ai/memory/2026-11-18.md          (pre-existing)
 M src/lib/ai-assistant/bolu-document-service.ts
 M src/lib/ai-assistant/bolu-operations.ts
?? docs/reports/bolu-document-capability-parity/
?? docs/reports/bolu-modification-integrity/
?? docs/reports/bolu-persistence-integrity/independent-verification.md
?? docs/reports/bolu-persistence-integrity/production-deployment.md
?? src/tests/ai-assistant/bolu-modify-integrity.test.js
HEAD = 295f98e4 "📝 docs: add bolu persistence integrity files and updates"
```

---

## G. Checks performed / checks unavailable

**Performed (read-only; no DB touched):** full diff inspection; SQL source-to-payload column mapping both families; item-converter correspondence with RPC insert lists; harness side-by-side with SQL; adversarial hand-traces of matcher (duplicate reorder, ties, weak signals, full rewrite); baseline-HEAD reproduction of claimed-green-failing suites (`bolu-commercial-and-gate-lifecycle.test.js:304`, critical-suite 4 failures) — all reproduce on HEAD; `bun run typecheck` and our harness suite were previously green (re-confirmed in this audit only by reading prior evidence, not re-run).

**Unavailable / not executed:** DB scratch tenant; RPC self-test; browser/viewport checks; hosted `has_entity_permission`; `bun run test` and `bun run typecheck` re-executed (out of scope to mutate; previously green; critical suite 1598/1602 with 4 pre-existing HEAD failures). No `bun run build` executed, by policy.

**Unresolved risks:** ambiguity-driven metadata contamination (A-1..A-3); hosted-RPC definition drift (migration may not be applied; tenant may have hot-fix variants); `safeJson` harness/SQL divergence; fallback restore best-effort atomicity; item UUID regeneration; live `has_entity_permission` behavior for `'edit'` on update branch (asserted only by reading source, not by execution).

**Recommended next authorized action:** authorize a bounded A-1/A-2 correction (ambiguity abstention + identity floor; unambiguous, not silent) behind the same Gate-1/Gate-2 discipline, then re-run `src/tests/ai-assistant/bolu-modify-integrity.test.js` extended with duplicate/reorder/tie cases; then scratch-tenant verification of both families; do not deploy; do not touch migrations. Hold Stage 0 at "Partially completed" until the A-1/A-2 guard exists and tenant diff evidence lands.
