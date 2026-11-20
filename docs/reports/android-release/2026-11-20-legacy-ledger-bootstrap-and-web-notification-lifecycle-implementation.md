# Implementation Report: Legacy Ledger Bootstrap, Placeholder Suppression and Web Release Notification Lifecycle

**Date:** 2026-11-20  
**Repository:** `bigdrops-app` · **Branch:** `main` · **HEAD:** `2e556315d0fa83c8466b048cb15195155f41aa69`  
**Task Type:** Authorized Implementation + Regression Verification  
**Status:** Completed & Verified  

---

## 1. Executive Summary

This report documents the authorized resolution of three verified defects in the BOUXRE release and changelog integration architecture without altering canonical domain contracts or database schemas:

1. **Defect 1 (Release Run 30 Failure — Consumed-ID Ledger Fetch):**  
   GitHub Actions workflow `Build Android Release` failed at Step 3b (`Fetch consumed-ID ledger`) because the latest historical release (`test-release-run29`) predated the Phase 2 consumed-ID ledger system and carried no `consumed-ids.json` asset.  
   *Fix:* Added deterministic 3-outcome ledger discovery in `.github/workflows/build-android-test-release.yml` with `isLegacyPreLedgerRelease` evaluation in `scripts/release/releaseGate.mjs`. Historical pre-ledger releases now initialize a verified legacy migration baseline (`schema: 2, releases: []`) with output `legacy_ledger_bootstrap=true`, while post-bootstrap releases lacking a ledger continue to fail closed.

