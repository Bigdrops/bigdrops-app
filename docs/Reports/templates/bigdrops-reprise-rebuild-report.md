# BIGDROPS Dashboard Rebuild in Reprise Design Language — Report

This report was written by Buffy on 2026-08-14 via Freebuff.

## Objective

Rebuild the BIGDROPS operations dashboard in the Reprise design language.

The content source is `docs/TEMPLATES/React-temps/Golden-dashboard.tsx`.
The design source is `docs/TEMPLATES/Designsdotmds/reprise.md`.

Every feature and data point from Golden-dashboard.tsx must stay present and functional.
The visual system must trace to reprise.md, not to the previous amber/serif execution.

## Scope

Two standalone template deliverables were produced.

- `docs/TEMPLATES/htmltemps/bigdrops-reprise-dashboard.html`
- `docs/TEMPLATES/React-temps/bigdrops-reprise-dashboard.tsx`

Both use mock data only. There is no Supabase, no routing, and no real BIGDROPS type integration.

## Files changed

- `docs/TEMPLATES/htmltemps/bigdrops-reprise-dashboard.html` — created.
- `docs/TEMPLATES/React-temps/bigdrops-reprise-dashboard.tsx` — created.
- `docs/TEMPLATES/htmltemps/reprise-dashboard.html` — fixed two latent layout bugs found during verification (full-width frame centering, mobile frame width override).
- `docs/reports/templates/bigdrops-reprise-rebuild-report.md` — this report.

## Skills used

- `.agents/skills/frontend-design/SKILL.md`
- `.agents/skills/tailwind-v4-shadcn/SKILL.md`
- `.agents/skills/tailwind-css-patterns/SKILL.md`
- `.agents/skills/accessibility/SKILL.md`
- `.claude/skills/ui-ux-pro-max/SKILL.md`
- `.claude/skills/webapp-testing/SKILL.md`

Documentation standard: ADS-STE100 Simplified Technical English

## Feature preservation

The following features and data are preserved in both deliverables.

### Workspaces

- Big Drops Enterprise Group (BDE)
- Apex Syndicate Holdings (ASH)

### Companies

- Sun & Shield Power (SSP)
- Pygar Logistics & Trade (PYG)
- Century Mining Co. (CMC)
- Helios Clean Energy UK (HCE)
- Zenith Global Shipping (ZGS)

The company switcher modal is scoped to the active workspace. This mirrors Golden-dashboard.tsx exactly. Switching workspace changes the visible companies.

### KPI metrics

- Cash Received
- Outstanding
- Created Today
- Expired Quotes

Each company has its own KPI values. Switching company updates the metrics.

### Other features

- Action Items feed
- Recent Ledger Documents
- Activity Trail
- Company switcher
- Workspace settings modal
- Quick-create menu (Invoice, Quotation, Waybill, CSR)
- Five main sections (Dashboard, Invoices, Projects, Analytics, Settings)
- Sidebar navigation with secondary items
- Notifications with unread count and clear action
- Search overlay
- Company provisioning form
- Dark-mode toggle (light is the default)

No Reprise demo content was imported. There are no bonds, no royalty coupons, and no allocation charts.

## Structural decisions

### Navigation

The bottom tab bar was replaced with a sidebar nav. Reprise uses a floating app-frame shell with a sidebar model. The sidebar suits the wide viewport and the five-section information hierarchy. A secondary nav group holds the document modules. On mobile the sidebar becomes a drawer with a hamburger trigger.

### Quick-create

The quick-create FAB was kept as a feature, but its position changed. On desktop the trigger is a "New document" button in the top bar. On mobile it is a floating action button. This keeps the feature while matching Reprise's component placement.

### Hero area

A hero banner for the active company sits at the top of the content column. It shows the company name, tax ID, status pills, and workspace context. The right rail uses a tabbed insight panel (Overview, Ledger, Analytics, Activity, Alerts) instead of a single scrolling column.

### Typography and tokens

The mono/sans duet from reprise.md is applied throughout. Hero titles, metric values, labels, and status pills use the mono stack. Body, nav, and card titles use the sans stack. Token values match the reprise.md Quick Start block verbatim.

## Token implementation note

The prompt asked for reprise.md tokens mirrored into `@theme`. The repository runs Tailwind 3.4.1, which does not support the Tailwind v4 `@theme` directive. Instead, the tokens are declared as CSS custom properties scoped under `.reprise-dashboard` in a component `<style>` block. The variable names and values are identical to reprise.md. Utilities reference them as `var(--color-*)`. This matches the pattern already used by the verified HTML template and by `reprise-dashboard.tsx` in this repository.

## Verification

The HTML version passed Playwright checks.

- Layout checks: 83/83 passed.
- No console errors.
- Interactions verified: company switch, workspace switch, provisioning, notifications, search, quick-create, section navigation, rail tabs, dark mode, mobile drawer.

The TSX version passed two Playwright suites through a temporary Vite harness.

- Layout and interaction checks: 27/27 passed.
- Feature parity checks: 39/39 passed.
- Final visual pixel checks: 8/8 passed.
- No console or page errors.
- `tsc --noEmit`: passed.

Scratch harness files were removed after verification.

## Risks or limitations

- The wallpaper and hero photos are remote Unsplash URLs. They are placeholders for brand artwork. Warm gradient fallbacks keep the ambience when offline.
- The company provisioning creates in-memory data only. A page reload discards it. This matches the standalone template scope.
- The `@theme` directive could not be used because the repository is on Tailwind 3.4.1. See the token implementation note above.

## Deferred work

- Replace the placeholder photography with the brand's own painterly golden artwork.
- Port the verified TSX template into the real app shell when the Supabase data layer is wired.
