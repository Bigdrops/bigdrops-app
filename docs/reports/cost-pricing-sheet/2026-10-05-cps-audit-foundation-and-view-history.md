# CPS Audit Foundation and CPS View History Report

This report was written by Buffy on 2026-10-05 via Freebuff.

## Objective

Implement Phase 1 of the CPS downstream-feedback architecture:

- CPS audit foundation with readable, structured before/after diffs.
- CPS lifecycle audit for create, direct edit, status, duplicate, and
  conversion.
- A first-class Activity History surface on CPS View.

Downstream Quote/Invoice to CPS feedback stays disabled. Row-level lineage
stays out of scope.

## Scope

In scope:

- Shared audit type and formatter support for the CPS entity.
- A CPS-specific audit diff and metadata model.
- CPS direct-save audit using the real pre-edit snapshot.
- CPS lifecycle audit for the current view actions.
- A CPS View Activity History timeline.
- One narrow migration that lets audit records use the CPS entity and the new
  lifecycle actions.
- Focused tests and this report.

Out of scope:

- Any Quote to CPS or Invoice to CPS feedback.
- Any row-level lineage schema.
- Any change to CPS calculations, Instant Markup, conversion mapping,
  numbering, Forme PDF, groups, import, columns, photos, or the client
  workflow.
- Redesign of Invoice View.

## Files Changed

Created:

- `supabase/migrations/20261005120000_cps_audit_entity_support.sql`
- `src/domain/cps/auditDiff.ts`
- `src/domain/cps/audit.ts`
- `src/components/cps/CpsActivityHistory.tsx`
- `src/components/cps/cps-activity-history.css`
- `src/tests/critical/cpsAuditFoundation.test.js`
- `docs/reports/cost-pricing-sheet/2026-10-05-cps-audit-foundation-and-view-history.md`

Modified:

- `src/domain/audit/auditTypes.ts`
- `src/domain/audit/auditFormatters.ts`
- `src/lib/audit.ts`
- `src/hooks/useCpsSave.ts`
- `src/pages/view-cps-actions.ts`
- `src/pages/ViewCps.tsx`
- `src/components/cps/CostPricingSheetViewPresentations.tsx`

## Skills Used

Skills used: karpathy, react-dev, typescript-advanced-types, supabase

Documentation standard: ASD-STE100 Simplified Technical English

## Invoice Audit Architecture Learned From

The Invoice audit path was inspected as a behavioral reference. It was not
changed.

Retrieval:

- `src/hooks/useAuditTrail.ts` is the shared retrieval authority.
- It reads the tenant-scoped `audit_logs` table and the tenant-scoped
  `activity_events` table, then merges and de-duplicates both.
- Both queries filter by `entity_type` and `entity_id`, order by
  `created_at desc`, and cap at 50 rows. A `loadOlder` path pages backward.
- A 30 second request cache is keyed by `entityType:entityId`.
- Row Level Security protects reads. The hook does not bypass RLS.

Schema:

- `audit_logs` columns: `id`, `entity_type`, `entity_id`, `entity_label`,
  `action`, `actor_id`, `actor_label`, `source`, `scope_type`, `created_at`,
  `changes` (jsonb array of `{ field, old, new }`), `reason`.
- `activity_events` columns: the same shape plus `event_type` and
  `metadata` (jsonb).
- Each tenant schema (`entity_%`) owns its own `audit_logs` and
  `activity_events` tables. `tenant_master_template` holds the definition
  that future tenants inherit.
- Writes go through the tenant-scoped `record_audit_log` RPC. That RPC
  computes the field diff with `compute_jsonb_diff` and inserts the row.
  The RPC has no entity-type whitelist. The table check constraint is the
  only gate.

Presentation:

- Invoice mounts a collapsible "Activity & History" card. It shows one row
  per event and expands to a flat field list.
- The Invoice visual design was treated as a reference only. The CPS surface
  does not copy it.

Actor resolution:

- `getActor()` in `src/lib/audit.ts` resolves the authenticated user from
  `supabase.auth.getUser()`, keeps the stable `user.id`, and caches the
  result per session token.

Confirmed defect found during inspection:

- The tenant `audit_logs.entity_type` check allowed only
  `('invoice', 'quotation', 'project')`. The CPS form already called
  `record_audit_log` with `entity_type = 'cps_sheets'`. The call failed the
  check, and the existing `try/catch` swallowed the error. CPS audit writes
  were lost silently. The migration in this task fixes the constraint.

## Shared Infrastructure Reused

Reused without redesign:

- `useAuditTrail` as the single retrieval authority.
- `record_audit_log` RPC as the single write authority.
- `recordAuditLog` as the shared write helper.
- The `changes` jsonb representation for field-level diffs.
- `hsl(var(--bd-*))` design tokens.
- CPS view design tokens.

Changed in shared code only where CPS support required it, with Invoice
behavior preserved:

- `auditTypes.ts`: added `cps_sheets` to `AuditEntityType`. Added
  `AuditActorType`, `CpsAuditEventType`, `AuditRelatedDocument`,
  `AuditTrailChangeGroup`, and the CPS payload types. Extended
  `AuditTrailEntry` with optional CPS fields. Existing fields are unchanged.
- `auditFormatters.ts`: added CPS field labels, extended currency fields with
  `cp` and `sp`, added `cps_sheets` action labels, and added the CPS entry
  builder. An entry that is not a CPS record takes the original code path.
- `lib/audit.ts`: added `cps_sheets` and the new actions to the local unions,
  exported `resolveAuditActor`, and exported the local types. No RPC call
  signature changed.

## CPS Diff Model

Direct save uses the pre-edit snapshot that the form already supplies. The
diff compares that snapshot to the current editor state before rows are
persisted.

Document level fields:

- title
- client (stored display value only)
- site / project
- issue date
- notes

Item level fields:

- description
- specification
- quantity
- unit
- make / brand
- CP
- SP
- image URL/reference

Structural changes:

- item added
- item removed
- group added
- group removed
- group membership change, including move to ungrouped
- group name change

Rules:

- Rows match by stable row id only. The identity is `row.id`, else the stable
  `row._uiKey`. The CPS store keeps `table_rows` inside `custom_fields`, and
  `ensureTableRowKeys` derives `_uiKey` from the row id, so identity is stable
  across save and reload.
- A row with no stable identity is skipped. No heuristic matching is used.
- Row order is not compared. Reordering produces no event.
- Derived totals are never compared or recorded. A quantity change records the
  quantity only.
- CP and SP compare numerically so `22000` and `22000.00` do not produce a
  false change.

## CPS-Specific Diff Payload

The shared `changes` array holds `{ field, old, new }`. CPS needs more than a
flat field diff. The CPS payload travels as one reserved change entry under
the key `_cps`.

The payload is `CpsAuditMeta`:

- `event`: CREATED, UPDATED, STATUS_CHANGED, CONVERTED_TO_QUOTATION,
  DUPLICATED, ARCHIVED, DELETED.
- `actorType`: user, system, automated-feedback, or admin.
- `rootId`: the correlation root. For direct CPS events this is the CPS
  document id.
- `parentEventId`: the causal parent event id. Null in Phase 1.
- `sourceContext`: `cps_form` or `cps_view`.
- `related`: the related document, for example the created Quotation.
- `summary`: a short readable title.
- `changes`: an array of structured field changes. Each entry holds `rowId`,
  `rowLabel` (a description snapshot), `scope`, `field`, `label`, `old`,
  `new`, and `kind`.

The formatter reads `_cps` and hides it from the rendered field diff. An
entry that is not a CPS record does not contain `_cps`, so Invoice and
Quotation output is unchanged.

This adds no table, no column, and no new RPC. A future phase can promote the
payload to a dedicated metadata column when the shared formatter and RPC are
extended together.

## Actor Attribution

- Every user-driven CPS event resolves the real authenticated actor through
  `resolveAuditActor`, which reuses the cached `supabase.auth.getUser()`
  lookup.
- The stable `user_id` is preserved in `audit_logs.actor_id`.
- The display value stays the existing convention, `user.email`.
- When no authenticated actor exists, `recordCpsAuditEvent` classifies the
  event as `actorType: system`. This keeps a system consequence distinct from
  a direct user action.
- `automated-feedback` and `admin` are defined in the actor type union for the
  Phase 3 feedback writer and for migrations. They are not produced in
  Phase 1.

