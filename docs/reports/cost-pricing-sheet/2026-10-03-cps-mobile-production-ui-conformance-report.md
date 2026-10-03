# CPS Mobile Production UI Conformance Report

This report was written by Muse Spark on 2026-10-03 via OpenCode.

## Objective

Fix six production UI-conformance defects on the Mobile/Fold CPS form against repository standards and current Invoice implementations, without changing CPS business semantics.

## Scope

- `src/components/cps/CostPricingSheetForm.tsx`
- `src/components/cps/CostPricingSheetEditor.tsx`
- `src/components/cps/CostPricingSheetFormPresentations.tsx`
- `src/components/cps/CpsImportSheet.tsx`
- This report.

Domain modules, validation, save, numbering, schema, markup logic, and client workflow were not changed.

## Files Changed

- `src/components/cps/CostPricingSheetForm.tsx`
- `src/components/cps/CostPricingSheetEditor.tsx`
- `src/components/cps/CostPricingSheetFormPresentations.tsx`
- `src/components/cps/CpsImportSheet.tsx`
- `docs/reports/cost-pricing-sheet/2026-10-03-cps-mobile-production-ui-conformance-report.md`

## Skills Used

Skills used: karpathy, react-dev, frontend-design
Documentation standard: ASD-STE100 Simplified Technical English

---

## Standards Inspected

- `docs/standard/fab-standard.md` v1.1 (canonical FAB shape, roles, icons, placement, motion, z-index).
- `docs/standard/json-import-standard.md` (checked for import UX constraints).
- `docs/standard/document-column-standard.md` (checked for column rules).

No other standard in `docs/standard/` governs sheets, destructive confirmations, or notes placement. Invoice implementation is the UX reference where no written standard exists.

## Exact Current Invoice Reference Files Inspected

- Save FAB: `src/components/document/FormFooter.tsx` (floating save span and button), `src/components/layout/MobileFab.tsx` (shared component), `src/components/layout/fabFloat.css` (ambient motion, reduced-motion).
- Column manager: `src/components/ColumnManager.tsx` (Sheet shell, fixed/builtin/custom rows, Switch, reorder buttons, Done footer, reset confirm).
- Destructive confirmation: `src/components/ui/alert-dialog.tsx` primitives as used in `src/components/items/JsonItemsImportSheet.tsx` (overwrite dialog).
- Import UX: `src/components/import/JsonImportLayout.tsx` (Sheet layout, AI prompt copy, tutorial, paste, preview, apply) as driven by `JsonItemsImportSheet.tsx`.
- Notes placement: `src/components/document/FormNotesTerms.tsx` (bottom Notes and Terms section after totals).
- Column state: `src/components/useInvoiceColumns.tsx` (`toggleDisabled`, `moveColumn`, `resetColumns`).

## Architecture Confirmation

Unchanged:

```text
CpsFormPage
→ CostPricingSheetEditor (shared production controller)
→ useLayoutMode (unchanged authority)
├── Desktop → CostPricingSheetDesktopForm
└── Mobile/Fold → CostPricingSheetForm
```

## Desktop Preservation

Desktop renders `CostPricingSheetDesktopForm`. The clear-dialog JSX moved verbatim into an exported shared component; the desktop call site passes its original callbacks. Column, import, markup, and client behavior are untouched. The desktop presentation file gained only an import and the shared dialog component.

## Mobile/Fold Preservation Outside Authorized Changes

Outside the six defects, the approved form is unchanged: document title, sheet number, issue date, client card, site, line-item cards, group cards, totals, add controls, reorder controls, photo control, geometry, typography, spacing, breakpoints, Theme Manager integration, and host isolation are intact.

---

## Header: DRAFT and PHONE Sources and Removal

- Source of DRAFT: local `badge` state initialized to `'Draft'`, displayed through `badgeText` (`modeLabel ?? badge`) in the `tb-meta` header line. It never reflected domain lifecycle state.
- Source of PHONE: local `bp` state from `layoutBreakpoint()` (window width bands) rendered as `layoutChip` in the same line, updated by a window resize listener. It exposed runtime layout internals.
- Removal: deleted the `tb-meta` render block, its CSS rules, the `bp` state and resize listener, and the `badge` state including the `setBadge('Saved')` call in save. The `modeLabel` prop remains in the interface for host compatibility but is no longer displayed. `layoutBreakpoint` remains exported (unused internally). No domain status, save status, or lifecycle semantic changed. No replacement label was added.

## Notes: Previous, Reference, and Final Placement

- Previous placement: Notes textarea inside the upper Document Details grid below Site / Project.
- Invoice reference placement: bottom collapsible Notes and Terms section after line items and totals (`FormNotesTerms`).
- Final CPS placement: dedicated bottom section after Totals (SectionHead 4. Notes) with the identical label, field id, placeholder, state, hydration, edit handler, and save payload. Single instance. No duplicate. No schema change. Placement only.

