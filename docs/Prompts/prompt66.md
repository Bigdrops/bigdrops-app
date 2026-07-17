====================================================================
PRECONDITION

Read AGENTS.md before commencing this task. All applicable protocols and standards defined therein must be observed throughout this work.

====================================================================

# Round 6 — Entity Provisioning Engine

Create a new append-only migration:

supabase/migrations/20260717000000_entity_provisioning_engine.sql

Do NOT modify any existing migration. Migration history is immutable.

Before implementation, load the appropriate implementation skills from
docs/PROJECTSKILLINDEX.md. At minimum, load the skills covering:

- PostgreSQL / Supabase
- Database architecture
- Row Level Security (RLS)
- PL/pgSQL
- Transactions & error handling
- Concurrency / locking
- Karpathy

If additional skills are relevant, load them before coding.

---

## Objective

Implement the complete Entity Provisioning Engine described by PRD v2.1.

This is the production provisioning pipeline responsible for creating
new business entities safely, atomically, idempotently, and with proper
failure recovery.

The engine must become the single provisioning entry point for entity
creation.

---

## Architectural Requirements

Do NOT implement one large monolithic PL/pgSQL function.

Instead implement:

• One public orchestration function

    provision_entity(...)

that coordinates the complete workflow.

Behind it, implement small internal helper functions for each concern.

Typical decomposition:

- validate permissions
- idempotency check
- metadata creation/update
- create schema
- clone template
- install RLS
- finalize provisioning
- cleanup/error handling

The orchestration function owns the transaction and workflow.

Helper functions should each have one clear responsibility.

---

## Functional Requirements

### 1. Authorization

Caller must:

- own the workspace

OR

- possess create_entity permission.

Reject all other callers.

---

### 2. Concurrency Protection

Before provisioning begins:

Acquire a PostgreSQL advisory lock (or equivalent safe locking mechanism)
using a deterministic key derived from either:

- entity_id

or

- (workspace_id, slug)

This prevents concurrent provisioning of the same logical entity.

The lock must automatically release when the transaction completes.

---

### 3. Idempotency

Provisioning must be safely repeatable.

If an entity already exists:

READY
- immediately return success
- perform no work

CREATING
- either safely resume
OR
- return a clear "Provisioning already in progress" response.

Choose one approach and document why.

FAILED
- never silently retry.
- require explicit retry workflow.

Document the idempotency strategy.

---

### 4. Metadata

Insert entity metadata when necessary.

Respect all existing uniqueness constraints.

---

### 5. Provisioning Status

Create or update:

entity_provisioning_status

Transition:

creating

↓

ready

or

failed

Update:

- last_error
- updated_at
- attempt_count

---

### 6. Schema Creation

Create the entity schema using the PRD naming convention.

Use existing uniqueness guarantees.

---

### 7. Template Clone

Clone the complete template schema.

Do not clone only a subset.

Follow the PRD exactly.

---

### 8. Dynamic RLS Installation

Install all required policies onto every cloned table.

Policies must follow the existing

has_entity_permission()

authorization model.

Hard requirement:

NO generated policy may query the same protected table using a raw
subquery.

Whenever same-table lookups are required they MUST use
SECURITY DEFINER helper functions.

Audit every generated policy against the Round 5 recursion issue before
considering implementation complete.

---

### 9. Success

On successful completion:

status = ready

Return success.

---

### 10. Failure

If any stage fails:

Catch the exception.

Drop any partially-created schema.

Leave the entities row intact.

Update:

status = failed

Populate:

last_error

Increment:

attempt_count

Never delete entity metadata.

---

### 11. Retry Policy

Do NOT hardcode retry limits.

Expose the retry limit via an explicit configuration mechanism.

Examples:

- configuration table

or

- helper function

Document the chosen design.

When retry limit is exceeded:

Return a clear

Manual Intervention Required

state.

Do not retry forever.

---

## Verification

Run only safe verification.

Never run bun build.

Required:

- bun run typecheck
- bun run audit:load
- git status

If practical, execute lifecycle verification against a disposable
database.

Run all tests using a NON-SUPERUSER role.

Verify:

1.
Successful provisioning.

2.
Injected failure.

Confirm:

- schema removed
- entities row preserved
- status failed
- error captured

3.
Repeated successful provisioning.

Confirm:

- no duplicate schema
- no duplicate metadata
- safe idempotent behavior

4.
Concurrent provisioning.

Attempt simultaneous provisioning.

Confirm advisory locking prevents duplicate execution.

5.
Retry policy.

Confirm retry ceiling behaves correctly.

6.
Cross-workspace isolation.

Workspace A cannot access Workspace B entity schema.

---

## Deliverables

Provide:

- migration summary
- helper function summary
- orchestration workflow summary
- lifecycle verification results
- git diff summary

No existing migration files may be modified.