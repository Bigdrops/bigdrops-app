# BOURXE — Production Deployment: Bolu Operation ID Integrity Migrations

This report was written by Tencent Hunyuan Hy on 2026-11-18 via WorkBuddy Agent.

Skills used: supabase, supabase-postgres-best-practices  
Documentation standard: ASD-STE100 Simplified Technical English

---

## 1. Executive result

All authorized migrations were applied to the BOURXE production Supabase database. Immediate post-deployment verification passed.

The original task authorized two Bolu migrations. Preflight found a third pending migration. The user then explicitly selected `Authorize all three`. The final authorized set was:

1. `20261117000000_release_acknowledgements.sql`
2. `20261118120000_bolu_operation_idempotency.sql`
3. `20261118130000_bolu_tenant_rpc_installer.sql`

A schema backup and a data backup were created and verified before the push. The push completed with exit code `0`. The final ledger shows all three versions applied. A subsequent dry-run reported `Remote database is up to date`.

No fake invoice, quotation, tenant, or other business document was created. No destructive cleanup, ledger repair, manual SQL write, Git staging, commit, push, stash, reset, checkout, or clean was performed by this task.

---

## 2. Objective and scope

Authorized objective:

- Apply the migration set listed in section 1.
- Activate concurrency-safe operation-ID persistence for Bolu invoice and quotation creation.
- Preserve canonical document behaviour, CPS feedback, CPS item lineage, tenant permissions, and future-tenant provisioning.
- Perform immediate post-deployment verification.

Out of scope:

- Migration history repair.
- Direct SQL as a substitute for the Supabase migration workflow.
- Rollback or destructive cleanup.
- Fake documents in a live business tenant.
- `bun run build`.
- D3 expansion, D5, and D6.

Actual outcome:

- Backups created and verified.
- All three migrations applied in file-name order.
- Ledger, schema, RPC, permission, and provisioning checks completed.
- Runtime concurrency/replay behaviour not tested because no controlled production fixture was authorized.

---

## 3. Governance read before action

- `AGENTS.md`
- Relevant subordinate agent instructions.
- `docs/PROJECTSKILLINDEX.md`
- `supabase/database-workflow.md` — canonical database workflow; the requested `supabase/db workflow.md` path does not exist.
- `supabase-postgres-best-practices/SKILL.md`
- `supabase/SKILL.md`
- Relevant constraint, partial-index, and locking references.

Both Bolu migrations and the newly authorized release-acknowledgement migration were read. The independent verification report and latest remediation report were read before the first preflight.

---

## 4. Production target verification

### 4.1 Supabase CLI

Installed CLI: `2.120.0`.  
Pinned portable CLI used for push: `2.112.0`, matching `supabase/database-workflow.md`.

The portable CLI archive was downloaded from the official Supabase CLI GitHub release. Its SHA-256 matched the release checksum file:

```text
5fda1850e92fea6bc4a57309123b0d66adc8aeddfc119fc176c5077cf36895b6
```

### 4.2 Credentials

`supabase whoami` returned exit code `0`. The CLI credential store was active. No token or secret was printed in this report.

### 4.3 Project identity

`supabase projects list --output-format json` returned one matching project:

| Field | Value |
|-------|-------|
| Project ref | `xqlpekpkbszpdgtuwybh` |
| Name | `bigdrops-app` |
| Organization ID | `gnafjucxrwnxiljpmekt` |
| Status | `ACTIVE_HEALTHY` |
| Region | `eu-west-1` |
| Linked | `true` |

The linked project identity was not inferred from local metadata alone.

### 4.4 Live database connection

Read-only query results before deployment:

| Field | Value |
|-------|-------|
| Database | `postgres` |
| Role | `postgres` |
| Server | PostgreSQL 17.6 |
| Tenant schemas matching `entity\_%` | 14 |
| Eligible ready tenants | 11 |
| Failed tenants | 3 |

---

## 5. Source integrity checks

| File | SHA-256 | Bytes |
|------|---------|-------|
| `20261117000000_release_acknowledgements.sql` | `d01af45fae1652e9cf54f653f4f844a687a38c639b08c5be0b8532c8744dad7d` | 3,217 |
| `20261118120000_bolu_operation_idempotency.sql` | `8e628c8d28050f5a93cd6d1dc8b2d51e9518049af8881240b92181ced92e30e4` | 11,528 |
| `20261118130000_bolu_tenant_rpc_installer.sql` | `846ade43033b4a01c87d01fea0a204f1819568cd3245f052d1c14ed60ea26e99` | 103,304 |

The hashes were unchanged after deployment.

---

## 6. Pre-deployment scope and state

