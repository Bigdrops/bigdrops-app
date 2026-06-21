```markdown
# Waybill Render Engine Contract (v1.0)

## 0. Purpose
The Waybill Render Engine produces a deterministic, immutable render model from raw waybill data.

It is responsible for:
* sanitization
* normalization
* column resolution
* blank preservation
* layout structuring (logical, not visual)

It is NOT responsible for:
* UI decisions
* column schema definition
* pagination rendering
* template layout logic
* data persistence
* placeholder generation

---

## 1. Core Principle: Printable Blank Preservation
The engine must never invent content for missing values.

### Rule
All of the following: `null`, `undefined`, `empty string`, `NaN`, `missing fields` ➡ resolve to: `""`.

### Forbidden outputs
`"N/A"`, `"—"`, `"Unknown"`, `"Null"`, `"undefined"`

### Exception
Static template lines (e.g. signature lines) are NOT engine-generated.

---

## 2. Input Contract
```typescript
interface WaybillRenderInput {
  waybill: RawWaybill;
  columns: ResolvedColumnConfig;
  company: CompanySettings;
}

```
 * **Notes**: ResolvedColumnConfig is already processed by Table Settings.
 * Engine does NOT compute visibility rules.
 * Engine does NOT derive schema from data.
## 3. Output Contract
```typescript
interface WaybillRenderModel {
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
## 4. Section Definitions (LOCKED FIELD MAP)
### 4.1 Branding
```typescript
interface BrandingBlock {
  name: string;
  tagline: string | null;
  logo: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

```
### 4.2 Header
```typescript
interface HeaderBlock {
  waybillNumber: string;
  date: string;
  time: string | null;
  poNumber: string | null;
}

```
### 4.3 Parties
```typescript
interface PartiesBlock {
  clientName: string | null;
  senderName: string | null;
  receiverName: string | null;
}

```
### 4.4 Logistics
```typescript
interface LogisticsBlock {
  vehiclePlate: string | null;
  driverName: string | null;
  deliveryMode: string | null; // source: transport_mode
  deliveryLocation: string | null;
  purpose: string | null;
}

```
### 4.5 Table
```typescript
interface TableBlock {
  columns: PrintColumn[];
  rows: PrintRow[];
}

```
 * **Column Model**: interface PrintColumn { key: string; label: string; }
   * *Note*: visibility is resolved upstream. Invisible columns do NOT exist here.
 * **Row Model**: interface PrintRow { cells: Record<string, string>; }
   * *Note*: always sanitized + blank-normalized.
### 4.6 Notes
notes: string
 * **Rules**: HTML stripped; null → ""; never raw HTML passed through.
### 4.7 Signatures
```typescript
interface SignatureBlock {
  sender: NormalizedSignature | null;
  receiver: NormalizedSignature | null;
}

interface NormalizedSignature {
  url: string;
  width: 110;
  height: 42;
}

```
 * **Critical rule**: Names belong ONLY in parties. No signing date exists in engine model. Missing values render as blank.
### 4.8 Footer
```typescript
interface FooterBlock {
  waybillNumber: string;
  companyName: string;
}

```
 * *Note*: Page numbers are NOT part of engine output.
### 4.9 Pagination Policy
```typescript
interface PaginationPolicy {
  repeatTableHeader: boolean;
  keepSignatureTogether: boolean;
  keepNotesTogether: boolean;
}

```
## 5. Engine Responsibilities
The engine MUST:
 * sanitize HTML (notes, text fields)
 * normalize blanks
 * merge qty + unit into display-ready values (if used upstream)
 * resolve column config into printable columns
 * strip all DB/internal fields (item_id, created_at, updated_at, custom_data, internal IDs)
 * normalize signatures
 * enforce deterministic output
## 6. Engine MUST NOT
 * define or mutate column schema
 * infer missing fields
 * generate placeholders
 * perform pagination layout
 * modify Table Settings state
 * read UI state directly
 * alter business logic (purpose, transport mode, etc.)
## 7. Determinism Rule
Same input + same config = identical render model.
 * **No**: timestamps, random IDs, runtime-generated labels, hidden mutations.
## 8. Blank Preservation Invariant
This is a system-wide rule. All empty values remain "".
 * Includes: logistics fields, branding fields, notes, parties, custom columns.
## 9. Section Layout Map
Branding → Header → Parties → Logistics → Table → Notes → Signatures → Footer → Pagination
## 10. Version Status
 * **Column system**: LOCKED
 * **Table structure**: LOCKED
 * **Blank handling**: LOCKED
 * **Signature model**: LOCKED
 * **Pagination policy**: PARTIALLY LOCKED
## 11. Open Decisions
 * Continuation page header style (post-MVP).
 * Future custom branding fields expansion (safe extension point only).
```

```
