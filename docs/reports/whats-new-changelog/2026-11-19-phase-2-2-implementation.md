# Phase 2.2 Implementation Report — Durable Release-Asset Ledger, NULL Policy Bootstrap, Retry Verification, Reissue Identity & True SHA Snapshot

Date: 2026-11-19
Task type: Authorized Implementation (Phase 2.2 — Architecture Corrections Only; Phase 3 NOT started)
Repository: `bigdrops-app` · Branch: `main` · HEAD at start: `ad97c741921a4f2e975f3fe81832663ad779ebf0`

## Completion status

**Completed** (all five corrections implemented, tested and verified). No Phase 3 work was performed.

Evidence labels: **DECISION** (user-approved / Amara-locked), **OBSERVATION** (verified in this turn), **REFERENCE** (prior report), **PROPOSAL** (not approved).

## 1. What was fixed

The Phase 2.1 audit found two critical defects and several high-severity gaps. Each correction below maps to a locked decision in the Phase 2.2 request.

### 1.1 Durable consumed-state source (critical defect 1) — DECISION

- `scripts/release/releaseGate.mjs`: record schema bumped to **v2**. Each record now carries `buildSha` (+ legacy `sha` alias), `versionCode`, `versionName`, `tag`, `consumedEntryIds` (+ legacy `ids`), release identity (`releaseTitle`, `releaseNotes`, `apkAssetName`), verification flags, and reissue links. Schema v1 ledgers remain readable (`SUPPORTED_SCHEMAS = [1, 2]`).
- `loadLedger()` **fails closed**: missing ledger is an error unless `allowMissing` is explicitly set (first release only); malformed JSON, unsupported schema, and two different builds claiming the same `versionCode` all throw.
- `mergeLedger()` appends without deleting or mutating historical records and is idempotent for the same build SHA + version.
- Workflow: the authoritative ledger is now the **`consumed-ids.json` GitHub Release asset**, fetched at the start of every run (`Fetch consumed-ID ledger`). The 90-day Actions artifact is retained only as a convenience copy for the Git worker. A release without the ledger asset, or an invalid ledger, stops the run.
- `planReconciliation()` detects a confirmed release whose `versionCode` is ahead of policy; the workflow refuses to start a newer release and directs a re-dispatch of the matching tag (a tag-run retry of that same release is allowed to proceed and reconcile policy).

### 1.2 NULL policy bootstrap (critical defect 2) — DECISION

- `evaluatePolicyState()`: a seeded row (`version_code = NULL` with all other release metadata empty) now returns **`advance`**; `NULL` with unexpected metadata returns **`conflict`**. `isSeededPolicyRow()` implements the check. Higher-version rejection, higher-version advance, equal-version idempotency (SHA + tag) and equal-version conflict are preserved.
- Workflow conditional PATCH: `id=eq.1&or=(version_code.is.null,version_code.lt.N)` with `Prefer: return=representation`. The returned row is validated (non-empty array and matching `version_code`); zero rows or a mismatch is a hard stop. The `NULL` branch is the explicit first-release bootstrap.

### 1.3 Thorough retry verification (high-severity gap) — DECISION

- `verifyExistingRelease()` checks: release existence, tag SHA, release title, release notes hash, APK asset presence/name/downloadability, `consumed-ids.json` SHA/version/tag match, and policy consistency. Any mismatch fails closed.
- Workflow `Reconcile or publish GitHub Release`: an existing release is no longer skipped on `gh release view` existence alone. Its title, body hash, tag SHA, APK asset and ledger identity are verified before resuming. On a tag-run retry, the GitHub release APK asset is also fetched via unauthenticated GET and passed through `verify-asset`.

### 1.4 Non-destructive reissue identity (high-severity gap) — DECISION

- `changelog.mjs`: `createReissueId(originalId, key)` mints a **new** `rel_<8 hex>` ID deterministically linked to the original (`reissue:<originalId>:<key>` hash). `releaseGate.mjs`: `createReissue()` returns `{ id, reissueOf, text }`. Historical consumption records are never rewritten; the reissued entry is a distinct ID eligible for a future release, carrying `reissueOf`/`reissuedFrom` link metadata.
- `selectArchivableIds()` uses `consumedEntryIds`, so a reissued ID is not archived by the original entry's consumption record.

### 1.5 True SHA snapshot (high-severity gap) — DECISION

