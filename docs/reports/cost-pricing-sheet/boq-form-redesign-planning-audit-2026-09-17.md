# BOQ Form Redesign — Planning Input Audit

This report was written by Buffy on 2026-09-17 via Freebuff.

## Objective

Establish, read-only, what BOQ's form redesign builds on. Answer seven
questions about the facelift PRD's form direction, BOQ/RFQ coverage,
fold-awareness precedent, column management, current structure conflicts,
desktop-adaptive precedent, and available design tokens.

No code changed in this task.

## Skills used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## 1. What the form Design-direction folder actually shows

Location: `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/`

| Artifact | Format | Document type |
|---|---|---|
| `invoice-form-inline-slate-navy.html` | Interactive HTML mockup (phone-frame, live JS state, Slate Navy CSS variables) | Invoice |
| `invoice-form-inline.html` | Interactive HTML mockup | Invoice |
| `invoice-form-popup-v2.html`, `v3.html`, `popup-slate-navy.html` | Interactive HTML mockups (popup/sheet variants) | Invoice |
| `CSR Full-Page Live Form.html` + `.jsx` | Interactive HTML + JSX prototype | CSR |
| `CSR v2 Field Dossier.txt` | Notes/spec text | CSR |
| `Waybill Mobile M3 Live Form.txt` | Notes/spec text | Waybill |
| `waybill prototype.jsx` | JSX prototype | Waybill |
| `Client-page-top-kpi.html` | HTML mockup | Client page (not a form) |
| `overlays/form-overlays-android.html` | HTML mockup | Form overlays |

Confirmed facts about the direction:

- Format is interactive HTML mockups and JSX prototypes, not static
  wireframes and not just notes.
- Every form mockup is built against Invoice, CSR, or Waybill. No BOQ or
  RFQ form mockup exists. NOT SPECIFIED for BOQ.
- The Slate Navy inline mockup shows the full mobile pattern: single
  scrolling column, exposed section cards with uppercase section heads
  (Document / Bill To / Line Items / Commercial Terms / Totals / Notes &
  Terms / Bank), grouped item "workbench" banners with collapse toggles,
  per-line drag handles plus up/down nudge buttons, a dark row-total bar
  per line, a segmented control, a save FAB plus a footer button grid
  (Cancel / Draft / Save), bottom sheets with grip handles for pickers,
  and toasts.
- No breakpoints appear in the mockups beyond a phone frame
  (`width: min(100%, 430px)`) and one `max-width: 380px` tweak. The
  breakpoint system lives in `07-forms.md`, not the mockups.
- The `07-forms.md` spec references `Design-direction/form/invoice-form-2col.html`.
  That file does NOT exist in the folder. The reference is stale.

## 2. Does the PRD name BOQ/RFQ form redesign?

Largely no. Coverage detail:

- `07-forms.md` (the form spec) is written against invoice-style line
  items: Qty/Unit/Make/Rate/Part No./VAT %/Disc %/Row Total. It names
  "invoice forms, document creation, and data entry surfaces" as its
  scope. BOQ and RFQ are NOT named anywhere in `07-forms.md`. The field
  grid maps loosely (Qty, Unit, Make map directly; Rate ≈ SP) but the
  commercial model differs: BOQ has CP/SP with no VAT, discount, or WHT,
  so the PRD's VAT/Disc/Part-No fields do not apply as-is.
- `09-documents.md` names BOQ/RFQ and lists their content model
  (quantity-based line items, unit pricing, total cost breakdown, vendor
  responses for RFQ). This is content scope, not form-layout direction.
- `14-implementation-roadmap.md` lists "6.5 BOQ view UX" and "6.6 RFQ
  view UX" in Phase 5 — view UX, not form redesign. No BOQ form row
  exists in the roadmap.
- `19-column-manager-mobile.md` audits `src/components/ColumnManager.tsx`
  and specifies an Android-standard redesign (touch-target table with
  failing sizes, HTML5 drag-and-drop failing on touch).

Verdict: BOQ form redesign is covered only by generic document-form
rules plus the column-manager spec. No BOQ-specific form direction
exists. The BOQ form would be the first table-document form adapted to
this system.

## 3. What foldAwareness actually does

Three files exist:

1. `src/lib/native/foldAwareness.ts` — Capacitor plugin bridge
   (`registerPlugin('FoldAwareness')`). Exposes `getFoldInfo()`,
   `startFoldAwareness()`, `stopFoldAwareness()`,
   `onFoldInfoChanged()`, plus a web fallback that derives
   `widthClass`/`layoutMode` from `window.innerWidth`.
   `FoldInfo` includes `widthClass` (compact/medium/expanded/large/
   extra_large), `layoutMode` (mobile/tablet/desktop), posture flags
   (`isHalfOpened`, `isTabletop`, `isBookPosture`), and `foldBounds`.
2. `src/hooks/FoldAwareness.ts` — `useFoldAwareness()` React hook.
   Starts the plugin, subscribes to changes, re-queries on window
   resize, returns live `FoldInfo`.
3. `src/components/app/AndroidFoldAwareness.tsx` — a null-render
   component mounted once in `AppShell.tsx` (lazy). It writes the fold
   state onto `<html>` as data attributes (`data-layout-mode`,
   `data-width-class`, `data-separating-fold`, `data-tabletop`,
   `data-book-posture`, fold bounds as CSS variables).

Current CSS consumption (`src/index.css`): only shell max-width per
layout mode (`tablet: 1200px`, `desktop: 1440px`) and a
`--app-has-separating-fold` flag. That is the entire current fold
surface.

Usage in forms: none. `useFoldAwareness` is imported only by
`AndroidFoldAwareness`. No form reads fold state. There is NO
fold-aware form reference implementation. BOQ would be the first.

This matches the stated intent: responsive grow/shrink driven by CSS
data attributes — not split-screen dual-pane.

## 4. Column management in TableRowsEditor

Correction to the premise: `TableRowsEditor.tsx` has NO column settings
UI. It renders cards per row and conditionally shows fields by reading
`columns.filter(c => c.visible)` — visibility comes in as a prop. The
component has no toggle, reorder, or label-edit surface of its own.

