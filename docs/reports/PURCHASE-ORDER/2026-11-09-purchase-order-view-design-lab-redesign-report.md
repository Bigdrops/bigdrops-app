# Purchase Order View Redesign and Component Provenance Report

This report was written by Antigravity on 2026-11-09 via Antigravity.

Skills used: redesign-existing-projects, tailwind-css-patterns, react-dev, typescript-advanced-types
Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Redesign the Purchase Order (PO) View page into a high-quality document-viewing experience. Construct and evaluate the redesigned PO View inside Design Lab first at `/design-lab/po-view`. Do not replace the production PO View during this task.

## Scope

- Comprehensive audit and comparison of existing PO View (`PurchaseOrderDetail.tsx`), CPS View (`ViewCps.tsx`, `CostPricingSheetViewPresentations.tsx`), and Invoice View (`ViewInvoice.tsx`, `InvoiceWorkspace.tsx`, `InvoiceDocumentCard.tsx`).
- Deep audit of design reference repositories (`docs/templates/water-melon.md`, `docs/templates/kinetics.md`, `docs/templates/bigdrops-free.md`).
- Implementation of the redesigned PO View inside Design Lab (`src/components/purchase-order-theme/`, `src/pages/PoThemeExperiment.tsx`).
- Full integration with the Onboarding V5 theme engine (5 theme families, Light/Dark appearance, 6 responsive viewports).
- Rigorous component provenance inventory documenting every selected component.
- Complete test suite (`src/tests/critical/purchaseOrderThemeExperiment.test.js`) and Playwright visual screenshot verification across all 6 viewports.
- No database change. No PO calculation change. No production PO route mutation.

## Files changed

### Modified:
- `src/lib/designLabPreviews.ts` (Registered `po-view` experiment in the Design Lab catalog with 6 viewports, 5 themes, and lifecycle simulation metadata).
- `src/components/app/AppShell.tsx` (Added surgical lazy import and route `<Route path="/design-lab/po-view" element={withBoundary(<PoThemeExperiment />)} />`).

### Added:
- `src/components/purchase-order-theme/preview-po-data.ts` (Representative Nigerian SME procurement fixtures: Schneider Electric Nigeria industrial switchgear schedule and TotalEnergies Marketing Nigeria fleet lubricants schedule).
- `src/components/purchase-order-theme/po-theme.css` (Scoped atmospheric theme styling, responsive container queries, Kinetics spring physics curves, and typography tokens).
- `src/components/purchase-order-theme/purchase-order-theme-preview.tsx` (Complete interactive PO View redesign with Onboarding V5 controls, telemetry strip, adaptive table/card line items, financial closeout, signatories, and collapsible audit trail).
- `src/pages/PoThemeExperiment.tsx` (Page wrapper for the Design Lab route).
- `src/tests/critical/purchaseOrderThemeExperiment.test.js` (Automated verification suite validating isolation, semantics, controls, responsive viewports, and provenance).
- `docs/reports/purchase-order/2026-11-09-purchase-order-view-design-lab-redesign-report.md` (This technical report).

---

## Component Provenance Inventory

The following inventory specifies every component used in the redesigned PO View, distinguishing components sourced from the three design references from those borrowed from CPS, Invoice, or existing shared UI infrastructure.

### 1. Components Sourced from Reference Documents

