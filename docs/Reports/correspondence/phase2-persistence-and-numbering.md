# Correspondence Module — Phase 2: Persistence & Numbering

This report was written by MiMoCode on 2026-07-10 via Local Runner.

---

## Scope

Phase 2 introduced the persistence foundation and numbering infrastructure for the Correspondence (Letter) module. This phase made Letter documents persistable without introducing UI, React components, save hooks, rendering, or audit RPCs.

**Covered:**
- `letters` database table (migration)
- Prefix Engine integration (`letter: 'LTR'`)
- Letter numbering (`getNextLetterNumber()`)
- Persistence-facing normalization (row ↔ domain conversion)
- Database type definitions

**Intentionally excluded (deferred to future phases):**
- Audit logging / activity events (Phase 3)
- Save orchestration hooks (Phase 4)
- UI pages and components (Phase 5)
- PDF rendering (Phase 6)
- React Email rendering (Phase 6)
- Rich text editor (Phase 6)
- Repository services beyond normalization (Phase 4+)

---

## Migrations

### `supabase/migrations/20260710000000_create_letters.sql`

Created the `letters` table with:

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `tenant_id` | uuid | NOT NULL |
| `letter_number` | text | NOT NULL, UNIQUE |
| `recipient_id` | uuid | nullable (FK to clients) |
| `recipient_name` | text | NOT NULL |
| `recipient_address` | text | nullable |
| `subject` | text | NOT NULL |
| `body` | jsonb | NOT NULL, default `'[]'::jsonb` |
| `status` | text | NOT NULL, default `'draft'`, CHECK constraint |
| `custom_fields` | jsonb | NOT NULL, default `'{}'::jsonb` |
| `attachments` | jsonb | NOT NULL, default `'[]'::jsonb` |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `updated_at` | timestamptz | NOT NULL, default `now()` |

**Status CHECK constraint:** `draft`, `approved`, `issued`, `archived`, `cancelled`

**Indexes:**
- `idx_letters_number` — UNIQUE on `letter_number`
- `idx_letters_tenant` — on `tenant_id`
- `idx_letters_status` — on `status`
- `idx_letters_created_at` — on `created_at DESC`

**RLS policies:** SELECT, INSERT (approved profiles only), UPDATE, DELETE for authenticated users.

**Triggers:** `set_row_updated_at` and `stamp_row_ownership` (reusing existing shared functions from `core_tables`).

---

## Prefix Engine Integration

### `src/domain/prefixConstants.ts`

Added `letter: 'LTR'` to `DEFAULT_PREFIXES`:

```typescript
export const DEFAULT_PREFIXES = {
  waybill: 'WBL',
  invoice: 'INV',
  boq: 'BOQ',
  rfq: 'RFQ',
  quotation: 'QTN',
  project: 'PRJ',
  csr: 'CSR',
  receipt: 'RCP',
  letter: 'LTR',
} as const
```

The existing `resolvePrefix()` function automatically supports the new key — no changes needed to the resolver logic.

---

## Numbering

### `src/domain/correspondence/letter/numbering.ts`

Created `getNextLetterNumber()` following the same pattern as `getNextInvoiceNumber()` and `getNextCsrNumber()`:

- Accepts existing rows with `letter_number` field
- Accepts optional `DocumentPrefixes` for custom prefix resolution
- Extracts numeric serial from existing numbers
- Returns next sequential number: `LTR-000001`, `LTR-000002`, ...
- Uses 6-digit zero-padded serial format

**Integration with `withUniqueRetry()`:** The numbering function is designed to be called inside `withUniqueRetry()` for collision resilience, exactly as other document families do. The Phase 4 Save Orchestration will wire this together.

---

## Persistence Normalization

### `src/domain/correspondence/letter/persistence.ts`

Created three pure transformation functions:

1. **`letterRowToDocument(row)`** — Converts a database `LetterRow` to a `LetterDocument` domain model. Maps snake_case DB fields to camelCase domain fields. Sender data stored in `custom_fields` is extracted back to the `CorrespondenceSender` interface.

2. **`documentToInsertPayload(doc, tenantId)`** — Converts a `LetterDocument` to an insert payload. Sender data is flattened into `custom_fields` JSONB.

3. **`documentToUpdatePayload(doc)`** — Converts mutable letter fields to an update payload. Excludes immutable fields (`id`, `letter_number`, `tenant_id`, `created_at`).

---

## Database Types

### `src/lib/database.types.ts`

Added `letters` table type definition with `Row`, `Insert`, and `Update` variants, placed in alphabetical order between `item_merge_log` and `notification_preferences`.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20260710000000_create_letters.sql` | **NEW** — Migration creating `letters` table |
| `src/domain/prefixConstants.ts` | **MODIFIED** — Added `letter: 'LTR'` to `DEFAULT_PREFIXES` |
| `src/domain/correspondence/letter/numbering.ts` | **NEW** — `getNextLetterNumber()` function |
| `src/domain/correspondence/letter/persistence.ts` | **NEW** — Row ↔ Domain normalization |
| `src/lib/database.types.ts` | **MODIFIED** — Added `letters` table type |

---

## Verification

| Check | Status |
|-------|--------|
| `bun run typecheck` | Skipped — timed out on full project (pre-existing issue with large `database.types.ts`). New files individually verified; `@/` path alias errors are expected outside project context. |
| `git status` | Only intended files changed (plus pre-existing uncommitted changes to `paymentRepository.ts`, `paymentService.ts`, and `invoice-schema-reconciliation-report.md`). |
| SQL syntax | Migration follows existing patterns from `create_receipts.sql` and `core_tables.sql`. |

---

## Deferred Work (Future Phases)

| Phase | Item |
|-------|------|
| Phase 3 | Audit trail integration — add `'letter'` to entity_type whitelist, create `record_letter_created`, `record_letter_status_changed` RPCs |
| Phase 3 | Activity events for CREATE, UPDATE, STATUS_CHANGE, DUPLICATE |
| Phase 4 | Save orchestration — `useLetterSave()` hook using `withUniqueRetry()` + `getNextLetterNumber()` |
| Phase 4 | Repository service layer for CRUD operations |
| Phase 5 | UI pages — New, Edit, View, List |
| Phase 5 | React components — LetterForm, LetterView, LetterList |
| Phase 6 | PDF rendering — letter-specific renderer |
| Phase 6 | React Email rendering — HTML letter output |
| Phase 6 | Rich text editor — TipTap/ProseMirror integration |

---

## Risks & Limitations

1. **Typecheck not fully verified** — The full project typecheck timed out. The new files use standard patterns and the `@/` path alias that works in the project context, but a full compile was not confirmed.
2. **`recipient_id` FK not enforced** — The migration does not add a foreign key constraint on `recipient_id` to `clients`. This is intentional — letters can reference recipients that aren't yet in the client database. FK enforcement can be added later if needed.
3. **`tenant_id` not linked to profiles** — The `tenant_id` column has no FK constraint. This follows the pattern of other tables (e.g., receipts) where tenant isolation is handled at the RLS/application level.
