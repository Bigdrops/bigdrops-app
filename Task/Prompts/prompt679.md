

```
You are working on the BIGDROPS business platform.
Runtime: Bun. Never use npm or yarn.

Read AGENTS.md and docs/PROJECTSKIILINDEX.md before anything else.

==================================================
TASK: Update PREFIX_ENGINE_SETTINGS PRD + Execution Doc
==================================================

READ FIRST (mandatory):
- `docs/PREFIX_ENGINE_SETTINGS.md` (read fully)
- `docs/execution` (read fully — find the prefix engine section)
- `Task/reports/prefix-engine-audit.md`
- `Task/reports/settings-table-audit.md`
- `Task/reports/sequence-generator-audit.md`
- `Task/reports/offline-call-site-audit.md`

==================================================
CHANGE 1 — Update `docs/PREFIX_ENGINE_SETTINGS.md`
==================================================

Make the following corrections to the PRD based on audit findings:

### Section 3 — Storage & Migration

Replace the entire section with:

**3.1 Storage**
- `document_prefixes` JSONB column is added to the existing `settings` table — NOT a new `organizations` table.
- The `settings` table is a singleton row (`id = 1`) used for all workspace-wide configuration.
- No `organizations` table exists or needs to be created.

**3.2 Migration**
- `blank_waybill_logs` table already exists in production — no migration needed.
- `blank_csr_logs` table does not exist — migration required.
- `document_prefixes` JSONB column needs to be added to `settings` table with defaults and CHECK constraint (same constraint as original PRD Section 3.2).

**3.3 Fallback**
- Keep as-is from original PRD.

**3.4 Settings Access**
Add this new sub-section:
- `document_prefixes` is read via the existing `useSettings()` hook in `src/hooks/useSettings.js`.
- No new org context or provider is needed — all document creation screens already have access to settings.
- Prefix values are accessed as: `settings?.document_prefixes?.invoice ?? DEFAULT_PREFIXES.invoice`

### Section 5 — Sequence Generation

Replace Section 5.3 Call Chain with:

```

useSettings() → settings.document_prefixes → prefix value → existing generator
```

Add a new sub-section **5.6 Generator Status** documenting the current state of each generator:

| Generator | File | Prefix Source | Dynamic Today? | Action Required |
|---|---|---|---|---|
| `getNextInvoiceNumber` | `documentConversion.ts` | Default param `'SASINV-B'` | Yes | Pass prefix from settings. Also consolidate inline duplicates in `NewInvoice.tsx` and `Invoices.tsx` |
| `getNextQuotationNumber` | `quotation/normalize.ts` | Default param `'SASIQUO'` | Yes | Pass prefix from settings at all 5 call sites |
| `getNextRfqNumber` | `rfq/normalize.ts` | Default param `'RFQ'` | Yes | Pass prefix from settings at 1 call site |
| `getNextCsrNumber` | `csrUtils.ts` | Hardcoded fallback `'CSR-001'` | No | Add prefix parameter, update call site in `NewCSR.tsx` |
| `generateWaybillSequenceNumber` | `waybillUtils.ts` | Hardcoded `'AWB-E-'`/`'AWB-I-'` | No | Delete this function — duplicate of `getNextWaybillNumber` |
| `getNextWaybillNumber` | `waybillUtils.ts` | Hardcoded `'AWB-E-'`/`'AWB-I-'` | No | Add prefix parameter, update 2 call sites |
| `generateNextProjectCode` | `projects.ts` | Hardcoded `PRJ-{year}-` | Partial | Modify `getProjectCodePrefix()` to accept prefix param |
| `formatCsrNumber` (offline) | `csrOffline.ts` | Hardcoded `'SASCSR-'` | No | NOT IN SCOPE — offline module is live, deletion deferred |
| `formatQuotationNumber` (offline) | `quotationOffline.ts` | Hardcoded `'SASQUO-'` | No | NOT IN SCOPE — offline module is live, deletion deferred |

### Add Section 10 — Out of Scope (this build)

```

## 10. Out of Scope — This Build

- Offline CSR module (`src/lib/native/csrOffline.ts`) — live in production, called by `NewCSR.tsx` and `csrSync.ts`. Deletion requires a dedicated offline feature deprecation plan. Deferred.
- Offline Quotation module (`src/lib/native/quotationOffline.ts`) — live in production, called by `QuotationForm.tsx` and `quotationSync.ts`. Same as above. Deferred.
- Blank waybill template download — PDF concern, moved to `docs/pdf-rendering-roadmap.md`.
- Blank CSR template download — PDF concern, moved to `docs/pdf-rendering-roadmap.md`. The `blank_csr_logs` table migration IS in scope (number engine), but the download UI is not.
```

### Update Section 9 — Implementation Order

Replace with:

```
## 9. Implementation Order

1. Migration — add `document_prefixes` JSONB column to `settings` table
2. Migration — create `blank_csr_logs` table
3. `DEFAULT_PREFIXES` constants + prefix resolution pattern via `useSettings()`
4. Settings UI — Document Prefixes card with live preview, dirty state, solo reset, full reset
5. Consolidate inline invoice number logic — replace duplicates in `NewInvoice.tsx` and `Invoices.tsx` with calls to `getNextInvoiceNumber()`
6. Delete `generateWaybillSequenceNumber` — consolidate to `getNextWaybillNumber()`
7. Add prefix parameter to `getNextWaybillNumber()` and `getNextCsrNumber()`
8. Wire all generators to settings prefix — Waybill, Invoice, Quotation, RFQ, CSR
9. Build Project document sequence generation from scratch
10. Wire Project generator to settings prefix
11. Collision handler — silent auto-retry (max 3 attempts) across all document types
12. Blank waybill number assignment — wire blank download to use org prefix + log to `blank_waybill_logs`
13. Blank CSR number assignment — build blank CSR download, log to `blank_csr_logs` (number engine only, no PDF)

```

==================================================
CHANGE 2 — Update `docs/execution`
==================================================

Find the prefix engine section in the execution doc. Update it to reflect:
- Storage is `settings` table not `organizations`
- Implementation order matches the updated Section 9 above (13 steps)
- Offline modules are explicitly out of scope
- `blank_waybill_logs` already exists (no migration needed for it)
- `blank_csr_logs` needs migration

If no prefix engine section exists in the execution doc, add one at the appropriate position.

==================================================
VERIFICATION
==================================================
- Read both files after editing and confirm the changes are present
- No source code files modified
- Push both files to main

==================================================
DONE WHEN
==================================================
- [ ] `docs/PREFIX_ENGINE_SETTINGS.md` updated with all corrections above
- [ ] `docs/execution` updated with prefix engine section
- [ ] Both files pushed to main
- [ ] Work report saved to `Task/reports/prd-update-prefix-engine.md`

==================================================
DO NOT
==================================================
- Do NOT modify any source code
- Do NOT run `bun run dev`
- Do NOT change any other section of the PRD beyond what is specified above
- Do NOT skip the work report
```

