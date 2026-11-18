# Stage 0.3 — Disposable Supabase Environment: Credentials Received, Schema Installation Blocked

**Date:** 2026-11-18 · **Type:** Environment configuration + verification (blocked at migration-install gate) · **Scope:** documentation only — no production use, no tracked secrets.

## Final status: Partially completed — configured; migration install blocked on one missing credential

## 1. What was configured (safe, local-only, untracked)

- `.env.disposable` (gitignored via `.env.*`; verified `git check-ignore` matches and `git ls-files` shows it untracked) now holds the project's URL, publishable key and secret key. **No secret value appears in any tracked file, report, or this response.**
- `supabase/disposable-database.md` updated to record exactly what is and isn't configured (no values; only statuses); `supabase/database-workflow.md` pointer unchanged.
- Production link `supabase/.temp/linked-project.json` untouched.

## 2. What was verified (read-only)

| Check | Result |
|---|---|
| Project identity (ref/URL/host) | Match (`svrpqsdagtgtclnrlmbm` / `https://svrpqsdagtgtclnrlmbm.supabase.co` / `db.svrpqsdagtgtclnrlmbm.supabase.co:5432`) |
| Publishable key → `GET /auth/v1/settings` | **200** |
| Secret key → Data API (`createClient`, minimal probes) | Auth accepted (schema-cache answers, no permission errors) |
| `public` schema tables | **None installed** (`workspaces`, `entities`, `item_catalog`, `entity_provisioning_status` all missing) |
| Tenant infra RPCs | **Not installed** (`provision_entity`, `get_entity_schema_names` not in schema cache) |
| CLI visibility (`supabase projects list`) | Only production `xqlpekpkbszpdgtuwybh` and unrelated `wyxtghlfmcitantypobs` visible; `svrpqsdagtgtclnrlmbm` is in a **different organization** |
| Significance | Disposable project is **empty**; nothing can be verified until the migration chain is installed |

## 3. What is blocked and exactly why

Stage 0.3 requires (in order): apply the approved migration chain → provision an isolated scratch tenant → RPC verification. The chain cannot be installed with available credentials:

- **PostgreSQL password** (`postgres`) missing — required for `supabase db push` / `db shell`; connection-string template still shows `[YOUR-DATABASE-PASSWORD]`.
- **CLI access token for the disposable project's own organization** missing — the current CLI token shows only the production org; `svrpqsdagtgtclnrlmbm` is not listed.
- **Management API PAT** for that organization not supplied.
- The two API keys alone **cannot** install DDL via the Data API (no SQL-execution endpoint; the project ships no `exec_sql`-style helper function — it is empty).

## 4. What is needed to finish Stage 0.3

1. The PostgreSQL password for `postgres` on `svrpqsdagtgtclnrlmbm` (typical path: Supabase Dashboard → Database → Settings → Reset database password), or
2. A Personal Access Token for the Supabase organization that owns `svrpqsdagtgtclnrlmbm` (then relogin / explicit `--project-ref` targeting), or
3. Your explicit authorization to apply the chain via a REST-exposed migration path (none exists in the repo without one of the above).

On receipt I will: `supabase link` or explicit-target to `svrpqsdagtgtclnrlmbm`, run `supabase db push`, verify function presence via probes, provision a scratch tenant, and execute cases A–F + atomicity + the data-preservation regression inside the disposable project.

## 5. Git state and attribution

```
## main...origin/main [ahead 12]
 M .workbuddy-ai/memory/2026-11-18.md            (pre-existing)
 M src/lib/ai-assistant/bolu-document-service.ts (Stage 0/0.1/0.2, pre-existing)
 M src/lib/ai-assistant/bolu-operations.ts       (Stage 0, pre-existing)
 M supabase/database-workflow.md                 (one pointer paragraph)
?? supabase/disposable-database.md               (new)
?? docs/reports/bolu-document-capability-parity/
?? docs/reports/bolu-modification-integrity/
?? src/tests/ai-assistant/bolu-modify-integrity.test.js
HEAD = 295f98e4
```

`.env.disposable` is ignored (`.env.*` except `.env.example`) and contains no tracked secret. No migrations were applied; no environment was relinked; no package was changed. No commits, pushes, stages, stashes or cleans performed. This report is the only report-level artifact added this round.

## 6. Completion boundary

Credential configuration of the disposable environment is done and documented. Stage 0.3 remains blocked on the missing PostgreSQL password or organization PAT; until supplied, the disposable project stays empty and nothing can be verified against it. No production credential was used or implied as a substitute.
