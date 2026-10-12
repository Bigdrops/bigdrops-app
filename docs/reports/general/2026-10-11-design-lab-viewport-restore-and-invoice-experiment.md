# Design Lab Viewport Restore and Invoice Form Theme Experiment

This report was written by Buffy on 2026-10-11 via Freebuff Desktop.

## Objective

Two sequential tasks:

1. Restore viewport switching in the Dashboard Theme Experiment.
2. Add a separate Invoice Form Theme Experiment that uses the same switcher.

Both experiments keep the immersive presentation. The Design Lab shell gets no viewport switcher.

## Original viewport implementation recovered

The previous viewport feature lived in `dashboard-theme-preview.tsx`. That file is not tracked by
git, and the repair that removed the feature also rewrote the file. No archived copy exists
(`grep` over the working tree, the git objects, and the temporary directory found none).

The presets were therefore recovered from repository evidence, not invented:

| Evidence | What it fixes |
| :--- | :--- |
| `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/02-mobile-first-model.md` | Phone canonical width 430. A folded foldable behaves as a phone. Foldable unfolded 500–700 typical. Tablet 768–1024 typical. Desktop 1024+. |
| `src/lib/native/foldAwareness.ts` | The width classes and layout modes that run in production: compact <600, medium <840, expanded <1200, desktop ≥1200. |
| `src/components/cold-launch/preview-tree-geometry.ts` | The phone frame fallback `390 x 844` used by the Cold Launch preview. |
| `docs/reports/general/2026-10-04-cold-launch-concept-diversity-report.md` | Phone 360–430, fold open 640–900. |
| `src/components/settings/settings.css` | The project's device-simulation pattern: a `container-type: inline-size` surface with `@container` rules. |
| `docs/prd/.../Design-direction/form/invoice/*` | The project's viewport naming convention: desktop and mobile-fold candidates. |

The recovered presets are Mobile 430, Fold closed 360, Fold open 673, Tablet 834, Desktop 1440.
A control for the actual device is always present.

## Dashboard restoration details

- The shared switcher sits in the existing compact Customisation popover, with the theme family and
  the light/dark controls. No new toolbar exists.
- The default remains the actual device, so the experiment opens at full available size.
- A simulated viewport applies its documented layout width as a real CSS width. Nothing is scaled.
- The surface becomes a named size container. The experiment restates the production layout tiers
  against that container: sidebar against bottom navigation, page header, and the KPI grid columns.
- When a preset is wider than the host, the stage scrolls horizontally instead of shrinking the
  dashboard.
- The floating Customisation controls stay outside the simulated surface, so they remain reachable.
- The rejected oversized header, the metadata block, and the shrunken default presentation do not
  return.

## Shared viewport architecture

| Module | Role |
| :--- | :--- |
| `src/lib/designLabViewports.ts` | The preset table, the tier model, `useDesignLabViewport()` (per-experiment state), and the reset to the actual device. |
| `src/components/design-lab/viewport-stage.tsx` | `ViewportSwitcher` (controls) and `ViewportStage` (the surface a preset applies to). |
| `src/components/design-lab/design-lab-viewport.css` | Surface sizing, the named `dlv` container, the horizontal inspection path, and the compact control styling. |
| `src/components/design-lab/design-lab-theme.ts` | The shared two-layer theme builder, moved out of the dashboard preview so both experiments use one implementation. |

Each experiment owns its own selection state. Switching one experiment cannot move the other.
`src/pages/DesignLab.tsx` imports none of these modules.

## Invoice Form reuse strategy

The experiment mounts the production form presentation:

- `SharedDocumentForm` — the exact component the invoice route renders. It supplies the top bar,
  document identity, line items, commercial terms, totals, notes and terms, the desktop action rail,
  the mobile action bar, the actions sheet, and the column manager.
- `useInvoiceEditableState` — the production editing state for client selection, document details,
  dates, line items, groups, quantities, pricing, tax controls, discount, and notes.
