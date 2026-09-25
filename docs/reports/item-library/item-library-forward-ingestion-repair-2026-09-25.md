# Item Library Forward Ingestion Repair Report

This report was written by Codex on 2026-09-25 via Codex Desktop.

## Objective

Repair future Item Library ingestion for invoice and quotation saves.

Do not backfill historical line rows with null `item_id`.

## Scope

The change adds forward-only database triggers for tenant line tables.

The triggers run when new `invoice_items` and `quotation_items` rows are inserted.

## Files changed

- `supabase/migrations/20260925093000_item_library_forward_ingestion.sql`
- `src/tests/item-library/itemLibraryForwardIngestionMigration.test.js`
- `docs/reports/item-library/item-library-forward-ingestion-repair-2026-09-25.md`

## Skills used

Skills used: supabase, supabase-postgres-best-practices, typescript-advanced-types, superpowers:test-driven-development

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

- Added `public.learn_item_catalog_for_line_item()`.
- Added `public._install_item_library_learning_triggers()`.
- Installed insert triggers on tenant `invoice_items` and `quotation_items`.
- Installed the same triggers on `tenant_master_template`.
- Updated `public._prov_install_triggers()` so future tenant provisioning copies the learning trigger.
- Added regression tests for the migration contract.

The trigger keeps a supplied `item_id`.

The trigger learns only standard rows.

The trigger uses exact normalized catalog and alias matching.

The trigger inserts a new catalog item only when no active exact match exists.

The migration does not update historical line rows.

## Verification result

Verification:

- Initial focused test: failed as expected before the migration existed.
- Focused test after migration: passed.
- `supabase db push`: passed.
- Remote catalog check: passed. The remote database reported `learn_item_catalog_for_line_item` with 24 installed trigger references.
- `bun run audit:load`: passed with existing audit warnings.
- `bun run typecheck`: failed due to `src/pages/settings/AdminSettingsSection.tsx(38,148)`. This file had pre-existing workspace changes and was not changed by this task.
- `git diff --check`: passed.
- `git status`: dirty. The workspace had pre-existing modified, deleted, and untracked files. This task added only the migration, test, and this report.
- `bun run build`: skipped due to hardware policy.

## Supabase push status

`supabase db push` succeeded.

The migration applied:

- `20260925093000_item_library_forward_ingestion.sql`

## Risks or limitations

- The repair is forward-only. Historical rows with null `item_id` remain unchanged.
- Typecheck is blocked by a pre-existing error outside this task.
- The trigger logs a warning and keeps the document save path available if catalog learning fails.

## Deferred work

- Plan a separate controlled backfill for historical null `item_id` rows.
- Fix the pre-existing TypeScript error in `src/pages/settings/AdminSettingsSection.tsx`.
