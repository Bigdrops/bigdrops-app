BIGDROPS PRODUCT SPECIFICATION (MVP)

1. Overview

BigDrops is a project-centered business system for service-based companies.

The system organizes all business activity around a single core entity:

Project (Job)

Every document, financial record, and operational activity is linked to a project.

---

2. Core Model

2.1 Project as the Root

A Project represents a job or engagement with a client.

All related records are grouped under it:

Project
├── Quotation
├── Invoice(s)
├── CSR(s)
├── Payments

---

2.2 Key Rule

Documents do not exist in isolation.

Each document:

- may have a project_id
- can be linked to a project at any time

project_id is nullable.

---

3. Entities

3.1 Project

Fields:

- id
- name
- client_id
- status (active, completed, on_hold, cancelled)
- po_number (optional)
- created_at

---

3.2 Client

Fields:

- id
- name
- contact details

---

3.3 Invoice

Fields:

- id
- number
- client_id
- project_id (nullable)
- status
- issue_date
- due_date
- items
- totals

Responsibilities:

- define billable value
- receive payments
- show outstanding balance

---

3.4 Quotation

Fields:

- id
- number
- client_id
- project_id (nullable)
- status
- items
- totals

Responsibilities:

- represent proposed work
- convert to invoice later

Constraint:
Quotation must reuse invoice logic.

---

3.5 CSR (Customer Service Report)

Fields:

- id
- number
- client_id
- project_id (nullable)
- service details
- readings
- remarks

Responsibilities:

- document work done
- provide operational record

---

3.6 Payment

Fields:

- id
- invoice_id
- amount
- date
- method

Responsibilities:

- record money received
- update invoice balance

---

4. Financial Model

4.1 Invoice Level

Invoice maintains:

- total amount
- sum of payments
- remaining balance

Formula:

remaining = total - payments

---

4.2 Project Level

Project aggregates:

- total invoiced
- total received
- outstanding

Formulas:

total_invoiced = sum(invoices.total)

total_received = sum(payments.amount)

outstanding = total_invoiced - total_received

---

5. Document Relationships

5.1 Linking

Each document includes:

project_id (nullable)

---

5.2 Linking Behavior

If project_id exists:

- "Linked Documents" navigates to project

If project_id is null:

- user is prompted to:
  - create project
  - link to existing project

---

6. Navigation Structure

Primary navigation:

- Home
- Clients
- Projects
- Invoices
- Quotations
- CSR

---

7. Project Pages

7.1 Project List

Each project displays:

- name
- client
- status
- start date
- document count
- optional financial summary

---

7.2 Project Detail

Contains:

Header:

- project name
- client
- status
- po number

Summary:

- total invoiced
- total received
- outstanding

Main content:

- document timeline

Side panel:

- quick actions
- project info

---

7.3 Document Timeline

Chronological list of:

- quotations
- invoices
- CSR

Each item shows:

- type
- number
- date
- amount (if applicable)

---

8. Document Pages

8.1 Shared Behavior

All document pages must have:

- consistent header
- action buttons
- layout structure

---

8.2 Required Actions

- Link to Project
- Open Project

---

8.3 Prohibited Actions

- redundant actions (e.g. copy text that OS already supports)

---

9. Payment Flow

9.1 Record Payment

User inputs:

- amount
- date
- method

Payment is saved and linked to invoice.

---

9.2 Update Logic

Invoice:

- updates paid amount
- updates remaining

Project:

- recalculates totals

---

10. PDF System

10.1 Invoice PDF

- reflects full invoice data
- consistent layout
- readable totals

---

10.2 CSR PDF

- structured report
- strong section hierarchy
- print-first layout

---

11. UI Principles

11.1 Consistency

All pages must follow the same:

- spacing
- header pattern
- button layout

---

11.2 Clarity

- no unnecessary UI elements
- no duplicate actions

---

11.3 Mobile-first

- layouts must adapt cleanly
- no overflow or broken interaction

---

12. MVP Scope

Included:

- Projects
- Quotations
- Invoices
- CSR
- Payments
- PDF output

---

Excluded:

- expenses
- profit/loss
- attendance
- diary
- file uploads
- derived invoices (advance/progress/balance)

---

13. Constraints

- No duplication of invoice logic
- Quotations must reuse invoice structure
- Project is the central entity
- Payments must persist in database
- UI must remain consistent across modules

---

14. Development Order

1. Stabilize invoice system
2. Build quotations using shared logic
3. Fix project aggregation
4. Implement payments correctly
5. Align UI across all pages
6. Stabilize PDF output

---

15. Future Extensions (Post-MVP)

- expenses and receipts
- profit/loss tracking
- internal notes / diary
- attendance tracking
- derived invoice system (advance, progress, balance)