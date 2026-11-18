# BOURXE Disposable Development & Verification Database

**Environment designation:** Permanent BOURXE disposable development and verification database.

**Status:** Designated 2026-11-18 by the project owner. **Credentials are not yet present in this repository or its `.env`.** This document is the source of truth for which Supabase project agents must target for development, migration testing, scratch tenants and RPC verification until told otherwise. Do not require the user to repeat these identifiers.

---

## 1. Project identity (authoritative)

| Attribute | Value |
|---|---|
| Supabase project ref | `svrpqsdagtgtclnrlmbm` |
| Project URL | `https://svrpqsdagtgtclnrlmbm.supabase.co` |
| PostgreSQL host | `db.svrpqsdagtgtclnrlmbm.supabase.co` |
| PostgreSQL port | `5432` |
| Database | `postgres` |
| Database user | `postgres` |
| Client configuration names | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Vite convention used by this repository) |

User-supplied reference client configuration (Next.js-style names shown by the owner; the repository uses the Vite names):

```
NEXT_PUBLIC_SUPABASE_URL=https://svrpqsdagtgtclnrlmbm.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<user-supplied-publishable-key>
```

PostgreSQL connection-string template (password intentionally withheld):

```
postgresql://postgres:[YOUR-DATABASE-PASSWORD]@db.svrpqsdagtgtclnrlmbm.supabase.co:5432/postgres
```

---

## 2. Production is separate — never confuse the identifiers

| | Production | Disposable |
|---|---|---|
| Project ref | `xqlpekpkbszpdgtuwybh` | `svrpqsdagtgtclnrlmbm` |
| URL | `https://xqlpekpkbszpdgtuwybh.supabase.co` | `https://svrpqsdagtgtclnrlmbm.supabase.co` |
| DB host | `db.xqlpekpkbszpdgtuwybh.supabase.co` | `db.svrpqsdagtgtclnrlmbm.supabase.co` |

**Rules for agents:**

- Routine development, migration testing, scratch tenants, RPC verification, destructive test cleanup — all belong on the **disposable** project.
- **Production writes, migrations, and deployment require separate explicit authorization** and are governed by `supabase/database-workflow.md`. Nothing in this file authorizes a production operation.
- The `supabase/.temp/linked-project.json` currently records the **production** link. Do **not** treat the current repository link as targeting the disposable project, and do not silently relink; use explicit project targeting (`--project-ref svrpqsdagtgtclnrlmbm`) or a dedicated linked environment per §6.
- Never copy production credentials, tokens or keys into disposable configuration. Never copy disposable credentials into production configuration.
- `.env` is gitignored (and so is any `.env.*` variant except `.env.example`). Credentials belong there or in the approved secret store, never in tracked documentation.

---

## 3. Intended purpose and approved use cases

- Applying and testing the migration chain (`supabase/migrations/*.sql`) before it is authorized for production.
- Tenant provisioning verification (workspace → entity → `provision_entity` → schema exposure).
- Isolated scratch tenants for Bolu assistant, invoice/quotation modification, Advance Invoice, and RPC verification.
- Inserting synthetic fixtures for tests (items, documents, users) and destructive cleanup of those fixtures.
- Behaviour-preservation and regression checks against the live disposable schema without risking production data.

Explicitly **not** permitted here without separate authorization: any of that against `xqlpekpkbszpdgtuwybh`.

---

## 4. How agents must verify the target before any write

A project URL in a variable is **not** proof of the connected project. Before any write or migration push:

1. Read `supabase/.temp/linked-project.json` (created by `supabase link`) and confirm its `ref` equals `svrpqsdagtgtclnrlmbm` when working on the disposable project, or use explicit flags: `supabase db shell --linked` is unsafe without a verified link; prefer `supabase db shell --project-ref svrpqsdagtgtclnrlmbm` style invocation if supported by the CLI version, or enter credentials per §5.
2. Inside a SQL shell, run `SELECT current_database(), current_schema`-style probes and confirm expected schemas (`public`, `tenant_master_template`, `entity_*`).
3. Confirm: **`xqlpekpkbszpdgtuwybh` is never what you are about to write to.** If the answer is ambiguous, stop and ask.

---

## 5. Local credential configuration

`.env` is the gitignored local secrets file. If an agent or developer configures the disposable project locally, the entries are:

```bash
# Disposable DEVELOPMENT database client config (repo uses Vite names)
VITE_SUPABASE_URL=https://svrpqsdagtgtclnrlmbm.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-key-for-svrpqsdagtgtclnrlmbm>
# Server-only, never VITE_-prefixed:
SUPABASE_URL=https://svrpqsdagtgtclnrlmbm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-for-svrpqsdagtgtclnrlmbm>
```

Rules:

- **Never** put these values in tracked files, including this one or in reports.
- Do **not** reuse the values from `.env` labelled production; those are production credentials and must point to the disposable project or be absent entirely.
- The CLI login token is stored by the CLI itself (Windows Credential Manager); CI uses `SUPABASE_ACCESS_TOKEN`.
- Console of the disposable project: an access token is scoped to your Supabase organization and can access only the projects you own — still verify §4 before writing.

**Credential status on 2026-11-18 (updated after Stage 0.3 install):**

