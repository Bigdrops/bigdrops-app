# BIGDROPS Invoice Compliance Engine — Read-Only Codebase Audit

**Identity:** Replit Agent | 2026-09-03 | Africa/Lagos | Replit workspace harness

## Objective

Audit the Invoice Compliance Engine PRD set against the current repository. Confirm
what already exists, identify exact gaps and naming collisions, answer all open
questions, and define the smallest payment and expense-side additions needed for
the stated compliance outcomes.

## Scope

This audit covers:

- `Technical-plan.md` as historical context.
- `Technical-plan-v1.1.md` as the current engineering baseline.
- `Openai-ux-contribution.md` as product context only.
- `bigdrops-tax-ux-vision-v1.md`, especially section 6.
- Current React/TypeScript code and Supabase migration definitions.
- Supplier profile, client, invoice header, line-item, NRS metadata, WHT
  receipt, payment, evidence, calculation, and audit-trail requirements.

The audit is limited to the existing Invoice and Compliance modules. It does not
design a general accounting system.

## Files changed

**None — read-only audit.** The report is the only requested output. No application
code, migration, database data, workflow, or configuration was changed.

## Skills used

Repository instructions and the supplied PRD documents were followed. No
implementation skill, integration, database write, or external service was used.

## Documentation standard (ASD-STE100)

This report uses short sentences, direct wording, active voice, explicit
file-and-line evidence, and separate findings. It avoids unexplained
abbreviations where a plain term is available. “Does not exist” means that the
named field, module, or behavior was not found in the inspected source and
schema. It does not claim that an unseen production database is empty.

## Executive result

| Area | Result |
|---|---|
| Payments | Exists as a first-class `payments` table, repository, service, UI, and invoice link. |
| WHT receipt evidence | Exists as a first-class `wht_receipts` ledger with file upload and status workflow. |
| Expenses / supplier payments | No dedicated module exists. `tax_input_entries` is a VAT-input record, not a payment ledger. |
| Supplier profile | Partial data exists in `settings` and `tax_settings`; the proposed structured NRS profile does not exist. |
| Client tax profile | Basic contact/address data exists; proposed TIN, coded geography, WHT preference, and client type do not. |
| Invoice NRS fields | The proposed header fields, line fields, and separate NRS metadata object do not exist. |
| Calculation engine | The canonical `src/lib/Calculations.ts` path uses `decimal.js`, but the repository also has a separate `calcTotals()` path using JavaScript numbers. The PRD and `AGENTS.md` references are not fully consistent with the implementation. |
| Audit | Generic JSONB diffing exists, but the client-side audit helper manually whitelists fields. Payment activity exists separately. |
| NRS transmission | No NRS/APP/System Integrator adapter or transmission path was found. |

## 1. Open questions in `Technical-plan-v1.1.md` §11

### 1.1 APP or System Integrator

**Current answer: still unresolved in code.**

The historical PRD says that Module 4 needs a confirmed APP or System Integrator
and assumes a JSON REST API (`docs/prd/Taxation Made Easy Engine  Smart Activity & NRS Compliance/Technical-plan.md:135-141`).
The v1.1 document keeps this question open
(`docs/prd/Taxation Made Easy Engine  Smart Activity & NRS Compliance/Technical-plan-v1.1.md:77-88`).

No NRS, FIRS, e-invoice, clearance, IRN, or transmission adapter was found in
the inspected `src`, `backend`, `server`, and Supabase migration paths. The
repository has generic names such as `importAdapter` and `industryAdapter`, but
they are not NRS adapters. No provider can be selected from the codebase.

### 1.3 Manual audit-field registration

**Answer: yes for field-level `audit_logs`; domain events use a separate path.**

`src/lib/audit.ts:4-21` defines a manual `INVOICE_TRACKED_FIELDS` list.
`recordAuditLog()` receives an explicit `trackedFields` argument and calls
`pick()` to retain only those fields (`src/lib/audit.ts:102-108`,
`src/lib/audit.ts:136-184`). The database diff function compares the keys that it
receives (`supabase/migrations/20260520090008_audit_activity.sql:161-189`).
Therefore, adding a human-editable invoice, client, or profile field requires
explicit registration and a caller that passes the field.

