# Sequence Generator Audit

> Read-only audit. No assumptions, no code changes. Report of exactly what exists.

---

## 1. `getNextInvoiceNumber`

**File:** `src/domain/documentConversion.ts` (lines 8–23)

### Signature

```ts
function getNextInvoiceNumber(
  rows: Array<{ invoice_number?: string | null }>,
  prefix: string = 'SASINV-B',
): string
```

### Prefix origin

Hardcoded as the **default parameter value** `'SASINV-B'`. The caller never overrides it.

### Return format

```
SASINV-B001
```

Increments the trailing 3-digit numeric segment. Filters rows that `.startsWith(prefix)` (case-insensitive), extracts the trailing digits via `/(\d+)$/`, takes the max, adds 1, pads to 3 digits.

### Call sites

| File | Line | Arguments passed |
|---|---|---|
| `src/pages/viewQuotationActions.ts` | 161 | `(invoiceRows as Array<{ invoice_number?: string | null }>)` — **no second argument**, so `prefix` defaults to `'SASINV-B'` |

### Accepts dynamic prefix without internal changes?

**Yes.** The prefix is a parameter with a default. Callers can pass any prefix as the second argument.

### Noteworthy

- `getNextInvoiceNumber` is **never** called from `NewInvoice.tsx` or `Invoices.tsx`. Those files have their **own inline, duplicated logic** that hardcodes `'SASINV-B'` inside the effect/function body:
  - `NewInvoice.tsx:231` — inline parsing of `'SASINV-B'` and `padStart(3, '0')`
  - `Invoices.tsx:100-107` — inline parsing of `'SASINV-B'` and `padStart(3, '0')`

---

## 2. `getNextQuotationNumber`

**File:** `src/domain/quotation/normalize.ts` (lines 29–43)

### Signature

```ts
function getNextQuotationNumber(
  rows: Array<Pick<DbQuotation, 'quotation_number'>>,
  prefix: string = 'SASIQUO',
): string
```

### Prefix origin

Hardcoded as the **default parameter value** `'SASIQUO'`. The caller never overrides it.

### Return format

```
SASIQUO-001
```

Filters rows that `.startsWith(\`${prefix}-\`)`, extracts the trailing digits via `/-(\d+)$/`, takes the max, adds 1, pads to 3 digits.

### Call sites

| File | Line | Arguments passed |
|---|---|---|
| `src/pages/viewQuotationActions.ts` | 86 | `(quotationRows as Array<{ quotation_number?: string | null }>)` — **no second argument** |
| `src/pages/viewRFQActions.ts` | 61 | `(quotationRows as Array<{ quotation_number?: string | null }>)` — **no second argument** |
| `src/pages/viewBOQActions.ts` | 61 | `(quotationRows as Array<{ quotation_number?: string | null }>)` — **no second argument** |
| `src/modules/invoices/services/invoiceConversionService.ts` | 22 | `(quotationRows as Array<{ quotation_number?: string | null }>)` — **no second argument** |
| `src/modules/quotations/services/quotationService.ts` | 78 | `(quotationRows as Array<{ quotation_number?: string | null }>)` — **no second argument** |

### Accepts dynamic prefix without internal changes?

**Yes.** Same pattern — the prefix is a parameter with a default. Callers can override it.

### Noteworthy

