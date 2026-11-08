# Final Document Numbering and Rich-Text Verification — Addendum

- **Report type**: Read-only verification audit (addendum to the 2026-11-07 engineering report)
- **Date**: 2026-11-07
- **Branch**: `main`
- **Working tree at audit start**: 13,091 changed or untracked entries, all pre-existing (`git status --porcelain` hash `053392aa…`). None were created by this audit.
- **Working tree at audit end**: identical (`git status --porcelain` hash `053392aa…`). Zero code, test, migration, or database changes.
- **Language**: ASD-STE100 Simplified Technical English
- **Subject report under review**: `docs/reports/DOCUMENT-PLATFORM/final-numbering-authority-database-uniqueness-and-rich-text-repair.md`

---

## 0. Evidence Classes Used in This Report

Every finding carries an evidence class. Read the class before you trust a statement.

| Class | Meaning |
| :--- | :--- |
| **VERIFIED-SOURCE** | Directly read in the repository source file cited. Quote is exact. |
| **VERIFIED-RUNTIME** | Observed by executing the function in a Bun REPL with read-only input. No files or database rows were written. |
| **INFERRED-SOURCE** | Logical result of reading the source. Real database behaviour was not observed. |
| **HISTORICAL** | Recorded in a prior report. Not re-executed during this audit. |
| **UNVERIFIED** | No read-only path exists to confirm the claim. You must not treat it as proven. |

**Live database catalog access was NOT available.** No read-only catalog channel exists without production credentials. The audit did not read `.env`, did not use the Supabase CLI against the hosted project, and did not run any SQL. Therefore **every database-level finding in this report is migration/source evidence, not catalog evidence.** Section 5 marks each database row as UNVERIFIED-LIVE.

---

## 1. Executive Summary and Final Verdict

### 1.1 Summary of the six concerns

| # | Concern | Result | Severity |
| :--- | :--- | :--- | :--- |
| 1 | Dynamic prefix-to-cursor key consistency | Sequential behaviour is **correct**. The caller builds the cursor key from the resolved prefix at run time. The prior report's `__auto_seq['INV-']` example is a **documentation defect only**. Two real defects were found in the shared allocator (F-03, F-04). | Medium |
| 2 | Automatic-versus-manual handling in every `withUniqueRetry` caller | 9 of 10 call sites are correct. **RFQ classifies every non-empty number as manual** (F-01). **CSR falls back to manual when the field is empty** (F-02). | **High** |
| 3 | Historical duplicate invoice handling | The exclusion predicate is **derived at migration time**, not hardcoded to two IDs (F-06). The two primary records remain indexed **only under the same-name index assumption** (F-08). | **High** |
| 4 | Unique-index definitions and predicates | The definitions are reasonable in the source. Live existence is **UNVERIFIED**. `CREATE UNIQUE INDEX IF NOT EXISTS` can silently skip a different definition (F-09). Receipt and Letter indexes are total, not partial (F-10). | Medium |
| 5 | Tenant provisioning documentation | The prior report is **correct that foreign keys are not copied** by `INCLUDING ALL`; it states the opposite in §4.2. Indexes do copy. | Medium (documentation) |
| 6 | Rich-text boundary behaviour and XSS protection | **No XSS path was found.** Script, style, event handlers, and URL attributes are all removed (VERIFIED-RUNTIME). Two data-integrity defects exist in boundary handling (F-04, F-05). | Medium |

### 1.2 Final verdict

**The numbering architecture cannot receive final unconditional sign-off.**

The core design is sound: one shared resolver, one shared allocator, one shared retry wrapper, and a monotonic cursor. But this audit found **two High-severity save-path defects** (RFQ manual misclassification, CSR empty-field fallback) that can directly disable collision protection or overwrite the automatic cursor. It also found **one High-severity database-guarantee gap** (the invoice exception excludes derived IDs, not the two named primary-record assumptions; the primary guarantee depends on which of the two same-number rows the window function ranks first).

**Conditional sign-off is possible** after you fix F-01, F-02, and F-06, and after you confirm F-08 and F-09 with a read-only catalog query.

---

## 2. Nine-Module Settings and Cursor Consistency Matrix

### 2.1 Shared mechanism (VERIFIED-SOURCE)

- Prefix read: `resolvePrefix(prefixes, key)` in `src/domain/prefixConstants.ts`. It validates `/^[A-Z0-9]{2,6}$/` and falls back to `DEFAULT_PREFIXES[key]`.
- Cursor storage: `settings.document_prefixes.__auto_seq` (constant `AUTO_CURSOR_KEY`), read by `readAutoCursor`, merged by `mergeAutoCursor` (monotonic: `Math.max(prevSeq, seq)`).
- Persistence: `fetchAutoCursor` and `advanceAutoCursor` in `src/domain/documentNumbering.ts` read and write `settings.document_prefixes` through the tenant client.
- Allocation: `nextAutomaticNumber(family, cursor, occupied, maxSeq)` then `findFreeSequence`, which skips every occupied identifier in the family.

### 2.2 Concern 1 finding: is the cursor key dynamic or stale?

**It is dynamic.** The prior report says the cursor is stored in `settings.document_prefixes.__auto_seq['INV-']`. Read literally, that reads as a fixed key. The actual construction is at run time:

```ts
// src/hooks/useInvoiceSave.ts (persist)
const invoicePrefix = resolvePrefix(input.documentPrefixes, 'invoice')
const invoiceFamily = `${invoicePrefix}-`
const [, cursor] = await Promise.all([..., fetchAutoCursor(tenantClient, invoiceFamily)])
```

Every module builds the family from the resolved value in the same call. **No module contains a hardcoded `'INV-'`, `'QTN-'`, or similar literal used as a cursor key.** A source-wide search for `manualNumber`/`family`/`resolvePrefix` confirms this.

**Consequence of a Settings prefix change:** the new family has no cursor, so it bootstraps from `maxSeq + 1` (the highest occupied sequence for the new prefix). Legacy identifiers under the *old* prefix stay in the *old* family and are not scanned by the new family. This is correct: the two families cannot collide, because their strings differ.

