# Future Maintenance Ticket — Sanitize Forbidden Internal Fields During Waybill Import

**Status:** Deferred / Backlog  
**Priority:** Low (Preventive Maintenance)  
**Category:** Data Hygiene  
**Created:** 2026-06-21

---

## Background

The Waybill Render Engine now serves as the **single authoritative enforcement point** for PDF rendering.

Internal database fields (such as `item_id`, `id`, `created_at`, etc.) are filtered inside:

```
src/domain/waybill/engine/resolvers/table.ts
```

before the `WaybillRenderModel` is produced.

This guarantees that internal fields can never appear in any PDF template.

---

## Why this ticket exists

During the architecture simplification, import-time filtering was intentionally removed from:

- `normalizeWaybillImport()`
- `normalizeWaybillItem()`
- `collectWaybillCustomColumns()`

This keeps rendering logic centralized inside the engine.

However, this also means imported JSON/CSV data may still persist internal fields inside:

- `custom_data`
- `custom_fields`

These values are harmless because the render engine ignores them, but they may accumulate in stored records over time.

---

## When to implement

Only implement this work if one or more of the following becomes true:

- Imported datasets frequently contain internal database fields.
- `custom_data` begins accumulating unwanted metadata.
- Storage cleanliness becomes a project requirement.
- Import validation is expanded into a formal sanitization pipeline.
- A database migration or cleanup initiative is scheduled.

Do **not** prioritize this work solely for PDF correctness, as that concern is already fully addressed by the render engine.

---

## Desired implementation

Introduce a dedicated import sanitization step before persistence.

The sanitizer should remove internal/system-managed fields such as:

- `item_id`
- `id`
- `created_at`
- `updated_at`
- `deleted_at`
- `custom_data`
- Other database-only metadata as appropriate

This sanitization should occur **only during import/persistence**, not during rendering.

---

## Design Principle

Maintain clear separation of responsibilities:

- **Import Layer**
  - Responsible for data validation and sanitization.

- **Waybill Render Engine**
  - Responsible for producing a clean `WaybillRenderModel`.
  - Remains the single rendering contract boundary.

- **PDF Templates**
  - Pure presentation components.
  - Never perform filtering or business logic.

---

## Optional Enhancement

If this work is undertaken, consider providing an import report summarizing:

- Removed internal fields
- Unknown fields encountered
- Imported custom fields
- Ignored metadata
- Total records sanitized

This would improve import transparency without affecting the rendering pipeline.

---

## Out of Scope

This ticket must **not**:

- Move filtering into PDF templates.
- Duplicate render-engine filtering.
- Change the Waybill Render Engine contract.
- Modify existing PDF template behavior.

The render engine should remain the single source of truth for rendering correctness.