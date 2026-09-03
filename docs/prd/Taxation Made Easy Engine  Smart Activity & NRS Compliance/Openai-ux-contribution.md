BIGDROPS INVOICE COMPLIANCE ENGINE — PRODUCT REVIEW & REQUIRED REVISION

Claude,

The current PRD is significantly better than the previous drafts from an engineering and statutory-structure perspective.

However, it is still solving the problem primarily as:

«“How do we make BIGDROPS technically capable of NRS compliance?”»

That is only part of the problem.

The larger product objective is:

«How do we make taxation simpler for an ordinary Nigerian business while simultaneously getting that business to record enough real business activity that BIGDROPS can calculate, explain, document and eventually facilitate its tax obligations correctly?»

The distinction is critical.

If we build only an e-invoicing/compliance engine, we risk creating another impressive tax-tech product that assumes businesses already maintain clean records.

Many do not.

The opportunity is therefore not simply “tax compliance software.”

It is:

«Turn ordinary business activity into a clean, tax-ready record without requiring the business owner to understand taxation.»

The revised PRD should reflect that objective.

---

1. PRODUCT OBJECTIVE NEEDS TO BE REWRITTEN

The current objective focuses on:

- NRS-compliant invoices
- VAT/WHT calculation
- CIT/VAT warnings
- audit trails
- computation integrity

Those are valid technical objectives, but they are not the primary user objective.

The primary objective should be:

«BIGDROPS should make it extremely easy for a business to record what happened financially, then use those records to explain the business's tax position in plain language and identify legitimate opportunities to reduce tax legally.»

This produces a much more useful product loop:

BUSINESS ACTIVITY
      ↓
RECORD IT
      ↓
CLASSIFY IT
      ↓
STORE EVIDENCE
      ↓
UNDERSTAND TAX EFFECT
      ↓
IDENTIFY LEGITIMATE SAVINGS
      ↓
MEET DEADLINES
      ↓
BUILD BETTER RECORDS

The tax engine is therefore downstream of the transaction record.

---

2. THE MOST IMPORTANT FEATURE IS CURRENTLY MISSING

The PRD needs an explicit requirement for:

PAYMENT / MONEY-MOVEMENT CAPTURE

BIGDROPS already has a Payments module.

This should become one of the central pillars of the tax architecture.

The product should actively encourage users to record payments immediately.

Why?

Because an invoice tells us:

«“We billed someone.”»

A payment tells us:

«“Money actually moved.”»

Those are not interchangeable facts.

BIGDROPS should therefore not treat payment recording as merely an invoice convenience.

It should treat it as a first-class business record.

---

3. CHANGE THE USER'S MENTAL MODEL

Do not ask users:

«“Have you recorded your tax transaction?”»

Ask:

«“Did this customer pay you?”»

«“Did you pay anyone?”»

«“Did you buy something for the business?”»

«“Did someone deduct WHT from your payment?”»

«“Did you receive a WHT credit note?”»

«“Did you pay for something personally on behalf of the business?”»

These are natural business questions.

The user should not have to understand:

- VAT treatment
- deductible expenditure
- WHT categories
- tax bases
- CIT adjustments
- accounting classifications
- fiscalisation requirements

BIGDROPS should translate ordinary business events into the required tax information.

---

4. THE PRODUCT NEEDS A SIMPLE “RECORD MONEY” EXPERIENCE

Before expanding the NRS transmission experience, design the user experience around a simple action:

“Record Payment”

For example:

Record Payment

What happened?

○ Customer paid us
○ We paid a supplier
○ We paid for a business expense
○ We received money from another source
○ Something else

If the user selects:

Customer paid us

BIGDROPS should ask:

Who paid?
[ ABC Limited ]

Which invoice?
[ INV-000123 ]

How much?
[ ₦2,500,000 ]

When?
[ Today ]

How was it paid?
[ Bank Transfer ▼ ]

Save Payment

That should be enough for most users.

The tax engine can work in the background.

---

5. DO NOT MAKE TAX KNOWLEDGE A REQUIREMENT FOR DATA ENTRY

This is a fundamental UX principle.

Bad:

«Select the applicable WHT category.»

Better:

«What were you paid for?»

[ Goods ]

[ Construction ]

[ Professional / Technical Service ]

[ Rent / Lease ]

[ Other ]

Then BIGDROPS determines the applicable tax treatment and explains it.

Even better, where the invoice line already contains enough information, BIGDROPS should infer the likely classification and ask only for confirmation.

For example:

«BIGDROPS thinks this is a professional service.

WHT treatment may apply.

[ Confirm ] [ Change ]»

This is how we make tax easier.

---

