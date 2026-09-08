# Gap 1 Reporting Foundation Specification Report

Correction pass (v1.1, 2026-09-08, Buffy via Freebuff): the canonical
specification was corrected, not redesigned. Reversal semantics are now
explicit: a posted entry is active only if it has not been reversed by
a posted reversal entry; a reversed original is excluded from the
active derivation; the reversal entry remains active unless itself
reversed; the pair nets to zero as equal-and-opposite journal facts; a
later-period reversal keeps the original period's activity intact and
preserves the audit-visible correction event; no partial-reversal
support. Added the fixed implementation boundary (Journal →
deterministic account/period aggregation → trial balance) and extended
the non-scope list. Files touched: the Gap 1 specification, the PRD
Readme index row and TL;DR, and this report. No code, migration,
schema, test, or accounting behavior changed. No build, typecheck,
test, or audit:load run. Gap 1 remains one implementation increment.

This report was written by Buffy on 2026-09-08 via Freebuff.

## Objective

Create the canonical implementation specification for Gap 1: the
Journal-Derived Reporting Foundation. Documentation only. No code,
migration, schema, test, or UI change.

## Scope

- Establish the current reporting state by repository inspection.
- Define the minimum read-only derivation from the posted journal.
- Keep Gap 2 (controlled reversal path) separate.
- Preserve all closed accounting boundaries.

## Files Changed

- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Gap-1-journal-derived-reporting-foundation-spec-v1.md (new — the canonical specification)
- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Readme.md (index row, TL;DR section 2i, dependency entry, update log row)
- docs/reports/taxation-made-easy/gap-1-reporting-foundation-spec-report-2026-09-08.md (this report)

No other file was created or modified. No application code, migration,
schema, or test was touched.

## Skills Used

Skills used: karpathy, writing-clearly-and-concisely
Documentation standard: ASD-STE100 Simplified Technical English

## Changes Made

1. Created the canonical Gap 1 specification with all required
   sections: purpose, architectural position, existing foundation,
   current reporting state, gap definition, scope, non-scope, data
   model, derivation rules (posted-only, un-reversed, sign convention,
   opening/closing, trial-balance equality), period semantics,
   traceability, invariants, performance/caching boundary, dependency
   map, implementation boundary, UI position, matrix, open questions,
   and sources.
2. Determined the current state by inspection: no trial balance, no
   account-balance derivation, no reporting view or function in any
   accounting migration, and list-only accounting pages. Gap 1 is
   genuinely MISSING and is one small increment. Nothing is defective;
   nothing needs recreation.
3. Fixed the derivation rules: active posted lines only per the
   explicit reversal rule; side + non-negative amount sign convention
   with net = debit − credit; bounded opening/closing chains by period
   order; trial-balance equality asserted and never repaired; exact
   NUMERIC/text amounts; deterministic output; zero mutation.
4. Deferred UI explicitly (section 16) and named the Adaptive
   Mobile-First UIUX Facelift PRD as first-class authority for any
   later reporting surface. Deferred caching until a proven need.
5. Recorded bounded VERIFY DURING IMPLEMENTATION items (draft-status
   residue, period ordering key, surface names) and separated them
   from genuine project decisions (authority-switch consumer and
   timing).

## Verification Result

Verification:
- git status before changes: pre-existing modified files
  (Readme.md from the prior task, three client-detail source files)
  and pre-existing untracked files (Block A spec, Block A report,
  client-detail report, vendor-forme directory) — all preserved
  untouched
- git status after changes: only the three files above added or
  modified by this task
- git diff --check: passed
- bun run build, bun run typecheck, bun run test, bun run audit:load:
  not run — documentation-only hard gate, no code or schema touched

## Risks or Limitations

- The current-state determination rests on repository inspection of
  source, migrations, and pages, not on a hosted database probe. The
  inspection was sufficient: reporting code cannot exist outside the
  repository paths checked.
- Two balance authorities coexist until the recorded authority-switch
  follow-up runs. The specification keeps the switch plan explicit.
- Draft-status residue and period ordering key are verified during the
  implementation increment, per the specification's bounded-verification
  items.

## Deferred Work

- Implement the Gap 1 derivation increment per the specification.
- Plan and execute the balance-authority switch (separate follow-up).
- Build any reporting UI (separate task, Adaptive UI/UX authority).
- Gap 2: controlled posted-entry reversal path (separate increment).
