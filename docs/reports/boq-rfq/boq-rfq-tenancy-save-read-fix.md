# BOQ and RFQ Tenancy Save-Read Fix Report

This report was written by opencode on 2026-08-19 via Local Runner.

## Objective

Fix entity-scoped tenancy save and read failures on the production entity `entity_bigdrops-main_main`.

The affected modules are:

- CSR
- RFQ
- BOQ
- Project
- Client

The failures appeared after the cutover to the `tenantClient` and tenant schemas.

## Scope

This work covers:

- The database migration that restores missing permissions and aligns the `boqs` and `rfqs` schemas.
- The frontend rewire of the BOQ module from localStorage to the database.
- The schema type alignment in `src/lib/database.types.ts`.
- The `boq_items` to `boq_rows` table reference fixes.

This work does not cover:

- Invoice save and edit.
- The invoice transaction RPC migration.
- The quotation migration.
- Deletion of public business tables.
- Global workspace and entity infrastructure.
- Profiles, notifications, and platform operator functionality.
- UI redesign.

## Root Causes

### CSR, RFQ, Project, Client

The tenant schema requires a matching row in `public.entity_permissions`.

The migration that created the tenant schemas did not backfill these rows for the existing users of `entity_bigdrops-main_main`.

RLS policies use `public.has_entity_permission()`. Without a permission row, the policy denies the create action. This caused the save failures.

### BOQ

BOQ had two independent defects:

1. Missing permission rows (same root cause as above).
2. A storage split. `NewBoq.tsx` saved to localStorage. The list and view pages read from the database. Created BOQs did not appear in the list.

## Changes Made

### Migration

New file: `supabase/migrations/20260826000000_boq_rfq_schema_and_aggregate_permission_fix.sql`

The migration performs the following actions:

- Resolves the target entity by joining `public.entities` and `public.workspaces`.
- Backfills `view`, `create`, `edit`, and `delete` permission rows for `csr`, `rfq`, `boq`, `project`, and `client` for each user of the entity.
- Uses `ON CONFLICT ... DO NOTHING`. The migration is idempotent.
- Adds 15 columns to `boqs` in the public and tenant schemas. Uses `ADD COLUMN IF NOT EXISTS`.
- Adds 3 columns to `rfqs` in the public and tenant schemas.
- Grants privileges using `to_regclass` guards. The migration is safe to run when a table does not exist.

New `boqs` columns:

- `boq_number`
- `status`
- `project_id`
- `total`
- `issue_date`
- `vendor_name`
- `vendor_contact`
- `show_brand_name`
- `brand_name_override`
- `background_primary`
- `background_secondary`
- `palette_name`
- `text_color`
- `accent_color`
- `notes`

New `rfqs` columns:

- `client_name`
- `status`
- `project_id`

### BOQ Domain Layer

New file: `src/domain/boq/normalize.ts`

This file provides the BOQ mapping layer between the frontend model and the database rows.

- `normalizeDbBoq` maps a database `boqs` row and its `boq_rows` into the frontend `Boq` model.
- `denormalizeToDbBoq` maps a frontend `Boq` into a database `boqs` insert.
- `denormalizeToDbBoqRow` maps a frontend row into a `boq_rows` insert.
- `getNextBoqNumber` generates the next `BOQ-###` number from existing rows.

The `boq_rows` table has no `specification`, `make_brand`, `cp`, or `sp` columns. These values are packed into the `cells` JSONB column. `normalizeDbBoq` unpacks them on read.

### BOQ Types

Modified: `src/domain/boq/types.ts`

- Added `custom_fields?: Record<string, any>` to the `Boq` type.
- Added the `DbBoq` type.
- Added the `DbBoqRow` type.

### Database Types

Modified: `src/lib/database.types.ts`

- Added the 15 migrated `boqs` columns to the `Row`, `Insert`, and `Update` types.
- The entries are nullable and mirror the `rfqs` pattern.
- The `boq_rows` types were already correct.

### NewBoq Page

Modified: `src/pages/NewBoq.tsx`

The page now saves to the database instead of localStorage.

The save flow:

1. Read the current user with `supabase.auth.getUser()`.
2. Read existing `boq_number` values.
3. Resolve the document prefix from settings.
4. Generate the initial BOQ number with `getNextBoqNumber`.
5. Insert the BOQ with `withUniqueRetry`. The insert includes the `user_id`.
6. Insert the rows into `boq_rows` with `denormalizeToDbBoqRow`.
7. Navigate to the new BOQ view page on success.

`withUniqueRetry` regenerates the number and retries when the insert fails with a unique violation.

### EditBoq Page

Modified: `src/pages/EditBoq.tsx`

The page now loads from and saves to the database.

The load flow:

1. Wait for `tenantClient.isReady`.
2. Load the BOQ from `boqs`.
3. Load the rows from `boq_rows` ordered by `sort_order`.
4. Build the frontend model with `normalizeDbBoq`.
5. Navigate back to the list on load failure.

The save flow:

1. Update the BOQ in `boqs`.
2. Delete the existing rows from `boq_rows`.
3. Re-insert the filtered rows.
4. Navigate back to the view page on success.

### BOQ Table Reference Fixes

The frontend referenced a `boq_items` table that does not exist. The database table is `boq_rows`.

Modified files:

- `src/pages/viewBOQActions.ts` — `deleteBOQRecord` deletes from `boq_rows`.
- `src/components/boq/BoqList.tsx` — `handleDelete` deletes from `boq_rows`.
- `src/pages/ViewBoq.tsx` — the items query now reads `boq_rows`. The document is built with `normalizeDbBoq`.

### Tests

New file: `src/tests/critical/boqNormalize.test.js`

The test covers:

- The normalize and denormalize round-trip for the BOQ header and colors.
- The row round-trip with `cells` packing.
- `getNextBoqNumber` increment logic.

## Files Changed

- `supabase/migrations/20260826000000_boq_rfq_schema_and_aggregate_permission_fix.sql` (new)
- `src/domain/boq/normalize.ts` (new)
- `src/domain/boq/types.ts`
- `src/lib/database.types.ts`
- `src/pages/NewBoq.tsx`
- `src/pages/EditBoq.tsx`
- `src/pages/ViewBoq.tsx`
- `src/pages/viewBOQActions.ts`
- `src/components/boq/BoqList.tsx`
- `src/tests/critical/boqNormalize.test.js` (new)

## Skills Used

NONE

## Documentation Standard

ADS-STE100 Simplified Technical English

## Verification

- `bun run audit:load`: passed. All warnings are pre-existing.
- `bun run typecheck`: passed.
- `bun run test`: passed. 147 tests passed. 0 failed. Includes 3 new BOQ normalize tests.
- `git status`: changes staged on `main`. The 4 HTML wireframe files in the staged set are unrelated pre-existing changes.
- `bun run build`: skipped due to hardware policy.

## Risks or Limitations

- The migration backfills permissions for the entity `entity_bigdrops-main_main` only. Other entities without permission rows are not covered.
- Existing BOQs saved in localStorage are not migrated into the database.
- Existing database BOQs created before the migration have no `boq_number`. The view and edit pages handle a missing number, but no backfill assigns numbers to old rows.
- `duplicateBOQRecord` hardcodes the `BOQ-` prefix and does not duplicate `boq_rows`. It works because the rows travel inside `custom_fields`, but it is a divergence risk.
- The CSV export path still references `boq_items`. This is a real runtime bug for BOQ exports.
- The adapter layer selects `client_name`, `status`, `total`, and `project_id` from `boqs`. The migration adds these columns but does not backfill values for old rows.
- `getCurrentTenantId()` in `src/lib/tenantClient.ts` returns `user.id`. This behavior looks incorrect and needs review.
- `project_documents` exists only in the public schema. This needs review.

## Deferred Work

- Fix the BOQ CSV export path. `exportFetchers.ts:51` maps `BOQS` to `boq_items`. The fix requires changing `exportSchemas.ts` and the shared `lineItemSchema` to `boq_rows` columns.
- Backfill `boq_number` for existing BOQ rows.
- Migrate localStorage BOQs into the database.
- Backfill `client_name`, `status`, `total`, and `project_id` for old BOQ rows.
- Review `getCurrentTenantId()`.
- Review the `project_documents` public-only table.
- Manual UI testing is required on the production entity. This cannot be done from the CLI.
