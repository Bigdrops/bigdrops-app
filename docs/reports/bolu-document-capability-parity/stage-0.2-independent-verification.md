# Stage 0.2 — Independent Verification Audit (Read-Only)

**Date:** 2026-11-18 · **Type:** Independent read-only verification · **Scope:** `src/lib/ai-assistant/bolu-document-service.ts`, `src/tests/ai-assistant/bolu-modify-integrity.test.js`, against the installer SQL and base schemas. No files, tests, migrations or Git state were modified; the only attributable artifact is this report.

## Overall verdict: **PASS (bounded, with named residuals)**

Verification commands executed in this environment:
- `bun test src/tests/ai-assistant/bolu-modify-integrity.test.js` → **exit 0** · `34 pass / 0 fail / Ran 34 tests`
- `bun run typecheck` → **exit 0** · `tsc --noEmit` clean

## 1. Tenant-scoped `item_catalog` lookup & fail-closed handling — PASS

Evidence: `src/lib/ai-assistant/bolu-document-service.ts`, the post-match sanitizer (the block starting "Rows matched against persisted document items keep their document
identity…", `:1167-1224`).

- Query: `tenantClient.from('item_catalog').select('id').in('id', wanted).eq('is_active', true)` — single batched lookup, exact-id association (never cross-row mapping). Uses the tenant-scoped client passed into `persistDocumentModification` (`schemaName` guard at `:1194`) with zero public-schema fallback and no service-role bypass.
- **Deviation, acknowledged:** mandate text said `archived_at IS NULL`; the actual `item_catalog` schema has no `archived_at` (public: `20260520090005_items_catalog.sql`; tenant template: `20260915194332_tenant_template_seed.sql`). Activeness is `is_active boolean NOT NULL DEFAULT true`, which this implements and which matches the existing Bolu catalog read (`bolu-data.ts`, `.eq('is_active', true)`). To make the literal predicate work, a schema change would be required — out of scope; flagged here, not silently adopted nor silently ignored.
- Fail-closed verified: `lookupOk=false` on unready client/missing `schemaName` → every requested id stripped with a warning; `res.error` → same; absent/inactive rows → same; exception → same. No path leaves an unverified id in the payload.
- Malformed UUIDs are discarded inline (`isStrictUuid`, version 1–5 + variant nibble 8/9/a/b) with a "not a well-formed UUID" warning — never reach `NULLIF(...::uuid)`.
- Unmatched rows whose `item_id` duplicates a persisted candidate's identity correctly fall to Pass 1 abstention, then the sanitizer; the fresh row retains only a **verified** catalog reference; `source_*`, `image_url`, `custom_data` and metadata remain uns transferred (tests A/D assert all of these are `null` on the fresh row — lines 1277-1295 of the test file).
- **Known limitation (non-blocking):** a *matched* persisted row carrying a legacy malformed `item_id` still passes through by design (persisted document identity), and the production RPC would abort if re-presented with it — loud failure, zero data corruption, outside mandate ("Do not weaken existing persisted matching").

## 2. Harness fidelity — PASS

`src/tests/ai-assistant/bolu-modify-integrity.test.js`, `updateBranch` + `validateItemsForInsert` (`:483-577`, `:581-…`):

- **Validation runs before any store mutation** (quotation `custom_fields` cast-check at `:593-602`, item validation at `:604-608`, before `store[t][idx] =` at `:668` and before items are deleted/re-inserted). Batch-invalid input returns `{data: null, error}` with `store` untouched — EX-Atomic asserts this byte-for-byte.
- **UUID casts** (EX-Direct): strict regex; malformed strings → PostgreSQL-like `22P02 invalid input syntax for type uuid`; before-writes abort; empty strings map to NULL (`NULLIF` semantics) as the real SQL does.
- **FK existence** (EX-FK): `item_id` (after UUID check) must reference an existing `store.item_catalog` row; unknown → `23503` with the store unmutated. Intentionally, the harness FK checks **existence only** (the FK reference contract), while the *production preflight* enforces `is_active = true` (documented separately, no conflation).
- **NOT NULL / casts** (EX-NotNull, invoice description required; quotation `quantity`/`unit_price`/`amount`/`sort_order` required+castable; `row_type` required) → `23502`/`22P02`, consistent with the RPC inserting explicit NULLs for absent keys on `NOT NULL` columns (`v_item->>'…'` payload mapping in installer SQL ~L225 / ~L2286).
- **JSONB** (EX-CfJson): quotation `custom_fields` mirrors `COALESCE(NULLIF(p->>'custom_fields',''),'{}')::jsonb` — `''`/absent → `{}`; malformed string → `22P02` before writes. Item-level `custom_data` strict cast preserved from Stage 0.1 (`parseItemsCustomData` pre-mutation).
- **Atomicity**: pre-mutation validation, plus invoice-items restore in the `insert` failure path (Stage 0.1). Store unchanged asserted on every failure branch.
- **Confirmed absent from harness**: `has_entity_permission(..., 'edit')` gating on `p_mode='update'`, NOT NULL on `invoice_items quantity/unit_price/amount/row_type` (nullable in schema), exactly-as-PG item INSERT FK still requires existence only, and invoice `custom_fields` text pass-through (SQL does no cast — correct). All consistent with actual SQL contracts; none mask a required behavior. No remaining material SQL mismatch found.

## 3. Independent execution & diff attribution — PASS

- Commands executed in-session (results above); 34/34 and typecheck clean.
- `git status --porcelain=v1` (HEAD `295f98e4`): implementation changes limited to `src/lib/ai-assistant/bolu-document-service.ts`, `src/tests/ai-assistant/bolu-modify-integrity.test.js`; `bolu-operations.ts` (Stage 0 tri-state only); pre-existing `.workbuddy-ai/memory/2026-11-18.md` untouched; untracked report directories and prior verification reports untouched.
- Diff inspection: creation paths (`persistInvoiceCreation`/`persistQuotationCreation`), `calculateDocument`, `Gate 1/Gate 2` state machine (`isProposalStale`, `approved_pending_save`/`saving`, operation_id idempotency), Advance Invoice behavior, RPC contracts, migrations — no modifications. No UI/composer changes, no `useBoluThread.ts` changes.

## Residuals (all non-blocking)
1. `itemsFetchError` return does not spread `warnings` (matcher never ran; provably empty — cosmetic).
2. `useBoluThread.confirmGate2Save` reads no `result.warnings`; warnings are a machine channel, not user-visible. (Mandated out of UI scope.)
3. Hosted/tenant-lived RPC bodies unverified; no evidence against them beyond source inspection and migration text; tenant-local variants cannot be excluded.
4. Legacy persisted rows with malformed `item_id` re-presented to the RPC will abort the transaction (fail-closed, by design, but can brick Bolu modification of such rows until data is repaired).
5. Harness remains an in-memory model — no PostgreSQL execution, no parameter verification against `has_entity_permission`, no FK *policy* enforcement (FK ≠ activeness).

## Readiness for bounded scratch-tenant verification
**Yes — conditionally.** The two blocking defects (B-1 unverified fresh `item_id` handling; B-2 harness SQL-fidelity gaps) are closed and independently re-verified here. Before scratch-tenant testing: open `supabase/migrations/20261118130000_bolu_tenant_rpc_installer.sql` against the target tenant to confirm it's applied (the migration is required for correct composite-RPC semantics), and pass a populated, catalog-linked invoice and quotation through a populated tenant schema, diffing full row + items before/after. This audit authorizes nothing beyond reporting; scratch-tenant verification and any deployment require separate explicit authorization.
