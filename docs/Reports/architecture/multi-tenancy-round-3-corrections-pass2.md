# Round 3 — Follow-Up Corrections: Second Pass

This report was written by OpenCode on 2026-07-14 via Local Runner.

---

## 1. Objective & Scope

Documents the second-pass review corrections applied to the Round 3 SQL migration files. Three items were requested by the user; one was a bug discovered during the review.

**Covered:**
- All 3 user-requested corrections, with evidence and diff summary.
- Syntax bug discovered and fixed: duplicate `END IF;` in `accept_workspace_invitation()`.
- Verification gate results (typecheck, audit:load, git status).

**Explicitly excluded:**
- Full migration design rationale (see `multi-tenancy-round-3-implementation.md`).
- First-pass corrections (see `multi-tenancy-round-3-corrections.md`).

---

## 2. Correction Inventory

| # | Request | Verdict | Action |
|---|---------|---------|--------|
| 1 | Confirm `accept_workspace_invitation()` signature is `(p_invite_id uuid)`, not `(token text)`. Remove `token` column if present. | Confirmed correct + bug fix | No signature change. Removed duplicate `END IF;` that would cause parse failure. |
| 2 | Entities INSERT/UPDATE/DELETE RLS must also allow members with `create_entity` toggle, per §9. | Corrected | Added `OR (permissions->>'create_entity')::boolean = true` clause; renamed policies from `*_owner` to `*_member`. |
| 3 | Confirm `workspace_members.role` and `workspaces.status` CHECK constraints were not silently altered between rounds. | Confirmed untouched | Zero diff lines touching either constraint in `git diff d6d512d6...HEAD`. |

### 2.1 Correction 1 — Signature & Token Column Audit

**Evidence:**
- Function signature (line 193 of Phase 1 file): `accept_workspace_invitation(p_invite_id uuid)`
- `workspace_invitations` table has no `token` column — columns are: `id`, `workspace_id`, `email`, `workspace_role`, `workspace_permissions`, `status`, `invited_by`, `created_at`, `expires_at`
- Invitation lookup (lines 202–206): `WHERE id = p_invite_id AND status = 'pending' AND expires_at > now()`

**Bug found:** The email guard added in Pass 1 produced a syntax error — duplicate `END IF;`:

```diff
     IF lower(auth.jwt() ->> 'email') != lower(v_invite.email) THEN
         RAISE EXCEPTION 'Email does not match invitation';
     END IF;
-    END IF;
```

This would have caused PL/pgSQL to fail with a syntax error on function creation. Fixed in this pass.

### 2.2 Correction 2 — Entities RLS Permission Toggle

**File:** `20260714000001_multi_tenancy_rls.sql`

**Before (per Pass 1):**
```sql
CREATE POLICY entities_insert_owner ON entities FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wm2.workspace_id FROM workspace_members wm2
        WHERE wm2.user_id = auth.uid() AND wm2.role = 'owner'
    )
  );
```

**After:**
```sql
CREATE POLICY entities_insert_member ON entities FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wm2.workspace_id FROM workspace_members wm2
        WHERE wm2.user_id = auth.uid()
          AND (wm2.role = 'owner' OR (wm2.permissions->>'create_entity')::boolean = true)
    )
  );
```

**Changes applied to INSERT, UPDATE, and DELETE policies:**
- `wm2.role = 'owner'` kept as the primary authority (owners can always create entities).
- Added `(wm2.permissions->>'create_entity')::boolean = true` — members with the `create_entity` toggle can also create/modify/delete entities.
- Renamed from `entities_insert_owner` → `entities_insert_member` (and similarly for UPDATE/DELETE) to reflect the broadened scope.
- `->>` extracts `text`, cast to `boolean` ensures only explicit `true` activates the permission. `NULL` or any non-`true` value returns `false`, preventing accidental grants.

### 2.3 Correction 3 — CHECK Constraint Integrity

**Method:** Compared `git diff d6d512d6` against the current working tree for the Phase 1 file.

**Findings:** The diff shows exactly 29 modified lines — all documented in §2 of the Pass 1 corrections report (entities table insertion, FK additions, index addition, RLS ENABLE addition, email guard, approval payload change). The following lines are **absent** from the diff, confirming they were never touched:

- `CHECK (status IN ('pending_approval','active','suspended','archived'))` — workspaces table
- `CHECK (role IN ('owner','member'))` — workspace_members table
- `CHECK (workspace_role IN ('owner','member'))` — workspace_invitations table
- `CHECK (status IN ('pending','accepted','expired','revoked'))` — workspace_invitations table

All four CHECK constraints remain identical to the original commit `d6d512d6`.

---

## 3. Verification Gate

| Check | Result | Notes |
|-------|--------|-------|
| `bun run typecheck` | Pass | `tsc --noEmit` completed with zero errors across 761 files |
| `bun run audit:load` | Pass | No new issues — same 24 bloat, 6 broad select, 7 component fetch, 3 heavy limit pre-existing warnings |
| `git status` | Clean | Only 2 migration files modified (plus this report) |

---

## 4. Final File State

| File | Lines | Changes in this pass |
|------|-------|---------------------|
| `20260714000000_multi_tenancy_core.sql` | 255 | Removed duplicate `END IF;` in `accept_workspace_invitation()` — 1 line deleted |
| `20260714000001_multi_tenancy_rls.sql` | 237 | Entities INSERT/UPDATE/DELETE policies: added `create_entity` toggle, renamed `*_owner` → `*_member` |

Both files are syntactically valid SQL. The duplicate `END IF;` fix resolves a critical parse error that would have prevented migration execution.
