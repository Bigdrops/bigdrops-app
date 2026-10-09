# Android Launcher Icon — Official Export Replacement Report

Date: 2026-10-08
Scope: Android launcher branding resources only.

## Objective

Replace the previous custom-generated launcher pass (source: `wireframes/proposed-icon.png`,
commit `976c09cc`) with the dedicated Android icon export in
`docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/`.

## Export audit (before any change)

README and the export tree were read first.

Exact exported Android files discovered under
`docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/android/`:

| File | Dimensions | Format |
|---|---|---|
| `mipmap-mdpi/ic_launcher.png` | 48 × 48 | PNG, RGBA |
| `mipmap-hdpi/ic_launcher.png` | 72 × 72 | PNG, RGBA |
| `mipmap-xhdpi/ic_launcher.png` | 96 × 96 | PNG, RGBA |
| `mipmap-xxhdpi/ic_launcher.png` | 144 × 144 | PNG, RGBA |
| `mipmap-xxxhdpi/ic_launcher.png` | 192 × 192 | PNG, RGBA |
| `adaptive-foreground.png` | 1024 × 1024 | PNG, RGBA, transparent outer canvas, content bbox 174–849 (safe-zone layout), white corners inside the content square |

The export contains no round icon PNGs, no adaptive background image, and no
per-density adaptive foregrounds. README documents the adaptive background as
`#ffffff`. `appstore.png`, `playstore.png`, and `AppIcon.icon/` are store/iOS
assets and were not copied into Android resources.

## Source-to-destination mapping

Authoritative source: `.../icons/android/`
Destination: `android/app/src/main/res/`

| Source | Destination (×5 density buckets) |
|---|---|
| `mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher.png` | `mipmap-{…}/ic_launcher.png` |
| `mipmap-{…}/ic_launcher.png` (same bytes; export has no round variant) | `mipmap-{…}/ic_launcher_round.png` |
| `adaptive-foreground.png` (single 1024² file) | `mipmap-{…}/ic_launcher_foreground.png` |

The single supplied adaptive foreground was placed in every density bucket as a
byte-identical copy (no resizing, cropping, recoloring, or regeneration). Android
scales it at resource load time. `values/ic_launcher_background.xml` color was
changed `#020711` → `#ffffff` to match the export README's documented adaptive
background; `drawable/ic_launcher_background.xml` (unreferenced vector) was
updated to the same value for consistency.

## Launcher resource chain after implementation

- `AndroidManifest.xml`: `android:icon="@mipmap/ic_launcher"`, `android:roundIcon="@mipmap/ic_launcher_round"` (unchanged).
- API ≥ 26: `mipmap-anydpi-v26/ic_launcher.xml` and `ic_launcher_round.xml` → `@color/ic_launcher_background` (`#ffffff`) + `@mipmap/ic_launcher_foreground` (new export foreground). Both XMLs unchanged and valid.
- API < 26: density-specific `ic_launcher.png` / `ic_launcher_round.png` resolve directly to the new export artwork.
- `drawable-v24/ic_launcher_foreground.xml` bitmap alias → `@mipmap/ic_launcher_foreground` (resolves to new asset). `drawable/ic_launcher_background.xml` proven unreferenced (grep over `android/app/src`).

## Files replaced (17 tracked files)

- 5 × `mipmap-*/ic_launcher.png`
- 5 × `mipmap-*/ic_launcher_round.png`
- 5 × `mipmap-*/ic_launcher_foreground.png`
- `values/ic_launcher_background.xml` (`#020711` → `#ffffff`)
- `drawable/ic_launcher_background.xml` (fill `#020711` → `#ffffff`)

Stale resources removed: none by deletion. Every previous-pass launcher PNG was
overwritten in place, so no superseded BX artwork remains in any active launcher
path. No files were deleted from `res/`.

## Verification performed

1. Manifest icon/roundIcon references resolve (lines 16, 18). ✔
2. Both `mipmap-anydpi-v26` adaptive XMLs parse and reference `@color/ic_launcher_background` + `@mipmap/ic_launcher_foreground`; both targets exist. ✔
3. All five density buckets contain `ic_launcher.png` (48/72/96/144/192), `ic_launcher_round.png`, `ic_launcher_foreground.png`. ✔
4. SHA-256 proof of direct copying: every destination `ic_launcher.png` and `ic_launcher_round.png` matches its exported source hash per density; every destination `ic_launcher_foreground.png` matches `adaptive-foreground.png` hash (`c9848062e31d…`). Round icons are byte-identical to square icons because the export ships no round variant. ✔
5. All 15 PNG hashes differ from `HEAD` — no previous-pass asset survives in an active path. ✔
6. Pixel audit (stdlib PNG decode): exported legacy icons are full-bleed opaque with white corners; adaptive foreground is transparent outside the safe-zone content square with white corners — no baked launcher mask, so no second nested mask is created. ✔
7. Source export directory hashes unchanged after the copy (compare first audit vs post-run). ✔
8. `git status` / `git diff`: only the 17 launcher files above changed under `android/`. Unrelated pre-existing working-tree changes (CPS/invoice `src/` files, deleted PRD HTML files, new untracked docs) were present before this task and were not touched. ✔
9. `bun run typecheck`: passed (exit 0). ✔
10. `bun run audit:load` and `bun run build`: not run, per task rules.

## Skills used

Registered skills from `docs/PROJECTSKILLINDEX.md`: `capacitor-best-practices`,
`mobile-android-design`. Documentation standard: ASD-STE100.

## Limitations / on-device verification required

- No APK was built or installed. Final icon appearance (masking, parallax, round launcher behavior) needs on-device check; runtime verification was not performed.
- The single 1024² foreground is used for all densities; Android downsamples at load. If APK size matters, per-density downscaled copies could be generated later (not done here, to keep copies byte-identical to the export).
- `AppIcon.icon` (iOS 26) and store artwork were intentionally excluded from `res/`.
