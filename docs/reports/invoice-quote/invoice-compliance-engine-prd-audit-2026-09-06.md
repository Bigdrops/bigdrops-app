# Invoice Compliance Engine PRD Audit Report

This report was written by Muse Spark on 2026-09-06 via OpenCode.

## Objective

- Audit Technical-plan-v1.1.md against the codebase.
- Answer all v1.1 §11 open questions with evidence.
- Answer all tax-ux-vision-v1.md §6 audit questions.
- Validate §4 field IDs and §5 calculation claims.
- Scope only what correct WHT and VAT outcomes need.

## Scope

- PRD set under docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/.
- Code evidence from src/lib/Calculations.ts, migrations, domain, hooks, components.
- Read-only. No code changes.

## Files changed

None — read-only audit.

## Skills used

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Changes made

None.

## Finding 1 — 11.1 APP selection

- Still open. No APP adapter exists in code. No file named nrsAdapter or equivalent exists. No APP provider config exists.

## Finding 2 — 11.3 audit diffing registration

- Manual registration IS required. src/lib/audit.ts lines 4-90 define per-module tracked-field lists (INVOICE, QUOTATION, PROJECT, CSR, WAYBILL, RECEIPT, LETTER). Lines 154-161 diff only listed fields via pick(). New NRS fields need manual list entries.

## Finding 3 — 11.4 IH-5 Reference mapping

- Open. invoices.po_number exists (20260520090003_invoices.sql line 41). No reference column exists. The mapping remains unconfirmed in code.

## Finding 4 — 11.5 decimal precision

- Confirmed. src/lib/Calculations.ts line 34 imports decimal.js. Line 38 sets precision 20, ROUND_HALF_UP. Lines 179-192 build all accumulators as Decimal. No second math library needed.

## Finding 5 — 11.6 tenant legal form

- Not stored anywhere. Repo-wide search for legal_form finds zero matches. tenantCreation.ts line 64 sets a different concept (entityType default company). SP-12 addition is genuinely needed.

## Finding 6 — Prompt STEP 5 premise correction

- The prompt states AGENTS.md names calcTotals() and resolveRowVat() as required entry points. This is inverted. AGENTS.md lines 77-82 name computeDocument() as the only entry point and mark calcTotals()/resolveRowVat() deprecated.
- No function named calcDocument exists anywhere in src/. The PRD uses computeDocument(), never calcDocument().
- Deprecated functions still exist (src/domain/invoice/calculations.ts lines 195, 200) with dead imports in src/components/useInvoiceColumns.tsx lines 29-30, 59-60. Zero invocations exist. AGENTS.md "no production callers" holds for calls, not imports.

## Finding 7 — §6.1 Payments module exists

- YES. payments table exists (20260520090003_invoices.sql lines 75-95): id, invoice_id, amount, date, method, reference, notes, cash_amount, wht_amount, currency_code, wht_rate, wht_type, wht_certificate_ref, recorded_by, voided_at, void_reason, source, bank_account_id. Later migrations add attachments, receipts, voids, metadata.

## Finding 8 — §6.2 Invoice-Payment link exists

- YES. payments.invoice_id links payment to invoice. invoices.status (default unpaid, line 16) remains as a derived flag. Both mechanisms coexist. Payment is not flag-only.

## Finding 9 — §6.3 Advance sheet and revert dialog

- InvoiceAdvanceSheet.tsx exists. Its contract covers advance-invoice labels, numbering, and modes. Its props contain no payment-table fields. It does not touch payment data.
- No RevertInvoiceDialog component exists. Only src/tests/invoice/listRevertFlow.test.js references a revert flow.

## Finding 10 — §6.4 No expense module

- Does not exist. No expense or supplier-payment tables, pages, or modules exist. Only chart-of-accounts scaffolding (src/domain/accounting/types.ts line 6) and in-flight concurrent migrations exist. Expense support is new-from-zero work.

## Finding 11 — §6.5 Evidence upload exists

- YES. PaymentAttachmentUploader.tsx, documentAttachmentPolicy.ts, attachmentTypes.ts exist outside any Cloudinary item-photo path. wht_receipts.receipt_file_url (line 109) plus the payment_attachments migration confirm receipt evidence paths. WHT panels exist under src/components/compliance/.