**Note F-03 (Medium, DESIGN GAP):** `resolvePrefix` accepts a value only if it matches `/^[A-Z0-9]{2,6}$/`, which **does not accept a hyphen and is not trimmed**. A user entry such as `SAS INV`, `SAS-INV`, or ` inv` silently falls back to the default. This is safe, but the Settings UI does not tell the user. A silent fallback can produce an unexpected prefix. This is a bypass risk, not a data risk.

### 2.3 Per-module matrix

| Module | Settings key (`resolvePrefix` key) | Default | Cursor family key | Family built from resolved prefix? | Manual numbers leave cursor unchanged? | Legacy IDs stay in own family? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Invoice | `invoice` | `INV` | `${prefix}-` | Yes (`useInvoiceSave.ts` persist) | Yes (`!manualNumber` guard, two paths) | Yes |
| Quotation | `quotation` | `QTN` | `${prefix}-` | Yes (`quotationSaveTransaction.ts` and legacy path) | Yes | Yes |
| Waybill | `waybill` | `WBL` | `${prefix}-E-`, `-I-`, `-ME-`, `-MI-` | Yes (`getWaybillRoutingPrefix`) | Yes | Yes (four families) |
| Purchase Order | `purchase_order` | `PO` | `${prefix}-` | Yes (`purchaseOrderNumberFamily`) | Yes (`manualNumber.length === 0`) | Yes |
| CSR | `csr` | `CSR` | `${prefix}-` **or** `${prefix}-M-` via `csrFamilyFor` | Yes | Yes for the normal path; **No for the empty-field path (F-02)** | Yes |
| CPS | `cps_sheets` | `CPS` | `${prefix}-` | Yes (`useCpsSave.ts`) | Yes | Yes |
| RFQ | `rfq` | `RFQ` | `${prefix}-` | Yes | **Conditionally broken (F-01)** | Yes |
| Receipt | `receipt` | `RCP` | `${prefix}-` | Yes inside `getNextReceiptNumber` | N/A (system-only; no manual input) | Yes |
| Letter | `letter` | `LTR` | `${prefix}-` | Yes (`letterRepository.ts`) | Yes | Yes |

**Consequence for the reported example:** with a configured invoice prefix of `SASINV`, the cursor key is `__auto_seq['SASINV-']`. If the tenant had the default prefix, it is `__auto_seq['INV-']`. The key is **not** a stale hardcoded default. It is a run-time value. **The prior report line must be corrected to say `__auto_seq['<resolvedPrefix>-']`.**

### 2.4 F-04 (Medium, VERIFIED-RUNTIME): over-broad occupied-filter includes other families

`getNextInvoiceNumber` (`documentConversion.ts`) filters rows with only `value.startsWith(prefix.toUpperCase())`:

```ts
const occupied = upper.filter((value) => value.startsWith(prefix.toUpperCase()))
```

With prefix `INV`, this also collects `INVOICELEGACY-000007`. `findFreeSequence` then parses its trailing `7` and skips sequence 7. The same pattern appears in `getNextQuotationNumber`, `getNextCpsNumber`, `getNextRfqNumber`, `getNextReceiptNumber`, `getNextLetterNumber`, and `getNextPurchaseOrderNumber`.

**Effect:** the automatic sequence can skip valid numbers. It cannot produce a duplicate. **Severity is cosmetic, not integrity.** Recommendation: filter with `belongsToFamily(value, family)`.

---

## 3. Nine-Module `withUniqueRetry` Call-Site Matrix

### 3.1 The wrapper contract (`src/lib/withUniqueRetry.ts`, VERIFIED-SOURCE)

```ts
const hasManualCandidate = initialValue !== undefined && initialValue !== ''
let candidate = hasManualCandidate ? initialValue : await regenerateValue()
for (let attempt = 0; attempt <= maxRetries; attempt++) {   // default maxRetries = 3 → 4 attempts
  ...
  if (result.error.code === '23505') {
    if (hasManualCandidate) return result      // manual: surface, never replace
    if (attempt < maxRetries) { candidate = await regenerateValue(); continue }
  }
  return result
}
```

- Manual identity check: `initialValue !== undefined && initialValue !== ''`. **Only the caller decides this.**
- `23505` restarts regeneration for automatic candidates only.
- The retry calls the caller's `regenerateValue()`, which re-reads occupied rows **and** re-reads `fetchAutoCursor` on each call. This confirms that retries use fresh state for every module. **VERIFIED-SOURCE.**
- Limits are consistent: every caller uses the default `maxRetries = 3`.
- Dead code: the final `return { data: null, error: null as unknown as PostgrestError }` is unreachable. The loop always returns. **Cosmetic.**

### 3.2 The call-site matrix

Each row states how the caller decides "manual", which persistence path it uses, and whether it has a defect.

