# BOUXRE Release Retention & Changelog End-to-End Integration Report

Date: 2026-11-19
Author: BOUXRE Core Agent Team
Repository: `bigdrops-app` · Branch: `main` · HEAD: `ad97c741921a4f2e975f3fe81832663ad779ebf0`
Status: **Completed**

---

## Executive Summary

This report documents the authorized implementation of the **Two-APK Supabase Storage Retention Contract**, the hardening of the CI/CD release workflow (`build-android-test-release.yml`), and the comprehensive **Changelog Pipeline End-to-End Integration Audit** connecting `CHANGELOG.md`, GitHub Releases, Supabase `app_release_policy`, and both the Web and Android user interfaces.

All changes adhere to repository governance in root `AGENTS.md`:
1. **Host Safety:** Zero execution of prohibited `bun run build` or `bun run lint` on the memory-constrained host.
2. **Zero Inventions / Single Source of Truth:** No secondary release-notes systems created; all consumers resolve release notes from `app_release_policy.release_notes` originating from git-pinned `CHANGELOG.md` snapshots.
3. **Fail-Closed Verification:** Storage object pruning occurs strictly after unauthenticated download probe, SHA-256 byte digest verification, conditional policy PATCH with complete field read-back, and GitHub Release asset verification.
4. **Preservation of Worktree:** All pre-existing uncommitted and staged modifications across the repository remain intact.

---

## 1. Two-APK Supabase Storage Retention Architecture

### 1.1 Before vs. After State

| Dimension | Before (Phase 2.2 / Initial Phase 3) | After (Two-APK Retention Contract) |
| :--- | :--- | :--- |
| **Storage Object Count** | Indefinite or mutable single-latest (`bouxre-latest.apk`) | **Strictly maximum 2 APK objects** in `app-releases` prefix |
| **Retained Artifacts** | Unmanaged or single overwriting object | **Latest active release APK** + **immediately preceding release APK** |
| **Object Naming** | Overwriting mutable name (`bouxre-latest.apk`) | **Immutable versioned names**: `BOUXRE-release-<version>-run<N>-<sha>.apk` |
| **CDN / Caching** | Ambiguous caching on mutable URLs (`max-age` / stale-while-revalidate risks) | **Fully cache-bustable & immutable**: byte digest + unique versioned URL |
| **Previous APK Expiry** | None / manual cleanup | **Automated 14-day expiry** based on authoritative release timestamps |
| **Historical Archive** | Mixed across storage & GitHub | **GitHub Releases is the sole permanent historical archive** |

### 1.2 Retention Rules & Invariants

Supabase Storage retains no more than two APK objects in the `app-releases` bucket prefix at any time:
1. **First Release:** Retains exactly 1 APK.
2. **Second Release:** Retains 2 APKs (latest and preceding).
3. **Third Release:** Deletes the oldest (v1) immediately after the third release is fully verified, retaining v3 and v2.
4. **Subsequent Releases:** Retains the newest 2 and deletes older objects.
5. **14-Day Expiry:** The immediately preceding APK expires after 14 days (`PREVIOUS_APK_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000`), even if no 3rd release has displaced it. A release occurring earlier than 14 days displaces it immediately (14 days is a maximum window, not a guaranteed minimum).
6. **Authoritative Timestamps:** Expiration is calculated using `publishedAt` ISO timestamps in the durable `consumed-ids.json` ledger, never filesystem or bucket object-list timestamps.
7. **Protected Objects:** The latest release APK never expires. Non-APK objects (e.g. `consumed-ids.json`, logs) are never targeted for deletion.

### 1.3 Execution Sequence & Proof of Deletion Ordering

To guarantee that a broken build or failed deployment never leaves storage empty or deletes the previous known-good release, deletions are placed at Step 23h, strictly after all preceding verifications:

