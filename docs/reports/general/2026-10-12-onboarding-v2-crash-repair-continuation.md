# Onboarding V2 Continuation — Crash Repair and Completion

Date: 2026-10-12

Scope: Design Lab only. No change to production onboarding, production
authentication, Cold Launch, TenantGate, Supabase, dashboard logic, or invoice
logic.

## 1. Summary

A previous agent left an independent BOURXE Onboarding V2 in Design Lab. The
route failed at render with:

```
Something went wrong
Cannot read properties of undefined (reading 'width')
```

The work was continued, not restarted. The crash is repaired at its real cause.
Two further defects in the same unfinished work were found by runtime
measurement and repaired. The journey is now complete and was validated in a
browser.

## 2. Recovered Files (previous agent, preserved)

| File | State found |
| --- | --- |
| `src/components/onboarding-v2/onboarding-v2-preview.tsx` (1513 lines) | Complete-looking journey, two type errors, one of them the crash |
| `src/pages/OnboardingFreshPreview.tsx` | Thin route wrapper, correct |
| `src/lib/designLabPreviews.ts` | `onboarding-fresh` entry, route `/design-lab/onboarding-fresh` |
| `src/components/app/AppShell.tsx` | Route registered, lazy import present |
| `src/lib/designLabViewports.ts` | Shared viewport presets and hook, correct |
| `src/components/design-lab/viewport-stage.tsx` | Shared stage and switcher, correct |
| `src/components/design-lab/design-lab-viewport.css` | Shared frame surface, correct |

All of these were kept. Nothing was rebuilt and nothing was deleted.

The earlier handoff report
(`docs/reports/general/2026-10-11-independent-onboarding-v2.md`) describes a
different file set (`OnboardingV2Experience.tsx`, `OnboardingV2Preview.tsx`,
route `/onboarding-v2-preview`). That set no longer exists. An existing test
asserts that the old route stays deleted. The new file set is the live one.

## 3. Previous Agent's Incomplete Work

1. The viewport prop contract was broken (section 4).
2. One invalid SVG attribute caused a second type error (section 5).
3. The preview never ran a type check, so both errors stayed.
4. The welcome grid overflowed every narrow frame (section 6).
5. Simulated viewport modes did not change the composition (section 7).
6. Slide copy did not name Item Library, Cost & Pricing Sheets, or Teams
   (section 8).

## 4. Confirmed Crash Root Cause

The reported error came from `viewport-stage.tsx`:

```tsx
const simulated = viewport.width !== null
```

`ViewportStage` requires a resolved preset object:

```tsx
export function ViewportStage({ viewport, className, children }: {
  viewport: DesignLabViewport
  …
})
```

The Onboarding V2 preview passed a viewport **id** instead:

```tsx
const { viewportId, setViewportId } = useDesignLabViewport()
…
<ViewportStage viewportId={viewportId}>
```

So `viewport` was `undefined` inside the stage and the first `.width` read threw
`TypeError: Cannot read properties of undefined (reading 'width')`.

The state was correct. The prop was wrong. The other two experiments
(`dashboard-theme-preview.tsx`, `invoice-theme-preview.tsx`) pass
`viewport={viewport}` and were never affected.

Baseline `bun run typecheck` confirmed the break as a type error:

```
src/components/onboarding-v2/onboarding-v2-preview.tsx(439,22): error TS2322:
  Property 'viewportId' does not exist … Did you mean 'viewport'?
```

## 5. Exact Repair

`src/components/onboarding-v2/onboarding-v2-preview.tsx`:

1. Read the resolved preset from the shared hook and hand the stage the preset:
   `const { viewportId, viewport, setViewportId } = useDesignLabViewport()` and
   `<ViewportStage viewport={viewport}>`.
2. Removed the redundant `viewportId as DesignLabViewportId` cast and its now
   unused type import. The switcher receives the hook's typed id directly.
3. Replaced the invalid `textTransform="uppercase"` SVG attribute on the sales
   label with `style={{ textTransform: 'uppercase' }}` (second type error, and a
   React unknown-attribute warning at runtime).

No fallback width, no optional chaining, and no silent desktop substitution was
added. The initial mode stays `actual`, the documented default of the shared
hook (`DESIGN_LAB_DEFAULT_VIEWPORT_ID = 'actual'`).

