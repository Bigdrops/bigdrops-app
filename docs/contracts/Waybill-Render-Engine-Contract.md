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
