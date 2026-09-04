# README Repository-State Reconciliation Report

This report was written by Buffy on 2026-09-04 via Freebuff.

---

## Objective

Reconcile the repository root README.md with the actual current
state of the project. This was a documentation audit and
correction task. Multi-tenancy was the primary motivation: the
README said nothing about it despite the extensive
`docs/prd/multi-tenancy/` PRD set and `docs/reports/multi-tenancy/`
implementation history.

## Scope

- Repository root `README.md`
- Evidence gathering from `package.json`, `src/`, `supabase/migrations/`,
  `docs/prd/multi-tenancy/`, and git metadata
- Report under `docs/reports/GENERAL/`

## Files Changed

| File | Change |
|------|--------|
| `README.md` | Added three Core Modules rows (Letters, Receipts, Workspaces & Companies); added a schema-per-entity multi-tenancy bullet to Architecture Highlights; scoped the JSONB validation bullet to waybills; corrected the Project Structure tree (added `contexts/`, split `supabase.ts`/`supabase/`, added tenant client to `lib/`) |

## Skills Used

- pdf-rendering-correctness

## Documentation Standard

ASD-STE100 Simplified Technical English

## Changes Made

### Verified claims that needed no change

- Stack badges (React 19, TypeScript 5.9, Tailwind 3.4, Supabase
  2.x, Vite 7.x, Capacitor 8.x): match `package.json` versions.
- Bun-only: only `bun.lock` exists. No npm/yarn/pnpm lockfile.
- All eight listed scripts exist in `package.json` with matching
  commands and descriptions (dev, build, test, typecheck, lint,
  preview, audit:load, audit:supabase-queries).
- Env vars: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are
  read in `src/supabase.ts` lines 3-4, matching the README.
- Clone URL: `git remote -v` returns
  `https://github.com/Bigdrops/bigdrops-app.git`, matching the
  Getting Started command.
- Modules listed in the README all exist (invoices, quotations,
  csr, waybills, payments, projects, clients, reports, compliance
  hub, item library, boq, rfq, notifications, audit, dashboard,
  settings, lifetime data hub, import/export, batch operations).
  Batch operations confirmed at `src/components/batch/`.

### Correction 1: Letters module missing from Core Modules

Before: the module table had no Letters row.

After: added after the Quotations row.

```text
| **Letters** | Formal correspondence documents with letterhead, PDF export, and project/document linking |
```

Evidence: `src/pages/Letters.tsx`, `LetterFormPage.tsx`,
`ViewLetter.tsx`, `src/domain/correspondence/`.

### Correction 2: Receipts module missing from Core Modules

Before: the module table had no Receipts row.

After: added after the Payments row.

```text
| **Receipts** | Immutable payment receipts with sequential numbering and PDF output |
```

Evidence: `src/pages/Receipts.tsx`, `ViewReceipt.tsx`,
`src/domain/receipt/` (receiptNumber, snapshotBuilder,
assertReceiptImmutable, previewModel, receiptRepository).

### Correction 3: Multi-tenancy missing entirely

Before: the README contained no mention of workspaces, companies,
entities, or tenant schemas.

After: added a Core Modules row and an Architecture Highlights
bullet.

```text
| **Workspaces & Companies** | Multi-company organization: workspace selection and creation, entity (company) switching, invitations, and role-based access |
```

```text
- **Schema-per-entity multi-tenancy.** Every company (entity) owns an
  isolated Postgres schema. The app resolves the active workspace and
  entity at startup and routes all queries through a tenant-scoped
  Supabase client using `supabase.schema()`. Row-level security and
  action-based permissions enforce isolation. The authoritative model
  is `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md`.
```

