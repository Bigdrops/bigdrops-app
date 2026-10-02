# CPS Mobile Fold Single-File TSX Report (Cps-j3)

This report was written by Buffy on 2026-10-02 via Freebuff.

Skills used: react-dev
Documentation standard: ASD-STE100 Simplified Technical English

## Objective

Convert the HTML prototype into one production-oriented React 19 + TypeScript file.

Source prototype:

`docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/cps/cost-price-sheet-form-candidate-v1-mobile-fold.html`

Target file:

`docs/templates/react-temps/form/cost-pricing-sheet/Cps-j3.tsx`

The file is a transplant artifact for a downstream coding agent. The conversion preserves the prototype. It is not a redesign.

## Scope

In scope:

- One self-contained TSX file with types, state, callbacks, JSX, and CSS.
- Fidelity conversion of layout, spacing, typography, controls, field order, groups, rows, CP/SP, TCP/TSP/Profit, sub-descriptions, toolbar, header, and responsive rules.
- Typed callback props for host application logic.

Out of scope:

- Supabase, persistence, database calls, application routing.
- Production CPS calculations (Decimal path), JSON import logic.
- Client Picker backend behavior, Cloudinary, save logic.
- Redesign, added fields, removed fields, changed wording.

## Files changed

| File | Action |
| --- | --- |
| `docs/templates/react-temps/form/cost-pricing-sheet/Cps-j3.tsx` | Created. 2975 lines, 124251 bytes. |
| `docs/reports/cost-pricing-sheet/cps-mobile-fold-single-file-cps-j3-2026-10-02.md` | Created. This report. |

No tracked file changed. `git status` shows one new untracked directory only.

## Structure of Cps-j3.tsx

| Lines | Section |
| --- | --- |
| 1-52 | Header comment. Includes the control-to-prop mapping table. |
| 53-54 | React imports. The only external dependency is `react`. |
| 60-447 | `CPS_J3_CSS`. The prototype CSS as a template string. |
| 449-811 | Column contract, types, formatters, row helpers, sample model, props interface. |
| 813-1032 | SVG icon set. |
| 1034-1734 | Overlay sheets: toast, confirm dialog, client, import, columns, markup. |
| 1736-1809 | `NumField`. Live reformat with caret restore. |
| 1811-2095 | `ItemRow`, `GroupBlock`, `SectionHead`. |
| 2097-2975 | `CostPricingSheetForm` and the default export. |

The component renders `<style data-cps-j3="true">{CPS_J3_CSS}</style>` as the first child of its root fragment. The CSS loads with the component. No separate stylesheet is needed.

## Control to prop mapping

| Prototype control | TSX surface |
| --- | --- |
| Back button | `onBack?: () => void`. Demo toast runs without it. |
| Save (top bar, section CTA, phone FAB) | `onSave?: (payload: CpsSavePayload) => void` |
| `save()` checks (number, client, desc, qty, SP) | Local state: `doc`, `rowsRaw`, `client`, `errId`, `badge` |
| Theme toggle | `theme?`, `defaultTheme?`, `onToggleTheme?` |
| Client picker trigger and client sheet | `clients?`, `initialClient?`, `onClientChange?`, `onAddNewClient?` |
| Column Settings sheet | `initialColumns?`, `onColumnsChange?` |
| Import JSON sheet | `onImport?: (jsonText) => CpsImportResult` |
| Instant Markup sheet and undo bar | `initialMarkupExcluded?`, `MarkupSheet.onApply(changes, summary)` |
| Photo attach | `onRequestPhoto?: (rowId) => imageUrl`. The prototype local file path runs without it. |
| Row ops and field edits | Local state handlers on `rowsRaw` and `doc`. Presentational only. |
| Toast, badge, layout chip | Local state: `toast`, `badge` (`modeLabel?` override), `bp` |

## Changes made

1. Read the source prototype and the existing single-file template `docs/templates/react-temps/form/cp2.tsx`.
2. Create `Cps-j3.tsx` at the requested path from that verified structure. `cp2.tsx` converts the same source prototype.
3. Add the control-to-prop mapping table to the header comment.
4. Rename the CSS identifiers to `CPS_J3_CSS` and `data-cps-j3`.
5. Restore the prototype photo path (file input plus canvas resize) when `onRequestPhoto` is absent. Keep the host callback as the preferred path.
6. Verify the file with type checks and a render smoke test.

## Verification result

Verification:

- `bun run audit:load`: passed (exit 0).
- `bun run typecheck`: passed (exit 0).
- Standalone `tsc --noEmit` with `--strict` on `Cps-j3.tsx`: passed (exit 0).
- Render smoke test with `react-dom/server`: passed. 33 of 33 checks. The test confirmed the embedded CSS, sample document, groups, rows, totals, counts, overlays, and chrome. The temp harness was removed after the test.
- `git status`: one new untracked directory `docs/templates/react-temps/form/cost-pricing-sheet/`. No tracked file changed.
- `bun run build`: skipped due to hardware policy.

## Supabase push status

Not applicable. No SQL changed.

## Risks or limitations

- Display math uses prototype float math rounded to 2dp. Production must use the authoritative Decimal path.
- The render smoke test covers the initial render only. Interaction paths follow the committed `cp2.tsx` structure but were not browser-tested in this task.
- The CSS uses global class names such as `.item`, `.sec`, and `.fld`. Isolate it if the host app has colliding names.
- The Import CTA stays inert without the `onImport` callback.
- The prototype demo behaviors (toasts, Draft to Saved badge) run without callbacks. The host can suppress them by passing callbacks and `modeLabel`.

## Deferred work

- Wire the callbacks in the host application.
- Replace the display math with the authoritative Decimal path.
- Emit the markup audit UPDATE (mode, value, row ids, before/after SP sets) from the host.
