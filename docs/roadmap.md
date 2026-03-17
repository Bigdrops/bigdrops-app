BIGDROPS MVP ROADMAP

Goal

Ship a usable product where a user can:

- create quotation
- convert/use it to invoice
- track payments
- see everything inside a project

---

CURRENT STATE

Working:

- Invoices (core logic mostly stable)
- CSR (usable)
- Projects (basic linking works)

Broken / Missing:

- Quotations (not built)
- Payments not reflected in projects
- UI inconsistency (Invoice vs CSR vs Project)
- PDF inconsistencies

---

MVP DEFINITION

MVP is complete when this flow works:

Client → Quotation → Invoice → Payment → Project summary updates

---

PHASE 1 — CLEAN CURRENT SYSTEM

- Remove useless actions (copy CSR number, etc.)
- Align ViewInvoice and ViewCSR layout
- Make template picker consistent everywhere
- Stop redesigning PDF, only fix layout issues

DONE WHEN:

- UI feels consistent
- No confusing actions

---

PHASE 2 — BUILD QUOTATIONS (CRITICAL)

Build:

- NewQuotation.jsx
- EditQuotation.jsx
- ViewQuotation.jsx

Rules:

- reuse invoice logic (DO NOT duplicate)
- same items, totals, structure
- no payment logic

DONE WHEN:

- user can create and view quotation

---

PHASE 3 — PROJECT REALITY

Fix ProjectDetail:

- total invoiced = sum of invoices
- total received = sum of payments
- outstanding = difference

Add:

- "Linked Documents" button on all pages

DONE WHEN:

- project shows real financial state

---

PHASE 4 — PAYMENTS

- ensure payments are saved in DB
- link payments to invoice
- update invoice balance after payment

DONE WHEN:

- invoice reflects paid + remaining
- project reflects received money

---

PHASE 5 — POLISH

- unify UI across:
  - Invoice
  - CSR
  - Quotation
- fix mobile spacing issues
- stabilize PDF output

DONE WHEN:

- app feels like one system

---

RULES (DO NOT BREAK)

- do not duplicate invoice logic
- project is the center, not invoice
- no advanced invoice features yet
- no new features until MVP flow works

---