`supabase migration list --linked` showed three pending versions and no row for any of them in `supabase_migrations.schema_migrations`.

`supabase db push --linked --dry-run` listed exactly the three migrations in section 1.

Read-only preflight showed:

| Check | Result |
|-------|--------|
| `public.release_acknowledgements` exists | false |
| Eligible tenant `invoices.operation_id` columns | 0 of 11 |
| Eligible tenant `quotations.operation_id` columns | 0 of 11 |
| Eligible tenant invoice operation-ID indexes | 0 of 11 |
| Eligible tenant quotation operation-ID indexes | 0 of 11 |
| Deployed installer contains `operation_id` | false |

This confirmed that no partial application existed.

---

## 7. Backup and recovery preparation

### 7.1 CLI dump limitation

Both installed CLI `2.120.0` and pinned CLI `2.112.0` required Docker for `supabase db dump`. Docker is not installed. The workflow forbids running Docker.

A temporary, official PostgreSQL 17.12 Windows binary archive from EDB was downloaded outside the repository. Archive SHA-256:

```text
a2cd8a774389347b70be7748ac4a37ef43cb6ee539c5fc3e85ae264b15e4a04c
```

Only the PostgreSQL `bin` directory was retained. The system PATH and repository were not changed.

### 7.2 Backup method

For each backup, the exact `pg_dump` plan was generated by `supabase db dump --linked --dry-run`. The plan was executed with the local PostgreSQL 17.12 `pg_dump`. One compatibility edit was required: the CLI emitted `--quote-all-identifier`, and PostgreSQL 17 accepts `--quote-all-identifiers`. No other plan content was changed. Temporary plan files contained short-lived CLI connection credentials and were deleted immediately after use.

### 7.3 Backup files

| Backup | Bytes | SHA-256 |
|--------|-------|---------|
| Schema | 5,443,701 | `5899afbc17f99e9f4203bfe55ddfd88020af5a18c030435e21e9127dd280fc93` |
| Data | 6,175,033 | `cf9addb6f56e8b8b89bc7d9dcd254c80ed2acdc767d70fed036e11bd516843cd` |

Paths:

```text
C:/Users/DELL/AppData/Local/Temp/bolu-production-schema-backup-20261118T103304Z.sql
C:/Users/DELL/AppData/Local/Temp/bolu-production-data-backup-20261118T103304Z.sql
```

The schema backup contains tenant schema DDL, including invoice and quotation tables. The data backup completed with exit code `0`. `pg_dump` warned about circular foreign keys in accounting-related tables. This is a known data-only dump warning and does not invalidate the backup file.

These files are local temporary files. Copy them to durable backup storage before relying on them for recovery.

---

## 8. Migration execution

Command:

```bash
supabase db push --linked --yes
```

Exact result lines:

```text
Applying migration 20261117000000_release_acknowledgements.sql...
Applying migration 20261118120000_bolu_operation_idempotency.sql...
Applying migration 20261118130000_bolu_tenant_rpc_installer.sql...
Finished supabase db push.
```

Exit code: `0`.

No migration was retried. No ledger repair was used. No manual SQL write was used.

---

## 9. Final migration ledger

`supabase migration list --linked --output-format json` showed local and remote values equal for all three versions:

| Version | Local | Remote |
|---------|-------|--------|
| `20261117000000` | `20261117000000` | `20261117000000` |
| `20261118120000` | `20261118120000` | `20261118120000` |
| `20261118130000` | `20261118130000` | `20261118130000` |

Maximum applied version: `20261118130000`.

Direct ledger query results:

| Check | Result |
|-------|--------|
| Release-acknowledgement ledger row | 1 |
| Migration A ledger row | 1 |
| Migration B ledger row | 1 |

A later dry-run returned `Remote database is up to date.` One redundant dry-run attempt failed with a transient Supabase login-role `502`; the next check succeeded. No write occurred during either attempt.

---

## 10. Release-acknowledgement verification

| Check | Result |
|-------|--------|
| `public.release_acknowledgements` table | present |
| Unique index `release_acknowledgements_user_version_platform_key` | present |
| RLS enabled | true |
| Policies | 4 |
| Named SELECT/INSERT/UPDATE/DELETE policies | 4 |
| `authenticated` SELECT, INSERT, UPDATE, DELETE | true |
| `anon` SELECT | false |
| `service_role` SELECT | true |

---

## 11. Bolu schema verification

All 11 eligible ready tenant schemas showed:

| Check | Result |
|-------|--------|
| `invoices.operation_id` | present |
| `quotations.operation_id` | present |
| `idx_invoices_operation_id_unique` | present |
| `idx_quotations_operation_id_unique` | present |
| Both indexes unique | true |
| Both index predicates | `(operation_id IS NOT NULL)` |

