

Prefix Engine — Organization-Level Configuration Design

Status: Design Spec (Implementation Pending)
Scope: Cross-cutting — applies to all document types
Last Updated: June 11, 2026

---

1. Problem Statement

The application currently hardcodes or loosely derives document number prefixes (e.g., AWB, SASWB). This creates three problems:

1. Not neutral. Prefixes tied to one company's initials (e.g., SASWB) are meaningless — or worse, confusing — when deployed to a different organization.
2. Not configurable. Adding a second company or tenant requires code changes, not settings changes.
3. Not consistent. Each document type (Waybill, Invoice, BOQ, RFQ, Quotation, Project) may use a different prefix scheme with no unified control surface.

---

2. Design Goal

A single Document Prefix Settings page that allows workspace administrators to configure the prefix for every document type in the application. These prefixes feed into each document's sequence number generator at runtime.

Manual override of individual document numbers on creation forms remains permitted. The prefix settings control only the auto-generated default.

---

3. General Configuration Model

3.1 Storage

Add a document_prefixes JSONB column to the organizations table (or equivalent workspace/tenant table). Structure:

```json
{
  "waybill": "WBL",
  "invoice": "INV",
  "boq": "BOQ",
  "rfq": "RFQ",
  "quotation": "QTN",
  "project": "PRJ"
}
```

Default value (applied to new organizations):

```json
{
  "waybill": "WBL",
  "invoice": "INV",
  "boq": "BOQ",
  "rfq": "RFQ",
  "quotation": "QTN",
  "project": "PRJ"
}
```

Fallback: If no organization context exists (single-tenant mode, or unauthenticated), fall back to the defaults above as constants in the application code.

3.2 Migration

```sql
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS document_prefixes jsonb DEFAULT '{
  "waybill": "WBL",
  "invoice": "INV",
  "boq": "BOQ",
  "rfq": "RFQ",
  "quotation": "QTN",
  "project": "PRJ"
}'::jsonb;
```

Existing organizations retain whatever their current effective prefixes are — this column only takes effect for newly generated numbers. If an organization wants to keep their legacy prefix, they set it explicitly in the Settings page.

3.3 Settings Page UI

A single settings card: Document Prefixes.

Field Label Default Preview
Waybill Waybill Prefix WBL WBL-E-000001
Invoice Invoice Prefix INV INV-000001
BOQ BOQ Prefix BOQ BOQ-000001
RFQ RFQ Prefix RFQ RFQ-000001
Quotation Quotation Prefix QTN QTN-000001
Project Project Prefix PRJ PRJ-000001

· Each field is a text input accepting alphanumeric characters only (regex: [A-Z0-9]+).
· A preview shows the format for that document type based on the current input.
· Save writes the entire document_prefixes JSONB object.
· Validation: prefix must be 2–6 characters, uppercase, no special characters.

3.4 Sequence Generation Integration

Every document type's sequence generator function accepts the prefix as a parameter. The call chain:

```
Settings (DB) → Organization Context (session) → Sequence Generator → Form Default Value
```

Pseudocode for any document:

```typescript
const org = await getCurrentOrganization();
const prefixes = org?.document_prefixes ?? DEFAULT_PREFIXES;
const prefix = prefixes.waybill; // or .invoice, .boq, etc.
const number = generateSequenceNumber(nextSeq, prefix, options);
```

3.5 Manual Override Safety Rule (All Documents)

· The auto-generated number is pre-filled in the form field as a suggestion.
· The user may edit or entirely replace the number.
· On save, the database UNIQUE constraint on the number column is the final validator.
· If the user enters a number that already exists, the save is rejected with a clear error.
· The sequence engine uses MAX(existing_numeric_suffix) — including manually entered numbers — to compute the next auto-generated value. Gaps caused by manual overrides are permanent and acceptable.

---

4. Waybill — Detailed Subsection

4.1 Waybill Number Format

The Waybill has the most complex numbering scheme due to routing tokens and blank document bypass logic.

Format: [PREFIX]-[M][ROUTING]-[SERIAL]

