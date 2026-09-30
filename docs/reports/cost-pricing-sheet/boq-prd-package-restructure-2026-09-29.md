# BOQ PRD Package Restructure Report

This report was written by Muse Spark on 2026-09-29 via OpenCode.

## Objective

Replace the monolithic `docs/prd/boq-architecture-prd.md` with a canonical
3-file PRD package plus an animated waterfall roadmap. Resolve the calculation
architecture and the Forme renderer decision. Keep the View Page candidate
unresolved.

## Scope

Four new documentation files. One relocation stub. No production code changed.
No migration created. No standard modified. No candidate HTML modified. No
runtime command executed.

## Files changed

- `docs/prd/boq/01-boq-product-domain-architecture.md` (new)
- `docs/prd/boq/02-boq-presentation-pdf-view-contract.md` (new)
- `docs/prd/boq/03-boq-implementation-readiness-roadmap.md` (new)
- `docs/prd/boq/waterfall-roadmap.html` (new)
- `docs/prd/boq-architecture-prd.md` (replaced with relocation stub)
- `docs/reports/boq/boq-prd-package-restructure-2026-09-29.md` (new, this file)

## Skills used

Skills used: writing-clearly-and-concisely, animate, html-plan, design-artifact
Documentation standard: ASD-STE100 Simplified Technical English

`frontend-design` was not loaded. The roadmap is a documentation visualization,
not application frontend work.

## Documentation standard

ASD-STE100 Simplified Technical English

## Changes made

- Created File 01 with product identity, decisions D1–D19, the resolved
  calculation architecture, price ownership, compatibility, columns, Sub
  Description, groups, import, photos, prefix engine, persistence, save,
  lineage, conversion, duplicate, audit, export, RFQ isolation, and reuse map.
- Verified the calculation call graph: `computeDocument()` is the only live
  commercial engine (Invoice/Quotation forms, both view pages via view-data
  loaders, invoice PDF download, CSV summary). `calcTotals()` and
  `resolveRowVat()` have zero invocations (barrel re-export only). The BOQ
  adapter delegates costing to locked `computeBoqTotals()`.
- Created File 02 with the V12 contract and superseded assumptions, view
  architecture, the V1–V4 candidate audit (no acceptance evidence found),
  the Forme contract with concern split and rendering rules, view→PDF parity,
  FAB behavior, and presentation gates.
- Recorded pdfcn Forme as the selected renderer per product instruction,
  consuming `docs/prd/pdf-rendering-migration/draft.md` terminology without
  duplicating it. Takumi is not an option. No second engine exists.
- Created File 03 with the package index, phases A–H, dependency graph, M1–M4
  requirements, file map, three hard gates, verification rules, standards
  deltas, risk register (R1–R24), non-goals, open questions Q1–Q6, the full
  old→new section mapping, and package acceptance criteria.
- Created `waterfall-roadmap.html`: standalone, responsive, semantic,
  keyboard-accessible, staged reveal with progress connector and
  unresolved-gate pulse, inert under `prefers-reduced-motion`.
- Retired the monolith to a relocation stub. No second authority remains.
- Overall readiness: NOT READY (view selection open, presentation gates closed).

## Verification result

- `git diff --check`: passed.
- `git status`: only the six listed files are attributable to this task. All
  other working-tree entries predate this task and are untouched.
- Zero `src/` files changed. Zero migrations created. Zero standards modified.
- Zero candidate HTML files modified. Only one new HTML artifact exists.
- Sibling links resolve. Roadmap references no external asset.
- Build, typecheck, lint, tests, `audit:load`, Supabase: not run per task constraints.

## Supabase push status

Not applicable. No SQL changed.

## Risks or limitations

- The monolithic source file was untracked (concurrent-agent work). This task
  converted it to a stub per explicit instruction. History survives in git only
  if the file is later committed.
- A fourth view candidate (V4) appeared mid-task from a concurrent agent. It is
  recorded without selection per instruction.
- `fab-standard.md` and `document-form-consolidation-standard.md` carry
  concurrent modifications. This package cites the versions verified in the
  source PRD and does not touch either file.
- Calculation findings rest on static call-graph inspection, not execution.

## Deferred work

- Human selection of the View Page candidate (gate: File 02 §4.1).
- Product answers to Q1–Q5 (defaults recorded).
- Migration-track Forme readiness (gate: File 02 §5, File 03 §6.3).
- Phases A–H implementation under separate authorization.