Evidence: `src/lib/tenant/contexts.tsx` (WorkspaceProvider, active
workspace/entity resolution, pending invitations),
`src/lib/tenantClient.ts` (`client.schema(schemaName)` per tenant),
`src/domain/tenant/` (tenantGate, tenantCreation),
workspace pages under `src/pages/` (WorkspaceSelection,
WorkspaceCreation, WorkspaceInvitation, WorkspacePendingApproval,
ProvisioningProgress, ProvisioningFailed), and migrations
(`tenant_rpc_provisioning`, `tenant_authoritative_hardening`,
`tenant_master_template`, `postgrest_schema_grants`). The tenancy
hierarchy Platform → Workspace → Entity → Schema is stated in
`docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md` section 2.

### Correction 4: JSONB validation claim was overgeneralized

Before:

```text
- **JSONB structural validation at DB level.** Postgres CHECK
  constraints enforce structural integrity on `items` arrays:
  non-empty, each item must have `description` + `qty`, and `qty > 0`.
```

After:

```text
- **JSONB structural validation at DB level.** Waybill `items` arrays
  are enforced by a Postgres CHECK constraint
  (`validate_waybill_items`): the array must be non-empty and every
  item must have a `description` and a numeric `qty` greater than 0.
```

Evidence: `supabase/migrations/20260611000000_waybill_schema_final.sql`
defines `validate_waybill_items(items jsonb)` and binds it via
`check_items_json_structure`. Invoice and quotation items are child
tables with primary/foreign keys, not JSONB arrays with a CHECK
constraint, so the original wording was wrong beyond waybills.

### Correction 5: Project Structure tree inaccuracies

Before:

```text
├── context/       React contexts (DocumentQueryContext)
...
├── lib/           Calculations.ts (single source of truth), fonts, icons, PDF, themes, utilities
...
├── supabase/      Supabase client config
```

After:

```text
├── context/       React contexts (DocumentQueryContext)
├── contexts/      Additional React contexts
...
├── lib/           Calculations.ts (single source of truth), fonts, icons, PDF, themes, tenant client, utilities
...
├── supabase.ts    Supabase client bootstrap
├── supabase/      Supabase policies
```

Evidence: both `src/context/` and `src/contexts/` exist. The
Supabase client is `src/supabase.ts`; `src/supabase/` contains
`policies/`.

## Verification Result

- `bun run audit:load`: passed. Only pre-existing warnings, no new
  findings.
- `bun run typecheck`: passed (exit code 0).
- `git status --short` before changes:
  - `M AGENTS.md` (staged, my prior doc-fix task)
  - `M README.md` (staged, my prior doc-fix task)
  - `A docs/reports/invoice-quote/calculation-entry-point-split-inspection.md`
  - `?? docs/Reports/general/calculation-entry-point-doc-fix.md`
- `git status --short` after changes:
  - `M AGENTS.md`
  - `MM README.md` (staged prior correction plus this task's edits)
  - `A docs/reports/general/calculation-entry-point-doc-fix.md`
  - `A docs/reports/invoice-quote/calculation-entry-point-split-inspection.md`
- All modified and staged files are my own work from this and the
  immediately preceding tasks. No pre-existing changes from another
  agent were reverted or overwritten.
- `bun run build`: not executed (hardware policy).

## Risks or Limitations

- The Vercel badge claims "Deployed". `vercel.json` exists and
  AGENTS.md names Vercel as the deployment target, but whether a
  production instance actually matches the repository's main branch
  requires manual confirmation. The badge was kept.
- The Bun badge claims version 1.x. Bun is mandated by AGENTS.md and
  `bun.lock` is present, but no version is pinned in `package.json`.
- Module descriptions added for Letters, Receipts, and Workspaces &
  Companies are factual summaries of the code, not marketing copy.

## Deferred Work

- No manual confirmation of the production deployment was possible
  from code alone. The Vercel "Deployed" badge should be confirmed
  or adjusted by the project lead.
- `docs/prd/multi-tenancy/` contains multiple PRD versions
  (v1.0, v2.0, v2.1) and a large set of implementation reports under
  `docs/reports/multi-tenancy/`. The README references only the
  authoritative v2.1 PRD, following the cross-reference-not-duplicate
  rule. Whether older PRD versions should be marked superseded is a
  decision for the PRD owner, not this task.