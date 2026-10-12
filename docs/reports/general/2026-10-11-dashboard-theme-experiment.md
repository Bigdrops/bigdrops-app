# Dashboard Theme Experiment — Full-Viewport Repair

This report was written by Buffy on 2026-10-11 via Freebuff Desktop.

## Objective

Make the Design Lab dashboard experiment an immersive, full-viewport presentation. The production
dashboard itself is the experiment. The selected Design Lab theme drives every dashboard surface,
navigation element, and card.

## Root causes identified

The first implementation was rejected. Inspection found these causes.

1. Device frames. The preview rendered the dashboard inside a simulated device (`mobile`, `fold`,
   `tablet`, `desktop`) and drove structure from the frame width with a `ResizeObserver`. The
   dashboard was therefore a miniature inside a container, not the application viewport.
2. Oversized header. A `dte-frame-head` block rendered the experiment title, metadata chips, and an
   explanatory paragraph above the frame. It consumed vertical space before any dashboard content.
3. Permanent controls. The viewport, family, and appearance controls were always visible in the
   preview shell. The shell duplicated the palette and permanently occupied dashboard space.
4. Theme scope too narrow. The surface token layer was set on the device element. The production
   chrome that the app shell renders outside that element kept the Design Lab default. The page
   background changed, but the dashboard did not fully follow.
5. Copied markup. The dashboard was a re-typed mockup. Parts of it kept their own colour decisions,
   so unrelated themes showed amber or dark cards.
6. No appearance bridge. The preview cannot change `html.dark`. Dark-only rules in the dashboard
   kept the light values, and hardcoded trend colours stayed fixed.

## Preview shell corrections

- Removed the header block. Only a visually hidden `h1` and one `role="status"` line remain, for
  assistive technology.
- Removed the device frames, the bezel, the `ResizeObserver`, and the frame-width breakpoints.
- Mounted the production `Layout` (desktop sidebar, mobile drawer, bottom navigation) and the
  production `DashboardOverview` (header, KPI grid, recent activity, sections, audit trail) at the
  full available width. The dashboard keeps its own scroll flow.
- Removed all artificial scaling. No `transform: scale()` is used. No rule declares a numeric device
  width. A static test asserts both.
- Safe areas. The floating controls and the create action use `env(safe-area-inset-bottom)`. The
  dock sits above the bottom navigation and does not cover it.
- Compact floating palette. Two 44 px buttons, bottom left: the palette trigger and the exit button.
  One popover (`role="dialog"`) holds the five theme families and the light/dark pair. It closes on
  the close control, on Escape (focus returns to the trigger), and on an outside pointer-down. The
  dashboard is fully visible while the panel is closed.
- The dashboard's own create action and create panel are restored as presentation copies, offset
  above the bottom navigation, and show a preview-only notice.

## Theme-token integration

One root element (`.dte-root`) carries two token layers for the selected family and appearance.

1. Atmosphere. `getPhotoHeroVars(family, appearance)` supplies the scene gradient, the light fields,
   the glass recipe, and the chrome ink. `.dte-root [data-bd-shell="app"]` replaces the flat app
   background with the scene gradient. The dashboard header and its cards take the glass treatment.
2. Surface. `getThemePreset` and `getDarkVariantBundle`, plus the semantic tokens and
   `getDarkVariantSemanticTokens`, supply the same values that `AppThemeManager` writes to the
   document root, in the same HSL-triplet format. Every `hsl(var(--…))` consumer resolves.

Material surfaces keep an alpha channel, so the atmospheric canvas reads through the dashboard
itself. Light surfaces use alpha 0.72 to 0.88; dark surfaces use 0.5 to 0.74. Text tokens stay
opaque. Cards, navigation, panels, inputs, and controls therefore show the theme without washed-out
content.

Border tokens bind to the semantic `--line` and `--line-strong` triplets, because the normalizer
drops `rgba()` line values from the bundle.

The appearance bridge corrects the two trend colours that the dashboard hardcodes, and neutralises
its `dark:` variants in light appearance. Root `.dark` rules cannot follow a scoped preview, so the
preview states the appearance itself.

The preview seeds family and appearance once from the saved preference. It never writes it. The
appearance toggle inside the dashboard header changes preview state only.

## Responsive behaviour

Production Tailwind breakpoints and production safe-area utilities drive the layout from the real
viewport. The desktop sidebar and the six-card KPI grid appear at the production breakpoints, and
the bottom navigation serves the mobile layout. A real mobile device renders at its actual width. A
fold device, a tablet, and a desktop use the true responsive dashboard layout. No device mockup
shrinks a full-size dashboard to fit.

Viewport simulation was restored on 2026-10-11 and lives in the compact Customisation popover: the
actual device, Desktop, Fold open, Fold closed, Tablet, and Mobile. A simulated viewport applies its
documented layout width as a real CSS width and the experiment restates the production tiers against
a named container. Nothing is scaled; a wider preset scrolls horizontally. See
[2026-10-11-design-lab-viewport-restore-and-invoice-experiment.md](./2026-10-11-design-lab-viewport-restore-and-invoice-experiment.md).

## Files changed

New files:

| File | Purpose |
| :--- | :--- |
| `src/components/dashboard-theme/dashboard-theme-preview.tsx` | The experiment: themed root, mounted dashboard, floating palette, scoped stylesheet. |
| `src/components/dashboard-theme/preview-dashboard-data.ts` | Representative read-only dashboard data with production types. |
| `src/pages/DashboardThemeExperiment.tsx` | Route page. Renders the experiment only. |
| `src/tests/critical/dashboardThemeExperiment.test.js` | Focused static checks (17 tests). |

Modified files:

| File | Change |
| :--- | :--- |
| `src/components/dashboard/DashboardOverview.tsx` | Five optional slot props for provider-bound children. Production passes none of them, so production behaviour is unchanged. |
| `src/lib/designLabPreviews.ts` | One registry entry for the experiment. |
| `src/components/app/AppShell.tsx` | One lazy import and one route. |

No production dashboard file changed. `src/pages/Dashboard.tsx` is untouched. Onboarding V1 and V2,
Cold Launch, `TenantGate`, authentication, routing, Supabase schema, and business calculations are
untouched.

## Components reused

The real components are mounted, not copied: `Layout` (chrome, sidebar, mobile drawer, bottom
navigation), `DashboardOverview`, `KpiGrid` through its parent, `buildKpiCards`, `getCreateActions`,
and the formatters. Children that read Supabase-backed hooks — notification bell, global search,
payment reminder, alerts, audit trail — arrive through the new optional slots as read-only adapters.

## Skills used

Skills used: karpathy, tailwind-css-patterns, accessibility
Documentation standard: ASD-STE100 Simplified Technical English

`verification-before-completion` is not present in `docs/PROJECTSKILLINDEX.md`. The verification
gate in `.claude/agent-instructions/verification-gate.md` was used instead.

## Verification

```
Verification:
- git status --short: reviewed before and after the change
- bun run typecheck: passed (exit 0)
- git diff --check: passed (exit 0, no whitespace errors)
- focused tests: passed (39 of 39, exit 0)
    src/tests/critical/dashboardThemeExperiment.test.js  17 of 17
    src/tests/critical/designLab.test.js                 15 of 15
    src/tests/critical/moreNavigation.test.js             7 of 7
- bunx eslint (changed files): passed, 0 problems
- bun run lint (DashboardOverview.tsx): 2 pre-existing errors, identical at HEAD
- bun run audit:load: not run (no data-layer change)
- bun run build: not run (hardware gate)
- supabase db push: not applicable
```

Focused static checks performed:

| Check | Result |
| :--- | :--- |
| Full-viewport shell | Pass. No header block, no metadata, no device frame. |
| No artificial scaling | Pass. No `transform: scale()`. No numeric device width. |
| Compact palette controls | Pass. Two 44 px buttons, one dismissible popover, no permanent title. |
| Five theme families | Pass. Registry and palette expose all five. |
| Light and dark | Pass. Ten family and appearance combinations resolve both token layers. |
| Dashboard consumes the theme | Pass. Material tokens, borders, chrome, header, and cards bind to the selected theme. |
| CSS scope isolation | Pass. Every selector starts with `.dte-`. No `html`, `body`, or `:root` rule. |
| Responsive contracts | Pass. Production breakpoints, production content maximum, safe-area insets. |
| Production dashboard preserved | Pass. No output change when no slot prop is passed. |
| No data mutations | Pass. No Supabase import, no storage write, no preference write. |
| Single exit navigation | Pass. The only navigation returns to `/design-lab`. |
| Accessibility and motion | Pass. Dialog role, `aria-pressed`, `aria-expanded`, focus-visible, reduced motion, reduced transparency. |

## Visual checks still required

The route renders inside `AppShell`, which requires an authenticated session. No account and no
running dev server were available, so no viewport inspection occurred. These checks remain:

1. Open `More Options → Design Lab` and confirm the experiment card appears with the others.
2. Open it and confirm the dashboard renders at full size with no console error.
3. Cycle the five families in light and dark. Confirm cards, navigation, KPI grid, borders,
   gradients, and the create panel respond.
4. Confirm the bottom navigation stays usable and the floating controls do not cover it.
5. Confirm the theme in Settings does not change after any preview action.
6. Check contrast of the floating buttons against both glass recipes.

## Risks and limitations

1. Reuse boundary. The five slot props are the only shared-component change. They are optional and
   default to the production children. The change is additive and backward compatible.
2. Adapter copies. The header actions, reminder, alerts, and audit trail exist as preview adapters
   with production markup and spacing. Production changes to that markup do not flow into the
   preview.
3. Border tokens bind to the family line triplets, so preview borders are slightly more
   theme-tinted than production's `index.css` fallback.
4. Repeated breakpoints. The preview expresses a small number of production breakpoints in its own
   stylesheet. A future production change to those values must be repeated in the preview.
5. Pre-existing lint. `DashboardOverview.tsx` reports two unused-symbol errors at HEAD. They are
   unchanged and out of scope.
6. Concurrent work. Other agents hold uncommitted changes in `AppShell.tsx` and eleven other files.
   The edits to `AppShell.tsx` and `DashboardOverview.tsx` are additive only. No pre-existing change
   was reverted.
7. Pre-existing test failures. `bun run test` fails in unrelated files from other in-flight work.
   None of those files read an artifact this task changed.
