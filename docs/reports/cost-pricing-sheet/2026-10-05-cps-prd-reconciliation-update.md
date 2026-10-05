# CPS PRD Reconciliation Update Report

This report was written by Codex on 2026-10-05 via Codex desktop.

## Objective

Update the CPS PRD package so it describes the current approved product
contract.

This was a documentation-only task.

## Scope

In scope:

- CPS PRD files in `docs/prd/cost-pricing-sheet/`.
- One reconciliation report.

Out of scope:

- application source code;
- tests;
- migrations;
- Supabase changes;
- package files;
- runtime configuration.

## Files Changed

- `docs/prd/cost-pricing-sheet/README.md`
- `docs/prd/cost-pricing-sheet/01-cost-pricing-sheet-product-domain-architecture.md`
- `docs/prd/cost-pricing-sheet/02-cost-pricing-sheet-presentation-pdf-view-contract.md`
- `docs/prd/cost-pricing-sheet/03-cost-pricing-sheet-implementation-readiness-roadmap.md`
- `docs/prd/cost-pricing-sheet/01-boq-domain-architecture.md`
- `docs/prd/cost-pricing-sheet/02-boq-document-lifecycle.md`
- `docs/prd/cost-pricing-sheet/03-boq-presentation-contract.md`
- `docs/prd/cost-pricing-sheet/waterfall-roadmap.html`
- `docs/reports/cost-pricing-sheet/2026-10-05-cps-prd-reconciliation-update.md`

## Skills Used

Skills used: karpathy, systematic-debugging, pdf-rendering-correctness, crafting-effective-readmes

Documentation standard: ASD-STE100 Simplified Technical English

## Documentation Read

- `AGENTS.md`
- `docs/PROJECTSKILLINDEX.md`
- all files in `docs/prd/cost-pricing-sheet/`
- `docs/reports/cost-pricing-sheet/2026-10-04-cps-prd-production-reconciliation-audit.md`
- recent CPS reports for View, Instant Markup, conversion, prefix, PDF runtime,
  PDF customization, and Forme schedule redesign
- `docs/reports/pdf/forme-invoice-poc-report.md`
- `docs/reports/pdf/forme-industry-poc-report.md`
- `docs/reports/pdf/pdf-rendering-migration-standards-reconciliation.md`
- `docs/standard/document-transformation-standard.md`
- `docs/standard/prefix-engine-settings-standard.md`
- `docs/standard/pdf-migration-standard.md`
- `docs/standard/fab-standard.md`

## Ratified Product Evolution Recorded

- CPS is the current product identity.
- BOQ terminology is historical or compatibility context.
- The CPS default prefix is `CPS`.
- Historical `BOQ-*` and `SASBOQ-*` numbers remain valid.
- Group membership derives from `row.group_id`.
- Delete group means ungroup members and keep rows.
- Instant Markup stacks from current working SP.
- Reset sets markup workspace SP values to zero.
- Undo Reset restores the pre-reset workspace snapshot.
- Current production View architecture is normative.
- Conversion options are VAT, Discount, and Additional Charges.
- CP does not transfer to Quotation.
- Conversion must preserve CPS lineage.
- Full Duplicate Law remains required.
- Forme/pdfcn is the active CPS PDF renderer.
- `schedule` and `compact` are approved PDF templates.
- PDF customization includes font, accent, orientation, and template.
- View/PDF parity is required through shared business authority.
- The current form controller and presentation split is normative.
- CPS row vocabulary is `item` and `section`.

## Obsolete Requirements Removed

- Active BOQ naming in the current PRD index.
- Old unresolved View candidate gate.
- Old Forme PDF readiness gate for CPS.
- Old document-font-only PDF customization contract.
- Old CP-derived one-shot Instant Markup language.
- Old roadmap wording that marked CPS implementation as blocked by View and
  Forme decisions.

## Implementation Debt Preserved

The PRD still requires:

- correct CPS conversion lineage;
- full CPS duplicate behavior;
- lifecycle audit coverage;
- one authoritative CPS row store;
- migration away from dual compatibility storage.

These are implementation defects or debt. They are not approved product
behavior.

## Shared-Standard Conflicts

`docs/standard/pdf-migration-standard.md` still names a React-PDF pipeline as
mandatory.

The CPS PRD now records Forme/pdfcn as the approved active CPS PDF renderer.
The shared PDF standard therefore needs a future renderer-neutral update.

This task did not edit shared standards.

## Verification

- `git status --short` before edits: completed. Pre-existing source, test,
  report, and template changes were present and were not touched.
- `git status --short` after edits: completed. Task-scoped changes are
  documentation files only.
- `git diff --check -- <modified PRD files>`: passed. Git reported
  line-ending warnings only.
- `git diff --no-index --check -- NUL <new report file>`: no whitespace
  errors. Git returned the expected no-index difference status and reported a
  line-ending warning only.
- `git diff -- <modified PRD/report files>`: inspected. Scope is
  documentation-only.
- `bun run build`: skipped by instruction.
- `bun run typecheck`: skipped by instruction.
- lint: skipped by instruction.
- tests: skipped by instruction.
- `bun run audit:load`: skipped by instruction.

## Supabase Push Status

Not applicable. No SQL or schema changed.

## Risks Or Limitations

The shared PDF migration standard still conflicts with the CPS Forme direction.

The repository had unrelated pre-existing source and test changes before this
task. They remain outside this task.

## Deferred Work

- Rewrite the shared PDF migration standard to be renderer-neutral.
- Fix conversion lineage in an implementation task.
- Fix full CPS duplicate behavior in an implementation task.
- Complete CPS lifecycle audit coverage.
- Continue row-store consolidation planning in a separate task.
