================================================================
BIGDROPS INVOICE COMPLIANCE ENGINE — PRODUCT REQUIREMENTS DOCUMENT
Version: 1.0 (Claude baseline)
Target legislation: Nigeria Tax Act 2025, Nigeria Tax Administration Act 2025
Administering body: Nigeria Revenue Service (NRS)
Target files: SharedDocumentForm.tsx, FormHeader.tsx, FormCommercialTerms.tsx,
FormLineItems.tsx, MobileItemCard.tsx, Calculations.ts, ComplianceHub.tsx,
reports.tsx, types.ts
================================================================

0. DOCUMENT CONTROL

0.1 This document replaces the two prior drafts. Read this document
    only. Do not merge it with the prior drafts.
0.2 This document uses defined terms. A defined term keeps the same
    meaning everywhere in this document.
0.3 "Must" means the requirement is mandatory. "Can" means the
    requirement is optional. "Do not" means the action is forbidden.

----------------------------------------------------------------
1. CURRENT SYSTEM BASELINE (AUDIT SUMMARY)

This section states facts about the current codebase. Each fact
came from direct source inspection or from the user. This section
adds no new requirement.

1.1 Stack
    - The app uses React 19, Vite, TypeScript, Tailwind CSS 3.4,
      Supabase, Vercel, Bun, and Capacitor.
    - The database is Supabase Postgres.

1.2 Document modules
    - The app has four document modules: Invoice, Quotation, CSR,
      and Waybill.
    - Invoice and Quotation share one form component:
      SharedDocumentForm.tsx.
    - The form detects the document type from the `document_type`
      field.

1.3 Calculation engine
    - Calculations.ts holds one function, computeDocument().
    - computeDocument() is the single source of truth for all
      financial math.
    - PDF renderers do not calculate values. PDF renderers only
      display values that computeDocument() already calculated.
    - The engine treats `null` and `0` as different values. `null`
      means "use the global rate." `0` means "use a zero rate on
      purpose."

1.4 Form structure
    - The form has seven sections: Header, Line Items, Commercial
      Terms, Totals, Notes & Terms, PDF Output Settings, Footer.
    - The Client Selector (field ID D-01) sets two fields only:
      `client_id` and `client_name`.
    - The Commercial Terms section holds Discount, VAT, WHT,
      Additional Charges, and Additional Fields as separate
      collapsible cards.
    - Each line item can override the document VAT rate
      (`vat_rate`) and the document discount rate
      (`discount_rate`) at the row level.
    - Groups are data rows. A group is not a visual wrapper. A
      group row has `row_type === 'group_header'`.

1.5 Multi-tenancy
    - The app stores each tenant in a separate database schema.
    - The schema name follows the pattern
      `entity_{workspace_slug}_{entity_slug}`.
    - Supplier identity (company name, address, TIN) is a
      tenant-level fact. Supplier identity does not belong on a
      single invoice record.

1.6 Audit trail
    - The app has an audit trail system for Invoice, Quotation,
      CSR, and Waybill.
    - The system uses two mechanisms: `audit_logs` for field-level
      changes, and `activity_events` for domain-level events (for
      example, "invoice paid").
    - A past bug produced false audit entries when the form
      diffed VAT and WHT rates against stale form state. This bug
      is fixed. Any new rate-like field must avoid the same
      mistake.

1.7 Known no-touch zones
    - Do not change `prefixConstants.ts`.
    - Do not change `resolvePrefix()`.
    - These control invoice number generation. IRN generation
      (see section 7) is a separate, additional value. IRN
      generation does not replace or change the invoice number.

1.8 Known gaps against NRS requirements
    - The Invoice model has no currency field.
    - The Invoice model has no invoice type code field.
    - The Client model has no TIN field.
    - The Client model has no coded state or LGA field. NRS
      requires coded values, not free text.
    - The line item model has no product or service code field.
    - The line item model has no tax category code field. The
      line item model has a tax rate field only.
    - The Invoice model has no field to store the IRN, the CSID,
      or the QR code payload after NRS clears the invoice.
    - The Commercial Terms section has no structured payment
      means data. Bank details exist only inside PDF Output
      Settings, for display only.

----------------------------------------------------------------
2. OBJECTIVE