| # | Module / path | File:function | Manual identification | Auto path | 23505 regeneration | Manual originality exposed | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1a | Invoice — create (RPC) | `useInvoiceSave.ts` persist, `entityId && isCreate` | `input.numberIsManual ? payload.invoice_number : undefined`. `numberIsManual` = `invoice_number !== autoNumberRef.current` (`InvoiceFormPage.tsx:418`) | `regenerateInvoiceNumber` re-reads rows + cursor | Yes | Yes (returns `result`) | **OK** |
| 1b | Invoice — create (legacy insert) | `useInvoiceSave.ts` persist, pre-cutover | Same expression | Same | Yes | Yes | **OK** |
| 2a | Quotation — create (RPC) | `quotationSaveTransaction.ts` persistQuotationTransaction | `input.numberIsManual` (from `QuotationFormPage.tsx:530`) | `getNextQuotationNumber(rows, prefix, cursor)` | Yes | Yes | **OK** |
| 2b | Quotation — create (legacy) | `useQuotationSave.ts` persist, `isCreate` without `entityId` | Same | Same | Yes | Yes | **OK** |
| 3 | Waybill — create | `waybillMutations.ts` saveWaybill, `mode: 'new'` | `numberIsManual` = form number `!==` page pre-fill (`WaybillFormPage.tsx:187-189`). **Only caller** (`saveWaybill` is called at two places in that page; edit mode does not enter the retry) | `getNextWaybillNumber(..., cursor)` | Yes | Yes | **OK** (note F-11) |
| 4 | Purchase Order — create | `purchaseOrderService.ts` savePurchaseOrder | Explicit `params.manualNumber`; page sends it only when `typed !== autoNumberRef.current` (`PurchaseOrderFormPage.tsx:375`) | `getNextPurchaseOrderNumber(rows, prefix, cursor)` | Yes | Yes (`describeSaveError`) | **OK** |
| 5 | CSR — create | `CsrFormPage.tsx` handleSave | `csr.csr_number !== autoNumberRef.current` — **falls back to manual when empty** | `getNextCsrNumber(..., cursor, numbers)` | Yes | Yes | **F-02 (High)** |
| 6 | CPS — create | `useCpsSave.ts` persist | `input.numberIsManual` (`CpsFormPage.tsx:94-97`) | `getNextCpsNumber(rows, prefix, cursor)` | Yes | Yes | **OK** |
| 7 | RFQ — create | `NewRfq.tsx` handleSave | `String(rfq.rfq_number).trim() \|\| undefined` — **no auto/manual comparison** | `getNextRfqNumber(rows, prefix, cursor)` | Yes, **but not reached for a prefilled value** | No | **F-01 (High)** |
| 8a | Receipt — auto on payment | `paymentService.ts` (~line 205) | None. `receipt_number: ''` is set and overwritten by the candidate | `getNextReceiptNumber(rows, prefixes, cursor)` | Yes | N/A (system-only) | **OK** |
| 8b | Receipt — second path | `paymentService.ts` (~line 395) | None | Same | Yes | N/A | **OK** |
| 9 | Letter — create | `letterRepository.ts` createLetter | `input.letter_number` non-empty string (cast to `any`) | `getNextLetterNumber(rows, prefixes, cursor)` | Yes | Yes | **OK** (low risk, F-12) |

### 3.3 F-01 (High, VERIFIED-SOURCE): RFQ has no automatic path

```ts
// src/pages/NewRfq.tsx
const manualNumber = String(rfq.rfq_number || '').trim() || undefined;
```

If `RfqEditor` pre-fills possible RFQ numbers in the number field, **every** save passes that value as `initialValue`. The wrapper then treats it as a manual candidate: a race is never retried, and the user sees a "duplicate" error instead of a new number. If the editor leaves the field empty, the automatic path runs correctly.

**Consequence:** probable loss of collision retry on RFQ create. This depends on the editor's behaviour, which this audit did not exhaustively trace. **Verify `src/components/rfq/RfqEditor` before you fix.**

**Minimal reproduction:** open `/rfq/new`, accept the pre-filled number, open a second tab with the same pre-fill, and save both. The second save must fail with a duplicate error instead of retrying.

**Recommended fix (do not implement here):** use the same pattern as Invoice, PO, and CSR. Keep an `autoNumberRef` that stores the last system pre-fill, and compute `manualNumber = typed && typed !== autoNumberRef.current ? typed : undefined`.

### 3.4 F-02 (High, VERIFIED-SOURCE): CSR empty field becomes a manual candidate

```ts
// src/pages/CsrFormPage.tsx
const manualNumber =
  String(csr.csr_number || '').trim() && csr.csr_number !== autoNumberRef.current
    ? String(csr.csr_number).trim()
    : undefined
```

The first operand of the ternary yields `''` when the field is empty. The ternary then evaluates `undefined`. **This path is actually safe.**

The risk is in the *advance* guard:

```ts
if (!saveError && savedCsr && !manualNumber) { ... advanceAutoCursor ... }
```

This is correct. However, `autoNumberRef.current` is set **only** in the online branch of the init effect. In the **offline draft** branch (line ~186), the code sets `csr_number` from `peekNextOfflineCsrNumber()` but **does not set `autoNumberRef.current`**. If the user later saves online in the same session, `csr_number !== ''` and `autoNumberRef.current === ''`, so the pre-fill is classified as **manual**. Then:
- collision retry is disabled; and
- the automatic cursor is **not** advanced, even though the number came from the system.

**Consequence:** a cursor regression (cosmetic) plus loss of retry (integrity risk under concurrency). Severity High is justified because it weakens the uniqueness-safe path.

**Recommended fix:** set `autoNumberRef.current = nextNumber` in the offline branch as well.

### 3.5 F-11 (Low, VERIFIED-SOURCE): Waybill preview and save can differ

`waybillMutations.ts` computes a preview number at line 56 with `getNextWaybillNumber(type, existingNumbers, prefix)` — **no cursor**. Then the retry path at line 109 passes the cursor.

**Effect:** the preview can lag behind the cursor. **Impact is cosmetic** because the cursor-based candidate is re-derived in the retry closure.

**Related drift:** the same file's guard `if (!waybill.waybill_number && mode === 'new') errors.push('Waybill number is required')`. Combined with `numberIsManual` semantics in the page, this remains consistent. No integrity impact.

### 3.6 F-12 (Low): Letter manual detection is untyped

`letterRepository.ts` casts `input as any` to read `letter_number`. Semantics are correct. The risk is that a future schema change would not be caught by the type checker.

---

## 4. Historical Invoice Exception Analysis

### 4.1 What the migration actually does (VERIFIED-SOURCE)

`supabase/migrations/20261107120000_document_numbering_uniqueness_constraints.sql` **does not hardcode** the four reported IDs. Inside the `DO` block, for each `entity_%` schema with an `invoices` table:

```sql
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY invoice_number ORDER BY created_at ASC, id ASC) AS rn
  FROM %I.invoices WHERE invoice_number IS NOT NULL
)
SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]) FROM ranked WHERE rn > 1;
```

`v_dup_ids` is then passed through `%L`:

```sql
... WHERE invoice_number IS NOT NULL AND id != ALL(%L::uuid[]);
```

`%L` on a `uuid[]` produces `'{uuid1,uuid2}'`, and `'{…}'::uuid[]` is a valid cast. **The literal is valid.** (VERIFIED-SOURCE by PostgreSQL array-literal syntax. UNVERIFIED-LIVE because the migration has not been re-run.)

### 4.2 State of the six IDs (per the prior report's own table, HISTORICAL)

