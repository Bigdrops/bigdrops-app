# Audit: Commercial Template — Company & Client Information Rendering Pipeline

**Date:** 2026-06-26  
**Auditor:** AI Agent  
**Scope:** Full data pipeline from database → preview projections → PDF model → adapter → template renderer for Company (issuer) and Client (recipient) information.

---

## Pipeline Overview

```
DB Tables (settings, clients, invoices/quotations)
  │
  ▼
Projection Functions (partyProjection.ts)
  │  buildCompanyPreviewLines(settings) → string[]
  │  buildClientPreviewLines(client) → string[]
  │
  ▼
PDF Model Construction (invoicePdfActions.ts / pdfDownloadHandler.ts)
  │  issuer.addressLines = companyPreviewLines  ← flat labeled strings
  │  recipient.addressLines = clientPreviewLines ← flat labeled strings
  │
  ▼
Adapter (industryAdapter.ts)
  │  splitAddressLines(lines) → { address: lines[0], cityState: rest.join(', ') }
  │
  ▼
Template Renderer (Industry.tsx + commercialDocumentBlocks.tsx)
  │  CommercialPartyCard renders: name, address, cityState, phone, email
```

---

## Critical Bug #1: Client Address Shows "Attn: …" as Street Address

**Severity:** High  
**Files:** `src/domain/invoice/projections/partyProjection.ts:46-53`, `src/components/pdf-new/industryAdapter.ts:134-139`

`buildClientPreviewLines()` returns this array:
```
["Attn: John Doe", "456 Client St", "Abuja, FCT", "+234700000000", "client@test.com"]
```

This entire array is passed as `addressLines` into `PdfParty`. Then `splitAddressLines()` takes:
- `address = lines[0]` → `"Attn: John Doe"` ← **BUG: not a street address**
- `cityState = lines.slice(1).join(', ')` → `"456 Client St, Abuja, FCT, +234700000000, client@test.com"` ← **BUG: contains phone, email**

**Result:** On the PDF, the client address field displays "Attn: John Doe" as the street address, and the city/state line contains the real address plus phone and email.

---

## Critical Bug #2: Company City/State Polluted with VAT, Phone, Email Labels

**Severity:** High  
**Files:** `src/domain/invoice/projections/partyProjection.ts:36-43`, `src/components/pdf-new/industryAdapter.ts:134-139`

`buildCompanyPreviewLines()` returns this array:
```
["123 Main St", "Lagos, Lagos", "VAT Number: 123456", "Phone: +234...", "Email: a@b.com"]
```

After `splitAddressLines()`:
- `address = lines[0]` → `"123 Main St"` (correct, but city/state lost)
- `cityState = lines.slice(1).join(', ')` → `"Lagos, Lagos, VAT Number: 123456, Phone: +234..., Email: a@b.com"` ← **BUG: polluted**

**Result:** The PDF city/state area shows "Lagos, Lagos, VAT Number: 123456, Phone: +234..., Email: a@b.com". Phone and email are also rendered in dedicated lines, so they appear twice.

---

## Root Cause

The projection functions (`buildCompanyPreviewLines`, `buildClientPreviewLines`) were originally designed for the **React preview UI** (which renders them as a vertical list of labeled lines). They treat address-like data + metadata as a flat labeled string array.

The PDF pipeline reuses these same projection functions — but then feeds the output into `PdfParty.addressLines`, a field whose semantic meaning is "an array of address lines only." The adapter's `splitAddressLines()` then naïvely splits on `[0]` vs `[1..n]`, producing incorrect splits.

---

## Issue #3: `PdfParty.attention` Is Never Rendered

**Severity:** Medium  
**Files:** `src/components/pdf-new/templates/commercialDocumentBlocks.tsx:46-95`

The `PdfParty` type includes an `attention` field (`src/components/pdf-new/types.ts:28`), and both invoice and quotation PDF handlers populate it:

```typescript
// invoicePdfActions.ts:118
recipient: { attention: String(client?.contact_person || ""), ... }
```

But `CommercialPartyCard` never reads or renders `party.attention`. The contact person information is silently dropped.

---

## Issue #4: Client `taxId` Is Never Passed to PDF Model

**Severity:** Low  
**File:** `src/components/document-view/invoice/invoicePdfActions.ts:108-123`

The `PdfParty` type has a `taxId` field, and it's populated for the issuer (company): `taxId: String(settingsData?.company_vat || "")`. But for the recipient (client), `taxId` is never set. Client TIN/VAT information is not available on the PDF.

Note: `ClientLike` also has no `tax_id` / `taxId` field (`renderTypes.ts:81-88`), so the data isn't even available at the source.

---

## Issue #5: `addressLines` Conceptual Misuse

**Severity:** Medium  
**Files:** `src/domain/invoice/projections/partyProjection.ts:36-53`, `src/components/document-view/invoice/invoicePdfActions.ts:108-123`

The `addressLines` field contains non-address data:
- Company: "VAT Number: …", "Phone: …", "Email: …"
- Client: "Attn: …", phone, email

These are presentation-formatted strings with labels. They belong in separate typed fields — not in an address array.

---

## Issue #6: Duplicate Phone/Email in Both Structured Fields and Address Array

**Severity:** Low  
**File:** `src/components/document-view/invoice/invoicePdfActions.ts:108-123`

`phone` and `email` are set as both:
1. Top-level fields on `PdfParty` (correctly read by the template)
2. Labeled strings within `addressLines` (pollute `cityState` rendering)

This causes phone/email to appear in the `cityState` position on the PDF while also appearing in their correct positions.

---

## Architectural Observations

| Aspect | Finding |
|--------|---------|
| **Data coupling** | Preview and PDF pipelines share projection functions. A change to preview formatting can silently break PDF rendering. |
| **Type unsafety** | `BuildInvoicePreviewModelInput` uses `any` for many fields (`invoice`, `customFieldObject`). `buildInvoicePreviewModel` returns `{ ... }` without a typed return. |
| **Projection re-use** | `partyProjection.ts` returns `string[]` but this same type serves two different purposes (preview list vs PDF addressLines). |
| **Adapter responsibility** | `industryAdapter.ts` tries to fix structural issues (e.g., `splitAddressLines`) but cannot recover information already lost by the flat string array format. |
| **Template ignorance** | `CommercialPartyCard` receives a flat object and has no way to know whether `address` contains a real address or an "Attn:" prefix. |

---

## Recommendations

1. **Decouple PDF address lines from preview projections.** Create dedicated address builders for the PDF pipeline that return structured, unlabeled address arrays. The preview projections should only be used for the on-screen preview.

2. **Fix `buildClientPreviewLines`** to return a clean address array without the "Attn:" prefix, or pass `attention` separately.

3. **Fix `buildCompanyPreviewLines`** to exclude "VAT Number: …", "Phone: …", "Email: …" labeled strings from the address array. These are already passed as separate typed fields.

4. **Render `attention` in `CommercialPartyCard`** below the name or as a subtitle.

5. **Consider adding `tax_id` to `ClientLike`** and passing it through to the PDF model.

6. **Type the return of `buildInvoicePreviewModel`** to prevent silent interface mismatches.
