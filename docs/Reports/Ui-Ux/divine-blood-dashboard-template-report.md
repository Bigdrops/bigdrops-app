# Divine Blood Dashboard Template Report

This report was written by opencode on 2026-08-15 via opencode CLI.

## Objective

Build the dashboard template for the Divine Blood design system.

The deliverable is a single self-contained HTML file.

It must demonstrate the design system in a real dashboard.

It must implement the dashboard requirements from `docs/prompts/prompt66.md`.

It must follow the design system in `docs/TEMPLATES/Designsdotmds/Divine-blood.md`.

## Scope

This report covers:

- The dashboard template build
- The dashboard sections
- The interaction hooks
- The responsive behavior
- The accessibility behavior
- The verification checks

This task changes template files only.

It does not change application code.

## Files Changed

- Added: `docs/TEMPLATES/htmltemps/Divine-blood/divine-blood-dashboard.html`
- Deleted: `docs/TEMPLATES/htmltemps/Divine-blood/1.html` (stray placeholder)
- Added: `docs/Reports/Ui-Ux/divine-blood-dashboard-template-report.md`

## Skills Used

- shadcn
- accessibility

## Documentation Standard

ADS-STE100 Simplified Technical English

## Changes Made

The file is a single self-contained HTML document.

It embeds all CSS and JavaScript.

It contains no external dependencies except Google Fonts.

### Dashboard Sections

The template contains these sections.

- KPI summary: Inflow, Balance, Volume, Pending items
- Ledger feed: client and details on the left, status on the right
- Audit trail: timeline with connected markers
- Activity carousel: horizontally scrollable cards
- Tips hero: rotating business tips
- Quick actions: FAB with compact popup menu

### Interaction Hooks

The template implements these hooks.

- `initCompanySwitcher`: tenant switcher in the sidebar
- `toggleCompanyMenu`: opens and closes the tenant menu
- `selectCompany`: switches tenant without a reload
- `renderFeed`: builds the ledger feed
- `renderAudit`: builds the audit timeline
- `renderActivity`: builds the activity cards
- `onNotifClick`: opens the document drawer for an activity
- `openDrawer` and `closeDrawer`: document drawer control
- `nextTip`, `prevTip`, `renderTipDots`, `resetTipInterval`: tips hero
- `setTheme`, `toggleTheme`: theme control

### Theme

The template has exactly two modes: Light and Dark.

The default follows `prefers-color-scheme`.

The choice is stored in `localStorage` under the key `db-theme`.

The toggle button switches modes and shows a toast.

### Responsive Behavior

Navigation depends on viewport width.

- Desktop: static sidebar at 1024px and above
- Tablet: drawer sidebar from 640px to 1023px
- Mobile: bottom navigation below 640px

The document drawer is 420px on desktop.

It becomes full width on mobile.

The layout supports 320px minimum width.

### Living Material

The template applies the Whisper level only.

It appears behind the tips hero at low opacity.

It never appears in data areas, metrics, or forms.

All animation stops under `prefers-reduced-motion`.

The tip rotation also stops under reduced motion.

### FAB Footprint

The FAB matches the reference footprint.

- Button: 48 x 48px
- Popup width: 220px
- Popup padding: 8px

The popup uses the Divine Blood styling, not the reference styling.

## Verification Result

- Template file: 58876 bytes
- Required IDs and hooks: present
- Required functions: present
- JavaScript brace balance: 0
- `bun run audit:load`: not run, no application code changed
- `bun run typecheck`: not run, no application code changed
- `git status`: added template and report, deleted stray placeholder
- `bun run build`: skipped due to hardware policy

## Risks or Limitations

- Berkeley Mono is a commercial font. The template uses the fallback stack only.
- The template is a design reference. It uses mock data.
- The tenant switch is client-side only. It does not fetch data.
- The template is not connected to the application build.

## Deferred Work

- Port the template into the application
- Connect the mock data to real application state
- Wire the tenant switch to real organization data
- Load Berkeley Mono when a license is available