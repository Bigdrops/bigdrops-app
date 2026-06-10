# Waybill Upgrade Plan

> **Audit Date:** June 11, 2026
> **Spec:** `docs/WAYBILL_ARCHITECTURE.md` (387 lines)
> **Result:** 55% of spec missing, 25% partially implemented, 20% aligned

---

## Table of Contents

1. [Summary of Findings](#1-summary-of-findings)
2. [Gap Analysis by Dimension](#2-gap-analysis-by-dimension)
3. [P0 Bugs to Fix Immediately](#3-p0-bugs-to-fix-immediately)
4. [7-Phase Implementation Plan](#4-7-phase-implementation-plan)
5. [Dependency Graph](#5-dependency-graph)
6. [Risk Register](#6-risk-register)

---

## 1. Summary of Findings

| Dimension | Status | Coverage |
|---|---|---|
| Schema & DB | Partial | 60% |
| TypeScript Types | Missing | 30% |
| Sequence Engine | Fragile | 40% |
| Form (WaybillForm.tsx) | Partial | 50% |
| PDF (WaybillPDF.tsx) | Partial | 45% |
| View Page (WaybillViewPage.tsx) | Partial | 55% |
| List View (Waybills.tsx) | Wrong filter | 35% |
| Offline / Sync | Missing new cols | 70% |
| Blank Waybill Flow | Missing | 0% |
| JSON Import | Partial | 40% |
| Security (RLS) | Incomplete | 25% |

**Overall: 55% missing, 25% partial, 20% aligned.**

---

## 2. Gap Analysis by Dimension

### 2.1 Schema & DB

**Spec requirements:**
- `waybills` table: `type`, `date`, `time`, `sender_name`, `receiver_name`, `receiver_signature_url`, `receiver_description`, `client_id`, `client_name`, `project_id`, `invoice_id`, `po_number`, `vehicle_plate`, `delivery_location`, `items`, `notes`, `status`, `created_by`, `custom_fields` (jsonb), `transport_mode`, `purpose`
- `waybill_items` table: `serial_number`, `part_number` columns
- `custom_fields` must be `jsonb`, not `text`

**Current state (`20260520090004_csrs.sql`):**
- `custom_fields` is `text` — app sends `JSON.stringify()` but column is `text` type. P0 bug.
- `transport_mode` and `purpose` columns do not exist.
- `serial_number` and `part_number` do not exist in `waybill_items` (or equivalent in items_json).

**Gap:** `custom_fields` type mismatch, missing `transport_mode`, `purpose`, item `serial_number`, `part_number`.

---

### 2.2 TypeScript Types

**Spec requirements:** `WaybillType` (`'external' | 'internal'`), `WaybillStatus` (include `'returned'`), `transport_mode` (`'land' | 'air' | 'sea'`), `purpose` (`'delivered' | 'returned'`), `serial_number`, `part_number`.

**Current state (`waybillUtils.ts:28-53`):**
- `WaybillType`: `'internal' | 'external'` ✅
- `WaybillStatus`: `'pending' | 'in_transit' | 'delivered' | 'cancelled'` — missing `'returned'` ❌
- `transport_mode`: absent ❌
- `purpose`: absent ❌
- `serial_number` / `part_number`: absent from `WaybillItem` ❌

**Gap:** Missing `'returned'` status, `transport_mode`, `purpose`, `serial_number`, `part_number`.

---

### 2.3 Sequence Engine

**Spec requirement:** `getNextWaybillNumber()` parses max existing numeric suffix per type, increments by 1, zero-pads to 4 digits.

**Current state (`waybillUtils.ts:118-148`):**
- Uses `existingNumbers.length + 1` instead of parsing max suffix ❌
- Fragile: breaks if any waybill number doesn't match regex ❌
- Sort is ascending (oldest first) — should be descending ❌

**Gap:** Sequence engine logic is incorrect and fragile.

---

### 2.4 Form (WaybillForm.tsx)

**Spec requirements:**
- Transport Mode toggle (`land | air | sea`) — conditional fields
- Purpose segmented control (`delivered | returned`)
- Validation gates before save (sender_name, receiver_name, at least 1 item)
- `serial_number` and `part_number` fields per item row
- `hide_on_pdf` support per custom column

**Current state:**
- No Transport Mode toggle ❌
- No Purpose segmented control ❌
- Only `sender_name` validation — missing `receiver_name` and items validation ❌
- No `serial_number` / `part_number` fields ❌
- No `hide_on_pdf` toggle ❌

**Gap:** Transport mode, purpose, validation gates, serial/part number fields, hide_on_pdf all missing.

---

### 2.5 PDF (WaybillPDF.tsx)

**Spec requirements:**
- Labeled input blocks (not just plain text)
- Conditional columns based on `transport_mode`
- `hide_on_pdf` support — custom columns with `hide_on_pdf: true` should not render
- Transport mode and purpose badges
- `receiver_description` field

**Current state:**
- Plain text rendering — no labeled input blocks ❌
- No conditional columns ❌
- No `hide_on_pdf` filtering ❌
- No transport mode / purpose badges ❌
- `receiver_description` not rendered ❌

**Gap:** PDF needs labeled blocks, conditional columns, hide_on_pdf, badges, receiver_description.

---

### 2.6 View Page (WaybillViewPage.tsx)

**Spec requirements:**
- Empty dash rendering (`—`) for missing fields
- Transport mode and purpose badges
- `receiver_description` display

**Current state:**
- Partially renders waybill data
- No transport mode / purpose badges ❌
- No `receiver_description` display ❌

**Gap:** Missing transport_mode, purpose badges, receiver_description.

---

### 2.7 List View (Waybills.tsx)

**Spec requirements:**
- Filter by **type** (`[All] | [External] | [Internal]`)
- Purpose badges
- Internal card layout (compact)
- Sort descending (newest first)

**Current state:**
- Filters by **status** (`[All] | [Pending] | [Completed]`) — wrong dimension ❌
- No purpose badges ❌
- Sort ascending (oldest first) ❌

**Gap:** Wrong filter dimension, missing purpose badges, wrong sort order.

---

### 2.8 Offline / Sync

**Spec requirements:**
- `transport_mode` and `purpose` columns in `waybills_local`

**Current state (`waybillOffline.ts:120-146`):**
- `waybills_local` schema does not include `transport_mode` or `purpose` ❌
- Sync logic doesn't map new fields ❌

**Gap:** Missing `transport_mode` and `purpose` in offline schema and sync mapping.

---

### 2.9 Blank Waybill Flow

**Spec requirements:**
- Create blank waybill → fill offline → sync on reconnect
- Status `'draft'` for blank waybills

**Current state:**
- No blank waybill components exist ❌
- No `'draft'` status defined ❌

**Gap:** Entirely missing. Requires new components and status.

---

### 2.10 JSON Import

**Spec requirements:**
- Field visibility control
- Map `transport_mode`, `purpose` from imported JSON

**Current state (`WaybillImportSheet.tsx`):**
- Basic JSON import works
- No field visibility control ❌
- Doesn't map `transport_mode` or `purpose` ❌

**Gap:** Missing field visibility and new field mapping.

---

### 2.11 Security (RLS)

**Spec requirements:**
- SELECT, INSERT, UPDATE, DELETE policies on `waybills`

**Current state (`20260520090004_csrs.sql`):**
- Only SELECT policy exists ❌
- No INSERT/UPDATE/DELETE policies ❌

**Gap:** RLS is incomplete — only SELECT is allowed.

---

## 3. P0 Bugs to Fix Immediately

| # | Bug | File:Line | Impact |
|---|---|---|---|
| 1 | `custom_fields` sent as raw object but column is `text` | `waybillMutations.ts:27` | Data corruption or save failure |
| 2 | RLS has only SELECT — no INSERT/UPDATE/DELETE | `20260520090004_csrs.sql` | Writes fail in production |
| 3 | Sequence engine uses `length + 1` instead of max suffix | `waybillUtils.ts:130-134` | Duplicate waybill numbers after deletions |
| 4 | Sort is ascending (oldest first) | `Waybills.tsx:251-252` | UX confusing — newest should be first |
| 5 | Filter is by status, not by type | `Waybills.tsx:241-247` | Spec mismatch — users can't filter external/internal |

---

## 4. 7-Phase Implementation Plan

### Phase 1: Database Migration

**Goal:** Fix schema to match spec.

**Tasks:**
1. Alter `custom_fields` from `text` to `jsonb`
2. Add `transport_mode TEXT` column (default `'land'`)
3. Add `purpose TEXT` column (default `'delivered'`)
4. Add RLS INSERT/UPDATE/DELETE policies
5. Update `waybills_local` offline schema to include `transport_mode`, `purpose`

**Files:**
- New migration: `supabase/migrations/YYYYMMDD_waybill_schema_upgrade.sql`
- `src/lib/native/waybillOffline.ts` (update schema)

**Estimate:** 0.5 days

---

### Phase 2: TypeScript Types

**Goal:** Align types with spec.

**Tasks:**
1. Add `'returned'` to `WaybillStatus`
2. Add `TransportMode = 'land' | 'air' | 'sea'` type
3. Add `Purpose = 'delivered' | 'returned'` type
4. Add `transport_mode`, `purpose` to `Waybill` interface
5. Add `serial_number`, `part_number` to `WaybillItem` interface
6. Update `createDefaultWaybill()` to include new fields

**Files:**
- `src/components/waybill/waybillUtils.ts`

**Estimate:** 0.5 days

---

### Phase 3: Form & Validation

**Goal:** Add Transport Mode, Purpose, validation gates, serial/part number fields.

**Tasks:**
1. Add Transport Mode segmented control (land/air/sea)
2. Add Purpose segmented control (delivered/returned)
3. Add validation gates: sender_name, receiver_name, at least 1 item
4. Add `serial_number` and `part_number` fields per item row
5. Add `hide_on_pdf` toggle per custom column

**Files:**
- `src/components/waybill/WaybillForm.tsx`
- `src/components/waybill/waybillUtils.ts` (validation logic)

**Estimate:** 1.5 days

---

### Phase 4: List View

**Goal:** Fix filter dimension, add purpose badges, fix sort.

**Tasks:**
1. Change filter from status to type (`[All] | [External] | [Internal]`)
2. Add purpose badges (`delivered` / `returned`)
3. Fix sort to descending (newest first)
4. Add internal card layout (compact view for internal waybills)

**Files:**
- `src/pages/Waybills.tsx`

**Estimate:** 1 day

---

### Phase 5: View Page & PDF

**Goal:** Add labeled input blocks, conditional columns, badges, receiver_description.

**Tasks:**
1. Add labeled input blocks to PDF
2. Add conditional columns based on `transport_mode`
3. Filter custom columns with `hide_on_pdf: true`
4. Add transport_mode and purpose badges to PDF
5. Add `receiver_description` field to PDF and view page
6. Add transport_mode and purpose badges to view page

**Files:**
- `src/components/waybill/WaybillPDF.tsx`
- `src/components/document-view/waybill/WaybillViewPage.tsx`

**Estimate:** 1.5 days

---

### Phase 6: Blank Waybill Flow

**Goal:** Create blank waybill → fill offline → sync on reconnect.

**Tasks:**
1. Create blank waybill components
2. Add `'draft'` status to `WaybillStatus`
3. Implement blank waybill creation flow
4. Implement sync-on-reconnect for blank waybills

**Files:**
- New: `src/components/blank-waybill/`
- `src/components/waybill/waybillUtils.ts` (add `'draft'` status)

**Estimate:** 2 days

---

### Phase 7: JSON Import

**Goal:** Add field visibility and new field mapping.

**Tasks:**
1. Add field visibility control to import sheet
2. Map `transport_mode` and `purpose` from imported JSON
3. Map `serial_number` and `part_number` from imported JSON

**Files:**
- `src/components/waybill/WaybillImportSheet.tsx`

**Estimate:** 0.5 days

---

## 5. Dependency Graph

```
Phase 1 (DB Migration)
  └── Phase 2 (Types)
        ├── Phase 3 (Form & Validation)
        │     └── Phase 4 (List View)
        │           └── Phase 5 (View & PDF)
        ├── Phase 6 (Blank Waybill Flow) [independent]
        └── Phase 7 (JSON Import)
```

**Critical path:** Phase 1 → 2 → 3 → 4 → 5
**Phase 6** is independent and can be deferred if needed.
**Phase 7** depends on Phase 2 (types) but is independent of 3-5.

---

## 6. Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| `text` → `jsonb` migration loses data | Low | High | Backup before migration; use `ALTER COLUMN ... USING custom_fields::jsonb` |
| Sequence engine change breaks existing numbers | Medium | High | Test with production-like data; add migration to normalize existing numbers |
| Offline schema change breaks existing drafts | Medium | Medium | Version the offline schema; add migration for existing local data |
| Blank waybill flow adds scope creep | Medium | Low | Phase 6 is optional — can defer if timeline tight |
| RLS policy changes break existing access | Low | High | Test all CRUD operations after migration; use `GRANT` statements as fallback |

---

## Total Estimate

| Phase | Days |
|---|---|
| Phase 1 | 0.5 |
| Phase 2 | 0.5 |
| Phase 3 | 1.5 |
| Phase 4 | 1 |
| Phase 5 | 1.5 |
| Phase 6 | 2 |
| Phase 7 | 0.5 |
| **Total** | **7.5 days** |

Phase 6 (Blank Waybill Flow) accounts for 2 of 7.5 days. If deferred, total is **5.5 days**.
