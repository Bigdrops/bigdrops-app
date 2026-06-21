# Waybill Render Engine — Phase 1

**Date:** 2026-06-21
**Scope:** Foundation types, blank normalizer, and all 6 section resolvers
**Status:** Complete — no pending items

---

## Files Created

```
src/domain/waybill/engine/
├── types.ts                  # All output interfaces + RawWaybill + CompanySettings
├── normalizeBlank.ts         # null/undefined/""/NaN → ""
├── resolvers/
│   ├── branding.ts           # resolveBranding(company) → BrandingBlock
│   ├── header.ts             # resolveHeader(waybill) → HeaderBlock
│   ├── parties.ts            # resolveParties(waybill) → PartiesBlock
│   ├── logistics.ts          # resolveLogistics(waybill) → LogisticsBlock
│   ├── notes.ts              # resolveNotes(rawNotes) → plain text via richTextToPlainText
│   ├── signatures.ts         # resolveSignatures(waybill) → SignatureBlock
│   └── index.ts              # Re-exports all 6 resolvers
└── index.ts                  # Re-exports types + resolvers
```

## Interfaces (types.ts)

| Interface | Fields |
|---|---|
| `RawWaybill` | waybill_number, type, date, time?, po_number?, client_name?, sender_name?, receiver_name?, vehicle_plate?, driver_name?, transport_mode?, delivery_location?, purpose?, notes?, custom_fields? |
| `CompanySettings` | name, tagline?, logo?, address?, phone?, email? |
| `BrandingBlock` | name, tagline, logo, address, phone, email |
| `HeaderBlock` | type, waybillNumber, date, time, poNumber |
| `PartiesBlock` | clientName, senderName, receiverName |
| `LogisticsBlock` | vehiclePlate, driverName, deliveryMode, deliveryLocation, purpose |
| `SignatureBlock` | sender, receiver (both NormalizedSignature\|null) |
| `NormalizedSignature` | url, width(110), height(42) |
| `FooterBlock` | waybillNumber, companyName |
| `PaginationPolicy` | repeatTableHeader, keepSignatureTogether, keepNotesTogether |
| `TableBlock` | columns(PrintColumn[]), rows(PrintRow[]) |
| `WaybillRenderInput` | waybill, columns, company |
| `WaybillRenderModel` | branding, header, parties, logistics, notes, signatures, footer, pagination, table |

## Resolver Details

- **branding.ts:** `name` falls back to `""` (required); all other fields use `normalizeBlank`
- **header.ts:** `type` and `waybillNumber` and `date` pass through directly; `time` and `poNumber` use `normalizeBlank`
- **parties.ts:** All 3 fields use `normalizeBlank`
- **logistics.ts:** All 5 fields use `normalizeBlank` — purpose handled for both internal/external
- **notes.ts:** Pipeline: `richTextToPlainText(normalizeBlank(rawNotes))` — reuses existing `richTextToPlainText` from `@/components/pdf-new/core/richText`, no new HTML stripper created
- **signatures.ts:** Reads from `waybill.custom_fields?.signatures`; valid if `image_url` or `drawn_data_url` exists; no names or signing dates; missing signatures → null

## Verification

- `bun run typecheck` — **PASSED** (zero errors)
- `bun run lint` on engine files — **PASSED** (zero errors)

## Files Modified

None outside `src/domain/waybill/engine/`.