```
[Step 15: Gradle Build & Assemble Release APK]
                       ↓
[Step 17: Sign APK with Release Keystore]
                       ↓
[Step 21: Compute Exact Signed APK SHA-256 Digest ($APK_SHA256)]
                       ↓
[Step 23: Upload Immutable Versioned APK to Supabase Storage]
                       ↓
[Step 23c: Unauthenticated Public GET Probe + SHA-256 Verification]
  * HTTP status 200 required
  * Content-Type application/vnd.android.package-archive
  * Exact SHA-256 digest match against $APK_SHA256
                       ↓
[Step 23d: Conditional Policy PATCH (id=1, version_code < proposed)]
  * Read-back verification of version_code
  * Read-back verification of web_release_url
  * Read-back verification of apk_asset_prefix ("BOUXRE-release-")
                       ↓
[Step 23e: Durable Record Creation & Ledger Merge]
                       ↓
[Step 23e2: Publish consumed-ids.json Release Asset to GitHub Release]
                       ↓
[Step 23f: Gated Archive of Verified IDs in CHANGELOG.md]
                       ↓
[Step 23h: Storage Retention Planning, Execution & Invariant Verification]
  1. POST /storage/v1/object/list/app-releases (pre-cleanup list)
  2. planStorageRetention(...) with verified=true
  3. DELETE /storage/v1/object/app-releases with stale prefixes (if any)
  4. POST /storage/v1/object/list/app-releases (post-cleanup list)
  5. verifyStorageRetentionInvariant(...) verifying <= 2 APKs and latest present
```

### 1.4 Failure Handling & Fail-Closed Guardrails

- **Upload Failure:** Step 23 fails; workflow halts before policy or storage modification.
- **Verification Probe Failure:** Step 23c fails; no policy update and zero deletions.
- **Policy Update Failure / Race:** Step 23d fails closed; zero deletions.
- **GitHub Release Verification Failure:** Step 23c/23e fails; zero deletions.
- **Unverified Input to Planner:** `planStorageRetention` checks `verified === true`. If false, it immediately returns `{ ok: false, deleteNames: [] }`.
- **Deletion API Failure:** If the Supabase Storage DELETE call returns non-2xx, the step exits with code 1, loudly flagging the failure.
- **Post-Retention Invariant Check:** `verifyStorageRetentionInvariant` inspects the live post-cleanup bucket. If more than 2 APKs remain, an unexpected APK remains, or the latest APK is missing, the step exits with code 1.

### 1.5 Caching & CDN Analysis

Using mutable canonical URLs (such as `bouxre-latest.apk`) introduced significant caching risks:
- Edge CDNs (e.g., Cloudflare, CloudFront, Supabase Storage CDN) cache public objects. When a user downloads `bouxre-latest.apk`, cached copies could serve outdated versions for hours or days unless purged via API keys.
- Client browsers and download managers reuse local cached files when URLs remain identical.
- Mutable filenames made it impossible to retain both the latest and preceding release under clean names without complex renaming.

**Resolution:**
Every build generates an immutable, versioned filename: `BOUXRE-release-<version>-run<N>-<sha>.apk`. The policy's `web_release_url` points directly to this unique URL. This provides:
1. Instant cache invalidation on release without requiring CDN purge tokens.
2. Perfect concurrency safety: the previous release APK and current release APK reside side-by-side in Supabase Storage with independent URLs.
3. Clean client identification: the APK filename matches the GitHub Release asset name byte-for-byte.

---

## 2. Changelog Pipeline End-to-End Integration Trace & Audit

### 2.1 Trace from `CHANGELOG.md` to User Interfaces

