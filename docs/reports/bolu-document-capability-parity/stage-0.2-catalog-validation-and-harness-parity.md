# Stage 0.2 — Explicit `item_id` Catalog Validation & Harness SQL Parity

**Date:** 2026-11-18 · **Type:** Authorized bounded implementation · **Environment:** source/test changes only. No hosted database, no scratch tenant, no migrations, no deployment. Stage 0 remains **Partially completed** (see §13).

## 1. Final status: **Completed** (scope-bounded)

Both blocking findings from the Stage 0.1 independent audit are closed:
- **B-1** — unverified `item_id` values can now reach the composite RPC only when (a) they match an already-persisted document row, or (b) they are well-formed UUIDs positively verified against the **tenant-scoped** `item_catalog` (`is_active = true`). Otherwise the value is stripped and a warning is emitted.
- **B-2** — the harness now enforces UUID cast equivalence, FK existence, NOT NULL/integer/numeric cast validity, and JSONB cast failure behavior before any write, with batch-invalid input aborting the simulated RPC entirely (nothing persisted).

**`bun test src/tests/ai-assistant/bolu-modify-integrity.test.js` → exit 0, 34 pass / 0 fail. `bun run typecheck` → exit 0, `tsc --noEmit` clean.**

**Authorized deviation, flagged explicitly:** the task text specified `archived_at IS NULL` as the active-catalog predicate. The actual `item_catalog` schema — public (`20260520090005_items_catalog.sql`) **and** tenant template (`20260915194332_tenant_template_seed.sql`) — has **no `archived_at` column**; archivability is `is_active boolean NOT NULL DEFAULT true`. The implementation uses `.eq('is_active', true)`, which also matches the existing Bolu catalog read path (`bolu-data.ts`, `.eq('is_active', true)`). Reproducing the instructed predicate literally would produce a guaranteed-failing query (`column item_catalog.archived_at does not exist`), stripping every catalog reference with zero useful behavior — noted here rather than adopted. If the mandate strictly requires `archived_at`, a schema migration outside this task's scope would be needed to add it; this remains unresolved by design and is reported as such.

## 2. Files changed (this task only)
- `src/lib/ai-assistant/bolu-document-service.ts` (M) — sanitization + tenant catalog verification.
- `src/tests/ai-assistant/bolu-modify-integrity.test.js` (M) — strict harness + 34 tests.

No other file modified by this task; notably untouched: `bolu-operations.ts` (validator, Stage 0), creation paths, gates, `calculateDocument`, Advance Invoice, migrations, SQL, UI, `useBoluThread.ts`. No commits, pushes, staging, stashes, cleans or resets performed.

## 3. Persisted-row identity vs fresh-row catalog reference
- **Persisted-row identity match** (Pass 1 of `matchBoluItems`): incoming `item_id` uniquely equals a persisted document row's `item_id` → row matches → identity/lineage preserved; no catalog lookup (a document line's catalog link is not revalidated against the catalog on edits; FK remains the DB-side authority).
- **Fresh row** (no persisted match): incoming `item_id` is treated as a *potential catalog reference*. Well-formed + verified active catalog record → retained verbatim on the new row. Malformed, non-existent, inactive, unverifiable, or lookup unavailable → stripped to `null`, with a concrete warning; RPC never sees the value.
- `source_*` lineage is never manufactured from a catalog reference; lineage is preserved only from the matched persisted row.

## 4. UUID validation behavior
`STRICT_UUID_RE` (service) and an equivalent in the harness require a well-formed RFC-4122 UUID (version 1–5, variant nibble 8/9/a/b). Non-conforming strings never reach the `NULLIF(...::uuid)` cast; the row persists with `item_id = null` and a warning. Case-insensitively normalized for the catalog comparison.

## 5. Tenant-scoped active-catalog verification
Query after Pass 2, applied only to fresh rows with an `item_id`: tenant `item_catalog` via `tenantClient.from('item_catalog').select('id').in('id', ids).eq('is_active', true)` — single batched lookup, exact-id association (never cross-row validation), no public-schema fallback, no service-role bypass. Archived records do not exist here; inactive records are rejected (`is_active = false`).

## 6. Lookup failure / unavailable client
Fail-closed: `tenantClient` unready or no `schemaName`, query error, empty result for a requested id, or exception → affected ids discarded to `null` + warnings (e.g. "catalog identity could not be verified … was discarded" / "not an active item_catalog record … discarded"). Matched persisted rows are never affected by catalog verification.