| Component | Source | Original Purpose | PO Application | Reuse Strategy | Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Table, TableHeader, TableRow, TableHead, TableCell** | `Water-melon` (`src/components/ui/table.tsx`) | Clean tabular layout with row borders and cell alignment | Main procurement line-item table for desktop, tablet, fold-open, and mobile-landscape viewports | Adapted with BOURXE token variables (`--line`, `--surface`, `--ink`, font-variant tabular numbers) | `po-theme.css`, formatters |
| **Badge** | `Water-melon` (`src/components/ui/badge.tsx`) | Status badge with variant background and border pills | Lifecycle status indicator (Draft, Issued, Closed, Cancelled, Archived) and snapshot tags | Adapted with semantic status colors matching BOURXE theme presets | `PURCHASE_ORDER_STATUS_LABELS` |
| **Item Card** (`Item`, `ItemTitle`, `ItemDescription`) | `Water-melon` (`src/components/ui/item.tsx`) | Mobile card row primitive for item lists | Mobile-portrait and fold-closed line-item presentation with quantity badge and rate callout | Adapted to procurement line items | `formatCurrency` |
| **Empty State** | `Water-melon` (`src/components/ui/empty.tsx`) | Minimal state container with icon and prompt | Zero line-item fallback and empty audit trail fallback | Rebuilt with BOURXE tokens | Lucide icons |
| **SpringCard & Damped Transition** | `Kinetics` (`src/content/body.html` lines 331–385, `public/css/effects-a.css`) | Critically damped spring transition (`cubic-bezier(0.34, 1.56, 0.64, 1)`) for zero-jank expansion | Expandable Activity History & Document Trail disclosure container | Adapted for CSS collapsible transitions | CSS custom properties |
| **Parameter Readout Strip** (`hero-readout`, `card-param`) | `Kinetics` (`src/content/body.html` lines 241–246, `public/css/hero.css`) | Monospace telemetry readout for physics properties (`damping`, `stiffness`) | Procurement telemetry strip displaying Line Items count, Subtotal, VAT rate, and Total Commitment | Rebuilt with BOURXE surface tokens and font-mono figures | Typography tokens |
| **Tactile Copy Action** (`copy-btn`) | `Kinetics` (`src/content/body.html` lines 355, 413, `effects-a.css`) | Tactile spring press and copy confirmation | One-click copy for PO Number and Vendor Email with checkmark feedback | Adapted with `navigator.clipboard` and toast state | `navigator.clipboard`, toast |
| **Device Frame Wrapper** (`Frame`) | `BigDrops Free` (`components/reui/frame.tsx`) | Multi-device simulation frame with bezel shadow | Outer preview stage frame inside Design Lab | Adapted to harmonize with `ViewportStage` | `ViewportStage` |
| **Separator** | `BigDrops Free` (`components/ui/separator.tsx`) | Semantic division rule | Section division between masthead, party cards, line items, and totals | Rebuilt as CSS border dividers using `--line` | `po-theme.css` |

### 2. Components Borrowed from CPS, Invoice & Shared UI Infrastructure

| Component | Source | Original Purpose | PO Application | Reuse Strategy | Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ViewportStage & ViewportSwitcher** | Shared Design Lab (`src/components/design-lab/viewport-stage.tsx`) | Multi-tier viewport simulator stage and selection bar | Host container for testing all 6 viewport tiers in Design Lab | Reused unchanged | `useDesignLabViewport`, `design-lab-viewport.css` |
| **Theme Engine Hook** (`useExperimentThemeStyle`) | Shared Design Lab (`src/components/design-lab/design-lab-theme.ts`) | Atmosphere vars and semantic surface tokens | Drives all scoped CSS custom properties for the active theme family | Reused unchanged | `photo-hero-v2-theme.ts`, `themePresets.ts` |
| **Dossier & Context Strip** | CPS View (`src/components/cps/CostPricingSheetViewPresentations.tsx`) | Executive header separating issuer identity from document context | Top masthead with company monogram, issuer details, and PO identity bar | Adapted for outgoing procurement commitment | `po-theme.css` |
| **Closeout Totals Card & Words** | CPS View & Invoice View (`InvoiceDocumentCard.tsx`, `CostPricingSheetViewPresentations.tsx`) | Prominent summary of financial obligations | Bottom financial summary: Amount in words, delivery site notes, and totals card | Adapted to PO financial breakdown (Subtotal, Discount, Charges, VAT, Total) | `formatCurrency` |
| **Party Information Grid** | Invoice View (`src/components/document-view/invoice/InvoiceDocumentCard.tsx`) | Structured display of issuer and counterpart parties | Issuer (From) vs Supplier / Vendor (Order To) with frozen snapshot badge | Rebuilt with procurement semantics (supplier snapshot frozen at creation) | `po-theme.css` |
| **ConfirmActionDialog** | Shared Document UI (`src/components/ConfirmActionDialog.tsx`) | Accessible modal confirmation for irreversible actions | Lifecycle status transitions (Issue PO, Close PO, Cancel PO, Archive, Restore) | Reused unchanged | Radix Dialog primitives |

---

## Design Decisions & Adaptations

1. **Procurement Semantics vs Sales Invoicing**:
   - A Purchase Order is an outgoing procurement commitment issued by BOURXE to a vendor. It is not customer-facing.
   - Replaced customer labels with **Supplier / Vendor**.
   - Added explicit **Frozen Snapshot** indicator on the supplier card. The PO preserves vendor identity as frozen history.
   - Used `unit_cost` exclusively. Never interchanged with `unit_price`.
   - Kept the four independent PO states: `draft`, `issued`, `cancelled`, and `closed`, plus `archived`.

2. **Elimination of Dashboard Card Clutter**:
   - The legacy `PurchaseOrderDetail.tsx` stacked 6 generic cards with thick borders and empty gaps.
   - The redesigned PO View unifies content into a singular document sheet (`.po-sheet`) with subtle elevation, clear typographic hierarchy, and purpose-built sections.