2.1 The app must let a user create an Invoice that meets NRS
    e-invoicing rules.
2.2 The app must calculate VAT and WHT correctly under Nigerian
    tax rules.
2.3 The app must warn the user about CIT and VAT status. The app
    must not state CIT or VAT status as fact.
2.4 The app must keep computeDocument() as the only place that
    calculates money values.
2.5 The app must record every change to compliance-relevant
    fields in the existing audit trail system.

----------------------------------------------------------------
3. SCOPE AND NON-GOALS

3.1 In scope: the Invoice module only.
3.2 Out of scope: the Quotation module. A quotation is not a tax
    document. Do not add NRS fields to the Quotation form.
3.3 Out of scope: the Waybill module. A waybill is a delivery
    record, not a tax invoice.
3.4 Out of scope: the CSR module, for this version. The CSR
    module bypasses the normal service layer today. Fix that
    first, in a separate ticket, before adding NRS logic to CSR.
3.5 Out of scope: credit notes and debit notes. Add these in a
    later version. This version issues standard invoices only
    (NRS invoice type code 380).
3.6 Out of scope: building a direct connection to the NRS
    platform. This version prepares data for an Access Point
    Provider (APP). An APP is a company that NRS approves to
    transmit invoices. The app does not talk to NRS directly.
3.7 A decision is needed before Module 4 in section 7: which APP
    or System Integrator will BIGDROPS use. This document assumes
    a REST API that accepts JSON, matching the general pattern
    used by NRS-accredited providers. Confirm the exact provider
    before writing code for Module 4.

----------------------------------------------------------------
4. DATA MODEL CHANGES

Each change states: the table or type, the new field, the field
type, and the reason. All new fields are additive. No existing
field changes name or type.

4.1 Tenant-level Supplier Profile (new table or new columns on
    the existing tenant/entity table)

    ID    Field                  Type      Reason
    SP-1  legal_name             text      NRS party_name
    SP-2  tin                    text      NRS supplier TIN
    SP-3  email                  text      NRS supplier contact
    SP-4  telephone              text      NRS supplier contact
    SP-5  business_description   text      NRS business_description
    SP-6  street_name            text      NRS postal_address
    SP-7  city_name              text      NRS postal_address
    SP-8  state_code             text      NRS coded state (for
                                            example "NG-FC")
    SP-9  lga_code               text      NRS coded LGA (for
                                            example "NG-FC-AMA")
    SP-10 postal_zone            text      NRS postal_address
    SP-11 country_code           text      default "NG"

    Rule: fields SP-8 and SP-9 must come from a fixed list. The
    fixed list comes from the NRS state code list and the NRS LGA
    code list. Do not let the user type a free-text state or LGA.

4.2 Client model additions (the record behind the Client
    Selector, D-01)

    ID    Field                  Type      Reason
    CL-1  tin                    text      NRS customer TIN
    CL-2  email                  text      NRS customer contact
    CL-3  telephone              text      NRS customer contact
    CL-4  business_description   text      NRS business_description
    CL-5  street_name            text      NRS postal_address
    CL-6  city_name              text      NRS postal_address
    CL-7  state_code             text      coded, see rule in 4.1
    CL-8  lga_code               text      coded, see rule in 4.1
    CL-9  postal_zone            text      NRS postal_address
    CL-10 deducts_wht            boolean   drives WHT card default
                                            state, see section 6.3
    CL-11 client_type            enum      "B2B" or "B2C" or "B2G".
                                            Drives the clearance
                                            model. See section 7.2.

    Rule: field CL-1 is required before the user can save an
    Invoice where CL-11 is "B2B" or "B2G". Field CL-1 is not
    required when CL-11 is "B2C".

4.3 Invoice header additions

    ID    Field                  Type      Reason
    IH-1  document_currency_code text     NRS document_currency_code.
                                            Default "NGN".
    IH-2  tax_currency_code      text      NRS tax_currency_code.
                                            Default "NGN".
    IH-3  issue_time             time      NRS issue_time. The
                                            existing Issue Date
                                            field (I-06) stores the
                                            date part only today.
    IH-4  invoice_type_code      text      NRS code. Default "380"
                                            (commercial invoice).
                                            Fixed value in this
                                            version. See section 3.5.
    IH-5  reference              text      Optional. Maps loosely
                                            to the existing PO
                                            Number field (I-05).
                                            Confirm the mapping is
                                            correct before use.

