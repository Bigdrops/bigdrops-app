# Quotation Multi-Tenancy Migration Audit

**Date:** 2026-08-10
**Status:** READ-ONLY — no code changes made
**Scope:** Complete read/write path audit for `quotations` and `quotation_items` tables

---

## Executive Summary

**Quotations are 0% migrated to multi-tenancy.** Every read and write goes to the public schema. Zero `tenantClient` calls exist for either table. No entity scoping, no data migration, no RLS policies.

- 28 `supabase.from('quotations')` call sites across the codebase
- 11 `supabase.from('quotation_items')` call sites
- 0 `tenantClient.from('quotations')` calls
- 0 `tenantClient.from('quotation_items')` calls

All quotations across all entities live in a single shared table. This is the same pattern Invoices were migrated from.

---

## Part 1: Data Migration State

**Finding:** No quotation data migration exists in any migration file.

| Migration | What it does | Quotation impact |
|---|---|---|
| `20260809010000_invoice_aggregate_provisioning.sql` | Creates template tables in entity schemas | Creates `quotations` and `quotation_items` as empty template tables — no data copied |
| `20260809030000_invoice_aggregate_data_migration.sql` | Copies invoice data to entity schemas | Invoice-only. Quotation data not migrated. |
| `20260809050000_revert_invoice_cross_schema.sql` | Creates revert RPC | Contains explicit comment: "quotations remain global" |

**Current state:** All quotation data for all entities lives in the single public `quotations` table. Template tables exist in entity schemas but are empty.

---

## Part 2: Frontend Read Paths

**Finding:** 100% of quotation reads use `supabase` (public schema). Zero use `tenantClient`.

### Quotation reads (by file)

| File | Line(s) | Client | Table | Operation |
|---|---|---|---|---|
| `src/modules/quotations/services/quotationService.ts` | 6-13 | supabase | quotations | loadQuotations |
| `src/modules/quotations/services/quotationService.ts` | 16-24 | supabase | quotations | loadQuotationById |
| `src/modules/quotations/services/quotationService.ts` | 27-33 | supabase | quotations | loadQuotationNumbers |
| `src/modules/quotations/services/quotationService.ts` | 60-61 | supabase | quotations | cloneQuotation (reads source) |
| `src/modules/quotations/services/quotationService.ts` | 63-63 | supabase | quotations | cloneQuotation (reads existing numbers) |
| `src/pages/viewQuotationActions.ts` | 15 | supabase | quotations | loadQuotationViewData |
| `src/pages/viewQuotationActions.ts` | 163 | supabase | quotations | convertQuotationToInvoice (reads custom_fields) |
| `src/pages/viewQuotationActions.ts` | 262 | supabase | quotations | convertQuotationToInvoice (audit read) |
| `src/pages/viewQuotationActions.ts` | 291 | supabase | quotations | updateQuotationStatus (old snapshot) |
| `src/pages/viewQuotationActions.ts` | 298 | supabase | quotations | updateQuotationStatus (new snapshot) |
| `src/hooks/useDashboardData.ts` | 362 | supabase | quotations | Dashboard recent docs (classic) |
| `src/hooks/useDashboardData.ts` | 477 | supabase | quotations | Dashboard recent docs (full) |
| `src/hooks/useGlobalSearch.ts` | 48 | supabase | quotations | Global search |
| `src/pages/settings/ArchivesSettingsSection.tsx` | 91 | supabase | quotations | Archived quotations |
| `src/hooks/useQuotationActions.ts` | 92-93 | supabase | quotations | Save PDF customization |

### Quotation item reads (by file)

| File | Line(s) | Client | Table | Operation |
|---|---|---|---|---|
| `src/modules/quotations/services/quotationService.ts` | 36-43 | supabase | quotation_items | loadQuotationItems |
| `src/modules/quotations/services/quotationService.ts` | 94-94 | supabase | quotation_items | cloneQuotation (reads source items) |
| `src/pages/viewQuotationActions.ts` | 16 | supabase | quotation_items | loadQuotationViewData |
| `src/pages/QuotationFormPage.tsx` | 221 | supabase | quotation_items | Load items for edit form |
| `src/modules/item-library/repositories/itemLibraryRepository.ts` | 299 | supabase | quotation_items | Item library usage stats |
| `src/modules/item-library/repositories/itemLibraryRepository.ts` | 413 | supabase | quotation_items | Item library usage stats |