| Item | State |
|---|---|
| Publishable key (client) | **Configured** — gitignored `.env.disposable`; `/auth/v1/settings` returns 200 |
| Secret API key (service access, `sb_secret_…`) | **Configured** — gitignored `.env.disposable` |
| PostgreSQL password (`postgres`) | **Configured** — gitignored `.env.disposable` |
| Supabase CLI access token for the disposable project's organization | **Supplied** — gitignored `.env.disposable` (`SUPABASE_ACCESS_TOKEN`, `sbp_…`); CLI `db push` / `db query --linked` work (e.g. `db query --project-ref svrpqsdagtgtclnrlmbm --linked`). Note: `--project-ref` alone is rejected by `db query` unless paired with `--linked`. Direct `db.svrpqsdagtgtclnrlmbm.supabase.co` still resolves AAAA-only from this host (ENOTFOUND); management-API paths work |
| Management API PAT for the disposable organization | **Supplied** — same token as CLI access token; used read-only (GET postgrest) and once for the schema-union PATCH described in the Stage 0.3 report |
| Disposable project contents | **Installed** — 161/161 migrations applied and matched; scratch tenant provisioned (`entity_stage0-verify-dd665862-real_stage0-verify-dd665862-real`, exposed via PostgREST) |
| Migration chain applied | **Yes** (2026-11-18) — through `20261118130000_bolu_tenant_rpc_installer.sql`, including additive repairs `20261014150000`/`20261014158000`/`20261014159000`/`20261014170000` |
| Production link (`supabase/.temp/linked-project.json`) | **Unchanged** (`xqlpekpkbszpdgtuwybh`) |

**Verified:** full migration install, scratch-tenant provisioning path (workspace → entity → `provision_entity` → PostgREST exposure), 23/23 app-path live invoice/quotation checks (create/modify/preserve/adversarial). See `docs/reports/bolu-document-capability-parity/stage-0-scratch-tenant-verification.md`.

**Unverified / not done:** harness-vs-deployment EX-FK parity (finding F1 in the Stage 0.3 report); production repair of the same template drift is a separate, separately-authorized decision; JWT secret and PAT shown in tool output should be rotated.

---

## 6. Applying the migration chain

Follow `supabase/database-workflow.md` with the disposable project as the explicit target:

1. `supabase link --project-ref svrpqsdagtgtclnrlmbm` (one time for the clone; changes `supabase/.temp/linked-project.json`, so do it only in a disposable-development context or with explicit authorization — do not overwrite the production link silently).
2. `supabase db push` — the approved chain applies in filename order. Review each migration for production-only assumptions before pushing (e.g. `20260915194332_tenant_template_seed.sql` tenant template is required for tenant provisioning).
3. Verify: `supabase migration list --linked`; `supabase db diff --linked` should be empty.
4. Reload PostgREST schema cache: `NOTIFY pgrst, 'reload schema';` from `supabase db shell`.

Tenant provisioning path (as implemented in `src/domain/tenant/tenantCreation.ts`):

1. Insert workspace (`workspaces`), insert entity (`entities`, caller must be workspace member with `create_entity` or workspace owner).
2. Call `provision_entity` RPC with `p_entity_id`.
3. The function validates the caller's permissions (workspace owner or `create_entity`), clones `tenant_master_template` into `entity_<slug>`, installs tenant RPCs, RLS policies, triggers, financial views, settings row, default permissions, and enqueues the schema for PostgREST exposure (`postgrest-schema-exposure` Edge Function / pg_cron handler makes it live).
4. Verify with `SELECT public._prov_get_schema_name('<entity-uuid>');` and the provisioning status table/view, and by calling a tenant RPC such as `save_invoice_with_items_transaction`.

Scratch fixtures: create isolated tenants with synthetic names (`stage0-scratch-verify-<ts>`) only. Never seed production-named identities.

Cleanup: drop scratch tenant artifacts with the approved workflow; never drop shared infrastructure, never truncate, cascade-delete production data, or alter production schemas. Removing a scratch entity requires the same isolation checks as creating it (see §4) and separate authorization where it drops persisted shared objects.

---

## 7. Migration & PostgREST reachability (as of 2026-11-18, updated)

| Path | Status |
|---|---|
| Direct Postgres (`db.svrpqsdagtgtclnrlmbm.supabase.co:5432`) | **Unreachable from this host** — hostname is IPv6-only; `getaddrinfo ENOTFOUND` (no IPv4/IPv6 route) |
| CLI + Management API (`--linked`, `db push`) | **Works** — organization PAT supplied and gitignored; full chain pushed successfully |
| PostgREST tenant-schema exposure | **Done for `entity_stage0-verify-dd665862-real_stage0-verify-dd665862-real`** — applied via a union PATCH on `db_schema` (same semantics as `postgrest-schema-exposure` edge function); required schemas were not removed; no other project setting was changed; queue row marked `processed` |

Notes:

- `supabase db push --project-ref svrpqsdagtgtclnrlmbm` is the sanctioned push path for this project. One of the applied migrations (`20261014170000_public_schema_grants.sql`) required `--include-all` because its filename sorts before already-applied remote migrations; it is additive (GRANT-only).
- Historical migrations were never edited; the template-drift repairs are separate additive migration files.
- The migration-list check is authoritative: 161 local == 161 remote after the repair sequence.
- Production (`xqlpekpkbszpdgtuwybh`) remains separately authorized; nothing in this section applies to it.

---

## 8. Instructions specifically for agents doing database work

- Read this file plus `supabase/database-workflow.md` before any database operation.
- Explicitly target `svrpqsdagtgtclnrlmbm`; assume `xqlpekpkbszpdgtuwybh` is production unless you positively verify otherwise per §4.
- Migrations always through the approved migration workflow; never edit historical migrations; never rewrite migration history.
- Never copy production schema data into the disposable database
(and vice versa). Synthetic fixture data only.
- Never delete a scratch tenant without verifying it was created by your task.
- Production operations remain separately authorized and out of scope.
- If credentials are missing for the project you need, stop at that gate and report — do not substitute another project.