2. **Defect 2 (Placeholder Suppression in What's New):**  
   The Web "What's New" page previously rendered the generic run-29 release placeholder (`"BOURXE v1.0.29 (build 1029) maintenance and performance update."`) as a legitimate feature bullet (`entry 01`).  
   *Fix:* Added `isLegacyPlaceholder` and `LEGACY_PLACEHOLDER_PATTERN` in `src/domain/appUpdate/changelog.ts` and `scripts/release/releaseGate.mjs`. `parseReleaseNotes` recognizes exact historical generic maintenance/performance boilerplate (covering both `BOURXE` and `BOUXRE` spellings) and returns `{ entries: [] }`, driving the honest empty state (`"This release has no published notes."`) without suppressing legitimate maintenance entries or breaking Android update dialogs.

3. **Defect 3 (Web Release Notification Lifecycle):**  
   Web clients repeatedly displayed intrusive release banners on application launch for stale releases.  
   *Fix:* Implemented a coherent Web notification eligibility and persistence model in `src/hooks/useReleaseNotifications.ts` and `src/lib/appUpdate/releaseAcknowledgementLocalStorage.ts`:
   - Never opens banner when parsed entries are empty (`entries.length === 0`).
   - First visit with a release older than 7 days establishes a quiet baseline rather than notifying.
   - Evaluates publication timestamp preferring `effective_at` with fallback to `updated_at`.
   - Genuinely newer versions with non-empty entries within the 7-day window announce.
   - Dismissals and acknowledgments persist across reloads and authentication transitions (logging in or out never resurrects an acknowledged or dismissed release on that device).
   - Window focus and visibility changes do not re-trigger notifications or churn state references.
   - Android's `observeInstalledVersion` and `upgrade-pending` flow remains 100% intact.

---

## 2. Attributable File Manifest & Exact Changes

| File | Change Scope & Purpose |
| :--- | :--- |
| [`.github/workflows/build-android-test-release.yml`](file:///c:/Users/DELL/Desktop/bigdrops-app/.github/workflows/build-android-test-release.yml#L118-L255) | Step 3b updated to distinguish 3 outcomes: first release, ledger download/validation, and legacy bootstrap; Step 3d updated to accept `LEGACY_BOOTSTRAP`. |
| [`scripts/release/releaseGate.mjs`](file:///c:/Users/DELL/Desktop/bigdrops-app/scripts/release/releaseGate.mjs#L40-L1035) | Exported `isLegacyPreLedgerRelease`, `isLegacyPlaceholder`, `validateReleaseNotes`, and CLI commands `check-legacy-release` and `validate-notes`. |
| [`scripts/release/changelog.mjs`](file:///c:/Users/DELL/Desktop/bigdrops-app/scripts/release/changelog.mjs#L40-L60) | Exported `LEGACY_PLACEHOLDER_PATTERN` and `isLegacyPlaceholder`. |
| [`src/domain/appUpdate/changelog.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/domain/appUpdate/changelog.ts#L20-L80) | Exported `isLegacyPlaceholder` and `LEGACY_PLACEHOLDER_PATTERN`; `parseReleaseNotes` filters out boilerplate to return `{ entries: [] }`. |
| [`src/domain/appUpdate/updateStateMachine.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/domain/appUpdate/updateStateMachine.ts#L50-L195) | Added `updatedAtMs` and fallback from `effective_at` to `updated_at` in `validateReleasePolicy`. |
| [`src/lib/appUpdate/releaseAcknowledgementLocalStorage.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/lib/appUpdate/releaseAcknowledgementLocalStorage.ts#L45-L380) | Added `observeWebRelease`, `MAX_WEB_NOTIFICATION_AGE_MS` (7 days), `WebVersionTransition`, and cross-session dismissal persistence. |
| [`src/hooks/useReleaseNotifications.ts`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/hooks/useReleaseNotifications.ts#L10-L365) | Integrated `observeWebRelease`, stabilized `setWebPolicy` on focus, dual-checked local and remote acknowledgments, and synchronized local acknowledgment on user acknowledgment. |
| [`src/tests/critical/releaseGate.test.js`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/tests/critical/releaseGate.test.js#L685-L740) | Added tests for `isLegacyPreLedgerRelease`, `isLegacyPlaceholder`, and `validateReleaseNotes`. |
| [`src/tests/critical/changelogFoundation.test.js`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/tests/critical/changelogFoundation.test.js#L235-L270) | Added tests verifying placeholder suppression and legitimate bullet preservation in `parseReleaseNotes`. |
| [`src/tests/critical/releaseNotificationStorage.test.js`](file:///c:/Users/DELL/Desktop/bigdrops-app/src/tests/critical/releaseNotificationStorage.test.js#L30-L140) | Added tests for `observeWebRelease` 7-day age cutoff, quiet baseline, fresh announcement, new version detection, dismissal persistence across auth states, and Android preservation. |

---

## 3. Detailed Architecture Decisions & Findings

### 3.1 Repair 1: Legacy Ledger Bootstrap
- **DECISION:** A repository with historical releases lacking `consumed-ids.json` must be deterministically handled at Step 3b.
- **OBSERVATION:** When `LATEST_TAG` exists, `gh release view "$LATEST_TAG" --json tagName,createdAt,publishedAt,assets` queries release metadata. If the asset `consumed-ids.json` is present, it downloads and verifies the ledger.
- **DECISION:** If `consumed-ids.json` is absent, `isLegacyPreLedgerRelease` tests whether the release is demonstrably a pre-ledger release (historical runs 1–29, historical tag formats, or published before the November 19, 2026 ledger epoch).
  - If legacy: initializes empty baseline `{"schema":2,"releases":[]}`, sets `first_release=false`, and sets `legacy_ledger_bootstrap=true`.
  - If NOT legacy (e.g. run 31 lacking a ledger): fails closed with exit code 1.
- **DECISION:** Step 3d passes `--allow-missing-ledger true` if either `$FIRST_RELEASE == "true"` or `$LEGACY_BOOTSTRAP == "true"`.

### 3.2 Repair 2: Legacy Placeholder Suppression
- **OBSERVATION:** The live row in Supabase table `public.app_release_policy` (`id = 1`) contains `"BOURXE v1.0.29 (build 1029) maintenance and performance update."` written by workflow run 29.
- **DECISION:** `isLegacyPlaceholder` matches:
  ```regex
  ^\s*(?:(?:BOUXRE|BOURXE)\s+v?\d+(?:\.\d+)*\s*(?:\(build\s+\d+\))?[:\s—–-]*)?(?:maintenance\s+and\s+performance\s+update|performance\s+and\s+maintenance\s+update)\.?\s*$
  ```
- **DECISION:** When `parseReleaseNotes` detects a placeholder, it returns `{ entries: [] }`. When `entries.length === 0`:
  - `useReleaseNotifications` sets `discovery: 'no-notes'`, `bannerOpen: false`, and `currentBanner: null`.
  - Web `WhatsNew.tsx` renders the honest empty state: `"This release has no published notes."`
  - Android `UpdateDialogCard.tsx` renders `"No release notes published for this build."`
  - Legitimate bullets (e.g. `- Performance: optimize invoice rendering speed`) remain completely unsuppressed.

### 3.3 Repair 3: Web Release Notification Lifecycle
- **DECISION:** Web does not have an installed APK binary, so `observeWebRelease` maintains a durable browser baseline in localStorage key `bigdrops.app_release_acknowledgements.web_transition`.
- **DECISION:** 7-Day Window (`MAX_WEB_NOTIFICATION_AGE_MS = 7 * 24 * 60 * 60 * 1000`):
  - On first encounter with a release older than 7 days, a quiet baseline is recorded (`quietBaseline: true, eligible: false`).
  - On first encounter with a fresh release (<= 7 days old) with non-empty entries, the release is eligible to notify (`eligible: true`).
  - When policy version increases (`versionCode > lastSeenVersionCode`), if fresh (<= 7 days), it announces.
- **DECISION:** Dismissal and Acknowledgment Persistence:
  - `dismissReleaseNotification` stores both account-scoped and device-scoped keys.
  - `isReleaseNotificationDismissed` checks both keys, so dismissing anonymously persists if the user logs in, and dismissing while logged in persists if the user logs out.
  - `acknowledgeCurrent` writes to Supabase when authenticated AND persists locally on that browser so logging out never resurrects the acknowledged release.
- **DECISION:** Window Focus / Visibility Stability:
  - In `useReleaseNotifications`, `setWebPolicy((prev) => ...)` returns the previous object reference when all policy fields are identical, preventing React from re-running the evaluation effect on tab focus.

---

## 4. Verification Evidence

### 4.1 Test Suite Execution
All 141 critical tests passed across the 9 test suites:
- `releaseGate.test.js`: 34 passed (including `isLegacyPreLedgerRelease` and `isLegacyPlaceholder` tests)
- `changelogFoundation.test.js`: 21 passed (including `parseReleaseNotes` placeholder suppression test)
- `releaseNotificationStorage.test.js`: 7 passed (including `observeWebRelease` 7-day age cutoff, quiet baseline, and auth transitions)
- `changelogPhase22.test.js`: 17 passed
- `changelogPhase221.test.js`: 15 passed
- `changelogWorkerIntegration.test.js`: 12 passed
- `productionUpdateDialog.test.js`: 9 passed
- `releaseDiscoveryState.test.js`: 7 passed
- `androidUpdatePreview.test.js`: 19 passed

**Result:** `141 passed, 0 failed, 0 skipped` (Duration: 882 ms).

### 4.2 Changelog Verification
Command: `node scripts/release/changelog.mjs verify`  
**Result:** `changelog OK` (Exit code 0).

### 4.3 Static Load Audit & Typecheck Sequence
1. Command: `bun run audit:load`  
   **Result:** Scanned 1,136 files cleanly without regressions.
2. Command: `bun run typecheck` (`tsc --noEmit`)  
   **Result:** Exited with code 0. Zero TypeScript compile errors.

---

## 5. Scope Protection & Repository Invariants

- **Zero Git Mutations:** No `git add`, `git commit`, `git push`, `git tag`, `git reset`, or `git clean` commands were run.
- **Zero Prohibited Commands:** Neither `bun run build` nor `bun run lint` was executed on the 4 GB RAM host.
- **Zero Live Service Mutations:** Neither live Supabase database tables nor GitHub Release assets were mutated.
- **Preserved Worktree State:** Pre-existing untracked audit reports remain completely intact.
- **Attributable Work:** Only authorized code and test modifications and this report were produced.