6. TAX SHOULD APPEAR AS EXPLANATION, NOT AS THE MAIN INTERFACE

The current PRD has a strong emphasis on:

- WHT rates
- tax categories
- NRS metadata
- transmission status
- codes

These are necessary system concepts.

They should not dominate the ordinary user's experience.

The ordinary user should see:

«Invoice total: ₦5,000,000
VAT: ₦375,000
Expected WHT deduction: ₦250,000
Expected cash received: ₦5,125,000»

Then:

«Why?

This invoice contains professional services. If your customer deducts WHT, the expected deduction is ₦250,000.

Keep the WHT credit evidence because it may be relevant when reconciling your tax position.»

That is dramatically more understandable than exposing the tax engine directly.

---

7. CREATE A “WHY?” EXPERIENCE

Every tax-related calculation should have a simple explanation available.

For example:

VAT

«VAT is calculated at the applicable rate on the taxable amount.»

WHT

«BIGDROPS expects WHT because this payment is classified as a professional service.»

Expense

«This expense may be relevant when determining taxable profit, subject to the applicable rules and supporting evidence.»

Missing evidence

«You recorded the payment, but BIGDROPS cannot find supporting evidence.»

This is one of the product's biggest opportunities.

The application should teach the user without turning into a tax textbook.

---

8. LEGITIMATE TAX OPTIMISATION SHOULD BE A CORE PRODUCT CONCEPT

The original product vision says:

«“Expenses and other things to pay the lowest tax possible.”»

That should be preserved, but translated carefully.

The product should aim to help the business pay:

«the lowest tax legally payable, based on complete and accurate records.»

This means BIGDROPS should actively look for things that businesses commonly fail to record.

For example:

You recorded ₦12,000,000 in customer payments this year.

BIGDROPS also found:

₦1,800,000 supplier payments
₦450,000 transport expenses
₦320,000 equipment purchases
₦180,000 business subscriptions
₦95,000 bank charges

Then:

«Some of these expenses may be relevant to your tax position.

You have not yet attached supporting records for ₦650,000 of them.»

That is valuable.

It turns the application from:

«“Calculate my tax.”»

into:

«“Help me make sure I haven't forgotten anything important.”»

---

9. BUILD AN “UNRECORDED BUSINESS ACTIVITY” LOOP

This should become a major product feature.

BIGDROPS should continuously identify gaps such as:

Invoice with no payment recorded

«INV-000123 was issued 18 days ago.

Have you received payment?

[ Record Payment ]

[ Not Paid ]»

Payment with no invoice

«You recorded a ₦1,200,000 incoming payment but there is no linked invoice.

What is it for?»

Expense with no evidence

«You recorded ₦300,000 paid to a supplier.

Do you have the receipt/invoice?

[ Upload ]»

WHT expected but not evidenced

«BIGDROPS expects ₦150,000 WHT on this transaction.

Has the customer provided evidence of the deduction?»

This creates the behavioural loop we actually need:

«Something happened → BIGDROPS asks you to record it.»

---

10. PAYMENTS SHOULD NOT BE HIDDEN INSIDE INVOICES

The current architecture is heavily invoice-centric.

That is understandable, but tax readiness is broader than invoicing.

The system should ultimately recognise several business events:

SALE
PAYMENT_RECEIVED
SUPPLIER_PAYMENT
EXPENSE
ASSET_PURCHASE
REFUND
WHT_DEDUCTION
WHT_CREDIT_RECEIVED
VAT_PAYMENT
TAX_PAYMENT

Not every event needs to be implemented in version 1.

But the domain architecture should leave room for them.

The long-term model should therefore be:

Business Event
     ↓
Financial Record
     ↓
Tax Consequence

rather than:

Invoice
     ↓
Tax

---

11. THE USER SHOULD SEE A BUSINESS DASHBOARD, NOT A TAX DASHBOARD

The Compliance Hub should eventually answer questions such as:

“How is my business doing?”

rather than only:

“What tax forms are due?”

Example:

THIS MONTH

Money received       ₦18.4M
Money paid            ₦11.7M
Outstanding invoices   ₦6.2M

VAT position           ₦xxx
WHT expected           ₦xxx
WHT credits missing    ₦xxx

Records needing attention     7
Payments not recorded         4
Missing supplier evidence     3

Then:

«BIGDROPS has 7 things that may need your attention.»

That is much more approachable.

---

12. TAX DEADLINES SHOULD BE EXPLAINED AS ACTIONS

Don't merely display:

«WHT — Due 21st»

Instead:

«WHT records need attention

You have ₦XXX of expected WHT deductions for this period.

[ Review ]»

Likewise:

«VAT return approaching

