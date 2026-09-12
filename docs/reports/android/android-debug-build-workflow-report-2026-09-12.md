# Android Debug Build Workflow Report

This report was written by Buffy on 2026-09-12 via Freebuff.

## Objective

Replace the manual Android debug APK sequence with one Bun command:

1. Web build with the required 12 GB heap setting.
2. Capacitor sync for Android.
3. Gradle `assembleDebug`.
4. APK verification with exact path output.

Add an optional command that builds the APK and publishes it to a timestamped GitHub Release with the `gh` CLI.

## Scope

Tooling only. No application source, Android configuration, or dependency changes.

## Files changed

- `package.json` — added two scripts. No existing scripts changed.
- `scripts/android-debug.sh` — new file. Canonical debug build script.
- `scripts/android-debug-release.sh` — new file. Build plus GitHub Release upload.

## Skills used

- `capacitor-best-practices`

## Documentation standard

ASD-STE100 Simplified Technical English

## Changes made

### `bun run android:debug`

The command runs `sh scripts/android-debug.sh`. The script:

1. Resolves the repository root from its own location. It works from any working directory.
2. Checks that `android/gradlew` exists.
3. Runs the web build with `NODE_OPTIONS="--max-old-space-size=12288" bun run build`. It never runs a plain build without the heap setting.
4. Runs `bunx cap sync android`.
5. Runs `./gradlew assembleDebug` inside `android/`. The Gradle wrapper in the git index is mode 100755, so it stays executable on Linux and GitHub Codespaces checkouts.
6. Verifies that `android/app/build/outputs/apk/debug/app-debug.apk` exists.
7. Prints the APK path, size in bytes and human-readable form, and the UTC finish time.

The script uses `set -eu`. It stops at the first failed stage. It prints no success message unless all stages pass and the APK exists.

### `bun run android:debug:release`

The command runs `sh scripts/android-debug-release.sh`. The script:

1. Invokes the canonical build script. No build logic is duplicated.
2. Verifies the APK again.
3. Fails with a clear message if `gh` is not installed.
4. Fails with a clear message if `gh auth status` fails.
5. Creates a release with tag `debug-YYYYMMDD-HHMMSS` in UTC.
6. Uploads `app-debug.apk` as the release asset.
7. Prints the tag and the GitHub Release URL.

The release command hardcodes no repository owner or name. `gh` resolves the repository from the current Git checkout. The command stores no credentials. It pushes no source commits.

## Verification result

Verification:
- bun run audit:load: not run. Task policy: tooling-only change with no schema, query, or data-layer edits.
- bun run typecheck: not run. Task policy: no application TypeScript modified.
- bun run build: not run. Task policy and hardware policy. The user runs the build separately.
- Gradle build: not run. Same policy.
- package.json JSON parse via Bun: passed
- sh -n on both new scripts: passed
- git diff inspection: package.json changed by 2 script lines plus one trailing comma. No other tracked file changed.
- git status: all pre-existing modified and untracked files match the pre-task baseline. No pre-existing file reverted or overwritten.

### Incident note

A probe command for script discovery accidentally executed the build script. The pipe that read its output closed after the first line and terminated the script during its first `printf`. No build stage started. A follow-up git status confirmed no `dist/`, `android/app/build/`, or `android/android/` artifacts exist. No tracked file changed. No cleanup was needed.

## Risks or limitations

- The build itself is unverified by design. The user runs `bun run android:debug` in the Codespace. Gradle, JDK, and Android SDK must exist there.
- `sh` must exist on the host. It exists on Debian and Ubuntu Codespace images.
- The release command depends on `gh` version 2.x with `gh release create`. Current versions meet this.
- The APK stays unsigned and debug-keyed. This is intentional for debug distribution.

## Deferred work

- Run `bun run android:debug` in a Codespace to confirm the end-to-end build.
- Run `bun run android:debug:release` with an authenticated `gh` to confirm release creation.
