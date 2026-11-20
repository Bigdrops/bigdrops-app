# Final Android Release Pipeline Closure Report

**Date:** 2026-11-20  
**Repository:** `bigdrops-app`  
**Branch:** `main`  
**Base HEAD:** `706f1b6226e64bc42169083f0419d49ed587d8b7`  
**Status:** **Completed** (All in-scope local defects resolved and verified)

---

## 1. Executive Summary & Objective

This report provides a consolidated, authoritative account of the closure of all known release-gate defects in the BOUXRE Android release pipeline. 

Following the Run 30 workflow failure, multiple related issues were identified across the release pipeline:
1. **Missing Consumed-ID Ledger Bootstrap:** Historical releases (runs 1–29) lacked a `consumed-ids.json` release asset, causing modern runs to abort when querying previous release assets.
2. **Release-Note Placeholder Suppression:** Historical releases and fallback mechanisms displayed generic boilerplate (`BOURXE v1.0.29 (build 1029) maintenance and performance update.`) as user-facing changelog entries.
3. **Web Notification Stale Baseline:** The web client repeatedly surfaced stale release banners on launch.
4. **Validation Gate Integrity (F-03):** Step 3d in `.github/workflows/build-android-test-release.yml` generated release notes and calculated `ENTRY_COUNT` without enforcing numeric validation, without rejecting zero entries, without validating the exact `$NOTES_FILE` against placeholder patterns, and without checking consistency between generated eligible IDs and published release notes prior to expensive build steps.

All local defects have been repaired, fail-closed assertions have been implemented in both the workflow and underlying CLI helpers, and 71 critical unit, regression, and executable shell integration tests pass.

---

## 2. Root Cause Analysis

### A. Consumed-ID Ledger Fetch Failure on Run 30
- **Cause:** When the Phase 2 ledger was introduced, Step 3b assumed that every prior release tag possessed a `consumed-ids.json` asset unless there were zero releases in the repository. When Run 30 ran, the latest tag on GitHub was `test-release-run29`, which predated the ledger epoch (2026-11-19T00:00:00Z). `gh release download` failed, triggering a hard exit.
- **Resolution:** Implemented `isLegacyPreLedgerRelease` in `scripts/release/releaseGate.mjs` and updated Step 3b to distinguish:
  - First repository release (`first_release=true`, empty ledger baseline);
  - Verified legacy pre-ledger release (`legacy_ledger_bootstrap=true`, empty v2 ledger baseline with `--allow-missing-ledger true`);
  - Modern release missing ledger (hard stop with `::error::`, refusing to guess state);
  - Corrupted or malformed ledger (checked via `validate-ledger`, hard stop with `::error::`).

### B. Release-Note Placeholder Leakage & What's New Noise
- **Cause:** Run 29's GitHub Release body was created with hardcoded template text (`BOURXE v1.0.29 (build 1029) maintenance and performance update.`), which PostgREST mirrored into `app_release_policy.release_notes`. The web What's New parser split this sentence into a single timeline item.
- **Resolution:** Added `isLegacyPlaceholder()` and updated `parseReleaseNotes()` in `src/domain/appUpdate/changelog.ts` and `scripts/release/releaseGate.mjs` to strip placeholder strings and return honest empty changelogs (`{ entries: [] }`).

### C. Web Notification Re-Triggering
- **Cause:** The web client lacked a publication-age check and seen-version baseline, treating any unacknowledged policy row as fresh on startup.
- **Resolution:** Added `observeWebRelease()` in `src/lib/appUpdate/releaseAcknowledgementLocalStorage.ts` with a 7-day freshness window and local seen-version baseline (`quiet-baseline` on initial load for stale releases; `fresh-release` / `new-version` only when published within 7 days).