Verified schemas:

```text
entity_bigdrops-main_adel
entity_bigdrops-main_agbado
entity_bigdrops-main_alarm
entity_bigdrops-main_allan
entity_bigdrops-main_anthropology
entity_bigdrops-main_azerbaijan
entity_bigdrops-main_jig
entity_bigdrops-main_lomo
entity_bigdrops-main_main
entity_bigdrops-main_ogombo
entity_bigdrops-main_opaque
```

Failed tenants were not modified by the eligibility rule. The non-ready tenant operation-ID column count was `0`.

---

## 12. Canonical RPC verification

All 11 eligible tenant schemas had both five-argument save functions. Every checked attribute was `true` in every schema:

| Check | Invoice | Quotation |
|-------|---------|-----------|
| Five-argument function exists | true | true |
| `SECURITY DEFINER` | true | true |
| `search_path=public` | true | true |
| Empty operation ID maps to SQL NULL | true | true |
| INSERT includes `operation_id` | true | true |
| UPDATE does not assign `operation_id` | true | true |
| INSERT column count | 26 | 23 |
| CPS feedback call preserved | true | true |
| CPS item lineage columns preserved | true | true |
| Canonical response keys preserved | true | true |
| `anon`, `authenticated`, `service_role` EXECUTE | true | true |

The canonical responses remain:

- invoice: `id`, `invoice`, `items_saved`
- quotation: `id`, `quotation`, `items_saved`

No source-level downgrade or simplified save RPC was found in the deployed definitions.

---

## 13. Future provisioning verification

| Check | Result |
|-------|--------|
| `public._prov_install_tenant_rpcs(text)` count | 1 |
| Deployed installer contains `operation_id` | true |
| Installer grants execute on all routines | true |
| `public.provision_entity` calls the installer | true |
| Template `invoices.operation_id` | present |
| Template `quotations.operation_id` | present |
| Template invoice operation-ID index | present |
| Template quotation operation-ID index | present |
| Failed tenants affected | 0 |

The template does not contain the save RPCs. This is expected: tenant schemas are cloned first, then `public.provision_entity` calls the canonical installer to create the RPCs.

---

## 14. Business data and operation-ID behaviour

No business document was created, edited, merged, or deleted by this task. The only data change was the migration-controlled `operation_id` backfill in Migration A.

The deployed partial unique indexes enforce at most one persisted row per non-null `operation_id` per family per tenant schema. Invoice and quotation indexes remain distinct.

Runtime concurrency and replay behaviour was not tested. No controlled production fixture was identified or authorized, and fake financial documents were prohibited. The following remain unproven at runtime:

- Two concurrent requests with the same operation ID.
- Single persisted document identity and number.
- Separate creation with a different operation ID.
- Invoice and quotation operation-ID isolation.
- Handling of unrelated 23505 violations through the application replay path.

These gaps do not change the deployment result. They are verification limits.

---

## 15. Remaining risks and deferred work

| Risk | Detail |
|------|--------|
| Runtime replay untested | Requires a controlled fixture or a real application flow with monitoring. |
| Backups are local | Move both backup files to durable storage. |
| Data-only dump warning | Circular foreign keys were reported for some accounting tables. |
| D3 unresolved | Activity-event attribution remains investigation-only pending hosted PostgREST verification. |
| D5 and D6 excluded | Not part of this task. |

No deployment blocker remains.

---

## 16. Verification summary

| Check | Result |
|-------|--------|
| Governance and skills read | Yes |
| Target identity verified | Yes |
| Credentials verified | Yes |
| Source hashes checked before and after | Yes |
| Pre-deployment state verified | Yes |
| Backups created and hashed | Yes |
| Authorized scope confirmed | Yes |
| Migrations applied | Yes, all three |
| Final ledger verified | Yes |
| No pending migrations | Yes |
| Release-acknowledgement objects verified | Yes |
| 11 tenant schemas verified | Yes |
| Canonical RPC behaviour verified | Yes |
| Permissions verified | Yes |
| Future provisioning verified | Yes |
| Fake documents created | No |
| `bun run build` | Not run |
| Git changes made by this task | Report update only |

---

## 17. Git state preservation

`HEAD` at the final check:

```text
295f98e46a004155bb260d70c4748663467da384
```

Final tracked source, migration, test, script, and configuration state was unchanged by this task. The task updated only this report. No Git staging, commit, push, stash, reset, checkout, clean, or destructive operation was performed.

---

## 18. Final status

COMPLETED