| Invoice number | Record ID | Prior report role | Included in the uniqueness index? |
| :--- | :--- | :--- | :--- |
| `SASINV-B028` | `aefbc9cd-db60-4074-8158-e429c1256efe` | Primary (created 2026-05-07 10:58:36) | **Yes** (rn = 1) |
| `SASINV-B028` | `5595c1e4-a084-44a8-9df9-b69b224c0b44` | Duplicate (2026-05-08 00:07:25) | **Excluded** (rn = 2) |
| `SASINV-B029` | `4aecef02-e717-4f39-8d11-3e18e148daf2` | Primary (2026-05-07 11:39:36) | **Yes** (rn = 1) |
| `SASINV-B029` | `c70b165c-4a8a-4456-a992-7651f39c5a9b` | Duplicate (2026-05-08 09:41:39) | **Excluded** (rn = 2) |

The four IDs appear **only** in `docs/reports/DOCUMENT-PLATFORM/final-numbering-authority-database-uniqueness-and-rich-text-repair.md`. They do **not** appear in the migration (as a literal) or in any other repository file.

### 4.3 Resulting uniqueness guarantee

**Guaranteed (INFERRED-SOURCE, depends on F-06):** at most one *included* row exists for any `invoice_number`. The two excluded rows are outside the index, so they can coexist with any included row.

**Limitation 1 — F-06 (High).** The exclusion set is **derived**, not pinned. The migration admits any number of duplicate secondary rows in any schema, and it gives no audit record of which IDs were excluded. If the preflight was wrong (for example, if `created_at` is null and the `id ASC` tie-break reorders the pair), the **excluded** row could be the "primary" one. Then the historical client document that stays outside the index is the wrong one. **The source cannot prove which row is excluded.** This is UNVERIFIED-LIVE.

**Limitation 2 — F-08 (High).** The guarantee that `aefbc9cd…` and `4aecef02…` stay protected holds **only if** the index already applied is the conditional variant. Because the migration uses `CREATE UNIQUE INDEX IF NOT EXISTS` (F-09), a pre-existing same-name index with a **total** definition would have succeeded instead. That is only possible if the duplicate rows were already resolved. No repository evidence shows this. UNVERIFIED-LIVE.

**Limitation 3 — deletion or renumbering of a primary record.** The excluded row becomes the **only** row with that number. Future inserts of that number are then **blocked** by the index only if a row with that number is still indexed. After a primary deletion, the excluded row is still outside the index, so a **third** row with `SASINV-B028` could be inserted with no index violation. **The partial index does not protect a number whose only remaining rows are excluded.** Two excluded rows with the same number could both exist at once.

**Recommended future policy (do not implement here):**
1. Replace the derived predicate with an explicit, documented `id IN ('5595c1e4…','c70b165c…')` predicate, and store the reason in a migration comment or a `documentation` table.
2. Move the two historical duplicates to a clearly labelled status (`superseded_by = <primary id>`) instead of leaving them indistinguishable — **if and only if** business policy allows a column-only change. Do not rename or delete.
3. Add a migration-time `RAISE NOTICE` that lists every excluded ID, so the deployment log is the audit record.
4. Add a read-only preflight test that fails when more than one row exists for a number outside the index.

---

## 5. Database Index Verification Matrix

> **All rows are UNVERIFIED-LIVE.** No catalog access was available. The "definition (source)" column is what the migration file will create, if it has not been skipped by `IF NOT EXISTS`.

### 5.1 Tenants discovered including `tenant_master_template` (VERIFIED-SOURCE, migration text)

`entity_bigdrops-main_adel`, `_agam`, `_agbado`, `_alarm`, `_allan`, `_anthropology`, `_azerbaijan`, `_issa-certified`, `_jig`, `_lomo`, `_main`, `_ogombo`, `_opaque`, `_ororo` — **14 tenant schemas**, plus `tenant_master_template`. The count matches the prior report.

`entity_bigdrops-main_test_probe` also appears in migration text. It is **not** a normal tenant and it is unclear whether the schema exists. Treat it as out of scope. UNVERIFIED.

### 5.2 Invoice — `idx_invoices_invoice_number_unique`

| Item | Value | Evidence |
| :--- | :--- | :--- |
| Column | `invoice_number` | Migration line 62-70 |
| Unique | Yes | `CREATE UNIQUE INDEX` |
| Predicate, 13 schemas | `WHERE invoice_number IS NOT NULL` | Migration line 70 |
| Predicate, `entity_bigdrops-main_main` | `WHERE invoice_number IS NOT NULL AND id != ALL(v_dup_ids::uuid[])` | Migration line 64 |
| Null excluded | Yes (`IS NOT NULL`) | Migration |
| Column nullability | `NOT NULL` in `invoices` DDL (`20260520090003_invoices.sql:11`) and template (`…tenant_template_seed.sql:239`) | VERIFIED-SOURCE |
| Excludes only the two intended IDs? | **Cannot be proven from source (F-06).** The predicate excludes whatever `ROW_NUMBER` ranks `rn > 1` |
### 5.3 CPS — `idx_cps_sheets_cps_number_unique`

| Item | Value |
| :--- | :--- |
| Schema/table | `<tenant>.cps_sheets`, `tenant_master_template.cps_sheets` |
| Column | `cps_number` |
| Unique | Yes |
| Predicate | `WHERE (cps_number IS NOT NULL)` |
| NULL excluded | Yes |
| Applied only when the table exists | `information_schema.tables` check |
| Live confirmation | UNVERIFIED |

### 5.4 RFQ — `idx_rfqs_rfq_number_unique`

| Item | Value |
| :--- | :--- |
| Schema/table | `<tenant>.rfqs`, `tenant_master_template.rfqs` |
| Column | `rfq_number` |
| Unique | Yes |
| Predicate | `WHERE (rfq_number IS NOT NULL)` |
| Column nullability | `NOT NULL` in the template DDL (`…tenant_template_seed.sql:697`) and in `20260520090002_quotations.sql:100` |
| Live confirmation | UNVERIFIED |

### 5.5 Receipt — `idx_receipts_number`