4.4 Line item additions (on the row model behind MobileItemCard)

    ID    Field                  Type      Reason
    LI-1  transaction_nature     enum      Drives WHT rate. See the
                                            table in section 5.7.
                                            Values: "goods",
                                            "construction_main",
                                            "construction_other",
                                            "services",
                                            "rent", "exempt".
    LI-2  hsn_or_service_code    text      NRS hsn_code or
                                            service_code, from the
                                            NRS code list.
    LI-3  product_category       text      NRS product_category.
                                            Set automatically when
                                            the user picks LI-2.
    LI-4  tax_category_code      text      NRS tax_category.id (for
                                            example "STANDARD_VAT",
                                            "ZERO_RATED", "EXEMPT").
                                            Separate from the
                                            existing `vat_rate`
                                            number field.

    Rule: LI-1 is required on every line item before the user can
    save the invoice. LI-2 is required when the invoice will be
    transmitted to NRS. LI-2 is not required for a draft.

4.5 New Invoice sub-object: NRS metadata

    This is a new JSON object stored on the Invoice record, next
    to the existing `custom_fields` object. Keep it separate from
    `custom_fields` so it is easy to find and easy to audit.

    Field                  Type      Reason
    transmission_status    enum      "not_sent", "pending",
                                      "cleared", "rejected"
    irn                    text      Set by NRS after clearance.
    csid                   text      Set by NRS after clearance.
    qr_code_payload        text      Set by NRS after clearance.
    rejection_reason       text      Set by NRS on rejection.
    cleared_at             timestamp Set by NRS after clearance.

    Rule: the app must not let a user edit these six fields by
    hand. These fields are read-only in the UI. Only the adapter
    in section 7 can write these fields.

4.6 New table: WHT receipt ledger

    Field           Type       Reason
    id              uuid       primary key
    invoice_id      uuid       links to the Invoice
    client_id       uuid       links to the Client
    wht_amount      numeric    the withheld amount
    status          enum       "untracked", "requested",
                                "verified"
    evidence_url    text       uploaded NRS WHT credit note file
    verified_at     timestamp  set when status becomes "verified"

----------------------------------------------------------------
5. CALCULATION ENGINE CHANGES (Calculations.ts)

5.1 computeDocument() stays the single source of truth. Do not
    duplicate math in any other file.
5.2 The engine follows seven steps, in this order:
    1. Row subtotal.
    2. Before-tax discount.
    3. Row VAT base.
    4. Row VAT amount.
    5. Extra charges.
    6. WHT base.
    7. Itemized WHT.
5.3 Step 2 applies only when `discountTiming` is "before_tax."
    When `discountTiming` is "after_tax," step 2 does nothing and
    the discount applies after step 4 instead.
5.4 Row subtotal formula:
    row_subtotal = quantity * unit_price
5.5 Row VAT base formula:
    row_vat_base = row_subtotal - before_tax_discount (if any)
5.6 Row VAT amount formula:
    row_vat_amount = row_vat_base * effective_vat_rate
    effective_vat_rate = row-level vat_rate if set, otherwise the
    document-level globalVatPercent.
5.7 WHT rate table. The engine must read the rate from this
    table, using field LI-1 (transaction_nature). The engine must
    not read the rate from any client-level field.

    transaction_nature       Corporate WHT   Individual WHT
    goods                    2%              2%
    construction_main        2%              2%
    construction_other       5%              5%
    services                 5%              10%
    rent                     10%             10%
    exempt                   0%              0%

    Note: "Corporate" and "Individual" refer to the client's
    entity type, not the supplier's. Store this on the Client
    model as a new field if it does not exist. Confirm with the
    codebase before adding it; it may already exist.

5.8 WHT base formula:
    wht_base = row_subtotal - before_tax_discount
    wht_base must not include row_vat_amount.
5.9 Itemized WHT formula:
    row_wht = wht_base * wht_rate_from_table
