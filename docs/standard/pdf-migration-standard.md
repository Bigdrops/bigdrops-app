# PDF Migration Standard

## Purpose

This standard defines the mandatory PDF infrastructure for all document families. Every document PDF pipeline MUST route through `DefaultPdfGenerator` + `CompositePdfDelivery` + `DefaultFeedbackBus`. No document family may maintain its own standalone download orchestration.

## Architecture

### Mandatory Pipeline

```
Document model
    ↓
DefaultPdfGenerator (generates blob from React element)
    ↓
PdfAsset
    ↓
CompositePdfDelivery → WebPdfDelivery (browser download)
                     → NativePdfDelivery (capacitor filesystem write)
    ↓
DefaultFeedbackBus (emits 'downloaded' / 'failed' events)
```

### Delegation Rules

- `DefaultPdfGenerator` owns PDF blob creation via `@react-pdf/renderer`
- `CompositePdfDelivery` delegates to `WebPdfDelivery` or `NativePdfDelivery` based on `isNativePlatform()`
- `DefaultFeedbackBus` is ephemeral — instantiated per download, emits and discards

## Document Type Registry

The canonical `PdfDocumentType` union in `src/lib/pdf/types.ts` must include every PDF-generating document family:

```
'invoice' | 'quotation' | 'csr' | 'waybill' | 'boq' | 'rfq' | 'receipt'
```

## Migration Principles

Every document family MUST:

- Preserve existing public APIs (page components, navigation)
- Preserve rendering output (PDF visual layout unchanged)
- Preserve filenames (pattern: `{prefix}-{documentNumber}.pdf`)
- Preserve download behavior (click → file available)
- Preserve preview behavior (HTML view on page)
- Preserve business calculations (none in PDF layer)
- Preserve template structure (existing PDF components reused)
- Only orchestration changes — the `handleDownload` callback

## Allowed Changes

- Replace standalone `downloadPdfFromElement` with DefaultPdfGenerator + CompositePdfDelivery
- Remove duplicated orchestration
- Inject PdfGenerator, PdfDelivery, FeedbackBus
- Add document type to `PdfDocumentType` union

## Forbidden Changes

- Template redesign (existing PDF components unchanged)
- Business logic
- Calculations
- Preview models
- Render styling
- PDF filenames
- Native storage behavior
- Download UX
- Database logic
- Public page component API

## Verification Checklist

Every document family must verify:

- [ ] Web download produces valid PDF
- [ ] Native save writes to device
- [ ] Filename matches expected pattern
- [ ] Preview (HTML view) unaffected
- [ ] Print layout unchanged
- [ ] Calculations unchanged
- [ ] Typecheck passes

## Completion Criteria

A document family is fully migrated when:

- Legacy orchestration (`downloadPdfFromElement` call) removed
- New infrastructure (`DefaultPdfGenerator` + `CompositePdfDelivery`) in use
- Output visually unchanged
- Callers (page components, navigation) unchanged
- Remaining document families unaffected
- `bun run typecheck` passes
