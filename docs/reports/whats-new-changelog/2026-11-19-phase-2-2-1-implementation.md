# Phase 2.2.1 Implementation Report — Idempotent Restore Reissue, APK SHA-256 Digest Chain & Bouxre Release Naming

Date: 2026-11-19
Task type: Narrowly Scoped Implementation (Phase 2.2.1 — Targeted Corrections Only; Phase 3 NOT started)
Repository: `bigdrops-app` · Branch: `main` · HEAD: `ad97c741921a4f2e975f3fe81832663ad779ebf0`

## Completion status

**Completed.** All three targeted corrections are implemented, tested and verified. Phase 3 was not started.

Evidence labels: **DECISION** (user-authorized in this request), **OBSERVATION** (verified this turn), **REFERENCE** (prior report), **PROPOSAL** (not approved).

## 1. Why this phase exists

A strict read-only closure audit of Phase 2.2 found two defects that blocked Phase 3:

1. **Restoration did not reissue.** `restoreVersion` moved archived entries back to `Unreleased` with their original consumed IDs. A durable ledger still listed those IDs, so a restored entry could never appear in future release notes and could be archived again.
2. **APK build identity was not verified.** Asset checks only confirmed HTTP 200, non-HTML content-type and a non-empty body. `apkSha256` existed as a record field but was never computed, populated or compared.

This phase closes both defects and applies the requested display-name and asset-name change.

## 2. Corrections implemented

### 2.1 Idempotent restoration and reissue identity — DECISION

`scripts/release/changelog.mjs`:

- `ID_COMMENT_PATTERN` (`:30`) accepts an optional `reissueOf` link: `<!-- id: rel_xxxxxxxx; reissueOf: rel_yyyyyyyy -->`.
- `parseChangelog` (`:132-199`) carries `reissueOf` onto parsed entries; `renderIdComment`/`renderEntry` (`:221-228`) serialize it; orphaned entries preserve it (`:242`).
- `verifyChangelog` (`:306-310`) rejects malformed and self-referential `reissueOf` links.
- `restoreVersion` (`:462-486`) is now **non-destructive and idempotent**:
  - the archive section and original consumed ID remain in `CHANGELOG.md` and in the durable ledger;
  - the restored bullet gets a **new** deterministic ID from `createReissueId(originalId, version)` with `reissueOf` pointing at the original;
  - repeating `restore --version <v>` finds the existing deterministic ID and produces a byte-identical file, never a duplicate;
  - only the original ID's tombstone is cleared; no historical consumption record is rewritten.
- `computeNotes` (`:499`) and `buildReleaseNotesForSha` take text from HEAD and emit only bullets, so link comments never leak into release notes.

`scripts/release/releaseGate.mjs`: `createReissue()` and the `reissue` CLI command remain available for explicit operator reissue; `selectArchivableIds()` keys on `consumedEntryIds`, so the original consumption record cannot re-archive the new reissue ID.

### 2.2 End-to-end APK SHA-256 verification chain — DECISION

`scripts/release/releaseGate.mjs`:

- `normalizeSha256()` (`:278`) validates 64-hex digests; `verifyAssetDownload()` (`:291-310`) now takes `expectedSha256` and `actualSha256` and **fails closed** on missing, malformed or mismatched digests, in addition to the existing HTTP/content-type/non-empty checks.
- `verify-asset` CLI (`:529-534`) exposes `--expected-sha256` and `--actual-sha256`.
- `createConsumedRecord()` (`:144-145`) rejects a malformed `apkSha256`; valid digests are persisted in prepared and confirmed records and therefore in `consumed-ids.json`.
- `verifyExistingRelease()` (`:395-403`) compares the expected digest against both `apkSha256` (GitHub Release APK) and `hostedApkSha256` (Supabase-hosted APK) on retry; a missing or mismatched digest on either probe fails closed.

`.github/workflows/build-android-test-release.yml`:

- `APK_SHA256` is computed with `sha256sum` from the **actual signed APK bytes** after `Locate and rename APK` (`:398-408`) and validated as 64-hex. It is never derived from the filename or Git SHA.
- The digest is passed into the existing-release retry check, where the published GitHub APK is downloaded and hashed (`:518`), into the prepared record (`:600`), into both download probes (`:664-668`, `:689-693`), and into the confirmed record (`:781`).
- The Supabase-hosted APK is fetched unauthenticated with redirects and hashed from the downloaded body; the GitHub Release APK is hashed from its downloaded bytes on a tag-run retry. Both must match `APK_SHA256`.
- All prepared-versus-confirmed safeguards are preserved: `assetVerified`/`policyVerified` gating, fail-closed on a missing durable ledger asset, reconciliation through policy state, strict retry verification, and the conditional `id=eq.1&or=(version_code.is.null,version_code.lt.N)` PATCH.

### 2.3 Workflow display name and Bouxre APK naming — DECISION

