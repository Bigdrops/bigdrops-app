# Record Capture — Minimum Viable Payment/Expense/Running-Cost Recording — PRD v1

## 1. Objective

Files.tax cannot produce trustworthy numbers without a record-capture surface.

The audit in this document (section 3) shows the current capture surface is thin. A user can record a VAT input only through a tax-literate form that asks for a net/VAT amount split, and there is no path to record money paid out at all. The two fields that Files-tax-monthly-v1.md marks blocked — "deducted by you" WHT and running-cost/expense data — have no data source because no expense or supplier-payment recording exists.

This PRD defines the minimum capture surface that unblocks those two fields. It is not the full vision from `bigdrops-tax-ux-vision-v1.md`. That document remains the long-term reference for tone and UX pattern. This PRD pulls in its plain-language patterns (section 3.2, 3.4, 3.5 of that document) but not its full event taxonomy or business-dashboard reframe.

The objective is one plain-language entry point: "record what happened." The user records an expense, a supplier payment, or a running cost in business terms. The system derives tax treatment behind the scenes.

## 2. What Exists Today (Verified)

This section states only what this task's own audit confirmed in code.

### 2.1 A VAT input form exists, but it requires tax literacy

`src/components/compliance/VatInputsPanel.tsx` provides an "Add Entry" button. It opens a sheet form with these fields:

- Date.
- Vendor / Supplier.
- Category (free text).
- Reference (free text).
- Net Amount.
- VAT Amount.
- Recoverable VAT switch.
- Notes.

The form requires the user to know the net/VAT split of every purchase. The user must enter Net Amount and VAT Amount separately. The form asks the user to decide "Recoverable VAT." These are tax-literate fields. An ordinary business owner who pays ₦118,000 for software would need training to know that ₦100,000 is net and ₦18,000 is VAT.

The panel also offers an "Import JSON" path (`ComplianceJsonImportSheet`). It requires the user to paste structured JSON produced by an AI extraction prompt. This is a power-user path, not an ordinary capture path.

Verdict: **EXISTS BUT REQUIRES TAX LITERACY TO USE CORRECTLY.**

### 2.2 No evidence trail on a VAT input

The `tax_input_entries` table (migration `20260520090009_tax.sql`) has these columns:

- id.
- settings_id.
- date.
- vendor_name.
- category.
- reference.
- net_amount.
- vat_amount.
- is_recoverable.
- notes.
- created_at.
- updated_at.

There is no payment link. There is no evidence column. There is no receipt upload in the form. The `reference` field is free text. A recorded VAT input is a freestanding number with no evidence trail.

### 2.3 No money-out capture anywhere

The `payments` table (migration `20260520090003_invoices.sql`) has an `invoice_id` foreign key to `invoices`. Every insert in `src/modules/invoices/services/paymentService.ts` passes `invoice_id`. The only "Record Payment" flow (`InvoiceRecordPaymentSheet`) records money received against an invoice. There is no flow to record money paid out to a supplier.

Verdict: **DOES NOT EXIST.**

### 2.4 No other expense-adjacent capture surface

The audit searched the codebase for expense, supplier-payment, and running-cost surfaces.

- `src/domain/projectDocumentPrompts.ts` and `src/domain/projectDocuments.ts` mention "supplier" only as a parsed field in AI document-extraction prompts. They are not capture surfaces.
- `src/pages/LifetimeDataHub.tsx` is an export hub. It has a "Procurement tracking and supplier responses" export domain. It exports data; it does not capture it.

No running-costs page exists. No supplier-payment form exists. No expense-upload flow exists.

Verdict: **DOES NOT EXIST.**

### 2.5 An uploader pattern exists and is reusable

`src/components/ui/PaymentAttachmentUploader.tsx` provides file selection, drag-and-drop, validation, and size limits. The invoice payment flow uses it. Payments store attachments in a JSONB `attachments` column (migration `20260705100000_payment_attachments.sql`). This PRD reuses that pattern. It does not invent a new upload mechanism.

## 3. Minimum Viable Capture Flow

### 3.1 The entry point

One entry point: "Record a payment or expense." It follows the plain-language question pattern from `bigdrops-tax-ux-vision-v1.md` section 3.2: ask what happened in business terms, not tax categories.

The flow asks:

- Who did you pay? (payee)
- How much? (total amount)
- When? (date)
- What was it for? (plain-language category, e.g. "Software", "Office rent", "Transport", "Electricity")
- Did you get a receipt or proof? (evidence upload, optional at record time, required before the record can count as supported)

