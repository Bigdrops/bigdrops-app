# Document Numbering and Preview Integrity Repair Report

## 1. Executive Summary

This report documents the investigation and repair of two document-platform defects:
- Defect 1: Conflicting document numbering formats and sequence collision risk across document modules.
- Defect 2: Incomplete document preview omitting Notes, Terms, and multi-line line-break structure.

Both repairs are active in the application codebase. Automated tests verify numbering integrity and preview completeness.

---

## 2. Defect 1: Document Prefix Engine and Numbering Integrity

### 2.1 Problem Description
The document registry showed conflicting document identifiers for the same logical sequence:
- `SASINV-000130` alongside `SASINV130`
- `SASINV-000129` alongside `SASINV129`
- `SASINV-000128` alongside `SASINV128`

Historical records used unpadded format without hyphens (for example, `SASINV128`).
New records used canonical format with hyphens and six-digit padding (for example, `SASINV-000128`).

### 2.2 Root Cause Analysis
The investigation verified two architectural causes:

1. **Exact-String Lookup in `findFreeSequence`**:
   The skip-scan in `findFreeSequence` checked:
   ```ts
   occupiedSet.has(`${family}${String(seq).padStart(DOCUMENT_SERIAL_WIDTH, '0')}`)
   ```
   When sequence 128 existed as `SASINV128`, the lookup for `SASINV-000128` returned false.
   The engine concluded sequence 128 was available.
   The engine allocated `SASINV-000128`, creating duplicate logical numbers.

2. **Narrow Prefix Filtering in Document Number Generators**:
   Document number generators for Quotation, CPS, and RFQ filtered historical records using:
   ```ts
   value.startsWith(family) // family = `${prefix}-`
   ```
   Unhyphenated historical records (for example, `SASQUO432`) were discarded before sequence calculation.
   Additionally, sequence extraction used `match(/-(\d+)$/)`, which failed on unhyphenated records.

3. **Non-Conforming Generators**:
   Receipt and Letter modules used independent `maxSerial + 1` logic.
   They bypassed `nextAutomaticNumber`, automatic cursors, and collision skip-scans.

### 2.3 Cross-Module Audit
| Module | Previous Filter | Sequence Extraction | Prefix Engine Conformance |
| :--- | :--- | :--- | :--- |
| **Invoice** | `value.startsWith(prefix)` | `parseTrailingSequence` | Partial (failed on unpadded skip) |
| **Quotation** | `value.startsWith(`${prefix}-`)` | `match(/-(\d+)$/)` | Incomplete (missed unhyphenated) |
| **CPS** | `value.startsWith(`${prefix}-`)` | `match(/-(\d+)$/)` | Incomplete (missed unhyphenated) |
| **RFQ** | `value.startsWith(`${prefix}-`)` | `match(/-(\d+)$/)` | Incomplete (missed unhyphenated) |
| **Receipt** | `value.startsWith(prefix)` | `match(/(\d+)$/)` | Non-conforming (`maxSerial + 1`) |
| **Letter** | `value.startsWith(prefix)` | `match(/(\d+)$/)` | Non-conforming (`maxSerial + 1`) |
| **Waybill** | `value.startsWith(routingPrefix)` | `parseTrailingSequence` | Full |
| **Purchase Order** | `value.startsWith(prefix)` | `parseTrailingSequence` | Full |

### 2.4 Architecture Solution
1. **`belongsToFamily(identifier, family)` Utility**:
   Added to `src/domain/prefixConstants.ts`.
   Accurately detects whether an identifier belongs to a family:
   - Canonical identifiers: `SASINV-000128`
   - Short-padded/unpadded hyphenated identifiers: `SASINV-128`, `SASQUO-432`
   - Legacy unhyphenated variants: `SASINV128`, `SASQUO432`
   - Multi-token routing families: `WBL-E-`, `CSR-M-`

2. **Enhanced Sequence Skip-Scan in `findFreeSequence`**:
   Extracts all occupied sequence numbers within the family.
   The allocation loop checks:
   - Numerical sequence presence in `occupiedSeqs`
   - Exact candidate string presence in `occupiedSet`
   - Short and unhyphenated variants in `occupiedSet`
   This prevents sequence duplication across all format variations.

3. **Harmonized Generator Modules**:
   - `src/domain/quotation/normalize.ts`: Uses `upperPrefix` filtering and `parseTrailingSequence`.
   - `src/domain/cps/normalize.ts`: Uses `upperPrefix` filtering and `parseTrailingSequence`.
   - `src/domain/rfq/normalize.ts`: Uses `upperPrefix` filtering and `parseTrailingSequence`.
   - `src/domain/receipt/receiptNumber.ts`: Integrated with `nextAutomaticNumber`.
   - `src/domain/correspondence/letter/numbering.ts`: Integrated with `nextAutomaticNumber`.

---

## 3. Defect 2: Document Preview Completeness