## Save FAB: Standard, Reference, Mismatch, and Strategy

- Canonical standard: `docs/standard/fab-standard.md` — 50×50 `rounded-[18px]` container, `bg-bd-button-primary-bg`, `text-bd-button-primary-text`, `shadow-lg`, `hover:scale-105`, `active:scale-95`, Lucide `SaveAll`, ambient float on a wrapper, reduced-motion support, form-save placement from the bottom-nav offset token plus safe area.
- Invoice implementation: `FormFooter` floating save (SaveAll/Loader2 swap, nav-offset placement, `sm:right-8`, disabled tokens).
- Previous CPS mismatch: custom `.fab` CSS (fixed 82px offset ignoring the nav token, custom shadow, no hover feedback, no float, no reduced-motion handling, `IconSave` instead of `SaveAll`, 20px icon instead of `h-5 w-5`).
- Final strategy: the FAB replicates the `FormFooter` floating control exactly (wrapper span, button classes, SaveAll/Loader2, disabled tokens, nav-offset placement) with two deliberate standard-driven choices: normative `z-50` instead of `FormFooter`'s recorded-violating `z-[60]`, and `hover:scale-105` per standard rule 2 which `FormFooter` omits. Ambient float comes from the shared `fabFloat.css` on the wrapper. The old `.fab` CSS rules were deleted. Responsive behavior is preserved: the FAB hides at 600px and above through the existing media query, where the topbar save already shows.
- Saving and disabled behavior: unchanged wiring (`saving` prop, `disabled`, handler guard). Double-submit protection intact. Validation, persistence, and navigation untouched.

## Columns: Invoice Reference and Previous Mismatch

- Invoice reference: `ColumnManager` bottom Sheet (`rounded-t-2xl`, drag indicator, header with close, scroll body, Done footer with safe-area padding), Description fixed section, Columns section with grip, reorder buttons, label inputs, type badges, `Switch` toggles, custom badge and delete, add-custom and reset actions, all in `bd-*` tokens.
- Previous CPS mismatch: custom `cps-overlay`/`cps-sheet` markup with hardcoded prototype colors, no Theme Manager conformity, and a generic switch for every row with no locked-column treatment.
- Final strategy: the CPS `CpsColumnSheet` was rebuilt on the same shared primitives (`Sheet`, `Switch`, `Input`, `Button`) and the same visual language (shell, sections, rows, badges, footer). It was not replaced by the invoice component because that component carries invoice business UI (totals-affecting toggles, install multiplier, row-override reset) that CPS must not inherit. CPS logic, callbacks, and state authority are unchanged.

## Columns: Theme Integration

All hardcoded sheet colors are gone. The sheet uses `bd-border`, `bd-card-bg`, `bd-surface`, `bd-surface-muted`, `bd-text`, `bd-text-muted`, `bd-button-primary-bg`, and `bd-status-danger-*` tokens, matching the invoice manager strategy. The surrounding CPS form geometry is untouched.

## Built-in CPS Column Classification Table

Evidence sources: `src/domain/cps/columns.ts` (built-ins, deny list, defaults), `src/domain/cps/calculateCpsTotals.ts` (quantity, cp, sp inputs), `useCpsSave` `validateCps` (description, quantity above zero, SP above zero, client), `instant-markup.ts` (CP eligibility), `normalize.ts`, desktop and mobile visibility gating, existing CPS tests.

| Column | Classification | Evidence | Toggleable |
| --- | --- | --- | --- |
| Description | REQUIRED/FIXED | Validation demands it; deny list; fixed-first ordering; `removable: false` | No |
| Quantity | REQUIRED | Totals math input; validation above zero; deny list | No |
| CP | REQUIRED | Totals math input; markup eligibility needs CP above zero; deny list | No |
| SP | REQUIRED | Totals math input; validation above zero; deny list | No |
| Amount | REQUIRED (display lock) | Deny list plus default visible; no formula consumes it; contract lock, not math | No |
| Unit | OPTIONAL | Absent from deny list; unused in math and validation | Yes |
| Make / Brand | OPTIONAL | Display only; absent from deny list | Yes |
| Install Rate | CONDITIONAL (display only) | Default hidden; CPS totals ignore install rates | Yes, to show; no calculation effect |
| VAT Rate | CONDITIONAL (display only) | Default hidden; CPS declares no VAT and totals ignore it | Yes, to show; no calculation effect |
| Discount Rate | CONDITIONAL (display only) | Default hidden; CPS totals ignore discounts | Yes, to show; no calculation effect |
| Custom columns | OPTIONAL | Removable by contract | Yes, plus delete |

