# Provisioning Engine — Canonical Settings Seed

This report was written by Buffy on 2026-08-09 via Freebuff.

## Objective

Fix the structural gap where `provision_entity()` clones the `settings`
table structure but never inserts a default settings row. Newly provisioned
entities must receive a canonical settings row (id = 1) at creation time.

## Scope

In scope:
- Add a seed step inside the provisioning engine so future entities get a
  settings row automatically.

Out of scope (intentionally excluded):
- Backfilling the already-provisioned `entity_bigdrops-main_main` schema.
- Any frontend change.
- Any table structure, RLS policy, or other provisioning step.
- Business data tables.

## Evidence

Facts:

- `supabase/migrations/20260520090000_core_tables.sql` defines `public.settings`
  with `id integer NOT NULL DEFAULT 1` as primary key.
- `supabase/migrations/20260611000001_document_prefixes.sql` adds
  `document_prefixes jsonb` with a default value.
- `supabase/migrations/20260717000000_entity_provisioning_engine.sql` defines
  `provision_entity()` with steps: validate → idempotency → lock → schema →
  clone tables → re-add FKs → finalize (status `ready`). No settings row is
  inserted anywhere in the pipeline.
- The new migration redefines only the function definitions. No table, RLS,
  or data statements are included.

## Change

New file: `supabase/migrations/20260809000000_provisioning_settings_seed.sql`

1. New private helper `public._prov_seed_settings(p_entity_id uuid, p_schema_name text)`:
   - Reads `display_name` from `public.entities` for `p_entity_id`.
   - Raises `Entity not found` if the entity does not exist.
   - Runs a dynamic insert:
     `INSERT INTO {schema}.settings (id, company_name) VALUES (1, {name}) ON CONFLICT (id) DO NOTHING`
   - Only `id` and `company_name` are supplied. All other columns rely on the
     cloned table's column defaults (document_prefixes, custom_info, etc.).
   - `ON CONFLICT (id) DO NOTHING` keeps the operation idempotent.
   - Attributes: `SECURITY DEFINER`, `search_path TO 'public'`, same
     conventions as the other `_prov_*` helpers.

2. `public.provision_entity()` redefined:
   - Signature `(p_entity_id uuid) RETURNS jsonb`, `SECURITY DEFINER`,
     `search_path TO 'public'` — unchanged.
   - Body identical to the original except a new step 8.5:
     `PERFORM public._prov_seed_settings(p_entity_id, v_schema_name);`
     placed after FK re-add (step 8) and before finalize (step 9).
   - Verified by diff: the redefined body differs from the original only by
     the seed block and the header comment.

## Risks and Limitations

- This migration was not executed against a live database in this session.
  Static review and diff verification were performed only.
- The existing `entity_bigdrops-main_main` schema keeps its empty settings
  table. Its seeding is deferred out of scope.

## Verification

- `bun run typecheck`: PASS (exit 0, zero errors).
- `bun run audit:load`: PASS (exit 0). Reported warnings are pre-existing in
  unmodified source files; none relate to this migration.
- `git diff --check`: PASS (no whitespace errors).
- `git status`: only the new migration file is added.
- `bun run build`: NOT run (prohibited by AGENTS.md host-resource policy).

## Deferred Work

- Backfill settings row for already-provisioned entities if required.