### 3.1 Problem Description
The document preview card for Invoice `SASINV-000130` omitted Notes and Terms.
The invoice record contained multi-line technical notes:
- Equipment: YORC Diesel Engine
- Serial Number: Y2024-8841
- Location: Ikeja Industrial Estate
- Work Completed: Replaced crankshaft oil seal carrier and gasket, replaced engine oil, machined flywheel bolts.

### 3.2 Root Cause Analysis
The investigation verified two defects in the presentation pipeline:

1. **Omission in `InvoiceDocumentCard.tsx`**:
   `buildInvoicePreviewModel` in `src/domain/invoice/previewModel.ts` projected `previewNotesSections`.
   `InvoiceDocumentCard.tsx` did not extract or render `previewNotesSections`.
   The preview stopped after rendering totals and signatory.

2. **Newline Collapsing in `richText.ts`**:
   The rich text parser `parseRichText` in `src/components/pdf/core/richText.ts` processed plain text strings through:
   ```ts
   collapseTextWhitespace(rawText) // replaced \s+ with ' '
   ```
   Plain text notes without HTML tags had all `\n` characters replaced by single spaces.
   Line breaks were lost before reaching HTML rendering or PDF export.

### 3.3 Implementation Details
1. **Plain Text Newline Preservation**:
   Updated `parseRichText` in `src/components/pdf/core/richText.ts`.
   Detects text without HTML markup containing newline characters.
   Converts double newlines (`\n\n`) into `<p>` paragraphs.
   Converts single newlines (`\n`) into `<br />` breaks.
   Preserves formatting across Web Preview, Forme PDF templates, and Industry PDF templates.

2. **Notes Rendering in `InvoiceDocumentCard.tsx`**:
   - Extracts `previewNotesSections` from `previewModel`.
   - Implements fallback to `invoice.notes` and `invoice.terms`.
   - Renders sections after `totalsList` and before `signatoryBlock`.
   - Supports all section kinds:
     - `kind === 'html'`: Renders sanitized rich text via `renderRichTextContent`.
     - `kind === 'fields'`: Renders structured key-value rows.
     - `kind === 'links'`: Renders reference links.
     - Fallback: Renders plain text string.

3. **Style Tokens in `DocumentPreview.module.css`**:
   Added scoped CSS classes for `.notesBlock`, `.notesSection`, `.notesLabel`, `.notesContent`, `.notesFieldsGrid`, `.notesFieldItem`, `.notesFieldLabel`, `.notesFieldValue`, `.notesLinksList`, and `.notesLink`.

---

## 4. Verification and Validation Results

### 4.1 Automated Test Execution
1. **Document Numbering Critical Test Suite**:
   Command: `bun test src/tests/critical/documentNumbering.test.js`
   Result: 21 passed, 0 failed.
   Verified:
   - `belongsToFamily` detects canonical, unpadded, and legacy numbers.
   - `findFreeSequence` skips unpadded numbers (`SASINV128` skips to 131).
   - `getNextQuotationNumber` handles `SASQUO-432` and `SASQUO432`.
   - `getNextReceiptNumber` and `getNextLetterNumber` conform to prefix engine standard.

2. **Rich Text Pipeline Test Suite**:
   Command: `bun test src/tests/pdf/richTextPipeline.test.js`
   Result: 4 passed, 0 failed.
   Verified:
   - Plain text newlines preserve paragraphs and `<br />` breaks.
   - Output HTML and plain text match input data.

3. **Preview Pipeline Synchronization Test Suite**:
   Command: `bun test src/tests/invoice/previewPipelineSync.test.js`
   Result: 4 passed, 0 failed.
   Verified:
   - `InvoiceDocumentCard` renders `notesSections`.
   - Rich text renderer handles content.

4. **Additional Fields and Bank Picker Test Suite**:
   Command: `bun test src/tests/critical/additionalFieldsPreviewPdfAndBankPicker.test.js`
   Result: 5 passed, 0 failed.

5. **Static Typecheck and Architecture Gate**:
   - `bun run audit:load`: Passed (0 errors).
   - `bun run typecheck`: Passed (`tsc --noEmit` exited with code 0).
   - Hardware constraint respected: `bun run build` was not executed.

---

## 5. Operational and Security Impact Assessment

1. **Data Isolation**:
   No modifications were made to tenant schemas or database migrations.
   Historical database records remain untouched.

2. **Financial Integrity**:
   No modifications were made to `src/lib/Calculations.ts` or monetary formulas.
   Invoice totals and tax amounts remain exact.

3. **Collision Safety**:
   Numbering allocation guarantees monotonicity and uniqueness across legacy and canonical formats.
   Unique database constraints continue to arbitrate concurrent attempts with automatic retry.

---

## 6. Maintenance Rules and Architectural Invariants

1. All new document generators must delegate sequence allocation to `nextAutomaticNumber`.
2. Do not filter occupied lists using strict string equality when legacy variations exist.
3. Preserve plain text line breaks by routing text fields through `normalizeRichTextHtml`.
4. Document preview components must render `previewNotesSections` from the shared preview model.
