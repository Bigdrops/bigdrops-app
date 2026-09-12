#!/bin/sh
# BIGDROPS Android debug APK build (GitHub Codespace / local).
#
# Sequence:
#   1. Web build with the required 12GB Node heap setting.
#   2. Capacitor sync for Android.
#   3. Gradle assembleDebug.
#   4. Verify the expected APK and print its exact path.
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
APK="$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"

cd "$ROOT"

[ -f "$ROOT/android/gradlew" ] || fail "android/gradlew not found. Is the android/ platform folder present?"

printf '[1/4] Web build (NODE_OPTIONS=--max-old-space-size=12288)\n'
NODE_OPTIONS="--max-old-space-size=12288" bun run build

printf '[2/4] Capacitor sync (android)\n'
bunx cap sync android

printf '[3/4] Gradle assembleDebug\n'
(cd "$ROOT/android" && ./gradlew assembleDebug)

printf '[4/4] Verify APK\n'
[ -f "$APK" ] || fail "Expected APK not found: $APK"

BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
APK_BYTES=$(wc -c < "$APK" | tr -d ' ')
APK_HUMAN=$(ls -lh "$APK" | awk '{print $5}')

printf '\nDebug build OK\n'
printf 'APK path: %s\n' "$APK"
printf 'APK size: %s bytes (%s)\n' "$APK_BYTES" "$APK_HUMAN"
printf 'Build finished (UTC): %s\n' "$BUILD_TIME"