```
+-------------------------------------------------------------------------+
|                              CHANGELOG.md                               |
|  ## Unreleased                                                          |
|  <!-- id: rel_a1b2c3d4 -->                                              |
|  - Add POS receipt printer pairing and thermal template support         |
+-------------------------------------------------------------------------+
                                     │
                                     │ CI checkout at $BUILD_SHA
                                     ▼
+-------------------------------------------------------------------------+
|                  scripts/release/releaseGate.mjs                        |
|  - buildReleaseNotesForSha({ buildSha, consumedIds })                   |
|  - stripIdComments() removes all <!-- id: ... --> whole-line comments   |
|  - Outputs clean bullet text + computes notesHash                       |
+-------------------------------------------------------------------------+
                                     │
                                     │ Step 23d conditional PATCH
                                     ▼
+-------------------------------------------------------------------------+
|                   Supabase: app_release_policy (id = 1)                 |
|  - version_code: 1024                                                   |
|  - version_name: "1.0.24"                                               |
|  - release_notes: "- Add POS receipt printer pairing..."                |
|  - web_release_url: "https://.../storage/.../BOUXRE-release-1.0.24.apk" |
|  - apk_asset_prefix: "BOUXRE-release-"                                  |
+-------------------------------------------------------------------------+
                   │                                     │
                   │ Web Fetch                           │ Android Fetch
                   ▼                                     ▼
+------------------------------------+ +------------------------------------+
|                Web                 | |              Android               |
| src/pages/WhatsNew.tsx             | | src/components/app/UpdateModal.tsx |
|   via useReleaseNotifications()    | | src/components/app/update/         |
|                                    | |   UpdateDialogCard.tsx             |
|                                    | |   via useAppUpdate()               |
+------------------------------------+ +------------------------------------+
                   │                                     │
                   └──────────────────┬──────────────────┘
                                      │
                                      ▼
+-------------------------------------------------------------------------+
|                 src/domain/appUpdate/changelog.ts                       |
|  parseReleaseNotes(policy.release_notes)                                |
|  - Parses standard markdown bullets (- / *)                             |
|  - Groups into categories (Features, Improvements, Fixes) or flat list  |
|  - Strips leading markers and normalizes whitespace                     |
+-------------------------------------------------------------------------+
                                      │
                                      ▼
+-------------------------------------------------------------------------+
|             src/components/app/update/ChangelogTimeline.tsx             |
|  - variant="editorial" (Web): spacious layout, card container, full     |
|    typography hierarchy for browser screens                             |
|  - variant="compact" (Android): compact spacing, constrained modal      |
|    viewport, optimized for mobile touch and immediate update CTA        |
+-------------------------------------------------------------------------+
```

### 2.2 Shared Release-Notes Contract

1. **Source of Truth:** `app_release_policy.release_notes` is the single source of truth for both platforms. Neither platform reads raw GitHub API or git repository files at runtime.
2. **Comment Hygiene:** CI's `stripIdComments` ensures `<!-- id: rel_xxx -->` comments never leak into `app_release_policy.release_notes`. Even on empty bullet lines or freeform summaries, the parser is protected from exposing metadata IDs.
3. **Markdown Syntax:** Standard markdown unordered lists (`- `, `* `) are parsed into discrete entries. Leading categories (e.g. `**POS:** Support thermal printing`) are recognized and formatted into badges or styled bullet headers.

### 2.3 Presentation Distinctions (Web vs. Android)

- **Web (`WhatsNew.tsx`):**
  - **Context:** Dedicated route (`/whats-new`), accessible anytime from navigation or release notification toasts.
  - **Presentation:** Rendered using `ChangelogTimeline` with `variant="editorial"`. Uses expansive typography, full card borders, timestamp headers, and category tags. Designed for desk/tablet viewports where users browse historical updates.
- **Android (`UpdateDialogCard.tsx` / `UpdateModal.tsx`):**
  - **Context:** Modal dialog triggered by `useAppUpdate` on app launch when `installedVersionCode < policy.version_code`.
  - **Presentation:** Rendered using `ChangelogTimeline` with `variant="compact"`. Highly optimized for 360dp–420dp mobile viewports with tight line-height, scrollable changelog viewports, and primary actions ("Download & Install Update", "Remind Me Later" / "Mandatory Update").

---

## 3. Withdrawal & Recovery Architecture (Design/Audit)

### 3.1 Availability Withdrawal vs. Installed Client Remediation

A critical operational distinction must be maintained between:
1. **Withdrawing an update from future availability:** Preventing un-updated clients or new users from downloading a flawed release.
2. **Remediating an update already installed on user devices:** Fixing devices that already upgraded to the flawed release.

### 3.2 Android OS Downgrade Constraints (`INSTALL_FAILED_VERSION_DOWNGRADE`)

The Android OS `PackageManager` strictly enforces monotonic `versionCode` upgrades. If an APK with `versionCode: 1007` is installed on an Android device:
- Attempting to install an APK with `versionCode: 1006` or lower via the standard package installer results in:
  ```
  INSTALL_FAILED_VERSION_DOWNGRADE
  ```
