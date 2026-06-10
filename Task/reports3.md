# FORENSIC WAYBILL INSPECTION — REPORT

**Date:** 2026-06-10
**Scope:** Full trace of waybill system — schemas, form, save pipeline, offline sync

---

## 1. File Inventory

### Type/Schema Layer
| File | Lines | Purpose |
|------|-------|---------|
| `src/components/waybill/waybillUtils.ts` | 584 | All types, normalizers, mappers, defaults |

### Form/Screen Layer
| File | Lines | Purpose |
|------|-------|---------|
| `src/components/waybill/WaybillForm.tsx` | 465 | Single source form (new + edit) |
| `src/pages/NewWaybill.tsx` | 10 | Wrapper: `<WaybillForm mode="new" />` |
| `src/pages/EditWaybill.tsx` | 14 | Wrapper: `<WaybillForm mode="edit" waybillId={id} />` |
| `src/components/waybill/WaybillSignatureField.tsx` | — | Signature capture sub-component |
| `src/components/waybill/WaybillImportSheet.tsx` | — | JSON import modal |

### Save/Mutation Layer
| File | Lines | Purpose |
|------|-------|---------|
| `src/domain/waybill/waybillMutations.ts` | 41 | `saveWaybill()` — insert/update entry point |
| `src/pages/viewWaybillActions.ts` | 43 | archive, delete, status update, duplicate |

### Offline/Sync Layer (Android Native)
| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/native/waybillOffline.ts` | 271 | SQLite draft creation, counter, numbering |
| `src/lib/native/waybillSync.ts` | 400 | Sync queue processor, local→Supabase push |

### View/Display Layer
| File | Purpose |
|------|---------|
| `src/pages/Waybills.tsx` | List page |
| `src/pages/ViewWaybill.tsx` | Detail view |
| `src/components/document-view/waybill/WaybillViewPage.tsx` | Document viewer |
| `src/components/document-view/waybill/WaybillPrimaryActions.tsx` | View actions |
| `src/components/document-view/waybill/WaybillSecondaryActions.tsx` | View actions |
| `src/components/document-view/waybill/WaybillHeroMeta.tsx` | Header meta |
| `src/components/document-view/waybill/WaybillSummaryStrip.tsx` | Summary bar |
| `src/components/document-view/waybill/WaybillDocumentPreview.tsx` | Preview |
| `src/components/document-view/waybill/WaybillMoreSheet.tsx` | More actions |
| `src/components/waybill/WaybillPDF.tsx` | PDF generation |

### Supporting Files
| File | Purpose |
|------|---------|
| `src/config/moduleAdapters.ts:372–418` | List adapter (query, cache, filter) |
| `src/config/filterCapabilities.ts:59` | Filter config |
| `src/hooks/useProjectDocumentFetch.ts:60–89` | `Waybill` interface for project docs |
| `src/hooks/useGlobalSearch.ts` | Global search waybill results |
| `src/hooks/useDashboardData.ts` | Dashboard waybill stats |
| `src/types/queryPlatform.ts:47–70` | Platform query types |
| `src/lib/pdfDesignPreset.ts` | PDF design presets |
| `src/utils/exportSchemas.ts:39` | Export column mapping |
| `src/services/exportFetchers.ts:26` | Export data fetcher |

---

## 2. Database Schema (Inferred from Code)

**Table:** `waybills`
**Connection:** Supabase (PostgREST)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, auto-generated |
| `waybill_number` | text | NOT NULL, UNIQUE |
| `type` | text | `'internal'` or `'external'` |
| `date` | text | ISO date string |
| `time` | text | Optional |
| `sender_name` | text | Required by form validation |
| `receiver_name` | text | Optional |
| `receiver_signature_url` | text | Legacy signature storage |
| `receiver_description` | text | Acknowledgement notes |
| `client_id` | uuid | FK → clients |
| `client_name` | text | Denormalized |
| `project_id` | uuid | FK → projects |
| `invoice_id` | uuid | FK → invoices |
| `po_number` | text | Optional |
| `vehicle_plate` | text | Optional |
| `delivery_location` | text | Optional |
| `items` | jsonb | Array of `WaybillItem` |
| `notes` | text | Optional |
| `status` | text | `'draft'`, `'dispatched'`, `'delivered'` |
| `created_by` | uuid | FK → auth.users |
| `custom_fields` | jsonb or text | Nested `WaybillCustomFields` |
| `archived_at` | timestamptz | Soft delete |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto |

---

## 3. Save Flow Trace

```
User clicks "Save"
  → WaybillForm.onSave() (line 239)
    → Validates sender_name is non-empty (line 240)
    → buildWaybillCustomFields(customFields, { customColumns }) (line 247)
    → Dynamic import: saveWaybill() (line 249)
      → waybillMutations.saveWaybill() (line 5)
        → If isOffline: createOfflineWaybillDraft() → SQLite
        → If online:
          → payload = { ...waybill, items, custom_fields, status }
          → mode 'new': supabase.from('waybills').insert([payload])
          → mode 'edit': supabase.from('waybills').update(payload).eq('id', waybillId)
    → On success: feedback + navigate('/waybills')
    → On error: feedback.error with getUserFacingMutationMessage()
