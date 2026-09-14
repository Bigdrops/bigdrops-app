# Android Mandatory Update System Report

This report was written by Buffy (GLM) on 2026-09-14 via Freebuff.

## Objective

Implement the BIGDROPS Android mandatory-update system: approved-release
discovery through GitHub Releases, BIGDROPS-controlled policy through
Supabase, a persistent 3-day grace period, a blocking gate after the
deadline, and two update paths (in-app APK install and web download).

## Scope

Android native bridge, TypeScript domain/lib/hook layer, update UI,
Supabase migration, App.tsx wiring, documentation, critical tests.
No existing business behavior changed outside the update system.

## Files changed

New:

- `supabase/migrations/20260914120000_app_release_policy.sql`
- `src/domain/appUpdate/updateStateMachine.ts`
- `src/lib/appUpdate/appVersion.ts`
- `src/lib/appUpdate/graceState.ts`
- `src/lib/appUpdate/releasePolicyClient.ts`
- `src/lib/appUpdate/releaseDiscovery.ts`
- `src/lib/native/apkUpdate.ts`
- `src/hooks/useAppUpdate.ts`
- `src/components/app/UpdateGate.tsx`
- `src/components/app/UpdateBanner.tsx`
- `src/components/app/UpdateSheet.tsx`
- `android/app/src/main/java/com/bigdrops/app/plugins/ApkUpdatePlugin.java`
- `src/tests/critical/appUpdateStateMachine.test.js`
- `docs/android-release-contract.md`
- `docs/reports/ANDROID/android-mandatory-update-system.md`

Modified:

- `src/App.tsx` (update discovery hook, gate branch, banner mount)
- `android/app/src/main/java/com/bigdrops/app/MainActivity.java` (plugin registration)
- `android/app/src/main/res/xml/file_paths.xml` (cache path `updates/`)
- `vite-env.d.ts` (+`VITE_GIT_REPO`), `.env.example` (documented new var)

## Skills used

Skills used: capacitor-best-practices, capacitor-security
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

1. Policy layer: `app_release_policy` table (single row, anon-readable,
   HTTPS-checked web URL) and RPC `get_active_android_release_policy()`
   which returns the row plus server `now()`.
2. State machine: pure module. Numeric versionCode comparison. Policy
   validation rejects malformed rows. Grace resolution: effective_at
   anchor, else first-seen anchor, persisted across restarts. Same-target
   checks never reset the countdown. Newer mandatory target supersedes.
   Installed >= target clears persisted state.
3. Fail-safe: policy outage keeps the app usable unless locally persisted
   grace already expired. Then the gate stays until update or metadata
   proves the state obsolete.
4. Discovery: launch + resume, throttled to one policy fetch per 6 hours.
   Local grace re-evaluation every 30 seconds without network.
5. Two paths: in-app (native DownloadManager into app-private cache,
   FileProvider content URI, Android package installer) and web (policy
   `web_release_url`, else approved GitHub release page; opened with
   Capacitor Browser). No URL is fabricated from parts.
6. Release contract: only assets whose name starts with the policy
   `apk_asset_prefix` and end in `.apk` over HTTPS are accepted.
   Repository resolved from `VITE_GIT_REPO` (build-time git remote
   value), never hardcoded.
7. UI: full-screen gate after deadline (both actions remain usable);
   grace banner with days/hours left; update sheet with progress,
   cancel, retry, install, web path. shadcn/Lucide conventions only.
8. Download identity: `VITE_GIT_REPO` join documented in
   `.env.example`; CI builds must set it (same value as the git remote).

## Verification result

Verification:
- bun run audit:load: passed (exit 0). Task files add no new audit
  findings. Note: src/App.tsx was already over the 600-line bloat
  threshold before this task; the +13 wiring lines increase that
  pre-existing warning marginally.
- bun run typecheck: 3 errors, all in src/tests/critical/expenseService.test.ts,
  an in-flight file from a concurrent agent (expenses feature). Zero errors
  in task files. Verified by filtered typecheck output.
