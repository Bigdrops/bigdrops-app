# Local Dev Notes

Quick reference for localhost-only features and build tricks.

## Debug Routes (localhost only)

| Route | Purpose |
|-------|---------|
| `/debug/tenant` | Tenant debug panel (works everywhere) |
| `/debug/errors` | Error registry viewer — polls `errorRegistry` every 2s, shows all captured errors with copy/dump |

`/debug/errors` is gated to `localhost` in `AppShell.tsx`. Won't appear in production or deployed previews.

## GitHub Codespace Build

Large repos blow past the default Node heap on Codespace VMs. Use:

```bash
NODE_OPTIONS=--max-old-space-size=12288 bun run build
```

## Android Debug APK (one command)

```bash
bun run android:debug
```

One command. Runs the full sequence: web build with the 12 GB heap setting, `bunx cap sync android`, then `./gradlew assembleDebug`. It stops at the first failed stage. It prints the exact APK path and size when done.

APK output:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Optional publish to a timestamped GitHub Release (`debug-YYYYMMDD-HHMMSS`) with the APK attached:

```bash
bun run android:debug:release
```

Requires the GitHub CLI, installed and signed in (`gh auth login`). It prints the release URL. Requires no emulator, no Android Studio, and no manual APK hunt.