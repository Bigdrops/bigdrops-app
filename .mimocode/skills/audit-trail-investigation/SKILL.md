---
name: audit-trail-investigation
description: Systematically trace audit trail call paths for any BIGDROPS document module. Use when investigating audit gaps, verifying audit wiring, debugging silent audit failures, or auditing entity_type whitelists across migrations. Covers both audit_logs and activity_events dual-table architecture.
---

# Audit Trail Investigation Skill

This skill guides the systematic investigation of audit trail wiring for any BIGDROPS document module (Invoice, Quotation, Waybill, CSR, Letter, Payment, etc.).

## Prerequisites

Before starting, read:
1. `AGENTS.md` — project rules (especially §2 Hard Architecture Rules, §3 Workflow)
2. `docs/standard/audit-trail-standard.md` — canonical audit trail standard
3. `src/lib/audit.ts` — core audit utility functions

## Architecture Context

BIGDROPS has a **dual audit table architecture**:

| System | Table | Write Path | Purpose |
|--------|-------|------------|---------|
| Generic field-change audit | `audit_logs` | `record_audit_log` RPC | Tracks before/after values for field mutations |
| Entity-specific activity events | `activity_events` | Entity RPCs (`record_<entity>_created`, etc.) | Tracks lifecycle events (CREATED, UPDATED, STATUS_CHANGED, etc.) |

Both use **fire-and-forget `void` pattern** — audit failures do not block the main operation.

**Critical constraint:** The `record_activity_event` function has an `entity_type` whitelist enforced at the PL/pgSQL level (IF statement), NOT a table CHECK constraint. Migration ordering regressions can silently overwrite the whitelist.

## Investigation Methodology

### Step 1: Map the Module's Mutations

For the target module, find every mutation point:

1. **Search for Supabase writes**: `supabase.from('<table>').insert()`, `.update()`, `.delete()`
2. **Search for service-layer calls**: `<module>Service.ts`, `<module>Actions.ts`
3. **Search for RPC calls**: `supabase.rpc('record_*')` or `recordAuditLog()`
4. **Check for inline mutations**: Direct writes in page components (bypassing service layer)

Record each mutation point with:
- File path and line number
- Whether it goes through a service layer or is inline
- Whether audit functions are called after the mutation

### Step 2: Trace Audit Call Paths

For each mutation point, trace whether audit is wired:

**For `audit_logs` (generic field-change audit):**
- Search for `recordAuditLog()` calls in the same flow
- Verify it receives correct parameters: `entityType`, `entityId`, `action`, `changes`
- Check if the call is inside try/catch (fire-and-forget) or blocking

**For `activity_events` (entity-specific lifecycle events):**
- Search for entity-specific RPCs: `record_<entity>_created`, `record_<entity>_updated`, `record_<entity>_status_changed`
- Verify the RPC is called after successful persistence
- Check if the RPC is wired in `src/lib/audit.ts` or called directly

### Step 3: Verify Entity Type Whitelist

This is the most common source of silent audit failures.

1. **Find the current whitelist**: Search all migration files for `record_activity_event` function definitions
2. **Check for migration ordering regressions**: A later `CREATE OR REPLACE FUNCTION` can silently overwrite an earlier one, removing entity_types
3. **Verify the entity_type is in the whitelist**: The IF statement in `record_activity_event` must include the module's entity_type
4. **Check event_type whitelist**: The CASE statement must include all event_types the module uses

**Known regression pattern:** `20260705100000_payment_attachments.sql` overwrites `record_activity_event` with whitelist `('invoice', 'quotation', 'project')`, removing 'csr' and 'waybill' added by earlier migration `20260703100000_add_csr_waybill_to_whitelist.sql`.

### Step 4: Check Generated Types

Verify that entity-specific RPCs appear in `src/lib/database.types.ts`:
- Search for `record_<entity>_created`, `record_<entity>_updated`, etc.
- If missing, the RPC was defined in a migration but types were not regenerated
- TypeScript won't recognize them as valid RPC names without type augmentation

### Step 5: Test the Full Flow

For each mutation path, verify end-to-end:

1. **Create**: Does the mutation call an audit function? Does the RPC succeed?
2. **Update**: Does the mutation call an audit function with correct change tracking?
3. **Delete/Archive**: Does the mutation call an audit function?
4. **Status Change**: Does the mutation call an audit function?
5. **Duplicate**: Does the mutation call an audit function for the new entity?

## Common Defect Patterns

### 1. Service Layer Bypass

**Symptom**: Audit functions exist in the service layer but are never called because the page component does a direct Supabase insert.

**Investigation**:
- Check if the page component imports the service function
- Check if `handleSave` calls the service function or does `supabase.from().insert()` directly
- Compare with other modules that correctly use the service layer

**Example**: CSR creation in `NewCSR.tsx` did `supabase.from('csrs').insert()` instead of calling `createCsr()` from `csrService.ts`.

### 2. Migration Ordering Regression

**Symptom**: Entity_type was working, then stopped after a new migration was applied.

**Investigation**:
- Find all `CREATE OR REPLACE FUNCTION record_activity_event` in migration files
- Check the timestamp ordering — later files overwrite earlier ones
- Verify the whitelist in the latest version includes all required entity_types

### 3. Missing Event Types

**Symptom**: Some audit events are recorded but others are not.

**Investigation**:
- Check the CASE statement in `record_activity_event` for the event_type whitelist
- Verify the module uses event_types that are in the whitelist
- Check if new event_types were added by the module but not by the migration

### 4. Silent RPC Failure

**Symptom**: Audit RPC is called but no record appears in `activity_events`.

**Investigation**:
- Check if the RPC is inside a try/catch that swallows errors
- Check if the RPC is called with `void` (fire-and-forget) — errors are silently discarded
- Check if the entity_type or event_type fails the whitelist check (throws, but caught by try/catch)
- Check database types — if the RPC is not in `database.types.ts`, TypeScript won't catch type errors

### 5. Dual Table Confusion

**Symptom**: Audit records appear in one table but not the other.

**Investigation**:
- `audit_logs` is written by `record_audit_log` RPC (generic field-change audit)
- `activity_events` is written by entity-specific RPCs (lifecycle events)
- These are separate systems — a module may have one but not the other
- Check which system the module uses and whether both are needed

## Report Format

After completing the investigation, save a report to:
`docs/reports/<MODULE>/audit-trail-investigation.md`

Include:
1. **Module inventory**: All mutation points found
2. **Audit wiring status**: Which mutations have audit, which don't
3. **Entity type whitelist status**: Current whitelist, any regressions
4. **Generated types status**: Which RPCs are in database.types.ts
5. **Defects found**: Each defect with file path, line number, and fix recommendation
6. **Verification results**: What was tested and what passed/failed

## Verification Protocol

After fixing audit trail defects:

1. **Type Check**: `bun run typecheck`
2. **Audit Load**: `bun run audit:load`
3. **Manual Verification**: Perform a create/update/delete operation and verify audit records appear in both tables
4. **Migration Verification**: If a migration was changed, verify it applies cleanly