- bun run test: 443 tests, 439 pass, 4 fail. All 20 tests in the new
  appUpdateStateMachine.test.js pass. The 4 failures are accounting
  integration tests failing with "Cannot read properties of undefined
  (reading 'VITE_SUPABASE_URL')" inside the concurrent agent's change
  area (accounting/expense import chain). Not caused by task files; task
  files are not imported by accounting tests.
- git status: only task files added/modified; pre-existing staged files
  and concurrent-agent files untouched
- bun run build: skipped due to hardware policy

Static Android verification performed:

- Plugin name `ApkUpdate` matches `registerPlugin<ApkUpdatePlugin>('ApkUpdate')`.
- `registerPlugin(ApkUpdatePlugin.class)` added in `MainActivity.onCreate`.
- FileProvider authority `${applicationId}.fileprovider` matches the
  manifest declaration; `buildProviderUri` uses
  `context.getPackageName() + ".fileprovider"`.
- `file_paths.xml` gained `<cache-path name="update_apks" path="updates/"/>`
  which matches `context.getCacheDir()/updates/` in the plugin.
- No new manifest permission requested. `REQUEST_INSTALL_PACKAGES` is
  intentionally absent in this phase (see Risks). DownloadManager and
  app-private cache need no storage permission.
- HTTPS-only enforced in both TypeScript and Java layers.
- No secrets, keystore, or tokens added.

## Database application (2026-09-14, user-authorized)

- `supabase db push` was attempted first (user approved "push all").
  It failed on the first pending migration,
  `20260907000000_record_capture_foundation.sql`, with
  `relation "tax_input_entries" does not exist`. Nothing was applied.
  Root cause: `20260830000000_public_business_schema_purge.sql` dropped
  `public.tax_input_entries` (tax tables moved to tenant schemas), but
  the pending taxation-made-easy chain still alters the public table.
  The 9-migration pending chain is broken at its first migration and
  needs repair by its owning workstream. This task did not modify it.
- Surgical apply (user-approved): `supabase db query --linked --file
  supabase/migrations/20260914120000_app_release_policy.sql`, then
  `supabase migration repair --status applied 20260914120000`.
- Verified on hosted DB: table exists, 1 RLS policy, RPC registered,
  `NOTIFY pgrst, 'reload schema'` run, RPC executes under the anon role
  and returns the policy row plus server time.
- Seeded test policy (user-approved): version_code 1004, version_name
  1.0.4, mandatory false, effective_at NULL, approved prefix
  BIGDROPS-test-release-, web URL the GitHub releases page. To run a
  mandatory-update test, flip `mandatory = true`; the 3-day countdown
  then anchors at first device fetch (effective_at is NULL).

## Risks or limitations

- `REQUEST_INSTALL_PACKAGES` is not declared. On Android 8+ the system
  package installer shows its own flow, but devices/oem builds that gate
  ACTION_VIEW package installs behind the "install unknown apps" setting
  will route the user there. If device testing shows the install intent
  is blocked rather than routed, add
  `<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES"/>`
  to the manifest in a follow-up. This was left out deliberately to
  request no unnecessary permission, per the task constraints.
- The grace anchor lives in localStorage. Clearing app data clears it.
  Mitigation documented in the release contract (server `effective_at`).
- APK checksum verification is deferred; the asset prefix is the current
  contract. Policy table extension path is documented.
- Android runtime behavior (installer flow, DownloadManager notifications,
  unknown-sources routing, background resume timing) is not validated by
  this task and requires human device testing.
- The Supabase migration must be applied with `supabase db push` by a
  human with CLI access (per `supabase/database-workflow.md`, agents
  must not apply schema changes unasked).

## Deferred work

- Human Android device testing (install flow end to end, grace clock
  behavior across restarts, blocked-gate UX).
- Broken pending migration chain (record_capture_foundation onward,
  taxation-made-easy workstream) blocks all future `supabase db push`
  runs until repaired by its owners.
- Optional checksum column + native verification.
- Optional admin UI to edit the policy row.
- CI: add `VITE_GIT_REPO` to the workflow build env if the discovered
  remote env is absent at build time.
