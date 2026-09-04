# AGENTS.md and README Calculation Entry-Point Documentation Fix Report

This report was written by Buffy on 2026-09-04 via Freebuff.

---

## Objective

Correct a documentation defect. AGENTS.md section 3 named
`calcTotals()` and `resolveRowVat()` as the required financial
calculation entry points. The prior inspection proved these
functions have zero production callers. Every live path (form,
view, PDF, save) uses `computeDocument()` in
`src/lib/Calculations.ts`. This task corrected the documentation to
match reality.

This is a documentation-only task. No code was changed.
`src/domain/invoice/calculations.ts`, `calcTotals()`, and
`resolveRowVat()` remain in place, unused, for now.

## Scope

- `AGENTS.md` section 3, Financial calculations subsection
- Repository root `README.md`
- `docs/standard/document-save-orchestration.md` (read-only check)
- Report under `docs/reports/GENERAL/`

## Files Changed

| File | Change |
|------|--------|
| `AGENTS.md` | Replaced the `calcTotals()`/`resolveRowVat()` entry-point bullet with the corrected `computeDocument()` guidance plus a deprecation note |
| `README.md` | Corrected the Architecture Highlights claim that called `calcTotals()` and `resolveRowVat()` "the core pipelines" |

## Skills Used

- pdf-rendering-correctness

## Documentation Standard

ASD-STE100 Simplified Technical English

## Changes Made

### AGENTS.md section 3

The old second bullet:

```text
· Use calcTotals() and resolveRowVat() for financial calculations.
```

was replaced with:

```text
· Use computeDocument() for financial calculations. It wraps
  normalizeDocumentInput() and calculateDocument() and is the
  only entry point used in production.
· calcTotals() and resolveRowVat(), in
  src/domain/invoice/calculations.ts, are deprecated. They have
  no production callers as of 2026-09-04. Do not call them in
  new code. Do not remove them without a separate, explicit task —
  this patch does not authorize deletion.
```

The other three bullets in the Financial calculations subsection
are unchanged:

- Do not duplicate financial calculation logic.
- Do not bypass Calculations.ts.
- Quotations must reuse the invoice/domain financial layer.

### Repository root README.md

The Architecture Highlights section claimed:

```text
`calcTotals()` and `resolveRowVat()` are the core pipelines.
```

This was corrected to:

```text
`computeDocument()` is the only entry point used in production.
`calcTotals()` and `resolveRowVat()` in
`src/domain/invoice/calculations.ts` are deprecated with no
production callers as of 2026-09-04.
```

The rest of the README bullet ("`src/lib/Calculations.ts` owns all
pricing, tax, and total computations" and "No duplicate logic
exists elsewhere") is consistent with the correction and is
unchanged.

## Verification Result

- `bun run audit:load`: passed. Only pre-existing warnings, no new
  findings.
- `bun run typecheck`: passed (exit code 0).
- `git status --short` before changes:
  `A docs/reports/invoice-quote/calculation-entry-point-split-inspection.md`
- `git status --short` after changes:
  - `M AGENTS.md`
  - `M README.md`
  - `A docs/reports/invoice-quote/calculation-entry-point-split-inspection.md`
- The staged inspection report is my own prior work from the
  inspection task. It was pre-existing at baseline and was left
  staged and untouched.
- No pre-existing changes from another agent were reverted or
  overwritten. The working tree was otherwise clean at baseline.
- `bun run build`: not executed (hardware policy).

### Step 2 check: other AGENTS.md references

The rest of `AGENTS.md` was searched for `calcTotals()`,
`resolveRowVat()`, or any claim that
`src/domain/invoice/calculations.ts` is the financial source of
truth. No other reference exists. The only occurrences of those
function names in `AGENTS.md` now are inside the new deprecation
note. Two other lines mention calculations without making an
entry-point claim and are correct as written:

- The skill-override protection list includes "financial
  calculation integrity".
- The architecture map describes the `src/lib/` folder as "Core
  utilities, formatters, Calculations.ts".

### Step 3 check: repository root README

The root README did mention the calculation entry point by name.
Its Architecture Highlights bullet was corrected as described
above. The README file-tree diagram also lists
"`Calculations.ts` (single source of truth)" under `src/lib/`.
That claim agrees with the correction (the canonical file remains
the source of truth) and was left unchanged.

The PRD-folder `Readme.md` under
`docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/`
was not touched. It documents PRD file status, not the calculation
engine.

### Step 4 check: docs/standard/document-save-orchestration.md

This file was read and left unchanged. Its section 5.1 states:

```text
Strategies must not import or call computeDocument, calcTotals, or
resolveRowVat. Financial calculation is the exclusive domain of
src/lib/Calculations.ts. Strategies receive pre-computed totals from the
caller.
```

This sentence already scopes financial calculation ownership to
`src/lib/Calculations.ts`, which matches the correction. It does
not separately flag `calcTotals()`/`resolveRowVat()` as dead, but
that is a save-strategy rule, not an entry-point claim, so no
change was needed.

## Risks or Limitations

- This task corrected documentation only. The deprecated functions
  still exist and are still exported from
  `src/domain/invoice/calculations.ts` and from the
  `@/domain/invoice` barrel and the `useInvoiceColumns` re-export
  hub. New code could still call them until the docs-only status
  changes.
- The README and AGENTS.md now carry a dated statement
  ("as of 2026-09-04"). If the functions are later removed or
  revived, these lines need updating again.

## Deferred Work

- Whether `calcTotals()` and `resolveRowVat()` should eventually be
  deleted is still an open decision. This task did not make it.
  The deprecation note in AGENTS.md states that removal requires a
  separate, explicit task.
- The re-export surfaces (`useInvoiceColumns.tsx` and the
  `@/domain/invoice` barrel) still expose the deprecated functions.
  Cleaning those exports is tied to the deletion decision and was
  not performed here.
