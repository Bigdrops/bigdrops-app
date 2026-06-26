# custom_info Pipeline Trace Audit

**Date:** 2026-06-25
**Scope:** Full lifecycle trace from database to PDF rendering for `settings.custom_info`
**Method:** Layer-by-layer trace (Layers 1–10), strict evidence-based analysis
**Root Cause:** Data contract mismatch between write path and read path

---

## Executive Summary

The `custom_info` field from `settings` never appears on invoice/quotation PDFs because **the settings form saves items with `{ title, content }` keys, but the projection layer filters for `{ label, value }` keys**. This key-name mismatch causes every saved item to be silently filtered out, resulting in an empty `customInfo` array that renders nothing.

The data loss occurs at **Layer 4 (partyProjection.ts:56)**. All other layers are correctly wired.

---

## Root Cause Classification

**Root Cause: Data Contract Mismatch (Write Path ≠ Read Path)**

| Write Path | Read Path |
|---|---|
| `CompanySettingsSection.tsx:25-28` saves `{ title, content }` | `partyProjection.ts:56` filters for `{ label, value }` |
| DB stores: `[{"title":"Reg No","content":"12345"}]` | Filter expects: `item?.label && item?.value` |
| Items pass through DB as-is (text column) | All items filtered out → empty array |

This is not a missing pipeline stage. The data exists in the database at every layer. The break is a **semantic mismatch**: the write contract (`title`/`content`) differs from the read contract (`label`/`value`).

---

## Layer-by-Layer Trace

### Layer 1 — Database ✅

**File:** `supabase/migrations/20260520090000_core_tables.sql:117`

```sql
custom_info text DEFAULT '[]'::text
```

- Column exists on `settings` table
- Type: `text` with JSON string default
- No CHECK constraint on structure — any valid JSON string is accepted

**Supabase types** (`src/lib/database.types.ts:1938`):

```typescript
custom_info: string | null  // Row type
custom_info: string | null  // Insert/Update type
```

**Verdict:** DB stores `custom_info` as raw text. Data persists correctly.

---

### Layer 2 — Settings Loading ✅

**File:** `src/hooks/useSettings.js`

**Fetch** (line 196):

```typescript
const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single()
```

- `select('*')` loads all columns including `custom_info`
- `normalizeSettings()` (line 162-189) handles legacy logo migration only — **does not touch `custom_info`**
- Returns raw `settings.custom_info` string as-is

**Save** (line 278-300):

```typescript
export async function saveSettings(updates) {
  await persistSettings(updates)
  // updates contain custom_info as JSON string
}
```

**Persist** (line 91-160):

```typescript
async function persistSettings(updates) {
  const finalPayload = { id: 1, ...persistableUpdates }
  await supabase.from('settings').upsert(finalPayload, { onConflict: 'id' }).select()
}
```

- `custom_info` passes through to Supabase upsert without transformation
- The `getPersistableUpdates` function (line 74-89) only strips `unsupportedSettingsColumns` — `custom_info` is not in that set

**Verdict:** `custom_info` loads from DB correctly. No stripping or normalization occurs.

---

### Layer 3 — SettingsLike Type ✅

**File:** `src/domain/invoice/renderTypes.ts:90-99`

```typescript
export type SettingsLike = {
  company_name?: string | null
  company_address?: string | null
  company_phone?: string | null
  company_email?: string | null
  company_website?: string | null
  company_logo_url?: string | null
  custom_info?: string | null   // ← line 98
  // ...
}
```

**Verdict:** Type definition is correct. `custom_info` is typed as `string | null`.

---

### Layer 4 — partyProjection.ts ❌ **BREAK POINT**

**File:** `src/domain/invoice/projections/partyProjection.ts:50-62`

```typescript
let customInfo: Array<{ label: string; value: string }> = []
if (settings?.custom_info) {
  try {
    const parsed = JSON.parse(settings.custom_info)
    if (Array.isArray(parsed)) {
      customInfo = parsed
        .filter((item: any) => item?.label && item?.value)   // ← LINE 56: THE FILTER
        .map((item: any) => ({ label: String(item.label), value: String(item.value) }))
    }
  } catch {
    // ignore malformed JSON
  }
}
```

**The filter at line 56 requires:**
- `item?.label` — truthy
- `item?.value` — truthy

**What the form actually saves** (`CompanySettingsSection.tsx:25-28`):

```typescript
type CustomInfoItem = {
  title?: string
  content?: string
}
```

**Example DB value:**

```json
[{"title":"Registration No.","content":"RC 123456"}]
```

**Filter result:** `item?.label` is `undefined` (key is `title`, not `label`). `item?.value` is `undefined` (key is `content`, not `value`). **Every item is filtered out.**

**Verdict:** This is the exact layer where data disappears. The filter silently discards all items due to key-name mismatch.

---

### Layer 5 — Preview Models ✅

**Invoice** (`src/domain/invoice/previewModel.ts:113`):

```typescript
companyCustomInfo: companyPreviewResult.customInfo
```

- `companyPreviewResult.customInfo` comes from `buildCompanyPreviewLines()` (Layer 4)
- At this point, `customInfo` is already `[]` (empty) due to the filter
- The assignment is correct — it forwards whatever was returned

**Quotation** (`src/domain/quotation/previewModel.ts:130`):

```typescript
companyCustomInfo: companyPreviewResult.customInfo
```

- Same pattern. Same result: `[]`

**Verdict:** Preview models correctly forward `customInfo`. The empty array is faithfully propagated.

---

### Layer 6 — PdfParty Type ✅

**File:** `src/components/pdf-new/types.ts:33`

```typescript
customInfo?: Array<{ label: string; value: string }>
```