```

---

## 4. Identified Failure Vectors

### CRITICAL — Waybill Number Generation is Broken

**File:** `WaybillForm.tsx:156–160`
**File:** `waybillUtils.ts:387–394`

```ts
// WaybillForm.tsx line 158
const nextNum = canUseOfflineWaybillDrafts()
  ? await peekNextOfflineWaybillNumber()
  : await getNextWaybillNumber(defaultWaybill.type as WaybillType, []) // ← EMPTY ARRAY
```

```ts
// waybillUtils.ts line 387
export function getNextWaybillNumber(type: WaybillType, existingNumbers: string[]): string {
  const prefix = type === 'internal' ? 'SASWB-I' : 'SASWB-E'
  const nums = existingNumbers    // ← Always empty → highest = 0
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => !isNaN(n))
  const highest = nums.length > 0 ? Math.max(...nums) : 0
  return `${prefix}${String(highest + 1).padStart(3, '0')}`  // ← Always returns SASWB-I001 or SASWB-E001
}
```

**Impact:** Every new waybill gets `SASWB-I001` or `SASWB-E001`. The `UNIQUE` constraint on `waybill_number` will reject the second insert, causing a save failure.

**Root cause:** The function is a pure computation that takes an array, but the caller never queries the DB for existing numbers. It should be `async` and fetch from Supabase.

---

### CRITICAL — Empty waybill_number on Race Condition

**File:** `WaybillForm.tsx:107, 156–160`

```ts
const [waybill, setWaybill] = useState<Waybill>(() => createDefaultWaybill())
// createDefaultWaybill() returns { waybill_number: '', ... }

// In useEffect (async):
const nextNum = await getNextWaybillNumber(...)
setWaybill({ ...defaultWaybill, waybill_number: nextNum })
```

The `useEffect` is async. If the user clicks Save before it resolves, `waybill_number` is `''`, which violates `NOT NULL UNIQUE`.

**Impact:** Intermittent save failures, especially on slow networks.

---

### HIGH — custom_fields Type Ambiguity on Payload

**File:** `waybillMutations.ts:24–28`

```ts
const payload = {
  ...waybill,        // waybill.custom_fields could be string | WaybillCustomFields | null
  items,
  custom_fields,    // This is WaybillCustomFields object (not serialized to string)
  status: normalizeWaybillStatus(waybill.status)
}
```

When loading from DB, `waybill.custom_fields` is parsed to a `WaybillCustomFields` object via `mapDbWaybill()`. But when spreading `...waybill`, the original string from DB is overwritten by the object. If Supabase expects a `text` column, this will fail. If `jsonb`, it may work but serialization is implicit.

**Impact:** Potential silent save failure depending on column type.

---

### HIGH — custom_fields Not Serialized to String

**File:** `waybillMutations.ts:27`

The `custom_fields` is passed as a JS object. Supabase's PostgREST client handles `jsonb` columns by serializing objects, but if the column is `text`, it will send `[object Object]` or throw.

**Impact:** Data corruption or save failure.

---

### MEDIUM — Duplicate Numbering in duplicateWaybillRecord()

**File:** `viewWaybillActions.ts:25–36`

```ts
const { data: all } = await supabase.from('waybills')
  .select('waybill_number')
  .like('waybill_number', 'WB-%')  // ← Wrong prefix! Actual format is SASWB-I### or SASWB-E###
```

The duplicate function queries for `WB-%` but actual waybill numbers use `SASWB-I###` or `SASWB-E###`. The collision detection never finds existing numbers, so duplicates will get `WB-0001` instead of the correct format, and may collide.

**Impact:** Wrong numbering format on duplicates, potential UNIQUE constraint violations.

---

### MEDIUM — Empty String Instead of Null for FK Columns

**File:** `WaybillForm.tsx:144–150`

```ts
defaultWaybill.project_id = prefill.projectId || ''    // ← '' not null
defaultWaybill.client_id = prefill.clientId || ''       // ← '' not null
```

If the DB has foreign key constraints on `project_id`, `client_id`, or `invoice_id`, inserting `''` will fail with a FK violation.

**Impact:** Save failure when no project/client is selected.

---

### LOW — Form Save Button Not Disabled During Number Assignment

**File:** `WaybillForm.tsx:295`

The save button is only disabled when `saving` is true, not when `loading` is true. During the initial async load (where the waybill number is assigned), the save button is technically clickable.

**Impact:** User can submit before waybill_number is ready.

---

## 5. Summary of Fixes Required

| Priority | Fix | Files |
|----------|-----|-------|
| P0 | Make `getNextWaybillNumber()` async — query DB for existing numbers | `waybillUtils.ts`, `WaybillForm.tsx` |
| P0 | Disable save button while `loading` is true | `WaybillForm.tsx:295` |
| P0 | Validate `waybill_number` is non-empty before save | `WaybillForm.tsx:239` |
| P1 | Serialize `custom_fields` to JSON string before sending to Supabase | `waybillMutations.ts:27` |
| P1 | Set FK columns to `null` instead of `''` when empty | `WaybillForm.tsx:144–150` |
| P1 | Fix `duplicateWaybillRecord()` to query `SASWB-%` and respect type prefix | `viewWaybillActions.ts:25` |
| P2 | Add client-side validation for required fields before save | `WaybillForm.tsx:239` |
| P2 | Add error boundary around the save flow for better debugging | `WaybillForm.tsx:268` |
