# Engineer Permission Matrix Audit Report

This report was written by Muse Spark on 2026-09-14 via OpenCode.

## Objective

- Audit the full Engineer role permission matrix.
- Find every accidental omission in the canonical source.
- Fix all confirmed omissions in one controlled change.
- Keep Viewer, Manager, Owner, and Admin unchanged unless evidence proves a defect.

## Scope

- Canonical role templates and the creator baseline seeder.
- All tenant resources and all implemented actions.
- RLS relationship and data integrity.
- One new migration. No save-handler change. No UI change. No RLS change.

## Files changed

- `supabase/migrations/20260914132241_engineer_invoice_quotation_template_fix.sql` (new, pushed).

## Skills used

Skills used: supabase, supabase-postgres-best-practices
Documentation standard: ASD-STE100 Simplified Technical English

## Authoritative sources

- `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md` §3.3–§3.6, §3.11: action-based model, canonical lists, templates carry zero authority, resolution is exact row or wildcard resource.
- `docs/prd/multi-tenancy/multi-tenancy-prd-v2.md` §3.3 (superseded, used only for role intent): Manager alters company settings; Engineer creates and edits invoices, waybills, quotations, projects; Viewer is read-only.
- `supabase/migrations/20260819000000_preloaded_roles_and_assignment.sql`: sole writer of template items. Defines Company Admin, Viewer, Manager, Engineer.
- `supabase/migrations/20260909025241_restore_canonical_permission_seed_v2.sql`: canonical creator baseline seeder.
- `supabase/migrations/20260828000002_provisioning_template_completion.sql`: table-to-resource map used by RLS generation.
- Live database read via `supabase db query --linked` (read-only).

## Canonical resource list

- Sources: PRD v2.1 §3.4.1, `_prov_table_to_resource()`, creator seeder, RPC gates, frontend checks.
- Resources: invoice, quotation, payment, receipt, setting, waybill, boq, rfq, csr, item, project, project_document, client, signatory, bank_account, letter, tax_setting, account, period, journal, source_transaction, audit, device.
- Note: the settings table maps to resource `setting` (singular). PRD §3.4.1 writes `settings`. The database value `setting` controls. No code uses `settings` as a permission resource.
- Implemented actions: view, create, edit, delete. RLS, templates, seeders, and RPC gates use only these four.
- PRD extended actions (approve, post, email, export, reverse, archive) exist nowhere in code. They are excluded from the matrix.

## Engineer matrix (actual before fix)

| Resource | view | create | edit | delete |
|---|---|---|---|---|
| * (all) | YES | — | — | — |
| project, waybill, boq, rfq, csr, item | (via *) | YES | YES | — |
| invoice, quotation | (via *) | — | — | — |
| all other resources | (via *) | — | — | — |

## Engineer matrix (intended)

- Intended source: PRD v2.0 §3.3 plus coherent later extensions (boq, rfq, csr, item).
- Intended: view on all resources; create and edit on project, waybill, boq, rfq, csr, item, invoice, quotation.
- Delete on any resource: intentionally absent. PRD states create and edit only.

## Discrepancies

| Resource | Action | Actual | Intended | Status |
|---|---|---|---|---|
| invoice | create | absent | present | MISSING |
| invoice | edit | absent | present | MISSING |
| quotation | create | absent | present | MISSING |
| quotation | edit | absent | present | MISSING |
| project, waybill, boq, rfq, csr, item | create, edit | present | present | CORRECT |
| all resources | view | present | present | CORRECT |
| all other pairs | all | absent | absent | INTENTIONALLY ABSENT |

## Confirmed accidental omissions

- (invoice, create), (invoice, edit), (quotation, create), (quotation, edit).
- Evidence: PRD v2.0 §3.3 lists invoices and quotations as Engineer duties. The seed covers waybills and projects from the same sentence but drops invoices and quotations. The operational chain (BOQ/RFQ/CSR/Waybill to Quotation to Invoice) breaks without them.
- The two reported failures (quotation edit, invoice edit) are instances of this omission class.

## Intentionally absent permissions

- Engineer delete on all resources. No source grants it.
- Engineer create/edit on payment, receipt, setting, signatory, bank_account, letter, tax_setting, project_document, client, account, period, journal, source_transaction, audit, device. No authoritative source grants them. Manager and Company Admin cover settings and finance control.
- No permission was added on assumption. Each added pair cites PRD v2.0 §3.3.

## Viewer matrix

- Viewer holds (`*`, view) only. This matches read-only intent. Status: CORRECT.
- No Viewer change was made.

## Engineer versus Viewer differences

