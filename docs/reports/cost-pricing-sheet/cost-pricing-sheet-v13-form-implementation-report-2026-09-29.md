# Cost & Pricing Sheet V13 Form Implementation Report

This report was written by Codex on 2026-09-29 via Codex desktop.

## Objective

Implement the production Cost & Pricing Sheet Form from the accepted V13 desktop and mobile/fold candidates.

## Scope

This task implemented the Form only.

Included:

- New and Edit Cost & Pricing Sheet form flows.
- Shared responsive form composition.
- CP and SP row editing.
- Group headers as structural rows.
- Decimal-backed costing totals.
- Cost & Pricing Sheet calculation adapter.
- V13 Instant Markup command.
- Immediate Instant Markup undo.
- Focused Instant Markup tests.

Excluded:

- View implementation.
- PDF rendering.
- Forme work.
- PDF customization.
- Activity Trail UI.
- Related document UI.
- Repository-wide BOQ rename.

## Files Changed

- `src/components/boq/BoqEditor.tsx`
- `src/domain/boq/calculateBoqTotals.ts`
- `src/domain/boq/calculations.ts`
- `src/domain/boq/instant-markup.ts`
- `src/pages/NewBoq.tsx`
- `src/pages/EditBoq.tsx`
- `src/tests/critical/boqInstantMarkup.test.js`
- `docs/reports/cost-pricing-sheet/cost-pricing-sheet-v13-form-implementation-report-2026-09-29.md`

Pre-existing worktree changes remained present and were not cleaned.

## Skills Used

Skills used: gitnexus-exploring, vercel-react-best-practices, typescript-advanced-types, accessibility, tailwind-css-patterns, mobile-app-ui-design, supabase, html-prototype, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

The form now uses a production React component instead of the rebuild placeholder.

The form uses one shared state model for desktop and mobile/fold layouts. It keeps the legacy `boqs` and `boq_rows` persistence path for compatibility.

The UI uses existing BIGDROPS semantic theme tokens. It does not copy fixed V13 prototype colors into production styling.

The form supports:

- Document title, number, issue date, client/project, site/reference, and notes.
- Group rows.
- Item rows.
- Continuous item numbering.
- Description, sub-description/specification, make/brand, quantity, unit, CP, SP, and row notes.
- Cost, selling, profit, and margin display.
- Commercial rail summary.
- Save action.
- Instant Markup entry from the toolbar and rail.

The Cost & Pricing Sheet adapter composes the shared commercial engine and the existing costing engine. It maps SP to `unit_price` for shared commercial calculation. It does not pass CP into `computeDocument()`.

Instant Markup:

- Supports Percentage and Value modes.
- Always derives from CP.
- Does not compound on current SP.
- Supports row include/exclude.
- Supports Include All and Exclude All.
- Excludes group headers.
- Excludes missing or zero CP.
- Requires preview before Apply.
- Mutates SP only.
- Preserves CP.
- Recomputes totals through the Cost & Pricing Sheet adapter.
- Supports immediate undo with transient row state.

## Calculation Safety

`src/domain/boq/calculateBoqTotals.ts` remains the costing source for total cost, total selling price, gross profit, row profit, and margin percentage.

`src/lib/Calculations.ts` remains the shared commercial engine. It was not modified.

No new caller was added to deprecated `calcTotals()` or `resolveRowVat()`.

CP remains internal to Cost & Pricing Sheet form state. It is not mapped into Quotation or Invoice code by this task.

## Theme Compliance

The production form uses BIGDROPS semantic tokens and established utilities:

- `bg-bd-surface`
- `bg-bd-surface-muted`
- `border-bd-border`
- `text-bd-text`
- `text-bd-text-muted`
- `bg-bd-status-success-bg`
- `text-bd-status-success-text`
- `border-bd-status-success-border`

The implementation does not introduce raw hex colors, RGB values, fixed Tailwind palette colors, or a component-local color system in the new form code.

## Audit Notes

Instant Markup is a local form command before save. The current BOQ/CPS save path does not yet provide a row-level audit event API for unsaved local mutations.

No Activity Trail UI was added.

No migration was created.

No Supabase operation was executed.

## Verification Result

Verification:

- `git status` before changes: captured. The worktree already contained many pre-existing staged, modified, deleted, and untracked files.
- `bun run audit:load`: completed with exit code 0. It reported pre-existing bloat, broad-select, and heavy-limit warnings in unrelated files.
- `bun --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/boqInstantMarkup.test.js src/tests/critical/boqNormalize.test.js`: passed.
- `bun run typecheck`: passed.
- `git diff --check` on the scoped implementation files: passed. Git emitted line-ending warnings only.
- `bun run build`: skipped due to hard hardware policy.
- `supabase db push`: not applicable.

## Supabase Push Status

Supabase push status: not applicable. No SQL or schema changed.

## Risks Or Limitations

- The implementation keeps the current legacy row persistence path.
- Activity Trail UI is out of scope.
- Row-level audit emission for Instant Markup Apply is not implemented because the form command is local until save.
- The broader worktree contains pre-existing deleted BOQ View and PDF files.
- The active PRD package still contains older V12 gate language, but the user instruction accepted V13 as the Form contract for this task.

## Deferred Work

- Add the PRD updates that supersede V12 language with V13.
- Add the full future BOQ/CPS row parity migration when authorized.
- Add BOQ/CPS audit emitters for persisted row-level financial mutations.
- Implement View, Forme, PDF, customization, Activity, and lineage surfaces in separate tasks.