### Hybrid reads (mixed public + tenant)

| File | Line(s) | What it does |
|---|---|---|
| `src/pages/viewQuotationActions.ts` | 13-20 | Reads quotation+items from public, settings from tenantClient |
| `src/hooks/useDashboardData.ts` | 355-368 | Reads invoices from tenantClient, quotations from public (same Promise.all) |

---

## Part 3: Frontend Write Paths

**Finding:** 100% of quotation writes use `supabase` (public schema). Zero use `tenantClient`.

### Quotation writes (by file)

| File | Line(s) | Client | Table | Operation |
|---|---|---|---|---|
| `src/hooks/useQuotationSave.ts` | 238 | supabase | quotations | INSERT (create) |
| `src/hooks/useQuotationSave.ts` | 243 | supabase | quotations | SELECT (for number generation) |
| `src/hooks/useQuotationSave.ts` | 248 | supabase | quotations | UPDATE (edit) |
| `src/modules/quotations/services/quotationService.ts` | 47 | supabase | quotations | archiveQuotation |
| `src/modules/quotations/services/quotationService.ts` | 55 | supabase | quotations | deleteQuotation |
| `src/modules/quotations/services/quotationService.ts` | 89 | supabase | quotations | cloneQuotation (insert clone) |
| `src/pages/viewQuotationActions.ts` | 242-244 | supabase | quotations | convertQuotationToInvoice (status → converted) |
| `src/pages/viewQuotationActions.ts` | 281 | supabase | quotations | deleteQuotationRecord |
| `src/pages/viewQuotationActions.ts` | 286 | supabase | quotations | archiveQuotationRecord |
| `src/pages/viewQuotationActions.ts` | 292 | supabase | quotations | updateQuotationStatus |
| `src/pages/viewRFQActions.ts` | 91 | supabase | quotations | RFQ→quotation conversion |
| `src/pages/viewBOQActions.ts` | 91 | supabase | quotations | BOQ→quotation conversion |
| `src/lib/native/quotationSync.ts` | 223-252 | supabase | quotations | Offline sync (INSERT) |
| `src/lib/native/quotationSync.ts` | 267 | supabase | quotations | Offline sync rollback (DELETE) |

### Quotation item writes (by file)

| File | Line(s) | Client | Table | Operation |
|---|---|---|---|---|
| `src/hooks/useQuotationSave.ts` | 259 | supabase | quotation_items | DELETE (edit: clear old items) |
| `src/hooks/useQuotationSave.ts` | 269 | supabase | quotation_items | INSERT (edit/create: write new items) |
| `src/modules/quotations/services/quotationService.ts` | 52 | supabase | quotation_items | deleteQuotation (clear items before delete) |
| `src/modules/quotations/services/quotationService.ts` | 100 | supabase | quotation_items | cloneQuotation (insert cloned items) |
| `src/pages/viewQuotationActions.ts` | 279 | supabase | quotation_items | deleteQuotationRecord (clear items) |
| `src/pages/viewRFQActions.ts` | 103 | supabase | quotation_items | RFQ→quotation items |
| `src/pages/viewBOQActions.ts` | 103 | supabase | quotation_items | BOQ→quotation items |
| `src/lib/native/quotationSync.ts` | 262-264 | supabase | quotation_items | Offline sync (INSERT items) |

---

## Part 4: Conversion Paths

### Quotation → Invoice (`viewQuotationActions.ts:144-276`)

**Direction:** Public quotation → Tenant invoice

1. Reads quotation `custom_fields` from public (line 163)
2. Reads invoice numbers from tenant (line 162)
3. Creates invoice via `save_invoice_with_items_transaction` RPC or sequential tenant writes (lines 206-228)
4. Updates quotation status to `converted` on public (line 242-244)
5. Reads updated quotation from public for audit (line 262)

