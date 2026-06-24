# CSR Data Flow Verification

## Verified Pipeline

```
Database (supabase)
    │
    ▼
csrService.ts (CRUD + retry)
    │
    ▼
CsrObject (raw DB shape, typed)
    │
    ├─── ViewCSR.tsx ─── buildCsrPreviewData(csr) ──────────────────────────────────┐
    │         │                                                                    │
    │         ├── csrUtils.ts: buildCsrPreviewData()                                │
    │         │       └── calls buildCsrRenderModel(csr) @ line 342                 │
    │         │       └── spreads CsrObject + enriches with:                        │
    │         │             address, materialsRows, meta, layoutDensity,            │
    │         │             callTypeDisplay, systemDownDisplay, engineNo,            │
    │         │             defectsFound, technicianRole, technicianSignatureUrl,    │
    │         │             materialsOutputStyle                                    │
    │         │       └── return type: CsrRenderModel                              │
    │         │                                                                    │
    │         ├── CsrDocumentPreview(csr, previewModel) ── browser preview          │
    │         └── getCsrPdfDocument({ csr }) ── PDF generation                      │
    │                                                                    │
    └─── NewCSR.tsx ─── buildCsrPreviewData(csr) ── getCsrPdfDocument({ csr }) ── PDF
                                                                        │
                                                                        ▼
                                              preview-templates/{Crimson,PulseFrame,
                                                  SignalBands,Zinc}.tsx
                                                    │
                                                    └── getLayoutDensity(csr)
                                                    └── getStatusValue(csr)
                                                    └── csr.client_name, etc.
```

## Data Flow Summary

| Step | File | Description |
|------|------|-------------|
| 1 | `src/domain/csr/csrService.ts` | CRUD layer — fetches raw CSR row from Supabase |
| 2 | `src/domain/csr/csrRenderModel.ts` | `buildCsrRenderModel()` — pure transformer: `CsrObject → CsrRenderModel` |
| 3 | `src/components/csr/csrUtils.ts:290` | `buildCsrPreviewData()` — calls `buildCsrRenderModel()`, adds enrichment, returns `CsrRenderModel` |
| 4 | `src/pages/NewCSR.tsx:235,339` | Invokes `buildCsrPreviewData()` → passes to `getCsrPdfDocument()` |
| 5 | `src/pages/ViewCSR.tsx:192` | Invokes `buildCsrPreviewData()` → passes to both `CsrDocumentPreview` and `getCsrPdfDocument()` |
| 6 | `src/components/csr/preview-templates/index.tsx` | Dispatches to template component based on design preset |
| 7 | `src/components/csr/preview-templates/*.tsx` | Consumes `CsrRenderModel` — renders PDF via `@react-pdf/renderer` |

## Transformation Points

Only **two** locations call `buildCsrRenderModel()`:

1. **`csrUtils.ts:342`** — inside `buildCsrPreviewData()`, the primary enrichment function
2. **(All callers of `buildCsrPreviewData()` cascade through this one path)**

No callers bypass `buildCsrPreviewData()` to invoke `buildCsrRenderModel()` directly.

## Type Fixes Applied

| File | Issue | Fix |
|------|-------|-----|
| `CSRPreviewPanel.tsx:59` | Used undefined type `CsrPreviewData` | Changed to `CsrRenderModel` |
| `CSRPreviewPanel.tsx:77` | Same on function parameter | Changed to `CsrRenderModel` |
| `csrUtils.ts:349` | `CsrMeta` not assignable to `Record<string, unknown>` | Double cast via `unknown` |
| `csrUtils.ts:361-365` | Missing `technicianRole`, `technicianSignatureUrl`, `materialsOutputStyle` | Added from `renderModel` |
| `Crimson.tsx:242` | `CsrRenderModel` not imported | Added `import type` |
| `PulseFrame.tsx:205` | Same | Added `import type` |
| `SignalBands.tsx:216` | Same | Added `import type` |
| `Zinc.tsx:184` | Same | Added `import type` |
| All 4 templates | `csr || {}` widened type to `CsrRenderModel \| {}` | Cast to `CsrRenderModel` |
| `CsrDocumentPreview.tsx:15` | `csr || {}` widened type | Explicit type annotation + cast |

## Typecheck Result

```
$ tsc --noEmit
✓ Zero errors
```

## Conclusion

- `buildCsrRenderModel()` is correctly wired — invoked once inside `buildCsrPreviewData()` and consumed by all render paths.
- No duplicate transformations exist.
- No renderer computes prices, taxes, or totals.
- The data flow is a clean chain: **Supabase → CsrObject → CsrRenderModel → Preview/PDF**.
