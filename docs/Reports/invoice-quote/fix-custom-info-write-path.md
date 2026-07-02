# fix-custom-info-write-path — Implementation Report

## What Changed

Three files modified, zero new files created.

### 1. `src/domain/invoice/normalize.ts` — Normalization Helper

Added `normalizeCompanyCustomInfo()` (exported).

**Input:** `string | null | undefined` (raw JSON text from Supabase `settings.custom_info` column).

**Output:** `Array<{ label: string; value: string }>` — always the canonical shape.

**Behavior:**
- Returns `[]` for null, undefined, empty string, whitespace-only string, or non-array parsed value.
- Tries `JSON.parse`, catches malformed JSON silently.
- For each item in the array:
  - If item has `label` and `value` → kept as-is (canonical path).
  - If item has `title` and/or `content` → mapped to `{ label: title, value: content }` (legacy compatibility).
  - Items with neither valid pair are discarded.
- Never throws. Always returns a valid array.

**Placement rationale:** `src/domain/invoice/normalize.ts` is already the domain normalization module. It is shared by both invoice and quotation pipelines (via `partyProjection.ts`). The helper belongs here because it bridges data contracts between the settings layer and the PDF pipeline, which is a domain normalization concern.

### 2. `src/domain/invoice/projections/partyProjection.ts` — Projection Cleanup

**Before (lines 50-62):** Inline JSON.parse + filter + map that silently discarded all entries because it looked for `label`/`value` keys that never existed in the DB.

**After:** Single call:
```ts
const customInfo = normalizeCompanyCustomInfo(settings?.custom_info);
```

Removed 12 lines of inline logic. Added `normalizeCompanyCustomInfo` to the existing import from `./normalize`.

### 3. `src/pages/settings/CompanySettingsSection.tsx` — Settings Form Alignment

This is the **write boundary** — the component that serializes `custom_info` back to the DB when the user saves.

**Type change:**
```ts
// Before
type CustomInfoItem = { title?: string; content?: string };
// After
type CustomInfoItem = { label?: string; value?: string };
```

**Form bindings (lines 677-693):**
```tsx
// Before
placeholder="Field Title" value={item.title} onChange={e => updateCI(i, 'title', e.target.value)}
placeholder="Field Content" value={item.content} onChange={e => updateCI(i, 'content', e.target.value)}
// After
placeholder="Field Label" value={item.label} onChange={e => updateCI(i, 'label', e.target.value)}
placeholder="Field Value" value={item.value} onChange={e => updateCI(i, 'value', e.target.value)}
```

**Summary view (line 697):**
```tsx
// Before
{item.title || 'Untitled'}: {item.content || '—'}
// After
{item.label || 'Untitled'}: {item.value || '—'}
```

**Save filter (lines 331-334):**
```ts
// Before
.filter((ci: { title?: string; content?: string }) => ci.title || ci.content)
// After
.filter((ci: CustomInfoItem) => ci.label || ci.value)
```

**Add handler (line 517):**
```ts
// Before
setCustomInfo((prev: any[]) => [...prev, { title: '', content: '' }]);
// After
setCustomInfo((prev: any[]) => [...prev, { label: '', value: '' }]);
```

**Load/cancel normalization (lines 320, 510):**
```ts
// Before: manual parse
if (raw) { try { setCustomInfo(typeof raw === 'string' ? JSON.parse(raw) : raw); } catch { /*...*/ } }
// After: uses normalizer
setCustomInfo(normalizeCompanyCustomInfo(raw));
```

## Why It Works

The mismatch was at the settings form's serialize path. Before the fix:

| Layer | Shape | Status |
|---|---|---|
| **CompanySettingsSection (save)** | `{ title, content }` | **MISMATCH** |
| DB column | `text DEFAULT '[]'` | Stores whatever JSON string is written |
| **partyProjection (load)** | `{ label, value }` | **All entries silently discarded** |
| previewModel | `{ label, value }` | Empty array (faithful propagation) |
| PDF adapter | `{ label, value }` | Empty array |
| CommercialPartyCard | `{ label, value }` | Empty array — never renders anything |

After the fix:

| Layer | Shape | Status |
|---|---|---|
| **CompanySettingsSection (save)** | `{ label, value }` | **MATCH** |
| DB column | `text DEFAULT '[]'` | Now stores `{ label, value }` JSON |
| **partyProjection (load)** | `{ label, value }` | Entries survive the filter |
| All downstream | `{ label, value }` | Rendered on PDF |

Legacy data already in the DB (`{ title, content }`) is handled by `normalizeCompanyCustomInfo()`, which falls back to reading those keys. So existing settings display correctly in the form, and existing PDFs render correctly without requiring users to re-save.

## Verification

| Command | Result |
|---|---|
| `bun run audit:load` | Passed — no new regressions |
| `bun run typecheck` | Passed — clean, zero errors |
| `bun run build` | Passed — Vite build succeeded |

## Manual Test Steps

1. Open Company Settings in the app.
2. Add at least two custom info rows (e.g., "Registration No." / "RC12345" and "Tax ID." / "12345678").
3. Click Save.
4. Refresh the page — verify both rows appear with correct labels and values (not "Untitled: —").
5. Create an Invoice → Generate PDF → confirm both custom info rows appear on the commercial document.
6. Create a Quotation → Generate PDF → confirm both custom info rows appear.
7. Test edge cases: empty label, empty value, mixed valid/invalid entries, legacy data in DB.

## Risk Assessment

**No schema changes.** The DB column type and shape are unchanged.

**Backward compatible.** Legacy `{ title, content }` data is handled by the normalizer. No migration needed.

**No breaking changes to downstream.** All PDF consumers already expected `{ label, value }` — they were just receiving empty arrays.

**Low blast radius.** Only three files changed. The normalizer is a pure function with no side effects.

## Cleanup TODO

Inside `normalizeCompanyCustomInfo()`, a TODO comment marks the temporary nature of the legacy `{ title, content }` → `{ label, value }` mapping. Once all persisted `custom_info` rows in production have been re-saved through the updated settings form, this compatibility code can be removed.
