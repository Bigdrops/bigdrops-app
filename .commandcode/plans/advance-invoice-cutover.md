# Advance Invoice Cutover Completion Plan

## Diagnosis

The cutover from child-row-based advance invoices to parent-metadata-only is **~95% complete**. All write paths already target parent `custom_fields.advance_invoice` exclusively. All read paths use metadata-first with gated legacy fallback. The remaining 5% is defensive hardening.

## What's Already Correct

| Concern | Status | Evidence |
|---|---|---|
| Writes (create/update/delete) | ✅ Parent-only | `viewInvoiceActions.ts:saveParentAdvanceInvoiceConfig`, `invoiceAdvanceService.ts:persistParentConfig` — both `supabase.from('invoices').update({ custom_fields })` on parent ID only |
| Reads (summary + draft) | ✅ Metadata-first | `advanceSummary.ts:getAdvanceSummaryValues` uses `getAdvanceInvoiceMetadata()` first, legacy fallback gated by `canUseLegacyChildFallback` |
| Supabase queries | ✅ TEXT-safe | All use `ilike` / `.or()` on `custom_fields` TEXT column |
| Legacy quarantine | ✅ Full | `advanceLegacyCleanup.ts`: orphan, archived, quarantined detection + exclusion |
| `buildAdvanceChildInvoicePayload` | ✅ Dead code | Not imported by any write path module |

## Changes Needed (6 Steps)

### 1. Broaden `isAdvanceInvoiceOutput` — `src/domain/invoice/advanceSummary.ts`

**Why**: Currently only recognizes legacy children (`role: 'advance'`). Under metadata-only model, a parent with `advance_invoice` metadata IS the advance output. Works by accident today (parentMetadata check runs first), but semantically incorrect.

**Change**: Replace the simple delegation to `isAdvanceInvoiceChild` with metadata-first check.

### 2. Deprecate `buildAdvanceChildInvoicePayload` — `src/domain/invoice/advanceChildFlow.ts`

**Why**: Builds a child-row payload with `role: 'advance'` — a footgun for future developers. Not used for writes anywhere, but easy to misuse.

**Change**: Add `@deprecated` JSDoc block explaining metadata-only architecture.

### 3. Add SQL Data Integrity Views — new migration

**File**: `supabase/migrations/20260514_advance_integrity.sql`

Two read-only views: `advance_orphan_children` (orphan detection) and `advance_parent_child_consistency` (parent-child validation).

### 4. Add Supabase Query Audit Script — `tools/audit-supabase-queries.ts`

Scans `src/` for forbidden patterns (`custom_fields->`, `custom_fields->>`, `custom_fields @>`) on TEXT columns.

### 5. Fix Scratch File — `scratch/test_advance_filter.ts`

Replace `->` / `->>` JSON operators with `ilike` TEXT-safe patterns.

### 6. Test Verification

```bash
npm run typecheck
npm run build
npm run lint
```

## Files Changed

| File | Change Type |
|---|---|
| `src/domain/invoice/advanceSummary.ts` | Modify `isAdvanceInvoiceOutput` |
| `src/domain/invoice/advanceChildFlow.ts` | Add `@deprecated` to `buildAdvanceChildInvoicePayload` |
| `supabase/migrations/20260514_advance_integrity.sql` | New — two diagnostic views |
| `tools/audit-supabase-queries.ts` | New — query pattern auditor |
| `scratch/test_advance_filter.ts` | Fix invalid JSON operators |
| `package.json` | Add `audit:supabase-queries` script |

## Rollback

Every change is single-file. Revert any step independently. SQL views: `DROP VIEW IF EXISTS advance_orphan_children; DROP VIEW IF EXISTS advance_parent_child_consistency;`.
