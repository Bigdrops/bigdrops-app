# Dashboard Visual Facelift Report

This report was written by Buffy on 2026-09-04 via Freebuff.

## Objective

Apply a visual facelift to the BIGDROPS dashboard components and fix a bottom navigation bug where the active tab appeared to disappear.

## Scope

Colors and visual treatment only.

Excluded on purpose:
- layout
- spacing scale
- component structure
- navigation model
- responsive behavior
- interaction logic
- 2-column KPI grid

## Files changed

- `src/components/layout/MobileBottomNav.tsx`
- `src/index.css`
- `src/components/dashboard/KpiGrid.tsx`
- `src/components/dashboard/DashboardOverview.tsx`
- `src/components/dashboard/PaymentReminderBanner.tsx`
- `src/components/dashboard/RecentAlertsCarousel.tsx`
- `src/components/dashboard/AuditTrailSkeleton.tsx`
- `src/components/document-view/shared/DocumentTopNav.module.css`
- `src/components/document-view/shared/DocumentMoreSheet.module.css`
- `src/components/document-view/invoice/InvoiceAdvanceSheet.module.css`
- `src/components/document-view/invoice/InvoicePaymentsSection.module.css`
- `src/components/document-view/waybill/WaybillSummaryStrip.module.css`
- `src/components/document-view/shared/DocumentActionButtons.module.css`
- `src/components/document-view/shared/FloatingDownloadButton.module.css`
- `src/components/document-view/shared/DocumentPreview.module.css`
- `src/components/document-view/shared/DocumentHero.module.css`
- `src/components/document-view/invoice/InvoiceDocumentCard.tsx`
- `src/components/project/ProjectDocumentCard.tsx`
- `src/components/list/DenseListCard.tsx`
- `src/components/list/EntityListCard.tsx`

## Skills used

NONE

## Documentation standard

ASD-STE100 Simplified Technical English

## Changes made

### Bug fix

Found the bottom navigation component at `src/components/layout/MobileBottomNav.tsx`.

Diagnosis:
- All five tabs always rendered. There was no `.filter`, no `.find`, and no conditional unmount.
- The active tab did not disappear from the DOM.
- The reported symptom came from a visual contrast problem. The active button used a strong gradient, white text, and a large primary-tinted drop shadow on a `z-40` bar. On some theme/nav backgrounds, the icon and label became hard to see.

Fix:
- Replaced the one-off gradient and color treatment with the existing semantic nav tokens already defined in the theme system.
- Active state now uses `bg-[hsl(var(--bd-nav-active-bg))]`, `text-[hsl(var(--bd-nav-active-text))]`, and icon color keyed to `hsl(var(--bd-nav-active-icon))`.
- Inactive state now uses `text-[hsl(var(--bd-text-muted))]` and `hover:bg-[hsl(var(--bd-nav-hover-bg))]`.
- The nav rendering was not restructured.

### Token additions

Added three standardized UI text tone tokens in `src/index.css`:
- `--bd-ink`
- `--bd-ink-muted`
- `--bd-ink-icon`

Both the light and dark root blocks define them. They map to the existing `bd-text`, `bd-text-muted`, and `primary` bridge tokens. They are used for consistent UI text and icon color only.

### Visual treatment

Applied consistently where appropriate:
- KPI cards and metric tiles moved toward layered box shadows plus a subtle inset highlight instead of a single 1px stroke.
- Buttons and interactive controls moved toward a soft drop shadow plus a subtle inset top highlight instead of a flat solid fill or a visible hard border.
- List row dividers moved toward a low-contrast track token instead of a high-contrast border color.
- Bottom nav stayed solid/near-solid. No glassmorphism was added.
- Text colors were standardized to the new ink/muted/icon tokens where they had been inconsistent.

### Coverage

This pass covered:
- MobileBottomNav
- Dashboard top bar
- Top bar icon buttons
- KPI cards
- Recent activity rows
- Payment reminder banner
- Recent alerts carousel
- Audit trail rows and skeletons
- Dense list cards
- Entity list cards
- Document top nav icon buttons
- Document more sheet action rows and pills
- Invoice advance sheet options and computed box
- Invoice payments section card and rows
- Invoice document card inline text colors
- Waybill summary strip and row separators
- Document action buttons
- Floating download button
- Document preview card and hero
- Project document card and its action buttons

### Typography

Typography was tightened within the locked font stack only:
- Titles and headings: tighter line-height and negative letter-spacing where applied.
- Section headers and eyebrows: uppercase with controlled tracking.
- Body and labels: compact and readable.
- Locked font stack preserved: Manrope for UI text, DM Mono for numeric values.

## Verification

- bun run audit:load: passed
- bun run typecheck: passed
- git status: working tree reflects only the files above for this pass

## Risks or limitations

- Visual effect is best confirmed in a running build.
- Some decorative gradients still use `hsl(var(--primary))` and `hsl(var(--secondary))`. Those were left in place because they are decorative accents, not text contrast tokens.
- Token adoption was selective. Some components still use older hardcoded color patterns.

## Deferred work

- Broader token normalization across the rest of the codebase.
- Coverage of form surfaces, data tables, dedicated document view UX, overlays/sheets, and PDF surfaces in a later pass.
- PRD extension work was done in parallel under `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/22-facelift-pass-coverage-note.md` and related chapter notes.
