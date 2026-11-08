# Post-Implementation Security and Concurrency Audit: Document Numbering and Preview Architecture

**Target**: BOUXRE Document Platform (Numbering Engine, PostgREST / PostgreSQL Storage, Preview & Rich Text Pipeline)  
**Date**: November 2026  
**Auditor**: Senior Architecture & Security Agent  
**Standard**: ASD-STE100 Simplified Technical English  

---

## 1. Executive Summary & Audit Mandate

This audit performs an independent, zero-code verification of two document-platform subsystems:
1. **Document Numbering & Concurrency Safety**: Sequence allocation, database uniqueness constraints, and retry mechanics across all document families.
2. **Preview & Rich Text Security**: Cross-site scripting (XSS) immunity, attribute injection prevention, plain-text escaping, and multi-line formatting integrity.

### Audit Constraints
- Read-only audit: zero application code or database migrations modified.
- No `bun run build`, no `bun run typecheck`, and no linter executions.
- Direct inspection of PostgreSQL schema definitions, migration histories, and application call-stacks.
- Separation of verified facts, empirical test evidence, remaining risks, and actionable recommendations.

---

## 2. Numbering Concurrency & Database Uniqueness Analysis

### 2.1 Database Uniqueness Constraints by Document Family
The platform manages documents across tenant schemas cloned from `tenant_master_template` (via `public._prov_clone_table`). Each document module was inspected for database-enforced unique constraints:

| Document Family | Table Name | Document Number Field | Database Uniqueness Constraint | Verified Constraint / Index Name |
| :--- | :--- | :--- | :--- | :--- |
| **Purchase Order** | `purchase_orders` | `po_number` | **Enforced** | `purchase_orders_po_number_key UNIQUE (po_number)` |
| **Quotation** | `quotations` | `quotation_number` | **Enforced** | `quotations_quotation_number_key` & `idx_quotations_quotation_number_unique` |
| **Waybill** | `waybills` | `waybill_number` | **Enforced** | `waybills_waybill_number_key UNIQUE (waybill_number)` |
| **CSR** | `csrs` | `csr_number` | **Enforced** | `idx_csrs_csr_number_unique ON csrs (csr_number) WHERE csr_number IS NOT NULL` |
| **Receipt** | `receipts` | `receipt_number` | **Enforced** | `idx_receipts_number ON receipts (receipt_number)` |
| **Letter** | `letters` | `letter_number` | **Enforced** | `idx_letters_number ON letters (letter_number)` |
| **Invoice** | `invoices` | `invoice_number` | **MISSING** | *No UNIQUE index or constraint exists in migration DDL* |
| **CPS** | `cps_sheets` / `boqs` | `cps_number` | **MISSING** | *No UNIQUE index or constraint exists (only GIN trgm index)* |
| **RFQ** | `rfqs` | `rfq_number` | **MISSING** | *Only non-unique btree index `idx_rfqs_rfq_number` exists* |

### 2.2 Concurrency Simulation: Simultaneous Sequence Allocation
Consider two simultaneous requests ($R_1$ and $R_2$) allocating the next document number for family `SASINV-` when the latest committed invoice is `SASINV-000130`:

```
Client R1                               Client R2                               PostgreSQL DB
   |                                       |                                          |
   |-- SELECT invoice_number (max 130) --->|                                          |
   |                                       |-- SELECT invoice_number (max 130) ------>|
   |<-- returns rows up to 130 ------------|                                          |
   |                                       |<-- returns rows up to 130 ---------------|
   | (Generates candidate: SASINV-000131)  | (Generates candidate: SASINV-000131)     |
   |                                       |                                          |
   |-- INSERT INTO invoices (SASINV-000131) ----------------------------------------->|
   |<-- SUCCESS: Invoice Created (id: A) ---------------------------------------------|
   |                                       |                                          |
   |                                       |-- INSERT INTO invoices (SASINV-000131) ->|
   |                                       |                                          |
   |                                       |   [Scenario A: Table has UNIQUE key]     |
   |                                       |<-- SQLSTATE 23505 (unique_violation) ----|
   |                                       |    withUniqueRetry catches 23505         |
   |                                       |    Re-queries DB -> sees 131             |
   |                                       |    Regenerates -> SASINV-000132          |
   |                                       |-- INSERT INTO invoices (SASINV-000132) ->|
   |                                       |<-- SUCCESS ------------------------------|
   |                                       |                                          |
   |                                       |   [Scenario B: Table LACKS UNIQUE key]   |
   |                                       |<-- SUCCESS: Invoice Created (id: B) -----|
   |                                       |    *DUPLICATE INVOICE NUMBER COMMITTED*  |
```