| Item | Value |
| :--- | :--- |
| Defined in | `20260706000000_create_receipts.sql:33`; template `…tenant_template_seed.sql:1249` |
| Column | `receipt_number` (`text NOT NULL`) |
| Unique | Yes |
| Predicate | **None (total index)** → F-10 |
| Live confirmation | UNVERIFIED |
| Prior report claim | It also claims a second index `receipts_receipt_number_idx`. **No such name was found in any migration.** That claim is UNVERIFIED and likely a naming error. |

### 5.6 Letter — `idx_letters_number`

| Item | Value |
| :--- | :--- |
| Defined in | `20260710000000_create_letters.sql:30`; template `…tenant_template_seed.sql:1257` |
| Column | `letter_number` (`text NOT NULL`) |
| Unique | Yes |
| Predicate | **None (total index)** → F-10 |
| Live confirmation | UNVERIFIED |
| Prior report claim | It also names `letters_letter_number_idx`. **No such name was found.** UNVERIFIED. |

### 5.7 CSR (context) — `idx_csrs_csr_number_unique`

Defined in `20260520090004_csrs.sql:97` and in the template seed at line 1220, with `WHERE (csr_number IS NOT NULL)`. It is cloned with `INCLUDING ALL` (Section 6). VERIFIED-SOURCE, not live-confirmed.

### 5.8 F-09 (Medium, VERIFIED-SOURCE): `IF NOT EXISTS` can hide a wrong definition

`CREATE UNIQUE INDEX IF NOT EXISTS name ...` **does not compare the definition.** If an index with the same name already exists with a different predicate or column set, PostgreSQL skips the statement and emits a notice. The migration does not check the definition after creation. The prior report says "Execution verified against `pg_indexes`" (§4.3), but the migration body does not contain a `pg_indexes` check. The verification must have been manual and is UNVERIFIED.

**Recommended read-only confirmation query (do not run from this audit):**

```sql
SELECT schemaname, indexname, indexdef
FROM pg_indexes
WHERE indexname IN (
  'idx_invoices_invoice_number_unique',
  'idx_cps_sheets_cps_number_unique',
  'idx_rfqs_rfq_number_unique',
  'idx_receipts_number',
  'idx_letters_number'
)
ORDER BY schemaname, indexname;
```

It must show 14+1 rows for each new index (where the table exists), and each predicate must match the source.

### 5.9 F-10 (Low, VERIFIED-SOURCE): null-identifier asymmetry

Invoice, CPS, RFQ, and CSR indexes are **partial** (`IS NOT NULL`). Receipt and Letter indexes are **total**. Because `receipt_number` and `letter_number` are `NOT NULL`, the effective behaviour is the same **today**. But if a future migration relaxes the column to nullable, a total unique index would stop matching the documented "partial-equality" convention. **No current data risk.** Recommendation: align the convention in a later migration, or document the difference.

### 5.10 F-13 (Low, VERIFIED-SOURCE): template DDL nullability drift

In `20260915194332_tenant_template_seed.sql:352`, one `receipt_number text` declaration is nullable, while line 593 (`tenant_master_template.receipts.receipt_number`) is `NOT NULL`. Confirm which table line 352 belongs to. If line 352 is the tenant clone pattern, the nullability is not uniform across schemas. UNVERIFIED-LIVE.

---

## 6. Corrected Tenant Provisioning Explanation

### 6.1 Actual implementation (VERIFIED-SOURCE)

`public._prov_clone_table` (latest definition in `20260902055836_tenant_master_template.sql:188`) runs:

```sql
CREATE TABLE %I.%I (LIKE %I.%I INCLUDING ALL);
```

It then **drops** every `contype = 'f'` constraint. Foreign keys are **re-added** by `public._prov_readd_foreign_keys` (defined in `20260717000000_entity_provisioning_engine.sql:260`), which re-points each FK to the target schema and names it `conname || '_clone'`.

### 6.2 Which constraint types are copied (PostgreSQL `LIKE ... INCLUDING ALL` semantics)

| Object | Copied by `INCLUDING ALL`? | Evidence |
| :--- | :--- | :--- |
| Columns, types, NOT NULL | **Yes** | PostgreSQL docs for `LIKE` |
| Column DEFAULTs and storage settings | Yes (`INCLUDING DEFAULTS`, `STORAGE`, `COMMENTS` are part of ALL) | PostgreSQL docs |
| **Non-unique indexes** | **Yes** | `INCLUDING INDEXES` is part of `ALL` |
| **Unique indexes (and `UNIQUE` constraints)** | **Yes** | Same mechanism |
| CHECK constraints | Yes (`INCLUDING CONSTRAINTS`) | PostgreSQL docs |
| **FOREIGN KEY constraints** | **NO** | `INCLUDING ALL` does not include FKs. The function also **drops** any that appear, then `_prov_readd_foreign_keys` adds them explicitly. |
| Triggers | NO | Installed separately: `_prov_install_canonical_triggers`, `_prov_install_accounting_triggers`, `_prov_install_tax_triggers` |
| RLS policies | NO | Installed separately: `_prov_install_rls` |
| Ownership / ACL | NO | Managed by the provisioning engine |
| Views | N/A | Installed separately: `_prov_install_financial_views` |

### 6.3 Correction of the prior report

The prior report §4.2 says:

> "`INCLUDING ALL` instructs PostgreSQL to clone all column defaults, check constraints, foreign keys, and indexes."

**This is false for foreign keys.** It is also contradicted by the prior report's own §4.2, which quotes `_prov_clone_table` — the same function that **drops** FKs. The prior report is **correct** that indexes (including unique indexes on `tenant_master_template`) are cloned into every new tenant.

**Correct statement:** `INCLUDING ALL` copies columns, defaults, NOT NULL, CHECK constraints, and **all indexes including unique indexes**. It does **not** copy foreign keys, triggers, or RLS policies. Foreign keys are re-added by separate provisioning logic.

**Consequence for numbering:** a new tenant **inherits** `idx_invoices_invoice_number_unique`, `idx_cps_sheets_cps_number_unique`, `idx_rfqs_rfq_number_unique`, `idx_receipts_number`, `idx_letters_number`, and `idx_csrs_csr_number_unique` automatically. **VERIFIED-SOURCE.**

**Important caveat:** a new tenant inherits the **unconditional** invoice predicate, because `tenant_master_template` has no historical duplicates (migration line 30). New tenants therefore get **stricter** invoice uniqueness than the legacy `_main` tenant. This is intended and correct.

