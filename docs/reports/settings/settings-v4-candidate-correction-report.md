# Settings v4 Candidate Correction Report

This report was written by Buffy on 2026-09-07 via Freebuff.

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Review the selected Settings redesign candidate against the live Settings architecture. Remove the side drawer and the sun icon. Keep the rest of the v4 design unchanged.

## Scope

- Candidate file: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/settings/settings-redesign-candidate-v4-android.html`
- Design-direction artifact only. No production React/TypeScript code changed.

## Live Settings Architecture (Findings)

- `src/pages/Settings.tsx` renders `SettingsShell` (`src/components/settings/SettingsShell.tsx`) with groups from `src/pages/settings/settings-config.ts`.
- Mobile shell: drill-down. Header (sidebar toggle + "Settings" + search) is owned by the app shell through `MobileChromeContext`. Sections open as a list-to-detail view with a back button. There is no Settings-local side drawer.
- Desktop/tablet shell: sidebar nav plus content panel.
- Section set: 17 sections in 4 groups (Account, Workspace, Preferences, System). The v4 candidate matches this set.
- Theme control: `AppThemeSettingsSection.tsx` owns theme control inside the "Theme & Appearance" section. Presentation is a Light / Dark / System segmented Mode control plus theme presets. The Settings header has no standalone sun/moon toggle.

## Conflicts Found

1. Side drawer: v4 carried its own navigation drawer (`#drawer`, `#menuBtn`) for Settings sections. This competes with the live shell and with the app-level drawer placement rules in `16-context-switchers.md`.
2. Sun icon: v4 carried a sun/moon theme toggle button in the app bar (`#themeToggle`, `#themeIconSun`, `#themeIconMoon`). The live Settings theme control lives in the Theme section, not in a header toggle.

## Changes Made

Removed from the v4 candidate:

- The drawer element, its menu button, all `.drawer*` CSS rules, and the drawer entries in the reduced-motion block.
- Drawer JavaScript: `renderDrawer`, `markDrawerActive` (and its call), `drawerCloseUI`, `openDrawer`, the `drawer` branch in `popLayer`, the `.drawer.show` selector in `anyOverlayOpen`, the `menuBtn` and `drawerNav` event listeners, and the drawer layer in the back-stack comment.
- The sun icon, the paired moon icon, the `#themeToggle` button, its JavaScript listener, and the `.icon-btn` CSS that only supported the removed header buttons.
- Updated two comments (scrim comment, back-stack comment) so they no longer mention the drawer.

Not changed: typography, spacing, radius, colors, cards, section hierarchy, all 17 sections, sheets, dialogs, snackbar, search, presets, ripple, Android back-stack behavior.

Theme control presentation: the existing Theme & Appearance section already presents the live app semantics (Light / Dark / System segment plus presets). No new theme icon was added.

## Files Changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/settings/settings-redesign-candidate-v4-android.html` — 5 insertions, 115 deletions. The original content stays preserved in the git index (staged blob).

## Verification

- `grep` for `drawer`, `menuBtn`, `themeToggle`, `themeIconSun`, `themeIconMoon`, `icon-btn`: zero matches. Passed.
- Inline JavaScript extracted and checked with `node --check`: passed.
- Structure spot checks: app bar holds the title only; scrim sits directly before the bank sheet; `popLayer` unwinds sheet, dialog, section; reduced-motion block clean. Passed.
- `git status` before: two staged new files (v4 candidate, `record-capture.test.js`). `git status` after: same two staged files plus the unstaged v4 edit. `record-capture.test.js` untouched.
- `bun run build`, `bun run typecheck`, `bun run lint`: not run, per task instruction.

## Risks or Limitations

- The artifact no longer has a functional dark-mode preview switch. The Mode segment in Theme & Appearance shows the live presentation but does not apply `data-theme`. This matches the task scope; wiring it is deferred.
- The original v4 content is recoverable only from the git index until the staged file is committed.

## Deferred Work

- Optional: make the Mode segment apply `data-theme` so the candidate previews light/dark like the live app.
- Any decision to keep or discard the drawer concept in future candidate versions belongs to the Design Council.