There is also manual event registration. The activity RPC accepts only the
listed entity and event values (`supabase/migrations/20260520090008_audit_activity.sql:79-102`).
The later payment attachment migration adds `PAYMENT_VOIDED` and
`ATTACHMENT_UPLOADED` (`supabase/migrations/20260705100000_payment_attachments.sql:68-79`).
The PRD event names `nrs_invoice_submitted`, `nrs_invoice_cleared`, and
`nrs_invoice_rejected` are not in that current whitelist.

### 1.4 IH-5 (`reference`) and the PO Number field

**Answer: IH-5 is not a separate field today. It collides with an existing
business concept.**

The invoice table has `po_number text` and an index for it
(`supabase/migrations/20260520090003_invoices.sql:10-46`,
`supabase/migrations/20260520090003_invoices.sql:127-137`). The application
invoice type also exposes `po_number` but no invoice `reference`
(`src/domain/invoice/types.ts:133-164`). `po_number` is already part of the
invoice audit whitelist (`src/lib/audit.ts:4-21`).

The smallest implementation is to map IH-5 to `po_number` only if NRS accepts a
purchase-order value as its reference. The code must not silently treat an NRS
reference and a purchase order as identical. If they have different business
meaning, add a separate `reference` field. The payment table already has a
different `reference` field (`supabase/migrations/20260520090003_invoices.sql:75-95`);
that field belongs to the payment transaction and must not be reused for IH-5.

### 1.5 Calculation math

**Answer: the canonical path uses decimal arithmetic; a second legacy/domain
path uses JavaScript numbers.**

`src/lib/Calculations.ts` imports `decimal.js`, sets precision to 20, and uses
half-up rounding (`src/lib/Calculations.ts:34-38`). Its main calculation path
constructs `Decimal` values and uses operations such as `times`, `plus`, and
`greaterThan` (`src/lib/Calculations.ts:153-154`, `src/lib/Calculations.ts:197-217`).
The wrapper `computeDocument()` normalizes input and calls
`calculateDocument()` (`src/lib/Calculations.ts:745-750`).

However, `src/domain/invoice/calculations.ts:195-198` exports
`resolveRowVat()`, and `:200-324` exports `calcTotals()` with arithmetic based
on `Number`, `+`, `*`, `/`, and `Math.max`. `AGENTS.md:73-80` calls
`src/lib/Calculations.ts` the source of truth and names `calcTotals()` and
`resolveRowVat()` as required entry points, but those two functions currently
live in `src/domain/invoice/calculations.ts`. The historical PRD also names
`computeDocument()` (`Technical-plan.md:275-297`), while the actual canonical
wrapper is present under that name and the canonical inner function is
`calculateDocument()`.

The PRD should resolve this split before implementation. It should designate one
path as the only financial source of truth, then ensure all callers use it. A
second decimal library is not needed. A number-based duplicate should not be
extended for NRS calculations.

### 1.6 Tenant legal form

**Answer: no dedicated tenant legal-form field was found.**

The settings table has company identity, contact, banking, branding, and custom
information fields, but no `legal_form`
(`supabase/migrations/20260520090000_core_tables.sql:101-122`). The company
settings form exposes name, tagline, address, city, phone, email, website, and
custom fields (`src/pages/settings/CompanySettingsSection.tsx:17-25`,
`:141-228`). `tax_settings` has TIN and tax configuration, but no legal form
(`supabase/migrations/20260520090009_tax.sql:10-23`).

The v1.1 correction is therefore valid: add SP-12 at tenant level, with
`corporate` and `individual` values. Do not add this value to the client only.
The database currently uses `text` for coded values such as status and tax type.
A `text` field with a database check or controlled lookup is more consistent
than introducing an unverified PostgreSQL enum.

## 2. Companion vision audit questions

### 2.1 Does a Payments table or module exist?

**Yes.**

The schema defines `payments` with invoice link, total amount, date, method,
reference, notes, cash amount, WHT amount, currency, WHT rate/type, certificate
reference, recorder, void fields, source, and bank account
(`supabase/migrations/20260520090003_invoices.sql:75-95`).

The repository inserts payment rows and stores the payment split
(`src/modules/invoices/repositories/paymentRepository.ts:15-42`). The service
records cash and WHT values and supports an atomic transaction path
(`src/modules/invoices/services/paymentService.ts:58-105`). The invoice view
passes payment rows to the operational payment section
(`src/components/document-view/invoice/InvoiceOperationalSections.tsx:42-49`).

### 2.2 Is payment status only an invoice flag?

**No.**