5.10 Field CL-10 (deducts_wht) controls only whether the WHT card
     opens by default. Field CL-10 does not set the WHT rate. The
     rate always comes from LI-1, per row.

----------------------------------------------------------------
6. FORM UI CHANGES (SharedDocumentForm.tsx and children)

Each change references the existing field ID from the current
form audit, where one exists.

6.1 Header section (FormHeader.tsx)
    - Add a Currency selector. Maps to IH-1 and IH-2. Default
      "NGN". Hide this control when the tenant only uses NGN, to
      avoid clutter. Show it only when the tenant enables
      multi-currency in settings.
    - Add an Issue Time control, next to the existing Issue Date
      field (I-06). Maps to IH-3. Default to the current time
      when the user opens the form.

6.2 Client Selector (D-01)
    - The overlay (O-01) must show whether the selected client
      has a TIN on file. If the client has no TIN and field CL-11
      is "B2B" or "B2G", show a warning badge on the client row.
    - Add an "Edit client tax details" link inside the overlay.
      This link opens the client's TIN and address fields (CL-1
      to CL-9) for editing, without leaving the invoice form.

6.3 Commercial Terms — WHT card (CT-07, CT-08)
    - Remove the free-typed WHT Rate number as the primary
      control. Replace it with a read-only computed value.
    - The computed value comes from summing row_wht across all
      line items (see 5.9). The user cannot type a document-level
      WHT rate.
    - When client field CL-10 is true, auto-expand this card on
      client selection. This behavior does not change.

6.4 Line item row (MobileItemCard.tsx)
    - Add a Transaction Nature selector. Maps to LI-1. Options:
      Goods, Construction (Main), Construction (Other), Services,
      Rent, Exempt. Required field. Show the WHT rate percentage
      next to each option (for example, "Services (5%)").
    - Add a Product/Service Code field. Maps to LI-2 and LI-3.
      This field opens a search list fetched from the NRS code
      list. The user types a description; the list filters by
      match. Selecting an entry sets LI-2 and LI-3 together.
    - Add a Tax Category selector next to the existing VAT Rate
      override field. Maps to LI-4. Options: Standard, Zero-Rated,
      Exempt. Default "Standard".

6.5 Additional Charges (CT-09)
    - No structural change. The existing `exemptionReason`
      dropdown, proposed in the prior draft, is approved as
      written: "Reimbursable Freight," "Statutory Service
      Exemption," "Pass-Through Expense." Store it on
      `custom_fields.extraCharges[i].exemptionReason`, as
      proposed.

6.6 New card: NRS Transmission Status
    - Add this as a new collapsible card, placed after Totals and
      before Notes & Terms.
    - Show transmission_status, irn, and a QR code image built
      from qr_code_payload.
    - Show a "Send to NRS" button. This button is disabled until
      every required field in section 4 is filled. List the
      missing fields when the button is disabled.
    - This card is read-only after a successful clearance. The
      Identity Lock pattern (already used for client and invoice
      number, see O-05) applies here too: once cleared, these
      fields lock, and further changes require the Duplicate flow.

----------------------------------------------------------------
7. NRS TRANSMISSION ADAPTER (new file, for example nrsAdapter.ts)

7.1 This adapter is a separate, one-way function. Name it
    invoiceToNRSPayload(invoice). It reads the invoice, the
    client, and the tenant supplier profile. It returns one JSON
    object shaped for NRS.
7.2 The adapter reads field CL-11 (client_type) to choose the
    model:
    - "B2B" or "B2G": use the Clearance Model. Submit before
      sending the invoice to the client.
    - "B2C": use the Reporting Model. Submit within 24 hours
      after the invoice is issued.
7.3 The adapter does not calculate any money value. All money
    values must already exist on the invoice, from
    computeDocument(). The adapter only reshapes existing values
    into the NRS field names.
7.4 On a successful response, the adapter writes irn, csid,
    qr_code_payload, transmission_status, and cleared_at back to
    the NRS metadata sub-object (section 4.5). No other code path
    may write these fields.
7.5 On a failed response, the adapter writes transmission_status
    as "rejected" and stores the reason in rejection_reason. The
    UI in section 6.6 must show this reason to the user.