The flow must not ask the user to split net and VAT. It must not ask the user to choose a tax category. It must not ask the user to decide recoverability.

### 3.2 What the flow must produce

Each record must carry, at minimum:

| Field | Source | Notes |
|-------|--------|-------|
| Expense amount | User total amount | Plain-language entry. |
| Payee | User input | Free text or a pick list built from prior payees. |
| Date | User input | |
| Plain-language category | User input | Mapped to tax treatment behind the scenes. Not a tax category. |
| Evidence | Reuse `PaymentAttachmentUploader` | Optional at record time. |
| Tenant | `settings_id` | Same scoping as `tax_input_entries` today. |

### 3.3 Tax treatment behind the scenes

The system maps the plain-language record to tax treatment. This mapping is a later implementation concern, but the PRD fixes the boundary now:

- The mapping must derive the net/VAT split from the total amount. The authoritative calculation layer (`src/lib/Calculations.ts`) currently provides the forward calculation path only (net line price to VAT). It does not expose a gross-to-net/VAT reverse function. A reverse derivation would require new calculation-engine work, not reuse. The presentation layer must not recompute tax values.
- The mapping must decide input-VAT recoverability using an explicit business rule, never silently. The default for an unknown case is "needs review," not "recoverable."
- WHT treatment (whether WHT applies, at what rate) depends on the payee type, the category, and the WHT rate table. The WHT rate table is not yet sourced (Files-tax open decision 1). Until it is, the mapping must render WHT as "pending," never zero and never a guessed rate.
- "Why" explanations (vision section 3.4) attach to each derived value. The user sees "Why is this recoverable?" and gets a plain-language answer.

### 3.4 The two unblocked outputs

1. **"Deducted by you" WHT (payable).** A supplier-payment record with a payee and amount is the data source for WHT the company deducted when paying that supplier. The field stops being "not tracked yet" the day a supplier payment can be recorded.
2. **Running-cost/expense data.** Recorded expenses are the running-cost basis that the CIT estimate and the monthly compliance document consume.

The WHT remittance deadline field is not unblocked by this PRD. It is blocked on the missing subsidiary regulation (Files-tax open decision 1). A capture surface cannot unblock a missing regulation. This PRD does not claim otherwise.

## 4. Data Model

The audit evidence says `tax_input_entries` is a reasonable foundation. It exists, it is tenant-scoped, it already stores the input-VAT record, and the Compliance Hub already renders it. The gap is not the table; the gap is the entry experience and the missing evidence and payment linkage.

The PRD therefore extends `tax_input_entries` rather than creating a new table. This choice is justified by the audit:

- The table already exists with the right tenant scoping (`settings_id`).
- The Compliance Hub already renders it through `VatInputsPanel`.
- A second expense table would duplicate the input-VAT record and split the evidence trail across two places.

The extension, defined only as requirements (no migration is written by this PRD):

| Requirement | Rationale |
|-------------|-----------|
| An evidence column following the payments `attachments` JSONB pattern. | Gives the record an evidence trail. Reuses the proven pattern. |
| An optional payment link (a `payment_id`-style column). | Ties the record to an actual money-out event where one exists. |
| A plain-language category column distinct from the tax mapping. | The user records "Software"; the system maps it. Do not overload the existing free-text `category` with tax meaning. |
| A derived tax-treatment view over the raw record. | Keeps the raw facts user-entered and the tax values computed. The presentation layer reads the derived view; it does not compute. |

The existing `net_amount` / `vat_amount` columns stay. The plain-language flow writes the total amount and the derived view fills `net_amount` and `vat_amount` through the authoritative calculation. This keeps `tax_input_entries` and its existing consumers (`VatInputsPanel`, the monthly rollup) working unchanged.

If a later implementation finds that the extension fights the existing shape, the fallback is a minimal `expenses` table that mirrors the invoice-payment attachment pattern. That fallback is not the default. The default is the extension, because the audit shows the foundation fits.

## 5. Non-Goals

This PRD is deliberately narrow. Record Capture is the user-facing recording surface. It is not a general-ledger interface. It does not implement accounting infrastructure.

Correction note (2026-09-05): the approved BIGDROPS scope now includes profit-based CIT capability. That capability requires a real accounting foundation. `Accounting-foundation-blueprint-v1.md` establishes that foundation as approved downstream architecture. The accounting items formerly excluded here as project-wide non-goals are now downstream Accounting Foundation capabilities. Record Capture itself remains out of scope for them. This PRD points to the blueprint; it does not duplicate its architecture.

