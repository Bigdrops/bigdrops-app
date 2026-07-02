# Task Report: Improve Android Debug APK Workflow

**Date:** 2026-06-30
**Status:** Completed
**File Modified:** `.github/workflows/build-android-debug.yml`

---

## Objective

Enhance the existing Android Debug APK GitHub Actions workflow with:
1. Build metadata logging for debugging and traceability
2. Meaningful APK artifact naming (branch + run number)
3. Meaningful APK file naming (branch + short SHA + run number)
4. Branch name sanitization for filesystem safety

**Constraint:** Preserve all existing functionality without modification.

---

## Changes Made

### 1. Build Metadata Logging (Steps 2-3)

**Compute build metadata** (new step, id: `meta`):
- Extracts branch name from `GITHUB_REF`
- Computes short commit SHA (7 chars)
- Sanitizes branch name for filesystem use
- Logs: repository, branch, full SHA, short SHA, run number, actor, timestamp
- Exports outputs: `branch`, `short_sha`, `sanitized_branch`

**Log tool versions** (new step):
- Java version
- Gradle version (reference to wrapper properties)
- Bun version
- Node version
- Capacitor version (from `package.json`)

### 2. Branch Name Sanitization

```bash
SANITIZED_BRANCH=$(echo "$BRANCH" | sed 's/[^a-zA-Z0-9]/-/g; s/-\+/-/g; s/^-//; s/-$//')
```

- Replaces all non-alphanumeric characters with hyphens
- Collapses consecutive hyphens into one
- Trims leading/trailing hyphens
- Falls back to `unknown` if result is empty

**Examples:**
| Branch Input | Sanitized Output |
|---|---|
| `main` | `main` |
| `feature/auth-v2` | `feature-auth-v2` |
| `fix/issue-123` | `fix-issue-123` |
| `release/v1.0.0` | `release-v1-0-0` |
| `feature/ui-fix` | `feature-ui-fix` |

### 3. APK File Renaming (Step 13)

**Before:** `app-debug.apk` (generic Gradle output name)
**After:** `BIGDROPS-debug-main-abc1234-run125.apk`

Format: `BIGDROPS-debug-{branch}-{short_sha}-run{number}.apk`

### 4. Artifact Name (Step 14)

**Before:** `bigdrops-debug-apk-${{ github.run_number }}`
**After:** `BIGDROPS-debug-{branch}-run{number}`

Example: `BIGDROPS-debug-main-run125`

---

## Verification

- [x] YAML syntax validated (manual review)
- [x] All existing steps preserved unchanged
- [x] Concurrency group unchanged
- [x] Timeout unchanged (30 min)
- [x] Retention unchanged (30 days)
- [x] Step numbering updated (1-14)
- [x] Branch sanitization handles edge cases
- [x] Capacitor version reads from `package.json` (available before `bun install`)

---

## Build Log Output Example

```
────────────── Build Metadata ──────────────
Repository  : org/bigdrops-app
Branch      : feature/auth-v2
Commit SHA  : a1b2c3d4e5f6g7h8i9j0
Short SHA   : a1b2c3d
Run Number  : 125
Actor       : developer
Build Time  : 2026-06-30 14:30:00 UTC
────────────────────────────────────────────
────────────── Tool Versions ───────────────
Java        : openjdk version "21.0.3" 2024-04-16
Gradle      : (bundled with wrapper — see android/gradle/wrapper/gradle-wrapper.properties)
Bun         : 1.2.8
Node        : v22.15.0
Capacitor   : 7.2.0
────────────────────────────────────────────
✅ Android project structure validated.
✅ APK renamed: BIGDROPS-debug-feature-auth-v2-a1b2c3d-run125.apk (45M)
```
