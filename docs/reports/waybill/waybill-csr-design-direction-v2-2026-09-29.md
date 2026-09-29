# Waybill and CSR Design Direction V2 Report

This report was written by Longcat on 2026-09-29 via OpenCode Local Runner.

## Objective

Correct the Waybill candidates to a flat, ordered manifest with no grouping concept. Give Waybill a restrained logistics environmental identity. Preserve the spacious CSR engineering-document character, refine the Materials Used phone composition, and add engineering environmental artwork to CSR.

## Scope

Four standalone HTML design-direction files. No production code changed. No database change. The BOQ V12 source file and the legacy Waybill/CSR JSX prototypes stayed untouched.

## Files changed

- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/waybill/waybill-form-candidate-mobile-fold.html` (modified)
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/waybill/waybill-form-candidate-desktop.html` (modified)
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/csr/csr-form-candidate-mobile-fold.html` (modified)
- `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/csr/csr-form-candidate-desktop.html` (modified)

## Skills used

html-prototype, design-artifact

## Documentation standard

ASD-STE100 Simplified Technical English

## Changes made

### Waybill (both candidates)

- Removed the grouping concept completely. The manifest is now a flat, ordered list of line items.
- Removed: Add group button, group row type, group envelopes, group title fields, group item membership (gid), group_id import payload, group counts, group-specific rendering, group-specific deletion, group-aware summary, and sample grouped manifest data.
- Removed all group CSS (gwrap, ghdr, gtitle, gcount, gbtn, gbody, gempty, gfoot, gadd) and group color tokens from both themes.
- Simplified the data model: rows is a plain array of four line items. moveRow, insertBelow, blank, removeRow, doImport, and save now operate on the flat list. The import contract note no longer lists group keys.
- Renamed the fmtGroup number formatter to fmtNum. The name no longer implies grouping.
- Kept the accepted Waybill semantics from the legacy prototype: external/internal kind segmented control, WB-E/WB-I prefix, no money fields, dispatch summary instead of totals, custody and signature sections, kind-aware save validation.
- Added environmental artwork: a ghosted logistics route (dotted meandering path, ORIGIN/DESTINATION nodes, sparse intermediate nodes) with oversized cropped line-art (delivery vehicle, cargo outline, warehouse geometry). The art sits behind the document, never intercepts input, and uses a single low-alpha --art token per theme.
- Artwork recomposition: at >=600px the cargo outline and warehouse geometry disappear; at >=1024px the delivery vehicle disappears, leaving the bare route.

### CSR (both candidates)

- Preserved the spacious engineering-document character. No global compression. All nine sections, the field rhythm, and the section spacing are unchanged.
- Materials Used phone composition: the duplicate control moved out of the enumeration rail into the control row. Phone rows now read identity/description first, then one control row of [duplicate] [qty] [unit]. The duplicate control is the left anchor under the rail. Qty and unit share the remaining width and are never squeezed inside the narrow rail.
- Fold/desktop recomposition: the control row stays inside the data column of the two-column item layout, so qty and unit keep usable widths at every breakpoint.
- Removed dead group CSS and group color tokens left over from the BOQ V12 transfer. The CSR data model was already flat; the stylesheet now matches.
- Added environmental artwork: ghosted engineering line-art (generator set, instrument gauge cluster, schematic flow) behind the document, same low-alpha --art token and same pointer-events-safe layer pattern as Waybill.
- Artwork recomposition: at >=600px the gauge cluster and schematic flow disappear; the generator outline stays at every breakpoint.

### Shared

- Both documents keep the BOQ V12 shell: top bar, numbered section headers, enumeration rail, delete junction, sheet system, FAB, save surfaces, dark mode.
- The two documents now have different domain identities: Waybill is logistics/movement/custody, CSR is engineering/service/machinery. The shared shell keeps them in one product.

## Verification

- Static group audit: grep for gwrap, ghdr, gtitle, gcount, gbtn, gbody, gempty, gfoot, gadd, addGroup, addItemTo, groupHTML, members, siblings, group_id, and type 'group' across all four files. Zero matches outside intentional "no groups" comments.
- `node --check` on the extracted script of all four files: passed.
- DOM-shim smoke test on all four files: render, addItem, moveRow, dupRow, insertBelow, removeRow, count label, art layer presence, art token presence, and CSR control-row structure all passed.
- `git status` before and after: captured. Only the four design-direction files were modified. The pre-existing `docs/PROJECT_SKILLINDEX.md` change was not reverted or overwritten.
- `git diff --check`: passed.
- `bun run audit:load`: not run. This task set a hardware gate that allows static checks only.
- `bun run typecheck`: not run. Same gate. The files are standalone HTML with no TypeScript.
- `bun run build`: skipped due to hardware policy.
- Visual browser review: not run by the agent. The user reviews the visuals.

## Supabase push status

Not applicable. No SQL changed.

## Risks or limitations

- Static verification executes the scripts against a DOM shim. It does not render pixels. A human must review the visual result in a browser.
- The environmental artwork is positioned by aspect-ratio crop (slice). Its exact placement varies with document height. A human must confirm the art never sits under dense field clusters at real content heights.
- Camera and draw signature capture remain boundary toasts by design.
- Sample clients, invoices, signatories, and line items are fictional.

## Deferred work

- Visual browser review of all four breakpoints: phone, fold, 1024px, and wide desktop, in light and dark modes.
- Dark-mode spot check for the art token contrast on both documents.
- User acceptance against the accepted BOQ V12 baseline.