The column manager the PRD flagged is `src/components/ColumnManager.tsx`
(721 lines, per the PRD's own audit). It serves invoice/quotation
line-item tables. Grep shows no BOQ or table-document page imports
`ColumnManager`. BOQ's visible columns come from
`getDefaultColumnsForDocument('boq')` in
`src/domain/table-document/templateRegistry.ts` (specification hidden by
default; the rest visible) persisted through `custom_fields.table_columns`.

So: the PRD's column-manager redesign targets a different component.
Whether it should extend to BOQ's table-document columns is NOT
SPECIFIED. BOQ currently has no column management UI at all — its
column visibility is only changeable by editing stored JSON.

## 5. BoqForm tab structure vs the mobile-first pattern

Current structure (`BoqForm.tsx`, reached via `BoqEditor.tsx` inside
`NewBoq.tsx` / `EditBoq.tsx` under the desktop `Layout` shell):

- Three `Tabs`: Details (title, number, date, vendor, notes), Rows
  (`TableRowsEditor` card list), Output (`BoqCustomizationPanel`, 46
  lines, plus a totals readout with the amount-in-words line).
- `TableRowsEditor` renders every row as an always-expanded Card:
  row-type Select, description, optional specification Textarea (80px
  min), qty/unit grid, make/brand, CP/SP grid, computed Profit readout,
  notes, plus up/down/delete icon buttons (8x8 ghost buttons — below
  the 44px Android minimum the PRD's column-manager doc flags) and a
  bottom Add Item / Add Section pair.

Where this fights the PRD's mobile pattern:

| Current | PRD mobile pattern | Conflict |
|---|---|---|
| Three tabs partition one document | One scrolling stack of exposed section cards | Tabs hide the totals/preview context while editing rows; the PRD pattern keeps sections inline and scrollable |
| Every row is a fully expanded card | Collapsed compact lines with a per-line total bar and progressive disclosure (sub-rows, extra fields) | A 20-row BOQ is a very long scroll of open cards; no collapse, no line-total bar |
| Icon buttons 32px (h-8 w-8) | 44x44px minimum touch targets | Below Android minimum |
| Row reorder via chevron taps only | Drag handle (long-press) + nudge fallback | Chevron-only is usable but not the specified pattern; no drag support |
| No bottom sheets inside the form | Bottom sheets (grip, max-height, safe-area padding) for pickers and overlays | Row editing and pickers are inline, not sheet-mediated; NOT YET BUILT for BOQ |
| No save FAB / footer action bar in BoqForm | Save FAB + Cancel/Draft/Save footer grid | Save actions live in BoqEditor's header, not the pattern's thumb zone |
| Desktop `Layout` shell wraps the editor | Capacitor-native shell with bottom nav offset | The form does not sit in the mobile navigation model at all |

What already matches or is close: per-row card grouping, section rows as
a distinct visual type, the totals block (now with amount-in-words), and
conditional field visibility. The Details tab's field inventory maps
cleanly onto the PRD's Document/Client exposed cards.

## 6. Desktop-adaptive precedent in other document forms

None found. Checked `InvoiceFormPage.tsx`, `QuotationFormPage.tsx`, and
the invoice/quotation components: no `layoutMode`/`widthClass`/fold
queries, no two-column desktop variant, no side-panel preview. The only
adaptation in the app is the shell-level max-width rule from
`data-layout-mode` in `index.css`.

The `07-forms.md` tablet/desktop tiers (3-col grids, left-form/right-
preview split, sticky header) are specified but NOT YET BUILT for any
document form. BOQ would be first, the same way it is first for the
PDF renderer migration. (The CSR full-page form mockup exists in
Design-direction but no adaptive implementation was found in `src/`.)

## 7. Available tokens/components vs needed-new

Already available:

| Asset | Where | State |
|---|---|---|
| Slate Navy palette | `invoice-form-inline-slate-navy.html` CSS variables + PRD `03-design-system.md` | Locked direction (light + dark) |
| shadcn/radix primitives | `src/components/ui/` — sheet (radix Dialog), tabs, card, input, label, select, textarea, button, numeric-input, collapsible, dialog, alert-dialog, switch, toast | In use app-wide |
| Bottom sheet surface | `src/components/ui/sheet.tsx` (radix side-sheet) + `DocumentSheet` wrapper used by BOQ's customize/more sheets | In use, but radix sheet is a side/center dialog — the mockups show a vaul-style draggable bottom sheet |
| vaul | NOT in `package.json` or `bun.lock` | NOT YET BUILT — would be a new dependency, or sheet.tsx gets bottom-sheet styling |
| Fold data attributes + CSS hooks | `AndroidFoldAwareness` + `index.css` data-attribute selectors | Working, minimally consumed |
| MD3-style ripples / snackbars | Not found in `src/` (feedback is toast-based) | NOT YET BUILT |
| Row total bar / exposed cards / group workbench patterns | Defined in `07-forms.md` + HTML mockups | Spec complete, no implementation for table documents |
| BOQ domain layer | `computeBoqTotals`, `computeRowProfit`, Decimal.js, column registry, `createEmptyTableRow` | Complete and safe to build UI on |
| Predictive back / elevation system | Capacitor PRD `12-capacitor-native.md` | Specified; app-level integration NOT SPECIFIED in code found |

Needed-new for BOQ's form specifically:

1. A table-document form section pattern (exposed cards for
   Details/Rows/Output replacing tabs).
2. Collapsed compact line rows with per-line profit/SP readout bar and
   progressive disclosure (BOQ variant of the invoice line-item grid:
   Description / Specification / Qty+Unit / Make / CP+SP / Profit).
3. A drag-to-reorder touch mechanism (or adoption of whatever the
   column-manager redesign lands on).
4. 44px touch-target pass on all row controls.
5. A column visibility surface for table documents (extend
   ColumnManager or new component) — scope NOT SPECIFIED in the PRD.
6. Save FAB + footer action bar integration with BoqEditor.
7. Bottom-sheet treatment for row editing/pickers (vaul or styled radix).
8. The fold/desktop adaptive tier for the form (first of any form).

## Verification

```
- bun run audit:load: not applicable (read-only task, no code changed)
- bun run typecheck: not applicable (read-only task)
- git status: clean of changes by this task
```

## Risks or limitations

- The stale `invoice-form-2col.html` reference in `07-forms.md` means the
  tablet/desktop tier has no visual reference; only the written spec.
- `BoqCustomizationPanel` is 46 lines and thin; its content was not
  audited field-by-field here.
- Waybill/CSR prototypes were not read in full; their pattern overlap is
  inferred from file type and PRD notes only.

## Deferred work

None. This is the planning input. Design/code work follows.