7.6 Every write from this adapter must create an activity_event
    in the existing audit trail system (section 1.6). Use the
    event names: "nrs_invoice_submitted", "nrs_invoice_cleared",
    "nrs_invoice_rejected".

----------------------------------------------------------------
8. COMPLIANCE HUB DASHBOARD (ComplianceHub.tsx)

8.1 Filing deadlines. Both VAT and WHT are due on the 21st day of
    the month after the transaction month. Show one countdown for
    both, not two different dates.
8.2 Turnover indicator. Label it "Internal Estimate," in a
    visibly different style from the rest of the dashboard (for
    example, a dashed border). Do not label it "Small Company
    Status" or "CIT Qualified." State it as a question, not an
    answer. Example wording: "Paid invoices, trailing 12 months:
    ₦42,500,000. This is not your official turnover figure. Check
    your financial statements before you claim small company
    status."
8.3 Show the three legal conditions for small company status as
    plain text, every time the indicator shows:
    1. Financial statement turnover is ₦100,000,000 or below.
    2. Total fixed assets are ₦250,000,000 or below.
    3. The business is not a professional service firm (legal,
       accounting, consulting, or medical).
8.4 VAT registration indicator. Show this as a separate item from
    8.2 and 8.3. The VAT threshold is ₦25,000,000, not
    ₦100,000,000. Do not combine the two thresholds into one
    check.
8.5 NRS Clearance Queue. Add a new panel that lists invoices by
    transmission_status. Group by "not_sent," "pending," and
    "rejected." A user can open an invoice from this list and
    fix it.

----------------------------------------------------------------
9. STATUTORY REPORTS (reports.tsx)

9.1 VAT Remittance Schedule. Unchanged from the prior draft.
    Excludes zero-rated and exempt lines, using field LI-4.
9.2 WHT Deductions Ledger. Group rows by transaction_nature
    (field LI-1), not by client. Columns: Payment Date, Client
    Name, Client TIN, Invoice Reference, Transaction Nature, WHT
    Rate, WHT Deducted, Net Cash Received.
9.3 NRS Clearance Log. New report. Columns: Invoice Number, IRN,
    Transmission Status, Cleared At, Rejection Reason.
9.4 CIT and Development Levy Estimator. Keep the same formula as
    the prior draft. Add the same "Internal Estimate" label rule
    from section 8.2 to this report's output.

----------------------------------------------------------------
10. AUDIT TRAIL INTEGRATION

10.1 Every new field in section 4 that a human can edit must flow
     through the existing audit_logs diffing system.
10.2 Before writing code, check whether the diffing system reads
     field lists automatically or needs manual registration per
     field. Section 1.6 notes a past bug from stale-state
     diffing on rate fields. Confirm the fix pattern used there,
     and reuse it for LI-1 and LI-4.
10.3 The three write events named in section 7.6 use
     activity_events, not audit_logs, because they are domain
     events, not field edits.

----------------------------------------------------------------
11. OPEN QUESTIONS (must be answered before section 7 starts)

11.1 Which APP or System Integrator will BIGDROPS use? This
     changes the exact request and response shape in section 7.
11.2 Does the Client model already store an entity type (company
     vs individual)? Section 5.7 needs this field. Confirm before
     adding a duplicate field.
11.3 Does the existing audit diffing system need manual field
     registration? Section 10.2 depends on the answer.
11.4 Confirm the mapping in field IH-5 (Reference) against the
     existing PO Number field before implementation.

----------------------------------------------------------------
12. SUMMARY OF CHANGES FROM THE PRIOR DRAFT

    Area                    Prior draft            This version
    WHT deadline            14th (wrong)           21st (correct)
    WHT rate source         client type            line item nature,
                                                     six categories
    Turnover claim          stated as fact          labeled estimate,
                                                     three conditions
                                                     shown
    VAT threshold           tied to CIT gate        independent,
                                                     ₦25M
    E-invoicing scope       missing                 full data model,
                                                     adapter, and UI
                                                     card added
    Scope boundary          not stated              Invoice only;
                                                     Quotation, Waybill,
                                                     CSR excluded, with
                                                     reasons
    No-touch zones          not mentioned           named and
                                                     respected
    Audit trail             not mentioned           explicit
                                                     integration
                                                     requirement
================================================================