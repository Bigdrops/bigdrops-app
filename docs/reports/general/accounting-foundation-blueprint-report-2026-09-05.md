# Accounting Foundation Blueprint v1 Report

This report was written by Buffy on 2026-09-05 via Freebuff.

## Objective

Create the BIGDROPS Accounting Foundation Blueprint v1. The blueprint is an implementation-independent architecture specification for the financial foundation that sits below the business-recording layer and above the future Nigerian tax engine. The task is documentation-only.

## Scope

In scope:

- Create `docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Accounting-foundation-blueprint-v1.md`.
- Read the existing Tax PRD documents, references, canonical NTA text, and audit reports as evidence.
- Write a task report.

Out of scope:

- Application source code
- Supabase migrations and schema
- Generated files
- Existing PRDs, references, and audit reports
- The master `Readme.md` (unchanged, per task instruction)

## Files changed

| File | Change |
| :--- | :--- |
| `docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Accounting-foundation-blueprint-v1.md` | Created. New blueprint document. |
| `docs/reports/GENERAL/accounting-foundation-blueprint-report-2026-09-05.md` | Created. This report. |

No other file was modified by this task.

## Skills used

`writing-clearly-and-concisely`

Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

The blueprint defines, in this order: purpose, architectural position, relationship to existing documents, domain boundaries, record engagement boundary, source transaction model, chart of accounts, journal/posting kernel, money precision and rounding, accounting periods, accounting reporting, revenue, payments and allocations, expenses, fixed assets and depreciation, corrections and reversals, provenance and auditability, tenant isolation, accounting-to-tax bridge, tax calculation context, tax rules boundary, loss register, compliance boundary, non-goals, phased architecture, architectural invariants, open decisions, acceptance criteria, and change log.

Key decisions:

- Money precision is resolved to Decimal.js arithmetic plus Postgres NUMERIC(18,2) storage, ROUND_HALF_UP, consistent with `src/lib/Calculations.ts` (line 38). The reference approaches (Luca, Beancount, Balaka, OpenBooks, TekVwarho, OpenFisca, TaxBridge) are compared in the blueprint. Binary float is prohibited.
- Double-entry posting is the accounting invariant. Unbalanced postings are impossible at the posting boundary.
- Posted entries are immutable. Corrections use reversal plus linked correcting entries.
- Authoritative balances derive from posted journal entries. Caches are optimizations only.
- The accounting boundary is entity-scoped. `settings_id` and `entity_id` are not conflated.
- Accounting depreciation and tax capital allowances are separate calculations.
- Record Engagement is upstream. Inferred activity never becomes accounting fact without confirmation or recording.
- NTAA-dependent statutory matters remain unresolved. No statutory value is invented.

Verified statutory anchors cited in the blueprint, from `NRS-docs/NIGERIA-TAX-ACT-2025.md`: small company definition (line 4502), CIT rates 0%/30%/25%-via-Order (lines 1604–1608), VAT remittance deadline §155(4) (line 3225).

## Verification

- `git status --short` (before): working tree contained pre-existing modifications from a concurrent agent (`src/domain/tenant/tenantCreation.ts`, `src/domain/tenant/tenantGate.ts`, `src/pages/CompanyCreation.tsx`, `src/tests/critical/firstCompanyBootstrap.test.js`, `docs/Reports/general/first-company-bootstrap-2026-09-05.md`) and the previous evidence-correction pass (four PRD files, `docs/Reports/general/tax-prd-folder-evidence-correction-2026-09-05.md`). These were left untouched.
- `git status --short` (after): the only new file attributable to this task is `Accounting-foundation-blueprint-v1.md`. No `src/`, `supabase/`, migration, or unrelated PRD file changed.
- `git diff --stat` reviewed. The diff contains only the intended blueprint file.
- `bun run build`, `bun run typecheck`, `bun run lint`, and `bun run audit:load` were not run, per task instruction and hardware policy.

## Risks or limitations

- The blueprint is a draft architecture. It is not implemented.
- The blueprint cannot verify NTAA provisions because the NTAA 2025 primary text is absent from the repository.
- The master `Readme.md` was not updated to index the new blueprint. The task instructed to prefer leaving it unchanged.

## Deferred work

- Readme indexing of the blueprint, if required by a later task.
- Phase 1 implementation planning (schema DDL, chart of accounts seed, posting kernel design).
- Reverse gross-to-net/VAT derivation design.
- Any NTAA-dependent decision remains deferred until the primary text is available.