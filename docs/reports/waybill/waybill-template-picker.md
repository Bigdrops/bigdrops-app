# Waybill Template Picker — Implementation Report

## Summary

Added template selection (Classic/Minimal) to the Waybill PDF customization workflow by extending the existing inline customize sheet in ViewWaybill.tsx. Reuses shared `DocumentTemplatePicker` from `DocumentDesignControls.tsx`, `DocumentTemplateDesignOverrides` for color/font overrides, and the existing `template` prop on `WaybillPDF.tsx`.

## Changes by File

### `src/components/waybill/waybillUtils.ts`
- Added `WaybillPdfTemplateId` type (`'default' | 'minimal'`)
- Added `normalizeWaybillPdfTemplateId()` — defaults unknown/missing values to `'default'`
- Added `pdfTemplateId` field to `WaybillCustomFields` interface
- Updated `parseWaybillCustomFields()` to normalize `pdfTemplateId`

### `src/components/document/DocumentDesignControls.tsx`
- Added `'default'` template preview to `templatePreviewById` object (classic layout thumbnail)

### `src/pages/ViewWaybill.tsx`
- Added imports: `DocumentTemplatePicker`, `WaybillPdfTemplateId`, `normalizeWaybillPdfTemplateId`, `buildWaybillCustomFields`
- Added `WAYBILL_PDF_TEMPLATE_OPTIONS` constant (Classic + Minimal options with descriptions)
- Added `templateId` state (`WaybillPdfTemplateId`, defaults to `'default'`)
- Added `saving` state for async save loading
- Added `useEffect` to sync `templateId` from DB when waybill loads
- Added `DocumentTemplatePicker` to the customize sheet (above the existing design overrides)
- Updated "Save Settings" button to be async: persists `templateId` to DB via `supabase.from('waybills').update({ custom_fields })`
- Wired `template={templateId}` prop into the `WaybillPDF` element used by `handleDownload`

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Persistence | DB (JSONB `custom_fields.pdfTemplateId`) | Matches Invoice pattern, survives localStorage clears |
| Template isolation | No Invoice imports | Waybill templates are separate from Invoice renderers |
| Options definition | Module-level constant | Simple, predictable, no re-renders |
| Template sync on load | `useEffect([id])` | Reads DB value when waybill data is first fetched |
| Picker onChange adapter | `(v) => setTemplateId(v as WaybillPdfTemplateId)` | Bridges `DocumentTemplatePicker`'s generic `string` callback |

## Backward Compatibility

- Existing waybills without `pdfTemplateId` in `custom_fields` → `normalizeWaybillPdfTemplateId(undefined)` returns `'default'`
- Classic rendering path is unchanged
- Minimal path was already implemented in `blankWaybillTemplate.tsx` — no new renderer needed

## Verification

- `bun run audit:load` — passed (no new warnings)
- `bun run typecheck` — passed (0 errors)
