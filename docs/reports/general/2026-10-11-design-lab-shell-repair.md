# Design Lab Shell Repair Report

Date: 2026-10-11.
Scope: Repair Design Lab responsive architecture, navigation controls, and shell theme integration. Approved atmospheric background and compact card preserved.

## Drawer root cause

- The drawer, provider, callback, and trigger path are route-independent and shared: `MobileChromeContext` (provided by Layout around page content) exposes `openSidebar`, which sets Layout state consumed by the route-independent `MobileSidebar` sheet. Design Lab calls the identical `openSidebar` path as the proven dashboard and `MobilePageHeader` triggers.
- The evidenced defect is the desktop-visible hamburger. Page CSS `.dlab-menu{display:grid}` is unlayered, while Tailwind's `md:hidden` lives in the utilities cascade layer. Unlayered author CSS wins at equal specificity, so the trigger stayed visible on desktop, where `MobileSidebar` is unmounted inside the shell's `md:hidden` container and no drawer exists to open. One root cause explains the dead control and the duplicate desktop hamburger together.
- Fix: keep the shared context trigger unchanged and add an explicit unlayered `@media (min-width:768px){.dlab-menu{display:none}}` rule, which deterministically matches the shell contract (`DesktopSidebar` renders `hidden md:flex` with no collapse mode). No second drawer, no local open state, no event-path duplication.

## Header alignment correction

- The old flex header centered both 44px controls against the combined title-plus-subtitle block, so they sat low.
- New structure: a `dlab-headrow` flex row holds the menu, the title, and the toggle at center alignment, with the subtitle as a separate `dlab-sub` line indented under the title (flush on desktop where the menu hides). Buttons now align with the title row on every viewport.

## Responsive architecture

- Mobile: single-column collection, compact header, working drawer trigger, shared appearance toggle, bottom navigation clearance, safe-area padding.
- Fold and tablet: two-column collection from 600px without using desktop breakpoints.
- Desktop: sidebar authority untouched, no hamburger, 960px capped collection, denser cards and larger title from 1024px.

## Removed redundant controls

- Bespoke Sun and Moon toggle replaced by the shared `ThemeToggleButton`, which reads and writes the same global preference as the dashboard, including System mode and persistence.
- Thumbnail glow dot removed. Investigation found `SidebarToggleIcon` is a static morph icon, the moon control is the wanted shared toggle, and the only Design Lab-specific dot-like decoration is the thumbnail glow dot. If the reporter meant a different element, it needs a fresh pointer.

## Sidebar theme integration

- While Design Lab is mounted, an effect sets `data-dlab-nav` on the document root and mirrors twelve photo recipe values as `--dlab-nav-*` tokens with triplet conversion for `hsl(var(--...))` consumers.
- Page styles scope remapped surfaces, borders, and text onto the desktop `aside` and the single left-side sheet, the navigation drawer, with gradient and frosted-glass backgrounds. Active-route indication, tenant identity, structure, scrolling, permissions, and accessibility are untouched.
- Unmount removes the attribute and every mirrored token, so other routes keep the ordinary navigation appearance. No shared file was modified for this integration.

## Theme isolation

- Only `--dlab-nav-*` names are written to the document root. A test asserts no other token prefix can be written there, and `AppThemeManager` is never touched.

## Files changed this session

- Rewrote `src/pages/DesignLab.tsx` (header geometry, shared toggle, deterministic desktop menu hide, dot removal, atmospheric navigation effect and styles, desktop density).
- Extended `src/tests/critical/designLab.test.js` to 14 tests covering the drawer contract, header geometry, shared toggle, navigation scoping, dot removal, and three-tier responsive rules.
- Added this report.

All other dirty files predate this session and were preserved untouched. No shared navigation, theme, drawer, or production file was modified.

## Static verification

- `bun run typecheck`: passed.
- Focused tests, 68 passed and 0 failed: designLab (14), moreNavigation (7), photoHeroV2LightMode (10), productionComposition (6), themePrdContract (7), coldLaunchPreviewAtmosphere (6), coldLaunchProductionStartup (18).
- `git diff --check`: passed with no whitespace errors.
- Full critical suite still shows intermittent accounting and CPS failures that vary between identical-code runs and pass in isolation. They sit outside this task and no Design Lab, navigation, onboarding, or theme test fails.
- `bun run build` was not run (hardware policy). No browser or device interaction was performed.

## Remaining device checks

- Tap the mobile hamburger and confirm the real drawer opens and closes.
- Confirm header alignment and toggle behavior on a small handset in Amber Light and Slate Navy Dark.
- Confirm no hamburger on desktop, atmospheric sidebar and drawer per family and appearance, and ordinary navigation after leaving Design Lab.
- Confirm unfolded fold widths show readable two-column cards.