3. **Adaptive Line-Item Presentation**:
   - On Desktop, Tablet, Foldable open (673px), and Mobile landscape (844px), line items display in an executive tabular format with right-aligned monospace numbers.
   - On narrow screens (Mobile portrait 430px, Foldable closed 360px), the view transitions automatically to structured item cards (`.po-mobile-item-card`), preventing horizontal overflow and cramped text.

4. **Telemetry Readout Strip**:
   - Sourced from Kinetics parameter readouts, the strip provides instant visibility into procurement scope, gross subtotal, applied discount, VAT percentage, and total commitment.

5. **Kinetics Spring Physics**:
   - Interactive buttons feature spring feedback (`active:scale(0.96)` with `cubic-bezier(0.34, 1.56, 0.64, 1)`).
   - Activity History accordion uses smooth spring expansion without layout thrashing.
   - One-click copy actions provide tactile confirmation.

---

## Responsive Viewport Implementation & Evidence

All 6 required viewport configurations were implemented and visually verified using Playwright Chromium headless rendering:

1. **Mobile Portrait (430 × 932 px)**:
   - Single-column layout.
   - Supplier snapshot stacked cleanly below Issuer block.
   - Line items render as mobile cards with badge indicators.
   - Totals and Amount in Words stack vertically.
   - Actions sit in a thumb-zone accessible action bar.
   - *Evidence: `scratch/po-screenshots/1-mobile-portrait.png` (34.5 KB)*.

2. **Mobile Landscape (844 × 390 px)**:
   - Compact masthead with horizontal metadata.
   - Two-column party grid.
   - Full tabular line-item display with responsive horizontal scroll if needed.
   - Side-by-side totals summary.
   - *Evidence: `scratch/po-screenshots/2-mobile-landscape.png` (25.0 KB)*.

3. **Foldable Closed (360 × 800 px)**:
   - Ultra-compact phone tier.
   - No horizontal text clipping or overflow.
   - Clean mobile cards and accessible touch targets (minimum 36px).
   - *Evidence: `scratch/po-screenshots/3-fold-closed.png` (26.6 KB)*.

4. **Foldable Open (673 × 840 px)**:
   - Medium phone tier.
   - Side-by-side party grid (Issuer and Supplier).
   - Full tabular line-item display.
   - Closeout grid with Amount in Words on left and Totals Card on right.
   - *Evidence: `scratch/po-screenshots/4-fold-open.png` (48.3 KB)*.

5. **Tablet (834 × 1112 px)**:
   - Tablet composition tier.
   - Generous margins and breathing room.
   - Full 6-column line-item table.
   - Dual-signatory block side-by-side.
   - *Evidence: `scratch/po-screenshots/5-tablet.png` (74.6 KB)*.

6. **Desktop / PC (1440 × 900 px)**:
   - Full executive document sheet constrained to 1080px max-width with auto margins.
   - Complete masthead, telemetry strip, table, closeout, and authorization signoffs.
   - Sticky top chrome and bottom action controls.
   - *Evidence: `scratch/po-screenshots/6-desktop.png` (77.8 KB)*.

All screenshots were generated and copied to the conversation artifact directory:
`C:\Users\DELL\.gemini\antigravity\brain\e511f9de-c4cd-4e4c-9090-aa437f3443a6\`

---

## Verification Result

Verification:
- `bun run audit:load`: passed (all 1,010 files scanned; new files introduce zero queries, zero bloat, and zero load risk).
- `bun run typecheck`: passed (0 new errors. 3 pre-existing errors in untouched PDF forme test files unchanged).
- `bun test src/tests/critical/designLab.test.js`: passed (15 pass, 0 fail).
- `bun test src/tests/critical/purchaseOrderThemeExperiment.test.js`: passed (7 pass, 0 fail).
- `git diff --check`: passed (clean whitespace, code 0).
- `git status`: task-scoped changes only; all pre-existing concurrent changes preserved.
- `supabase db push`: not applicable (no SQL or database schema change).
- `bun run build`: skipped due to hardware policy (4GB RAM constraint).

## Supabase Push Status

Not applicable. No SQL migration or database schema change.

## Risks or Limitations

- The production PO View (`src/pages/PurchaseOrderDetail.tsx`) was intentionally left unmodified, as instructed by the user request. Migration to production will take place only after user evaluation and approval of the Design Lab prototype.
- Pre-existing test failures in other modules (settings, brand rename, forme templates) belong to concurrent agent working-tree tasks and were preserved untouched.

## Deferred Work

- Await stakeholder review of the Design Lab PO View at `/design-lab/po-view`.
- Following approval, adapt production `PurchaseOrderDetail.tsx` to mount the new presentation components with live Supabase tenant data.