### D. Release-Note Validation Gate Bypass (F-03)
- **Cause:** Step 3d calculated `ENTRY_COUNT` via Node/Bun, but never checked if `ENTRY_COUNT > 0` before proceeding. Furthermore, `ENTRY_COUNT` was not validated for numeric format before shell arithmetic, and the generated `$NOTES_FILE` was never submitted to `validate-notes`.
- **Resolution:** Implemented a fail-closed gate in Step 3d:
  1. Validates that `$IDS_FILE` exists and contains a valid array, extracting `ENTRY_COUNT`.
  2. Enforces non-negative integer format on `ENTRY_COUNT` via POSIX shell pattern matching (`case "$ENTRY_COUNT" in ''|*[!0-9]*)`) before arithmetic evaluation.
  3. Rejects `ENTRY_COUNT=0` with `::error::` and `exit 1`.
  4. Validates that `$NOTES_FILE` exists and is non-empty / non-whitespace.
  5. Enhanced `validateReleaseNotes()` and CLI command `validate-notes` to accept `--ids "$IDS_FILE"`, verifying both non-placeholder text and array consistency.
  6. Placed all checks in Step 3d, guaranteeing execution prior to JDK setup, Gradle compilation, keystore extraction, APK build, GitHub Release creation, and Supabase Storage upload.

---

## 3. Exact Files Changed and Justification

| File | Change Description |
|---|---|
| `.github/workflows/build-android-test-release.yml` | **Step 3b:** Added legacy ledger bootstrap detection (`isLegacyPreLedgerRelease`) and fail-closed check on `validate-ledger`.<br>**Step 3d:** Added IDs file presence check, safe `ENTRY_COUNT` numeric validation, zero-entry rejection (`[ "$ENTRY_COUNT" -eq 0 ]`), notes file presence and whitespace check, and `validate-notes --file "$NOTES_FILE" --ids "$IDS_FILE"` invocation. |
| `scripts/release/releaseGate.mjs` | Added `isLegacyPreLedgerRelease()`, `isLegacyPlaceholder()`, enhanced `validateReleaseNotes(notes, { ids })`, and updated CLI command `validate-notes` to support `--file` and `--ids` flags with exit code 1 on empty/whitespace/placeholder notes or empty/malformed IDs. |
| `scripts/release/changelog.mjs` | Supported release note generation and ledger management utilities. |
| `src/domain/appUpdate/changelog.ts` | Added `isLegacyPlaceholder()` and updated `parseReleaseNotes()` to suppress generic placeholder content across BOUXRE/BOURXE variants. |
| `src/domain/appUpdate/updateStateMachine.ts` | Maintained mandatory update state machine contract and policy parsing. |
| `src/hooks/useReleaseNotifications.ts` | Integrated `observeWebRelease` 7-day eligibility check and suppressed banner when `entries.length === 0`. |
| `src/lib/appUpdate/releaseAcknowledgementLocalStorage.ts` | Implemented `observeWebRelease()`, `isReleaseNotificationDismissed()`, and platform-specific local storage separation. |
| `src/tests/critical/releaseGate.test.js` | Added regression tests for `validateReleaseNotes`, `validate-notes --file --ids`, `loadLedger` corruption checks, Git Bash executable shell test of Step 3d, and workflow guard ordering. |
| `src/tests/critical/changelogFoundation.test.js` | Verified parser suppression of placeholders and honest empty state. |
| `src/tests/critical/releaseNotificationStorage.test.js` | Verified web notification 7-day age rule, quiet baseline, and upgrade transitions. |

---

## 4. Final Behavior of Each Release Gate

```
[Release Trigger (Workflow Dispatch or Tag)]
           │
           ▼
[Step 3b: Fetch Consumed-ID Ledger]
   ├── No prior releases? ───────────► Treat as first release (empty v2 baseline)
   ├── Prior release is legacy? ─────► Bootstrap migration baseline (empty v2 baseline)
   ├── Modern release has ledger? ───► Download & validate with validate-ledger
   │                                   └── Malformed/Corrupt? ──► [FAIL CLOSED: exit 1]
   └── Modern release missing ledger? ► [FAIL CLOSED: exit 1 (Refuse to guess)]
           │ (Valid Ledger Available)
           ▼
[Step 3d: Generate & Validate Release Notes]
   ├── Run build-notes (exact build SHA + ledger minus prior version codes)
   ├── IDs file missing? ────────────► [FAIL CLOSED: exit 1]
   ├── ENTRY_COUNT non-numeric? ─────► [FAIL CLOSED: exit 1]
   ├── ENTRY_COUNT == 0? ────────────► [FAIL CLOSED: exit 1]
   ├── Notes file missing/empty? ────► [FAIL CLOSED: exit 1]
   ├── Notes are generic placeholder? ► [FAIL CLOSED: exit 1]
   └── validate-notes fails? ────────► [FAIL CLOSED: exit 1]
           │ (Gate Satisfied)
           ▼
[Step 3: Set up JDK 21] ──► [Step 11: assembleRelease] ──► [Step 16: GitHub Release] ──► [Step 22: Update Supabase Policy]
```

