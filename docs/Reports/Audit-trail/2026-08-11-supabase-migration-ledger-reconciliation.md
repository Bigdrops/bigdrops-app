# Supabase Migration Ledger Reconciliation — 2026-08-11

This report was written by DeepSeek on 2026-08-11 via opencode.

## Objective

Verify whether the migrations in the repository have been applied to the live Supabase production database.

## Scope

**In scope:**
- The linked Supabase project `bigdrops-app` (ref `xqlpekpkbszpdgtuwybh`, region `us-east-1`, org `tgc-ventures`).
- The `supabase/migrations/` directory in the repository.
- The `supabase_migrations.schema_migrations` ledger state as reported by the Supabase CLI.

**Excluded:**
- Object-level comparison of the live database schema. This is covered by `docs/Reports/Audit-trail/2026-08-11-live-db-object-inventory-drift.md`.
- Row data and tenant (`ws_*`) schemas.
- Any change to the live database.

## Method

The Supabase CLI was run from PowerShell in the repository root. No database writes were executed.

1. `supabase migration list --linked` — lists local and remote migrations.
2. `supabase db push --linked --dry-run` — reports what a migration push would do, without executing it.
3. Local migration files listed with `Get-ChildItem`.
4. Full CLI table captured to `docs/Reports/Audit-trail/2026-08-11-live-migration-list.txt`.

The CLI authenticated successfully. It did not print any secret values.

## Findings

### A. Repository migration set

The repository contains **55** migration files.

- Dates range from `2026-05-20` to `2026-08-11`.
- Two files share the version prefix `20260810010000`:
  - `20260810010000_quotation_data_migration.sql`
  - `20260810010000_tenant_settings_identity_backfill.sql`
- The set includes the multi-tenancy and aggregate-provisioning migrations from `2026-07-14` onward.

### B. Migration ledger state on the linked project

`supabase migration list --linked` reports **all 55 local migrations** with a **blank Remote column** for every row.

- No remote-only migration entries were present in the output.
- `supabase db push --linked --dry-run` reports that it **would push all 55 migrations**.

Conclusion: **none of the 55 repository migrations are recorded as applied on the linked production database.**

### C. Conflict with prior untracked finding

An earlier note in the working session claimed the remote ledger contained 500+ migrations dated April to June 2026. This did **not** reproduce in the current session.

- The CLI output captured to `2026-08-11-live-migration-list.txt` does not contain those entries.
- The dry-run output does not treat any of the 55 local files as already applied.
- The earlier note is treated as a misread of the CLI output, or as a state that no longer exists.

### D. Live objects already exist

The live database already contains 52 tables and 6 views (see the object inventory drift report). Those objects exist without a matching ledger entry.

This means one of the following is true:
- The schema was created outside the migration workflow.
- The ledger was reset after the schema was created.
- The ledger belongs to a different project than expected.

The evidence does not distinguish between these.

## Changes Made

- Created `docs/Reports/Audit-trail/2026-08-11-supabase-migration-ledger-reconciliation.md`.
- Overwrote `docs/Reports/Audit-trail/2026-08-11-live-migration-list.txt` with the full captured CLI table.
- No database changes were made.

## Verification

- `supabase migration list --linked`: connected to remote, printed all 55 local rows with blank Remote column.
- `supabase db push --linked --dry-run`: connected to remote, printed "Would push these migrations" for all 55 files.
- `git status`: only the report and capture files changed; no source files modified.
- `bun run audit:load` and `bun run typecheck`: not run. No code was changed (docs-only task).

## Risks and Limitations

- The CLI report is only as reliable as the linked project. If the local CLI is linked to a different project than the one hosting production data, this result is invalid. The project ref `xqlpekpkbszpdgtuwybh` was confirmed via `supabase projects list`.
- The dry-run confirms the 55 files are not applied. It does not list remote-only ledger entries that have no local counterpart.
- Running `supabase db push` against production would apply data-migration files (for example `20260809030000_invoice_aggregate_data_migration.sql`). These could rewrite production data. They must not be pushed without explicit instruction.

## Deferred Work

- Direct SQL read of `supabase_migrations.schema_migrations` to confirm ledger contents at the row level. Requires the `--db-url` route or a different connection method.
- Resolution of how the live schema was created if it is not from this migration set.
- A decision on whether the 55 migrations should ever be pushed to this project.