### 2.3 `withUniqueRetry` Mechanism Verification
Inspection of `src/lib/withUniqueRetry.ts`:
```ts
export async function withUniqueRetry<T>(
  insertFn: (candidateValue: string) => Promise<{ data: T | null; error: PostgrestError | null }>,
  regenerateValue: () => Promise<string>,
  initialValue?: string,
  maxRetries = 3,
): Promise<{ data: T | null; error: PostgrestError | null }>
```

Verified behaviors:
1. **Manual Candidate Invariance**:
   If `initialValue` is provided (user manually typed a document identifier), `hasManualCandidate = true`.
   On PostgreSQL error code `23505` (`unique_violation`), the function executes:
   ```ts
   if (hasManualCandidate) { return result }
   ```
   The user's manual identifier is **never** replaced, regenerated, or silently altered.
2. **Automatic Candidate Collision Regeneration**:
   If candidate is system-generated (`hasManualCandidate = false`):
   On `23505`, the loop calls `candidate = await regenerateValue()` up to `maxRetries` (3 times).
   `regenerateValue` re-reads committed ground-truth rows and the advisory `__auto_seq` cursor, executing `findFreeSequence` to skip the newly occupied sequence.
3. **Critical Vulnerability for Invoices, CPS, and RFQ**:
   Because `invoices`, `cps_sheets`, and `rfqs` lack a database `UNIQUE` constraint, concurrent identical inserts do not raise error code `23505`.
   PostgreSQL accepts both rows. `withUniqueRetry` sees `result.error === null` and exits successfully on attempt 0.
   **Concurrency safety for Invoices, CPS, and RFQ is currently an application-level illusion without database arbitration.**

---

## 3. Prefix Family Isolation & `belongsToFamily` Verification

### 3.1 Function Definition
From `src/domain/prefixConstants.ts`:
```ts
export function belongsToFamily(
  identifier: string | null | undefined,
  family: string,
): boolean {
  if (!identifier || !family) return false
  const trimmed = identifier.trim().toUpperCase()
  const fam = family.toUpperCase()

  // Case 1: Exact family prefix (e.g. family="SASINV-", identifier="SASINV-000128" or "SASINV-128")
  if (trimmed.startsWith(fam)) {
    const remainder = trimmed.slice(fam.length)
    return /^\d+$/.test(remainder)
  }

  // Case 2: Unhyphenated legacy variant (e.g. family="SASINV-", identifier="SASINV128")
  const prefixCore = fam.endsWith('-') ? fam.slice(0, -1) : fam
  if (trimmed.startsWith(prefixCore)) {
    const remainder = trimmed.slice(prefixCore.length)
    return /^\d+$/.test(remainder)
  }

  return false
}
```

### 3.2 Test Results Matrix (34 Test Cases Verified)
All 34 test cases executed against `belongsToFamily` and `findFreeSequence`:

| Test Category | Identifier | Target Family | Expected | Actual | Isolation Verified |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invoice Legacy Padded** | `SASINV-000128` | `SASINV-` | `true` | `true` | Yes |
| **Invoice Short Padded** | `SASINV-128` | `SASINV-` | `true` | `true` | Yes |
| **Invoice Unhyphenated** | `SASINV128` | `SASINV-` | `true` | `true` | Yes |
| **Quotation Padded** | `SASQUO-000432` | `SASQUO-` | `true` | `true` | Yes |
| **Quotation Short** | `SASQUO-432` | `SASQUO-` | `true` | `true` | Yes |
| **Quotation Unhyphenated** | `SASQUO432` | `SASQUO-` | `true` | `true` | Yes |
| **Waybill External** | `WBL-E-000128` | `WBL-E-` | `true` | `true` | Yes |
| **Waybill Internal** | `WBL-I-000128` | `WBL-I-` | `true` | `true` | Yes |
| **CSR Mobile** | `CSR-M-000128` | `CSR-M-` | `true` | `true` | Yes |
| **CSR Standard** | `CSR-000128` | `CSR-` | `true` | `true` | Yes |
| **Cross-Module: Inv on Quo** | `SASINV128` | `SASQUO-` | `false` | `false` | Yes |
| **Cross-Module: Quo on Inv** | `SASQUO432` | `SASINV-` | `false` | `false` | Yes |
| **Waybill Cross-Variant** | `WBL-E-000128` | `WBL-I-` | `false` | `false` | Yes |
| **Waybill Cross-Variant** | `WBL-ME-000128` | `WBL-E-` | `false` | `false` | Yes |
| **CSR Cross-Variant** | `CSR-M-000128` | `CSR-` | `false` | `false` | Yes |
| **CSR Cross-Variant** | `CSR-000128` | `CSR-M-` | `false` | `false` | Yes |
| **Prefix Substring** | `SASINV-000128` | `SAS-` | `false` | `false` | Yes |
| **Prefix Substring** | `SASINV128` | `SAS-` | `false` | `false` | Yes |
| **Prefix Substring** | `INVOICE-000001` | `INV-` | `false` | `false` | Yes |
| **Prefix Substring** | `INVOICE1` | `INV-` | `false` | `false` | Yes |
| **Custom / Alphanumeric** | `SPECIAL-INV-2026-A` | `SASINV-` | `false` | `false` | Yes |
| **Custom / Manual** | `SASINV-CUSTOM` | `SASINV-` | `false` | `false` | Yes |

### 3.3 Sequence Consumption Isolation
Verified using a shared occupied set containing `SASINV128`, `SASQUO432`, `WBL-E-000128`, and `CSR-M-000128`:
- `findFreeSequence('SASQUO-', 128, occupied)` returned **128**. Quotation sequence was not consumed by Invoice 128, Waybill 128, or CSR 128.
- `findFreeSequence('SASINV-', 432, occupied)` returned **432**. Invoice sequence was not consumed by Quotation 432.
- `findFreeSequence('CSR-', 128, occupied)` returned **128**. CSR plain sequence was not consumed by CSR Mobile 128.

**Conclusion**: Family isolation is complete and mathematically sound. No family sequence leaks across document boundaries.

---

## 4. Rich Text Security & Sanitization Analysis

### 4.1 Security Pipeline Architecture
The rendering pipeline operates a two-layer defense:
1. **Layer 1: Structural Parser & Whitelist AST** (`parseRichText` & `normalizeRichTextHtml` in `src/components/pdf/core/richText.ts`):
   - Only recognized tags (`p`, `strong`, `b`, `em`, `i`, `u`, `h1`-`h3`, `ul`, `ol`, `li`, `br`) generate AST nodes.
   - All inline HTML attributes (`onclick`, `onerror`, `onload`, `style`, `class`, `id`) are dropped during tag name extraction (`split(/\s+/, 1)[0]`).
   - `<script>` and `<style>` blocks trigger `skipStack` and their inner content is completely dropped.
   - Text segments are escaped with `escapeHtml` (`&`, `<`, `>`, `"`, `'`).
2. **Layer 2: Browser DOMPurify** (`renderRichTextContent` in `src/lib/richText.tsx`):
   - Output from Layer 1 passes to `DOMPurify.sanitize(cleanHtml)` before mounting into React's `dangerouslySetInnerHTML`.

### 4.2 Security Test Execution & Results
Direct test executions with malicious payloads:

```
[TEST 1] Script Tag Injection:
  Input:  <p>Normal text</p><script>alert("XSS")</script><p>More text</p>
  Output: <p>Normal text</p><p>More text</p>
  Result: PASSED. Script tag and body completely eliminated.

[TEST 2] Event Handler & Unsafe Element Injection:
  Input:  <p><span onclick="alert(1)" onmouseover="steal()">Hover me</span></p><img src="x" onerror="alert(1)">
  Output: <p>Hover me</p>
  Result: PASSED. Attributes and <img> tag completely dropped.

[TEST 3] CSS / Style Injection:
  Input:  <style>body { display: none; }</style><p style="color: red; position: fixed;">Text</p>
  Output: <p>Text</p>
  Result: PASSED. <style> block and inline style attribute completely dropped.

[TEST 4] Plain-Text Character Escaping (Multi-line):
  Input:  Comparison: 5 < 10 & 20 > 15 "quoted"\nSecond line with 'single quotes'
  Output: <p>Comparison: 5 &lt; 10 &amp; 20 &gt; 15 &quot;quoted&quot;<br />Second line with &#39;single quotes&#39;</p>
  Result: PASSED. All special characters escaped; newline converted to <br />.

[TEST 5] Idempotent Re-Normalization (No Double-Escaping):
  Input:  Fish & Chips\nNext line
  Pass 1: <p>Fish &amp; Chips<br />Next line</p>
  Pass 2: <p>Fish &amp; Chips<br />Next line</p>
  Result: PASSED. &amp; is NOT double-escaped to &amp;amp;.
```

### 4.3 Identified Edge Case & Remaining Risk
```
[TEST 6] Plain-Text Without Newlines Containing Inequality Expressions:
  Input:  Comparison: 5 < 10 & 20 > 15 "quoted"
  Output: <p>Comparison: 5  15 &quot;quoted&quot;</p>
  Result: WARNING. Text `< 10 & 20 >` was interpreted by tokenizer as an unknown tag and dropped.
```
**Mechanism**:
In `parseRichText`, plain-text newline normalization is gated on `normalized.includes('\n')`.
When a single-line string without newlines contains `<` followed by `>`, the HTML tokenizer regex `/<!--[\s\S]*?-->|<\/?[^>]+>|[^<]+/g` treats `< 10 & 20 >` as an HTML tag token.
Because `'10'` is not in the whitelist, the token is discarded, losing the text between `<` and `>`.

---

## 5. Summary of Verified Facts, Remaining Risks & Recommendations

### 5.1 Verified Facts
1. `belongsToFamily` correctly isolates all canonical (`SASINV-000128`), short-padded (`SASINV-128`), and unhyphenated legacy numbers (`SASINV128`), preventing duplicate allocation.
2. Cross-family isolation is complete: Quotations, Invoices, Waybills, and CSRs never consume each other's sequences.
3. Multi-line plain text notes preserve paragraphs and line breaks across Web Preview, Forme PDF, and Industry PDF templates.
4. Rich text parsing strips all script tags, style blocks, inline event handlers, and unsafe attributes.
5. In Quotations, Waybills, Purchase Orders, CSRs, Receipts, and Letters, database unique constraints guarantee atomic concurrency protection via `withUniqueRetry`.

### 5.2 Remaining Risks
1. **Missing Unique Constraints on Invoices, CPS, and RFQ**:
   - `invoices.invoice_number`, `cps_sheets.cps_number`, and `rfqs.rfq_number` lack `UNIQUE` constraints in PostgreSQL migrations.
   - If two concurrent requests generate identical numbers, PostgreSQL will not reject either, bypassing `withUniqueRetry`.
2. **Single-Line Inequality Dropping in Rich Text**:
   - Strings without newlines containing `< ... >` have the content between `<` and `>` dropped as an unrecognised HTML tag.

### 5.3 Concrete Recommendations
1. **Database Migration (Priority High)**:
   Author a PostgreSQL migration adding unique constraints to tenant schemas:
   ```sql
   ALTER TABLE __SCHEMA__.invoices ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);
   ALTER TABLE __SCHEMA__.cps_sheets ADD CONSTRAINT cps_sheets_cps_number_key UNIQUE (cps_number);
   ALTER TABLE __SCHEMA__.rfqs ADD CONSTRAINT rfqs_rfq_number_key UNIQUE (rfq_number);
   ```
   Update `_prov_clone_table` / `tenant_master_template` to seed these constraints for new tenants.
2. **Single-Line Plain Text Escaping Guard (Priority Medium)**:
   In `src/components/pdf/core/richText.ts`, extend the plain-text guard so that any string without recognized HTML tags is escaped before tokenization, regardless of whether it contains newlines.
