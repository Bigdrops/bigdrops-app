# Prefix Engine — Steps 7-8 + Info Popovers Work Report

**Date**: 2026-06-16  
**Status**: Complete

---

## Summary of Changes

### CHANGE 1 (prompt86i): Info Popovers on Prefix Rows
**File**: `src/pages/settings/DocumentPrefixesSettingsSection.tsx`

- Added `Info` icon import from lucide-react
- Added `Popover`/`PopoverContent`/`PopoverTrigger` imports from `@/components/ui/popover`
- Added `PREFIX_INFO` constant with descriptive text for all 7 document types
- Added info icon button + PopoverContent next to each prefix label — shows usage, format constraints, and current prefix value

### CHANGE 2 (prompt86i): Generator Extension with Optional Prefix

#### 2a. `src/components/waybill/waybillUtils.ts` — `getNextWaybillNumber`
- Signature: `(type, existingNumbers, prefix: string = 'AWB')` 
- Routing tokens `E`/`I` appended automatically: `${prefix}-I-` / `${prefix}-E-`
- Pad length changed from 4 to 6 digits (consistent with other generators)

#### 2b. `src/components/csr/csrUtils.ts` — `getNextCsrNumber`
- Signature: `(lastValue, prefix: string = 'CSR')`
- Fallback changed from `'CSR-001'` to `${prefix}-000001` (6-digit zero-padding)
- Renamed local `prefix` variable to `basePrefix` to avoid shadowing

### CHANGE 3 (prompt86i): Wire Prefix to All Call Sites

#### Component files (useSettings() hook):
| File | Change |
|------|--------|
| `src/pages/NewWaybill.tsx` | Added `useSettings` + `resolvePrefix`, passed prefix to `getNextWaybillNumber` and `saveWaybill` |
| `src/pages/NewCSR.tsx` | Added `useSettings` + `resolvePrefix`, passed prefix to `getNextCsrNumber` |
| `src/pages/NewRfq.tsx` | Added `useSettings` + `resolvePrefix`, passed prefix to `getNextRfqNumber` |
| `src/pages/NewInvoice.tsx` | Added `resolvePrefix` + `useSettings`, passed prefix to `getNextInvoiceNumber` |
| `src/pages/Invoices.tsx` | Added `useSettings` + `resolvePrefix` in `InvoicesContent`, passed prefix to `getNextInvoiceNumber` |
| `src/pages/EditWaybill.tsx` | Added `useSettings`, passed prefix to `saveWaybill` |
| `src/pages/ViewRfq.tsx` | Added `useSettings`, passed `settings?.document_prefixes` to `convertRFQToQuotation` |
| `src/pages/ViewBoq.tsx` | Added `useSettings`, passed `settings?.document_prefixes` to `convertBOQToQuotation` |
| `src/components/quotation/QuotationList.tsx` | Added `useSettings`, passed `settings?.document_prefixes` to `cloneQuotation` |

#### Action files (optional `prefixes` parameter):
| File | Function | Change |
|------|----------|--------|
| `src/pages/viewQuotationActions.ts` | `duplicateQuotationRecord` + `convertQuotationToInvoice` | Added `prefixes?: DocumentPrefixes \| null` param, resolved prefix for `getNextQuotationNumber` |
| `src/pages/viewRFQActions.ts` | `convertRFQToQuotation` | Added `prefixes?: DocumentPrefixes \| null` param, resolved prefix for `getNextQuotationNumber` |
| `src/pages/viewBOQActions.ts` | `convertBOQToQuotation` | Added `prefixes?: DocumentPrefixes \| null` param, resolved prefix for `getNextQuotationNumber` |
| `src/hooks/useQuotationActions.ts` | (hook) | Uses `useSettings()`, passes `settings?.document_prefixes` to action functions |
| `src/hooks/useInvoiceMutations.ts` | (hook) | Uses `useSettings()`, passes `settings?.document_prefixes` to `revertInvoiceToQuotationService` |
| `src/components/document-view/invoice/useInvoiceActions.ts` | (hook) | Receives `settings` as param, passes `settings?.document_prefixes` to `revertInvoiceToQuotationService` |

#### Service files (optional `prefixes` parameter):
| File | Function | Change |
|------|----------|--------|
| `src/modules/invoices/services/invoiceConversionService.ts` | `revertInvoiceToQuotationService` | Added `prefixes?: DocumentPrefixes \| null` to input interface, resolved prefix for `getNextQuotationNumber` |
| `src/modules/quotations/services/quotationService.ts` | `cloneQuotation` | Added `prefixes?: DocumentPrefixes \| null` param, resolved prefix for `getNextQuotationNumber` |
| `src/domain/waybill/waybillMutations.ts` | `saveWaybill` | Added `prefixes?: DocumentPrefixes \| null` to params, resolved prefix for `getNextWaybillNumber` |

### CHANGE 4 (prompt86i): Project Generator Extension
**File**: `src/domain/projects.ts`

- `getProjectCodePrefix(date, prefix = 'PRJ')` — now accepts optional prefix param
- `generateNextProjectCode(supabaseClient, date, prefix?)` — passes custom prefix through
- `createProjectWithGeneratedCode(supabaseClient, payload, maxRetries, prefix?)` — passes prefix through

**File**: `src/pages/NewProject.tsx`
- Added `useSettings` import, `const { settings } = useSettings()`
- Passed `settings?.document_prefixes?.project` as 4th arg to `createProjectWithGeneratedCode`

---

## Verification

| Check | Status |
|-------|--------|
| `bun run audit:load` | ✅ All pre-existing warnings, no new issues |
| `bun run typecheck` | ✅ Clean — zero errors |
| `bun run lint` | ✅ No new errors in modified files |

---

## Architecture Notes

- **resolvePrefix signature**: `resolvePrefix(documentPrefixes, key)` — arguments are (prefixes object, key string)
- **Non-component files**: Get `prefixes?: DocumentPrefixes | null` parameter (not `useSettings()`)
- **Component files**: Use `useSettings()` hook to get `settings?.document_prefixes`
- **Waybill prefix**: Replaces only base prefix, NOT routing tokens — `${prefix}-I-NNNNNN` / `${prefix}-E-NNNNNN`
- **CSR prefix**: `${prefix}-000001` — 6-digit zero-padded
- **Safe defaults**: All generators use safe defaults if no prefix is provided
- **No routing token changes**: E, I, M tokens preserved in all generators
