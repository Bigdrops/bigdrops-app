# Quotation Save Coercion Fix Report

This report was written by Muse Spark on 2026-09-14 via OpenCode.

## Objective

- Fix the save failure for a workspace member with Engineer and Viewer roles.
- Replace the raw PostgREST error with a clear authorization failure.
- Preserve the permission model, RLS, and tenant isolation.

## Scope

- Quotation create and edit save path only.
- No permission grants. No RLS change. No migration. No refactor.

## Files changed

- `src/hooks/useQuotationSave.ts` (only file changed by this task).

## Skills used

Skills used: supabase, supabase-postgres-best-practices
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

- Added `isSingleObjectCoercionError()`. It detects code `PGRST116` or the message `Cannot coerce the result to a single JSON object`.
- Mapped the coercion error to `You don't have permission to create quotations.` on the create path.
- Mapped the coercion error to `You don't have permission to edit this quotation.` on the edit path.
- Kept `.single()` in place. Kept all RLS policies unchanged. Kept all role grants unchanged.

## Root cause

- Engineer grants `view` on all resources plus `create` and `edit` on project, waybill, boq, rfq, csr, and item only.
- Viewer grants `view` on all resources only.
- Engineer plus Viewer holds `view` on quotation, but not `create` or `edit`.
- The edit path runs `update(...).eq('id', id).select().single()` in `src/hooks/useQuotationSave.ts:250`.
- RLS denies the update. Zero rows return. `.single()` raises `PGRST116`.
- The UI shows `Save failed` with the raw coercion text and a registry ID such as `err_1789389978284_zmkmfq`.
- The registry ID is local only. `src/lib/errorRegistry.ts` generates it in the browser. It holds no server data.

## Verification result

- `bun run audit:load`: passed (warnings only, all pre-existing).
- `bun run typecheck`: passed.
- `bun run test`: 439 passed, 4 failed. All 4 failures are pre-existing environment errors (`VITE_SUPABASE_URL` is undefined under the node test runner). No failure relates to this change.
- `git status`: only intended file plus pre-existing changes (see below).
- `supabase db push`: not applicable (no SQL changed).
- `bun run build`: skipped due to hardware policy.

## Supabase push status

- Not applicable. This task adds no migration.

## Git status and diff scope

- New change: `src/hooks/useQuotationSave.ts` (+15 lines).
- Pre-existing changes (other agent, untouched): `src/pages/ViewQuotation.tsx`, `src/pages/view-boq-actions.ts`, `supabase/migrations/20260907000000_record_capture_foundation.sql`, `docs/tickets/pending-migrations-push.md`, `supabase/migrations/20260914130000_add_source_boq_id_to_quotations.sql`.
- No pre-existing file was reverted or overwritten.

## Behavior after fix

- Owner, Admin, and Manager keep full quotation save access. Success path is unchanged.
- Engineer plus Viewer sees `Save failed` with `You don't have permission to edit this quotation.` No raw PostgREST text.
- Viewer keeps read-only restriction.
- Tenant and workspace isolation is unchanged.

## Risks or limitations

- A concurrent delete can also yield zero rows. The message then reads as a permission error. RLS hides existence by design, so this trade-off is accepted.
- Sibling paths with the same pattern (for example BOQ to quotation conversion) still surface raw errors. They are out of scope for this fix.

## Deferred work

- Apply the same coercion mapping to `convertBOQToQuotation` and `convertRFQToQuotation` when a task authorizes that change. Note: `src/pages/view-boq-actions.ts` has uncommitted work from another agent. Do not touch it until that work lands.
