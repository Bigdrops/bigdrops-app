# Tax PRD Folder Evidence-Correction Report

This report was written by Buffy on 2026-09-05 via Freebuff.

## Objective

Correct the six documentation-integrity issues that the Tax PRD Folder Alignment Audit identified. The corrections remove or downgrade claims that were unsupported, contradicted, or stronger than the repository evidence permits.

This is a documentation-only task. No architecture, code, schema, or statutory rule was changed.

## Scope

- Correct Record-capture-v1.md section 3.3 and Open Decision 6.
- Correct Files-tax-monthly-v1.md section 3 mapping row and Open Decision 7.
- Correct multi-tenancy-alignment.md description of tax_input_entries scoping.
- Add the standard reference-only banner to luca-v05-accounting-architecture-reference.md.
- Leave Readme.md unchanged because the banner addition resolves the label inconsistency.
- No other PRD, reference, source-code, migration, generated, or report file was modified.

## Files changed

- `docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Record-capture-v1.md`
- `docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Files-tax-monthly-v1.md`
- `docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/multi-tenancy-alignment.md`
- `docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Refrences/luca-v05-accounting-architecture-reference.md`
- `docs/reports/GENERAL/tax-prd-folder-evidence-correction-2026-09-05.md` (this report, new)

## Skills used

writing-clearly-and-concisely

## Documentation standard

ASD-STE100 Simplified Technical English

## Changes made

### Record-capture-v1.md, section 3.3

The text claimed the mapping derives the net/VAT split "using the authoritative calculation layer (`src/lib/Calculations.ts`)".

The corrected text states that the calculation layer provides the forward calculation path only. It does not expose a gross-to-net/VAT reverse function. A reverse derivation requires new calculation-engine work, not reuse. The presentation-layer rule is unchanged.

### Record-capture-v1.md, Open Decision 6

The text claimed "NTAA §22(4) exempts a small business from the monthly VAT return rule."

The corrected text states that this is an unresolved statutory question pending the NTAA 2025 primary source. It states that the NTAA text is absent from NRS-docs/, so section 22(4) cannot be quoted or treated as verified. It states that no separate small business classification is introduced and that the verified NTA 2025 classification is small company (section 202).

### Files-tax-monthly-v1.md, section 3 mapping row

The text claimed the day-21 VAT return deadline was "Confirmed from primary text".

The corrected text states that the general VAT return deadline is unresolved in this repository. NTA section 156(1) delegates the return due date to the NTAA 2025. The NTAA primary text is absent from NRS-docs/, so the day cannot be verified here. The 21st remains the PRD default only (Technical-plan-v1.1 section 8.1); it is not statutory authority. No invented deadline was introduced.

### Files-tax-monthly-v1.md, Open Decision 7

The text claimed "NTAA §22(4) exempts a small business from the monthly VAT return rule in §22(1)."

The corrected text applies the same treatment as Record-capture Open Decision 6. The exemption remains an open question, not a verified rule.

### multi-tenancy-alignment.md

The text described tax_input_entries as "an entity-scoped table".

The corrected text describes the evidenced scoping: the base definition is scoped by settings_id (migration `20260520090009_tax.sql`). The migration creates the table with `settings_id integer NOT NULL` and a foreign key to `settings(id)`. No entity_id column exists. Tenant-schema copies of the table exist via the tenant provisioning migrations, but the base table definition is settings_id-scoped.

### luca-v05-accounting-architecture-reference.md

The file had no standard reference banner. The other four reference files carry "REFERENCE ONLY — NOT STATUTORY AUTHORITY".

The standard banner was added directly after the title, followed by the standard statement that the document is not a statutory source. The banner states that the canonical NTA 2025 materials in NRS-docs/ remain the source of truth, that Luca source code must not be copied, and that Luca is licensed under the Luca Community License v1.0. The substantive accounting-architecture findings were not altered.

### Readme.md

Not changed. The master-index claim that every reference file is labeled "REFERENCE ONLY — NOT STATUTORY AUTHORITY" is now accurate.

## Evidence consulted

- `src/lib/Calculations.ts`: exports `calculateDocument`, `normalizeDocumentInput`, and `computeDocument` only. No reverse gross-to-net/VAT function exists.
- `supabase/migrations/20260520090009_tax.sql`: `tax_input_entries` created with `settings_id integer NOT NULL`; foreign key to `settings(id)`.
- `supabase/migrations/20260817000000_plan_c_live_entity_backfill.sql`: copies public `tax_input_entries` rows into tenant schemas; no entity_id column.
- The Tax PRD Folder Alignment Audit: `docs/reports/GENERAL/tax-prd-folder-alignment-audit-2026-09-05.md`.

## Verification

- `git status --short` before edits: clean working tree.
- `git status --short` after edits: only the four authorized documentation files show changes, plus this new report.
- `git diff` reviewed: the diff contains only the intended documentation corrections.
- `bun run audit:load`: not run. The task forbids it for this documentation-only pass.
- `bun run typecheck`: not run. The task forbids it.
- `bun run lint`: not run. The task forbids it.
- `bun run build`: not run. The project hardware policy excludes it.

Concurrent-agent observation: `src/domain/tenant/tenantCreation.ts`, `src/domain/tenant/tenantGate.ts`, and `src/pages/CompanyCreation.tsx` show uncommitted modifications that appeared during this session. This task did not make or touch them. The baseline for this task was a clean working tree, so these changes belong to another agent and are reported rather than modified.

## Risks or limitations

- The NTAA 2025 primary text remains absent from the repository. All NTAA-dependent items stay unresolved by design.
- The three concurrent source-file changes were not reviewed. They are outside this task's scope.
- This task did not verify markdown rendering of the edited tables. The edits add no pipe characters, so the table structure is preserved.

## Deferred work

- Commit the NTAA 2025 gazette text to NRS-docs/ so NTAA section 22 citations resolve inside the repository.
- When the NTAA text lands, reconcile the two open decisions and the Files-tax section 3 row against it.
- Implement the gross-to-net/VAT reverse function in src/lib/Calculations.ts only when the reverse derivation is adopted.