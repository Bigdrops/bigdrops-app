# Android Release Contract (Mandatory Update System)

This document defines the release contract for the BIGDROPS Android
mandatory-update system. It extends `docs/android-test-release-signing.md`.
Read that document for signing and secrets. This document covers the
policy layer and the client-side update rules.

---

## 1. Separation of Concerns

| Concern | Owner | Source |
| --- | --- | --- |
| Primary APK distribution | Supabase Storage | `app-releases/bigdrops-latest.apk` (public bucket) |
| Secondary release tracking | GitHub Releases | `test-release-*` tag workflow (git history) |
| Update policy (which version, mandatory, effective) | BIGDROPS | Supabase `app_release_policy` |
| Install mechanism | Android package installer | `ApkUpdatePlugin` |

GitHub releases never decide what is mandatory. The Supabase policy row
decides. When `web_release_url` points to a direct APK URL (such as
Supabase Storage), the app resolves the asset directly from policy metadata
without making unauthenticated GitHub API calls, avoiding rate limits and
private repository 404 errors.

## 2. Release Publishing (Workflow)

`build-android-test-release.yml` on tag push `test-release-*` or `workflow_dispatch`:

- `versionCode = 1000 + github.run_number`
- `versionName = 1.0.<run_number>`
- APK asset name: `BIGDROPS-test-release-<versionName>-run<run>-<sha>.apk`
- Primary storage: Uploads to Supabase Storage at `/storage/v1/object/app-releases/bigdrops-latest.apk` (with upsert)
- Automatic policy update: Patches `public.app_release_policy` (row `id = 1`) with the new `version_code`, `version_name`, and cache-busted `web_release_url` (`.../bigdrops-latest.apk?v=${version_code}`)
- Secondary distribution: GitHub Release published with the versioned APK asset for tag tracking

## 3. Policy Table

Table `public.app_release_policy`, single row (`id = 1`), anon-readable
through RLS. Policy change = SQL update of that row by BIGDROPS.

| Column | Meaning |
| --- | --- |
| `version_code` | Required Android versionCode of the target release. NULL = no update configured. |
| `version_name` | Display only. |
| `mandatory` | `false` = optional update. `true` = 3-day grace applies. |
| `effective_at` | Server timestamp when the mandatory countdown starts. NULL = countdown starts when the device first sees the policy. |
| `apk_asset_prefix` | Required asset prefix, default `BIGDROPS-test-release-`. |
| `web_release_url` | Approved external destination for the web path. HTTPS enforced by CHECK constraint. |
| `release_notes` | Optional display text. |

RPC `get_active_android_release_policy()` returns the row plus
`server_now` (database time). The client uses `server_now` as the
trusted anchor for the deadline. The device clock is never the sole
authority.

## 4. Client Rules

- Version comparison is numeric on `versionCode` (Android-native rule).
  Version strings are never compared lexicographically.
- The 3-day grace anchor is persisted locally
  (`bigdrops.app_update.grace_anchor` in localStorage) the first time a
  mandatory target is seen, and survives restarts. Repeated checks never
  reset it. A newer mandatory target supersedes it. Installing the
  target clears it after re-evaluation.
- Fail-safe: an unreachable or malformed policy never blocks a valid
  install. Only locally persisted, already-expired grace state can block.
- Malformed policy rows (missing versionCode, non-boolean mandatory,
  non-HTTPS web URL, unparseable timestamps) are rejected, never treated
  as valid updates.
- Metadata checks run on launch and resume, throttled to one fetch per
  6 hours. Local grace re-evaluation runs every 30 seconds without
  network.

## 5. Known Limitations

- The grace anchor persists in localStorage. Clearing app storage clears
  the anchor; the device re-anchors on the next successful policy fetch.
  Combined with the server `effective_at` field, BIGDROPS can restore an
  exact deadline by setting `effective_at` in the policy row.
- APK checksum verification is not part of this phase. The asset name
  prefix is the contract. Add a checksum column to the policy table and
  verify in `ApkUpdatePlugin` before install when BIGDROPS requires it.
- Android runtime behavior (installer flow, DownloadManager, unknown
  sources) requires human device testing. See the task report.
