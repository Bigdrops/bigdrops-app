# Cost & Pricing Sheet V13 Desktop Visual Fidelity Correction Report

This report was written by Codex on 2026-09-30 via Codex Desktop.

## Objective

Correct the Cost & Pricing Sheet V13 desktop Form visual drift shown in `docs/prompts/prompt66.md`.

The task was a visual fidelity correction only. It was not a rebuild.

## Scope

The work corrected V13 desktop Form presentation structure and CSS.

The work did not change calculation, save, import, photo upload, persistence, or view logic.

## Files changed

- `src/components/boq/BoqV13FormPresentations.tsx`
- `src/components/boq/boq-v13-form.css`
- `docs/reports/cost-pricing-sheet/cost-pricing-sheet-v13-desktop-visual-fidelity-correction-report-2026-09-30.md`

## Skills used

Skills used: html-prototype, tailwind-css-patterns, accessibility, capacitor-keyboard, karpathy, frontend-design

Documentation standard: ASD-STE100 Simplified Technical English

## Documentation standard

ASD-STE100 Simplified Technical English.

## Changes made

### Shell and max width

Before: the production shell already used the candidate shell values.

After: the shell remains at `max-width: 1360px`, `padding: 22px 28px 64px`, and `grid-template-columns: minmax(0, 1fr) 350px`.

No shell width change was necessary.

### Desktop column and rail proportions

Before: the rail width matched the candidate, but the rail content was grouped as a summary panel plus a generic Actions panel.

After: the rail uses the candidate panel structure:

- Schedule Selling Total
- Instant Markup
- Save

Selector changed: `.cps-panel .cps-cbtn`.

### Header typography

Before: the topbar title used the document title when present. This let document content control the page header hierarchy.

After: the topbar title is fixed to `Cost & Pricing Sheet`. The document title stays in the document details field.

Before value: `boq.title || title`.

After value: `Cost & Pricing Sheet`.

CSS remains at the candidate values:

- `.cps-tb-title h1`: `15px`
- `.cps-tb-meta`: `8.5px`
- `.cps-save`: `38px` minimum height and `9px` text

### Metadata input geometry

Before: the metadata grid showed sheet number, date, client, and site before the title.

After: the title field is first and full-width. The second row contains sheet number, issue date, client/project, and site/reference.

CSS remains at the candidate values:

- `.cps-field`: `min-height: 42px`
- `.cps-dgrid`: four equal columns
- `.cps-label`: `8.5px`

### Toolbar control geometry

Before: the toolbar included Add Item and Add Group. That made the toolbar diverge from the candidate desktop action row.

After: the toolbar contains:

- Columns
- Import
- Markup
- Clear all

Add Line Item and Add Group remain in the candidate create-pair below the row area.

CSS remains at the candidate values:

- `.cps-tool`: `min-height: 38px`
- `.cps-tool`: `padding: 0 14px`
- `.cps-tool`: `font-size: 9px`

### Row geometry changes

The row layout was not rebuilt.

The row financial labels now match the candidate intent:

- `CP Money Out`
- `SP Money In`

The profit strip now uses the candidate-style phrase:

- `Line profit · <quantity> x <unit profit>`

The narrow numbering rail, row controls, photo control, group body, and insert-below affordance were preserved.

### Commercial rail geometry changes

Before: Instant Markup sat inside the summary panel. Save, Import JSON, and Columns sat in a generic Actions panel.

After:

- Summary panel contains totals only.
- Instant Markup has its own panel and `Open Markup` button.
- Save has its own panel and full-width save button.

Selector changed:

- `.cps-panel .cps-cbtn { width: 100%; margin-top: 10px; }`
- `.cps-panel .big { letter-spacing: -.02em; }`

### Empty-state changes

Before: the empty state existed with the same candidate height values but sat under a toolbar that also carried add controls.

After: the empty state remains compact and candidate-shaped. Add controls moved to the candidate create-pair below it.

Selector changed:

- `.cps-empty { margin-top: 2px; }`

### CSS selectors and media queries changed

Selectors changed:

- `.cps-tb-title`
- `.cps-save`
- `.cps-save svg`
- `.cps-sec-head .rule`
- `.cps-tool.danger`
- `.cps-cbtn svg`
- `.cps-cbtn:active`
- `.cps-empty`
- `.cps-panel .big`
- `.cps-panel .cps-cbtn`

No media query was changed.

### Mobile and fold separation

The mobile/fold presentation remains a separate React export:

- `BoqV13MobileFoldFormPresentation`

The desktop presentation remains:

- `BoqV13DesktopFormPresentation`

No shared CSS change introduced viewport-height switching or JavaScript keyboard behavior.

### Business behavior

No business or domain behavior changed.

The work did not change:

- Instant Markup domain logic
- JSON Import logic
- Cloudinary photo logic
- save orchestration
- CPS calculation adapter
- persistence
- view data

## Verification result

Verification:

- `bun run typecheck`: passed
- `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/boqInstantMarkup.test.js`: passed, 9 tests
- `node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/boqImportView.test.js`: passed, 3 tests
- `git diff --check`: passed
- `git status --short`: completed. Pre-existing changes remain. This task added this report and changed the V13 Form presentation files.
- `bun run audit:load`: skipped because no schema, query, or data-layer logic changed
- `bun run build`: skipped due to hardware policy
- `supabase db push`: not applicable

## Supabase push status

Not applicable. No SQL or database change was made.

## Risks or limitations

- Visual verification was source-based. No browser screenshot pass was run in this task.
- Existing pre-task changes remain in the working tree. This task did not revert them.
- The report records only the corrections made in this task.

## Deferred work

- Human visual inspection must confirm final pixel-level parity against the V13 desktop candidate.
- A later task can tune any remaining screenshot-level mismatch found by inspection.