## CP and SP Decisions With Evidence

CP and SP are not toggleable. Evidence: `computeCpsTotals` sums `CP × Qty` and `SP × Qty`; validation rejects non-positive SP; markup eligibility requires positive CP; both sit in `CPS_HIDE_FULL_DENY_LIST`, which the existing toggle path already enforces with a locked-column notice. The sheet now also renders locked rows without a switch (Fixed badge), so the lock is visible, not just enforced. No invoice rule was copied: invoice treats these keys differently, and CPS keeps its own deny list.

## Ordering, Label, Persistence, and Custom-Column Behavior

Unchanged production behavior: reorder by move with the same bounds, label edit through `onUpdate`, reset to defaults through `onReset`, persistence through `custom_fields.columnConfig`, hydration through normalization. Custom-column data and configuration pass through save untouched. Mobile still does not render arbitrary custom columns; their data and config persist. That limitation is unchanged.

## Clear All: Invoice Reference and Previous Issue

- Invoice reference: `AlertDialog` primitives (overlay, content, header, title, description, footer, cancel, action) as used by the invoice import overwrite dialog and reset confirm styling (`bg-bd-status-danger-text` destructive action).
- Previous issue: the custom `cps-overlay`/`cps-dialog` surface had weak backdrop separation and hierarchy on Mobile/Fold.
- Final presentation: `CpsClearAllDialog` renders `AlertDialog` with the identical title, explanatory text, Cancel, and Clear All action. Backdrop, contrast, focus, and animations come from the shared primitive. Desktop uses the same component with the same callbacks.

## Clear All: Theme Integration and Logic Preservation

Theme Manager compliance comes from the shared primitive plus `bd-status-danger` destructive styling. Business logic is frozen: no mutation before confirm; confirm clears authoritative rows via `updateRows([])`; client, title, site, notes, number, columns, and document identity survive; revision sync empties the mobile buffer; totals show the production empty state; save persists the cleared collection; undo semantics untouched; group-delete disagreement untouched.

## Import: Invoice Reference and Previous Presentation

- Invoice reference: `JsonImportLayout` (bottom sheet on mobile, right panel on desktop; AI prompt copy; collapsible tutorial; paste step; mono textarea; inline error box; preview-then-apply footer with safe-area padding).
- Previous presentation: custom dialog with developer-facing copy ("Use the production CPS JSON schema...") and a raw textarea as the whole experience.
- Final workflow: `CpsImportSheet` keeps its exact parse, validate, preview, and apply logic and now renders `JsonImportLayout` with a user-facing title and description, the canonical `cpsImportPrompt` as the copyable AI prompt, CPS tutorial steps without video, an items-and-groups preview summary, and an Apply Import action. The schema sentence is gone.

## Import Contract Confirmation

`importAdapter.ts` was not modified. `cpsImportSchema` remains authoritative. Preview, validation, and apply behavior are unchanged. Revision sync, client exclusion, site/photo/calculation exclusion, column gating, group identity, and atomic validation all behave as before.

## Regression Check

- ClientSelector: intact, including Add New Client, hydration, change, clear, and save integration.
- Columns state: intact, including authority, persistence, and hydration.
- Import contract: intact, including schema and exclusions.
- Markup: intact, including dialog, eligibility, preview, apply, undo state, and revision sync.
- Clear All logic: intact, including confirmation gate and row-only scope.
- `productionRowsRevision`: intact and unchanged.
- Photo upload: intact.
- Save: intact, including validation, persistence, navigation, and double-submit protection.
- Decimal display math: intact.
- Stable identity: intact.
- Numbering: intact.
- Group semantics: intact.

## Verification Result

Verification:

- `bun run typecheck`: passed.
- Targeted tests: 129 passed, 0 failed across `calculations`, `cpsImportView`, `cpsInstantMarkup`, `cpsNormalize`, `cpsRowOperations`, `documentNumbering`.
- `git diff --check`: passed. Only line-ending warnings on touched files.
- `git status`: 4 modified source files in expected scope. No other source touched.
- `supabase db push`: not applicable. No SQL changed.
- `bun run audit:load`: not run. No schema, query, or data-layer logic changed.
- `bun run build`: not executed per hardware policy.

## Supabase Push Status

Not applicable. No SQL changed. No database file changed.

## Remaining Known Limitations

- Mobile does not render arbitrary production custom columns. Data and config persist.
- Mobile has no undo trigger button. Undo state is shared and revision-synced.
- `modeLabel` remains in the form props for host compatibility but no longer displays.
- `layoutBreakpoint` remains exported but is no longer used internally.
- Reset-to-defaults on CPS columns applies immediately without a confirm dialog, as before. Invoice shows a confirm; adding one would change CPS behavior and was not done.