---

## 7. Rich-Text Boundary and XSS Verification Matrix

All items were executed with read-only Bun REPL calls to `normalizeRichTextHtml` and `richTextToPlainText`. **VERIFIED-RUNTIME.**

### 7.1 Pipeline (VERIFIED-SOURCE, `src/components/pdf/core/richText.ts`)

1. Array input → `commercialRichTextToHtml`.
2. Empty string → `{ blocks: [] }`.
3. `hasSupportedHtml` regex tests for `p|div|br|li|ul|ol|h1-6|strong|b|em|i|u|span|a|script|style`.
4. **No HTML detected** → escape the whole string (`escapeHtml`) and split paragraphs.
5. Tokenizer: `<!--…-->|<\/?[a-z][a-z0-9:-]*(?:\s+[^>]*)?>|[^<]+|<+`.
6. Parser: **attributes are never read.** `tagName` alone drives behaviour. `<script>` and `<style>` push a `skipStack` and their content is discarded.
7. Render: each segment is re-escaped with `escapeHtml` and wrapped only in `<strong>`, `<em>`, or `<u>`.

**Sanitization is a whitelist re-serializer, not DOMPurify.** `DOMPurify` is used **only** at render time in `src/lib/richText.tsx:sanitizeRichTextHtml`, and only if `window.document` exists. **In Node and in PDF generation there is no DOMPurify layer.** The whitelist re-serializer is therefore the only protection, and it is sufficient because it **re-emits escaped text** rather than passing input through.

### 7.2 Required cases

| # | Case | Result | Evidence | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `5 < 10 & 20 > 15` | `<p>5 &lt; 10 &amp; 20 &gt; 15</p>`; plain text restored | Covered by test `richTextPipeline` "mathematical comparisons" | **Pass** |
| 2 | `<=` / `>=` | `a &lt;= b &gt;= c` | Covered by test | **Pass** |
| 3a | Literal `<p>` in plain text | **Split into two paragraphs** (`Text with` / `literal tag`). Content is preserved but the structure changes. | F-14 | **Defect (Low)** |
| 3b | Literal `<strong>` in plain text | Output `<p>Use <strong> for bold</strong></p>`. The word **"strong" disappears** from the plain text, and an unintended bold mark spans to the end of the line. | F-14 | **Defect (Medium)** |
| 3c | Literal `<a>` in plain text | Output `<p>See  here</p>`; the word **"a" is lost**; normalization is **not idempotent** on the first pass (`See  here` → `See here`). | F-14 | **Defect (Medium)** |
| 4 | Already-escaped `&lt;` / `&amp;` | `"Price &lt; 10"` → `Price &amp;lt; 10`; plain `Price &lt; 10` — **text-visual preservation is correct**. BUT `"Tom &amp; Jerry"` → `Tom &amp;amp; Jerry`; plain `Tom &amp; Jerry` — **the visible text changes**. | F-05 | **Defect (Medium)** |
| 5 | Malformed open tag `<p>unclosed` | `<p>unclosed</p>` | — | **Pass** |
| 6 | Malformed close tag `stray </p> text` | `<p>stray</p><p>text</p>` | — | **Pass** |
| 7 | Nested `<script>` / `<style>` | Content discarded (`<div><script>…</script>ok</div>` → `<p>ok</p>`) | — | **Pass** |
| 8 | `onclick` | `<p onclick="alert(1)">Click</p>` → `<p>Click</p>` | — | **Pass** |
| 9 | `javascript:` URL | `<a href="javascript:alert(1)">x</a>` → `<p>x</p>` | — | **Pass** |
| 10 | Valid nested formatting | `<strong><em>both</em></strong>` survives | Covered by test | **Pass** |
| 11 | Repeated normalization | Idempotent **except** case 3c (one pass) and case 4 (once per pass) | See 4 | **Defect (Low)** |

### 7.3 F-14 (Medium, VERIFIED-RUNTIME): legitimate text that contains whitelisted tag names is parsed as markup

**Minimal reproduction:**

```ts
normalizeRichTextHtml('Use <strong> for bold')
// → "<p>Use <strong> for bold</strong></p>"
richTextToPlainText(normalizeRichTextHtml('Use <strong> for bold'))
// → "Use  for bold"            // the word "strong" is lost
```

`hasSupportedHtml` matches `<strong>` and skips the plain-text escape path. The tokenizer then treats `<strong>` as a real tag. The parser can only see the tag name. It cannot tell a real opening tag from literal text.

**Why it matters:** the allowed tag set is small and includes `a`, `b`, `i`, `u`, `p`, `br`, `div`, `span`. Ordinary sentences such as "option A or B" are **not** affected (no angle brackets). Only literal `<a>` text is affected. This is **unlikely** input in business documents, but when it occurs, the exported PDF **loses a word** and the change is **not reversible**.

**Recommended fix (do not implement here):** before tokenising, treat `<name>` as literal text unless the matching `</name>` appears later in the string. Add regression tests for cases 3a, 3b, and 3c.

### 7.4 F-05 (Medium, VERIFIED-RUNTIME): already-escaped text is not detected

When plain text contains `&amp;`, the text does **not** match `hasSupportedHtml` (no tags). The whole string is passed to `escapeHtml`, which escapes the leading `&` too. **Each normalise pass adds one `&amp;`.**

**Mitigation in practice:** `useInvoiceSave`, `useQuotationSave`, and `normalizeRichTextSection` treat the stored HTML as HTML on the next save (it now contains `<p>`). The doubling therefore **does not** recur per save. The visible text is still wrong once.

**Recommended fix (do not implement here):** add a "contains HTML entities but no tags" branch that decodes known entities once before escaping. Add a test for `Tom &amp; Jerry`.

### 7.5 XSS conclusion

**No executable XSS path was found in this module.** Protection comes from whitelist re-serialization, not from attribute filtering. The frontend renderer (`src/lib/richText.tsx`) adds DOMPurify as defence in depth, but **only in a DOM environment**.

