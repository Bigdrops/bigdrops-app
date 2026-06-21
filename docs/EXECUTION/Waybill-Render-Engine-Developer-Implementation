```markdown
# Waybill Render Engine — Developer Implementation Prompt
## (Phase 0 → Phase 3 Build Sequence)

**Stack Context:** React 19 + Vite 7 + TypeScript 5.9 + Supabase + React-PDF
**Runtime constraint:** Bun (no npm/yarn assumptions in scripts)
**Goal:** Build a deterministic Waybill Render Engine strictly following the locked contract (v1.0)

---

## 🚨 HARD RULES (DO NOT BREAK)
* **Engine is a pure transformation layer only**
* No UI logic, no schema decisions, no pagination layout
* No placeholder text ever (Blank Preservation rule)
* No access to UI state (Table Settings already resolved upstream)
* No mutation of input objects
* No DB knowledge leaks into output model
* Output must be deterministic

---

## 🧩 INPUT CONTRACT
```typescript
interface WaybillRenderInput {
  waybill: RawWaybill;
  columns: ResolvedColumnConfig;
  company: CompanySettings;
}

```
## 🧩 OUTPUT CONTRACT
Must strictly produce: WaybillRenderModel (as defined in spec v1.0)
## 🪜 PHASE 0 — CORE INFRASTRUCTURE (Foundation Layer)
**Objective**: Set up pure transformation utilities and guarantees before any business logic.
### 0.1 Create Engine Folder Structure
src/domain/waybill/engine/
 * index.ts
 * types.ts
 * transform/
 * sanitizers/
 * mappers/
 * resolvers/
 * constants/
### 0.2 Implement Blank Normalizer (CRITICAL)
**File:** sanitizers/normalizeBlank.ts
```typescript
export function normalizeBlank(value: unknown): string {
  if (value === null || value === undefined || value === "" || Number.isNaN(value)) {
    return "";
  }
  return String(value);
}

```
 * **RULE:** This function is used everywhere. No exceptions.
### 0.3 HTML Sanitizer
**File:** sanitizers/sanitizeText.ts
```typescript
export function sanitizeText(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

```
### 0.4 Deterministic Clone Utility
```typescript
export function deepFreeze<T>(obj: T): T {
  return Object.freeze(JSON.parse(JSON.stringify(obj)));
}

```
## 🪜 PHASE 1 — FIELD MAPPING LAYER
**Objective**: Map raw DB → structured semantic blocks (NO table logic yet)
### 1.1 Branding Resolver
resolveBranding(company: CompanySettings)
 * Apply normalizeBlank to all optional fields.
 * Ensure safe null → "".
### 1.2 Header Resolver
resolveHeader(waybill)
 * Maps: waybill_number → waybillNumber, date → date, time → time (blank allowed), po_number → poNumber.
### 1.3 Parties Resolver
resolveParties(waybill)
 * Maps: client_name, sender_name, receiver_name.
 * All through normalizeBlank.
### 1.4 Logistics Resolver
resolveLogistics(waybill)
 * Maps: vehicle_plate, driver_name, transport_mode → deliveryMode, delivery_location, purpose.
### 1.5 Notes Resolver
resolveNotes(waybill.notes)
 * Pipeline: normalizeBlank → sanitizeText.
### 1.6 Signature Resolver
resolveSignatures(waybill.custom_fields)
 * Output: { sender: NormalizedSignature | null, receiver: NormalizedSignature | null }
 * **Rules:** width = 110, height = 42, missing = null.
## 🪜 PHASE 2 — TABLE ENGINE (CRITICAL CORE)
**Objective**: Build deterministic table output using resolved columns.
### 2.1 Column Resolver
resolveColumns(resolvedConfig)
 * Only include visible columns (already resolved upstream).
 * Output: PrintColumn[]. **NO visibility field allowed.**
### 2.2 Row Builder
buildRows(items, columns)
 * **Step A**: sanitize base fields (description, quantity, unit, condition).
 * **Step B**: cells[column.key] = normalizeBlank(value).
 * **Step C**: enforce blank preservation (missing values → "").
 * **Step D**: strip ALL forbidden fields (item_id, custom_data, created_at, updated_at).
### 2.3 Quantity + Unit Rule (ENGINE SIDE)
 * If needed upstream: qtyLabel = ${quantity} ${unit}``.
 * Never in template.
## 🪜 PHASE 3 — FINAL ASSEMBLY ENGINE
**Objective**: Compose final immutable render model.
### 3.1 Main Function
export function buildWaybillRenderModel(input: WaybillRenderInput)
### 3.2 Execution Order (STRICT)
 1. **Freeze input**: const safeInput = deepFreeze(input)
 2. **Resolve sections**: branding, header, parties, logistics, notes, signatures.
 3. **Resolve table**: columns = resolveColumns(input.columns), rows = buildRows(input.waybill.items, columns).
 4. **Assemble model**: Return object containing all blocks + pagination policy.
 5. **Final freeze**: return deepFreeze(model)
## 🧪 REQUIRED BEHAVIOR TESTS
 1. **Blank Preservation**: null, undefined, "" → "".
 2. **Column stripping**: Ensure item_id, custom_data never appear.
 3. **Determinism**: Same input → identical JSON output.
 4. **Signature absence**: Missing signature → null (NOT empty object).
 5. **Table integrity**: No invisible columns, no derived columns beyond resolved config.
## 🚫 FORBIDDEN IMPLEMENTATIONS
 * No React usage
 * No DOM logic
 * No PDF logic
 * No pagination math
 * No schema inference
 * No column generation from data
 * No placeholder strings
## 🧠 FINAL ARCHITECTURE SUMMARY
RAW WAYBILL
↓
SANITIZATION LAYER
↓
SECTION RESOLVERS
↓
TABLE ENGINE
↓
ASSEMBLY LAYER
↓
IMMUTABLE RENDER MODEL
↓
PDF TEMPLATE (ONLY RENDERING)
```

```
