# CSR Service Basis Separation

This report was written by OpenCode on 2026-07-11 via Local Runner.

## Objective

Separate CSR `call_type` into two independent fields: operational call type (Breakdown, Preventive Maintenance, etc.) and service basis (Paid Service, AMC, Warranty). The `service_basis` column already exists in live Supabase but was missing from the local type system, form, offline storage, sync, and all preview/PDF templates.

## Changes Made (15 files)

### Migration alignment
- `supabase/migrations/20260520090004_csrs.sql` — Added `service_basis text` after `call_type text` in CREATE TABLE so repo matches live schema

### Type system
- `src/lib/database.types.ts` — Added `service_basis: string | null` to csrs Row/Insert/Update types (3 locations)
- `src/components/csr/csrUtils.ts` — Added `service_basis: string` to `CsrObject`, `service_basis: ''` to `createDefaultCsr()`, `serviceBasisDisplay` to `buildCsrPreviewData()` return
- `src/domain/csr/csrRenderModel.ts` — Added `service_basis`, `serviceBasisDisplay` to `CsrRenderModel`; added `resolveServiceBasisDisplay()`; threaded through `buildCsrRenderModel()`
- `src/domain/csr/csrService.ts` — Added `'service_basis'` to `CSR_TABLE_COLUMNS` whitelist

### Offline & sync
- `src/lib/native/csrOffline.ts` — Added `service_basis` to `CreateOfflineCsrInput`, SQLite CREATE TABLE, INSERT columns, VALUES placeholder, and params array
- `src/lib/native/csrSync.ts` — Added `service_basis` to `LocalCsrRow` type; added to Supabase insert payload

### Form
- `src/components/csr/CsrFormScreen.tsx` — Replaced old `CALL_TYPE_OPTIONS` (3 service-basis values) with operational options (`Breakdown`, `Preventive Maintenance`, `Installation`, `Commissioning`, `Inspection`, `Emergency Repair`, `Other`); added `SERVICE_BASIS_OPTIONS` with (`Paid Service`, `AMC`, `Warranty`); added Service Basis `<SelectField>` between Call Type and System Down

### Preview & PDF templates
- `src/components/csr/CSRPreviewPanel.tsx` — Added `serviceBasisDisplay` display row
- `src/components/document-view/csr/CsrDocumentPreview.tsx` — Added `serviceBasis` extraction + display cell
- `src/components/csr/preview-templates/components.tsx` — Added Service Basis field block
- `src/components/csr/preview-templates/Minimal.tsx` — Added Service Basis pair to items array
- `src/components/csr/preview-templates/Crimson.tsx` — Added Service Basis fieldCard
- `src/components/csr/preview-templates/SignalBands.tsx` — Added Service Basis identityFull block
- `src/components/csr/preview-templates/Zinc.tsx` — Added Service Basis PdfField

## Key Design Decisions

- Both fields optional — blank value (`''`) → label hidden in preview & PDF
- `call_type` column retained in DB (now only operational reasons)
- Old records with `Warranty`/`AMC`/`Paid Service` in `call_type` remain backward compatible (display via `resolveCallTypeDisplay()`)
- No redesign, no layout changes, no DB column renames — surgical additions only

## Verification

- `bun run typecheck`: Pass (1 pre-existing error in `PdfOutputCustomizeSheet.tsx` — `"receipt"` type mismatch, unrelated)
- `bun run audit:load`: Pass (no new issues introduced)
- `git status`: 15 files modified, no unintended files, no new files
- `bun run build`: Skipped (per hardware policy — 4GB RAM constraint)

## Files Not Modified (confirmed no action needed)

- `src/domain/csr/csrImport.ts` — Does not reference `call_type`
- `src/components/csr/CsrImportSheet.tsx` — Does not reference `call_type`
- Document duplicate/revert transforms — Do not reference `call_type`
