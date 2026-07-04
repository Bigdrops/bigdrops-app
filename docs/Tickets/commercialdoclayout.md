Ticket: Separate Company Tagline from Commercial Party Renderer

Status: Backlog

Priority: Medium

Category: Commercial PDF / Branding

---

Summary

The company tagline is currently rendered alongside the company address and contact information in commercial documents (Invoice and Quotation).

While functional, this does not reflect a proper separation of concerns between brand identity and commercial party information.

The tagline should eventually become part of the shared Commercial Header/Branding layer rather than the Commercial Party renderer.

---

Background

The ongoing Company & Client Information Architecture Upgrade standardizes how Company and Client information is normalized and rendered across all commercial documents.

During implementation, it was observed that the company tagline is being treated as part of the company's contact information, resulting in layouts such as:

- Company Name
- Tagline
- Address
- Phone
- Email

Architecturally, the tagline is a branding element rather than contact information.

---

Proposed Direction

As part of a future Commercial PDF/Header initiative:

- Introduce a shared Commercial Header (Brand Header).
- Move the company tagline into the branding layer.
- Keep the Commercial Party renderer focused on:
  - Company Name
  - Address
  - Phone
  - Email
  - Website
  - Custom Fields
- Ensure all commercial document templates consume the shared header consistently.

---

Scope

This ticket is limited to presentation architecture.

It does not include:

- Company information model changes.
- Database changes.
- Party normalization changes.
- Commercial Party rendering logic.
- Branding redesign beyond header organization.

---

Acceptance Criteria

- The company tagline is no longer rendered as part of the Commercial Party information block.
- A shared Commercial Header is responsible for displaying branding elements.
- Invoice, Quotation, Waybill, and future commercial documents share the same branding/header implementation.
- The Commercial Party renderer contains only contact-related information.

---

Notes

This ticket is intentionally deferred to avoid expanding the scope of the current Company & Client Information Architecture Upgrade. It should be addressed as part of a future Commercial Document Header & Branding Standard initiative.