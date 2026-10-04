# CPS View Composition Pass 5 Report

This report was written by Codex on 2026-10-04 via Codex Desktop.

## Objective

Implement CPS View Production Composition Pass 5.

This was a narrow runtime presentation correction.

The scope had three objectives:

- Make the action row show `Convert to Quote` in full.
- Make the identity area more compact.
- Make grouped containers break outward beyond normal content gutters.

## Scope

This pass changed presentation only.

It did not change:

- Conversion behavior.
- Download behavior.
- Calculation logic.
- Group membership logic.
- Save or import behavior.
- Schema or Supabase configuration.
- Mobile Bottom Nav behavior.
- FAB behavior.

## Skills Used

Skills used: frontend-design, react-dev, karpathy, safe-area-handling

Documentation standard: ASD-STE100 Simplified Technical English

## Previous Action-Width Root Cause

The action row used equal columns:

- Convert to Quote.
- Edit.
- Download.

The equal columns gave Convert the same width as Edit and Download. That forced the runtime label to truncate to `Convert to Q...`.

## Final Action Width Allocation

The row now uses flex layout.

Convert uses:

- `flex: 1 1 clamp(148px, 46%, 190px)`
- `min-width: 148px`

Edit and Download use:

- `flex: 0 1 auto`
- `min-width: 88px`

The row keeps shared height, radius, icon scale, and Theme Manager styling.

The label text uses `white-space: nowrap`. It does not use `text-overflow: ellipsis`.

## Identity Hierarchy Before

Pass 4 rendered:

- Company.
- Client.
- Document.

That made the header clear but too tall on mobile.

## Identity Hierarchy After

The header now keeps only company branding:

- Tenant logo.
- Tenant company name.

Client and title now render in compact document context below the company block.

## Missing Title Behavior

The visible title line is optional.

When `document.title` is empty:

- The title chip is omitted.
- The mobile view does not show a large `Untitled Cost & Pricing Sheet` placeholder.

The code still preserves document data safety without forcing a visual placeholder.

## Client Placement

Client now appears in the compact document context chip group.

The authority remains:

- `client_snapshot.name`.
- Then `document.client_name`.
- Then the existing `No client` fallback.

No live client fetch was added.

## Group Gutter Root Cause

Pass 4 made all document content share the normal content inset.

That fixed duplicate internal margins but did not produce the requested group wall effect.

The group shell needed its own width rule because `.cps-doc` also owns ungrouped rows.

## Group Breakout Mechanism

The view now defines two width values:

- `--cps-content-inset: 20px`
- `--cps-group-breakout: 12px`

Normal content uses the wrapper inset.

The group shell uses:

```css
.cps-view-wrap .cps-grp {
  margin: 16px calc(-1 * var(--cps-group-breakout)) 0;
}
```

This makes grouped containers extend closer to the viewport edge without changing ungrouped rows.

## Internal Group Padding

Internal group padding remains.

The header keeps:

- `padding: 16px 18px`

Grouped item rows keep:

- `padding-left: 18px`
- `padding-right: 18px`

The mobile grouped item override keeps its internal padding.

## Theme Manager Preservation

The changed action and group styles continue to use semantic Theme Manager tokens:

- `--bd-button-primary-bg`
- `--bd-button-primary-text`
- `--bd-action-icon-bg`
- `--bd-surface-action`
- `--bd-surface-action-border`

No screenshot orange or blue was hardcoded.

## Group Membership Freeze

`buildCpsViewSegments()` was not modified.

The pass preserved:

- `groupId` authority.
- Non-contiguous membership.
- Count/member/subtotal single-set authority.
- Source row order.
- Ungrouped rows.

## Calculation, Domain, Navigation, and FAB Freeze

No calculation file was modified.

No domain file was modified.

No schema, migration, or Supabase work was done.

No Mobile Bottom Nav file was modified.

No FAB file was modified by this pass.

Palette and More behavior were not changed.

`Approve sheet` did not return.

## Files Changed

This pass changed:

- `src/components/cps/CostPricingSheetViewPresentations.tsx`
- `src/components/cps/cost-pricing-sheet-view.css`
- `src/tests/critical/cpsViewProductionRedesign.test.js`
- `docs/reports/cost-pricing-sheet/2026-10-04-cps-view-composition-pass-5.md`

The repository had pre-existing modified and untracked files before this pass.

## Tests and Verification

Targeted tests:

```bash
bun --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/cpsViewProductionRedesign.test.js src/tests/critical/cpsViewIdentity.test.js src/tests/critical/cpsSaveSerialization.test.js src/tests/critical/cpsRowOperations.test.js src/tests/document-view/documentOverlayTokenRegression.test.js
```

Result:

- Passed.

Typecheck:

```bash
bun run typecheck
```

Result:

- Passed.

Other verification:

- `git diff --check`: passed with line-ending warnings only.
- `git status --short`: captured. The tree still contains pre-existing modified and untracked files.
- `supabase db push`: not applicable.
- `bun run audit:load`: not run. No schema, query, or data-layer logic changed.
- `bun run build`: not run due to hardware policy.

## Runtime Validation

Runtime visual validation is delegated to the user.

No post-change phone screenshot was captured by this report.

## Risks and Limitations

Very narrow mobile widths can still place pressure on three labeled controls.

The new flex allocation gives Convert the priority width and keeps Edit and Download compact.

## Deferred Work

Deferred work remains:

- CPS conversion repair.
- CPS PDF/download business wiring.
- Any broader document-view design system extraction.
