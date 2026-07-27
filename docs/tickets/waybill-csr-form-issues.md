# Waybill & CSR Form Issues

This report was written by Buffy (OpenCode) on 2026-07-27 via Local Runner.

---

## Waybill Form Issues

### W1. Purpose field options do not match DB CHECK constraint

**Severity:** High — causes DB write failures

**Evidence:** `src/components/waybill/waybillUtils.ts` line 123 defines `EXTERNAL_PURPOSE_OPTIONS` as `['Supply', 'Return', 'Repair', 'Other']`. The DB CHECK constraint in `supabase/migrations/20260611000000_waybill_schema_final.sql` line 38 allows only `'Supply'`, `'Return'`, `'Third-Party Custody'` for external waybills. Saving an external waybill with purpose `'Repair'` or `'Other'` will fail at the DB level. Similarly, internal purpose is enforced as NULL by DB but `INTERNAL_PURPOSE_OPTIONS` defines `['Transfer', 'Repair', 'Other']`.

### W2. Status always reset to 'dispatched' on save

**Severity:** Medium — data integrity

**Evidence:** `src/components/waybill/WaybillForm.tsx` line 253: `status: 'dispatched'` is hardcoded in `handleSave`. This means even in edit mode, the status is always overwritten to `'dispatched'` regardless of prior `pending_confirmation`, `delivered`, or `returned` status. The `saveWaybill` mutation in `waybillMutations.ts` lines 60–62 fetches old status for audit logging, but the update payload already contains `'dispatched'` from the form.

### W3. receiver_signature_url and receiver_description are dead fields

**Severity:** Low — dead code

**Evidence:** `src/components/waybill/waybillUtils.ts` lines 79–80 define `receiver_signature_url: string` and `receiver_description: string` on the `Waybill` interface. But the form's signature system uses `customFields.signatures.receiver.image_url` instead. These top-level fields are never written by the form and exist only for legacy record compatibility. `mapDbWaybill()` reads them but nothing writes them.

### W4. Notes and Terms & Conditions are not saved to DB

**Severity:** Medium — data loss

**Evidence:** `WaybillForm.tsx` manages `notes` (from `waybill.notes`) and `terms` as local state. `terms` state (line 103) is never included in the save payload — only used for UI display under the Terms & Conditions collapsible. The `notes` field is part of the Waybill payload and IS saved, but the `terms` value is completely orphaned.

### W5. Transport mode relation to vehicle_plate is enforced in UI but not in validation

**Severity:** Low — UX inconsistency

**Evidence:** `WaybillForm.tsx` lines 352–355: when transport_mode changes to `'By Hand'` or `'Courier'`, `vehicle_plate` is cleared. But if a user edits an existing waybill where vehicle_plate was previously set, switching modes does not trigger the same cleanup. No validation checks that vehicle_plate is empty when transport_mode is By Hand/Courier.

---

## CSR Form Issues

### C1. recipient_signature_uri is silently discarded on save

**Severity:** High — data loss

**Evidence:** `src/components/csr/CsrFormScreen.tsx` line ~500 stores uploaded recipient signature as `recipient_signature_uri` via `onUpdate('recipient_signature_uri', reader.result)`. But `src/domain/csr/csrService.ts` lines 51–54 defines `CSR_TABLE_COLUMNS` which does NOT include `recipient_signature_uri`. The `sanitizeCsrInsertPayload()` function strips any key not in that set. Result: recipient signatures uploaded in the form are silently dropped on every save.

### C2. Materials quantity stored as string instead of number

**Severity:** Low — type safety

**Evidence:** `src/components/csr/csrUtils.ts` lines 14–19 define `MaterialRow.quantity` as `string`. The form uses `NumericInput` which returns a string value. No numeric conversion is done before serialization into `materials_used`. This means downstream consumers must parse the string to number.

### C3. system_down type inconsistency between form and DB

**Severity:** Low — confusing

**Evidence:** `CsrFormScreen.tsx` line ~313 converts the Yes/No select to a boolean: `onUpdate('system_down', value === 'Yes')`. But the DB column in `supabase/migrations/20260520090004_csrs.sql` line 33 defines `system_down text`. In `viewCSRActions.ts` `duplicateCSRRecord`, there is a `toBoolean()` helper specifically to convert back — suggesting awareness of the mismatch. The DB text column accepts any string, so no constraint violation, but the TS type ambiguity is confusing.

### C4. No dirty-tracking / unsaved changes warning

**Severity:** Medium — UX/data loss

**Evidence:** `WaybillForm.tsx` lines 257–264 implements `beforeunload` event listener when `dirty` is true. `CsrFormScreen.tsx` has NO equivalent. Users can navigate away from the CSR form with unsaved changes without any warning.

### C5. materials_used dual-purpose encoding is fragile

**Severity:** Medium — maintenance

**Evidence:** `src/components/csr/csrUtils.ts` `serializeCsrMaterials()` encodes both material rows AND CSR meta (showOperationalReadings, showAcknowledgement, etc.) into a single text column with magic prefix `__CSR_META_V1__`. The `parseCsrMaterials()` function handles the reverse but falls back to treating the raw string as flat text if the prefix is missing. This makes the column unqueryable for individual components and requires custom parsing everywhere it's read.

### C6. CSR number field has no auto-generation wired in the form

**Severity:** Low — UX friction

**Evidence:** `CsrFormScreen.tsx` renders `csr_number` as a plain text input with no auto-generation logic. The `getNextCsrNumber()` function exists in `csrUtils.ts` but is not called by the form. Auto-generation only appears in `viewCSRActions.ts`'s `duplicateCSRRecord` and presumably in the new CSR page (not inspected). The form relies on the parent page to set the number before rendering.

### C7. CSR form does not guard against offline save when csrNumberReady is false

**Severity:** Low — potential confusion

**Evidence:** `CsrFormScreen.tsx` line ~316: `saveDisabled` checks `!isOnline || !csrNumberReady || !csr.csr_number.trim()`. If `csrNumberReady` is false (e.g., number is still being generated), the button is disabled but no visual feedback explains why. The user sees a disabled save button with no tooltip or error message.

---

## Cross-Cutting Issues

### X1. Both forms lack loading skeleton states for initial data fetch

**Severity:** Low — UX

**Evidence:** Neither `WaybillForm` (edit mode) nor `CsrFormScreen` (edit mode) shows a skeleton/loading state while fetching the existing record. `WaybillFormPage.tsx` returns `null` when `editLoading` is true (line 118). The CSR form page (`NewCSR.tsx` / route) was not inspected, but `CsrFormScreen` itself has no loading prop.