**Risk:** Quotation data leaks across entities if two entities share a quotation ID (unlikely but possible with UUID collision). The quotation read is not scoped.

### Invoice → Quotation Revert (`invoiceConversionService.ts`)

**Direction:** Tenant invoice → Public quotation

1. Reads invoice from tenant schema
2. Writes reverted quotation to public schema
3. Migration comment explicitly states: "quotations remain global"

**Risk:** Reverted quotation lands in shared pool. Any entity can see it.

### RFQ → Quotation (`viewRFQActions.ts:91-103`)

**Direction:** Public RFQ → Public quotation

1. Reads RFQ from public (RFQ is not migrated either)
2. Creates quotation + items on public

**Risk:** No entity scoping. Both RFQ and quotation are global.

### BOQ → Quotation (`viewBOQActions.ts:91-103`)

**Direction:** Public BOQ → Public quotation

1. Reads BOQ from public (BOQ is not migrated either)
2. Creates quotation + items on public

**Risk:** Same as RFQ path.

---

## Part 5: Identity & Provisioning

**Finding:** Quotations have no entity identity concept.

- No `entity_id` column on `quotations` or `quotation_items` tables
- No entity scoping in any read or write path
- The provisioning migration creates template tables but they are empty shells
- No quotation data exists in any entity schema
- The `useQuotationActions` hook has access to `entity` and `tenantClient` via `useEntity()` but does not pass them to any quotation operation (except `handleConvertToInvoice` which passes them to the invoice write side)

---

## Part 6: Gap Analysis & Recommendation

### Current state summary

| Dimension | Status | Detail |
|---|---|---|
| Read paths | 0/28 migrated | All on `supabase` (public) |
| Write paths | 0/14 migrated | All on `supabase` (public) |
| Item reads | 0/6 migrated | All on `supabase` (public) |
| Item writes | 0/8 migrated | All on `supabase` (public) |
| Data migration | 0% | No migration file touches quotation data |
| Entity identity | None | No `entity_id` column |
| RLS policies | None | No entity-scoped policies |
| Conversion paths | 2 cross-boundary | Quotation→Invoice and Revert cross schemas |

### Migration complexity

**Low** — Quotations are a simpler document type than Invoices:
- No payments attached
- No financial views (like `invoice_financials_v`)
- No aggregate metrics
- Straightforward CRUD pattern
- Same item structure as invoices

### Recommended migration steps

1. **Schema:** Add `entity_id` to `quotations` and `quotation_items` tables
2. **Data migration:** Copy public quotation data to entity schemas (same pattern as invoice migration)
3. **Read paths:** Convert all `supabase.from('quotations')` → `tenantClient.from('quotations')` and same for `quotation_items`
4. **Write paths:** Convert all write operations to use `tenantClient`
5. **Conversion paths:** Scope quotation reads in `convertQuotationToInvoice` and `invoiceConversionService`
6. **Offline sync:** Update `quotationSync.ts` to use entity-scoped writes
7. **RLS:** Add entity-scoped policies for `quotations` and `quotation_items`

### Affected files (migration scope)

| File | Read changes | Write changes |
|---|---|---|
| `src/modules/quotations/services/quotationService.ts` | 5 functions | 3 functions |
| `src/pages/viewQuotationActions.ts` | 5 call sites | 5 call sites |
| `src/hooks/useQuotationSave.ts` | — | 5 call sites |
| `src/hooks/useQuotationActions.ts` | — | 1 call site |
| `src/hooks/useDashboardData.ts` | 2 call sites | — |
| `src/hooks/useGlobalSearch.ts` | 1 call site | — |
| `src/pages/settings/ArchivesSettingsSection.tsx` | 1 call site | — |
| `src/pages/QuotationFormPage.tsx` | 1 call site | — |
| `src/modules/item-library/repositories/itemLibraryRepository.ts` | 2 call sites | — |
| `src/pages/viewRFQActions.ts` | — | 2 call sites |
| `src/pages/viewBOQActions.ts` | — | 2 call sites |
| `src/lib/native/quotationSync.ts` | — | 3 call sites |
| **Total** | **17 read sites** | **21 write sites** |

### Priority

