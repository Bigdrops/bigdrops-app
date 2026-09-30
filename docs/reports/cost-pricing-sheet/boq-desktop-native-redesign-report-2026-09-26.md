# BOQ Desktop Native Redesign Report

This report was written by Antigravity on 2026-09-26 via Local Runner.

## Objective

Deliver a dedicated desktop layout for the Bill of Quantities (BOQ) full-page live form prototype. The layout uses full desktop screen real estate with a two-pane architecture, persistent sticky commercial summary, and high-density tabular data grid, while preserving the baseline single-column card stack for mobile and fold viewports.

## Scope

- Target file: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form.html`
- Breakpoint tiers:
  - Mobile (< 640px): 430px max width, single-column card stack, zero utility rail aura, hanging outside delete badge, bottom floating action button (FAB).
  - Fold / Tablet (640px to 959px): 720px max width, two-column Document Details, two-column Qty/Unit/Make and CP/SP data grid, centered modal dialogs.
  - Desktop (>= 960px): 1420px max width, two-pane multi-pane desktop architecture:
    - Primary working pane (left): five-column horizontal Document Details grid, high-density line item data grid with dedicated table header, preserved physical Slate Navy group envelope.
    - Persistent sticky sidebar (right): Commercial totals summary, Gross Profit hero banner, margin indicator, Amount in Words block, primary Save CTA.
    - Top application header: Back button, BOQ title and number pill, draft badge, theme toggle, and desktop action buttons (Columns, Import JSON, Clear All, Save BOQ).
- Accessibility and touch target fixes across all breakpoints:
  - Guaranteed 44px minimum touch targets via pseudo-element hit-boxes on `.ear`, `.mbtn`, `.idx`, `.gchev`, `.ear2`, `.theme-toggle`, `.x`, and `.subtog`.
  - Added `aria-label` attributes to every icon-only button across the document.

## Files Changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/boq/BOQ Full-Page Live Form.html`

## Skills Used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

1. **Desktop Multi-Pane Architecture**:
   - Introduced `.layout-main` structured into `.pane-working` (left working area) and `.pane-sidebar` (right sidebar).
   - Configured desktop CSS Grid to allocate `minmax(0, 1fr) 360px` with 24px column gap.
   - Pinned `.pane-sidebar` with `position: sticky; top: 18px;` to maintain totals visibility during list scrolling.

2. **High-Density Line Item Data Grid on Desktop**:
   - Added `.desktop-grid-head` displaying `#`, `Description & Specification`, `Qty · Unit · Make`, `Unit CP · SP`, `Line Profit`, and row actions.
   - Configured desktop `.item` rows as CSS Grid (`36px minmax(220px,2.2fr) minmax(170px,1.3fr) minmax(160px,1.2fr) minmax(135px,1.1fr) 34px`) with `display: contents` on `.utop` and `.item-data-row` for direct column alignment.
   - Converted `.ear` into an inline desktop table action with hover feedback while maintaining mobile hanging badge positioning on narrow screens.
   - Maintained 2px solid Slate Navy group envelope, group header gradient, and footer button.

3. **Desktop Persistent Toolbar**:
   - Created `.desktop-actions` inside the header containing `Columns`, `Import`, `Clear`, and `Save BOQ` actions.
   - Hid mobile FAB on desktop viewports (`display: none !important`).

4. **Accessibility & Touch-Target Enhancements**:
   - Added 44px minimum hit-boxes using `::after` pseudo-elements on all compact buttons (`.mbtn`, `.ear`, `.gchev`, `.ear2`, `.theme-toggle`, `.x`).
   - Added descriptive `aria-label` attributes to all icon-only buttons including row deletion, row reordering, row duplication, group expansion, group removal, dialog close buttons, and switch toggles.

5. **Appearance Modes & Commercial Calculations**:
   - Maintained complete light (`:root`) and dark (`[data-theme="dark"]`) token system.
   - Preserved locked commercial calculation rules: `Profit = (SP - CP) * Qty`, no VAT, no WHT, and global sequential item numbering.

## Verification

- bun run audit:load: skipped (prototype HTML file only)
- bun run typecheck: skipped (prototype HTML file only)
- git status: verified only intended files modified
- supabase db push: not applicable
- bun run build: skipped due to hardware policy

## Supabase Push Status

Supabase push status: not applicable (no SQL or schema changes).

## Risks or Limitations

- The HTML prototype is a standalone reference implementation for UI/UX review before component integration into React.

## Deferred Work

- Integrate multi-pane desktop layout and table-like item row patterns into React components (`BOQForm.tsx`, `BOQGroupCard.tsx`, `BOQItemCard.tsx`).
