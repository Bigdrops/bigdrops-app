# CSR Import Schema Fix

**Date:** 2026-06-16
**Status:** Complete

---

## Problem

The CSR JSON import was broken. The Zod schema (`csrJsonSchema`) described billing/administrative fields (`customer_name`, `amount_due`, `amount_paid`, `report_type`, `status: 'pending' | 'resolved'`), but the AI prompt (`CSR_IMPORT_PROMPT`) described technical/service fields (`system_down`, `make`, `model`, `serial_no`, `service_rendered`, etc.). The actual CSR form collects technical fields. The schema and prompt were describing two different documents.

---

## Form Fields Audit

Extracted from `src/components/csr/CsrFormScreen.tsx`:

| # | Field Name | Label | Input Type | Required | Category |
|---|---|---|---|---|---|
| 1 | `client_id` | Client Selector | ClientSelector | Yes | Administrative |
| 2 | `client_name` | Customer Name | TextInput | Yes | Administrative |
| 3 | `csr_number` | CSR Number | TextInput | Yes | Administrative |
| 4 | `date` | Date | Date | Yes | Administrative |
| 5 | `po_number` | PO Number | TextInput | Optional | Administrative |
| 6 | `call_type` | Call Type | Select (Warranty, AMC, Paid Service) | Yes | Administrative |
| 7 | `system_down` | System Down | Select (Yes, No) | Yes | Technical |
| 8 | `equipment_type` | Equipment Type | TextInput | No | Technical |
| 9 | `equipment_location` | Equipment Location | TextInput | No | Technical |
| 10 | `make` | Make | TextInput | No | Technical |
| 11 | `capacity` | Capacity | TextInput | No | Technical |
| 12 | `model` | Model | TextInput | No | Technical |
| 13 | `serial_no` | Serial No. | TextInput | No | Technical |
| 14 | `problem_reported` | Problem Reported | TextArea | No | Technical |
| 15 | `service_rendered` | Service Rendered | TextArea | No | Technical |
| 16 | `defects_found` | Defects Found | TextArea | No | Technical |
| 17 | `engineer_remarks` | Engineer Remarks | TextArea | No | Technical |
| 18 | `start_date` | Start Date | Date | No | Execution |
| 19 | `start_time` | Start Time | Time | No | Execution |
| 20 | `end_date` | End Date | Date | No | Execution |
| 21 | `end_time` | End Time | Time | No | Execution |
| 22 | `status` | Status After Service | Select (Complete, Incomplete, Pending for spares, Under observation, Working solution provided) | No | Execution |
| 23 | `voltage` | Voltage | TextInput | No | Operational |
| 24 | `frequency` | Frequency | TextInput | No | Operational |
| 25 | `battery` | Battery | TextInput | No | Operational |
| 26 | `temperature` | Temperature | TextInput | No | Operational |
| 27 | `pressure` | Pressure | TextInput | No | Operational |
| 28 | `hours` | Hours | TextInput | No | Operational |
| 29 | `materials[]` | Materials Used | item + quantity + unit rows | No | Materials |
| 30 | `technician_signatory_id` | Technician Signature | Signatory picker | No | Sign-off |
| 31 | `acknowledgement_name` | Recipient name/title | TextInput | No | Acknowledgement |
| 32 | `customer_feedback` | Comment | TextArea | No | Acknowledgement |
| 33 | `recipient_signature_uri` | Recipient Signature | File upload | No | Acknowledgement |

---

## Decision: Schema Must Change (Form Is Technical)

The form is a **technical service report** (CSR = Customer Service Report). It collects equipment details, operational readings, service descriptions, and materials used. It does NOT collect billing fields like `amount_due`, `amount_paid`, or `report_type`.

**Conclusion:**
- The **prompt** (`CSR_IMPORT_PROMPT`) was correct — it asks for technical fields.
- The **schema** (`csrJsonSchema`) was wrong — it expected billing fields.
- **Fix:** Replace the schema to match the prompt and the form.

---

## Changes Made

### 1. `src/components/csr/csrImport.ts`

Replaced `csrJsonSchema` with a Zod object matching the 19 technical fields the prompt extracts:

```ts
const csrJsonSchema = z.object({
  system_down: z.boolean().nullable().optional(),
  problem_reported: z.string().optional(),
  equipment_type: z.string().optional(),
  equipment_location: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  serial_no: z.string().optional(),
  capacity: z.string().optional(),
  voltage: z.string().optional(),
  frequency: z.string().optional(),
  battery: z.string().optional(),
  temperature: z.string().optional(),
  pressure: z.string().optional(),
  hours: z.string().optional(),
  service_rendered: z.string().optional(),
  defects_found: z.string().optional(),
  engineer_remarks: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  materials: z.array(z.object({
    item: z.string(),
    quantity: z.string(),
    unit: z.string(),
  })).optional(),
})
```

`CsrJson` type derived from the new schema. `ParseCsrJsonResult` unchanged.

### 2. `src/components/csr/CsrImportSheet.tsx`

Updated `handleImport` to map all 19+ fields from parsed JSON to the CSR form, replacing the old billing-field mapping:

- Maps `data.system_down` through `data.end_date` to form fields
- Maps `data.materials` array to `ParsedCsrImport.materials`
- Detects `hasOperationalReadings` from voltage/frequency/battery/temperature/pressure/hours

### 3. No changes to:
- `CSR_IMPORT_PROMPT` (already correct)
- `CsrFormScreen.tsx` (not modified)
- Any other files

---

## Verification

- `bun run typecheck` — **passed**
- Schema and prompt now describe the same document (technical/service CSR fields)
- No other files modified