**Residual risk (UNVERIFIED):** no Content-Security-Policy was found in `index.html` or in a `vercel.json` headers block. If rich text is ever rendered with `dangerouslySetInnerHTML` **without** `sanitizeRichTextHtml`, DOMPurify would not protect the user. Current call sites (`InvoiceDocumentCard.tsx`, `contentProjection.ts`, etc.) all route through `normalizeRichTextHtml`. **No defect is proven.** Recommendation: keep the single renderer path, and add CSP `script-src 'self'` in a future hardening task.

---

## 8. Existing Test Coverage Assessment

Test counts were taken from `grep -c '^test('` (**VERIFIED-SOURCE**). **Tests were not run** in this audit. The "43 passed" result is **HISTORICAL** evidence from the prior report.

| File | Tests | Coverage of numbering/rich text | Gaps |
| :--- | :--- | :--- | :--- |
| `src/tests/critical/documentNumbering.test.js` | 21 | Canonical format, manual/auto separation, cursor monotonicity, family mapping, legacy variants, settings merge/reset, save-path **source scans** | The "save paths separate manual identity" test **scans source text only** (`assert.match(source, /numberIsManual/)`). It does not execute the call sites and does not cover **RFQ** manual detection, **offline CSR** `autoNumberRef`, or **catalog index definitions**. |
| `src/tests/pdf/richTextPipeline.test.js` | 5 | Formatting whitelist, script removal, newlines, `5 < 10`, `<=`/`>=` | **No tests** for literal `<p>`/`<strong>`/`<a>` text (F-14), escaped `&amp;` (F-05), malformed tags, `onclick`, `javascript:` URLs, or idempotency. |
| `src/tests/invoice/previewPipelineSync.test.js` | 4 | Preview/PDF structural parity, rich-text rendering | No numbering or boundary cases. |
| `src/tests/critical/additionalFieldsPreviewPdfAndBankPicker.test.js` | 5 | Additional fields and bank picker rendering | **No numbering coverage.** Unrelated to the repairs. |
| `src/tests/critical/purchaseOrderJsonImport.test.js` | 8 | PO JSON import item placement and immutability | **No PO numbering coverage.** |
| **Total** | **43** | — | Matches the prior report. |

**Assessment:** the count is accurate. But the coverage is **weaker than the report implies**. The most important save-path assertions are **regex scans of source text**, not behavioural tests of the call sites. Two High-severity defects (F-01, F-02) **pass** the current tests.

---

## 9. Findings Grouped by Severity

### High

| ID | Finding | Evidence | Consequence | Recommended action |
| :--- | :--- | :--- | :--- | :--- |
| **F-01** | RFQ `NewRfq.tsx` classifies any non-empty number as manual | VERIFIED-SOURCE | If the editor pre-fills, collision retry is disabled and the cursor never advances | Add `autoNumberRef`, compare as in Invoice/PO/CSR |
| **F-02** | CSR offline-draft init does not set `autoNumberRef.current` | VERIFIED-SOURCE | The pre-fill is treated as manual when the user saves online → no retry, no cursor advance | Set the ref in the offline branch |
| **F-06** | The invoice exception predicate is **derived**, not pinned to the two IDs | VERIFIED-SOURCE | The excluded (unprotected) historical row is not provably the intended one | Pin explicit IDs in a new migration; log the exclusions |
| **F-08** | Primary-record protection depends on which same-name index already existed | INFERRED-SOURCE / UNVERIFIED-LIVE | A total pre-existing index, or a different ranking, could protect the wrong row | Run the read-only `pg_indexes` query (5.8) |

### Medium

| ID | Finding | Evidence | Consequence | Recommended action |
| :--- | :--- | :--- | :--- | :--- |
| **F-03** | `resolvePrefix` silently falls back on any value outside `/^[A-Z0-9]{2,6}$/` (no hyphen, no trim) | VERIFIED-SOURCE | A user's prefix is silently ignored | Validate in the Settings UI with a clear message |
| **F-04** | The family filter uses `startsWith(prefix)` instead of `belongsToFamily` | VERIFIED-SOURCE | Unnecessary sequence skips | Use `belongsToFamily` |
| **F-05** | Already-escaped entities in plain text are double-escaped | VERIFIED-RUNTIME | The visible text changes on the first save | Decode known entities before escaping |
| **F-14** | Literal `<strong>`, `<a>`, `<p>` text is parsed as markup | VERIFIED-RUNTIME | Word loss; silent formatting changes | Pairing check; add regression tests |
| **F-09** | `CREATE UNIQUE INDEX IF NOT EXISTS` does not verify the definition | VERIFIED-SOURCE | An index with the same name but the wrong definition may be silently in force | Run the read-only catalog query; add an assertion |
| **F-15** | The prior report claims provisioning copies foreign keys | VERIFIED-SOURCE | A false statement in the design record | Correct the text (this report, §6) |
| **F-16** | The prior report claims the cursor is `__auto_seq['INV-']` (fixed) | VERIFIED-SOURCE | Misleads reviewers that the key is static | Correct to `__auto_seq['<resolvedPrefix>-']` |
| **F-17** | The prior report names indexes that do not exist (`receipts_receipt_number_idx`, `letters_letter_number_idx`) | VERIFIED-SOURCE | The design record cannot be trusted for Receipt and Letter | Use the real names `idx_receipts_number`, `idx_letters_number` |

### Low

| ID | Finding | Recommended action |
| :--- | :--- | :--- |
| **F-10** | Receipt and Letter indexes are total, not partial | Align the convention in a later migration, or document it |
| **F-11** | The Waybill preview allocator does not pass the cursor | Pass the cursor for display consistency |
| **F-12** | The Letter `manualNumber` is `any`-cast | Add a typed `letter_number?` field |
| **F-13** | Template seed nullability for `receipt_number` may drift | Confirm with the catalog query |
| **F-18** | `withUniqueRetry` ends with an unreachable `return` | Remove it |
| **F-19** | The `documentNumbering.test.js` "save-path" test uses source regex only | Replace with behavioural import tests |

---

## 10. Remaining Risks and Recommended Follow-Up

### 10.1 Risks that remain unproven

