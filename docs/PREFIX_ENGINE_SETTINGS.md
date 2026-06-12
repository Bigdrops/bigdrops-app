# PREFIX ENGINE SETTINGS — Full Specification

**Status:** Design Spec (Implementation Pending)
**Scope:** Cross-cutting — applies to all document types
**Last Updated:** June 12, 2026

---

## 1. Problem Statement

The application currently hardcodes or loosely derives document number prefixes. This creates three problems:

1. **Not neutral.** Prefixes tied to one company's initials are meaningless when deployed to a different organization.
2. **Not configurable.** Adding a second company or tenant requires code changes, not settings changes.
3. **Not consistent.** Each document type uses a different prefix scheme with no unified control surface.

---

## 2. Design Goal

A single Document Prefix Settings page that allows workspace administrators to configure the prefix for every document type. These prefixes feed into each document's sequence number generator at runtime.

Manual override of individual document numbers on creation forms remains permitted. Prefix settings control only the auto-generated default.

---

## 3. Storage & Migration

### 3.1 JSONB Column

Add `document_prefixes` to the `organizations` table:

```sql
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS document_prefixes jsonb DEFAULT '{
  "waybill": "WBL",
  "invoice": "INV",
  "boq": "BOQ",
  "rfq": "RFQ",
  "quotation": "QTN",
  "project": "PRJ",
  "csr": "CSR"
}'::jsonb;
```

### 3.2 DB Validation Constraint

```sql
CONSTRAINT check_document_prefixes_format CHECK (
  document_prefixes IS NULL OR (
    jsonb_typeof(document_prefixes) = 'object' AND
    (document_prefixes->>'waybill')   ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'invoice')   ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'boq')       ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'rfq')       ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'quotation') ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'project')   ~ '^[A-Z0-9]{2,6}$' AND
    (document_prefixes->>'csr')       ~ '^[A-Z0-9]{2,6}$'
  )
)
```

Mirrors UI validation at the database level. Both layers enforce the same rule.

### 3.3 Fallback

If no organization context exists, fall back to the defaults above as constants in application code:

```typescript
export const DEFAULT_PREFIXES = {
  waybill:   'WBL',
  invoice:   'INV',
  boq:       'BOQ',
  rfq:       'RFQ',
  quotation: 'QTN',
  project:   'PRJ',
  csr:       'CSR',
} as const;
```

---

## 4. Document Number Formats

| Document | Digital Format | Blank Download Format |
|----------|---------------|----------------------|
| Waybill (External) | `[PREFIX]-E-[SERIAL]` | `[PREFIX]-ME-[SERIAL]` |
| Waybill (Internal) | `[PREFIX]-I-[SERIAL]` | `[PREFIX]-MI-[SERIAL]` |
| CSR | `[PREFIX]-[SERIAL]` | `[PREFIX]-M-[SERIAL]` |
| Invoice | `[PREFIX]-[SERIAL]` | — |
| BOQ | `[PREFIX]-[SERIAL]` | — |
| RFQ | `[PREFIX]-[SERIAL]` | — |
| Quotation | `[PREFIX]-[SERIAL]` | — |
| Project | `[PREFIX]-[SERIAL]` | — |

Serial is always 6-digit zero-padded: `000001`.

---

## 5. Sequence Generation

### 5.1 Core Rule

Always use `MAX(numeric_suffix) + 1`. Never `COUNT + 1`.

### 5.2 Pattern Guard

Only scan numbers matching the engine's pattern. Manually entered numbers that don't match are ignored:

```sql
-- Example: Invoice sequence scan
SELECT MAX(CAST(split_part(invoice_number, '-', -1) AS INTEGER))
FROM invoices
WHERE invoice_number ~ '^[A-Z0-9]+-[0-9]{6}$'
AND org_id = $orgId
```

Waybill scans split by routing token:

```sql
-- External waybill sequence
WHERE waybill_number ~ '^[A-Z0-9]+-E-[0-9]{6}$' AND org_id = $orgId

-- Internal waybill sequence
WHERE waybill_number ~ '^[A-Z0-9]+-I-[0-9]{6}$' AND org_id = $orgId

-- Blank external
WHERE waybill_number ~ '^[A-Z0-9]+-ME-[0-9]{6}$' AND org_id = $orgId

-- Blank internal
WHERE waybill_number ~ '^[A-Z0-9]+-MI-[0-9]{6}$' AND org_id = $orgId
```

CSR scans split by M token:

```sql
-- Digital CSR
WHERE csr_number ~ '^[A-Z0-9]+-[0-9]{6}$' AND org_id = $orgId

-- Blank CSR
WHERE csr_number ~ '^[A-Z0-9]+-M-[0-9]{6}$' AND org_id = $orgId
```

### 5.3 Call Chain

```
Settings (DB) → Organization Context → Sequence Generator → Form Default
```

```typescript
const org = await getCurrentOrganization(orgId);
const prefixes = org?.document_prefixes ?? DEFAULT_PREFIXES;
const prefix = prefixes.waybill;
const number = generateSequenceNumber(nextSeq, prefix, options, orgId);
```

`orgId` is in every generator signature from day one, even in single-tenant mode.

### 5.4 Manual Override Safety

- Auto-generated number is pre-filled as a suggestion only
- Field is fully editable
- User may type any custom number — saved as-is
- Custom numbers consume their position in the sequence permanently
- Gaps caused by manual overrides are permanent and acceptable
- UNIQUE constraint is the final validator at save

### 5.5 Collision Handling (Simultaneous Users)

On UNIQUE constraint violation (Postgres error `23505`):

1. App catches the error silently — no UI shown to user
2. Re-queries `MAX(suffix)` for that document type scoped to org
3. Generates next available number
4. Retries save automatically
5. On success — saved document reflects new number, user unaware
6. On second collision — retry again, up to 3 attempts total
7. If all 3 fail — show single generic message: *"Something went wrong. Please try again."* No technical details

**SQLite sync layer (Waybills):** On collision during Supabase sync, the auto-retry must update the local SQLite record with the winning number before confirming success. Both stores must reflect the same number.

---

## 6. Settings Page UI

### 6.1 Layout

Single settings card: **Document Prefixes**

| Field Label | Default | Preview |
|-------------|---------|---------|
| Waybill Prefix | WBL | `WBL-E-000001` / `WBL-I-000001` / `WBL-ME-000001` / `WBL-MI-000001` |
| Invoice Prefix | INV | `INV-000001` |
| BOQ Prefix | BOQ | `BOQ-000001` |
| RFQ Prefix | RFQ | `RFQ-000001` |
| Quotation Prefix | QTN | `QTN-000001` |
| Project Prefix | PRJ | `PRJ-000001` |
| CSR Prefix | CSR | `CSR-000001` / `CSR-M-000001` |

### 6.2 Input Rules

- Alphanumeric only: `^[A-Z0-9]{2,6}$`
- Auto-uppercase on keystroke — never wait for save
- 2–6 characters, no spaces, no special characters
- Preview updates live as user types

### 6.3 Cross-Type Conflict Detection

If a user sets two document types to the same prefix, warn inline:

> *"This prefix is already used by Invoices. Using the same prefix across document types may cause confusion."*

Warning only — does not block save.

### 6.4 Save Button

- Disabled until at least one field has changed (dirty state)
- On save, writes entire `document_prefixes` JSONB object in one operation
- On prefix change detected, shows confirmation:

> *"Changing from INV to ACME will start a new sequence from ACME-000001. Your existing INV-* documents are not affected."*

### 6.5 Solo Reset

Each prefix field has an individual reset icon. Tapping it:

1. Shows confirmation: *"Reset to INV? A new sequence starting at INV-000001 will begin. Your existing documents are not affected."*
2. On confirm — reverts that field to its default value
3. Saves immediately (no need to tap the main Save button)
4. **Does not scan existing documents.** The new sequence starts at 000001 regardless of whether INV-* numbers already exist in the table. Gaps and parallel series are permanent and acceptable.