- `useInvoiceColumns`, `computeDocument`, `buildCalculationInputs`, and `numberToWords` — the
  production column model and the financial source of truth, used read-only.
- `PdfOutputSettings` — the production output-settings section.

Four collections and the signature selection are preview-local, because the route seeds them from
tenant reference data: header fields, additional fields, extra charges, and reference links.

Tenant access is neutralised. The form mounts an inert, network-free tenant client. Reads resolve an
empty result instead of starting a request. The context value comes from a new data-layer-free
module (`src/lib/tenant/entityContext.ts`), so the Supabase client stays out of the experiment's
module graph. The production entity provider is unchanged.

The production theme toggle inside the document top bar writes the saved user preference. The
experiment hides that one control, because the experiment owns appearance. This is a fidelity
limitation, and it is recorded below.

## Theme integration

Both experiments use one shared layer on their root element:

1. Atmosphere — `getPhotoHeroVars(family, appearance)`: the Design Lab canvas.
2. Surface — the theme registry bundle and the PRD semantic tokens in production HSL-triplet format,
   so every `hsl(var(--…))` consumer resolves.

Material surfaces keep an alpha channel, so the family canvas reads through cards, panels, inputs,
and navigation. Text tokens stay opaque. Border tokens bind to the semantic line triplets.

For the invoice form the layer drives the form background, section surfaces, inputs, selects, date
fields, line-item rows, dialogs, borders, typography, buttons, the action bars, and the focus ring.
A family change moves the form tokens, not only the page background.

## Files changed

New files:

| File | Purpose |
| :--- | :--- |
| `src/lib/designLabViewports.ts` | Shared viewport presets, tiers, and selection hook. |
| `src/components/design-lab/viewport-stage.tsx` | Shared switcher and viewport surface. |
| `src/components/design-lab/design-lab-viewport.css` | Shared surface and control styles. |
| `src/components/design-lab/design-lab-theme.ts` | Shared Design Lab theme layer. |
| `src/lib/tenant/entityContext.ts` | The entity context and value type, without data-layer imports. |
| `src/components/invoice-theme/invoice-theme-preview.tsx` | The Invoice Form Theme Experiment. |
| `src/components/invoice-theme/preview-invoice-data.ts` | Representative invoice data with production factories. |
| `src/components/invoice-theme/preview-entity-context.tsx` | Inert entity provider for the previews. |
| `src/components/invoice-theme/preview-tenant-client.ts` | Inert, network-free tenant client. |
| `src/pages/InvoiceThemeExperiment.tsx` | Route page. |
| `src/tests/critical/designLabViewports.test.js` | Preset, tier, and isolation checks. |
| `src/tests/critical/invoiceThemeExperiment.test.js` | Invoice experiment checks. |

Modified files:

| File | Change |
| :--- | :--- |
| `src/components/dashboard-theme/dashboard-theme-preview.tsx` | Viewport stage and switcher, the container tiers, the tier-based KPI cap, and the shared theme layer. |
| `src/lib/designLabPreviews.ts` | The invoice experiment entry, and the viewport capability text. |
| `src/components/app/AppShell.tsx` | One lazy import and one route. |
| `src/lib/tenant/contexts.tsx` | Reads the context from the new module and re-exports the moved types. |
| `src/tests/critical/dashboardThemeExperiment.test.js` | Viewport coverage, and the shared theme-module references. |

No production dashboard, invoice form, calculation, save path, or theme file changed behaviour.

## Static verification

```
Verification:
- git status --short: reviewed before and after
- git log --oneline: inspected for the removed viewport feature (file is untracked, none found)
- bun run typecheck: passed (exit 0)
- git diff --check: passed (exit 0)
- focused tests: passed (62 of 62, exit 0)
    dashboardThemeExperiment.test.js   19 of 19
    invoiceThemeExperiment.test.js     15 of 15
    designLabViewports.test.js          6 of 6
    designLab.test.js                  15 of 15
    moreNavigation.test.js              7 of 7
- bunx eslint (new and changed files): passed, 0 problems
- bun run audit:load: not run (no data-layer change)
- bun run build: not run (hardware gate)
- supabase db push: not applicable
```