`payments.invoice_id` has a foreign key to `invoices.id`
(`supabase/migrations/20260520090003_invoices.sql:147-154`) and an invoice
index (`:139-145`). The repository fetches non-voided payment amounts by invoice
(`src/modules/invoices/repositories/paymentRepository.ts:44-56`).

The invoice financial state is derived from non-voided payment rows. It sums
`cash_amount` and `wht_amount`, then derives settled amount, balance, and
paid/partially-paid/unpaid state (`src/domain/invoice/financialState.ts:26-78`).
The persisted `invoices.status` is synchronized from financials
(`src/modules/invoices/repositories/paymentRepository.ts:135-162`). The status
flag is therefore a projection or persisted summary, not the only payment
record.

### 2.3 What do `InvoiceAdvanceSheet` and `RevertInvoiceDialog` do?

**Advance sheet: no payment mutation.**

`InvoiceAdvanceSheet` manages advance mode, amount or percentage, suffix, labels,
view/edit/delete actions, and PDF download
(`src/components/invoice/view/InvoiceAdvanceSheet.tsx:26-52`,
`:129-213`, `:248-316`). The screen description states that the values are
stored on the parent invoice (`:129-135`). The action layer writes advance
metadata into the parent invoice's `custom_fields` and records an invoice audit
event (`src/pages/viewInvoiceActions.ts:162-180`, `:273-339`).

**Revert dialog: displays payment facts but does not edit them directly.**

The dialog receives payment count and payment total, warns that recorded payments
will also be removed, and collects a reason
(`src/components/invoice/RevertInvoiceDialog.tsx:19-27`,
`:61-70`, `:75-126`). The workflow guard blocks revert when settled payments
exist and instructs the user to void them first
(`src/modules/invoices/domain/invoiceWorkflowGuards.ts:17-22`).
Payment voiding is a separate update to `payments.voided_at` and
`payments.void_reason` (`src/modules/invoices/repositories/paymentRepository.ts:96-113`).

### 2.4 Does an Expense or Supplier Payment module exist?

**No dedicated module exists.**

The only matching current record is `tax_input_entries`. It stores date, vendor
name, category, reference, net amount, VAT amount, recoverability, and notes
(`supabase/migrations/20260520090009_tax.sql:25-38`). The Compliance Hub loads
tax inputs and WHT records, but this table has no payment link, payment date
settlement, cash amount, supplier-payment status, or evidence linkage. No
expense or supplier-payment source file or table was found in the inspected
application and migration paths.

### 2.5 Is there reusable evidence upload outside item photos?

**Yes. Two usable mechanisms exist.**

Payment attachments are selected by `PaymentAttachmentUploader`, which accepts
multiple files and validates size and type (`src/components/ui/PaymentAttachmentUploader.tsx:6-20`,
`:25-43`, `:71-90`). The payment service posts them to
`/api/upload-payment-attachment` and records returned attachment metadata
(`src/modules/invoices/services/paymentService.ts:214-257`).

WHT receipt files use the Supabase `compliance` storage bucket. The compliance
service uploads the file and stores the resulting public URL
(`src/modules/compliance/services/complianceService.ts:71-83`). The WHT row
stores that URL as `receipt_file_url`
(`supabase/migrations/20260520090003_invoices.sql:97-111`).

The item-photo pipeline is not required for either receipt path.

### 2.6 Does the audit trail cover payments?

**Yes for payment domain events; no for generic payment field diffs.**

`activity_events` and `audit_logs` are separate tables
(`supabase/migrations/20260520090008_audit_activity.sql:10-38`). Payment
recording and voiding call dedicated activity RPCs. The recording RPC includes
amount, payment mode, account, running balance, and WHT amount
(`supabase/migrations/20260705000000_enrich_payment_metadata.sql:34-53`).
The void RPC records payment ID, amount, invoice status, total, and reason
(`supabase/migrations/20260703000000_record_payment_voided.sql:30-46`).
Payment attachments also create an invoice activity event
(`supabase/migrations/20260705100000_payment_attachments.sql:118-160`).

The field-diff helper's tracked lists cover invoice, quotation, project, CSR,
waybill, receipt, and letter fields, not payment fields
(`src/lib/audit.ts:4-100`). Therefore, payment domain events are covered, but
arbitrary edits to payment fields are not automatically captured by
`audit_logs`.

## 3. Data-model validation

### 3.1 Supplier Profile: SP-1 to SP-12

