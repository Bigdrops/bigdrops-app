# VAT Filing Support PRD Update Report

This report was written by Buffy on 2026-09-05 via Freebuff.

## Objective

Update the existing Files.tax monthly compliance PRD. Add a future VAT Filing Support capability. The VAT section must not stop at a calculated VAT figure. It must define how the user traces the figure to its underlying transactions and supporting evidence.

This is a documentation-only task. Implementation is deferred.

## Scope

- Updated `docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Files-tax-monthly-v1.md`.
- Updated `docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Readme.md` to keep the PRD represented.
- Created this report.
- Not modified: application source code, Supabase schema, migrations, `Technical-plan-v1.1.md`, `Technical-plan-v1.2.md`, `NRS-docs/`, and all other PRD files.

## Baseline Git Status

Captured before editing:

```
 M docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Readme.md
A  docs/reports/general/invoice-to-quotation-revert-blocker.md
 M src/modules/invoices/services/invoiceConversionService.ts
M  src/pages/viewQuotationActions.ts
?? docs/Reports/general/files-tax-monthly-prd-audit-2026-09-05.md
?? docs/Reports/general/invoice-to-quotation-revert-fix.md
?? docs/Reports/general/workspace-management-gaps-audit.md
?? docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Files-tax-monthly-v1.md
?? supabase/migrations/20260905000000_revert_invoice_canonical_tenant_install.sql
?? supabase/migrations/20260905010000_workspace_management_gaps.sql
```

These changes belong to other agents or to earlier sessions. This task did not modify them.

## Sources Reviewed

- `Files-tax-monthly-v1.md` — the active Files.tax PRD, in full.
- `Readme.md` — the folder master index, in full.
- `bigdrops-tax-ux-vision-v1.md` — checked for evidence-upload references (an open audit question exists at line 138; no evidence layer is confirmed).
- Searched the PRD folder for WhatsApp references: none exist.

## Changes Made

### Files-tax-monthly-v1.md

- Section 1: added the VAT filing-support objective and the out-of-scope delivery mechanism.
- Section 2: added open decisions 9 (delivery mechanism) and 10 (evidence requirements).
- Section 3: added two mapping rows — supporting evidence status and filing status.
- New section 4 "VAT Filing Support" with subsections:
  - 4.1 Purpose.
  - 4.2 Evidence chain.
  - 4.3 Compliance states: CALCULATED, SUPPORTED, EXCEPTIONS, FILED, PAID, RECONCILED.
  - 4.4 Transaction traceability for output VAT, input VAT, and adjustments.
  - 4.5 Evidence model.
  - 4.6 Exception experience.
  - 4.7 Filing and payment separation.
  - 4.8 Period-end experience.
  - 4.9 Relationship to monthly tax compliance.
  - 4.10 Trust and tax-correctness rules.
  - 4.11 Execution and delivery decision.
- Renumbered old sections 4 to 8: propagation (5.1 to 5.6), hard rule (6), build order (7), dependencies (8).
- Updated the internal reference "see 4.5" to "see 5.5".
- Added propagation subsection 5.7: WhatsApp is a future channel, not existing infrastructure.
- Added build-order item 4: VAT Filing Support is a future execution decision.
- Added a dependency row for VAT Filing Support.

### Readme.md

- Extended the Files.tax TL;DR with the VAT Filing Support summary.
- Appended two update-log rows.

## Verification

- `bun run audit:load`: passed.
- `bun run typecheck`: passed.
- `bun run build`: skipped due to host hardware policy (AGENTS.md).
- Final `git status`: only the three intended documentation files changed beyond the pre-existing baseline. See "Final Git Status" below.

### Final Git Status

```
 M docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Readme.md
 M docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Files-tax-monthly-v1.md
A  docs/reports/general/invoice-to-quotation-revert-blocker.md
 M src/modules/invoices/services/invoiceConversionService.ts
M  src/pages/viewQuotationActions.ts
?? docs/Reports/general/files-tax-monthly-prd-audit-2026-09-05.md
?? docs/Reports/general/invoice-to-quotation-revert-fix.md
?? docs/Reports/general/workspace-management-gaps-audit.md
?? docs/Reports/general/vat-filing-support-prd-update-2026-09-05.md
?? docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Files-tax-monthly-v1.md
?? supabase/migrations/20260905000000_revert_invoice_canonical_tenant_install.sql
?? supabase/migrations/20260905010000_workspace_management_gaps.sql
```

`Files-tax-monthly-v1.md` and `Readme.md` were already part of the baseline (uncommitted prior-session work). This task extended them. No pre-existing file from another agent was reverted or overwritten.

## Skills Used

- `writing-clearly-and-concisely`

## Documentation Standard

ASD-STE100 Simplified Technical English

## Risks or Limitations

- The PRD does not prescribe delivery mechanism, evidence rules, or integration. These are open decisions 9 and 10.
- Section numbers 4 to 7 in `Files-tax-monthly-v1.md` shifted by one. External citations of the old numbers must be updated.
- Evidence requirements remain undefined until the applicable Nigerian tax rules are confirmed at implementation time.

## Deferred Work

- Delivery mechanism decision (open decision 9).
- Evidence requirements confirmation (open decision 10).
- Direct filing, direct payment, tax-authority integration, and export formats — all deferred by design (section 4.11).