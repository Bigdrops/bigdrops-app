# Android Test-Release Identity — test-release-20260917-01

This report was written by Qwen on 2026-09-17 via Local Runner.

## Objective

Strict read-only investigation of commit `6271fc0fae466249efc6173934301a7bb2013935` to extract exact Android test-release facts from 29 workflow log files, inspect the `app_release_policy` migration schema, and determine required fields for the next Supabase mandatory-update test.

## Scope

- Read-only analysis of commit `6271fc0f` (29 `.txt` workflow logs)
- Inspection of `supabase/migrations/20260914120000_app_release_policy.sql`
- Inspection of `src/lib/appUpdate/releasePolicyClient.ts`, `src/lib/appUpdate/releaseDiscovery.ts`, `src/domain/appUpdate/updateStateMachine.ts`
- Inspection of `docs/android-release-contract.md`, `.github/workflows/build-android-test-release.yml`
- No code changes, no database modifications, no build/typecheck/lint/audit

## Skills Used

NONE

## Documentation Standard

ASD-STE100 Simplified Technical English

## Files Changed

None (read-only investigation).

## Verification

- git status: clean (zero modifications)
- All 29 workflow log files read from commit `6271fc0f`
- Migration schema, client, domain logic, contract, and workflow YAML all inspected

---

## Evidence: Workflow Run Identity

| Field | Value | Source |
| :--- | :--- | :--- |
| **Tag** | `test-release-20260917-01` | `tmp-purge/system.txt`, `tmp-purge/22_Publish GitHub Release.txt` |
| **Commit SHA** | `b37ca3e4f87304f097fbb6805334a270a177df0d` | `tmp-purge/3_Compute build metadata.txt` |
| **Short SHA** | `b37ca3e` | `tmp-purge/3_Compute build metadata.txt` |
| **Run Number** | `6` | `tmp-purge/3_Compute build metadata.txt` |
| **Workflow File** | `.github/workflows/build-android-test-release.yml` | `tmp-purge/system.txt` |
| **Runner** | `ubuntu-24.04` (LTS) | `tmp-purge/system.txt` |
| **Runner Image** | `ubuntu-24.04` v`20260907.300.1` | `tmp-purge/system.txt` |
| **Actor** | `Bigdrops` | `tmp-purge/3_Compute build metadata.txt` |
| **Build Time** | `2026-09-17 04:48:32 UTC` | `tmp-purge/3_Compute build metadata.txt` |
| **Trigger** | `push` tag `test-release-*` | `.github/workflows/build-android-test-release.yml` |
| **Permissions** | `contents: write` | `tmp-purge/system.txt` |

---

## Evidence: Build Output

| Field | Value | Source |
| :--- | :--- | :--- |
| **VersionCode** | `1006` | `tmp-purge/3_Compute build metadata.txt` |
| **VersionName** | `1.0.6` | `tmp-purge/3_Compute build metadata.txt` |
| **APK Filename** | `BIGDROPS-test-release-1.0.6-run6-b37ca3e.apk` | `tmp-purge/19_Locate and rename APK.txt` |
| **APK Size** | `33M` | `tmp-purge/19_Locate and rename APK.txt` |
| **Artifact Name** | `BIGDROPS-test-release-run6.zip` | `tmp-purge/21_Upload Test-Release APK.txt` |
| **Artifact ID** | `10480414220` | `tmp-purge/21_Upload Test-Release APK.txt` |
| **Artifact Final Size** | `22665132 bytes` (~21.6 MB) | `tmp-purge/21_Upload Test-Release APK.txt` |
| **Artifact SHA256** | `bd7fd1b202bd66a086ebdcfe5fdbb7d2524118559f6f607f76c8c0a3fe4ebb36` | `tmp-purge/21_Upload Test-Release APK.txt` |
| **Artifact Download URL** | `https://github.com/Bigdrops/bigdrops-app/actions/runs/35183306445/artifacts/10480414220` | `tmp-purge/21_Upload Test-Release APK.txt` |
| **GitHub Release URL** | `https://github.com/Bigdrops/bigdrops-app/releases/tag/test-release-20260917-01` | `tmp-purge/22_Publish GitHub Release.txt` |
| **Release Title** | `BIGDROPS test release 1.0.6 (test-release-20260917-01)` | `tmp-purge/22_Publish GitHub Release.txt` |
| **Signing** | Stable test-release key via `BIGDROPS_KEYSTORE_BASE64` secret | `.github/workflows/build-android-test-release.yml` |
| **App ID** | `com.bigdrops.app` | `tmp-purge/20_Generate Build Summary.txt` |

---

## Evidence: `app_release_policy` Schema

Table `public.app_release_policy` — single row (`id = 1`), anon-readable through RLS.

| Column | Type | Constraint | Meaning |
| :--- | :--- | :--- | :--- |
| `id` | `integer` | `PRIMARY KEY`, `CHECK (id = 1)` | Single-row identifier |
| `version_code` | `integer` | `NULL` or `> 0` | Required Android versionCode |
| `version_name` | `text` | — | Display only |
| `mandatory` | `boolean` | `NOT NULL DEFAULT false` | `true` = 3-day grace applies |
| `effective_at` | `timestamptz` | — | Server time countdown starts |
| `apk_asset_prefix` | `text` | `NOT NULL DEFAULT 'BIGDROPS-test-release-'` | Approved APK asset prefix |
| `web_release_url` | `text` | `NULL` or `~ '^https://'` | Approved external destination |
| `release_notes` | `text` | — | Optional display text |
| `updated_at` | `timestamptz` | `DEFAULT now()` | Last update timestamp |

**RLS**: `app_release_policy_read_all` grants `SELECT` to `anon` and `authenticated`. No insert/update/delete policies — writes via service role only.

**RPC**: `get_active_android_release_policy()` returns the row plus `server_now`.

---

## Required Fields for Next Mandatory-Update Test

To configure `app_release_policy` for a mandatory update targeting this release, set:

| Field | Value | Rationale |
| :--- | :--- | :--- |
| `version_code` | `1006` | Matches the test-release `versionCode` |
| `version_name` | `'1.0.6'` | Human-readable display |
| `mandatory` | `true` | Enables 3-day grace period |
| `effective_at` | `<server timestamp>` | When the 3-day countdown starts |
| `apk_asset_prefix` | `'BIGDROPS-test-release-'` | Default; matches GitHub asset naming |
| `web_release_url` | `'https://github.com/Bigdrops/bigdrops-app/releases/tag/test-release-20260917-01'` | HTTPS-enforced by CHECK constraint |
| `release_notes` | optional | Display text for the update |

The `version_code` must be a positive integer matching `1006`. The `mandatory` flag must be `true` for the grace period to apply. The `web_release_url` must match the pattern `^https://` (enforced by `app_release_policy_web_url_https` CHECK constraint). The `apk_asset_prefix` must match the prefix used in GitHub release assets (`BIGDROPS-test-release-`).
