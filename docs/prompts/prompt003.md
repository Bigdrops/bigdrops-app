You are working on the BIGDROPS business platform.

TASK: READ-ONLY ENTITY AUTHORIZATION INVENTORY

Context:
Phase 1 multi-tenant frontend infrastructure is now live and has been manually
verified in production. Confirmed production state:
- Workspace: BIGDROPS
- Workspace role: owner
- Entity: BIGDROPS
- Entity schema: entity_bigdrops-main_main
- Provisioning: ready
- Tenant Client: ready
- Effective entity permission count: 0

This zero-permission state is intentional under the current deny-by-default
authorization architecture. DO NOT seed or modify production permissions
during this task.

OBJECTIVE:
Determine exactly which entity-level permission resources/actions are
currently referenced by the frontend codebase, so the architecture council
can make an evidence-based decision about permission seeding before Phase 2.

READ-ONLY HARD CONSTRAINTS:
- Do NOT modify application code.
- Do NOT modify migrations.
- Do NOT create migrations.
- Do NOT insert/update/delete any database records.
- Do NOT run SQL against production.
- Do NOT migrate any business module.
- Do NOT run bun run build.
- Do NOT start Docker or Supabase local development.
- This is an investigation only.

FIRST:
Read AGENTS.md and load any relevant skills from
docs/PROJECTSKILLINDEX.md for codebase investigation/audit work.

SEARCH THE ENTIRE FRONTEND FOR:
1. hasAuthorization(
2. has_entity_permission
3. entity_permissions
4. permission/action constants
5. Permission-related hooks/providers/utilities
6. Literal action strings including:
   view create edit delete approve post email export reverse archive
7. Any equivalent authorization checks that do not use the exact function
   names above.
8. Resource names associated with those checks.

IMPORTANT: Do not treat the PRD's example action list as an authoritative
permission list. Determine actual usage from the current repository.

ADDITIONAL: Specifically check usage within:
- useEntity() / EntityProvider
- Tenant Client call sites
- The diagnostic page (/debug/tenant) which currently calls
  hasAuthorization('invoice','read') as a probe. Classify this explicitly:
  is it evidence of a real business dependency, or is it itself a
  placeholder probe with no downstream consumer?

DISTINGUISH:
- Existing executable authorization checks
- Defined but currently unused permission constants/types
- Comments/documentation only
- Dead/unreachable code
- Future/placeholder code

REPORT:
A. Exact resource/action pairs currently exercised by executable frontend code.
B. Exact files and line references containing those checks.
C. Whether any current business module actually depends on entity_permissions.
D. Whether hasAuthorization() currently has any production call sites.
E. Whether there is enough evidence to justify seeding permissions now.
   Important: explicitly consider that "not yet migrated" and
   "will never need permissions" are different conclusions. Phase 2/3 will
   introduce real consumers of hasAuthorization() that don't exist yet.
   Do not conflate "no current usage" with "no future need."
F. If no active permission consumers exist, explicitly state:
   "No current frontend permission dependency identified."

VERIFICATION:
Use only safe read-only/static inspection commands. Do not modify the
working tree.

FINAL OUTPUT:
Return a concise investigation report only. No implementation.
No permission SQL. No production changes.