## Lifecycle Events

Recorded through the shared write authority:

- CPS created: on the create save path (`CREATED`).
- CPS direct edited: on the edit save path (`UPDATED`) with the real field
  diff.
- CPS status change: `STATUS_CHANGED` with old and new status.
- CPS archived: `ARCHIVED`.
- CPS deleted: `DELETED`. The event is written before the parent row is
  removed, so the label is still meaningful. The audit row is append-only and
  survives the delete.
- CPS duplicated: two records. The new document records `DUPLICATED` with the
  source as related. The source records `DUPLICATED` with the new document as
  related.
- CPS to Quotation conversion: `CONVERTED_TO_QUOTATION` with the created
  Quotation number as related. This gives the document-level
  `CPS-XXXX -> QTN-XXXX` relationship, actor, and timestamp.

Quotation to Invoice conversion is document-level ancestry only. It is not
audited here because no reliable CPS-ancestry write exists yet. This is a
Phase 2 prerequisite and is documented as a limitation.

Audit writes never fail a user action. Failures are logged and swallowed at
the action boundary.

## Causal And Root Support

- Event id: `audit_logs.id`.
- Root/correlation id: `CpsAuditMeta.rootId`, set to the CPS document id for
  every direct CPS event.
- Parent/causal event id: `CpsAuditMeta.parentEventId`, present in the model
  and null in Phase 1.

The model supports the future chain:

```text
Event A: user edits Invoice item unit_price.
Event B: system updates originating CPS SP.
Event B references Event A and shares one root id.
```

Nothing in the model prevents Event B. No Event B behavior is implemented.

## CPS View Design

- CPS View adds one collapsible section, "Activity & History".
- The section loads only when opened, so it adds no cost to a closed view.
- The design is a chronological timeline with a rail and dots. It does not
  copy the Invoice card styling.
- Each event shows:
  - primary: the event title, for example "Updated 4 fields" or
    "Converted to QTN-000432".
  - secondary: the actor and the timestamp.
  - context: the related document number.
  - detail: the grouped field changes.
- Multi-field changes collapse under one event. Several changes on one row
  collapse into one labeled block.
- An event with more than three changes starts collapsed and opens with a
  touch-friendly toggle.
- Image changes show "Image changed" and, behind a disclosure, "Previous
  image" and "New image" links. A raw URL is never the primary value.
- The empty state reads "No activity recorded yet.".
- The loading state uses three skeleton rows. It does not use a large spinner.
- The error state is distinct from empty. It shows the message and a Retry
  control that calls `refetch`.
- The section is reachable in normal scroll flow on desktop, fold, and mobile.
  It does not add a competing primary action. Convert to Quote, Edit, and
  Download are unchanged.

## Permissions And Integrity

- Reads go through `useAuditTrail`, which is RLS-protected. Cross-tenant
  history is not reachable.
- The tenant schema owns every audit row. The write RPC is `security definer`
  and schema-scoped.
- The CPS View history has no edit or delete control. Audit records are
  append-only from the CPS View.

## Schema / Query Changes

One migration:

- `supabase/migrations/20261005120000_cps_audit_entity_support.sql`

What it does:

- Loops over `public`, `tenant_master_template`, and every `entity_%` schema.
- Drops and re-adds `audit_logs_entity_type_check` to include `cps_sheets`
  and the other document families.
- Drops and re-adds `audit_logs_action_check` to add `ARCHIVE`, `UNARCHIVE`,
  `CONVERT`, and `DUPLICATE`.
- Reloads the PostgREST schema cache.

What it does not do:

- It adds no table.
- It adds no column.
- It changes no RPC.
- It rewrites no row.
- The new allowed sets are supersets of the old sets, so existing rows stay
  valid.
- `tenant_master_template` carries the change that future tenants inherit.

No client query logic changed. `useAuditTrail` already returns the `changes`
and `reason` columns that CPS needs.

## Tests

Added `src/tests/critical/cpsAuditFoundation.test.js`. 22 tests.

Covered behavior:

- CPS direct-edit diff at document and item level.
- CP and SP old/new values.
- Derived totals are never recorded.
- Item added and item removed with stable row ids.
- Row reordering produces no event.
- Group added, group removed, and membership change.
- No-op save produces no event.
- Multi-field grouping on one row.
- Image change is semantic, not a raw URL.
- Stable row identity resolution.
- Lifecycle metadata: event, root, parent, related, actor type.
- Formatter output with grouped changes and readable money values.
- Related document number on a conversion event.
- Non-CPS records take the fallback path.
- CPS save flow uses the real pre-edit snapshot.
- Actor attribution reuses the shared authority.
- Lifecycle events exist for status, archive, delete, duplicate, and
  conversion.
- CPS View wiring through `useAuditTrail`, empty state, and error state.
- Append-only history and no delete control.
- No Phase 2 row lineage and no Phase 3 feedback.
- Migration content.

Run result:

```text
node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/critical/cpsAuditFoundation.test.js
tests 22
pass 22
fail 0
```

## Verification Result

Verification:

- `bun run audit:load`: passed. It reports only pre-existing warnings that are
  not in this task's files.
- `bun run typecheck`: passed.
- Focused tests: passed. 22 of 22.
- `bun run test` (full critical suite): 651 of 664 passed. The 13 failures are
  pre-existing and are not caused by this task:
  - 4 tests fail because `import.meta.env` is undefined under `node --test`,
    so `src/supabase.ts` throws. These are `invoiceAccountingIntegration`,
    `paymentAccountingIntegration`, `remediationContract`, and
    `sourceTransactionContract`.
  - 3 tests fail on a loader limit for `.tsx` and `.woff` files in
    `cpsIndustry`, `cpsLedger`, and `cpsPdf`.
  - 5 assertions in `cpsViewProductionRedesign.test.js` are stale. They
    expect an older view API, for example `setConvertOpen` and a FAB without
    attributes. The same assertions fail on the base commit. This was
    confirmed by running the same patterns against `git show HEAD:...`.
  - 1 test in `itemCleanupExportImport.test.js` is an item-library merge
    group assertion. It is unrelated to this task.
- `git diff --check`: passed.
- `git status`: only task-owned files are modified or added. The untracked
  `scripts/forme-geometry-proof.tsx` is pre-existing and was not touched.
- `bun run build`: not executed, by instruction.

Supabase push status:

- `supabase db push --linked`: passed.
- Applied `20261005120000_cps_audit_entity_support.sql`.
- Verified on the hosted database that `audit_logs_entity_type_check` now
  includes `cps_sheets` and `audit_logs_action_check` now includes `CONVERT`
  and `DUPLICATE`, for `public`, `tenant_master_template`, and
  `entity_bigdrops-main_main`.
- No manual hosted edit was made.

## Risks Or Limitations

- The structured CPS payload travels inside `audit_logs.changes` under the
  reserved key `_cps`. It works through the existing RPC and needs no schema
  work. A future phase must promote it to a dedicated metadata column with a
  matching RPC change. The reserved key must not be used for another purpose.
- Custom column values (`custom_data`) are not diffed. They can hold noisy or
  binary data. This keeps the payload concise. Custom-column audit is deferred.
- Row order changes are not audited.
- Quotation to Invoice conversion is not audited from the CPS side, because no
  reliable CPS ancestry is written at that point. This is a Phase 2
  prerequisite.
- The duplicate action is recorded only when it succeeds. The known
  parent-only duplicate fidelity defect is unchanged by this task and is not
  represented as a full duplicate.
- End-to-end browser verification was not performed. It requires an
  authenticated session and real CPS data. Verification used typecheck, the
  focused tests, the source-level wiring tests, and live schema checks.
- Status values are written by the view as `open` or `approved`. The audit
  event records these values as given.

## Deferred Work

- Phase 2: stable CPS row ancestry through Quotation and Invoice, and the
  Quotation to Invoice authority handoff event.
- Phase 3: controlled SP, description, and image feedback, with `parentEventId`
  pointing at the causal downstream edit.
- Promote the `_cps` payload to a dedicated `metadata` column when the shared
  RPC is extended.
- Audit custom column value changes if a safe representation is agreed.
- Repair the parent-only duplicate defect as a separate task.
- Add an end-to-end runtime check once a seeded test workspace exists.
