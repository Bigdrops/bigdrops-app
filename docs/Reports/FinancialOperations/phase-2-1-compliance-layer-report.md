# Phase 2.1 — Compliance Layer Refactor Report

This report was written by OpenCode on 2026-07-04 via Local Runner.

## Objective & Scope

Establish the same architectural layering (UI → Service → Repository → Supabase) in the Compliance module that was proven in the Payment module. No business behaviour changes, no UI redesign, no new Compliance features.

### What is covered
- Creation of `complianceRepository.ts` (5 tables, 20 functions)
- Creation of `complianceService.ts` consolidating the old `whtReceiptService.ts`
- Migration of all inline supabase calls from 7 UI components + ComplianceHub page
- Deletion of the old `whtReceiptService.ts`

### What is intentionally excluded
- `invoices` and `payments` supabase calls in ComplianceHub (owned by invoice/payment modules)
- Domain types in `src/domain/compliance/types.ts` (no changes needed)
- Calculation engine, Payment module, Financial State
- New features or UI changes

## Files Created
| File | Purpose |
|------|---------|
| `src/modules/compliance/repositories/complianceRepository.ts` | CRUD repository for all 5 compliance tables (20 exported functions) |
| `src/modules/compliance/services/complianceService.ts` | Service layer wrapping repository, consolidates old whtReceiptService, adds `importRecord` for JSON import |

## Files Deleted
| File | Reason |
|------|--------|
| `src/modules/compliance/services/whtReceiptService.ts` | Consolidated into `complianceService.ts` |

## Files Modified
| File | Change |
|------|--------|
| `src/components/compliance/WhtReceiptsPanel.tsx` | Replaced inline `supabase.from('wht_receipts').insert/update` with `insertInlineWhtReceipt`/`updateInlineWhtReceipt` |
| `src/components/compliance/VatInputsPanel.tsx` | Replaced inline `supabase.from('tax_input_entries').insert/update/delete` with service calls |
| `src/components/compliance/TaxFilingsPanel.tsx` | Replaced inline `supabase.from('tax_filings').insert/update/delete` with service calls |
| `src/components/compliance/TaxRemindersPanel.tsx` | Replaced inline `supabase.from('tax_reminders').insert/update/delete/resolveReminder` with service calls |
| `src/components/compliance/ComplianceSettingsPanel.tsx` | Replaced inline `supabase.from('tax_settings').select/upsert` with `fetchTaxSettings`/`upsertTaxSettings` |
| `src/components/compliance/import/ComplianceJsonImportSheet.tsx` | Replaced inline dynamic `supabase.from(table).insert` with `importRecord(type, record)` |
| `src/components/compliance/WhtReceiptMatcherAction.tsx` | Re-pointed import from old `whtReceiptService` to `complianceService` |
| `src/pages/ComplianceHub.tsx` | Replaced 4 compliance table supabase queries with repository fetches; left invoices/payments as-is |

## Verification Results
| Check | Status |
|-------|--------|
| `bun run audit:load` | Pass — no more `🟠 [ARCH]` warnings for compliance components |
| `bun run typecheck` | Pass — zero errors |
| `git status` | 8 modified files, 2 new files, 1 deleted file — all expected, no unintended changes |

## Key Design Decisions

1. **Single repository, single service:** All 5 compliance tables share one repository and one service, matching the module boundary of the Compliance domain. This is consistent with the Payment module pattern where one repository/service pair serves all payment tables.

2. **Repository returns domain types directly:** Unlike the old whtReceiptService which mixed business logic (timestamps, storage uploads) with data access, the repository layer is a pure data access layer. Timestamp management lives in the service layer.

3. **`importRecord` dispatches by type:** The JSON import sheet's dynamic table routing is handled by the service via a type-to-table map, keeping the UI free of table name knowledge.

4. **Invoices/payments left alone in ComplianceHub:** These are owned by other modules. Moving them would violate domain segregation.

## Deferred Work
- None. All compliance panel supabase calls have been migrated.