The historical field definitions are `Technical-plan.md:150-170`. The v1.1
document adds SP-12 at `Technical-plan-v1.1.md:36-51`.

| ID | Current result | Type and collision assessment |
|---|---|---|
| SP-1 `legal_name` | Partial equivalent: `settings.company_name`. | `text` matches. Name differs. Use a clear canonical mapping. |
| SP-2 `tin` | Partial equivalent: `tax_settings.tin`. | `text` matches, but tenant TIN must not be duplicated between profile and tax settings without one source of truth. |
| SP-3 `email` | Equivalent: `settings.company_email`. | `text` matches; different name only. |
| SP-4 `telephone` | Equivalent: `settings.company_phone`. | `text` matches; different name only. |
| SP-5 `business_description` | Does not exist. `company_tagline` is not the same field. | `text` is consistent. Do not overload tagline. |
| SP-6 `street_name` | Partial equivalent: `settings.company_address`. | `text` matches, but existing address is not structured as a street name. |
| SP-7 `city_name` | Equivalent-like: `settings.company_city`. | `text` matches; current UI combines city/state in one free-text control. |
| SP-8 `state_code` | Does not exist as a separate coded field. | `text` is consistent, but a fixed NRS lookup is required. Do not reuse free-text state content as a code without validation. |
| SP-9 `lga_code` | Does not exist. | `text` is consistent with existing coded fields; enforce the fixed list. |
| SP-10 `postal_zone` | Does not exist. | `text` is consistent. |
| SP-11 `country_code` | Does not exist. | `text` with default `NG` matches the PRD and existing text conventions. |
| SP-12 `legal_form` | Does not exist. | Use controlled `text` values `corporate` and `individual`, with a check or lookup. No client collision was found. |

### 3.2 Client model: CL-1 to CL-11

The proposed fields and rules are in `Technical-plan.md:172-193`. The current
client table has only name, address, phone, email, category, notes, city, state,
contact person, and archive state (`supabase/migrations/20260520090000_core_tables.sql:87-99`).

| ID | Current result | Type and collision assessment |
|---|---|---|
| CL-1 `tin` | Does not exist on `clients`; `tax_settings.tin` is tenant-level. | `text` matches. Do not use the tenant TIN as client TIN. |
| CL-2 `email` | Exists as `clients.email`. | Exact field and type match. |
| CL-3 `telephone` | Equivalent: `clients.phone`. | `text` matches; name differs. |
| CL-4 `business_description` | Does not exist. | `text` matches. |
| CL-5 `street_name` | Partial equivalent: `clients.address`. | `text` matches, but the existing address is not a structured street field. |
| CL-6 `city_name` | Equivalent: `clients.city`. | `text` matches; name differs. |
| CL-7 `state_code` | Partial equivalent: `clients.state`. | Existing value is free text. New coded value must not silently reuse invalid free text. |
| CL-8 `lga_code` | Does not exist. | `text` matches the coded-field convention with lookup validation. |
| CL-9 `postal_zone` | Does not exist. | `text` matches. |
| CL-10 `deducts_wht` | Does not exist. | `boolean` matches existing boolean conventions. |
| CL-11 `client_type` | Does not exist. `clients.category` is not the same controlled value. | Prefer controlled `text` values `B2B`, `B2C`, `B2G` with a database check or lookup. |

The v1.1 correction also says CL-11 does not determine WHT rate
(`Technical-plan-v1.1.md:36-51`). WHT rate selection must use tenant SP-12 and
line-item LI-1.

### 3.3 Invoice headers: IH-1 to IH-5

The proposal is in `Technical-plan.md:195-214`.

| ID | Current result | Type and collision assessment |
|---|---|---|
| IH-1 `document_currency_code` | Does not exist on `invoices`. `payments.currency_code` exists. | `text` matches. Payment currency must not substitute for invoice currency. |
| IH-2 `tax_currency_code` | Does not exist on `invoices`. | `text` matches. Keep distinct from IH-1 even if both default to NGN. |
| IH-3 `issue_time` | Does not exist. `invoices.issue_date` stores only a date. | `time` matches the stated need. Do not change `issue_date` type. |
| IH-4 `invoice_type_code` | Does not exist. `document_type` is not the proposed NRS code. | `text` matches. Default `380` should be controlled, not confused with document type. |
| IH-5 `reference` | Does not exist. `po_number` is the existing candidate. | `text` matches, but semantic collision requires the decision in section 1.4. |