- Top-level `name:` changed from `Build Android Test-Release APK` to **`Build Android Release APK`** (`:1`). The workflow file path is unchanged.
- APK asset name is now `Bouxre-release-<version>-run<N>-<short-sha>.apk` (`:395`).
- Legacy identifiers are intentionally preserved: `test-release-run<N>` tags, `BIGDROPS` package identifiers, and the `1000 + run_number` / `1.0.<run_number>` version derivation. No run-number history or policy compatibility is broken.
- Scans of the workflow, `scripts/release/` and `CHANGELOG.md` found **no `Bourxe` typo**.

## 3. apk_asset_prefix constraint — OBSERVATION

`supabase/migrations/20260914120000_app_release_policy.sql:32` defaults `apk_asset_prefix` to `BIGDROPS-test-release-`, and `src/lib/appUpdate/releaseDiscovery.ts:138-163` filters GitHub Release assets by that policy-provided prefix.

- **Primary discovery path is unaffected.** `buildDirectPolicyRelease()` (`:97-121`) builds the approved asset from the direct Supabase Storage URL in `web_release_url`; no prefix match is performed. The workflow continues to publish that direct URL, so in-app updates work with the renamed GitHub asset.
- **GitHub fallback path is affected.** If the direct URL is unavailable, `fetchApprovedRelease()` (`:207-243`) only accepts assets whose name starts with the policy prefix. The renamed `Bouxre-release-...` asset would not match until `app_release_policy.apk_asset_prefix` is updated.
- The migration and `releaseDiscovery.ts` are protected paths and were **not modified**. This is flagged for a separately authorized decision; no prefix change was silently made.

## 4. Files changed (all task-attributable)

Modified:
- `scripts/release/changelog.mjs` — reissue-aware ID comments, parse/serialize/verify, non-destructive idempotent `restoreVersion`.
- `scripts/release/releaseGate.mjs` — digest validation in `verifyAssetDownload`, `verify-asset`, `createConsumedRecord`, `verifyExistingRelease`.
- `.github/workflows/build-android-test-release.yml` — display name, Bouxre APK name, `APK_SHA256` computation and propagation to both probes, records and retry verification.
- `src/tests/critical/changelogFoundation.test.js` — restored-entry assertion updated to the reissue contract.
- `src/tests/critical/changelogPhase22.test.js` — asset-verification assertions updated for digest gating.
- `src/tests/critical/releaseGate.test.js` — asset-verification assertions updated for digest gating.

New:
- `src/tests/critical/changelogPhase221.test.js` — 9 regression tests covering reissue idempotency, link metadata, clean notes, digest pass/fail cases, and retry digest mismatches.
- This report.

Not touched: `src/components/`, `src/hooks/`, `src/domain/appUpdate/`, `releaseDiscovery.ts`, `releasePolicyClient.ts`, `supabase/migrations/`, `docs/prompts/git-workflow-commit.md`, `.github/workflows/changelog-verify.yml`, or the PRD status line. `reportProposals.mjs` required no change.

## 5. Verification (all run this turn)

- Focused suite `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/changelog*.test.js src/tests/critical/releaseGate.test.js` → **77 tests, 77 pass, 0 fail**, exit 0 (up from 68 before this phase).
- `bun run audit:load` → exit **0** (pre-existing warnings only: 1136 files scanned, 58 oversized, 8 broad selects, 1 component fetch, 4 heavy limits).
- `bun run typecheck` → exit **0**.
- Workflow YAML parses via Python `yaml`: `name: Build Android Release APK`, `concurrency: {group: android-release, cancel-in-progress: false}`, 34 steps, one `oven-sh/setup-bun` step before ledger/notes steps.
- CLI smoke test with temp fixtures: `record` persisted `apkSha256` and `Bouxre-release-1.0.7.apk`; `verify-asset` exited 0 for a matching digest and exit 1 with `APK SHA-256 digest mismatch` for a wrong digest.
- `bun run build` and `bun run lint` were **not** run (4 GB host constraint).

## 6. Scope, preservation and Phase 3

- No stage, commit, push, tag, release creation, live Supabase call, deploy or external mutation was performed.
- All pre-existing working-tree changes were preserved: `.perch/PERCH.md`, Bolu report files, `UpdateModal.tsx`, `update-dialog-card.css`, `useAppUpdate.ts`, `productionUpdateDialog.test.js`, and the deleted/existing PRDs. The only status delta against baseline is the new test file and this report.
- HEAD did not move during this phase.
- Phase 3 (`docs/prompts/git-workflow-commit.md`, `.github/workflows/changelog-verify.yml`, PRD status approval) remains **not started and not authorized**.
- The PRD status line still reads "unresolved decision pending user approval" — intentionally unchanged.

## 7. Handover

See `docs/reports/whats-new-changelog/2026-11-19-phase-2-2-1-handover.md` for the next agent: current architecture, open constraints, verification commands and the Phase 3 boundary.
