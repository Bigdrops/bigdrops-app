# Tenant Purge Eligibility Report — Obsolete Companies

This report was written by Muse Spark on 2026-09-09 via OpenCode.

- Objective: Remove 11 obsolete companies through the canonical entity lifecycle.
- Scope: Entity resolution, lifecycle inspection, read-only inventory, eligibility verdicts.
- Files changed: NONE. No code, migration, RLS, or config change.
- Skills used: supabase, supabase-postgres-best-practices.
- Documentation standard: ASD-STE100 Simplified Technical English.
- Changes made: NONE. Only SELECT probes ran against production.
- Verification result: Target mapping exact (11/11 UUIDs). No writes performed. Main untouched.
- Risks or limitations: No destructive step was eligible. Retention clock computed from live `archived_at`.
- Deferred work: Purge of 6 archived entities after 2026-10-05. Archive-then-purge of 5 active entities only with explicit owner authorization.

---

## TARGET RESOLUTION

All names resolved to exactly one entity row. No ambiguity. All live in workspace `bigdrops-main` (`eb30b64b-7f95-464f-be1a-805cf2c0fedc`).

| Display name | Entity UUID | Slug | Status | archived_at (UTC) |
|---|---|---|---|---|
| Agam | f2cbeffe-7666-47e6-9caf-145d1e952867 | agam | archived | 2026-09-05 13:55:42 |
| Agbado | ab20ab4a-cb7e-4562-9e5f-b2d22212679f | agbado | archived | 2026-09-05 13:55:47 |
| Ogombo | f2616b68-d075-47c8-998b-4df3fefa79b7 | ogombo | archived | 2026-09-05 13:55:51 |
| Issa certified | f27caa11-735d-4e00-a2c6-11f24145fd96 | issa-certified | archived | 2026-09-05 13:55:54 |
| Ororo | 54fb2d43-f19a-43fa-910b-5a2fdfa63819 | ororo | archived | 2026-09-05 13:55:58 |
| Alarm | 9aeadae6-cb3c-459d-975e-5ddffddce1ae | alarm | archived | 2026-09-05 13:56:02 |
| Anthropology | cecb400a-3fb9-4671-a5a5-e5b4113da62a | anthropology | active | NULL |
| Opaque | b8dd4346-5d0f-475e-85ce-f38c109a220b | opaque | active | NULL |
| Lomo | 078ad0a7-3a8f-4689-9560-b5666b2c83a8 | lomo | active | NULL |
| Adel | 96b2dfa4-7652-49bd-bbff-532192affe2c | adel | active | NULL |
| Allan | b8d9a78a-55e8-4b3a-977e-6a2c5c755fd0 | allan | active | NULL |

Protected entity (explicitly excluded, verified present and untouched):

- Sun & Shield Power Solutions / `main` / `eca34515-0b30-482c-b12e-3963df164322` / active / 278 permission rows (pre-existing manual grants).

Note: Alarm is archived (not active as the request assumed). Allan was created 2026-09-09 03:45 UTC (today).

## ELIGIBILITY

Authoritative rule: `purge_entity()` (`20260905020000_entity_lifecycle.sql:192-276`) requires caller = workspace owner or platform operator, status = `archived`, and `archived_at <= now() - 30 days`. It raises otherwise.

| Target | Eligible | Retention rule | Eligibility date | Reason |
|---|---|---|---|---|
| Agam, Agbado, Ogombo, Issa certified, Ororo, Alarm | NO | 30 days from archive | ~2026-10-05 13:56 UTC | Only ~4 of 30 days elapsed |
| Anthropology, Opaque, Lomo, Adel, Allan | NO | 30 days from archive | N/A (not archived) | Status `active`; purge rejects non-archived |

The canonical lifecycle supports archive-then-purge for the 5 active targets. Archiving was NOT performed: it makes tenants immediately inaccessible, restarts the 30-day clock (~2026-10-09), and lacks explicit authorization. The request asks for deletion, not suspension.

## ACTIONS

Purge attempted: NO for all 11 targets. No canonical mechanism was invoked. No DELETE ran. No timestamps manipulated. RLS, triggers, and policies untouched.

Additional hard blocker: `purge_entity()` requires `auth.uid()` of the workspace owner. CLI sessions carry no JWT. Invocation from here is impossible without bypassing safeguards. Purge must run as the workspace owner (app session or owner-authorized path).

## REMAINING ENTITIES

All 11 requested entities remain intact:

- 6 archived: purgeable on/after ~2026-10-05 13:56 UTC via `purge_entity()` as workspace owner.
- 5 active: require `archive_entity()` first (owner decision), then 30-day retention, then `purge_entity()`.

## INVENTORY (read-only evidence)

- Tenant schemas: all 11 target schemas exist (`entity_bigdrops-main_<slug>`), plus `main`. None dropped.
- Permissions: 58 rows each (Agbado 74 — pre-existing extra grants, untouched). Main 278.
- Lifecycle audit: one `archived` row each for the 6 archived targets. Zero purge rows anywhere.
- Exposure queue: 7 rows, all `processed=true`, 0 pending (includes one stale `test_probe` row — left untouched).
- Memberships: 4 workspace members. Not modified.

## SAFETY VERIFICATION

- Main/Sun & Shield: UUID, status, schema, permissions, and exposure unchanged. Verified by re-query (278 rows, REST 200).
- Non-target entities: untouched.
- No business data copied, moved, or altered. No RLS, migration, provisioning, seeder, or PostgREST change.
- Zero writes executed this session (SELECT and REST GET only).

## GIT SCOPE

- Files modified by this task: NONE.
- Files created by this task: this report only.
- `git status` / `git diff --stat`: no task changes. All other working-tree entries belong to concurrent agents.