### 3.4 Line items: LI-1 to LI-4

The proposal is in `Technical-plan.md:216-241`. Current invoice items have
`vat_rate`, `discount_rate`, `custom_data`, and other commercial fields, but no
NRS line fields (`supabase/migrations/20260520090003_invoices.sql:48-73`;
`src/domain/invoice/types.ts:166-218`).

| ID | Current result | Type and collision assessment |
|---|---|---|
| LI-1 `transaction_nature` | Does not exist on `invoice_items`. | Controlled `text` values are consistent with existing schema. Do not derive it from `vat_rate`. |
| LI-2 `hsn_or_service_code` | Does not exist. | `text` is correct, with a fixed NRS code-list lookup. |
| LI-3 `product_category` | Does not exist on invoice rows. | `text` is correct. It is derived from LI-2 and should not be an unrelated free-text category. |
| LI-4 `tax_category_code` | Does not exist. `vat_rate` is numeric and is not equivalent. | `text` is correct and must remain separate from `vat_rate`. |

`custom_data` is a JSONB escape hatch, but using it as the canonical home would
conflict with the PRD's explicit field requirements, auditability, and required
line validation.

### 3.5 NRS metadata sub-object

The proposal requires a separate object next to `custom_fields`
(`Technical-plan.md:243-260`).

None of the six fields was found as a separate invoice field or object:

- `transmission_status`
- `irn`
- `csid`
- `qr_code_payload`
- `rejection_reason`
- `cleared_at`

`invoices.status` is already used for invoice payment/workflow status and must
not be overloaded. `custom_fields` exists as a text column
(`supabase/migrations/20260520090003_invoices.sql:25-31`), but the PRD expressly
requires NRS metadata to remain separate. The proposed enum values are not
current invoice status values. Use a controlled status representation and make
the six fields adapter-owned and read-only as required by
`Technical-plan.md:258-260`.

### 3.6 WHT receipt ledger

The PRD proposal is `Technical-plan.md:262-272`. A ledger already exists:
`wht_receipts` (`supabase/migrations/20260520090003_invoices.sql:97-111`).

| Proposed field | Current field | Result |
|---|---|---|
| `id` | `id` | Exact match. |
| `invoice_id` | `invoice_id` | Exact match. |
| `client_id` | None; current row has `client_name`. | Missing. The invoice already links to a client, but the PRD asks for a direct client ID. |
| `wht_amount` | `wht_amount` | Exact match, `numeric`. |
| `status` | `receipt_status` | Equivalent under a different name. Current UI supports `untracked`, `requested`, `pending`, `received`, and `verified` (`src/components/compliance/WhtReceiptsPanel.tsx:42-48`). |
| `evidence_url` | `receipt_file_url` | Equivalent under a different name. |
| `verified_at` | None | Missing. Current verification updates status only (`src/modules/compliance/services/complianceService.ts:71-73`). |

The existing unique index allows one WHT receipt row per payment
(`supabase/migrations/20260520090003_invoices.sql:139-145`). That is useful for
the current payment-linked workflow. Do not add duplicate `status` or
`evidence_url` columns without a migration decision. Prefer a stable mapping or
an additive compatibility layer.

## 4. Calculation and compliance implications

The calculation requirements in the historical PRD describe seven steps and
itemized WHT (`Technical-plan.md:275-322`). The current decimal engine does
perform row calculations, discount handling, VAT-base work, WHT-base work, and
returns a prepared result. The separate `calcTotals()` implementation also
performs similar calculations with JavaScript numbers
(`src/domain/invoice/calculations.ts:225-324`).

The PRD cannot be considered implementation-ready until this source-of-truth
split is closed. In particular:

1. LI-1 transaction nature and SP-12 tenant legal form are not current inputs.
2. Existing document-level WHT inputs cannot by themselves implement the new
   itemized rate table.
3. The decimal path and number path can produce different totals.
4. A transmission adapter must reshape already-computed values. It must not
   calculate money, as required by `Technical-plan.md:391-417`.

## 5. Smallest payment and evidence additions

### 5.1 Net cash actually received

**No schema addition is required.**

Each payment already stores `cash_amount`; the payment service writes it from the
settlement input (`src/modules/invoices/services/paymentService.ts:58-71`).
Financial-state calculation sums non-voided cash and WHT separately
(`src/domain/invoice/financialState.ts:34-52`). The minimum query rule is to
sum `payments.cash_amount` for the invoice where `voided_at IS NULL`.

