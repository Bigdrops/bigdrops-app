# Diagnostic Audit: Android Release Failure — Consumed-ID Ledger Fetch (Run 30)

**Date:** 2026-11-20  
**Repository:** `bigdrops-app` · **Branch:** `main` · **HEAD:** `2e556315d0fa83c8466b048cb15195155f41aa69`  
**Task Type:** Read-Only Log Inspection and Root-Cause Diagnosis  
**Status:** Completed  

---

## 1. Executive Summary

This diagnostic investigation establishes the exact root cause of the failure in GitHub Actions workflow **Build Android Release** at step **"Fetch consumed-ID ledger"** (Job: `Build Test-Release APK`, Run 30).

The diagnosis is established directly from the downloaded log archive:
`C:\Users\DELL\Downloads\mobile devices\logs_120927062157.zip`

### Root Cause in Brief:
The failure was caused by a **deterministic bootstrapping defect** in `.github/workflows/build-android-test-release.yml` (Step 3b, lines 138–152).

The workflow's ledger discovery logic assumed that a repository is either:
1. **Completely fresh with zero prior releases:** `gh release view` returns empty (`LATEST_TAG=""`) → seeds an initial empty ledger `{"schema":2,"releases":[]}` with `first_release=true`.
2. **Already operating on the consumed-ID ledger system:** `gh release view` returns a prior tag (`LATEST_TAG="test-release-run29"`) → assumes the prior release must already have a `consumed-ids.json` release asset, and fails closed with `exit 1` if the asset is missing.

In reality, the BOUXRE repository has **29 historical legacy releases** (`test-release-run1` through `test-release-run29`) published between October and November 18, 2026—**before** the Phase 2 consumed-ID ledger architecture was introduced on November 19, 2026. None of these 29 historical releases possess a `consumed-ids.json` asset.

When Run 30 executed as the first release attempt under the new workflow, `gh release view` resolved the most recent release as `test-release-run29`. The step attempted `gh release download test-release-run29 --pattern 'consumed-ids.json'`, failed because the asset does not exist on legacy release 29, and explicitly halted with:
```
##[error]Release test-release-run29 has no consumed-ids.json asset. Refusing to guess consumed state.
##[error]Process completed with exit code 1.
```

---

## 2. Archive Inspection & Failing Log Evidence

### 2.1 Archive Location and Contents
- **Resolved Archive Path:**  
  `C:\Users\DELL\Downloads\mobile devices\logs_120927062157.zip`
- **Archive Size & Date:**  
  Compressed ZIP archive containing GitHub Actions run 30 build logs (Workflow: `Build Android Release`, Trigger Commit: `706f1b6226e64bc42169083f0419d49ed587d8b7`).
- **Archive Entry Manifest:**
  ```
  FullName                                                Length
  --------                                                ------
  0_Build Test-Release APK.txt                             28873
  Build Test-Release APK/system.txt                          611
  Build Test-Release APK/1_Set up job.txt                   2414
  Build Test-Release APK/2_Checkout repository.txt         15305
  Build Test-Release APK/3_Compute release tag.txt          1720
  Build Test-Release APK/4_Compute build metadata.txt       4366
  Build Test-Release APK/5_Set up Bun.txt                    668
  Build Test-Release APK/6_Fetch consumed-ID ledger.txt     2581
  Build Test-Release APK/22_Remove temporary keystore.txt    402
  Build Test-Release APK/72_Post Checkout repository.txt    1093
  Build Test-Release APK/73_Complete job.txt                 348
  ```

### 2.2 Exact Failing Step & Complete Log Extract
From `Build Test-Release APK/6_Fetch consumed-ID ledger.txt`:

```text
2026-11-20T04:33:40.8728312Z ##[group]Run set -euo pipefail
2026-11-20T04:33:40.8728627Z set -euo pipefail
2026-11-20T04:33:40.8728881Z LEDGER_FILE="$RUNNER_TEMP/consumed-ids.json"
2026-11-20T04:33:40.8729224Z # On a tag-triggered retry, read the ledger from THIS release; on a
2026-11-20T04:33:40.8729556Z # new run, read the most recent release's ledger.
2026-11-20T04:33:40.8729815Z if [ "false" = "true" ]; then
2026-11-20T04:33:40.8730054Z   LATEST_TAG="test-release-run30"
2026-11-20T04:33:40.8730275Z else
2026-11-20T04:33:40.8730554Z   LATEST_TAG=$(gh release view --json tagName -q .tagName 2>/dev/null || true)
2026-11-20T04:33:40.8730989Z fi
2026-11-20T04:33:40.8731167Z if [ -z "$LATEST_TAG" ]; then
2026-11-20T04:33:40.8731471Z   echo "No prior release found; treating ledger as empty (first release)."
2026-11-20T04:33:40.8731827Z   printf '{"schema":2,"releases":[]}\n' > "$LEDGER_FILE"
2026-11-20T04:33:40.8732151Z   echo "first_release=true" >> "$GITHUB_OUTPUT"
2026-11-20T04:33:40.8732396Z else
2026-11-20T04:33:40.8732586Z   echo "Prior release: $LATEST_TAG"
2026-11-20T04:33:40.8732897Z   if ! gh release download "$LATEST_TAG" --pattern 'consumed-ids.json' \
2026-11-20T04:33:40.8733251Z       --dir "$RUNNER_TEMP" --clobber >/dev/null 2>&1; then
2026-11-20T04:33:40.8733666Z     echo "::error::Release $LATEST_TAG has no consumed-ids.json asset. Refusing to guess consumed state."
2026-11-20T04:33:40.8734034Z     exit 1
2026-11-20T04:33:40.8734213Z   fi
2026-11-20T04:33:40.8734431Z   mv "$RUNNER_TEMP/consumed-ids.json" "$LEDGER_FILE"
2026-11-20T04:33:40.8734793Z   bun scripts/release/releaseGate.mjs validate-ledger --ledger "$LEDGER_FILE"
2026-11-20T04:33:40.8735162Z   echo "first_release=false" >> "$GITHUB_OUTPUT"
2026-11-20T04:33:40.8735403Z fi
2026-11-20T04:33:40.8735612Z echo "ledger_file=$LEDGER_FILE" >> "$GITHUB_OUTPUT"
2026-11-20T04:33:40.8756714Z shell: /usr/bin/bash -e {0}
2026-11-20T04:33:40.8756969Z env:
2026-11-20T04:33:40.8759110Z   GH_TOKEN: ***
2026-11-20T04:33:40.8759291Z ##[endgroup]
2026-11-20T04:33:42.6092963Z Prior release: test-release-run29
2026-11-20T04:33:42.8797355Z ##[error]Release test-release-run29 has no consumed-ids.json asset. Refusing to guess consumed state.
2026-11-20T04:33:42.8803922Z ##[error]Process completed with exit code 1.
```

### 2.3 Key Operational Data from Logs
- **Failing Command:**  
  `gh release download "test-release-run29" --pattern 'consumed-ids.json' --dir "$RUNNER_TEMP" --clobber`
- **Exit Code:** `1`
- **Stage of Failure:** Occurred during the asset download attempt, before running `releaseGate.mjs validate-ledger` and long before Gradle build or Supabase operations.
- **Workflow Inputs:** Run was triggered on branch `main` (not a tag push: `IS_TAG_RUN="false"`).
- **Target Tag for Next Release:** `test-release-run30` (`VERSION_CODE=1030`, `VERSION_NAME="1.0.30"`).

---

## 3. Detailed Root-Cause Analysis

