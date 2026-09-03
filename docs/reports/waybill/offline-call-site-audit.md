# Offline CSR / Quotation — Call Site Audit

> **Conclusion: NOT safe to delete.** Both offline modules are actively used in production code paths.

---

## 1. `src/lib/native/csrOffline.ts`

### Exports consumed outside the module

| Export | Caller | File | Line | Notes |
|---|---|---|---|---|
| `bootstrapCsrOffline()` | `csrSync.ts` | `src/lib/native/csrSync.ts` | 296, 330, 363 | Called in 3 sync functions before offline operations |
| `createOfflineCsrDraft()` | `NewCSR.tsx` | `src/pages/NewCSR.tsx` | 239 | Gated by `canUseOfflineCsrDrafts()` |
| `peekNextOfflineCsrNumber()` | `NewCSR.tsx` | `src/pages/NewCSR.tsx` | 19 | Imported (check for call site) |

### `canUseOfflineCsrDrafts()` guard (NewCSR.tsx:35)
```ts
canUseAndroidNativeSqlite() && typeof navigator !== 'undefined' && navigator.onLine === false
```
Only fires on Android Capacitor when the device is **offline**.

---

## 2. `src/lib/native/quotationOffline.ts`

### Exports consumed outside the module

| Export | Caller | File | Line | Notes |
|---|---|---|---|---|
| `bootstrapQuotationOffline()` | `quotationSync.ts` | `src/lib/native/quotationSync.ts` | 335, 369, 402 | Called in 3 sync functions before offline operations |
| `createOfflineQuotationDraft()` | `QuotationForm.tsx` | `src/components/quotation/QuotationForm.tsx` | 517 | Gated by `canUseOfflineQuotationDrafts()` |

### `canUseOfflineQuotationDrafts()` guard (quotationFormConstants.ts:12)
```ts
canUseAndroidNativeSqlite() && typeof navigator !== 'undefined' && navigator.onLine === false
```
Only fires on Android Capacitor when the device is **offline**.

---

## 3. Call Site Summary

| Function | Production Call Sites | Dead? |
|---|---|---|
| `bootstrapCsrOffline` | 3 (csrSync.ts) | No |
| `createOfflineCsrDraft` | 1 (NewCSR.tsx) | No |
| `bootstrapQuotationOffline` | 3 (quotationSync.ts) | No |
| `createOfflineQuotationDraft` | 1 (QuotationForm.tsx) | No |

**All four functions have active call sites in production code.** None are dead.

---

## 4. Risk Assessment

- Both online paths (Supabase) are unaffected — these code paths are only reached when `canUseAndroidNativeSqlite()` is true AND `navigator.onLine === false`.
- Deleting either module would break offline draft saving and sync for CSR and Quotation on Android.
- The modules are **conditionally executed** but **not dead code**.
