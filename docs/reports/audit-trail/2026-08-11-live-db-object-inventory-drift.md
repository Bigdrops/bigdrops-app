# Live Database Object Inventory and Migration Drift — 2026-08-11

This report was written by OpenCode on 2026-08-11 via Local Runner.

## Objective and Scope

Inventory the SQL objects in the live Supabase production database and map them against the repository migrations to identify drift.

**In scope:** live tables, views, and exposed RPC functions in the `public` schema; repository `supabase/migrations/` declarations.

**Excluded:** per-tenant schemas created by the aggregate provisioning engine (`_prov_*`, invisible to PostgREST); trigger bodies; RLS policy text; index definitions; row data semantics. Column-level drift is reported only as a known limitation (see Risks).

## Method

Two sources were compared.

1. **Live database.** Introspection via the PostgREST REST API using `SUPABASE_SERVICE_ROLE_KEY` from `.env`.
   - OpenAPI spec: `GET /rest/v1/` → 121 paths.
   - Per-table probes: `?select=*&limit=1` with `Prefer: count=exact` for column sets and row counts.
   - Only the `public` schema is exposed. Tenant schemas (`ws_*`) are not reachable via REST.
2. **Repository.** Parsed all 49 `supabase/migrations/*.sql` files for `CREATE TABLE`, `CREATE VIEW`, `CREATE FUNCTION`, and `CREATE TRIGGER` statements.

## Findings

### A. Relation inventory (tables + views)

Live exposed relations: **58** = **52 tables + 6 views**.

Repo-declared views: 6. Live views: 6. **No view drift.**

| View | Live | 
| --- | --- |
| `invoice_financials_v` | yes |
| `item_price_summary_v` | yes |
| `project_financials_v` | yes |
| `v_last_invoice_activity` | yes |
| `v_last_project_activity` | yes |
| `v_last_quotation_activity` | yes |

**Table drift: exactly one.**

| Table | Migration | Live |
| --- | --- | --- |
| `telegram_topics` | declared in `20260705100000_payment_attachments.sql` (created, indexed, seeded) | **not exposed** |

The same migration that declares `telegram_topics` also adds `payments.attachments JSONB`. Live `payments` (26 rows) exposes **no** `attachments` column. No `DROP TABLE telegram_topics` or `DROP COLUMN attachments` statement exists anywhere in the repo migrations. However, the RPC created in that same migration, `record_payment_attachment_uploaded`, **is** exposed live. See Risks.

### B. RPC function inventory

Repo declares **78** `CREATE FUNCTION` names. Live exposes **63** RPC endpoints. Zero functions are live-only.

15 repo-declared functions are not exposed as live RPCs:

| Function | Migration family |
| --- | --- |
| `record_csr_created`, `record_csr_linked`, `record_csr_status_changed` | CSR events |
| `record_letter_archived`, `record_letter_created`, `record_letter_duplicated`, `record_letter_status_changed`, `record_letter_updated` | Letter events |
| `record_waybill_created`, `record_waybill_status_changed` | Waybill events |
| `handle_new_user` | auth trigger |
| `set_row_updated_at`, `set_updated_at`, `touch_updated_at`, `stamp_row_ownership` | trigger helpers |

At least some of these are explicitly declared as `public.record_* ... SECURITY DEFINER` (verified for `record_waybill_created` in `20260703100001_record_csr_waybill_events.sql`). A public, executable function is normally exposed by PostgREST. Their absence is therefore either a schema-exposure effect or evidence the functions live in a non-exposed schema.

### C. Trigger inventory

Repo declares **19** `CREATE TRIGGER` statements. Trigger existence and bindings are not verifiable via the REST API. Unverified.

### D. Live row-count snapshot (evidence of active data)

| Table | Rows |
| --- | --- |
| `invoices` | 239 |
| `quotations` | 322 |
| `quotation_items` | 2 806 |
| `invoice_items` | 2 059 |
| `item_catalog` | 1 394 |
| `item_aliases` | 1 000 |
| `audit_logs` | 400 |
| `activity_events` | 244 |
| `notifications` | 287 |
| `payments` | 26 |
| `waybills` | 18 |
| `csrs` | 16 |
| `clients` | 31 |
| `receipts` | 4 |
| `entities` | 1 |
| `workspaces` | 1 |

Both `audit_logs` and `activity_events` exist live and are populated, confirming the audit-trail pipeline is provisioned.

## Conclusions

1. The repository and the live database are in close agreement at the relation level. All 6 views and 51 of 52 tables match.
2. One relation, `telegram_topics`, and one column, `payments.attachments`, are declared in migrations but not present in the live exposed schema, with no corresponding drop in the repo. The 2026-08-09/10 aggregate-provisioning migrations are the only later candidates that could have relocated or replaced these.
3. 15 functions are declared but not callable as live RPCs. Their trigger-helper and `record_*` event families align with the waybill/CSR/letter audit paths.

## Risks and Limitations

- **REST only sees `public`.** The multi-tenancy aggregate-provisioning migrations (`20260809*` – `20260810*`) copy data into per-entity schemas. Any object that was moved or replaced there is invisible to this audit. Resolution requires SQL access (`psql` with the real DB password, or a `supabase` CLI access token).
- **Column-level drift is not reported.** The live column sets were captured exactly, but the repo-side SQL column parser produced unreliable results (it matched `CREATE TABLE` text inside PL/pgSQL function bodies). A reliable column diff needs a real SQL parser or SQL access.
- **No definitive cause** for the `telegram_topics` / `payments.attachments` absence. Two hypotheses remain equally consistent with the evidence: (a) the 2026-07-05 migration partially ran live, or (b) a later unrecorded drop/relocation occurred.

## Verification

- `bun run audit:load` ran. Pre-existing findings only (6 broad selects, 24 oversized files, 3 heavy limits). None introduced by this task (docs-only change).
- `bun run typecheck` not run: no code changed.
- `bun run build` skipped per AGENTS.md hardware policy.
- `git status` confirmed no source files modified.

## Deferred Work

- Column-level drift report (requires SQL access or a proper SQL parser).
- Trigger existence check (requires SQL access).
- Resolution of the `telegram_topics` / `payments.attachments` anomaly (requires SQL access to inspect tenant schemas and the migrations ledger).
