You are working on the BIGDROPS business platform.
Stack: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 3.4, Supabase, Vercel.
Runtime Environment: Bun only. Never use npm, yarn, or pnpm.

====================================================================
CRITICAL: READ AGENTS.md BEFORE MODIFYING ANY CODE
====================================================================
OpenCode has full repository access. Read AGENTS.md immediately.
Follow it completely.
====================================================================

OBJECTIVE

Begin the FINAL multi-tenancy cutover.

The final architecture is:

- Business data is entity-scoped.
- Every business aggregate must live in its entity schema.
- Public-schema business tables are legacy only.
- No business data is intentionally left globally public.
- User-level preferences such as theme choice remain user-scoped and are not
  company business data.
- Do not preserve public business storage merely because existing code currently
  uses it.

This pass is INVENTORY ONLY.

DO NOT MODIFY APPLICATION SOURCE.
DO NOT MODIFY DATABASE SCHEMA.
DO NOT CREATE OR RUN DATA MIGRATIONS.
DO NOT DELETE PUBLIC TABLES.
DO NOT DELETE PUBLIC DATA.

A. READ PROJECT RULES

Read:
- AGENTS.md
- docs/PROJECTSKILLINDEX.md
- current multi-tenancy PRDs
- existing multi-tenancy migration reports
- existing invoice/quotation/waybill/CSR migration implementations

Load relevant skills from docs/PROJECTSKILLINDEX.md.

B. DATABASE INVENTORY

Inspect the LIVE linked Supabase database.

Build an authoritative inventory of every business-domain object in public
schema, including:

- tables
- views
- materialized views if any
- functions/RPCs
- triggers
- indexes
- policies
- foreign keys
- sequences
- helper functions used by business operations

For every public business table determine:

1. Does the corresponding tenant-schema table exist?
2. Exact public row count.
3. Exact tenant row count for the active entity.
4. Schema/column compatibility.
5. Primary key.
6. Foreign keys.
7. Important indexes.
8. RLS policies.
9. Triggers.
10. Functions/RPCs that read or write it.
11. Frontend files that access it.
12. Whether data can be migrated without ambiguity.

Do not infer from old reports when live inspection can answer it.

C. CLASSIFY EVERYTHING

Every business object must receive exactly one status:

MIGRATE
ALREADY TENANT
GLOBAL INFRASTRUCTURE
USER-SCOPED
NEEDS DESIGN

Do NOT use "INTENTIONALLY PUBLIC" merely because something happens to be
public today.

"Needs design" is only for something that genuinely cannot fit the
entity-scoped architecture.

The expected direction is that business data becomes tenant-scoped.

D. DATA OWNERSHIP

For every public business table determine whether each row belongs to:

- an entity
- a workspace/company relationship
- a user
- global infrastructure

Where ownership is not directly represented, inspect existing relationships,
creation metadata, workspace/entity mappings, foreign keys, and migration
history.

CRITICAL:

Never guess ownership.

If ownership cannot be proven, report the exact blocker and the evidence
required to resolve it.

E. DEPENDENCY GRAPH

Trace dependencies between public objects.

Identify:

- public RPC → public table
- public view → public table
- trigger → public table/function
- frontend → public RPC
- frontend → public table
- tenant RPC → public table
- tenant view → public table

Pay particular attention to:

- invoice transaction RPCs
- quotation/invoice conversion
- document numbering
- audit/activity recording
- item library
- financial views
- project/document relationships
- RFQ → quotation
- BOQ → quotation
- invoice → CSR/waybill
- invoice → quotation revert
- offline synchronization

F. FRONTEND PUBLIC ACCESS MANIFEST

Search the actual repository.

Find every business-domain:

- supabase.from(...)
- supabase.rpc(...)
- client.from(...)
- client.rpc(...)
- fallback from tenantClient to supabase
- repository/service that internally uses public supabase

Do not rely on previous reports or stale line numbers.

Classify every occurrence:

TENANT ALREADY
MUST CUT OVER
GLOBAL INFRASTRUCTURE
USER-SCOPED
NEEDS DESIGN

A business table being "public for now" is NOT an acceptable final state.

G. MIGRATION ORDER

Based on the live dependency graph, propose the safest aggregate migration
order.

For each batch specify:

1. Database migration required.
2. Data migration required.
3. Permission/RLS work.
4. RPC/view work.
5. Frontend cutover.
6. Verification gate.
7. Public objects that can eventually be removed.

Prefer small dependency-safe batches over one giant migration.

H. PUBLIC PURGE PLAN

Produce a final deletion plan.

For every public business table/view/RPC that should disappear, state:

- what replaces it
- what code currently depends on it
- what must be migrated first
- what verification proves it is safe to remove

Do NOT delete anything in this pass.

I. REQUIRED VERIFICATION

Run only safe read-only verification.

Required:

- git status before and after
- database object inventory
- exact counts
- dependency inventory
- repository search
- no source changes
- no migration changes

DO NOT run:

bun run build
bun run typecheck
bun run lint

This is an inventory/audit pass and must not spend resources on application
verification.

J. REPORT

Create:

docs/Reports/multi-tenancy/final-public-business-purge-inventory.md

The report must contain:

1. Executive summary
2. Complete public business table inventory
3. Complete tenant table inventory
4. Public vs tenant row counts
5. Ownership/provenance findings
6. RPC/function inventory
7. View inventory
8. Dependency graph
9. Frontend public-access manifest
10. Classification of every object
11. Recommended migration order
12. Public purge plan
13. Blockers
14. Exact next migration batch

CRITICAL FINAL RULE:

Do not declare any business object "intentionally public" simply because
the current implementation leaves it public.

The target architecture is entity-scoped business data.

This pass must establish the authoritative map needed to execute the final
migration safely.

No application code changes.
No schema changes.
No data changes.
No public-data deletion.