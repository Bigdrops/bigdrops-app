#!/bin/sh
# BIGDROPS Android signed test-release APK build (local or CI reference).
#
# Builds the stable-signed test-release APK via Gradle assembleRelease.
# Signing material comes ONLY from environment variables (never hardcoded):
#   BIGDROPS_KEYSTORE_FILE      path to the test-release keystore file
#   BIGDROPS_KEYSTORE_PASSWORD  keystore password
#   BIGDROPS_KEY_ALIAS          key alias
#   BIGDROPS_KEY_PASSWORD       key password
# Optional version overrides:
#   BIGDROPS_VERSION_CODE       integer versionCode (default 1 for local builds)
#   BIGDROPS_VERSION_NAME       versionName (default 1.0 for local builds)
#
# In GitHub Actions these variables are set from Secrets by
# .github/workflows/build-android-test-release.yml.
# Ordinary debug development (scripts/android-debug.sh) does not need them.
#
# Runtime: Bun only. No npm, yarn, or pnpm.
# The script stops immediately when any stage fails.
set -eu

fail() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"

cd "$ROOT"

[ -f "$ROOT/android/gradlew" ] || fail "android/gradlew not found. Is the android/ platform folder present?"
[ -n "${BIGDROPS_KEYSTORE_FILE:-}" ] || fail "BIGDROPS_KEYSTORE_FILE is not set. See docs/android-test-release-signing.md."
[ -f "$BIGDROPS_KEYSTORE_FILE" ] || fail "Keystore file not found: $BIGDROPS_KEYSTORE_FILE"

printf '[1/4] Web build (NODE_OPTIONS=--max-old-space-size=12288)\n'
NODE_OPTIONS="--max-old-space-size=12288" bun run build

printf '[2/4] Capacitor sync (android)\n'
bunx cap sync android

printf '[3/4] Gradle assembleRelease (stable test-release signing)\n'
(cd "$ROOT/android" && ./gradlew assembleRelease)

printf '[4/4] Verify APK\n'
[ -f "$APK" ] || fail "Expected APK not found: $APK"

BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
APK_BYTES=$(wc -c < "$APK" | tr -d ' ')
APK_HUMAN=$(ls -lh "$APK" | awk '{print $5}')

printf '\nTest-release build OK\n'
printf 'APK path: %s\n' "$APK"
printf 'APK size: %s bytes (%s)\n' "$APK_BYTES" "$APK_HUMAN"
printf 'VersionCode: %s\n' "${BIGDROPS_VERSION_CODE:-1}"
printf 'VersionName: %s\n' "${BIGDROPS_VERSION_NAME:-1.0}"
printf 'Build finished (UTC): %s\n' "$BUILD_TIME"
