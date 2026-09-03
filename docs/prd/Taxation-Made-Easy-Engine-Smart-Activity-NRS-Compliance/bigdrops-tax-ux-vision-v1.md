# BIGDROPS — Business Record & Tax Explanation Layer
## Companion vision document to: Invoice Compliance Engine PRD v1.1

Status: **Discovery stage. Not yet buildable.**
This document does not add tickets to the engineering PRD. It exists so
the idea is not lost. Section 6 lists what must be audited before any
part of this becomes a spec.

---

## 1. Why this file is separate

The Invoice Compliance Engine PRD (v1.1) answers one question:
"How does BIGDROPS produce a valid NRS invoice?"

This file asks a different question:
"How does BIGDROPS get a Nigerian business to record enough real
activity that NRS compliance becomes a side effect, not a chore?"

These are different problems. The first is scoped to one document
type and is buildable now. The second touches payments, expenses,
evidence storage, and a new dashboard — none of which have been
audited yet. Keeping them in one document made the first one
unbuildable. Splitting them keeps both honest.

---

## 2. The product principle (kept from the review, as stated)

> The user records what happened. BIGDROPS explains what it means
> for tax.
>
> BIGDROPS must not require users to understand Nigerian tax law to
> maintain useful business records. The system collects ordinary
> business facts first, infers or determines the tax treatment
> second, and asks for more information only when needed.
>
> The goal is not to help users evade tax. The goal is to help them
> avoid paying more tax than legally required, because of missing
> records, wrong classification, missed deductions, missed credits,
> poor reconciliation, or avoidable compliance errors.

This principle is sound and worth keeping as a north star. It does
not, by itself, tell us what to build first.

---

## 3. What is accepted as a good idea (needs audit, not yet a spec)

3.1 **Payment recording as a first-class record, not an invoice
    afterthought.** An invoice is a claim. A payment is a fact. The
    two should not be conflated. This is worth building, once the
    current payment-tracking code is understood.

3.2 **"Record Payment" as a plain-language flow**, asking "who
    paid," "which invoice," "how much," "when," "how" — instead of
    asking the user to pick a tax category. Good direction for any
    new payment UI, invoice-linked or not.

3.3 **The "Unrecorded Business Activity" loop** — invoices with no
    payment recorded, payments with no linked invoice, expenses with
    no evidence, WHT expected but not evidenced. This is a strong,
    concrete feature idea. It depends entirely on data BIGDROPS may
    or may not already store in a queryable way (see section 6).

3.4 **"Why?" explanations attached to calculated values** — showing
    the VAT and WHT figures next to a one-line plain-language reason,
    instead of only showing raw rates and codes. Low-risk, high-value,
    and can likely attach to the existing Totals section (T-01 to
    T-04 in the form audit) without a data model change.

3.5 **Progressive disclosure of NRS fields** — full compliance data
    only required at transmission time, not at draft time. This is
    already how the Invoice Compliance Engine PRD v1.1 is written
    (see its section 15 origin note). No new work needed here beyond
    what v1.1 already specifies.

3.6 **Better success metrics than "invoices transmitted."** Record
    completeness, payment-recording rate, evidence completeness,
    reconciliation rate. These are good metrics to track once the
    underlying events exist to measure. They are not buildable until
    section 6 is answered.

---

## 4. What is held, and why

4.1 **A full new event taxonomy** (SALE, PAYMENT_RECEIVED,
    SUPPLIER_PAYMENT, EXPENSE, ASSET_PURCHASE, REFUND, WHT_DEDUCTION,
    WHT_CREDIT_RECEIVED, VAT_PAYMENT, TAX_PAYMENT) is a reasonable
    long-term shape, but it is a schema redesign, not a feature. It
    should follow from an audit of the current Payments module, not
    precede it.

4.2 **The "Business Dashboard, not a tax dashboard" reframe of
    ComplianceHub** is attractive but assumes reconciled payment and
    expense data that does not yet visibly exist in the audited
    codebase. Sequencing matters: build the record-capture layer
    first, or the dashboard has nothing real to summarise.

4.3 **Tax-savings / expense-gap suggestions** ("you have not yet
    attached supporting records for ₦650,000 of them") are a real
    opportunity, but they carry real risk if the underlying
    classification is wrong. This needs its own accuracy and liability
    review before it ships, separate from a UX pass.

---

## 5. Suggested build order, if this direction is approved

1. Audit the current Payments module (see section 6).
2. Ship the "Why?" explanation layer on the existing Totals section
   — smallest change, no schema risk, immediate user value.
3. Design and scope "Record Payment" as its own small PRD, once the
   audit in section 6 is answered.
4. Build the Unrecorded Activity loop on top of the payment/invoice
   link once it exists.
5. Only then revisit the ComplianceHub as a business dashboard.

This order front-loads the lowest-risk, highest-value item (3) and
defers the dashboard reframe (4.2) to last, since it depends on
everything above it.

---

## 6. Audit questions — answer these before writing any ticket from
   this document

6.1 Does a Payments table or module already exist? What fields does
    it store today?
6.2 Is there already a link between an Invoice and a Payment record,
    or is payment status only a flag on the Invoice (`unpaid`/`paid`)?
6.3 What do `InvoiceAdvanceSheet` and `RevertInvoiceDialog` (both
    noted as view-page-only, not part of the form, in the original
    forensic audit) actually do? Do they already touch payment data?
6.4 Is there an Expense or Supplier Payment module at all, or would
    this be new from zero?
6.5 Is there an existing file/evidence upload mechanism outside the
    item-photo Cloudinary pipeline that could be reused for receipt
    evidence?
6.6 Does the audit trail system (`audit_logs` / `activity_events`)
    already cover payments, or only the four document modules
    (Invoice, Quotation, CSR, Waybill)?

Until these are answered, nothing in sections 3 or 4 should be
turned into a ticket.
