# CSR Template Deletion: PulseFrame

## Summary

PulseFrame (template key `'1'`, variant key `'pulseframe'`) was removed from the codebase. This was a complete deletion — no deprecation path, no stubs, no review comments retained. Storage keys in localStorage (`template='1'`) will fall through to the `'crimson'` default.

## Scope

### Files modified (6)

| File | Changes |
|------|---------|
| `src/components/csr/PulseFrame.tsx` | DELETED — entire file removed |
| `src/components/csr/preview-templates/components.tsx` | `PulseAcknowledgementBlock` component removed |
| `src/components/csr/preview-templates/layoutModel.ts` | `pulseframe: 10` entry removed from `MATERIALS_MAX_ROWS_PER_COLUMN` |
| `src/components/csr/CSRPreviewContent.js` | `pulseframe` removed from `CSR_TEMPLATE_VARIANTS`; `{key:'1', label:'PulseFrame'}` from `CSR_TEMPLATE_OPTIONS`; `if (template === '1') return 'pulseframe'` from `getCsrTemplateVariant` |
| `src/components/csr/CsrTemplateCarousel.tsx` | `key === '1'` case removed from `getCsrVariantKey` |
| `src/components/csr/preview-templates/pdfTemplateLayout.test.js` | Two `'pulseframe'` test cases removed from `resolveMaterialColumnBlocks` |

### Files with index/export changes (2)

| File | Changes |
|------|---------|
| `src/components/csr/preview-templates/index.tsx` | `PulseFrame` import + `Template1` export removed; `'pulseframe'` → `Template1` mapping removed from `getCsrPdfDocument` |
| `src/pages/csr/ViewCSR.tsx` | `CSR_TEMPLATE_ACCENT_KEY` constant, `CSR_PULSEFRAME_SWATCHES` array, `templateAccentColor` state, accent from `getEffectivePreset`, accent from `useEffect` deps, Palette icon import, entire Template Accent Color UI block, accent from save handler, `'1'` entry from `CSR_TEMPLATE_DEFAULTS` all removed |

## Verification

- `bun run typecheck` — **pass** (0 errors)
- `bun run build` — **pass** (3269 modules transformed)

## Cleanup notes

- No dead imports remain in any affected file
- No orphaned PulseFrame-related logic exists in the module graph
- Existing CSR records with `template='1'` in localStorage will resolve to default `'crimson'` template on next render