### 6.6 Full Reset

Reset all button at the bottom of the card. Tapping it:

1. Shows confirmation: *"Reset all prefixes to defaults? New sequences will begin for any changed prefixes. Existing documents are not affected."*
2. On confirm — reverts all six fields to defaults in one write
3. Same sequence behavior as solo reset — each prefix restarts at 000001

---

## 7. Blank Document Audit Tables

### 7.1 Waybill Blank Log

```sql
CREATE TABLE IF NOT EXISTS public.blank_waybill_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    assigned_waybill_number text NOT NULL,
    type text NOT NULL,
    downloaded_by uuid DEFAULT auth.uid(),
    downloaded_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    linked_waybill_id uuid,
    reconciled_at timestamp with time zone,
    CONSTRAINT blank_waybill_logs_pkey PRIMARY KEY (id),
    CONSTRAINT blank_waybill_logs_number_key UNIQUE (assigned_waybill_number),
    CONSTRAINT blank_waybill_logs_linked_waybill_id_fkey FOREIGN KEY (linked_waybill_id)
        REFERENCES public.waybills(id) ON DELETE SET NULL,
    CONSTRAINT check_blank_log_type CHECK (type IN ('external', 'internal')),
    CONSTRAINT check_reconciliation_mapping CHECK (
        (linked_waybill_id IS NULL AND reconciled_at IS NULL) OR
        (linked_waybill_id IS NOT NULL AND reconciled_at IS NOT NULL)
    )
);
CREATE INDEX IF NOT EXISTS idx_blank_waybill_logs_linked_id
    ON public.blank_waybill_logs(linked_waybill_id);
```

### 7.2 CSR Blank Log

```sql
CREATE TABLE IF NOT EXISTS public.blank_csr_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    assigned_csr_number text NOT NULL,
    downloaded_by uuid DEFAULT auth.uid(),
    downloaded_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    linked_csr_id uuid,
    reconciled_at timestamp with time zone,
    CONSTRAINT blank_csr_logs_pkey PRIMARY KEY (id),
    CONSTRAINT blank_csr_logs_number_key UNIQUE (assigned_csr_number),
    CONSTRAINT blank_csr_logs_linked_csr_id_fkey FOREIGN KEY (linked_csr_id)
        REFERENCES public.csrs(id) ON DELETE SET NULL,
    CONSTRAINT check_reconciliation_mapping CHECK (
        (linked_csr_id IS NULL AND reconciled_at IS NULL) OR
        (linked_csr_id IS NOT NULL AND reconciled_at IS NOT NULL)
    )
);
CREATE INDEX IF NOT EXISTS idx_blank_csr_logs_linked_id
    ON public.blank_csr_logs(linked_csr_id);
```

---

## 8. Hard Constraints

- Prefix validation: 2–6 uppercase alphanumeric. No spaces, no special characters
- No retroactive renumbering. Existing document numbers are immutable
- Manual overrides consume the sequence position. Gaps are permanent
- M-token is system-injected only. Never exposed to user input
- All sequence generators use `MAX(suffix)`, never `COUNT + 1`
- Every sequence scan is scoped to `org_id`
- `orgId` is a required parameter in every generator function signature
- SQLite and Supabase must reflect the same number after any collision resolution

---

## 9. Implementation Order

1. Migration — add `document_prefixes` JSONB column to `organizations`
2. Settings UI — build Document Prefixes card with live preview, solo reset, full reset
3. CSR blank log table — `blank_csr_logs` migration
4. Waybill integration — wire `generateWaybillSequenceNumber()` to org prefix
5. CSR integration — wire CSR sequence generator to org prefix
6. Invoice, BOQ, RFQ, Quotation, Project — wire one at a time
7. Collision handler — implement silent auto-retry across all document types
8. SQLite sync layer — ensure collision resolution updates local record