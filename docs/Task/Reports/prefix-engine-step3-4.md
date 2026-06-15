# Prefix Engine — Steps 3-4 Work Report

**Date:** June 15, 2026
**Status:** Complete — typecheck + lint pass

---

## Step 3: Constants + Resolution Pattern

### Created: `src/domain/prefixConstants.ts`

Exports:
- `DEFAULT_PREFIXES` — frozen record with all 7 prefix defaults (WBL, INV, BOQ, RFQ, QTN, PRJ, CSR)
- `DocumentPrefixKey` — union type of the 7 keys
- `DocumentPrefixes` — `Record<DocumentPrefixKey, string>`
- `resolvePrefix(documentPrefixes, key)` — returns the prefix for a given document type, falling back to default if the stored value is missing or fails the `^[A-Z0-9]{2,6}$` regex check

No changes to `useSettings.js` — the hook already returns the full settings object including `document_prefixes`. Consumers access it directly via `settings?.document_prefixes?.key ?? DEFAULT_PREFIXES.key`.

---

## Step 4: Settings UI — Document Prefixes Card

### Created: `src/pages/settings/DocumentPrefixesSettingsSection.tsx`

Full-featured settings card with:

| Feature | Implementation |
|---|---|
| **7 prefix fields** | Waybill, Invoice, Quotation, RFQ, BOQ, Project, CSR — in PRD-specified order |
| **Input validation** | `sanitizePrefixInput()` strips non-alphanumeric, forces uppercase, max 6 chars |
| **Live preview** | Each row shows format examples (Waybill: `WBL-E-000001` / `WBL-I-000001`; CSR: `CSR-000001` / `CSR-M-000001`; others: `[PREFIX]-000001`) |
| **Cross-type conflict** | Warns inline when two types share the same prefix (non-blocking) |
| **Solo reset** | Per-field reset icon, confirms via `window.confirm()`, saves immediately without main Save button |
| **Full reset** | "Reset All to Defaults" button at card bottom, confirms, saves all 7 at once |
| **Dirty state** | Save button disabled until at least one field differs from persisted values |
| **Save confirmation** | Lists each changed prefix with old→new values before persisting |

### Wired into settings navigation:

- `settings-config.ts` — added `'prefixes'` to `ActiveSectionId`, added entry in preferences group with `Hash` icon
- `index.ts` — added `DocumentPrefixesSettingsSection` export
- `Settings.tsx` — added import and `case 'prefixes'` in switch

---

## Verification

- `bun run typecheck` — zero errors
- `bunx eslint` on all changed files — zero errors (one `eslint-disable` block for legitimate useEffect state sync, same pattern as DocumentsSettingsSection)

---

## Files Changed

| File | Action |
|---|---|
| `src/domain/prefixConstants.ts` | Created |
| `src/pages/settings/DocumentPrefixesSettingsSection.tsx` | Created |
| `src/pages/settings/settings-config.ts` | Modified — added 'prefixes' section |
| `src/pages/settings/index.ts` | Modified — added export |
| `src/pages/Settings.tsx` | Modified — added import + case |

---

## What's Next (Steps 5-6)

- Step 5: Consolidate inline invoice number logic — replace duplicates in `NewInvoice.tsx` and `Invoices.tsx`
- Step 6: Delete `generateWaybillSequenceNumber` — consolidate to `getNextWaybillNumber()`