- Android blocks this installation unless the user manually uninstalls the app first (which deletes all local SQLite databases, stored auth tokens, and unsynced drafts, causing catastrophic data loss for SMEs).
- **Consequence:** Server-side rollback of `app_release_policy.version_code` to `1006` will **not** downgrade installed Android clients. Installed clients will simply see no newer update available or may enter an inconsistent state where their installed code is ahead of server policy.

### 3.3 Forward-Fix Remediation Architecture

To remediate a bad release already in the field:
1. **Immediate Withdrawal (Server Gate):** Set `app_release_policy.mandatory = false` or withdraw the download URL in policy to prevent additional users from acquiring the build.
2. **Forward-Fix Build:** Checkout the last known-good git commit (e.g., v1.0.6), but increment the build metadata to a **strictly higher `versionCode`** (e.g., `versionCode: 1008`, `versionName: "1.0.8"`).
3. **Re-Release:** Publish this forward-fix build. All devices (both those on v1.0.6 and those affected on v1.0.7) will cleanly upgrade to `versionCode: 1008` without `INSTALL_FAILED_VERSION_DOWNGRADE` or data loss.

### 3.4 Storage Protection During Incident Recovery

When an incident is active, the preceding known-good release must not be purged even if it exceeds 14 days. The planner helper supports `unresolvedRecovery: true`, which guarantees:
- `planStorageRetention({ ..., unresolvedRecovery: true })` retains both the latest release and the preceding known-good release indefinitely until the incident is resolved.

### 3.5 Audit Trail & Reissue Preservation

- Flawed releases are **never wiped from the durable `consumed-ids.json` ledger**. The ledger is an append-only historical audit log.
- If features from a withdrawn release need to be resurrected in a subsequent release, the operator runs:
  ```bash
  node scripts/release/changelog.mjs restore-version --version 1.0.7
  ```
- This restores the entries into `## Unreleased` under new deterministic IDs linked via `<!-- id: rel_new; reissueOf: rel_orig -->`. Historical records remain unmodified and verifiable.

---

## 4. Test Suite & Verification Matrix

### 4.1 Verification Commands and Results

| Check | Command | Result | Details |
| :--- | :--- | :--- | :--- |
| **Storage & Gate Tests** | `node ... --test src/tests/critical/releaseGate.test.js` | **Passed (32/32)** | Covers 1st, 2nd, 3rd, 4th APK retention, 14-day expiry, fail-closed safety, and invariant checks |
| **Changelog Tests** | `node ... --test src/tests/critical/changelog*.test.js` | **Passed (68/68)** | Covers foundation, v2 schema, snapshotting, worker integration, and restore |
| **Combined Critical Tests** | Both test suites combined | **Passed (100/100)** | Zero failures across 100 tests |
| **Changelog Verification** | `node scripts/release/changelog.mjs verify` | **Passed** | Clean format, tagged bullets, valid structure |
| **Workflow YAML Syntax** | Python `yaml.safe_load` on `.github/workflows/*.yml` | **Passed** | Both release and verification workflows valid |
| **Load Audit Gate** | `bun run audit:load` | **Passed (Code 0)** | Zero critical regressions |
| **TypeScript Typecheck** | `bun run typecheck` (`tsc --noEmit`) | **Passed (Code 0)** | Strict typecheck clean |
| **Host Memory Protection** | `bun run build` / `bun run lint` | **Omitted** | Zero calls to prohibited memory-intensive commands |

### 4.2 Git Worktree Scope Verification

`git status --porcelain=v1` confirmed:
- Authorized modifications: `.github/workflows/build-android-test-release.yml`, `scripts/release/releaseGate.mjs`, `src/tests/critical/releaseGate.test.js`.
- Preserved pre-existing work: Bolu document integration, UpdateModal/UpdateDialogCard improvements, Perch status, and existing untracked reports.

---

## 5. Final Status & Recommendations

- **Implementation Status:** Complete and verified.
- **Workflow State:** The release workflow enforces two-APK retention, immutable versioned URLs, and end-to-end fail-closed safety.
- **Operator Recommendation:** All components are ready for normal release operation. Note that operator approval on the PRD document status line remains reserved for the project lead as required by root governance.
