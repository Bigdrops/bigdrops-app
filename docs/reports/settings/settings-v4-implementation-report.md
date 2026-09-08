# Settings v4 Implementation Report

This report was written by Buffy on 2026-09-07 via Freebuff.

Skills used: tailwind-css-patterns
Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Implement the approved Settings v4 design. Restore the Company Switcher to the v4 candidate. Present theme presets vertically. Apply the v4 visual direction to the production Settings. Keep all existing behavior.

## Scope

- v4 candidate: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/settings/settings-redesign-candidate-v4-android.html`
- Production Settings: shell, nav, section frame, theme section.

## Findings in Production Settings

- `Settings.tsx` already renders a Company Switcher context card (`workspaceContext`) at the top of the list view. It shows the active workspace and active company from `useWorkspace` / `useEntity`. Switching runs through the existing `WorkspaceSwitchSection` and `CompanyManageSection` sections. No new switching architecture was needed.
- Production has no Settings-local side drawer. The mobile header toggle opens the app shell sidebar through `MobileChromeContext`. Left as is.
- Production has no sun/moon header toggle in Settings. Nothing to remove.
- The Theme section preset picker is already a vertical grid (`grid grid-cols-1 sm:grid-cols-2`) with no horizontal scroll, carousel, or snap. It already meets the vertical-preset requirement, so the layout logic was not touched.
- Token map: `--radius` is 12px, so `--bd-radius-xl` (16px) is the production card radius token closest to the v4 18px spec.

## Candidate Changes

- Added a Company Switcher context card to the candidate home view. It mirrors the live `workspaceContext` card: avatar initial, workspace name, company name, Current badge. Display only. Switching stays in Switch Workspace and Company Management, as in production.
- Replaced the horizontal preset strip with a vertical stack. No horizontal scroll, no carousel, no snap. Each preset row shows the color swatch, preset name, and a check on the selected row. Selection logic, preset data, and Light / Dark / System mode semantics unchanged.
- The side drawer and the sun/moon header toggle stay removed.

## Production Changes

- `src/components/settings/SettingsNav.tsx` (list variant only): group items now sit in v4-style cards — `--bd-radius-xl` radius, border, `bg-bd-surface`, `shadow-sm`, internal dividers. Rows get a 52px minimum height. Group titles use the v4 label scale (9px, extrabold, 0.105em tracking). Row titles 13px bold; row descriptions 10px medium. Pressed state uses the muted surface. Sidebar variant unchanged.
- `src/components/settings/SettingsSectionFrame.tsx`: section title set to the v4 17px extrabold -0.05em scale; description set to 10px medium. Back button and content surface behavior unchanged.
- `src/components/settings/SettingsShell.tsx`: header title set to the v4 app bar scale (16px bold, -0.02em).
- `src/pages/settings/AppThemeSettingsSection.tsx`: the Light / Dark / System Mode control now uses the v4 segmented style (muted container, 3px padding, active segment on card background with shadow). The `onClick` logic, `saveThemePref` call, and mode labels are unchanged. Preset grid layout untouched.

## Behavior Preservation

- Company and workspace switching: existing providers and sections, unchanged.
- Section navigation, back navigation, responsive drill-down, desktop sidebar: unchanged.
- Theme mode and preset selection: same handlers, same persistence through `ThemePreferenceContext`.
- All 17 Settings sections and their actions: untouched.
- No business logic replaced with static behavior.

## Verification

- `bun run typecheck`: passed (exit 0, no errors).
- `bun run audit:load`: not run. The task did not touch schema, query, or data-layer logic.
- `bun run build`: not run, per the hardware policy.
- Candidate inline JavaScript checked with `node --check`: passed.
- Candidate `grep` for `overflow-x`: zero matches. No horizontal scrolling remains.
- `git status` before: v4 candidate (staged + unstaged edits from the prior correction), staged `record-capture.test.js`, untracked reports.
- `git status` after: same pre-existing items, plus this task's four Settings files and this report.

## Concurrency Note

- `components.json` became modified during this session. The change adds a `@pdfcn` registry and matches another agent's untracked `pdfcn` reports. This agent did not modify it and did not revert it.

## Risks or Limitations

- Row descriptions at 10px and group titles at 9px follow the locked PRD type scale; they are smaller than the previous 11px/10px sizes. Verify legibility on small devices.
- The production preset grid keeps two columns on screens of 640px and wider. It is a grid without scrolling; a single-column-only variant would be a design decision for the Design Council.

## Deferred Work

- Broader v4 token adoption across other Settings sections (form controls, summary cards) remains open for later passes.
- The `components.json` concurrent change belongs to the pdfcn workstream and is outside this task.
