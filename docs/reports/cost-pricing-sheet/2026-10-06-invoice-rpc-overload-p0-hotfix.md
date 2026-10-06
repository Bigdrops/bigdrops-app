# Invoice RPC Overload P0 Hotfix Report

This report was written by Codex on 2026-10-06 via Codex Desktop.

## Objective

Restore direct Invoice creation and Quotation to Invoice conversion by removing
the obsolete four-argument Invoice save RPC overload.

The normal Quotation save path must remain the Phase 3.5 composite transaction.

## Scope

This hotfix changed only tenant RPC installation and regression coverage.

No Invoice UI, Quotation UI, CPS feedback rule, calculation rule, numbering
rule, lineage rule, authority rule, table, column, index, or data row was
changed.

## Skills used

Skills used: supabase, systematic-debugging, test-driven-development, verification-before-completion, typescript-advanced-types, karpathy

Documentation standard: ASD-STE100 Simplified Technical English

## Production symptoms

Production reported this PostgREST error for
`entity_bigdrops-main_main.save_invoice_with_items_transaction`:

```text
Could not choose the best candidate function
```

Direct Invoice creation failed.

Quotation to Invoice conversion failed.

Normal Quotation save still worked through the Phase 3.5
`save_quotation_with_items_transaction` RPC.

## Pre-fix catalog state

The live catalog was queried before repair with `supabase db query --linked`.

Every fully provisioned tenant schema had two Invoice save functions:

| Schema | Invoice RPC count | Argument counts |
| --- | ---: | --- |
| `entity_bigdrops-main_adel` | 2 | 4, 5 |
| `entity_bigdrops-main_agbado` | 2 | 4, 5 |
| `entity_bigdrops-main_alarm` | 2 | 4, 5 |
| `entity_bigdrops-main_allan` | 2 | 4, 5 |
| `entity_bigdrops-main_anthropology` | 2 | 4, 5 |
| `entity_bigdrops-main_azerbaijan` | 2 | 4, 5 |
| `entity_bigdrops-main_jig` | 2 | 4, 5 |
| `entity_bigdrops-main_lomo` | 2 | 4, 5 |
| `entity_bigdrops-main_main` | 2 | 4, 5 |
| `entity_bigdrops-main_ogombo` | 2 | 4, 5 |
| `entity_bigdrops-main_opaque` | 2 | 4, 5 |

`entity_bigdrops-main_main` had:

| OID | Arguments | Defaults |
| ---: | --- | ---: |
| 16891 | `uuid, jsonb, jsonb, text` | 2 |
| 87278 | `uuid, jsonb, jsonb, text, jsonb` | 3 |

The five-argument function included `p_cps_feedback`.

## Root cause

PostgreSQL function identity includes the function name and argument types.

Phase 3 changed the Invoice RPC from:

```sql
save_invoice_with_items_transaction(uuid, jsonb, jsonb, text)
```

to:

```sql
save_invoice_with_items_transaction(uuid, jsonb, jsonb, text, jsonb)
```

`CREATE OR REPLACE FUNCTION` did not replace the old four-argument function. It
created a second overload.

The fifth argument has a default value. A four-argument PostgREST call could
therefore match both the old function and the new function. PostgREST refused
to choose a candidate.

This was confirmed from the live catalog and from the Phase 3 / Phase 3.5
migration history.

## Files changed

| File | Purpose |
| --- | --- |
| `scripts/gen-cps-phase36-invoice-rpc-overload-hotfix.cjs` | Generates the hotfix migration from the Phase 3.5 installer. |
| `supabase/migrations/20261006130000_invoice_rpc_overload_hotfix.sql` | Drops only the obsolete four-argument overload, hardens the installer, backfills provisioned tenants, reloads PostgREST. |
| `src/tests/critical/cpsInvoiceRpcOverloadHotfix.test.js` | Regression coverage for function uniqueness, installer cleanup, generator safety, and Phase 3.5 preservation. |

## Migration created

Migration:

```text
supabase/migrations/20261006130000_invoice_rpc_overload_hotfix.sql
```

The migration adds this cleanup before the authoritative five-argument function
is installed:

```sql
DROP FUNCTION IF EXISTS __SCHEMA__.save_invoice_with_items_transaction(uuid, jsonb, jsonb, text);
```

It does not drop the five-argument function.

It does not use a dependent-object drop.

It ends with:

```sql
NOTIFY pgrst, 'reload schema';
```

## Installer hardening

`public._prov_install_tenant_rpcs` now removes the obsolete four-argument
Invoice RPC before it installs the current five-argument Invoice RPC.

Future installer runs must converge to:

```text
save_invoice_with_items_transaction count = 1
pronargs = 5
p_cps_feedback DEFAULT NULL
```

The Phase 3.5 `save_quotation_with_items_transaction` block remains present.

The Phase 3 `apply_cps_item_feedback_transaction` helper remains present.

`record_cps_audit_event` remains present.

## Generator hardening

The new generator is chained from the Phase 3.5 migration. It keeps loud anchor
guards:

```text
ANCHOR MISSING
ANCHOR NOT UNIQUE
```

The generator checks that:

- the obsolete four-argument identity is dropped exactly once,
- the five-argument Invoice RPC is installed,
- the Quotation transaction is installed,
- the CPS feedback helper is installed,
- `record_cps_audit_event` is installed,
- the obsolete drop runs before the authoritative create.

## Post-fix catalog state

After `supabase db push`, every fully provisioned tenant schema had exactly one
Invoice save function:

| Schema | Invoice RPC count | Argument count | `p_cps_feedback` | Feedback call |
| --- | ---: | ---: | --- | --- |
| `entity_bigdrops-main_adel` | 1 | 5 | yes | yes |
| `entity_bigdrops-main_agbado` | 1 | 5 | yes | yes |
| `entity_bigdrops-main_alarm` | 1 | 5 | yes | yes |
| `entity_bigdrops-main_allan` | 1 | 5 | yes | yes |
| `entity_bigdrops-main_anthropology` | 1 | 5 | yes | yes |
| `entity_bigdrops-main_azerbaijan` | 1 | 5 | yes | yes |
| `entity_bigdrops-main_jig` | 1 | 5 | yes | yes |
| `entity_bigdrops-main_lomo` | 1 | 5 | yes | yes |
| `entity_bigdrops-main_main` | 1 | 5 | yes | yes |
| `entity_bigdrops-main_ogombo` | 1 | 5 | yes | yes |
| `entity_bigdrops-main_opaque` | 1 | 5 | yes | yes |

`entity_bigdrops-main_main` now has only:

```text
save_invoice_with_items_transaction(uuid, jsonb, jsonb, text, jsonb)
```

`to_regprocedure` confirmed:

| Probe | Result |
| --- | --- |
| four-argument Invoice identity | `null` |
| five-argument Invoice identity | present |

## Quotation RPC verification

Every fully provisioned tenant schema still has exactly one
`save_quotation_with_items_transaction`.

All 11 provisioned schemas have `pronargs = 5`, `p_cps_feedback`, and the
feedback helper call.

## Flow verification

### Flow A: direct Invoice creation

Live non-writing resolution was verified against `entity_bigdrops-main_main`.

A four-argument call to the Invoice RPC reached the permission gate and returned:

```text
42501: Insufficient permissions: invoice/create required
```

This proves the call resolves to the single authoritative function and no
longer fails candidate selection.

Browser persistence with a real authenticated production user was not run.

### Flow B: Quotation to Invoice conversion

The production conversion path still calls
`save_invoice_with_items_transaction`. The catalog now exposes one candidate,
so conversion cannot hit the prior ambiguity.

No production chain was fabricated.

Browser conversion with a real authenticated production user was not run.

### Flow C: normal Quotation save

The Phase 3.5 Quotation transaction remains installed in all 11 provisioned
schemas. The focused Phase 3.5 suite passed.

A four-argument Quotation RPC probe reached the permission gate and returned:

```text
42501: Insufficient permissions: quotation/create required
```

This confirms function resolution reaches the Quotation RPC.

### Flow D: CPS-derived Invoice edit

The five-argument Invoice RPC body remains the Phase 3 implementation and still
calls `apply_cps_item_feedback_transaction`.

The focused Phase 3 and Phase 3.5 feedback suites passed.

No safe seeded CPS-derived Invoice fixture was available for live browser
editing, so runtime row-write success is not claimed.

## Partial-write investigation

The reported PostgREST error occurred during function candidate resolution.
That step happens before PL/pgSQL function execution.

Therefore the ambiguous call cannot enter the Invoice function and cannot create
an Invoice parent, Invoice items, authority handoff, conversion-chain mutation,
or audit event.

Record-specific confirmation requires the failed production request ids. No
heuristic delete or repair was performed.

## Verification

| Check | Result |
| --- | --- |
| `supabase db diff --linked` | Failed because the CLI tried to create a Docker-backed shadow database. Docker/Podman is unavailable and prohibited by project rules. |
| `supabase db push` | Passed. Applied `20261006130000_invoice_rpc_overload_hotfix.sql`. |
| second `supabase db push` | Passed. Remote database is up to date. |
| Pre-fix catalog query | 11/11 provisioned schemas had two Invoice RPCs: 4 and 5 args. |
| Post-fix catalog query | 11/11 provisioned schemas have exactly one Invoice RPC, 5 args. |
| Quotation catalog query | 11/11 provisioned schemas have exactly one Quotation RPC, 5 args. |
| Function resolution probe | Invoice and Quotation calls reach permission gates, not candidate ambiguity. |
| Focused suites | 96 tests passed, 0 failed. |
| `bun run audit:load` | Exit 0. Existing audit warnings remain. |
| `bun run typecheck` | Exit 0. |
| `bun run test` | Exit 1 due to pre-existing unrelated baseline failures. New and affected CPS suites passed. |
| `git diff --check` | Exit 0. Git reported line-ending warnings on pre-existing modified files. |
| `git status --short` | Shows this hotfix plus pre-existing concurrent changes. |
| `bun run build` | Not run. Build is prohibited on this host. |

Focused suites run:

```text
cpsInvoiceRpcOverloadHotfix.test.js
cpsQuotationTransactionParity.test.js
cpsDownstreamFeedback.test.js
cpsChainIntegrity.test.js
```

Result:

```text
96 pass / 0 fail
```

Known full-suite failures remain in unrelated baseline areas, including browser
environment integration tests, stale CPS view redesign assertions, and
`itemCleanupExportImport`.

## Supabase push status

`supabase db push` applied the migration successfully.

A second push returned:

```text
Remote database is up to date.
```

## Risks or limitations

- No browser session was used to create a real Invoice or convert a real
  Quotation after the hotfix.
- No production CPS-derived chain fixture was fabricated.
- Exact partial-write inspection for failed production attempts requires the
  failed request or document ids.
- `supabase db diff --linked` cannot be used on this host because it requires
  Docker/Podman for a shadow database.
- The working tree includes many pre-existing concurrent changes that this
  hotfix did not modify.

## Deferred work

- Run the two user flows in the browser with a real authenticated production
  user.
- If failed production request ids are available, inspect those specific ids for
  record-specific confirmation.
