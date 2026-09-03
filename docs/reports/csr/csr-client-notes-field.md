# CSR PDF — Client Notes Field Implementation

**Date:** 2026-06-23
**Scope:** Add a UI-only `comments` (Client Notes) field to CSR PDF output across all 4 templates
**Status:** Complete — typecheck and build pass with zero errors

---

## 1. Goal

Add a "Client Notes" textarea on the ViewCSR page that flows through to the PDF for all 4 CSR templates (PulseFrame, SignalBands, Zinc, Crimson), without polluting the `CsrRenderModel` type or touching the preview-only components (`CSRPreviewPanel`, `CsrDocumentPreview`).

## 2. Architecture

```
ViewCSR.tsx / NewCSR.tsx
  └── comments: useState<string>
        └── getCsrPdfDocument({ csr, comments, branding, template, designPreset })
              └── StyledCsrPdfDocument  (dispatches by variant)
                    └── PulseFrame / SignalBands / Zinc / Crimson
                          └── <ClientNotesBlock comments={comments} />
```

- `comments` is a **transient UI field** stored only in React state, never persisted to the DB.
- It travels through `CsrPdfProps` (PDF-specific props bag), NOT `CsrRenderModel`.

## 3. Changes

### 3.1 New File — `ClientNotesBlock.tsx`

**Path:** `src/components/csr/preview-templates/ClientNotesBlock.tsx`

A self-contained `@react-pdf/renderer` component that renders:
- A "CLIENT NOTES" label with a top border separator.
- The `comments` text if present.
- 3 blank pen-and-ink border-bottom lines if `comments` is empty (field masking rule).

### 3.2 Modified Files

| File | Change |
|---|---|
| `preview-templates/types.ts` | Added `comments?: string` to `CsrPdfProps` |
| `preview-templates/index.tsx` | Destructured `comments` from props in all 4 Template wrappers + `getCsrPdfDocument`, passing it through |
| `preview-templates/PulseFrame.tsx` | Imported `ClientNotesBlock`, destructured `comments`, rendered after acknowledgement |
| `preview-templates/SignalBands.tsx` | Same |
| `preview-templates/Zinc.tsx` | Same |
| `preview-templates/Crimson.tsx` | Same |
| `pages/ViewCSR.tsx` | Added `comments` state, styled textarea UI, passes to `getCsrPdfDocument` |
| `pages/NewCSR.tsx` | Added `comments` state (always empty), passes to both `getCsrPdfDocument` call sites |

### 3.3 No-Touch Zones Respected

- `src/lib/Calculations.ts` — untouched.
- `CsrRenderModel` — untouched.
- `CSRPreviewPanel.tsx` — no `comments` prop added or rendered.
- `CsrDocumentPreview.tsx` — no `comments` prop added or rendered.

## 4. Verification

- `bun run typecheck` → exit code 0 (zero type errors)
- `bun run build` → completed (3269 modules, all chunks generated without errors)

## 5. Future Considerations

- If `comments` needs to be persisted to the DB in the future, add a `comments` column to the `csrs` table and update the form screen. The PDF pipeline will automatically pick it up via `CsrPdfProps`.
- The `NewCSR.tsx` call site initializes `comments` to empty string. If persistence is added, the blank CSR form should include the textarea as well.