- The prefix `'SASIQUO'` uses **no hyphen** between prefix and number (it's `SASIQUO-001` where the dash is hardcoded in the template string `\`${prefix}-${...}\``). If a caller passed `'SASIQUO-'` as prefix, the result would be `SASIQUO--001`.
- The offline file has a different format: `SASQUO-{deviceCode}{seq}` (see section 7).

---

## 3. `getNextRfqNumber`

**File:** `src/domain/rfq/normalize.ts` (lines 131–145)

### Signature

```ts
function getNextRfqNumber(
  rows: Array<{ rfq_number: string }>,
  prefix: string = 'RFQ',
): string
```

### Prefix origin

Hardcoded as the **default parameter value** `'RFQ'`. Callers never override it.

### Return format

```
RFQ-001
```

Same logic pattern as `getNextQuotationNumber` — filters `.startsWith(\`${prefix}-\`)`, extracts trailing digits via `/-(\d+)$/`, max + 1, padStart(3).

### Call sites

| File | Line | Arguments passed |
|---|---|---|
| `src/pages/NewRfq.tsx` | 20 | `(existingRfqs || [])` — **no second argument** |

### Accepts dynamic prefix without internal changes?

**Yes.** Same pattern — parameter with a default.

---

## 4. `getNextCsrNumber`

**File:** `src/components/csr/csrUtils.ts` (lines 165–183)

### Signature

```ts
function getNextCsrNumber(
  lastValue: string | null | undefined,
): string
```

### Prefix origin

**Hardcoded inside the function body** — no parameter for prefix. The literal `'CSR-001'` is returned as the fallback when `lastValue` is falsy.

The function does NOT use a prefix-based filter. Instead:
1. If `lastValue` has trailing digits (e.g. `CSR-001`), it increments the numeric portion in-place, preserving the prefix portion before the digits.
2. If `lastValue` has trailing letters (e.g. `CSR-A`), it calls `incrementTrailingLetters()`.
3. Otherwise returns `\`${lastValue}-1\``.

### Return format

Depends on the last value passed in. Examples:
- `''` → `CSR-001`
- `'CSR-001'` → `CSR-002`
- `'CSR-009'` → `CSR-010`
- `'CSR-Z'` → `CSR-AA`
- `'FOO-001'` → `FOO-002`

### Call sites

| File | Line | Arguments passed |
|---|---|---|
| `src/pages/NewCSR.tsx` | 86 | `(latestNumber)` — where `latestNumber` is `latestRows?.[0]?.csr_number || ''` |

### Accepts dynamic prefix without internal changes?

**No.** The function has **no prefix parameter**. It extracts whatever prefix exists from the `lastValue` string by chopping off the trailing digits/letters. Any prefix that exists in the last CSR number will be preserved, but there is no way to constrain it to a specific prefix. The fallback `'CSR-001'` is hardcoded.

### Noteworthy

- The offline format is completely different: `SASCSR-{deviceCode}{seq}` (see section 7).
- `getNextCsrNumber` is never used by the offline CSR module.

---

## 5. `generateWaybillSequenceNumber`

**File:** `src/components/waybill/waybillUtils.ts` (lines 453–461)

### Signature

```ts
function generateWaybillSequenceNumber(
  type: WaybillType,   // 'internal' | 'external'
  existingNumbers: string[],
): string
```

### Prefix origin

**Hardcoded inside the function body** — `'AWB-I-'` for internal, `'AWB-E-'` for external. No parameter.

### Return format

```
AWB-E-0001
AWB-I-0001
```

Filters `existingNumbers` that `.startsWith(prefix)`, parses the suffix by slicing off the prefix length, finds max, adds 1, pads to 4 digits.

### Call sites

| File | Line | Arguments passed |
|---|---|---|
| `src/pages/NewWaybill.tsx` | 31 | `(type, existingNumbers)` — `type` from React state, `existingNumbers` from Supabase query |

### Accepts dynamic prefix without internal changes?

**No.** The prefix is derived from the `type` parameter via a hardcoded map inside the function. There's no prefix parameter. To change the prefix, the function internals must be modified.

---

## 6. `getNextWaybillNumber`

**File:** `src/components/waybill/waybillUtils.ts` (lines 463–471)

### Signature

```ts
function getNextWaybillNumber(
  type: WaybillType,   // 'internal' | 'external'
  existingNumbers: string[],
): string
```

### Prefix origin

**Hardcoded inside the function body** — identical logic to `generateWaybillSequenceNumber`. `'AWB-I-'` or `'AWB-E-'`.

### Return format

```
AWB-E-0001
AWB-I-0001
```

Identical implementation to `generateWaybillSequenceNumber` (exact copy).

### Call sites

| File | Line | Arguments passed |
|---|---|---|
| `src/domain/waybill/waybillMutations.ts` | 39 | `(waybill.type || 'external', existingNumbers)` |
| `src/pages/NewWaybill.tsx` | 49 | `(blankType, existingNumbers)` |

### Accepts dynamic prefix without internal changes?

**No.** Same design as `generateWaybillSequenceNumber`. The prefix is derived from `type` via a hardcoded internal map.

### Noteworthy

- `generateWaybillSequenceNumber` and `getNextWaybillNumber` are **exact duplicates** — same implementation, same logic, same return format. `getNextWaybillNumber` is reused by `waybillMutations.ts`; `generateWaybillSequenceNumber` seems to be used only for the preview/UI generation in `NewWaybill.tsx`.

---

## 7. `generateNextProjectCode`

**File:** `src/domain/projects.ts` (lines 183–206)

### Signature

```ts
async function generateNextProjectCode(
  supabaseClient: {
    from: (table: string) => {
      select: (columns: string) => {
        ilike: (column: string, pattern: string) => Promise<{
          data?: Array<{ project_code?: string | null }>
          error?: { message?: string } | null
        }>
      }
    }
  },
  date: Date = new Date(),
): string
```

### Prefix origin

Generated by helper `getProjectCodePrefix(date)` (line 66–68):

```ts
function getProjectCodePrefix(date = new Date()) {
  return `PRJ-${date.getFullYear()}-`
}
```

The prefix is `PRJ-{year}-`, derived from the current year. The caller passes `date` (defaults to current date).

### Return format

```
PRJ-2026-001
```

Queries DB via `.ilike('project_code', \`${prefix}%\`)`, then `extractProjectCodeSequence()` strips the prefix and parses the remainder as an integer, finds max, adds 1, pads to 3 digits.

### Call sites

| File | Line | Arguments passed |
|---|---|---|
| `src/domain/projects.ts` | 229 | `(supabaseClient)` — **no second argument**, so `date` defaults to `new Date()` |

This call is from inside `createProjectWithGeneratedCode` in the same file.

### Accepts dynamic prefix without internal changes?

**Partial.** The prefix is generated by `getProjectCodePrefix(date)` inside the function. The date parameter can be overridden, but the prefix format `PRJ-{year}-` itself is not parameterizable without modifying `getProjectCodePrefix()`.

---

## 8. Offline CSR Sequence — `formatCsrNumber` (private)

**File:** `src/lib/native/csrOffline.ts` (lines 74–76)

### Signature

```ts
function formatCsrNumber(
  deviceCode: string,
  nextSequence: number,
): string
```

### Prefix origin

**Hardcoded inside the function body** — `'SASCSR-'` concatenated with `deviceCode`.

### Return format

```
SASCSR-{deviceCode}{seq}
```

Example: `SASCSR-XX001`, where `XX` is the 2-letter device code and `001` is the 3-digit sequence.

### Call sites (internal only)

Called from within `csrOffline.ts`:
- `peekNextOfflineCsrNumber()` at line 190
- `createOfflineCsrDraft()` at line 218

Both pass the device code from `getAssignedDeviceCode()` and the next sequence from the counter.

### Accepts dynamic prefix without internal changes?

**No.** The prefix `'SASCSR-'` is hardcoded. The `deviceCode` is the only variable portion, and it comes from the device assignment system, not from a caller parameter.

### Full file scope

The file is **not limited to number formatting**. It also:
- Bootstraps a local SQLite table `csrs_local` (`bootstrapCsrOffline()`)
- Creates offline CSR drafts by inserting into SQLite (`createOfflineCsrDraft()`)
- Maintains persistent sequence counters via `getAppMetaValue`/`setAppMetaValue`
- Enqueues sync queue items for later upload
- Validates offline access window and device assignment
- Uses `navigator.onLine` to enforce offline-only creation

---

## 9. Offline Quotation Sequence — `formatQuotationNumber` (private)

**File:** `src/lib/native/quotationOffline.ts` (lines 64–66)

### Signature

```ts
function formatQuotationNumber(
  deviceCode: string,
  nextSequence: number,
): string
```

### Prefix origin

**Hardcoded inside the function body** — `'SASQUO-'` concatenated with `deviceCode`.

### Return format

```
SASQUO-{deviceCode}{seq}
```

Example: `SASQUO-XX001`, where `XX` is the 2-letter device code and `001` is the 3-digit sequence.

### Call sites (internal only)

Called from within `quotationOffline.ts`:
- `peekNextOfflineQuotationNumber()` at line 173
- `createOfflineQuotationDraft()` at line 201

### Accepts dynamic prefix without internal changes?

**No.** Same design as `csrOffline.ts` — `'SASQUO-'` is hardcoded.

### Full file scope

The file is **not limited to number formatting**. It also:
- Bootstraps a local SQLite table `quotations_local` (`bootstrapQuotationOffline()`)
- Creates offline quotation drafts by inserting into SQLite (`createOfflineQuotationDraft()`)
- Maintains persistent sequence counters
- Enqueues sync queue items for later upload
- Validates offline access window and device assignment

---

## Summary Table

| # | Function | Prefix source | Dynamic prefix? | # call sites | Format |
|---|---|---|---|---|---|
| 1 | `getNextInvoiceNumber` | Default param `'SASINV-B'` | Yes | 1 | `SASINV-B001` |
| 2 | `getNextQuotationNumber` | Default param `'SASIQUO'` | Yes | 5 | `SASIQUO-001` |
| 3 | `getNextRfqNumber` | Default param `'RFQ'` | Yes | 1 | `RFQ-001` |
| 4 | `getNextCsrNumber` | Hardcoded fallback `'CSR-001'` | No | 1 | dynamic (preserves input prefix) |
| 5 | `generateWaybillSequenceNumber` | Hardcoded `'AWB-I-'` / `'AWB-E-'` | No | 1 | `AWB-E-0001` |
| 6 | `getNextWaybillNumber` | Hardcoded `'AWB-I-'` / `'AWB-E-'` | No | 2 | `AWB-E-0001` |
| 7 | `generateNextProjectCode` | Helper `getProjectCodePrefix()` → `PRJ-{year}-` | Partial (year only) | 1 | `PRJ-2026-001` |
| 8 | `formatCsrNumber` (private) | Hardcoded `'SASCSR-'` | No | 2 internal | `SASCSR-XX001` |
| 9 | `formatQuotationNumber` (private) | Hardcoded `'SASQUO-'` | No | 2 internal | `SASQUO-XX001` |

### Duplicate / Inline Concerns

- `getNextInvoiceNumber` is **not used** by `NewInvoice.tsx` or `Invoices.tsx` — both have their own inline copy of the logic with `'SASINV-B'` hardcoded.
- `generateWaybillSequenceNumber` and `getNextWaybillNumber` are **identical duplicate functions** in the same file.
- Offline prefixes (`SASCSR-`, `SASQUO-`) differ from online prefixes (`CSR`, `SASIQUO`), and the two systems are completely disconnected.
