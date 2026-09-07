# Android Dashboard v6.3 Design Variant Report

This report was written by Kiro on 2025-01-31 via Kiro IDE.

## Objective

Create `mobile-dashboard-v6.3.html` as a Material Design 3 / Android design variant of `mobile-dashboard-v6.html`. Apply Android/MD3 visual patterns without changing colour tokens or JavaScript behaviour.

## Scope

- Single new HTML file under `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/dashboard/`
- No changes to any existing file
- Design-only prototype (not React/TypeScript)

## Files Changed

| File | Action |
|---|---|
| `docs/prd/…/dashboard/mobile-dashboard-v6.3.html` | Created |
| `docs/reports/ANDROID/android-dashboard-v6.3-design-variant.md` | Created |

## Skills Used

NONE

## Documentation Standard

ASD-STE100 Simplified Technical English

## Changes Made

### Colour tokens
Exact palette from v6.html copied verbatim into `:root` and `[data-theme="dark"]`. Zero colour values modified.

### Top App Bar
Replaced floating island topbar with a proper MD3 `CenterAlignedTopAppBar`. Menu icon on the left. Brand title and workspace label centred. Theme, notification, search, and AI icon buttons on the right. Background uses `var(--surface)` with a `1px solid var(--line)` bottom border.

### Navigation Bar
Replaced the floating rounded island nav with a full-width MD3 `NavigationBar` (80px tall, `border-top` divider). Active tab uses a pill-shaped indicator (`64px × 32px`, `border-radius: 16px`) that scales in via `scaleX` transform. No full-cell gradient fill on active tabs.

### Metric Cards
Removed pseudo-element circle overlays. Added a tonal rounded-square icon indicator (`28px`, `border-radius: 8px`) per card. Border radius set to `var(--metric-radius)` = `16px`. Collected card retains gradient fill. Card padding increased to `16px`.

### Activity List
Styled as an MD3 List. Row minimum height: `72px`. Icon containers changed from square-rounded to circular (`40px` diameter). Status chips updated to MD3 filled tonal: `border-radius: 9999px`, `font-size: 9px`, `padding: 3px 8px`.

### Payment Reminder Card
Removed conic-gradient circle decoration. Added tonal background using `color-mix(in srgb, var(--primary-soft) 60%, var(--surface))`. Icon container changed to circular `48px`. Record payments button changed to full-width MD3 `FilledButton` (`border-radius: 20px`).

### Alerts Strip
Changed from horizontal scroll cards to a stacked vertical MD3 list. Three alert items stacked. Each item: circular icon (`40px`) + text columns + time/status footer. No horizontal overflow.

### Audit Trail
Added a `::before` vertical connecting line on the `.audit` container. Dot size increased to `8px`. Font sizes: `audit-main: 11px`, `audit-meta: 9px`. Row padding increased to `12px 0`.

### FAB
Changed to `56px × 56px` with `border-radius: 16px`. Removed pulse ring animation. Uses a clean shadow. Positioned above nav bar.

### Bottom Sheet
Drag handle increased to `32px` wide. Transition uses MD3 emphasized decelerate spring: `cubic-bezier(0.05, 0.7, 0.1, 1.0)`.

### Navigation Drawer
Width: `min(80%, 320px)`. Each drawer row: `height: 56px`, `border-radius: 28px` (full pill per MD3 spec). Active row: `var(--primary-soft)` background.

### Typography
Section titles: `11px`, weight `600`, `letter-spacing: 0.02em`. Overall line heights increased slightly.

### Spacing
Content area padding: `0 16px`. Card internal padding: `16px`. Section `margin-top: 16px`. Card gap: `8px`.

### JavaScript
Full JS block from v6.html included verbatim. No logic changes.

## Verification Result

- bun run audit:load: skipped — design-only HTML file, no TypeScript changes
- bun run typecheck: skipped — no TypeScript changes
- git status: pre-existing changes untouched; only new files added
- bun run build: skipped due to hardware policy

File renders correctly in browser. All interactive behaviours functional (sheets, drawer, theme toggle, FAB, search, toast, tabs).

## Risks or Limitations

- HTML prototype only. Patterns shown here require separate implementation work to apply in the React/TypeScript app.
- `color-mix()` requires a modern browser (Chromium 111+, Safari 16.2+). This matches existing usage in v6.html.

## Deferred Work

- Implement MD3 navigation patterns in the Capacitor app shell
- Apply pill indicator to `BottomNavigation` React component
- Port MD3 card style to the shared `MetricCard` component
