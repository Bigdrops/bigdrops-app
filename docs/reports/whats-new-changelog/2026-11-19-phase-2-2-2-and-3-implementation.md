# Implementation Report: BOUXRE APK Naming, Single-Latest Supabase Storage Retention & Phase 3 Git Worker Integration

Date: 2026-11-19
Repository: `bigdrops-app`
Scope: Authorized Final Implementation (`Phase 2.2.2` + `Phase 3`)

---

## 1. Executive Summary

Phases 2.2.2 and 3 complete the BOUXRE release notes and changelog system:
1. **BOUXRE APK Naming & Policy Prefix Alignment:** Standardized the built APK filename to `BOUXRE-release-<version>-run<N>-<sha>.apk` in `.github/workflows/build-android-test-release.yml`. Synchronized `apk_asset_prefix: "BOUXRE-release-"` in the workflow's conditional policy `PATCH` and in `scripts/release/releaseGate.mjs` policy evaluation, aligning both Supabase primary discovery and GitHub Release fallback asset discovery without requiring any SQL schema migration. Verified zero `Bourxe` typos across `.github/workflows/`, `scripts/release/`, and `CHANGELOG.md`.
2. **Single-Latest Supabase Storage Retention:** Configured Supabase Storage (`app-releases` bucket) to store only 1 APK at any time (`BOUXRE-release-latest.apk`). Added a fail-closed pruning helper `filterStaleApkObjects` in `scripts/release/releaseGate.mjs` and workflow step `23c2`, which cleans up stale/legacy APK objects (such as `bigdrops-latest.apk`) only **after** the new APK upload and unauthenticated SHA-256 digest verification have succeeded. Historical release APKs remain permanently preserved on their respective GitHub Releases.
3. **Phase 3 Git Worker Integration:** Updated `docs/prompts/git-workflow-commit.md` (`git-workflow-master`) to use `scripts/release/` as the sole automated changelog mutator. Added the **Default One-Shot Push Rule** (`git push origin main` executed immediately by default without tedious confirmation prompts), automated proposal extraction, tombstone synchronization, idempotent append, online-only gated archival, and local verification gate (`node scripts/release/changelog.mjs verify`) before staging and pushing.
4. **Phase 3 Read-Only Verification Workflow:** Created `.github/workflows/changelog-verify.yml` with `permissions: contents: read`, zero secrets, and zero Git write operations, running `node scripts/release/changelog.mjs verify` on `pull_request` and `push` to `main`.
5. **PRD Implementation Status Update:** Updated `docs/prd/release-notes-changelog-prd.md` to document the implemented architecture and updated the phase progress table, while strictly preserving the pending operator sign-off lines in status line 3 and Section 10.

---

## 2. Changes Made by Component

### A. Workflow: `.github/workflows/build-android-test-release.yml`
- **Step 18:** APK rename standardized to `BOUXRE-release-${{ steps.meta.outputs.version_name }}-run${{ github.run_number }}-${{ steps.meta.outputs.short_sha }}.apk`.
- **Step 23:** `PUBLIC_APK_URL` points to `${CLEAN_SUPABASE_URL}/storage/v1/object/public/app-releases/BOUXRE-release-latest.apk?v=${VERSION_CODE}`. Passes `--apk-asset-prefix "BOUXRE-release-"` to `releaseGate.mjs record`.
- **Step 23b:** Uploads signed APK to `${CLEAN_SUPABASE_URL}/storage/v1/object/app-releases/BOUXRE-release-latest.apk`.
- **Step 23c:** Public unauthenticated GET probe verifies downloadability and SHA-256 digest of `BOUXRE-release-latest.apk`.
- **Step 23c2 (New Step):** Queries object list from Supabase Storage `app-releases` bucket. Runs `releaseGate.mjs filter-stale-apks --keep "BOUXRE-release-latest.apk" --verified true`. Deletes any stale APKs (e.g. legacy `bigdrops-latest.apk`) via Storage DELETE API.
- **Step 23d:** `PATCH_PAYLOAD` includes `"apk_asset_prefix": "BOUXRE-release-"`.
- **Step 23e:** Consumed record persisted with `--apk-asset-prefix "BOUXRE-release-"`.