Focused checks:

| Check | Result |
| :--- | :--- |
| Dashboard viewport switcher restored first | Pass. Shared switcher in the Customisation popover; static tests assert it. |
| Five viewport modes | Pass. Desktop, Fold open, Fold closed, Tablet, Mobile, plus the actual device. |
| Independent viewport state | Pass. Each experiment calls the hook for itself; no cross-import exists. |
| No global Design Lab switcher | Pass. `DesignLab.tsx` contains no switcher symbol. |
| Invoice experiment registered | Pass. Registry entry and route asserted. |
| Real invoice form mounted | Pass. `SharedDocumentForm` with the production editing hook and the full prop set. |
| Form structure fidelity | Pass. 41 form props asserted, including line items, tax, charges, terms, and actions. |
| Five families and light/dark | Pass. Ten combinations resolve the form tokens; four family tokens differ for all five families. |
| Safe interactions | Pass. No save hook, no Supabase import, no storage, no mutation call; four actions show a notice. |
| CSS isolation | Pass. Every experiment selector starts with `.ite-` or is gated to the simulated surface. |
| Responsive contracts | Pass. Three container tiers, no scale transform, safe-area insets, horizontal inspection. |
| Dashboard regression protection | Pass. The dashboard experiment keeps its switcher and its desktop tier. |

## Remaining visual checks

The routes render inside `AppShell`, which needs an authenticated session. No account and no running
dev server were available, so no viewport inspection occurred. These checks remain:

1. Open `More Options → Design Lab` and confirm both new cards appear.
2. Dashboard: switch all five viewports and confirm the sidebar, the bottom navigation, and the KPI
   columns change. Confirm the actual-device control returns to the full viewport.
3. Dashboard: switch a family and an appearance in a simulated viewport, and confirm the cards,
   navigation, and header follow.
4. Invoice: switch viewport, family, and appearance, and confirm the form surfaces, inputs, and
   action bars follow. Confirm the desktop rail appears only at the desktop tier.
5. Confirm the selected viewport of one experiment does not move the other.
6. Confirm the theme in Settings does not change after any preview action.
7. Check contrast of the floating controls against both glass recipes.

## Risks and limitations

1. Simulated viewport fidelity. Production CSS media queries answer to the host window. Each
   experiment restates the structural tiers it owns against the named container, so the sidebar, the
   navigation, the KPI grid, the document grid, and the action bars follow the simulated width. Deep
   leaf rules that use viewport media queries (for example a field grid's `sm:` rule) still follow the
   host window. Nothing is scaled to hide that difference.
2. Controls outside the surface. The floating controls stay on the real viewport so they remain
   reachable while a wide preset scrolls. They are not part of a simulated device.
3. Inert tenant data. Suggestions, client lists, and the signature list are representative, not live.
   The preview never queries tenant data.
4. Hidden theme toggle. The experiment hides the production theme toggle inside the document top
   bar, because that control writes the saved preference.
5. Edit mode is not previewed. The experiment mounts create mode only, so the identity lock dialog
   and the locked-field behaviour are not represented.
6. `contexts.tsx` keeps six pre-existing lint errors. The count is unchanged: the moved types and the
   context do not add one.
7. Pre-existing test failure. `src/tests/critical/onboardingV2Independent.test.js` fails at import
   time under the Node test loader (`ERR_UNKNOWN_FILE_EXTENSION` for `.tsx`). It fails with and
   without this change and belongs to another agent's in-flight work.
8. Concurrent work. Other agents hold uncommitted changes in `AppShell.tsx` and eleven other files.
   My edits there are additive, and no pre-existing change was reverted.
