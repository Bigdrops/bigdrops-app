Good. Now we move from idea → system → execution.

Below is your TECHNICAL SPEC (Markdown ready) — clean, structured, no fluff.
You can drop this straight into:

/docs/TECHNICAL_SPEC.md


---

BIGDROPS — TECHNICAL SPEC (MVP)

1. System Architecture

BigDrops is a job-centric system where all documents and financial records are organized under a project.

Core structure:

Project
 ├── Quotation
 ├── Invoice
 ├── CSR
 ├── Payment

The system is built around:

Shared domain logic (calculations, items, columns)

Document-specific UI layers

Project-based aggregation



---

2. Core Entities

2.1 Projects

Table: projects

id (uuid, primary key)
name (text)
client_id (uuid, foreign key)
status (enum: active | completed | on_hold | cancelled)
po_number (text, nullable)
created_at (timestamp)
updated_at (timestamp)


---

2.2 Clients

Table: clients

id (uuid)
name (text)
email (text)
phone (text)
address (text)
created_at (timestamp)


---

2.3 Invoices

Table: invoices

id (uuid)
number (text)
client_id (uuid)
project_id (uuid, nullable)
status (enum: draft | sent | paid)
issue_date (date)
due_date (date)

items (jsonb)
extra_charges (jsonb)
custom_fields (jsonb)

subtotal (numeric)
tax_total (numeric)
grand_total (numeric)

created_at (timestamp)
updated_at (timestamp)


---

2.4 Quotations

Table: quotations

id (uuid)
number (text)
client_id (uuid)
project_id (uuid, nullable)
status (enum: draft | accepted | rejected)

issue_date (date)
valid_until (date)

items (jsonb)
extra_charges (jsonb)
custom_fields (jsonb)

subtotal (numeric)
tax_total (numeric)
grand_total (numeric)

created_at (timestamp)
updated_at (timestamp)


---

2.5 CSR (Customer Service Reports)

Table: csrs

id (uuid)
number (text)
client_id (uuid)
project_id (uuid, nullable)

service_date (date)

problem_reported (text)
service_rendered (text)
materials_used (text)
technician_remarks (text)

readings (jsonb)
status_flags (jsonb)

created_at (timestamp)
updated_at (timestamp)


---

2.6 Payments

Table: payments

id (uuid)
invoice_id (uuid, foreign key)
amount (numeric)
payment_date (date)
method (text)
notes (text)

created_at (timestamp)


---

3. Domain Layer Structure (TypeScript)

Directory:

src/domain/invoice/


---

3.1 types.ts

Defines all shared types:

InvoiceItem
InvoiceGroup
ExtraCharge
CustomField
CalculationInput
CalculationOutput
ColumnDefinition


---

3.2 columns.ts

Responsibilities:

BUILTIN_COLUMNS
COLUMN_TYPES

getActiveColumns()
getPdfColumns()
getPdfCellValue()

resolveInstallRate()


---

3.3 calculations.ts

Responsibilities:

buildCalculationInputs()
extractCalculationInputs()
buildEditableCalculationInputs()

resolveRowVat()
calcTotals()


---

3.4 normalize.ts

Responsibilities:

normalizeFieldEntries()
normalizeExtraCharges()
toDbItem()


---

3.5 factories.ts

Responsibilities:

makeEmptyItem()
makeEmptyGroup()
makeExtraCharge()
makeFieldEntry()
ensureUiKey()


---

3.6 preview.ts

Responsibilities:

buildInvoicePreviewData()
normalizeInvoiceToPreview()

Used by:

ViewInvoice

PDF generator



---

3.7 index.ts

Exports all domain functions


---

4. CSR Domain Layer

Directory:

src/components/csr/


---

Files

CSRPreviewTemplates.jsx
CSRPreviewPanel.jsx
CSRPreviewContent.js
csrUtils.js


---

Responsibilities

Shared CSR data shaping

Preview rendering

PDF template rendering

Shared labels/constants



---

5. Page Layer

Invoice Pages

NewInvoice.jsx
EditInvoice.jsx
ViewInvoice.jsx


---

Quotation Pages

NewQuotation.jsx
EditQuotation.jsx
ViewQuotation.jsx


---

CSR Pages

NewCSR.jsx
EditCSR.jsx
ViewCSR.jsx


---

Project Pages

Projects.jsx
ProjectDetail.jsx
NewProject.jsx


---

6. Project Aggregation Logic

Required Computations

totalInvoiced = SUM(invoices.grand_total)

totalReceived = SUM(payments.amount)

outstanding = totalInvoiced - totalReceived


---

Data Fetch Strategy

1. Fetch project


2. Fetch invoices where project_id = project.id


3. Fetch payments where invoice_id IN invoices


4. Compute totals in frontend or backend




---

7. Linking System

Each document includes:

project_id (nullable)


---

Behavior

If project_id exists:

"Linked Documents" → navigate to ProjectDetail


If null:

show modal:

Create Project

Link Existing Project




---

8. Payment Flow

Record Payment

Input:

amount

date

method

notes


Save to payments



---

Invoice Update

paid = SUM(payments.amount)
remaining = invoice.total - paid


---

9. PDF System

Invoice PDF

uses preview.ts

consistent layout

shows totals clearly



---

CSR PDF

uses CSRPreviewTemplates.jsx

supports variants

shares branding logic



---

10. UI Architecture Rules

10.1 Consistency

All document pages must share:

header layout

action buttons

spacing system



---

10.2 Shared Components

ClientSelector
Select (UI)
Preview Panels
Template Pickers


---

10.3 Mobile Behavior

stacked layout

scroll-safe tables

reduced padding

large tap targets



---

11. State Management

Local component state for forms

Supabase (or backend) for persistence

No global state required for MVP



---

12. API / Data Layer (Simple)

Use direct DB calls (Supabase or similar):

fetchProjects()

fetchInvoices(project_id)

fetchPayments(invoice_ids)

createInvoice()

createPayment()

updateProject()



---

13. MVP Constraints

Do NOT implement yet:

advance invoices

progress invoices

balance invoices

expense tracking

profit/loss

attendance

file uploads



---

14. Migration Strategy (TypeScript)

Step 1

Add TS config:

allowJs: true
checkJs: false
strict: false


---

Step 2

Move:

calculations

columns

normalize


into TS domain


---

Step 3

Keep JSX pages unchanged


---

Step 4

Gradually import typed functions


---

15. Critical Rules

1. Do not duplicate invoice logic


2. Quotations must reuse invoice domain


3. Project is the central entity


4. Payments must persist in DB


5. PDF must use shared preview data


6. UI must remain consistent across documents




---

16. Next Implementation Priority

1. Build Quotations (reuse invoice domain)


2. Fix Project aggregation


3. Implement payment persistence


4. Align UI across pages


5. Stabilize PDF output




---

If you follow this strictly, you stop guessing and start shipping.

If you want next:

I’ll break Quotations build (Phase 2) into exact code steps so you can implement it without thinking.