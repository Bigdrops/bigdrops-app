# Pending Supabase Migrations — PUSHED

This ticket was written by Buffy on 2026-09-14 via Freebuff.
Updated 2026-09-14 — all migrations pushed.

---

## Status: CLOSED

All 10 unapplied migrations have been pushed to the hosted database (`xqlpekpkbszpdgtuwybh`).

- `supabase db push --linked --include-all` — passed.
- `supabase migration list —linked` — Local = Remote for all entries.
- PostgREST schema cache reloaded: `NOTIFY pgrst, 'reload schema';`

### Fixes applied during push

| Migration | Issue | Fix |
|---|---|---|
| `20260907000000_record_capture_foundation.sql` | `format()` + `$func$` body caused `unrecognized format() type specifier` and `column "schemaname" does not exist` errors | Rewrote DO blocks using `\|\|` concatenation with `quote_ident()` instead of `format()`. Fixed `pg_namespace.nspname` vs `pg_tables.schemaname`. |
| `20260914130000_add_source_boq_id_to_quotations.sql` | `ALTER TABLE quotations` — `quotations` not in `public` schema | Changed to `tenant_master_template.quotations` and `tenant_master_template.boqs` |

---

## Original Ticket

### Objective

Track 10 local migration files in `supabase/migrations/` that the hosted project does not have. The check used `supabase migration list --linked` on project `xqlpekpkbszpdgtuwybh` on 2026-09-14. No push was run.

**Severity:** Medium — schema drift between repo and hosted database
**Domain:** Cross-domain (taxation-made-easy, accounting, workspace)

### Inventory

#### Taxation Made Easy — 4 migrations

| Migration | What it does |
|---|---|
| `20260907000000_record_capture_foundation.sql` | Extends `tax_input_entries` with evidence and payment fields. Adds `EXPENSE_RECORDED` audit event. |
| `20260912100000_tax_architecture_phase2a.sql` | Creates the 7 core tax tables (Phase 2A). |
| `20260912120000_gate_e_rules_engine.sql` | Adds immutability trigger and unique constraint on `tax_rule_versions`. |
| `20260912130000_gate_e_seed_rules.sql` | Seeds NTA 2025 statutory rules (CIT, allowances, levy). |

#### Accounting / Money-Out — 3 migrations

| Migration | What it does |
|---|---|
| `20260908100000_accounting_reporting_foundation.sql` | Journal-derived reporting foundation (Gap 1 spec). |
| `20260909100000_gap2_reversal_boundary.sql` | Adds `reverse_accounting_entry()` — posted-entry reversal boundary (Gap 2). |
| `20260914100000_expense_money_out.sql` | Adds the `expenses` table on the accounting foundation. |

#### Workspace / Tenancy — 2 migrations

| Migration | What it does |
|---|---|
| `20260909025241_restore_canonical_permission_seed_v2.sql` | Restores canonical permission seed. |
| `20260910013020_abandon_pending_workspace.sql` | Lets the creator of a pending workspace request abandon it. |

#### Other — 1 migration

| Migration | What it does |
|---|---|
| `20260914130000_add_source_boq_id_to_quotations.sql` | Adds `source_boq_id` FK from quotations to boqs for BOQ→Quotation conversions. |

### Notes

- `supabase/migrations/_temp_debug.sql` is skipped by the CLI. Its name does not match `<timestamp>_name.sql`. Delete or rename it in a separate cleanup task.
- Per AGENTS.md section 3, do not mark related feature tasks complete while their migrations sit unpushed.

### References

- `supabase/database-workflow.md` — push rules and probe commands
- `docs/reports/taxation-made-easy/expense-money-out-implementation-2026-09-14.md`
- `docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Waterfall-roadmap.md`
