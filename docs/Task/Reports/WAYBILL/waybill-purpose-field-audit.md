# Waybill `purpose` Field — Audit Report

> Read-only investigation. Saved 2026-06-20.

---

## Question 1 — Exact type definition and option values

### Type definition

`src/components/waybill/waybillUtils.ts` **line 17**:

```ts
export type WaybillPurpose = 'Supply' | 'Return' | 'Third-Party Custody'
```

The `Waybill` interface field at **line 89**:

```ts
purpose: WaybillPurpose | ''
```

Three-way union plus empty string; not an enum.

### Option list

`src/components/waybill/waybillUtils.ts` **lines 135–139**:

```ts
export const PURPOSE_OPTIONS: { value: WaybillPurpose; label: string }[] = [
  { value: 'Supply', label: 'Supply' },
  { value: 'Return', label: 'Return' },
  { value: 'Third-Party Custody', label: 'Third-Party Custody' },
]
```

Values and labels are identical. There is **no separate display-label vs internal-value distinction** in the list.

### Normalizer

`src/components/waybill/waybillUtils.ts` **lines 467–473**:

```ts
export function normalizeWaybillPurpose(value: unknown): WaybillPurpose | '' {
  const purpose = String(value || '').trim()
  if (purpose === 'Supply' || purpose === 'Return' || purpose === 'Third-Party Custody') {
    return purpose
  }
  return ''
}
```

Rejects unknown values by silently mapping them to `''`.

### Validation

`src/components/waybill/waybillUtils.ts` **line 486**:

```ts
if (waybill.type === 'external' && !waybill.purpose) errors.push('Purpose is required for external waybills')
```

Only validated for external waybills. No error for internal.

### All files that reference `WaybillPurpose` or `PURPOSE_OPTIONS`

| # | File | What it does |
|---|---|---|
| 1 | `src/components/waybill/waybillUtils.ts` | Defines the type (`:17`), option list (`:135`), field on `Waybill` interface (`:89`), `normalizeWaybillPurpose()` (`:467`), `validateWaybill()` check (`:486`), `mapDbWaybill()` passthrough (`:320`), `createDefaultWaybill()` default `''` (`:350`) |
| 2 | `src/components/waybill/WaybillPDF.tsx` | Line 123: `purpose: mapped.purpose` — passed to minimal template. Classic template itself does NOT render purpose. |
| 3 | `src/components/waybill/blankWaybillTemplate.tsx` | Lines 58–60: three boolean vars mapping purpose to checkbox state. Lines 140–157: checkbox UI gated on `type === 'external'`. |
| 4 | `src/domain/waybill/waybillMutations.ts` | Line 52: save-time defaulting logic (`waybill.purpose \|\| 'Supply'`). Serves as the de facto setter. |
| 5 | `supabase/migrations/20260611000000_waybill_schema_final.sql` | DB column ADD (`purpose text`, line 21) + CHECK constraint `check_waybill_purpose_conditional` (lines 65–67) |

No other files reference the type or the options list.

---

## Question 2 — Where does the checked checkbox state come from?

### Minimal template checkbox rendering

`src/components/waybill/blankWaybillTemplate.tsx` **lines 58–60** (state derivation):

```ts
const isTransfer = purpose === 'Supply'
const isMaint = purpose === 'Return'
const isReasonOther = purpose === 'Third-Party Custody'
```

These booleans map to checkboxes with **different display labels** than the purpose values:

| `purpose` value | Display label in template | Boolean variable |
|---|---|---|
| `'Supply'` | `Transfer` | `isTransfer` |
| `'Return'` | `Maint.` | `isMaint` |
| `'Third-Party Custody'` | `Other` | `isReasonOther` |

The section is gated on `type === 'external'` (**line 140**: `{type === 'external' ? ( ... ) : null}`). Internal waybills never show the "Delivery Reason" row.

### Classic template — absence

`src/components/waybill/WaybillPDF.tsx` passes `purpose: mapped.purpose` to the minimal template at **line 123** but the classic template's own `metaGrid` (lines 175–191) has **no purpose entry at all**. Classic PDF simply never renders purpose.

### Data flow: how `purpose` gets set on a waybill

There is exactly **one** code path that writes `purpose` to the database:

**`src/domain/waybill/waybillMutations.ts` line 52:**

```ts
const purpose = waybill.type === 'internal' ? null : (waybill.purpose || 'Supply')
```

- **Internal**: always stored as `null` (enforced by DB CHECK constraint).
- **External**: uses `waybill.purpose` if truthy, otherwise falls back to `'Supply'`.

Three possible sources for `waybill.purpose` at save time:

1. **Form input** — `WaybillForm.tsx` has **no purpose field** anywhere. Confirmed zero matches for `purpose` in `WaybillForm.tsx`.
2. **JSON import** — Neither `externalWaybillImportAdapter.ts` (lines 92–103) nor `internalWaybillImportAdapter.ts` (lines 92–101) maps `purpose` in their `fields` output. Neither Zod schema includes `purpose`. Both AI prompts (`externalWaybillPrompt.ts` line 9, `internalWaybillPrompt.ts` line 8) explicitly instruct: *"Do not extract signatures, party notes, purpose, or client identity."*
3. **Default** — `createDefaultWaybill()` at `waybillUtils.ts` line 350 sets `purpose: ''`.

### Conclusion

**Every external waybill prints with "Transfer" (Supply) checked** and there is no current code path that would result in "Maint." (Return) or "Other" (Third-Party Custody) being checked:

- The default initial value is `''` (empty).
- `normalizeWaybillPurpose('')` returns `''`.
- At save time, `waybill.purpose || 'Supply'` resolves to `'Supply'` because `''` is falsy.
- The minimal template maps `'Supply'` → `isTransfer = true` → the **"Transfer"** checkbox is checked.

The DB column always ends up as either `'Supply'` (external) or `null` (internal). No waybill in the system can currently have `'Return'` or `'Third-Party Custody'` as its stored purpose.