### 5.2 Expected versus recorded WHT

The current `payments.wht_amount` stores the recorded deduction
(`supabase/migrations/20260520090003_invoices.sql:75-95`). The expected amount
can be calculated only after the new source inputs exist: LI-1, SP-12, the
before-tax WHT base, and the single canonical calculation engine.

For a reliable historical reconciliation after invoice edits, the smallest
additive payment change is:

- `payments.expected_wht_amount numeric`, captured at payment recording time.

Then compare `expected_wht_amount` with the recorded `wht_amount`, excluding
voided payments. If the product accepts recalculation from immutable invoice
snapshots instead, this column is optional, but the current code does not show
an immutable calculation snapshot for payments. Adding a second WHT rate field
without storing the expected amount would not provide a complete reconciliation.

### 5.3 WHT credit-note evidence

The current `wht_receipts` row already links a receipt to a payment and invoice,
stores the WHT amount, tracks status, and stores an uploaded file URL
(`supabase/migrations/20260520090003_invoices.sql:97-111`;
`src/modules/compliance/services/complianceService.ts:38-83`).

The smallest functional addition is `verified_at timestamp`, set when the
receipt enters the verified state. Add `client_id uuid` only if direct client
joins are required by the report and the invoice link is not sufficient.
Treat `receipt_status` as the existing implementation name for PRD `status`, and
`receipt_file_url` as the existing implementation name for `evidence_url`.
Do not create duplicate columns with the same meaning.

## 6. Smallest expense-side addition for the CIT/turnover estimate

**No expense-side addition is required for the stated v1.1 turnover estimate.**

The proposed indicator is based on paid invoices over the trailing 12 months
(`Technical-plan.md:420-438`). Existing payment rows and invoice links provide
that data. `tax_input_entries` is not needed to calculate paid-invoice turnover.

If the product later claims a profit-based CIT estimate, it would need a separate
periodized, reviewable deductible-expense total. That is not required by the
current turnover indicator and must not be inferred from VAT-input rows.

The three conditions in the current PRD also include fixed assets and
professional-service status (`Technical-plan.md:433-438`). The current schema
does not provide a reliable fixed-asset total or a controlled professional
service classification. Those are limitations for displaying the conditions,
not a reason to create a general expense module in this scope.

## 7. Explicit exclusions

The following are outside this Invoice Compliance Engine audit and should not be
added as hidden prerequisites:

- General expense categorization.
- Receipt OCR.
- Bank-feed imports.
- A supplier-payment ledger.
- Unlinked supplier payments.
- Asset registers or depreciation.
- General accounting, profit-and-loss, or bookkeeping functionality.
- A full event-taxonomy redesign from the companion vision document.
- Quotation, Waybill, and CSR compliance expansion.
- NRS provider selection or transmission implementation before the provider is
  confirmed.

## Verification result

Before the report was written, `git status --short` and
`git status --branch --short` showed a clean branch:

```text
## main...origin/main
```

The audit made no source or database changes. After writing this report, the
working tree must be checked again. The expected result is one new report file
under `docs/reports/invoice-quote/` and no modified, staged, or deleted
application files. No pre-existing changes were available to overwrite.

## Risks or limitations

1. This is a repository and migration-source audit. It does not query or mutate
   a hosted production database.
2. The migration history contains legacy and later replacement definitions.
   Runtime schema should be confirmed before applying a future migration.
3. The calculation source-of-truth split is a material compliance risk.
4. The current WHT receipt status names are broader than the PRD's three-state
   proposal. A mapping decision is required.
5. No APP or System Integrator can be identified from the codebase.
6. The current turnover data can support an internal paid-invoice indicator, not
   an official CIT qualification decision.

## Deferred work

- Confirm the NRS APP or System Integrator and its request, response, identity,
  retry, and retention rules.
- Choose and enforce one financial calculation entry point.
- Add and validate the supplier, client, invoice, and line-item fields only
  after the source-of-truth and provider decisions are closed.
- Decide whether IH-5 maps to `po_number`.
- Decide whether a payment-time `expected_wht_amount` snapshot is required.
- Add only the minimum WHT receipt compatibility fields needed by the final
  report and verification workflow.
- Define how the fixed-asset and professional-service conditions are shown as
  limitations rather than unsupported tax conclusions.