---

## 5. Verification Commands and Actual Results

| Check / Command | Result | Notes |
|---|---|---|
| `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/releaseGate.test.js src/tests/critical/changelogFoundation.test.js src/tests/critical/releaseNotificationStorage.test.js` | **PASS (71/71)** | All unit, integration, and executable Git Bash shell tests passed in 6.98s. |
| `node scripts/release/changelog.mjs verify` | **PASS** | `changelog OK` |
| `bun run audit:load` | **PASS** | Exit code 0, static architecture scan complete. |
| `bun run typecheck` (`tsc --noEmit`) | **PASS** | Zero TypeScript errors across entire repository. |
| YAML Syntax Verification (`yaml.parse`) | **PASS** | `.github/workflows/build-android-test-release.yml` parsed cleanly. |

---

## 6. Local Verification vs. GitHub Actions Runner Boundary

### Verified Locally:
1. **Durable Ledger Logic:** Reconcile, merge, load, and validate ledger routines across all schema versions, legacy tags, epoch timestamps, and corrupted inputs.
2. **Release-Note Generation & Filtering:** Accurate extraction from `git show <SHA>:CHANGELOG.md`, suppression of HTML comments, exclusion of consumed IDs, and proper retry behavior via `--before-version-code`.
3. **Shell Execution:** Step 3d's complete bash script was executed in Git Bash (`C:\Program Files\Git\bin\bash.exe`) with `set -euo pipefail`, verifying all 5 failure branches and the success branch.
4. **Web & Android Lifecycle:** Local storage keys, dismissal persistence, quiet baseline on stale releases (> 7 days), and notification trigger isolation.

### Requires GitHub Actions Runner (External Execution):
1. **Live Network / Secrets Access:**
   - Real GitHub API interactions via `gh release view` / `gh release download` authenticated with `GITHUB_TOKEN`.
   - Android Keystore base64 decoding from repository secrets (`ANDROID_KEYSTORE_BASE64`).
   - Supabase PostgREST PATCH and Storage uploads authenticated via `SUPABASE_SERVICE_ROLE_KEY`.
2. **Physical Build Toolchain:**
   - JDK 21 setup and Gradle `assembleRelease` APK compilation.

---

## 7. Git Status & Attribution

### Working Tree Baseline
- **Branch:** `main`
- **HEAD:** `706f1b6226e64bc42169083f0419d49ed587d8b7`
- **Initial Working Tree:** 10 tracked modified files from previous sessions, plus 2 untracked report files.
- **Final Working Tree:** Exactly the same 10 tracked modified files (further refined and validated), with 0 unrelated files touched.

### Staged / Committed State
- **Zero Git mutations performed:** No commits, pushes, tags, checkouts, resets, cleans, or stashes were executed.
- All pre-existing work and diagnostic reports remain intact.

---

## 8. Controlled Release Readiness Assessment

- **Local Defect Status:** **Zero remaining defects.**
- **Pipeline Posture:** **Release-Ready.**
- **Next Operational Step:**
  The operator may stage and commit the verified release pipeline files following `docs/prompts/git-workflow-commit.md`, push to `origin/main`, and trigger the Build Android Release workflow for Run 30.
- **Fail-Safe Confidence:** Even if CHANGELOG.md were somehow missing unreleased entries on the target commit, the workflow will now fail closed cleanly in Step 3d in seconds—before JDK setup or Gradle build—annotating the GitHub Actions summary with `zero eligible changelog entries found` and refusing to publish an unannotated release.