## 6. Second Defect — Welcome Grid Overflow (found by measurement)

Measured on a real 390 px window in `actual` mode, before the repair:

| Element | Measured |
| --- | --- |
| `.ob2-welcome-grid` column track | 1888.7 px inside a 390 px frame |
| `.ob2-welcome-copy` / `.ob2-welcome-art` | 1889 px each |
| `.ob2-btn--primary` ("Get started") | 1791 px wide, centred label off-screen |

Cause: the mobile-first rules declared rows only
(`grid-template-rows:minmax(180px,1fr) auto`). The implicit column was therefore
sized `auto`, so the marquee row (`.ob2-ticker-inner{width:max-content}`, about
1890 px) set the track to max-content. The screen clipped the overflow, so the
primary label was invisible on a phone.

Repair: an explicit zero-minimum track on both stacked grids
(`grid-template-columns:minmax(0,1fr)` on `.ob2-welcome-grid` and
`.ob2-story-grid`) plus `min-width:0` on their grid children. The marquee still
overflows its own clipped `.ob2-ticker`, which is the intended behaviour.

After the repair, on the same 390 px window: one column of 346 px, CTA 248 px,
no overflow.

## 7. Third Defect — Simulated Modes Did Not Compose

The frame was the right width, but the composition came from the host window's
media queries. Measured in a 1280 px window before the repair:

| Mode | Frame | Welcome columns |
| --- | --- | --- |
| Actual | 1280 | 2 (desktop) — correct |
| Fold open | 673 | 2 (desktop) — wrong |
| Fold closed | 360 | 2 (desktop) — wrong |
| Mobile | 430 | 1 column of 1889 px — wrong |

Repair: the preview now restates its own tiers against the shared `dlv` size
container, exactly as the approved dashboard experiment does. Four container
blocks (`max-width:599`, `600–767.9`, `min-width:768`, `min-width:1024`) cover
the stacked composition, the two-column story and auth compositions, the
tablet paddings, and the display type scale. The blocks sit last in the
stylesheet so they win at equal specificity, and they only match while
`[data-dlv-sim]` is present. `actual` mode keeps the window media queries
untouched. Sideways clamps moved from `vw` to `cqw` (with the `vw` declaration
kept first as a fallback), so the frame — not the host window — sets the
measure. Nothing is scaled.

The dock and popover stay outside the stage and stay pinned to the real window
(measured at `left:12px` in every mode).

## 8. Remaining Work Completed

Slide copy now names the required product surface. Slide 1 covers multitenancy,
independent workspaces, and teams. Slide 2 names RFQ, quotation, Item Library,
Cost & Pricing Sheets, invoices, and payments. Logistics, VAT, WHT, accounting,
projects, and field service were already present.

The logistics truck now also carries the official BX mark. The approved
PhotoHero reference truck
(`BIGDROPS_Onboarding-PhotoHero-v2.html`) draws the official launcher artwork on
the cab, and the previous agent's own report claimed the same reuse, but the
code had only the BOURXE wordmark. The mark is the existing official asset from
`src/components/layout/bx-logo.tsx` (`bxLogoSrc`), placed on the cab door as an
SVG image inside a rounded clip path at the reference proportions. The artwork
is sized and clipped only. It is never recoloured or distorted.

The journey, the five slides, the truck, the separate auth screens, the palette,
and the six viewport modes were already implemented by the previous agent and
were kept as built.

## 9. Changed Files

| File | Change |
| --- | --- |
| `src/components/onboarding-v2/onboarding-v2-preview.tsx` | Crash repair, SVG attribute fix, grid overflow fix, container tiers, slide copy |
| `src/tests/critical/onboardingFreshV2.test.js` | New focused regression suite (13 tests) |

No tracked file was modified. No unrelated working-tree change was touched. The
throwaway browser harness used for validation was deleted, and the dev server
was stopped.

## 10. Verification Results

- `bun run typecheck` — passed. Before the repair it reported the crash and the
  SVG attribute. `bun run audit:load` was not run, as the task instructed.
- Focused run (95 tests, exit 0):
  `onboardingFreshV2`, `designLab`, `designLabViewports`, `photoHeroV2LightMode`,
  `dashboardThemeExperiment`, `invoiceThemeExperiment`, `moreNavigation`,
  `productionComposition`.