1. **No live catalog evidence (F-08, F-09, §5).** All index existence and predicate claims are migration-source only.
2. **The historical invoice exclusion set is unknown in the live database (F-06).** You cannot confirm which two IDs the deployed index excludes.
3. **The RFQ editor behaviour was not fully traced (F-01).** Whether it pre-fills decides the real impact.
4. **The scope of `entity_bigdrops-main_test_probe` is unclear.**
5. **No CSP was found (`index.html` / `vercel.json`).** The XSS surface is narrow but has no defence in depth.

### 10.2 Follow-up actions (recommended, not implemented)

| Priority | Action | Blocked on |
| :--- | :--- | :--- |
| 1 | Fix F-01 (RFQ `autoNumberRef`) | — |
| 1 | Fix F-02 (CSR offline `autoNumberRef`) | — |
| 1 | Run the read-only `pg_indexes` query (5.8) and attach the output to this report | Catalog access |
| 2 | Pin the invoice exception IDs in a new migration; emit a `RAISE NOTICE` that lists excluded IDs | Business sign-off |
| 2 | Fix F-05 and F-14 in the rich-text module; add the five missing tests | — |
| 3 | Replace the source-regex numbering test with behavioural tests for all ten call sites | — |
| 3 | Correct the prior report texts: F-15 (FK), F-16 (cursor key), F-17 (index names) | — |
| 4 | Align Receipt/Letter index predicates (F-10), fix F-04 family filter, remove F-18 dead code | — |

---

## 11. Evidence Register: Verified, Inferred, Historical, Unverified

### VERIFIED-SOURCE (repository text, read directly)
- `prefixConstants.ts`, `documentNumbering.ts`, `withUniqueRetry.ts`, and all numbered call sites.
- Migration `20261107120000…` predicates, `ROW_NUMBER` ranking, and `%L::uuid[]` literal.
- `_prov_clone_table` (both definitions) and `_prov_readd_foreign_keys`.
- `richText.ts` pipeline and `richText.tsx` renderer.
- Index definitions and nullability in the listed migrations.
- Prior report text (§2.2, §4.2, §6).

### VERIFIED-RUNTIME (Bun REPL, read-only, no writes)
- Cases 1–11 in §7.2.
- The `<a>` non-idempotency chain and the `&amp;` double-escape chain.

### INFERRED-SOURCE (logic, not observed)
- The behaviour of `INCLUDING ALL` (PostgreSQL documented semantics).
- The ranking choice under a null or reordered `created_at` (F-06).
- The effect of `IF NOT EXISTS` on a different definition (F-09).

### HISTORICAL (prior report only)
- The four duplicate invoice IDs and their "primary"/"duplicate" roles.
- The preflight "0 duplicates" for CPS and RFQ.
- The "43 passed" test result.
- "Migration pushed via `supabase db push`".
- "Verified against `pg_indexes`".

### UNVERIFIED (no read-only path)
- The existence, definition, and predicate of **every** index in **every** live schema.
- The actual excluded ID set in `entity_bigdrops-main_main`.
- That the migration was applied at all (hosted state).
- Whether a CSP exists on the deployed host.
- Whether `entity_bigdrops-main_test_probe` exists.
- The second claimed Receipt/Letter index names.

---

## 12. Scope Confirmation

- The only file created or modified by this audit is **this report** (one file):
  `docs/reports/FINAL-DOCUMENT-NUMBERING-AND-RICH-TEXT-VERIFICATION-ADDENDUM-2026-11-07.md`.
- **Path note (VERIFIED-SOURCE):** the task named `docs/Reports/`. On this case-insensitive filesystem, `docs/Reports/` and `docs/reports/` resolve to **one** directory. Its case on disk is `reports`. The git-visible path is `docs/reports/`. No second directory was created.
- `git status --porcelain` before the audit: 13,091 entries, hash `053392aadc2a2ba939434da2f4e3229f`.
- `git status --porcelain` after the audit: the same set of pre-existing entries **plus** this one new untracked report. Three entries changed state because of **concurrent external activity**, not this audit (see 12.1).
- Zero application source files, test files, migrations, SQL functions, database records, or configuration were changed.
- No migration was applied. No SQL was executed. No `.env` was read. No credentials were exposed.
- `bun run build`, `bun run typecheck`, and linting were **not** run, as required.

### 12.1 Concurrent working-tree activity detected (not caused by this audit)

This audit ran **only** read tools, one Bun REPL evaluation (in memory), and one file write (the report). It ran **no** `git checkout`, `git restore`, or `git stash`. A before/after comparison of `git status --porcelain` showed that **another process modified the working tree during the audit**.

| File | Observed change | Audit involvement |
| :--- | :--- | :--- |
| `src/components/cold-launch/preview-tree-geometry.ts` | `M` at audit start; reverted to HEAD by 09:33; now clean | **None.** Never opened or written. The mtime (09:33:12) is after the baseline snapshot (08:32). |
| `src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx` | Still `M`; mtime 09:33:24; diff grew by +21/−3 | **None.** Never opened for writing. |
| `src/tests/critical/toastQuickActionsNotificationsAndLogs.test.js` | Untracked (`??`) at baseline and at end; mtime 09:33:35 | **None.** Never opened for writing. |

**Evidence that this audit did not cause the change:** `git reflog` shows no checkout or restore event. No rebase, merge, or lock file exists. `.git/index` was refreshed at 09:39 by an external process. These files are outside the audit's subject scope, and none of them holds numbering or rich-text logic.

**Action taken: none.** In line with the instruction *"Do not revert unrelated user work"*, the files were left as found. **A human must confirm the state of `preview-tree-geometry.ts` and `ColdLaunchTenantTreePresentation.tsx` before any commit.**

---

## 13. Final Statement

The numbering architecture has a **solid shared design**. But it **cannot receive final unconditional sign-off** because of the following:

1. Two High-severity save-path defects (F-01 RFQ, F-02 CSR offline).
2. One High-severity historical-exception guarantee gap (F-06/F-08).
3. No live catalog evidence for any index claim.

**Conditional sign-off is possible** after F-01 and F-02 are fixed and the read-only `pg_indexes` query in §5.8 confirms **all 14 tenant schemas and `tenant_master_template`**. The rich-text module has **no proven XSS path**. Its remaining defects (F-05, F-14) are data-integrity issues and should be fixed separately.
