# Record Capture and Accounting Foundation Reconciliation Report

This report was written by Buffy on 2026-09-05 via Freebuff.

## Objective

Reconcile Record-capture-v1.md with the approved Accounting-foundation-blueprint-v1.md. The PRD folder must not contain contradictory scope statements. The reconciliation is documentation-only.

## Scope

- Rewrite Record-capture-v1.md section 5 (Non-Goals) so it distinguishes Record Capture-specific exclusions from superseded project-level exclusions.
- Verify the Accounting Foundation Blueprint already establishes the upstream/downstream relationship.
- Update the Taxation PRD folder Readme.md: file directory, summaries, dependencies, update log.
- Write this report.

The task did not implement accounting code, database schema, migrations, UI, or tax-engine logic.

## Files Inspected

- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Record-capture-v1.md
- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Accounting-foundation-blueprint-v1.md
- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Readme.md
- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Files-tax-monthly-v1.md
- docs/PROJECTSKILLINDEX.md

## Files Changed

- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Record-capture-v1.md
- docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Readme.md
- docs/Reports/general/record-capture-accounting-foundation-reconciliation-2026-09-05.md (this report)

No other file was changed by this task.

## Skills Used

writing-clearly-and-concisely

## Documentation Standard

ASD-STE100 Simplified Technical English

## Record Capture Section 5 Item Classification

| Item | Classification | Reason |
| :--- | :--- | :--- |
| A general ledger | Partially superseded | Now an approved downstream Accounting Foundation capability (blueprint section 8). Record Capture itself still does not implement it. |
| A chart of accounts | Partially superseded | Now an approved downstream Accounting Foundation capability (blueprint section 7). Record Capture itself still does not implement it. |
| A depreciation or asset register | Partially superseded | Now an approved downstream Accounting Foundation capability (blueprint section 15). Record Capture itself still does not implement it. |
| A full bookkeeping system | Partially superseded | Now an approved downstream Accounting Foundation capability (blueprint sections 8, 10, 11, 16). Record Capture itself still does not implement it. |
| The full event taxonomy from bigdrops-tax-ux-vision-v1.md | Unchanged | Not an accounting capability. The blueprint does not adopt the vision taxonomy. |
| The business-dashboard reframe of the Compliance Hub | Unchanged | Not an accounting capability. |
| A new VAT calculation engine | Unchanged | src/lib/Calculations.ts stays the financial source of truth. The blueprint section 9 applies the same rule to the ledger. |
| A new notification or scheduling system | Unchanged | Files.tax propagation decisions stay in Files-tax-monthly-v1.md. |
| An automatic bank feed or receipt OCR | Unchanged | The blueprint section 24 also defers bank feeds. |

## Changes Made to Record-capture-v1.md

Section 5 was rewritten into two subsections:

- Section 5.1 lists the four superseded project exclusions. Each item now points to the authoritative Accounting Foundation Blueprint section. Record Capture remains out of scope for each item.
- Section 5.2 lists the unchanged Record Capture-specific non-goals. Two items now cross-reference the blueprint where the blueprint applies the same rule (sections 9 and 24).

The section opens with a dated correction note (2026-09-05). The note states that the approved BIGDROPS scope now includes profit-based CIT capability, which requires a real accounting foundation. No other Record Capture requirement was altered.

## Accounting Foundation Blueprint Relationship Check

The blueprint already establishes the required relationship:

- Section 2 names Record Engagement as an upstream behavioral layer and tax as a downstream layer.
- Section 3 maps Record-capture-v1.md as the plain-language recording layer.
- Section 5 defines the Record Engagement to Accounting boundary and the rule that inferred activity never becomes an accounting fact without recording.

The relationship is sufficiently explicit. The blueprint required no change.

## Readme.md Changes

- File directory: Accounting-foundation-blueprint-v1.md row added with status Draft, audience Engineering/Architecture, and a core-focus summary.
- Summaries: new TL;DR section 2g added for the blueprint.
- Dependencies: new bullet added that represents the three-way relationship between Record-capture-v1.md, Accounting-foundation-blueprint-v1.md, and Files-tax-monthly-v1.md. It distinguishes current capability (Files.tax consumes Record Capture data today) from future capability (profit-based CIT requires the Accounting Foundation).
- Update log: three entries appended. The blueprint creation is dated 2026-09-05, matching the blueprint's own header and change log. The Record Capture reconciliation and the Readme update are dated 2026-09-05.

## Update Log Changes

Three rows appended to the Readme update log:

- Accounting-foundation-blueprint-v1.md created.
- Record-capture-v1.md section 5 reconciled.
- Readme.md updated with the blueprint index entries.

## Verification Result

- git status before changes: captured. Pre-existing changes from other agents were preserved untouched.
- No application source, schema, migration, or generated file was modified by this task.
- No build, typecheck, lint, or audit:load command was run. The task forbade them.
- git status after changes: the only files attributable to this task are the two documentation files and this report.
- Concurrent-agent changes observed during the task: src/domain/tenant/tenantCreation.ts, src/domain/tenant/tenantGate.ts, src/pages/CompanyCreation.tsx, src/pages/WorkspaceCreation.tsx, two first-bootstrap test files, and two first-bootstrap reports. These were not modified.

## Risks or Limitations

- The blueprint remains a draft. Its section numbers may shift in a future revision. The pointers in Record-capture-v1.md section 5 must be updated if the blueprint sections are renumbered.
- Files-tax-monthly-v1.md does not describe a direct CIT-estimate dependency. The CIT-estimate consumption lives in Record-capture-v1.md section 3.4. The Readme represents the relationship from the documents as written.

## Deferred Work

- No accounting implementation was started.
- No Accounting Foundation implementation planning beyond the blueprint.
- No statutory values were introduced or resolved.

This was a project-lead-approved scope expansion, not an unauthorized addition. The reconciliation exists to keep the PRD folder internally consistent with the approved accounting-foundation direction.