### B. Release Gate: `scripts/release/releaseGate.mjs`
- `createConsumedRecord` accepts and validates `apkAssetPrefix`.
- `normalizeRecord` and `normalizePolicyRow` map `apkAssetPrefix` / `apk_asset_prefix`.
- `evaluatePolicyState` includes `apkAssetPrefix` comparison when falling back to policy metadata without a ledger record (mismatched prefix reports conflict).
- `verifyExistingRelease` verifies `apkAssetPrefix` consistency on retries.
- `filterStaleApkObjects({ objects, keepName, verified })`: pure helper that returns stale `.apk` object names to prune only when `verified: true`; returns `[]` if unverified or if keepName is missing.
- CLI subcommands: added `filter-stale-apks` and `--apk-asset-prefix` support in `record`.

### C. Git Worker Prompt: `docs/prompts/git-workflow-commit.md`
- Added **Default One-Shot Push Rule** to Philosophy and Section 5: executes `git push origin main` immediately after completing task commits without interactive confirmation prompts. Push is skipped only when the user explicitly instructs not to push yet.
- Integrated automated changelog mutator workflow (Section 2):
  1. Extract user-facing proposals via `scripts/release/reportProposals.mjs`.
  2. Sync tombstones via `node scripts/release/changelog.mjs sync`.
  3. Append proposals via `node scripts/release/changelog.mjs append --proposals <file>`.
  4. Gated archival run only when online (`gh auth status`) and all three states are confirmed; safely skipped without error when offline or unconfirmed.
  5. Local verification via `node scripts/release/changelog.mjs verify` before staging or pushing.
  6. Stage authorized task files plus `CHANGELOG.md` and `changelog/ignored.txt`.

### D. Verification Workflow: `.github/workflows/changelog-verify.yml`
- Triggers on `pull_request`, `push` to `main`, and `workflow_dispatch`.
- `permissions: contents: read`.
- Zero secrets and zero Git write operations.
- Runs `node scripts/release/changelog.mjs verify`.

### E. PRD: `docs/prd/release-notes-changelog-prd.md`
- Documented implemented architecture in Section 5.5.
- Updated Section 8 phase status table.
- Preserved line 3 and Section 10 decision status lines awaiting operator sign-off.

---

## 3. Verification & Test Evidence

1. **Focused Test Suite:**
   Ran `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/changelog*.test.js src/tests/critical/releaseGate.test.js`:
   - 89 tests executed, 89 passed, 0 failed across:
     * `changelogFoundation.test.js` (20 tests)
     * `changelogPhase22.test.js` (17 tests)
     * `changelogPhase221.test.js` (10 tests, including `BOUXRE-release-` naming and retry prefix verification)
     * `changelogSnapshotFeasibility.test.js` (8 tests)
     * `changelogWorkerIntegration.test.js` (13 tests, including complete 10-case failure and idempotency matrix)
     * `releaseGate.test.js` (21 tests, including `apkAssetPrefix` policy evaluation and `filterStaleApkObjects` cleanup retention)
2. **Changelog Integrity CLI Check:**
   `node scripts/release/changelog.mjs verify` -> `changelog OK` (exit code 0).
3. **YAML Schema Validation:**
   Validated both workflows with PyYAML:
   - `build-android-test-release.yml`: 35 steps, valid YAML.
   - `changelog-verify.yml`: 3 steps, `permissions: {'contents': 'read'}`, valid YAML.
4. **Performance Audit:**
   `bun run audit:load` passed (exit code 0).
5. **Typo Verification:**
   Zero occurrences of `Bourxe` in `.github/workflows/`, `scripts/release/`, or `CHANGELOG.md`.