### 3.1 Trace of the Failing Workflow Implementation
In [.github/workflows/build-android-test-release.yml](file:///c:/Users/DELL/Desktop/bigdrops-app/.github/workflows/build-android-test-release.yml#L118-L154):

```yaml
      # ── 3b. Fetch the durable consumed-ID ledger ───────────────────────
      - name: Fetch consumed-ID ledger
        id: ledger
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          set -euo pipefail
          LEDGER_FILE="$RUNNER_TEMP/consumed-ids.json"
          if [ "${{ steps.release_tag.outputs.is_tag_run }}" = "true" ]; then
            LATEST_TAG="${{ steps.release_tag.outputs.tag_name }}"
          else
            LATEST_TAG=$(gh release view --json tagName -q .tagName 2>/dev/null || true)
          fi
          if [ -z "$LATEST_TAG" ]; then
            echo "No prior release found; treating ledger as empty (first release)."
            printf '{"schema":2,"releases":[]}\n' > "$LEDGER_FILE"
            echo "first_release=true" >> "$GITHUB_OUTPUT"
          else
            echo "Prior release: $LATEST_TAG"
            if ! gh release download "$LATEST_TAG" --pattern 'consumed-ids.json' \
                --dir "$RUNNER_TEMP" --clobber >/dev/null 2>&1; then
              echo "::error::Release $LATEST_TAG has no consumed-ids.json asset. Refusing to guess consumed state."
              exit 1
            fi
            mv "$RUNNER_TEMP/consumed-ids.json" "$LEDGER_FILE"
            bun scripts/release/releaseGate.mjs validate-ledger --ledger "$LEDGER_FILE"
            echo "first_release=false" >> "$GITHUB_OUTPUT"
          fi
```

### 3.2 The Flawed Assumption
The workflow logic established a binary fork:
1. `[ -z "$LATEST_TAG" ]`: True **only** if GitHub has zero releases in the repository.
2. `[ -n "$LATEST_TAG" ]`: Assumed that because a release exists, it must have been built with the Phase 2 ledger publisher and therefore possess `consumed-ids.json`.

### 3.3 Reality of Historical Releases
Inspection of GitHub Releases via `gh release view test-release-run29 --json assets` confirms:
- **Release `test-release-run29`** (created 2026-11-18T17:16:16Z) contains only:
  - `BIGDROPS-test-release-1.0.29-run29-1d7d6d7.apk` (31,711,815 bytes)
- **Zero assets matching `consumed-ids.json` exist on release 29.**
- Releases `test-release-run1` through `test-release-run28` likewise possess zero `consumed-ids.json` assets because they were created under the legacy release system.

### 3.4 Interaction with `scripts/release/releaseGate.mjs`
In [scripts/release/releaseGate.mjs](file:///c:/Users/DELL/Desktop/bigdrops-app/scripts/release/releaseGate.mjs#L208-L233):
- The `loadLedger(text, { allowMissing = false })` function explicitly supports bootstrapping an empty ledger via `{ allowMissing: true }`, which produces `{ schema: RECORD_SCHEMA, releases: [] }`.
- In Step 3d ("Generate release notes", lines 212–216), the workflow was already wired to pass `--allow-missing-ledger true` whenever `FIRST_RELEASE="true"`.
- However, Step 3b never set `FIRST_RELEASE="true"` because `LATEST_TAG` was not empty.

### 3.5 Test Suite Coverage Gap
- Unit tests in `src/tests/critical/changelogPhase22.test.js:108` and `src/tests/critical/releaseGate.test.js` verify `loadLedger` with `allowMissing: true`.
- However, **no test tested the transition boundary**: simulating a GitHub repository that has prior release tags but where the prior release lacks a `consumed-ids.json` asset.

---

## 4. Classification & Diagnostics Summary

| Diagnostic Question | Result & Evidence |
| :--- | :--- |
| **Exact Failing Log** | `Build Test-Release APK/6_Fetch consumed-ID ledger.txt` |
| **Failing Command** | `gh release download "$LATEST_TAG" --pattern 'consumed-ids.json'` |
| **Exit Code** | `1` |
| **Failure Classification** | **Deterministic Implementation Defect (Bootstrapping Transition Gap)** |
| **Reproducibility** | **100% Deterministic:** Any workflow run where `LATEST_TAG` points to a legacy release (runs 1–29) will fail at this exact line. |
| **External Service Health** | GitHub Actions runner, GitHub API (`gh release view`), and GitHub Releases were healthy and responded in ~1.7 seconds. |
| **Authentication / Permissions** | `GH_TOKEN` had `Contents: write` and `Metadata: read` (verified in `1_Set up job.txt`). There was no authentication error. |

---

## 5. Scope Protection & Verification

- **Zero Changes Beyond Report:** No code, workflow, test, or config files were modified, staged, committed, or deleted.
- **Git Status Comparison:**
  - Initial:
    ```
    ?? docs/reports/whats-new-changelog/2026-11-20-whats-new-content-origin-and-notification-lifecycle-audit.md
    ```
  - Final:
    ```
    ?? docs/reports/android-release/2026-11-20-run-30-consumed-id-ledger-fetch-failure-audit.md
    ?? docs/reports/whats-new-changelog/2026-11-20-whats-new-content-origin-and-notification-lifecycle-audit.md
    ```
- **Prohibited Commands:** Neither `bun run build` nor `bun run lint` was executed.
