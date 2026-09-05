# Record Capture PRD and Audit Report

This report was written by Buffy on 2026-09-05 via Freebuff.

## Objective

Audit the existing expense and input-VAT capture surface. Write a PRD for the minimum viable payment, expense, and running-cost recording capability that Files.tax depends on.

This is a planning and audit task only. No schema, migration, or application code change was made.

## Scope

- Audited the codebase for every expense-adjacent capture surface.
- Created `docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Record-capture-v1.md`.
- Updated `Files-tax-monthly-v1.md` (dependency section) and the folder `Readme.md`.
- Created this report.
- Not modified: application source code, Supabase schema, migrations, `Technical-plan-v1.1.md`, `Technical-plan-v1.2.md`, `NRS-docs/`.

## Baseline Git Status

Captured before editing:

```
 M docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Readme.md
A  docs/reports/general/invoice-to-quotation-revert-blocker.md
 M src/domain/tenant/tenantCreation.ts
 M src/modules/invoices/services/invoiceConversionService.ts
 M src/pages/settings/AdminSettingsSection.tsx
M  src/pages/viewQuotationActions.ts
?? docs/Reports/general/files-tax-monthly-prd-audit-2026-09-05.md
?? docs/Reports/general/invoice-to-quotation-revert-fix.md
?? docs/Reports/general/vat-filing-support-prd-update-2026-09-05.md
?? docs/Reports/general/workspace-management-gaps-audit.md
?? docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Files-tax-monthly-v1.md
?? supabase/migrations/20260905000000_revert_invoice_canonical_tenant_install.sql
?? supabase/migrations/20260905010000_workspace_management_gaps.sql
```

These changes belong to other agents or to earlier sessions. This task did not modify them.

## Audit Findings

### Finding 1: VAT input form exists but requires tax literacy

`src/components/compliance/VatInputsPanel.tsx` has an "Add Entry" button. It opens a sheet form with Date, Vendor/Supplier, Category, Reference, Net Amount, VAT Amount, Recoverable VAT switch, and Notes.

The form requires the user to enter Net Amount and VAT Amount separately. It requires the user to decide recoverability. These are tax-literate fields. An ordinary business owner would need training to split a purchase into net and VAT.

Verdict: EXISTS BUT REQUIRES TAX LITERACY TO USE CORRECTLY.

### Finding 2: No evidence trail on a VAT input

The `tax_input_entries` table (migration `20260520090009_tax.sql`) has no payment link and no evidence column. The `reference` field is free text. A recorded VAT input is a freestanding number with no evidence trail.

### Finding 3: No money-out capture anywhere

The `payments` table has an `invoice_id` foreign key to `invoices`. Every insert in `paymentService.ts` passes `invoice_id`. The only "Record Payment" flow records money received against an invoice. There is no flow to record money paid out to a supplier.

Verdict: DOES NOT EXIST.

### Finding 4: No other expense-adjacent capture surface

The audit searched for expense, supplier-payment, and running-cost surfaces. The project-document prompts mention "supplier" only as a parsed field in AI extraction. The LifetimeDataHub is an export hub, not a capture surface. No running-costs page, supplier-payment form, or expense-upload flow exists.

Verdict: DOES NOT EXIST.

### Finding 5: An uploader pattern exists and is reusable

`src/components/ui/PaymentAttachmentUploader.tsx` provides file selection, drag-and-drop, and validation. Payments store attachments in a JSONB `attachments` column (migration `20260705100000_payment_attachments.sql`). The PRD reuses this pattern; it does not invent a new upload mechanism.

## Summary Verdict

The existing capture surface sits closer to "data only with no entry path" than to "usable by an ordinary user." One tax-literate entry form exists, but no ordinary user can record a business purchase correctly without tax training, no evidence can be attached, and no money-out event can be recorded at all. Record-capture-v1.md therefore represents real work: a new plain-language entry flow, an evidence column, and a money-out record shape.

## Changes Made

### Record-capture-v1.md (new)

Structure:
1. Objective — Files.tax cannot produce trustworthy numbers without a capture surface.
2. What exists today (verified audit findings only).
3. Minimum viable capture flow — one plain-language "record what happened" entry point asking payee, amount, date, plain category, and evidence. Tax treatment is mapped behind the scenes via `Calculations.ts`.
4. Data model — extends `tax_input_entries` (justified from audit evidence) with an evidence column following the payments JSONB pattern, an optional payment link, a plain-language category, and a derived tax-treatment view.
5. Non-goals — no general ledger, chart of accounts, depreciation, full bookkeeping, event taxonomy, business-dashboard reframe, or new VAT engine.
6. Open decisions — six decisions consolidated at the top in the folder's existing pattern.

Tone patterns from `bigdrops-tax-ux-vision-v1.md` are pulled in explicitly (plain-language questions from section 3.2, "Why" explanations from section 3.4, progressive disclosure from section 3.5). The full event taxonomy and business-dashboard reframe are excluded by design.

### Files-tax-monthly-v1.md

Added `Record-capture-v1.md` as a hard blocking dependency in section 8. It is stated as a hard dependency, not an optional enhancement. The note also states that the WHT remittance deadline field remains blocked on the missing subsidiary regulation; a capture surface cannot unblock a missing regulation.

### Readme.md

Extended in its existing format:
- Added `Record-capture-v1.md` to the file directory table.
- Added its TL;DR summary.
- Added its dependency relationship to `Files-tax-monthly-v1.md` in the decisions section.
- Appended two update-log rows.

## Verification

- `bun run audit:load`: passed.
- `bun run typecheck`: passed.
- `bun run build`: skipped due to host hardware policy (AGENTS.md).
- Final `git status`: only the three intended documentation files changed beyond the pre-existing baseline. During the session a concurrent agent staged previously-untracked files (PRD, reports, migrations); this task did not stage, unstage, or modify those actions.

## Skills Used

- `writing-clearly-and-concisely`

## Documentation Standard

ASD-STE100 Simplified Technical English

## Risks or Limitations

- The audit examined tracked source files. Untracked or generated files were not part of the search.
- The data model section specifies requirements, not a migration. The exact column shape is deferred to implementation.
- The plain-language category set and payee identity are open decisions 2 and 3. Tax mapping quality depends on those calls.

## Deferred Work

- Every capture surface marked DOES NOT EXIST in Step 1 requires a build decision before Files.tax's blocked fields can be unblocked:
  - Money-out payment recording (no flow exists).
  - Running-costs page (no page exists).
  - Supplier-payment form (no form exists).
  - Expense-upload flow (no flow exists; only the uploader component pattern exists to reuse).
- Open decisions 1 to 6 in Record-capture-v1.md require project-lead calls.
- The WHT remittance deadline field remains blocked on the missing subsidiary regulation.