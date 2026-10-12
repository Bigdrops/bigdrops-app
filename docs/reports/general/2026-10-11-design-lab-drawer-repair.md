# Design Lab Drawer Functional Repair Report

Date: 2026-10-11.
Scope: Make the top-left Design Lab navigation button open the real mobile drawer. No visual redesign, no theme changes.

## Exact root cause

The button consumed `MobileChromeContext` at page level, above the provider that carries the live drawer state.

- The single context instance is created in `src/components/Layout.tsx:65` and provided at lines 255-269 around Layout's content div.
- `src/pages/DesignLab.tsx` renders its own `<Layout>`, and its `useContext(MobileChromeContext)` call ran in the page component itself, which sits above that provider in the tree.
- React context flows downward only, so the page read the default value from the `createContext` call: `{ openSidebar: () => {}, sidebarOpen: false }`. Every tap invoked a no-op, and `aria-expanded` was permanently false.
- The working dashboard trigger (`DashboardOverview.tsx:193`) works because `Dashboard.tsx` renders it inside `<Layout>` children, below the provider. Same for `MobilePageHeader`, which Layout renders itself.

## Source evidence

- Provider placement: `Layout.tsx:255-269` wraps only the content div and its children.
- Broken read: former `DesignLab.tsx:84` (`useContext` at page top, `<Layout>` returned below it).
- Proven pattern: `Dashboard.tsx` nests the consumer inside `<Layout>`; DesignLab rendered `<Layout>` itself.
- Latent twin: `MoreOptions.tsx:62` reads the same context above its own `<Layout>` (line 131) with the same dead `onClick={openSidebar}` trigger (line 136). Left untouched as out of scope; flagged below as follow-up.

## Why earlier fixes failed

Alignment, visibility, callback, and header-composition changes all preserved the broken read position. The string `openSidebar` existed in source, so string-presence tests passed while the tap could never reach drawer state. The desktop-visible hamburger was a second, independent defect (unlayered page CSS defeating Tailwind's layered `md:hidden`), already fixed in the prior session.

## Minimal code changes

- Added `DesignLabMenuButton` in `src/pages/DesignLab.tsx`: a small child that reads `MobileChromeContext` and renders the identical button markup. It is mounted as `<DesignLabMenuButton />` inside the header, hence inside Layout's subtree and below the provider, receiving the live `openSidebar` callback and `sidebarOpen` state.
- Removed the page-level context read. Nothing else in the file changed: header geometry, toggle, cards, atmosphere, and navigation effect are untouched.

## Interaction verification performed

- True tap-to-open interaction could not be executed here. The repository has no DOM test runner (no jsdom, happy-dom, or testing library), no Playwright browsers installed, and the node test loader resolves but does not transform TSX, so React components cannot even be imported in tests, let alone mounted and clicked. Downloading a browser and Supabase-backed dev stack on the 4GB host was judged infeasible for this task.
- What was verified instead: typecheck passes; 69 focused tests pass, including a new test that pins the exact bug pattern (exactly one context read, located in the button component, rendered inside the `<Layout>` subtree). Static chain verified end to end: live `openSidebar` from Layout state reaches the button, and Layout's `MobileSidebar` already consumes that state through the proven sheet integration used by every working route.

## Tests and results

- `bun run typecheck`: passed.
- Focused suites, 69 passed and 0 failed: designLab (15, including the new provider-placement test), moreNavigation (7), photoHeroV2LightMode (10), productionComposition (6), themePrdContract (7), coldLaunchPreviewAtmosphere (6), coldLaunchProductionStartup (18).
- `git diff --check`: passed with no whitespace errors.
- `bun run build` was not run (hardware policy). Full-suite accounting and CPS flakiness noted in prior reports is unchanged and unrelated.

## Remaining mobile device acceptance

- Tap the top-left button on a phone and confirm the real drawer opens, links work, and backdrop, close, and Escape dismissal behave as on other routes.
- Reopen after close, then leave and return to Design Lab.
- Follow-up bug (same pattern, untouched): `MoreOptions.tsx` reads the drawer context above its own `<Layout>` and its menu button is equally a no-op.