- Shared: (`*`, view). Both read all resources.
- Engineer adds: create and edit on project, waybill, boq, rfq, csr, item, invoice, quotation (after fix).
- Viewer adds nothing. The difference is the operational write set.

## Other roles

| Role | Grants | Status |
|---|---|---|
| Company Admin | (`*`) view, create, edit, delete | CORRECT, unchanged |
| Manager | (`*`) view, create, edit | CORRECT, unchanged (covers settings duty via wildcard) |
| Owner | workspace owner role plus creator baseline | CORRECT, unchanged |
| Creator baseline | 13 full-action resources, audit/device view-only, (`*`) baseline | CORRECT, unchanged |

- No collision was found. No other role was changed.

## Database integrity findings

- `entity_permissions` has UNIQUE (entity_id, user_id, resource, action). Engineer plus Viewer overlap cannot duplicate rows. All writers use ON CONFLICT DO NOTHING.
- `permission_templates` has UNIQUE (workspace_id, name) since 20260905.
- `permission_template_items` has UNIQUE (template_id, resource, action) since 20260905.
- `seed_preloaded_role_templates()` is the sole template writer. It is idempotent (IF NOT EXISTS).
- Pre-20260905 duplicate template names are theoretically possible but unverified. No rows were deleted. No blind cleanup was run.
- Observation (no change): `has_entity_permission()` also matches wildcard action, while PRD §3.5 wildcards only the resource. No `action = '*'` rows exist, so the difference is inert.

## RLS findings

- Tenant RLS policies call `has_entity_permission()` per resource and action. A missing grant denies access. This is correct behavior.
- UPDATE also requires view. Engineer holds (`*`, view), so the new edit grants are sufficient.
- The fix adds grants only. It does not weaken any policy. Tenant isolation is intact.

## Canonical source changed

- `seed_preloaded_role_templates()`: invoice and quotation added to the Engineer operational resource list.
- All other template blocks are byte-identical to 20260819000000.

## Permissions added

- (invoice, create), (invoice, edit), (quotation, create), (quotation, edit) on every existing Engineer template (backfill) and on all future Engineer templates (seed fix).

## Permissions intentionally left absent

- All pairs listed under intentionally absent permissions above.

## Migration added

- `supabase/migrations/20260914132241_engineer_invoice_quotation_template_fix.sql`.
- Content: seed function redefinition plus additive backfill with ON CONFLICT DO NOTHING.
- `supabase db push`: passed. Only this migration was pending. Remote is in sync.
- No user-specific grant was used. No `entity_permissions` row was written.
- Members with the Engineer template gain the abilities when a workspace owner (re)assigns the role via `assign_role_to_company_member()`. Template application is a one-time copy by design (PRD v2.1 §3.6).

## Live verification

- Read-only query after push confirms Engineer templates hold 21 items: (`*`, view) plus create/edit on project, waybill, boq, rfq, csr, item, invoice, quotation.
- Viewer holds (`*`, view). Manager holds (`*`) view/create/edit. Company Admin holds (`*`) view/create/edit/delete.
- No unexpected rows exist on any template.

## Confirmations

- No user-specific grants were used.
- `src/hooks/useQuotationSave.ts` was not modified by this task.
- No save handler, calculation, numbering rule, UI file, or RLS policy was changed.

## Verification result

- `bun run audit:load`: passed (warnings only, all pre-existing).
- `bun run typecheck`: passed.
- `git status`: new migration file only, plus pre-existing changes listed below.
- `supabase db push`: passed.
- `bun run build`: skipped due to hardware policy.

## Git status and diff scope

- New: `supabase/migrations/20260914132241_engineer_invoice_quotation_template_fix.sql`.
- Pre-existing (other agents, untouched): `src/hooks/useQuotationSave.ts`, `src/pages/ViewQuotation.tsx`, `src/pages/view-boq-actions.ts`, `supabase/migrations/20260907000000_record_capture_foundation.sql`, `docs/reports/invoice-quote/quotation-save-coercion-fix-2026-09-14.md`, `docs/tickets/pending-migrations-push.md`, `supabase/migrations/20260914130000_add_source_boq_id_to_quotations.sql`.

## Risks or limitations

- Existing Engineer members need a role reassign from their workspace owner before the new abilities take effect. This follows the platform design.
- If an owner deliberately narrowed an Engineer template by SQL (no UI exists for this), the backfill re-adds the four canonical pairs. The operation is additive only.

## Deferred work

- None for this audit. A future task may align PRD §3.4.1 resource spelling (`settings`) with the database value (`setting`), and address the debug-only `hasAuthorization('invoice', 'read')` call that uses a non-canonical action.