## 7. Harness fidelity (matches installer SQL `20261118130000_bolu_tenant_rpc_installer.sql`)
- **UUID casts**: malformed `item_id`/`source_cps_id`/`source_cps_row_id`/`source_quotation_id`/`source_quotation_item_id` → `22P02 invalid input syntax for type uuid`, RPC aborts before any write; arbitrary strings never pass.
- **FK existence**: `item_id` (after UUID validation) must exist in `store.item_catalog`, else `23503` FK-equivalent error; store untouched.
- **NOT NULL**: invoice `description` required; quotation `quantity`, `unit_price`, `amount`, `row_type`, `sort_order` required with numeric/integer cast validity — `23502`/`22P02` errors; absent keys insert explicit NULL exactly like the RPC's `v_item->>'…'` mapping, violating the constraint.
- **Numeric/integer casts**: quantity/unit_price/amount/vat_rate/install_rate/discount_rate must be numeric; sort_order integer — invalid strings → `22P02`.
- **JSONB**: item `custom_data` string must parse (else `22P02` before any write — preserved from Stage 0.1); quotation header `custom_fields` follows `COALESCE(NULLIF(p->>'custom_fields',''),'{}')::jsonb` (absent/'' → `{}`; malformed string → error, nothing written).
- **Atomicity**: all validation runs before any mutation — a batch with one invalid row leaves the store byte-identical (asserted by EX-Atomic).
- **Comparison-only `safeJson`** retained for test assertions; never used in the insert path.

## 8. Tests updated/added (34 total, all green)
Updated: E1→`CAT_B` uuid, E2 (duplicated `CAT_X` — retained because verifiably active, no other metadata transferred), E3 split into **E3-A** (active catalog UUID retained, zero warnings), **E3-B** (well-formed absent UUID discarded + warning), **E3-C** (malformed identity discarded + warning, row persists), plus **E3-D** (inactive catalog UUID discarded). New direct-harness rejection tests: EX-Direct (malformed uuid → 22P02, store unchanged), EX-FK (unknown uuid → 23503, unchanged), EX-Atomic (mixed valid/invalid batch → nothing persisted), EX-NotNull (invoice missing description → 23502; quotation missing quantity → 23502), EX-CfJson (malformed quotation `custom_fields` → 22P02, unchanged). Stage 0.1 adversarial suite A–F preserved unchanged in intent and assertion strength.

## 9. Exact verification output
```
$ bun test src/tests/ai-assistant/bolu-modify-integrity.test.js
34 pass / 0 fail / Ran 34 tests

$ bun run typecheck
$ tsc --noEmit        # exit 0
```
Broader ai-assistant batch (for regression visibility): 169 tests, 168 pass, 1 fail — the single failure is the pre-existing HEAD baseline failure `bolu-commercial-and-gate-lifecycle.test.js:304` (reproduced on pristine HEAD and unrelated to this work).

## 10. `git status --porcelain=v1`
```
 M .workbuddy-ai/memory/2026-11-18.md          (pre-existing, untouched)
 M src/lib/ai-assistant/bolu-document-service.ts
 M src/lib/ai-assistant/bolu-operations.ts     (Stage 0 only)
?? docs/reports/bolu-document-capability-parity/
?? docs/reports/bolu-modification-integrity/
?? docs/reports/bolu-persistence-integrity/independent-verification.md
?? docs/reports/bolu-persistence-integrity/production-deployment.md
?? src/tests/ai-assistant/bolu-modify-integrity.test.js
HEAD = 295f98e4
```

## 11. `git diff --stat`
```
 src/lib/ai-assistant/bolu-document-service.ts | 655 +++---------
 src/lib/ai-assistant/bolu-operations.ts       |  14 +--
 3 files changed, 483 insertions(+), 204 deletions(-)
```
Diff summary: shared modification core; Pass-1 explicit identity unchanged; Pass-2 floor/abstention unchanged; new sanitizer for fresh-row `item_id` (strict UUID + tenant active-catalog batch lookup); warnings wired on all result paths (Stage 0.1); hardened RPC harness with atomic pre-validation; creation/gates/calculation/Advance paths untouched.

## 12. Pre-existing work preserved
All pre-existing modified/untracked files above untouched; no baseline-check or other scratch artifacts remain. Attribution of Stage 0.2 changes is contained to the two implementation files; the harness test file change adds coverage.

## 13. Unresolved limitations / checks not performed
- No arbitrary catalog UUID verification beyond existence/activeness (no catalog-of-tenant cross checks done — lookup is tenant-scoped via the same tenant client, which is the authorized scope).
- JSONB normalization of invoice `custom_fields` (text column) passes through verbatim — no cast to mirror (SQL uses raw `p->>'custom_fields'`).
- Quotation FK requires existence only (FK has no activeness), intentionally distinct from the production active-catalog preflight; documented, not conflated.
- `install_rate_override` flip on explicit install_rate set — unchanged, out of scope.
- Hosted/tenant RPC behavior unverified — no migrations deployed, no scratch tenant used; harness is an in-memory model, not PostgreSQL.
- Warnings remain a machine channel — not surfaced in UI (out of scope).
- Stage 0 remains **Partially completed** pending independent review of this remediation and a separate, explicitly authorized scratch-tenant verification.