BIGDROPS has prepared the transaction information currently available in your records.

[ Review VAT ]»

The user should always know:

1. What happened?
2. Why does it matter?
3. What does BIGDROPS need from me?
4. What should I do next?

---

13. IMPORTANT LEGAL / RULE ENGINE CORRECTIONS

The PRD should not hard-code broad assumptions where the legislation requires different circumstances to be distinguished.

13.1 VAT and WHT deadlines

Do not implement a universal rule:

VAT = 21st
WHT = 21st

The applicable obligation must determine the deadline.

The Nigeria Tax Administration Act provides a 21st-day deadline for VAT returns, while the Nigeria Tax Act contains specific provisions concerning VAT collected, withheld or self-accounted for and the applicable remittance timing.

Therefore use:

Tax Obligation
    ↓
Obligation Type
    ↓
Applicable statutory deadline

not:

Tax Type
    ↓
One universal deadline

13.2 Small business / small company logic

Do not create one universal "smallCompanyThreshold".

The legislation uses defined terms in different contexts.

The Nigeria Tax Administration Act defines a small business using gross turnover of not more than ₦100 million and fixed assets below ₦250 million, subject to the statutory conditions.

The tax engine must therefore identify:

Which Act?
Which provision?
Which taxpayer?
Which tax?
Which period?
Which definition?

before making a compliance conclusion.

The UI should still simplify this for the user.

For example:

«BIGDROPS estimate

Your recorded business activity is below the turnover level used in one of the statutory small-business tests.

This is only an estimate. Your accountant should confirm your financial-statement position and other statutory conditions.»

13.3 WHT

WHT must remain transaction-based rather than being a permanent property of a client.

Client information may influence the applicable model, but the transaction itself determines the nature of the supply/payment.

Therefore:

Client
    +
Transaction
    +
Supplier/entity characteristics
    ↓
Applicable WHT treatment

not:

Client
    ↓
Permanent WHT rate

---

14. THE NRS INTEGRATION SHOULD REMAIN SEPARATE

The current decision to isolate NRS transmission from the calculation engine is correct.

Keep:

computeDocument()

as the canonical monetary calculation layer.

Then:

invoiceToNRSPayload()

should transform already-calculated values into the applicable NRS/APP format.

Do not duplicate tax calculations inside the transmission adapter.

However, do not hard-code provider-specific API assumptions until BIGDROPS has selected the APP/System Integrator and obtained the applicable technical specification.

---

15. NRS COMPLIANCE SHOULD BE PROGRESSIVE

Do not make every user face the full NRS data model immediately.

Use progressive disclosure.

For example:

Step 1

User creates invoice normally.

Step 2

BIGDROPS quietly identifies missing compliance information.

«Your customer's TIN is missing.

Add it now or save the invoice as a draft.»

Step 3

User wants to send/clear the invoice.

BIGDROPS then performs the full compliance validation.

Step 4

Only when transmission is required should advanced NRS requirements become visible.

This prevents compliance from destroying the simplicity of the existing product.

---

16. THE “RECORD PAYMENT” FEATURE SHOULD HAVE A UX PRIORITY HIGHER THAN THE NRS QUEUE

The PRD currently gives substantial attention to:

«NRS Clearance Queue»

That is useful.

But from the business perspective, this may be less important than:

«Payments I have not recorded»

For example:

ATTENTION NEEDED

4 invoices may have been paid
but no payment has been recorded.

[ Review payments ]

This should be more prominent than a technical NRS transmission queue.

Why?

Because a business that fails to record its transactions cannot benefit from the tax intelligence layer.

---

17. USE SMART PROMPTS

BIGDROPS already knows things that can be used to prompt users.

Examples:

Invoice overdue

«Has this invoice been paid?»

Payment amount matches invoice

«We found a payment that appears to match INV-000123.

[ Record as payment ]»

Bank/payment import eventually available

«We found 12 business transactions that are not yet recorded in BIGDROPS.»

Supplier recurring payment

«You paid this supplier last month for the same service.

Is this another business expense?»

WHT

«The amount received is lower than the invoice amount.

Was WHT deducted?»

These are much more powerful than adding more tax fields.

---

18. THE PRODUCT SHOULD NEVER PUNISH THE USER FOR NOT KNOWING TAX

If a user doesn't know the tax treatment, the response should not simply be:

«Invalid tax category.»

Instead:

«Let's figure this out.

What did you buy?

[ Materials ]
[ Equipment ]
[ Professional service ]
[ Transport ]
[ Rent ]
[ Other ]»

The system can then ask a second question only if necessary.

This is how BIGDROPS becomes accessible to the “donkey.”

