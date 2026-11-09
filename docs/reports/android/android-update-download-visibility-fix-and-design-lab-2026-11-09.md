# Android Update Download Visibility Fix and Update Modal Design Lab Report

This report was written by the Qoder agent on 2026-11-09 via Qoder Desktop.

Skills used: react-dev
Subagent used: Explore
Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Fix the Android in-app update download crash that showed `Invalid value for visibility: 2`. Add two contrasting update modal designs to the Design Lab.

## Scope

- Native APK download plugin (Android Java).
- Update orchestration hook and update banner/sheet copy.
- New Design Lab preview route `/design-lab/app-update-modal`.
- No database change. No financial logic change.

## Files changed

Modified:

- `android/app/src/main/java/com/bigdrops/app/plugins/ApkUpdatePlugin.java`
- `src/hooks/useAppUpdate.ts`
- `src/components/app/UpdateBanner.tsx`
- `src/components/app/UpdateSheet.tsx`
- `src/domain/appUpdate/updateStateMachine.ts`
- `src/lib/designLabPreviews.ts`
- `src/components/app/AppShell.tsx`

Added:

- `src/domain/appUpdate/downloadFailure.ts`
- `src/components/design-lab/app-update-preview-model.ts`
- `src/components/design-lab/app-update-structural.tsx`
- `src/components/design-lab/app-update-fluid.tsx`
- `src/components/design-lab/app-update-modal-preview.tsx`
- `src/pages/AppUpdateModalExperiment.tsx`
- `src/tests/critical/appUpdateDownloadFailure.test.js`

## Changes made

### Task A: download crash

- The plugin used `VISIBILITY_HIDDEN` (value 2). This value needs the `DOWNLOAD_WITHOUT_NOTIFICATION` permission. Without it, `DownloadManager.enqueue` throws. The plugin now uses `VISIBILITY_VISIBLE_NOTIFY_COMPLETED` (value 1). This value needs no extra permission.
- The plugin no longer sends raw Java exception text to the caller. It logs the raw message to logcat and rejects with a clean message.
- The hook maps native failures to safe user copy through `describeDownloadFailure`. It never shows `error.message` raw. This protects devices that still run the old native build.
- On a native download failure with a web release URL, the hook opens the web download automatically as a graceful fallback.
- `formatVersionLabel` renders `Latest` when the policy has no version name or code. The banner and sheet use it. This removes the lonely `v` prefix.

### Task B: Design Lab variants

- Variant 1 (Structural) keeps the bigdrops-free hairline-card structure, the kinetics pill action, and spring motion. The signal bar, action, and grace pill draw from `--primary`. Surfaces use `--card`, `--muted`, and `--border`. Text uses `--foreground` and `--muted-foreground`.
- Variant 2 (Fluid) keeps the water-melon organic shape: a 26px sheet radius, soft `--muted` panels, a grace progress ring (`stroke-border` track, `stroke-primary` arc), and a micro-animated action with glide motion.
- Both variants inject zero hardcoded color. They read only the app semantic theme tokens, so they flip correctly under the nested `.dark` wrapper and in the real app theme. The contrast between the two is now structure, shape, and motion, not an injected palette.
- Both variants simulate idle, downloading, ready, installing, installed, and failed states. Both support light and dark mode. Both use sentence case with no em dashes and no uppercase warning blocks. The failure notice uses a `--destructive` tint with `--foreground` text for legibility in both modes.
- The preview adds controls for variant, appearance, missing version, and simulated failure.

## Verification result

Verification:

- bun run audit:load: passed (exit 0; new files add no warnings; all under the 600-line limit)
- bun run typecheck: passed (0 errors). A concurrent agent's in-progress PDF forme edit showed two transient errors on the first run; they cleared on re-run. No error sits in a file changed here.
- Critical suites: 57 targeted tests passed (designLab, designLabViewports, productionComposition, appUpdateStateMachine, appUpdateDownloadFailure). Full critical run: 1439 tests, 1412 pass, 27 pre-existing failures unchanged (see limitations).
- git status: task-scoped changes only; pre-existing untracked scratch files preserved
- supabase db push: not applicable
- bun run build: skipped due to hardware policy

Rendered inspection (isolated Vite harness mounting the real preview component, DOM and computed styles, light and dark for both variants):

- Structural light: root background `rgb(252,252,253)` = `--card`, text `rgb(15,23,41)` = `--foreground`, border `rgb(215,223,234)` = `--border`, action and signal bar `rgb(31,77,214)` = `--primary`, action text `rgb(250,250,250)` = `--primary-foreground`, muted text `rgb(101,117,139)` = `--muted-foreground`.
- Structural dark: root background `rgb(19,23,32)` = dark `--card`, text `rgb(241,245,248)` = dark `--foreground`, action and signal `rgb(82,93,224)` = dark `--primary`, muted text `rgb(167,177,190)` = dark `--muted-foreground`.
- Fluid light: root `--card`/`--foreground`, grace-ring track `rgb(215,223,234)` = `--border`, arc `rgb(31,77,214)` = `--primary`, version chip `rgb(240,244,247)` = `--muted`.
- Fluid dark: root dark `--card`/`--foreground`, ring track `rgb(38,43,54)` = dark `--border`, arc `rgb(82,93,224)` = dark `--primary`, action dark `--primary`.
- Failure notice: light bg `rgba(208,37,37,0.1)` = `--destructive`/10 with `--foreground` text; dark bg `rgba(145,34,34,0.1)` = dark `--destructive`/10 with light `--foreground` text. Copy is sanitized; no raw Java text (`visibility`, `enqueue`, `Invalid value` absent).
- Missing version shows `Latest`. No em dashes and no uppercase warning blocks in either variant.
- A grep for hex, rgba, and named palette utilities across the three preview files returns no match.

## Supabase push status

Not applicable. No SQL or schema change.

## Risks or limitations

- The 27 test failures are pre-existing. They sit in CPS, CSR, document-share, accounting, and brand-rename text suites. None read the files changed here. The brand-rename failure expects `Download Android APK` but the source now reads `Download BOUXRE APK`.
- The native Java fix ships only with a new APK. Devices on the old build rely on the TypeScript sanitizer and web fallback until they update.
- The Design Lab route is auth-gated. Verification used an isolated Vite harness that mounts the real preview component without auth, then read rendered DOM and computed styles in light and dark for both variants, plus the failure and missing-version states. Pixel screenshots were not captured. The ready/installing/installed transitions were verified by code and typecheck rather than a timed end-to-end capture. The harness and dev server were removed after verification.

## Deferred work

- Adopt the chosen Design Lab variant into the production `UpdateSheet` after review.
- Rewrite the production grace-period copy (uppercase block and em dash) once a variant is approved.
- Rebuild and sign a new APK to ship the native visibility fix.