**Verdict:** Type definition exists and matches the expected shape.

---

### Layer 7 — PDF Actions ✅

**Invoice** (`src/components/document-view/invoice/invoicePdfActions.ts:66-67`):

```typescript
issuer: {
  // ...
  customInfo: previewModel?.companyCustomInfo ?? [],
}
```

**Quotation** (`src/domain/quotation/pdfDownloadHandler.ts:77`):

```typescript
companyCustomInfo: previewModel?.companyCustomInfo
```

**Verdict:** Both handlers correctly extract `companyCustomInfo` from preview model and pass it to the adapter.

---

### Layer 8 — industryAdapter.ts ✅

**File:** `src/components/pdf-new/industryAdapter.ts`

**Data type** (line ~52):

```typescript
company: {
  // ...
  customInfo?: Array<{ label: string; value: string }>
}
```

**Adapter pass-through** (line ~196):

```typescript
company: {
  // ...
  customInfo: issuer.customInfo ?? [],
}
```

**Verdict:** Adapter receives `customInfo` and passes it through to `CommercialDocumentData` without transformation.

---

### Layer 9 — CommercialDocumentData Type ✅

**File:** `src/components/pdf-new/industryAdapter.ts` (within `CommercialDocumentData` type)

```typescript
company: {
  // ...
  customInfo?: Array<{ label: string; value: string }>
}
```

**Verdict:** Type is correctly defined.

---

### Layer 10 — CommercialPartyCard Rendering ✅

**File:** `src/components/pdf-new/templates/commercialDocumentBlocks.tsx`

**Extraction** (line 58):

```typescript
const customInfo = 'customInfo' in party ? party.customInfo : []
```

**Rendering** (lines 84-86):

```typescript
{customInfo && customInfo.length > 0 && (
  <div className="...">
    {customInfo.map((item, idx) => (
      <div key={idx}>
        <span className="...">{item.label}:</span>
        <span className="...">{item.value}</span>
      </div>
    ))}
  </div>
)}
```

**Verdict:** Rendering logic is correct. When `customInfo` has items, they render with `label` and `value`. The issue is that `customInfo` is always `[]` due to Layer 4.

---

## Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ CompanySettingsSection.tsx                                   │
│ Form state: [{ title: "Reg No", content: "12345" }]        │
│ Save: JSON.stringify(form.custom_info)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ useSettings.js: saveSettings() → persistSettings()          │
│ Upserts JSON string to settings.custom_info column          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ DATABASE: settings.custom_info                              │
│ Value: '[{"title":"Reg No","content":"12345"}]'             │
│ ✅ Data stored correctly                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ useSettings.js: fetchSettings() → normalizeSettings()       │
│ select('*') loads custom_info as raw string                  │
│ normalizeSettings() does not touch custom_info              │
│ ✅ Data loaded correctly                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ partyProjection.ts: buildCompanyPreviewLines()              │
│ JSON.parse(settings.custom_info) → [{ title, content }]     │
│ .filter(item?.label && item?.value) → []                    │
│ ❌ ALL ITEMS FILTERED OUT (key mismatch: title≠label)       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ previewModel.ts: companyCustomInfo: []                      │
│ ✅ Empty array forwarded correctly                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ PDF Actions: issuer.customInfo: []                          │
│ ✅ Passed correctly to adapter                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ industryAdapter.ts: company.customInfo: []                  │
│ ✅ Passed through correctly                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ CommercialPartyCard: customInfo.length === 0                 │
│ Condition: customInfo.length > 0 → FALSE                    │
│ ❌ Nothing renders                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Verification Commands

| Command | Status |
|---|---|
| `bun run typecheck` | ✅ Passed (no errors) |
| `bun run audit:load` | ✅ Passed (no regressions introduced) |

---

## Fix Options (For Reference — Not Applied Per Audit Scope)

### Option A: Fix the Read Path (partyProjection.ts)

Change the filter to accept `title`/`content`:

```typescript
customInfo = parsed
  .filter((item: any) => (item?.label || item?.title) && (item?.value || item?.content))
  .map((item: any) => ({
    label: String(item.label || item.title),
    value: String(item.value || item.content),
  }))
```

**Pros:** Backward-compatible with existing DB data. No DB migration needed.
**Cons:** Accepts two different schemas.

### Option B: Fix the Write Path (CompanySettingsSection.tsx)

Change `CustomInfoItem` to use `label`/`value`:

```typescript
type CustomInfoItem = {
  label?: string
  value?: string
}
```

And update the form field bindings.

**Pros:** Single canonical schema.
**Cons:** Existing DB data with `title`/`content` becomes orphaned until users re-save.

### Option C: Normalize on Load (normalizeSettings)

Add normalization in `normalizeSettings()` to convert `title`→`label` and `content`→`value`:

```typescript
if (Array.isArray(parsed)) {
  settings.custom_info = JSON.stringify(
    parsed.map(item => ({
      label: item.label || item.title,
      value: item.value || item.content,
    }))
  )
}
```

**Pros:** Handles both old and new data. Single point of normalization.
**Cons:** Adds complexity to the settings loader.

---

## Conclusion

The `custom_info` data contract mismatch between write path (`title`/`content`) and read path (`label`/`value`) is the sole root cause. Every layer downstream of `partyProjection.ts` faithfully propagates an empty array. The `CommercialPartyCard` is not hiding anything — it receives `[]` and correctly renders nothing.

Both invoice and quotation pipelines are equally affected because they share `buildCompanyPreviewLines()`.

---

*Audit performed 2026-06-25. All evidence sourced from `bigdrops-app` codebase at commit HEAD.*
