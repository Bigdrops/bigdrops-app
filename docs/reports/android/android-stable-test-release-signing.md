# Android Stable Test-Release Signing Report

This report was written by Muse Spark on 2026-09-13 via OpenCode.

## Objective

Replace machine-local debug signing for distributed builds with a stable
BIGDROPS test-release signing pipeline. GitHub Releases must distribute a
signed APK that updates in place.

## Scope

- Signing configuration in `android/app/build.gradle`.
- New GitHub test-release workflow.
- New local test-release script and package script.
- Keystore safeguards in `.gitignore` files.
- Setup guide in `docs/`.
- No change to app ID, permissions, Capacitor config, or app behavior.
- No in-app update checker. No Google Play integration.

## Files Changed

- `android/app/build.gradle` — env-driven versionCode/versionName,
  `bigdropsTestRelease` signing config, conditional release signing.
- `.github/workflows/build-android-test-release.yml` — new workflow.
- `scripts/android-test-release.sh` — new build script.
- `package.json` — new `android:test-release` script.
- `.gitignore` — block keystores at root.
- `android/.gitignore` — enforce keystore exclusion.
- `docs/android-test-release-signing.md` — new setup guide.

## Skills Used

Skills used: capacitor-ci-cd, capacitor-security, capacitor-best-practices
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

- App ID stays `com.bigdrops.app`. No other ID change occurs.
- Release builds read signing data only from environment variables.
- Local builds without a keystore keep prior unsigned release behavior.
- Debug builds do not change and need no secrets.
- VersionCode uses `1000 + github.run_number`. It rises each run and
  stays above legacy value 1.
- VersionName uses `1.0.<run_number>`. It stays human-readable.
- Workflow restores the keystore from secrets, builds `assembleRelease`,
  then deletes the temp keystore with `if: always()`.
- Workflow never logs secret values.
- Tagged pushes (`test-release-*`) publish the APK to GitHub Releases.
- Manual runs upload the APK as a workflow artifact.
- Existing scripts `android-debug.sh` and `android-debug-release.sh`
  stay untouched.

## Verification Result

- `git status` before changes: clean tree.
- `git diff --check`: passed.
- `bun run typecheck`: passed.
- `git status` after changes: 4 modified files, 3 new files. No other
  files changed.
- Secret scan of the full diff: no key, password, or keystore data found.
- No `.keystore`, `.jks`, or `.p12` file exists in `android/app`.
- Workflow static check: all four secret names present, no tabs.
- Script static check: correct header, no hardcoded password.
- `bun run audit:load`: skipped. No schema or data-layer change occurred.
- `bun run build`: NOT run, per hardware policy.

## Risks Or Limitations

- GitHub Secrets do not exist yet. No signed APK was produced here.
- First stable-signed install needs one final uninstall of old
  random-debug APKs. Later releases update in place.
- Keystore loss breaks the update chain. The maintainer must back it up.
- `github.run_number` is monotonic per workflow. A renamed workflow
  resets the counter. The 1000 base still guards legacy value 1, but a
  rename needs version review.

## Deferred Work

- Create the four GitHub Secrets (one-time human setup).
- Run the workflow once and confirm in-place update from v1 to v2.
- Future phase: in-app update checker. It stays out of this task.
