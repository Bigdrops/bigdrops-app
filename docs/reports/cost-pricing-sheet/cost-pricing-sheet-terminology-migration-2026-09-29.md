# Cost & Pricing Sheet Terminology Migration Report

This report was written by Muse Spark on 2026-09-29 via OpenCode.

## Objective

Migrate the active PRD package and reports folder from BOQ terminology to the
canonical Cost & Pricing Sheet identity. Preserve architecture, history, and
concurrent-agent work.

## Scope

Documentation and path migration only. No production code, migration, standard,
candidate HTML, or historical report body changed. No runtime command executed.

## Files changed

- `docs/prd/boq/` renamed to `docs/prd/cost-pricing-sheet/` (all 8 files moved intact).
- Three active PRD files renamed to `01/02/03-cost-pricing-sheet-*.md`.
- Active PRD prose converted: 132 + 36 + 33 prose swaps plus path swaps;
  zero non-code `BOQ` remains in the three files. Legacy implementation
  identifiers (`boq_rows`, `BOQ_BUILTIN_COLUMNS`, `convertBOQToQuotation`,
  `BOQ-000001`, audit `'boq'`, report filenames) preserved verbatim.
- `waterfall-roadmap.html`: 14 user-facing swaps. Animation, structure,
  gates, responsive, and reduced-motion behavior untouched.
- `docs/prd/boq-architecture-prd.md`: stub updated to the new package path
  plus the terminology note. Stub filename preserved for existing references.
- `docs/reports/boq/` renamed to `docs/reports/cost-pricing-sheet/` (32 files,
  byte-identical; 22 tracked files staged as git renames).
- `docs/reports/cost-pricing-sheet/README.md` (new): orientation note.
- This report (new).

## Skills used

Skills used: writing-clearly-and-concisely
Documentation standard: ASD-STE100 Simplified Technical English

`PROJECTSKILLINDEX.md` was already read this session. No animation skill was
loaded: the roadmap keeps its existing motion unchanged. `frontend-design` was
not loaded.

## Documentation standard

ASD-STE100 Simplified Technical English

## Changes made

1. Recorded baseline `git status` (concurrent demolition, standard, candidate,
   and report work present; left untouched).
2. Moved the PRD folder after a transient file lock; verified all 8 files by
   name and byte size.
3. Moved the reports folder file-by-file after a directory-level lock; all 32
   files moved. The locked empty `docs/reports/boq/` shell cannot be deleted
   by this task (held by another process); git ignores it.
4. Ran a code-span-aware replacement (fenced blocks, inline code, `<code>`
   protected). Manually fixed diagram leftovers inside text fences.
5. Added the one-time legacy-identifier compatibility note (File 01) and the
   internal-preparation framing with the canonical
   Cost & Pricing Sheet → Quotation → Invoice progression.
6. Left the parallel agent's package files (`README.md`,
   `01-boq-domain-architecture.md`, `02-boq-document-lifecycle.md`,
   `03-boq-presentation-contract.md`) moved but unedited. Left all historical
   report bodies and filenames intact. Left cross-references inside historical
   reports intact.
7. Staged the 22 tracked report renames so git shows clean `R` moves. No commit
   was made. Staging also picked up previously untracked files inside the moved
   folders; this stages nothing for commit by this task and is disclosed here.

## Verification result

- `git diff --check`: passed (exit 0).
- `git status`: 22 `R` renames for tracked reports; `??` for the moved
  untracked PRD package and reports. Pre-existing `M`/`D` entries (demolition,
  standards, candidates, tests) are unchanged from baseline.
- Zero `src/` files changed. Zero migrations. Zero standards modified. Zero
  candidate HTML modified. Zero historical report bodies rewritten.
- Sibling links and evidence paths in the active package resolve to renamed
  locations. Roadmap references no external asset.

## Supabase push status

Not applicable. No SQL changed.

## Risks or limitations

- Staging includes other agents' untracked files co-located in the moved
  folders. Unstaging would require `git reset`, which is prohibited without
  authorization. No commit follows from staging.
- The empty `docs/reports/boq/` shell remains until the holding process
  releases it. A later task can remove it.
- The parallel agent's 4-file package still uses BOQ prose. Harmonizing it
  belongs to that agent, not this task.

## Deferred work

- Removal of the empty locked directory shell.
- View Page candidate selection (still gated, unchanged).
- Any future internal-identifier migration (explicitly not decided here).