## Finding 12 — §6.6 Audit covers receipts and voids

- Audit covers more than four document modules. src/lib/audit.ts lines 84-90 add RECEIPT and LETTER tracked lists. Lines 501, 521 register receipt and payment-void status events. Payment domain events flow through record_* RPC functions.

## Finding 13 — §4 SP fields are new

- SP-1 to SP-11 have no equivalents. settings holds company and bank fields only. No TIN, state_code, lga_code, or postal_zone columns exist. All types are text, matching snake_case convention. No collisions.

## Finding 14 — §4 CL fields are new

- clients holds name, address, phone, email, category, notes, city, state, contact_person (core_tables.sql lines 87-99). No tin, client_type, deducts_wht, state_code, or lga_code columns exist. email and phone already exist, so CL-2 and CL-3 need no new columns. CL-10 boolean and CL-11 enum are new. No collisions.

## Finding 15 — §4 IH fields are new

- No document_currency_code, tax_currency_code, issue_time, invoice_type_code, or reference columns exist. po_number exists for the IH-5 mapping check. All text or time types match conventions. No collisions.

## Finding 16 — §4 LI fields are new

- invoice_items holds vat_rate and discount_rate numerics (lines 57, 68). No transaction_nature, hsn_or_service_code, product_category, or tax_category_code columns exist. Enum plus text types match conventions. No collisions.

## Finding 17 — §4.5 NRS metadata is new

- No transmission_status, irn, csid, qr_code_payload, rejection_reason, or cleared_at columns exist on invoices. The separate-object rule is implementable. No collisions.

## Finding 18 — §4.6 WHT ledger partially exists

- wht_receipts table exists with payment_id, invoice_id, wht_amount, receipt_status, receipt_file_url, receipt_number. Missing versus the PRD: client_id link, status enum values (untracked/requested/verified), verified_at. Smallest change is three additive columns, not a new table.

## Finding 19 — §5 engine claims verified

- computeDocument() is the entry point (Calculations.ts line 767). It wraps normalizeDocumentInput (line 601) and calculateDocument (line 141). No calcDocument exists.
- Arithmetic is decimal.js throughout, not floating-point. Quote: `new Decimal(v == null ? 0 : v)` (line 154), accumulators built as `new Decimal(0)` (lines 179-192).
- Null-versus-zero semantics from PRD §1.3 are visible in row handling (install_rate null check, line 201).

## Finding 20 — Step 6a payments today

- payments table plus receipt, void, attachment, and metadata migrations. Record-payment UI and service layer exist. Status flag plus linked payment rows coexist.

## Finding 21 — Step 6b smallest WHT schema addition

- Add client_id, verified_at to wht_receipts plus the three-value status enum. Net-received derives from payments cash_amount per invoice_id. Expected-WHT comparison reads row rates from LI-1 once added. No new tables needed.

## Finding 22 — Step 6c smallest expense addition

- None for invoice WHT/VAT correctness. CIT turnover estimate (§8.2/8.3) can sum settled payments per period from existing tables. Any expense table serves only estimate accuracy, not correctness.

## Finding 23 — Step 6d out of scope

- General expense categorization, receipt OCR, bank feed import, supplier ledgers, event taxonomy, dashboard reframe, savings suggestions. None required for invoice WHT/VAT outcomes.

## Verification result

- bun run audit:load: not run (read-only task).
- bun run typecheck: not run (read-only task).
- bun run build: not run (hardware policy).
- git status before and after: pre-existing concurrent changes untouched. Only this report file added.

## Risks or limitations

- Column evidence comes from migration files, not a live database inspect. Applied state may differ.
- Advance sheet internals traced via contract only, not full write paths.
- Concurrent agents edited nearby accounting files during this audit. Findings cite pinned file states.
- OpenAI review claim of an existing Payments module is confirmed. Its other vision claims were not audited.

## Deferred work

- Answer 11.1 APP selection (business decision).
- Confirm IH-5 mapping (product check).
- Register new NRS fields in audit tracked lists at implementation time.
- Remove dead deprecated imports in useInvoiceColumns.tsx (lint-level cleanup).
