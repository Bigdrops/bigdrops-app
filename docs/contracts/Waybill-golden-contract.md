# WAYBILL SYSTEM ARCHITECTURE SPEC (v1.0 — GOLDEN CONTRACT)
## 0. SYSTEM OVERVIEW
The Waybill system is a **three-layer deterministic rendering pipeline**:
Each layer has **strict ownership boundaries**.
## 1. CORE ARCHITECTURAL PRINCIPLE
### “Single Source of Truth per Concern”

| Concern | Owner |
| :--- | :--- |
| Column schema definition | Table Settings |
| Column visibility & order resolution | Table Settings |
| Data normalization | Render Engine |
| Blank handling | Render Engine |
| Layout decisions | PDF Templates |
| Pagination rendering | PDF Templates |

## 2. TABLE SETTINGS CONTRACT (v1.0)
### 2.1 Purpose
Table Settings defines the **authoritative column system** used across all Waybill documents. It does NOT render data or transform items; it ONLY defines structure.
### 2.2 Output Contract
```ts
interface ResolvedColumnConfig {
  standardColumns: ResolvedColumn[];
  customColumns: ResolvedColumn[];
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
}
```
### 2.3 Column Model
```ts
interface ResolvedColumn {
  key: string;
  label: string;
  type: 'standard' | 'custom';
  visible: boolean;
  orderIndex: number;
}
```
### 2.4 HARD RULES
Table Settings MUST:
 * Define ALL columns (standard + custom).
 * Resolve visibility and order.
 * Enforce max custom column limit (≤ 4).
 * Ensure stable deterministic keys.
 * Prevent duplicate column keys (normalized match).
### 2.5 FORBIDDEN RESPONSIBILITIES
Table Settings MUST NOT:
 * Modify row data, infer values, generate PDF layout, perform sanitization/blank handling, or know DB schema/PDF structure.
### 2.6 COLUMN KEY RULE (CRITICAL)
 * **Standard:** literal keys (e.g., "description", "quantity").
 * **Custom:** custom_<normalized_label> (e.g., custom_serial_no).
 * No timestamps allowed.
## 3. WAYBILL RENDER ENGINE CONTRACT (v1.0)
### 3.1 Purpose
Transforms: RawWaybill + ResolvedColumnConfig + CompanySettings → WaybillRenderModel (immutable).
### 3.2 Input Contract
```ts
interface WaybillRenderInput {
  waybill: RawWaybill;
  columns: ResolvedColumnConfig; // Already resolved
  company: CompanySettings;
}
```
### 3.3 Output Contract
```ts
interface WaybillRenderModel {
  type: 'internal' | 'external';
  branding: BrandingBlock;
  header: HeaderBlock;
  parties: PartiesBlock;
  logistics: LogisticsBlock;
  table: TableBlock;
  notes: string;
  signatures: SignatureBlock;
  footer: FooterBlock;
  pagination: PaginationPolicy;
}
```
### 3.4 CORE ENGINE RULES
 * **Blank Preservation (GLOBAL):** null | undefined | "" | NaN → "".
 * **Sanitization:** Apply richTextToPlainText().
 * **Stripping:** Remove item_id, created_at, custom_data.
 * **Determinism:** Always produce identical output for identical input.
## 4. TABLE ENGINE SPEC (ENGINE SIDE)
### 4.1 Column Resolution
Flatten into printable columns; respect visible === true and orderIndex.
### 4.2 Row Builder
```ts
interface PrintRow {
  cells: Record<string, string>;
}
```
 * Every column MUST exist in cells. Missing values → "".
### 4.3 qtyLabel RULE (LOCKED)
qtyLabel = ${quantity} ${unit}``. Always computed here, never in templates.
## 5. SECTION MODEL (ENGINE OUTPUT STRUCTURE)
 * **Branding:** Company identity only.
 * **Header:** type, waybillNumber, date, time, poNumber.
 * **Parties:** clientName, senderName, receiverName.
 * **Logistics:** vehiclePlate, driverName, deliveryMode, purpose, deliveryLocation.
 * **Table:** Fully resolved printable grid.
 * **Notes:** Sanitized plain text.
 * **Signatures:** NormalizedSignature or null.
 * **Footer:** waybillNumber, companyName.
 * **Pagination Policy:** repeatTableHeader, keepSignatureTogether, keepNotesTogether.
## 6. PDF TEMPLATE CONTRACT
Templates are **STRICTLY dumb renderers**.
 * **MAY:** Render text, apply layouts, call React-PDF pagination API, apply styles.
 * **MUST NOT:** Modify data, filter columns, compute qty/unit, decide visibility, or interpret DB structure.
## 7. TABLE SETTINGS → ENGINE BOUNDARY
### 7.1 Authority Flow
Table Settings (Defines) → Engine (Consumes Config) → Templates (Renders).
### 7.2 CUSTOM COLUMN RULE
Custom columns are defined ONLY in Table Settings. No other system may create columns.
## 8. INTERNAL vs EXTERNAL BEHAVIOR
Engine does **NOT** branch logic based on type. Templates may.
## 9. DETERMINISM RULE
Same input → identical output. No randomness, runtime inference, or hidden state.
## 10. SYSTEM GUARANTEES
 * No schema drift.
 * No duplicate column systems.
 * No template-side business logic.
 * No DB leakage into rendering.
## 11. FINAL ARCHITECTURE
 1. **TABLE SETTINGS** (authority)
 2. **RESOLVED COLUMN CONFIG**
 3. **WAYBILL RENDER ENGINE** (transformer)
 4. **WAYBILL RENDER MODEL** (immutable)
 5. **PDF TEMPLATES** (renderer)
 6. **FINAL PDF OUTPUT**
## 12. VERSION LOCK
 * **Systems:** Column, Engine Contract, Blank Handling, Signature Model are all **LOCKED**.
 * **Pagination:** Partially locked (visual style open).
## 13. OPEN DECISIONS
 * Visual style of continuation header (templates).
 * Branding layout variations per template family.