### 5.1 Superseded project exclusions (now Accounting Foundation capabilities)

These items were formerly broader project exclusions. `Accounting-foundation-blueprint-v1.md` now establishes them as approved downstream architecture. Record Capture does not implement them:

- A general ledger — now defined by the Accounting Foundation Blueprint section 8 (Journal / Posting Kernel).
- A chart of accounts — now defined by the Accounting Foundation Blueprint section 7 (Chart of Accounts).
- A depreciation or asset register — now defined by the Accounting Foundation Blueprint section 15 (Fixed Assets and Depreciation).
- A full bookkeeping system — now defined by the Accounting Foundation Blueprint sections 8, 10 (Accounting Periods), 11 (Accounting Reporting), and 16 (Corrections / Reversals / Idempotency).

The accounting foundation turns confirmed recorded activity into accounting facts and journal postings. Record Capture records the activity. The two layers stay separate.

### 5.2 Record Capture-specific non-goals (unchanged)

These exclusions remain valid for Record Capture itself:

- The full event taxonomy from `bigdrops-tax-ux-vision-v1.md` (SALE, PAYMENT_RECEIVED, SUPPLIER_PAYMENT, EXPENSE, and the rest). That document itself defers this to a schema redesign (its section 4.1).
- The business-dashboard reframe of the Compliance Hub. The vision document defers this too (its section 4.2).
- A new VAT calculation engine. `src/lib/Calculations.ts` stays the financial source of truth. The Accounting Foundation Blueprint section 9 (Money Precision and Rounding) applies the same rule to the ledger.
- A new notification or scheduling system. Files.tax propagation decisions stay in `Files-tax-monthly-v1.md`.
- An automatic bank feed or receipt OCR. The Accounting Foundation Blueprint section 24 (Non-Goals (v1)) defers bank feeds for the foundation as well.

These exclusions are a hard boundary for Record Capture, not a wish list.

## 6. Open Decisions

These decisions need a call from the project lead. They are consolidated here.

| # | Decision | Context | Blocks |
|---|----------|---------|--------|
| 1 | Evidence policy | Evidence upload is optional at record time. When does a record count as "supported"? Options: always on upload; or upload required before the record feeds the VAT input figure. The VAT Filing Support section of Files-tax (4.5) requires evidence status per transaction, so this decision shapes that status. | The SUPPORTED state per record. |
| 2 | Payee identity | Free-text payee or a pick list built from prior payees. A pick list enables payee-type mapping for WHT. | WHT mapping quality. |
| 3 | Plain-language category set | A fixed starter list, free text, or a fixed list plus free text. The category drives tax mapping. | Tax mapping quality. |
| 4 | Money-out payment linkage | When a recorded expense matches a real bank outflow, does the system create a `payments`-table row, or keep expenses separate from invoice payments? The `payments` table is invoice-keyed today; a money-out payment does not fit that shape. | Reconciliation of expenses to bank outflows. |
| 5 | Where the entry point lives | Compliance Hub tab, dashboard action, or both. Files-tax propagation (section 5) decides how the monthly document surfaces attention items; the capture entry point should sit beside that. | User discoverability. |
| 6 | Small-business exemption | Unresolved statutory question pending the NTAA 2025 primary source. The NTAA text is absent from NRS-docs/, so section 22(4) cannot be quoted or treated as verified. Do not introduce a separate small business classification; the verified NTA 2025 classification is small company (section 202). The expense record feeds the running-cost basis, which is relevant to the CIT estimate. Confirm the tenant classification before the CIT-side consumption is specified. | CIT-side consumption. |

## 7. Dependencies

- `Files-tax-monthly-v1.md` — the consumer. This PRD unblocks its "deducted by you" WHT field and provides running-cost/expense data.
- `bigdrops-tax-ux-vision-v1.md` — the tone and UX pattern reference (sections 3.2, 3.4, 3.5). Not a spec source.
- `src/lib/Calculations.ts` — the authoritative tax calculation layer. The derived tax-treatment view reads it; it never recomputes.
- `src/components/ui/PaymentAttachmentUploader.tsx` and the payments `attachments` JSONB pattern — the evidence mechanism to reuse.
- `NRS-docs/` — the statutory authority for any deadline or rate that the mapping touches. WHT rates remain unresolved until the subsidiary regulation is sourced (Files-tax open decision 1).