Component Value Source
Prefix e.g. WBL document_prefixes.waybill from organization settings
M token M or empty System-injected; M for blank/downloaded templates, empty for normal digital creation
Routing token E or I E = External, I = Internal; determined by the waybill type at creation
Serial 6-digit zero-padded number Sequence engine: MAX(suffix) + 1, filtered by routing token and manual flag

Examples:

Scenario Generated Number
Normal external delivery WBL-E-000047
Normal internal transfer WBL-I-000023
Blank download (external) WBL-ME-000048
Blank download (internal) WBL-MI-000024

4.2 Prefix Resolution Flow

1. User opens "New Waybill" form.
2. System fetches document_prefixes.waybill from current organization.
3. Fallback to 'WBL' if organization has no custom prefix.
4. System determines routing token (E or I) based on the default type or user selection.
5. System queries MAX(numeric_suffix) from waybills.waybill_number filtered by type and whether the number contains the M token.
6. generateWaybillSequenceNumber(sequence, isManual, isInternal, prefix) is called.
7. Result is pre-filled in the Waybill Number field.

4.3 Blank Document Download

· The [Download Blank Waybill Template] action sets isManual = true programmatically.
· The M token is injected by the system — the user never types it.
· The generated number is inserted into blank_waybill_logs and permanently consumed.
· No user override is possible on the blank download path.
· No collision risk — the UNIQUE constraint on blank_waybill_logs.assigned_waybill_number is the safety net.

4.4 Form Field Behavior

· The Waybill Number field is pre-filled with the auto-generated value.
· The field is fully editable.
· If the user clears the field and types a custom number, the custom number is saved as-is (subject to UNIQUE constraint).
· The sequence engine's next auto-generation will scan all existing numbers — including this custom one — to compute the next suffix. The custom number consumes that position in the sequence.

4.5 Migration Path for Existing Waybills

· Existing waybill numbers (e.g., SASWB-I-000012) are not retroactively changed.
· The new prefix takes effect only for newly created waybills.
· Organizations that prefer to keep their legacy prefix can set document_prefixes.waybill to their existing prefix in the Settings page.
· No data migration is required.

---

5. Other Document Types — General Specification

5.1 Invoice

Attribute Value
Default prefix INV
Format INV-000001
Routing tokens None (Invoice has no internal/external split)
Manual override Yes — field editable, UNIQUE constraint enforced
Sequence MAX(numeric_suffix) + 1 from invoices.invoice_number

5.2 BOQ (Bill of Quantities)

Attribute Value
Default prefix BOQ
Format BOQ-000001
Routing tokens None
Manual override Yes
Sequence MAX(numeric_suffix) + 1 from boqs.boq_number

5.3 RFQ (Request for Quotation)

Attribute Value
Default prefix RFQ
Format RFQ-000001
Routing tokens None
Manual override Yes
Sequence MAX(numeric_suffix) + 1 from rfqs.rfq_number

5.4 Quotation

Attribute Value
Default prefix QTN
Format QTN-000001
Routing tokens None
Manual override Yes
Sequence MAX(numeric_suffix) + 1 from quotations.quotation_number

5.5 Project

Attribute Value
Default prefix PRJ
Format PRJ-000001
Routing tokens None
Manual override Yes
Sequence MAX(numeric_suffix) + 1 from projects.project_number

---

6. Implementation Order (When We Return)

1. Migration — Add document_prefixes JSONB column to organizations table.
2. Settings UI — Build the Document Prefixes card in the Settings page.
3. Waybill integration — Wire generateWaybillSequenceNumber() to read from document_prefixes.waybill.
4. Other documents — Wire Invoice, BOQ, RFQ, Quotation, Project sequence generators to their respective prefix keys, one document type at a time.
5. Testing — Verify uniqueness enforcement, manual override behavior, blank download token burn, and fallback defaults.

---

7. Constraints & Rules

· Prefix validation: 2–6 uppercase alphanumeric characters. No spaces, no special characters.
· No retroactive renumbering. Existing document numbers are immutable.
· Manual overrides consume the sequence position. Gaps are permanent.
· Blank download M-token is system-injected only. Never exposed to user input.
· All sequence generators must use MAX(suffix), never COUNT + 1.

---

Document saved. Implementation deferred to a future task.