- `changelog.mjs`: `loadChangelogAtSha(sha, { cwd, reader })` reads `CHANGELOG.md` with `git show <sha>:CHANGELOG.md`. It first runs `git cat-file -e <sha>^{commit}` so a **nonexistent commit can never be mistaken for an empty snapshot** — a real defect found and fixed during this turn (git emits the same "path exists on disk, but not in <ref>" error for both cases).
- `releaseGate.mjs`: `buildReleaseNotesForSha()` builds notes from the exact build SHA. Workflow `Generate release notes` uses `--sha "$BUILD_SHA"` rather than the mutable working-tree `CHANGELOG.md`. `--before-version-code` excludes the current version's own ledger record so a retry recomputes the same notes instead of empty notes.

## 2. Files changed (all task-attributable)

Modified:
- `.github/workflows/build-android-test-release.yml` — ledger fetch, reconciliation gate, SHA-pinned notes, strict release retry verification, NULL-bootstrap conditional PATCH, durable ledger asset, reordered Bun setup, gated archive.
- `scripts/release/changelog.mjs` — `createReissueId`, `loadChangelogAtSha` (with commit-existence check).
- `scripts/release/releaseGate.mjs` — schema v2, fail-closed ledger load/merge, reconciliation, reissue, NULL bootstrap, retry verification, `snapshot`/`hash-notes`/`validate-ledger`/`merge-ledger`/`reconcile`/`reissue`/`verify-release` CLI commands; `build-notes --sha/--before-version-code`.
- `src/tests/critical/changelogSnapshotFeasibility.test.js` — true-SHA snapshot and reissue-ID tests.

New:
- `src/tests/critical/changelogPhase22.test.js` — 19 tests covering all Phase 2.2 helpers.
- This report.

Not touched: `src/components/`, `src/hooks/`, `src/domain/appUpdate/`, `releaseDiscovery.ts`, `releasePolicyClient.ts`, `supabase/migrations/`, `docs/prompts/git-workflow-commit.md`, PRD status line. `reportProposals.mjs` required no change.

## 3. Verification (all run this turn)

- `bun run audit:load` → exit **0** (pre-existing warnings only: 1136 files, 58 oversized, 8 broad selects, 1 component fetch, 4 heavy limits).
- `bun run typecheck` → exit **0** (clean; the earlier unrelated Bolu TS2459 error is no longer present at current HEAD).
- Focused suite `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/changelog*.test.js src/tests/critical/releaseGate.test.js` → **68 tests, 68 pass, 0 fail**, exit 0.
- Workflow YAML parses via Python `yaml` → 34 steps, `concurrency.group = android-release`, `cancel-in-progress = false`. Every `releaseGate.mjs` command referenced by the workflow is defined in the CLI.
- CLI smoke test with temp fixtures: `record` → schema-v2 record; `merge-ledger` → 1 record; `validate-ledger` → OK; `evaluate-policy` on seeded NULL row → `advance`; `reconcile` → `resume`; `hash-notes` and `reissue` → expected outputs.
- `bun run build` and `bun run lint` were **not** run (4 GB host constraint).

## 4. GitHub Release asset limitation (OBSERVATION)

GitHub does not support in-place replacement of a release asset while keeping its name. Re-uploading `consumed-ids.json` with `--clobber` deletes then re-adds it, briefly leaving the release without its ledger. The workflow therefore **uploads the ledger asset once on first publication** and, on a verified retry, **retains the existing asset** (already verified to match this build's SHA/version/tag) rather than overwriting it. This preserves a continuously retrievable authoritative ledger. If a future release legitimately needs to extend the ledger, it appends a new record to its own release's asset; historical records are never removed.

## 5. Scope, preservation and Phase 3

- No stage, commit, push, tag, release creation, live Supabase write, or deploy was performed.
- Pre-existing working-tree changes (Bolu files, update-dialog files, deleted/existing PRDs, `.perch/PERCH.md`) were preserved untouched. HEAD moved from `047e000c` to `ad97c741` due to concurrent work before edits began; that work was not attributed or modified.
- Phase 3 (`docs/prompts/git-workflow-commit.md`, `.github/workflows/changelog-verify.yml`, PRD status approval) remains **not started and not authorized**.
- The PRD status line still reads "unresolved decision pending user approval" — intentionally left unchanged (out of scope).
