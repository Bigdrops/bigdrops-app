# Phase 2 Read-Only Migration — Implementation Report

This report was written by Buffy on 2026-08-09 via Freebuff.

## A. Objective & Scope

Implement the approved Phase 2 read-only migration for Settings and Clients.

Route every targeted Settings and Clients READ query through the existing
schema-aware Tenant Client (`useEntity() → tenantClient` from `EntityProvider`).
All writes, deletes, and payment writes remain on the public Supabase client.

This is a targeted read migration. It is not a general multi-tenancy refactor.
No backfill, no public-schema fallback, no new authorization checks, and no
new tenant-resolution mechanism were introduced.

## B. Evidence — Files Modified

| File | Change |
|---|---|
| `src/hooks/useSettings.js` | `fetchSettings` READ → `tenantClient.from('settings')`; `useSettings` obtains `tenantClient` via `useEntity()` and waits on `tenantClient.isReady`; upsert/write path untouched |
| `src/hooks/useInvoiceReferenceData.ts` | settings read → `tenantClient`; gated on `tenantClient.isReady` |
| `src/hooks/useInvoiceDetailData.js` | client read + settings read → `tenantClient`; existing error/offline-cache fallback preserved |
| `src/hooks/useGlobalSearch.ts` | clients search read → `tenantClient`; gated on readiness |
| `src/pages/Clients.tsx` | client list READ → `tenantClient`; DELETE stays public |
| `src/pages/ClientDetail.tsx` | client-by-id read → `tenantClient`; workspace reads stay public |
| `src/components/ClientSelector.tsx` | clients list read → `tenantClient`; client INSERT stays public |
| `src/pages/ViewWaybill.tsx` | client read → `tenantClient`; gated on readiness |
| `src/pages/ViewCSR.tsx` | client read → `tenantClient`; gated on readiness |
| `src/pages/QuotationFormPage.tsx` | settings brand-column read → `tenantClient`; offline-draft path not blocked |
| `src/pages/viewQuotationActions.ts` | `loadQuotationViewData(id, tenantClient)`; settings + client reads → `tenantClient` |
| `src/hooks/useQuotationViewData.ts` | passes resolved `tenantClient`; gated on readiness |
| `src/modules/invoices/services/paymentService.ts` | `recordInvoicePayment(input, tenantClient)`; clients + 2 settings reads → `tenantClient`; payment writes public |
| `src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx` | passes `tenantClient` to `recordInvoicePayment` |
| `src/pages/settings/BrandingSettingsSection.tsx` | passes `tenantClient` to `fetchSettings({ force: true })` |
| `src/components/app/AppShell.tsx` | theme effect moved into `AppThemeManager` rendered inside `EntityProvider` |

## C. Fact vs. Conclusion

Facts (verified by grep on `src/`):

- All 6 targeted Settings reads now use `tenantClient.from('settings')`.
- All 9 targeted Clients reads now use `tenantClient.from('clients')`.
- The only remaining `from('settings')` in `src/` is the `persistSettings`
  upsert inside `useSettings.js` (write path, public).
- The only remaining `from('clients')` in `src/` are `Clients.tsx` DELETE,
  `AddClient`/`EditClient` writes, and `EditClient`'s read (explicitly out of
  scope).

Conclusion: the migration is complete and writes/deletes are unmigrated.

## D. Risks & Limitations

- If tenant provisioning never reaches `ready`, gated pages show their loading
  state rather than an error. This is consistent with the existing readiness
  pattern and is an accepted trade-off.
- `EditClient.tsx` still reads clients from public Supabase. It is outside the
  approved Phase 2 file list and was intentionally left unchanged.

## E. Verification

- `bun run typecheck`: PASS (exit 0, zero errors)
- `bun run audit:load`: PASS (exit 0, zero new warnings)
- `git status`/diff scope: PASS — only the 16 scoped source files modified
- `bun run build`: NOT run (prohibited by AGENTS.md)

Committed as `99645477` (`✨ feat(tenant): phase 2 settings and clients reads`).
GitHub `validate` check: success.

## F. Deferred Work

- Migrating Settings writes and Clients insert/update/delete to the tenant
  schema (Phase 3, requires tenant write permissions).
- Migrating `EditClient.tsx` client read.