---

19. “TAX SAVINGS” MUST ALWAYS BE EVIDENCE-BASED

BIGDROPS should never tell users:

«“Do X and you will pay less tax.”»

It should say:

«“This expense may be relevant to your taxable profit. We need supporting evidence and the applicable tax treatment before including it.”»

Likewise:

«“You may have missed a deductible business expense.”»

not:

«“Claim this expense.”»

The system should distinguish:

Recorded fact
     ↓
Tax classification
     ↓
Potential tax treatment
     ↓
User confirmation / evidence
     ↓
Tax computation

This protects both the user and the product.

---

20. CHANGE THE PRODUCT'S CORE METRIC

The success metric should not only be:

«Number of NRS-compliant invoices transmitted.»

That measures the compliance mechanism.

The more important behavioural metrics should include:

Record completeness

Percentage of material business transactions captured.

Payment recording rate

Percentage of issued invoices with their eventual payment status recorded.

Evidence completeness

Percentage of recorded expenses with supporting evidence.

Reconciliation rate

Percentage of payments matched to invoices/transactions.

Tax readiness

Percentage of tax-relevant transactions with sufficient classification/evidence.

These measure whether BIGDROPS is actually solving the underlying problem.

---

21. RECOMMENDED PRODUCT PRINCIPLE

Add this near the beginning of the PRD:

«BIGDROPS TAX PRODUCT PRINCIPLE

The user records what happened. BIGDROPS explains what it means for tax.

BIGDROPS must not require users to understand Nigerian tax law in order to maintain useful business records.

The system should collect ordinary business facts first, infer or determine the relevant tax treatment second, and request additional information only when necessary.

The system should help users identify legitimate tax-saving opportunities by improving record completeness, classification and supporting evidence.

The goal is not to help users evade tax. The goal is to help them avoid paying more tax than legally required because of missing records, incorrect classification, missed deductions, missed credits, poor reconciliation or avoidable compliance errors.»

This should become the guiding product philosophy.

---

22. RECOMMENDED PRIORITY ORDER

The implementation priority should be changed.

Priority 1 — Record the transaction

Make it extremely easy to record:

- customer payment
- supplier payment
- business expense
- WHT deducted
- supporting evidence

Priority 2 — Reconcile

Connect:

Invoice ↔ Payment
Expense ↔ Payment
WHT ↔ Invoice/Payment
Evidence ↔ Transaction

Priority 3 — Explain

Tell the user:

«“Here's what BIGDROPS thinks this means.”»

Priority 4 — Optimise legally

Identify:

- missing business expenses
- missing WHT credits
- missing evidence
- incorrect classifications
- potential tax opportunities

Priority 5 — Compliance

Then produce:

- VAT schedules
- WHT schedules
- CIT estimates
- compliance alerts
- NRS-ready invoice data

Priority 6 — Transmission

Finally:

BIGDROPS
   ↓
APP
   ↓
NRS

---

23. FINAL PRODUCT ARCHITECTURE

The current PRD is effectively:

Invoice
   ↓
Tax Calculation
   ↓
NRS

The product should evolve toward:

                    BUSINESS ACTIVITY
                           ↓
                  ┌─────────────────┐
                  │ RECORD IT       │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ RECONCILE IT    │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ CLASSIFY IT     │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ TAX ENGINE      │
                  └────────┬────────┘
                           ↓
              ┌────────────┴────────────┐
              ↓                         ↓
       TAX EXPLANATION            TAX OPTIMISATION
              ↓                         ↓
              └────────────┬────────────┘
                           ↓
                    COMPLIANCE
                           ↓
                       NRS / APP

This is the product we should build.

---

24. CONCLUSION

The existing PRD is a strong engineering baseline.

It is not yet a complete product specification.

The missing layer is the human behaviour that makes the entire tax system work:

«Get the business to record what actually happened.»

If we solve that, everything downstream becomes more valuable:

- invoices become more meaningful
- payments become reconciled
- expenses become visible
- WHT becomes trackable
- VAT becomes more accurate
- CIT estimates become more useful
- evidence becomes available
- compliance becomes easier
- legitimate tax optimisation becomes possible

If we do not solve that, we may simply build a technically sophisticated compliance engine sitting on top of incomplete business records.

That is precisely the failure mode we should avoid.

Therefore, revise the PRD to include a dedicated User Experience & Transaction Recording layer before proceeding with implementation.

The next version should not just answer:

«“How does BIGDROPS become NRS compliant?”»

It should answer:

«“How does BIGDROPS make a Nigerian business naturally record enough of its real financial activity that becoming tax-compliant becomes a consequence of using the product?”»

That should be the core product question.