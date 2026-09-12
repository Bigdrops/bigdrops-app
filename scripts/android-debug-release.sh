#!/bin/sh
# BIGDROPS Android debug APK build + timestamped GitHub Release upload.
#
# Runs the same build sequence as android:debug, then, if the GitHub CLI is
# installed and authenticated, creates a timestamped release and uploads the
# debug APK as an asset.
#
# Tag format: debug-YYYYMMDD-HHMMSS (UTC).
# No repository owner/name and no credentials are hardcoded. gh resolves the
# repository from the current Git checkout.
# Runtime: Bun only. No npm, yarn, or pnpm.
set -eu

fail() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
APK="$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"

printf 'Building debug APK (same sequence as android:debug)...\n'
sh "$SCRIPT_DIR/android-debug.sh"

[ -f "$APK" ] || fail "Expected APK not found: $APK"

command -v gh >/dev/null 2>&1 || fail "GitHub CLI (gh) is not installed. Install it, then run 'gh auth login'."
gh auth status >/dev/null 2>&1 || fail "GitHub CLI is not authenticated. Run 'gh auth login', then retry."

TAG="debug-$(date -u +%Y%m%d-%H%M%S)"
printf 'Creating GitHub Release %s and uploading APK...\n' "$TAG"

RELEASE_URL=$(gh release create "$TAG" "$APK" \
  --title "$TAG" \
  --notes "BIGDROPS Android debug build ($TAG, UTC).")

printf '\nRelease OK\n'
printf 'Tag: %s\n' "$TAG"
printf 'GitHub Release URL: %s\n' "$RELEASE_URL"
