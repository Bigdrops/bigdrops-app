Company & Client Information Architecture Upgrade

Project: BIGDROPS Business Platform
Phase: Commercial PDF Foundation
Status: Proposed
Priority: High

---

Goal

Upgrade the Company and Client information architecture so every commercial document (Invoice, Quotation, Waybill, CSR, Project Documents, RFQ, BOQ and future commercial documents) shares one clean, extensible party model.

This is not an Invoice improvement.

It is a platform-wide Commercial Document improvement.

---

Objectives

1. Modernize Company Information

Replace the current editing experience with a proper settings page editor instead of a side drawer.

The Company Information editor should feel like editing a permanent profile rather than opening a temporary form.

Requirements

- Replace the side drawer with an embedded edit mode.
- Keep the current settings page layout.
- Editing should expand naturally inside the page.
- Preserve Save / Cancel workflow.
- No modal.
- No drawer.

---

2. Modernize Client Creation

The Client page should use the same editing experience introduced inside Invoice and Quotation.

Currently:

- Invoice → polished form
- Clients page → simplified legacy form

These should become one experience.

Requirements

Reuse the Invoice/Quotation client editor.

Support:

- Company Name
- Contact Person
- Category
- Phone
- Email
- Address Line 1
- Address Line 2
- City
- State

Maintain the existing save behaviour so Address Line 1 + Address Line 2 continue to serialize into the current database schema.

No database migration required.

---

3. Improve Commercial Party Formatting

Current rendering has several formatting issues.

Example:

Sun & Shield Power Solutions

43 Oshola Street

Lagos State, Phone: +234...

Email:
example@email.com

+234...
example@email.com

Problems

- duplicated phone/email
- inconsistent spacing
- labels mixed with values
- poor line wrapping
- address compression
- client addresses become one extremely long line

---

Target principles

Every commercial document should render parties consistently.

Recommended hierarchy:

Company Name

Tagline (optional)

Address Line 1
Address Line 2
City / State

Phone
Email
Website (optional)

Custom Fields

Client

Client Name

Attn: Contact Person

Address Line 1
Address Line 2
City / State

Phone
Email

Each logical piece occupies its own row.

No duplicated values.

No unnecessary labels unless required for clarity.

---

4. Preserve Custom Fields

Custom Fields remain fully dynamic.

The system must not introduce fixed fields like:

- TIN
- VAT
- CAC
- RC

Those are merely examples.

The renderer must display whatever exists inside "custom_info".

Examples

TIN
1063045858

CAC
RC-123456

Vendor ID
LAG-88921

ISO
9001:2015

Registration
ABC-445

The rendering engine must not assume any predefined labels.

---

5. Improve Rendering Engine

The Commercial rendering contract should become the source of truth for party rendering.

Responsibilities:

- normalize company data
- normalize client data
- split address safely
- preserve custom metadata
- prevent duplicated values
- provide predictable rendering order

This logic belongs in the shared Commercial rendering layer, not inside individual templates.

---

6. Keep Database Stable (Phase 1)

No database migration.

No Supabase schema changes.

Continue using:

Company

- company_address
- company_city

Client

- address
- city
- state

Address Line 2 continues to serialize into the existing address field exactly as today.

This phase focuses on architecture and rendering.

Schema evolution can happen later if required.

---

7. Platform Scope

This upgrade must be reusable by every commercial document.

Not limited to:

- Invoice
- Quotation

Also intended for:

- Waybill
- CSR
- RFQ
- BOQ
- Project Documents
- Purchase Orders
- Delivery Notes
- future commercial templates

No renderer should contain document-specific formatting logic for company/client blocks.

---

8. Implementation Order

Phase A

Audit and redesign shared Commercial party model.

---

Phase B

Refactor Company Settings editing experience.

---

Phase C

Replace Clients page editor with the Invoice/Quotation editor.

---

Phase D

Refactor Commercial rendering pipeline.

- normalize parties
- preserve custom fields
- remove duplication
- improve wrapping
- improve spacing

---

Phase E

Update Industry template.

Use the improved shared party renderer.

Do not introduce Industry-specific behaviour.

---

Phase F

Roll the new party renderer into all remaining commercial templates.

No duplicated implementations.

---

Out of Scope

- Database redesign
- Country/Postcode support
- Multiple addresses
- Multiple contacts
- Client custom fields
- Tax engine redesign
- Prefix engine changes

---

Success Criteria

- Company editor no longer uses a side drawer.
- Clients page uses the same editor as Invoice/Quotation.
- No database migration required.
- Company and Client formatting is consistent across commercial documents.
- No duplicated phone/email rendering.
- Addresses wrap naturally without overflowing their container.
- Custom fields remain completely dynamic.
- The rendering layer becomes reusable across all commercial document templates.
- Industry serves only as the first consumer of the shared Commercial party renderer, not as its owner.