Quotations are the **4th most critical document type** after Invoices, Clients, and Settings. They participate in:
- Quotation→Invoice conversion (core workflow)
- RFQ→Quotation→Invoice pipeline
- BOQ→Quotation→Invoice pipeline
- Dashboard recent documents
- Global search
- Archive management
- Offline sync (mobile)

**Estimated effort:** Medium — 38 call sites across 13 files, same pattern as invoice migration.

---

## Appendix: All quotation-supabase call sites (grep evidence)

```
src/modules/quotations/services/quotationService.ts:6:    .from("quotations")
src/modules/quotations/services/quotationService.ts:17:    .from("quotations")
src/modules/quotations/services/quotationService.ts:29:    .from("quotations")
src/modules/quotations/services/quotationService.ts:37:    .from("quotation_items")
src/modules/quotations/services/quotationService.ts:47:  await supabase.from('quotations').update
src/modules/quotations/services/quotationService.ts:52:  await supabase.from('quotation_items').delete
src/modules/quotations/services/quotationService.ts:55:  await supabase.from('quotations').delete
src/modules/quotations/services/quotationService.ts:63:  supabase.from("quotations").select("quotation_number")
src/modules/quotations/services/quotationService.ts:89:  await supabase.from('quotations').insert
src/modules/quotations/services/quotationService.ts:100:  await supabase.from('quotation_items').insert
src/hooks/useQuotationSave.ts:238:  (supabase.from('quotations') as any).insert
src/hooks/useQuotationSave.ts:243:  await supabase.from('quotations').select('quotation_number')
src/hooks/useQuotationSave.ts:248:  await (supabase.from('quotations') as any).update
src/hooks/useQuotationSave.ts:259:  await supabase.from('quotation_items').delete
src/hooks/useQuotationSave.ts:269:  await supabase.from('quotation_items').insert
src/pages/viewQuotationActions.ts:15:  supabase.from('quotations').select('*')
src/pages/viewQuotationActions.ts:16:  supabase.from('quotation_items').select('*')
src/pages/viewQuotationActions.ts:163:  supabase.from('quotations').select('custom_fields')
src/pages/viewQuotationActions.ts:242:  await supabase.from('quotations').update
src/pages/viewQuotationActions.ts:262:  await supabase.from('quotations').select('*')
src/pages/viewQuotationActions.ts:279:  await supabase.from('quotation_items').delete
src/pages/viewQuotationActions.ts:281:  await supabase.from('quotations').delete
src/pages/viewQuotationActions.ts:286:  await supabase.from('quotations').update
src/pages/viewQuotationActions.ts:291:  await supabase.from('quotations').select('*')
src/pages/viewQuotationActions.ts:292:  await supabase.from('quotations').update
src/pages/viewQuotationActions.ts:298:  await supabase.from('quotations').select('*')
src/hooks/useQuotationActions.ts:92:  await supabase.from("quotations").update
src/hooks/useDashboardData.ts:362:  supabase.from('quotations').select
src/hooks/useDashboardData.ts:477:  supabase.from('quotations').select
src/hooks/useGlobalSearch.ts:48:  supabase.from('quotations').select
src/pages/settings/ArchivesSettingsSection.tsx:91:  supabase.from('quotations').select
src/pages/QuotationFormPage.tsx:221:  supabase.from("quotation_items").select
src/pages/viewRFQActions.ts:91:  await supabase.from('quotations').insert
src/pages/viewRFQActions.ts:103:  await supabase.from('quotation_items').insert
src/pages/viewBOQActions.ts:91:  await supabase.from('quotations').insert
src/pages/viewBOQActions.ts:103:  await supabase.from('quotation_items').insert
src/lib/native/quotationSync.ts:224:  .from("quotations").insert
src/lib/native/quotationSync.ts:262:  .from("quotation_items").insert
src/lib/native/quotationSync.ts:267:  await supabase.from("quotations").delete
src/modules/item-library/repositories/itemLibraryRepository.ts:299:  .from("quotation_items").select
src/modules/item-library/repositories/itemLibraryRepository.ts:413:  .from("quotation_items").select
```

---

This report was written by OpenCode on 2026-08-10 via Local Runner.