- Regression proof: reverting the stage prop to `viewportId={viewportId}` makes
  the new suite fail at
  "no experiment passes a viewport id where the stage requires a preset". The
  file was restored byte-identical (md5 match).
- `bun run test` (full suite): 1048 tests, 1033 pass, 15 fail. All 15 failures
  are in CPS, CSR, invoice-accounting, payment-accounting, source-transaction,
  remediation, and theme-toggle suites. None of those suites reads any file
  changed here; they belong to other agents' in-flight working-tree edits.
- `git diff --check` — clean. `git status --short` — only the two files above,
  plus the pre-existing dirty and untracked work of other agents.
- `bun run build` was not run.

## 11. Runtime Validation (performed)

The production route sits behind TenantGate, so it redirects to the production
sign-in screen without a session. Production authentication was not changed and
no credentials were used. The preview component was instead mounted alone
through a temporary Vite harness (deleted afterwards) with the application
stylesheet loaded, so `box-sizing` and global CSS matched production.

Measured results:

- Mount: no console error, no React warning, no error-boundary text.
- Six viewport modes: every mode resolves a preset; surface widths were exactly
  365/1440/673/360/834/430 px. No undefined viewport access, in two window sizes
  (390 px and 1280 px).
- Composition per mode: one column with the hidden auth stage on phone and
  fold-closed frames; two columns with the visible auth stage on tablet and
  desktop frames; no element wider than its frame in any mode.
- Display scale follows the frame: 32 / 36.55 / 41.7 / 56 / 64.8 px for
  fold-closed, mobile, tablet, fold-open, desktop.
- Customisation: five families and both appearances change the resolved tokens
  (scene gradient, ink, CTA) and the dock swatch; exactly one family, one
  appearance, and one viewport stay pressed; the popover opens and closes.
- Journey: welcome → five slides (distinct artwork per slide, counts 1/5 to
  5/5) → sign up → sign in → back to welcome; skip works; the password toggle
  switches the input type.
- Truck: the logistics slide renders a visible branded BOURXE vehicle with a
  live drive-in and bob transform, two wheels under a running `ob2-spin`, a
  moving road, and an animating waybill progress bar.
- Official BX mark: present on the cab, about 20 by 20 CSS pixels at the current
  scale, clipped by `ob2-truck-mark-clip`. Its `href` is the official asset and
  it answers `200 image/png`, so the mark is loaded and painted, not a broken
  image.
- Preview-only auth: a dispatched submit is cancelled
  (`defaultPrevented: true`), the URL does not change, and no Supabase code is
  reachable from the preview.

## 12. Runtime Validation Limitations

- Screenshot capture failed in this environment (the preview webview reported
  no composited frames). Visual judgement is therefore replaced by measured
  geometry and computed styles. A human must still look at the screens.
- Reduced-motion and reduced-transparency were verified in source only; the
  emulation was not available in the session.
- Height-based tiers (`max-height:650px`, the `dvh` frames) still follow the
  host window, because a container query cannot measure height. Adopt
  `container-type:size` before changing that.
- The production route itself was not reached, so the Design Lab error boundary
  was not exercised end to end. The component render is proven clean instead.

## 13. Outstanding Device Acceptance Checks

1. Open Design Lab → "Onboarding Experience (New)" on a device and confirm the
   entry card, route, and boundaries behave.
2. Confirm the welcome composition and the CTA on a narrow Android phone.
3. Confirm the sign-in and sign-up forms clear the keyboard on a short screen.
4. Confirm the truck motion reads well, and that reduced motion freezes it.
5. Confirm fold closed, fold open, tablet, and desktop frames on real hardware.
6. Confirm the outbound "Sign in" and "Create an account" paths still point to
   production only in the production flow, not in the preview.

## 14. Note on the Design Lab Entry Name

The entry keeps the id `onboarding-fresh` and the label
"Onboarding Experience (New)". The PhotoHero entry keeps the label
"Onboarding Experience". The two labels stay distinguishable, and the existing
Design Lab test that forbids a user-facing "V2" suffix still passes. The
component itself is named `OnboardingV2Preview`.
