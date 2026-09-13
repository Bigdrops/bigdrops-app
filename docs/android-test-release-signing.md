# Android Stable Test-Release Signing

App ID `com.bigdrops.app` is fixed. GitHub test releases use a stable
test-release key. Local debug builds still use the machine-local debug
keystore and need no secrets.

## Required GitHub Secrets (one-time human setup)

Create these in GitHub repo Settings → Secrets and variables → Actions:

| Secret name | Content |
| --- | --- |
| `BIGDROPS_KEYSTORE_BASE64` | Base64 of the test-release keystore file |
| `BIGDROPS_KEYSTORE_PASSWORD` | Keystore password |
| `BIGDROPS_KEY_ALIAS` | Key alias inside the keystore |
| `BIGDROPS_KEY_PASSWORD` | Key password |

Web build secrets (same Actions secrets page; without these the APK
shows a white screen because `src/supabase.ts` throws at startup):

| Secret name | Content |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL (same value as local `.env`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key (same value as local `.env`) |

## One-time key creation (maintainer machine only)

Run once on a trusted machine. Never commit the output files.

```bash
keytool -genkeypair -v \
  -keystore bigdrops-test-release.keystore \
  -alias bigdrops-test \
  -keyalg RSA -keysize 2048 -validity 9125 \
  -storepass 'CHOOSE-LONG-PASSWORD' \
  -keypass 'CHOOSE-LONG-PASSWORD' \
  -dname "CN=BIGDROPS Test Release, OU=Mobile, O=BIGDROPS"

base64 -w0 bigdrops-test-release.keystore > keystore.b64
```

Copy `keystore.b64` into `BIGDROPS_KEYSTORE_BASE64`. Store the passwords
in the matching secrets. Delete the local copies or keep them in a vault.
Back up the keystore: loss means a new app identity and no in-place updates.

## Versioning

Workflow `build-android-test-release.yml` sets:

- `versionCode = 1000 + github.run_number` (monotonic, always above legacy 1)
- `versionName = 1.0.<run_number>` (human readable)

Local builds default to `versionCode 1`, `versionName 1.0`.

## Distribution

- Manual: Actions → Build Android Test-Release APK → Run workflow.
- Tagged: push tag `test-release-*` to build and attach the APK to a
  GitHub Release automatically.
- Artifact name: `BIGDROPS-test-release-<versionName>-run<run>-<sha>.apk`.

## Transition

Phones with an old random-debug APK need ONE final uninstall before the
first stable-signed install. Later stable test releases update in place
while the app ID and key stay fixed and versionCode rises.

## Safeguards

- No key, keystore, or password lives in Git.
- Workflow never echoes secret values.
- Temp keystore is `chmod 600` and deleted after the build (`always()`).
- `.gitignore` blocks `*.jks`, `*.keystore`, `*.p12` at root and in `android/`.
- No Google Play signing or publishing is configured.
