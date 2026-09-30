# BOQ Architecture PRD — Relocated

Status: Superseded. This file is a relocation stub, not an authority.
Date: 2026-09-29
Repository path: `docs/prd/boq-architecture-prd.md`

The canonical PRD package lives at `docs/prd/cost-pricing-sheet/`
(previously `docs/prd/boq/`):

- `01-cost-pricing-sheet-product-domain-architecture.md` — product identity, decisions,
  calculation architecture, persistence, rows, groups, CP/SP, columns,
  Sub Description, import, photos, prefix engine, save, conversion, lineage,
  duplicate, audit, export, RFQ isolation, reuse map.
- `02-cost-pricing-sheet-presentation-pdf-view-contract.md` — V12 contract, view architecture,
  candidate evaluation, pdfcn Forme contract, customization, view→PDF parity,
  FAB, responsive expectations, presentation gates.
- `03-cost-pricing-sheet-implementation-readiness-roadmap.md` — phases, dependencies,
  migrations, gates, verification, risks, standards deltas, acceptance,
  non-goals, open questions, old→new section mapping.
- `waterfall-roadmap.html` — animated dependency waterfall (informative only).

Terminology note: "Cost & Pricing Sheet" is the canonical product and domain
name for the document previously called BOQ. "BOQ" survives as the legacy
implementation identifier in code, table names, routes, and historical reports.
This stub filename is preserved so existing references keep resolving.
