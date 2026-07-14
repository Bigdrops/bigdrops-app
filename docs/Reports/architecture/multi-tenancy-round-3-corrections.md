# Round 3 — Multi-Tenancy SQL Corrections (5-Item User Review)

This report was written by OpenCode on 2026-07-14 via Local Runner.

---

## 1. Objective & Scope

Documents the outcome of a 5-item user review of the Round 3 SQL migration files. Three corrections required code changes; two were verified as already correct and left untouched. One additional gap (missing entities RLS policies in Phase 2) was discovered and fixed during the review cycle.

**Covered:**
- All 5 user-requested corrections, with evidence and diff summary for each.
- Additional fixes applied: entities RLS policies in Phase 2, entities index, entities RLS ENABLE.
- Verification gate results (typecheck, audit:load, git status).

**Explicitly excluded:**
- Full design rationale for the migrations (see `multi-tenancy-round-3-implementation.md`).
- Phase 3+ deferred work.

---

## 2. Correction Inventory

| # | Request | Verdict | Action |
|---|---------|---------|--------|
| 1 | `workspace_members.role` CHECK constraint already uses `IN ('owner','member')` | Already correct | None |
| 2 | `accept_workspace_invitation()` does not validate the caller's email against the invitation | Corrected | Added `lower(auth.jwt() ->> 'email') != lower(v_invite.email)` guard |
| 3 | Missing `public.entities` table — entity FK references have no target table | Corrected | Created `entities` table before `entity_permissions`; added FK clauses to `entity_permissions.entity_id` and `workspace_invitation_entity_grants.entity_id` |
| 4 | `workspaces.status` CHECK uses `IN ('pending_approval','active','suspended','archived')` | Already correct | None |
| 5 | `approve_workspace()` inserts owner with `'["*"]'::jsonb` permissions instead of `'{}'::jsonb` | Corrected | Changed payload to `'{}'::jsonb` |

### 2.1 Corrections 1 & 4 — Already Correct

**Evidence (Correction 1):**
```
grep -n "role.*CHECK" 20260714000000_multi_tenancy_core.sql
→ role text NOT NULL CHECK (role IN ('owner', 'member'))
```
Round 2 analysis report listed `CHECK (role IN ('owner', 'member', 'admin', 'viewer'))` in §5.2 (DRAFT, marked `[pending design]`). The authoritative Round 2 corrected report superseded this — the PRD specifies only `owner` and `member` roles. The migration matched the PRD from inception.

**Evidence (Correction 4):**
```
grep -n "status.*CHECK" 20260714000000_multi_tenancy_core.sql
→ status text NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval','active','suspended','archived'))
```
PRD v2.1 §5 lists these 4 values. The Round 2 corrected report (§5.3.7) maps them from the original 5-value set (`pending`, `active`, `disabled`, `archived`, `suspended`) to the 4-value set, renaming `pending`→`pending_approval` and `disabled`→`suspended`. The migration matched.

### 2.2 Correction 2 — Email Match Guard

**File:** `20260714000000_multi_tenancy_core.sql`, function `accept_workspace_invitation()`

**Before:** Function accepted the invitation based on `p_invite_id` lookup only — no caller verification.

**After:** Added at the top of the function body:
```sql
IF lower(auth.jwt() ->> 'email') != lower(v_invite.email) THEN
    RAISE EXCEPTION 'Invitation email does not match authenticated user email'
      USING ERRCODE = 'P0001';
END IF;
```

**Design notes:**
- Uses `auth.jwt() ->> 'email'` rather than `auth.email()` — the latter is deprecated in Supabase and returns `NULL` in newer versions.
- `lower()` on both sides provides case-insensitive comparison.
- Exception code `P0001` (raise_exception) — standard PL/pgSQL, no custom SQLSTATE needed per project convention.

### 2.3 Correction 3 — Entities Registry Table

**File:** `20260714000000_multi_tenancy_core.sql`

**Addition:** `public.entities` table created before `entity_permissions`:

```sql
CREATE TABLE public.entities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    slug text NOT NULL,
    display_name text NOT NULL,
    entity_type text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, slug)
);
```

**Existing FK clauses updated:**
- `entity_permissions.entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE`
- `workspace_invitation_entity_grants.entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE`

**Implications:**
- Closes the FK gap identified as Risk #1 in the Round 3 implementation report (§7.1).
- Enables workspace-scoped RLS validation: policies can now join `entity_permissions → entities → workspace_members`.
- Both entity FK references use `ON DELETE CASCADE` — deleting an entity removes its permission grants.
- `entities.workspace_id` is `NOT NULL` — every entity belongs to exactly one workspace.

### 2.4 Correction 5 — Approval Payload

**File:** `20260714000000_multi_tenancy_core.sql`, function `approve_workspace()`

**Before:**
```sql
permissions => '["*"]'::jsonb
```

**After:**
```sql
permissions => '{}'::jsonb
```

**Rationale:** The owner role carries full inherent authority over the workspace (via RLS policies that check `role = 'owner'`). Explicit `*` permissions in the `permissions` column are redundant for owners and semantically confusing — permissions JSONB is designed for non-owner members whose authority is explicitly granted.

---

## 3. Secondary Fixes

During the review cycle, the following gaps were discovered and corrected:

| Fix | File | Reason |
|-----|------|--------|
| `ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY` | Phase 1 | New table needed RLS enabled |
| `idx_entities_workspace_id` BTREE index | Phase 1 | All workspace-scoped queries join on workspace_id |
| Entities RLS policies (SELECT/INSERT/UPDATE/DELETE) | Phase 2 | New table needed per-action policies matching the pattern of other workspace-scoped tables |

Entities RLS policies follow the same pattern as `permission_templates`:
- **SELECT:** Any workspace member can read visible entities.
- **INSERT/UPDATE/DELETE:** Workspace owners only (managed via workspace_membership self-join).

---

## 4. Verification Gate

| Check | Result | Notes |
|-------|--------|-------|
| `bun run typecheck` | Pass | `tsc --noEmit` completed with zero errors across 760 files |
| `bun run audit:load` | Pass | All pre-existing warnings (bloat, broad selects, component fetches) unchanged — no new issues introduced |
| `git status` | Clean | Only 2 migration files detected as changed; `src/main.tsx` and `src/components/theme-provider.tsx` pre-existing |

---

## 5. Final File Summary

| File | Lines | What changed |
|------|-------|-------------|
| `20260714000000_multi_tenancy_core.sql` | ~273 | Added entities table, FKs, email guard, approval payload, entities RLS ENABLE, entities index |
| `20260714000001_multi_tenancy_rls.sql` | ~237 | Added 4 entities RLS policies (select/insert/update/delete) |

Both files are backwards-compatible SQL — no existing Supabase data or schema is affected until these migrations are applied.

---

## 6. Deferred Work

- **Phase 3 audit trail** remains deferred (depends on entity schema creation system).
- **Phase 4 entity schema routing** — the `entities` table now exists, enabling the routing component, but no frontend code has been written.
- **Round 3 implementation report update** — the report at `multi-tenancy-round-3-implementation.md` reflects the pre-correction state. Its §3.3 `approve_workspace` row and §4.2 entity_permissions FK note are now superseded.
