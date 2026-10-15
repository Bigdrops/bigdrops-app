# Phase C1 — Supplier Purchase Order Domain and Persistence

Status: **implemented, verified locally**. Migration is **not applied to any database**.
Date: 2026-10-15. Branch: `main` (shared checkout, uncommitted).

A Supplier Purchase Order is an outgoing procurement commitment. BOURXE issues it
to a supplier to request goods or services at agreed costs. It is not a sales
invoice, not a quotation, not a customer order, not an expense posting, not a
goods receipt, and not a supplier payment.

This phase builds the backend authority only. No UI, no PDF.

---

## 1. Exact files changed

### New — database

| File | Lines | Purpose |
| --- | --- | --- |
| `supabase/migrations/20261016090000_purchase_order_domain_and_persistence.sql` | 853 | Tables, constraints, provisioning registry, RLS, permissions, prefix key, tenant convergence, save RPC |

### New — domain (`src/domain/purchase-order/`)

| File | Purpose |
| --- | --- |
| `types.ts` | PO header and item contracts, status vocabulary, factories, row parsing |
| `status.ts` | Life cycle transition table and guards |
| `validation.ts` | Pure draft validation |
| `normalize.ts` | Save-RPC payload normalisation |
| `calculations.ts` | Financial adapter over the canonical engine |
| `numbering.ts` | PO numbering contract over the shared primitives |

### New — persistence (`src/modules/purchase-order/`)

| File | Purpose |
| --- | --- |
| `purchaseOrderService.ts` | Tenant-scoped service, transactional save, numbering retry, reads, archive |

### New — tests (`src/tests/critical/`)

| File | Tests |
| --- | --- |
| `purchaseOrderDomain.test.js` | Types, life cycle, validation, numbering, payload |
| `purchaseOrderCalculations.test.js` | Financial adapter against the real engine |
| `purchaseOrderPersistence.test.js` | Save/read contract, isolation, migration schema contract |

### Modified — 2 tracked files, 10 added lines, no deletions

| File | Change |
| --- | --- |
| `src/domain/prefixConstants.ts` | `+ purchase_order: 'PO'` in `DEFAULT_PREFIXES` |
| `src/pages/settings/DocumentPrefixesSettingsSection.tsx` | `+9` lines: the four `Record<DocumentPrefixKey, …>` maps and the saved-prefix literal |

The settings edit is **forced by the type system**, not a design choice.
`DocumentPrefixes = Record<DocumentPrefixKey, string>` and the section's
exhaustive `LABELS`, `PREFIX_INFO`, `PREVIEW_TEMPLATES` and `savedPrefixes`
maps all fail to type-check the moment a key is added. Leaving them un-updated
would have failed verification, so the alternative was to not add the key at
all — which the brief forbids.

### Modified — one test widened in a guarded way

| File | Change |
| --- | --- |
| `src/tests/critical/supplierDomain.test.js` | Test 59 narrowed; test 59b added |

Test 59 was Phase A's scope guard: *"no purchase order route or numbering was
introduced"*. It asserted three things:

1. no `purchase-order` route in `AppShell`
2. no `purchaseOrder` page in `AppShell`
3. no `purchase_order` key in `prefixConstants.ts`

Assertion 3 is **directly superseded** by this brief, which requires adding the
PO key to the numbering authority. Assertions 1 and 2 still stand and still
pass. Test 59 keeps assertions 1 and 2, and new test 59b asserts the PO key now
exists *positively*, alongside the unchanged invoice, quotation and CPS keys.

This is a scope-boundary update for a phase that was explicitly authorised
later. No assertion was weakened to hide a defect, and the change is visible in
the diff.

---

## 2. Financial authority decision

**Authority: `computeDocument()` in `src/lib/Calculations.ts`.** `Calculations.ts`
was **not modified**.

The evidence for reuse was unambiguous:

- `.claude/agent-instructions/core-guardrails.md` designates `computeDocument()`
  as the only permitted financial entry point and forbids duplicating or
  bypassing `Calculations.ts`.
- The approved PO architecture audit mandates reuse: *"Do not add a new
  calculation path."*
- `docs/standard/` contains **no** financial contract and **zero** extra-charge
  semantics, so there was no competing authority to follow.

No financial rule was invented, and no rule was inferred. Everything below is
the engine's own documented behaviour:

| PO contract | Engine source |
| --- | --- |
| line amount = quantity × unit_cost | `line_subtotal` = `qty × unit_price` |
| subtotal = sum of line amounts | `subtotal` |
| discount applied before VAT | `discountTiming: 'before_tax'` |
| fixed before-tax discount distributed proportionally across eligible taxable rows | engine's fixed-discount pass |
| VAT on each row's reduced base | `vat` |
| extra charge VAT base | the charge's **own explicit `withTax` flag** — read, never inferred |
| total | `grandTotal` |

**The adapter contains no arithmetic.** It maps procurement data into the
engine's prepared input and maps the result back out.

### Precedent used

`src/domain/cps/calculations.ts` already drives the canonical engine from a
**non-sales** document:

```ts
computeDocument({ items, document: {}, cf, columns })
```

The PO adapter follows that exact shape. `document` is always `{}`, so no
stored total can ever be read as a rate input. This is asserted by
`po calc: stored totals are never read as rate inputs`.

### Field-name mapping

`unit_cost` occupies the engine's `unit_price` slot, because that slot is the
engine's per-unit amount input. A PO has **no** `unit_price` field anywhere, so
a procurement cost cannot be confused with a sales price. Asserted by
`po calc: the prepared engine input never reads a stored document total`.

### WHT

Out of scope for the MVP. The adapter passes an explicit `whtValue: 0`, so
`wht` is 0 and `grandTotal` equals `totalPayable` **by construction**, not by
assumption. `total` is `grandTotal`. The PO header has no WHT column.

### Install rate

`PURCHASE_ORDER_COLUMNS` sets `install_rate` to `hide_full`. The engine
therefore nulls the field outright rather than merely hiding it, and
`installRateTotal` is 0 on every PO. A procurement line has no workmanship
component. Asserted by `po calc: a purchase order never carries an install or
workmanship component`.

### Rounding

**No rounding rule exists in this phase.** The engine returns full `Decimal`
precision (`toNumber()`, no `toDecimalPlaces`), and the PO persists exactly what
the engine returns. Nothing was rounded or truncated.

---

## 3. Schema contract

Both tables live in `tenant_master_template` and clone into every `entity_*`
schema. Every foreign key is **intra-schema**, so a PO can never cross a tenant
boundary.

### `purchase_orders`

`id`, `po_number`, `po_date`, `supplier_id`, `supplier_name`, `status`,
`currency`, `subtotal`, `discount`, `vat`, `extra_charges` (jsonb), `total`,
`calculation_inputs` (jsonb), `notes`, `terms`, `created_at`, `updated_at`,
`created_by`, `updated_by`, `archived_at`.

Constraints:

- `purchase_orders_po_number_key UNIQUE (po_number)` — database-enforced number
  uniqueness, so concurrent saves cannot collide.
- `purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES
  tenant_master_template.suppliers(id)` — plain `NO ACTION`, so a supplier on
  any PO cannot be deleted and a PO cannot be orphaned.
- `check_purchase_orders_status CHECK (status IN ('draft','issued','cancelled','closed'))`.
- `purchase_orders_amounts_non_negative CHECK (subtotal >= 0 AND discount >= 0
  AND vat >= 0 AND total >= 0)` — range only; the database never derives a total.

Indexes on `supplier_id`, `status`, `po_date`, `archived_at`.

**Deliberate absences:** no `client_id`, no accounting or posting columns, no
project linkage, no WHT column.

### `purchase_order_items`

`id`, `purchase_order_id`, `description`, `quantity`, `unit`, `unit_cost`,
`line_total`, `sort_order`, `created_at`, `updated_at`.

- Non-negative CHECKs on `quantity`, `unit_cost`, `line_total`.
- `purchase_order_items_purchase_order_id_fkey` → `purchase_orders(id)`.
- Composite index on `(purchase_order_id, sort_order)`.

`id` is the stable item identity; `sort_order` preserves line ordering.
**No Item Library foreign key** — a PO line is free text plus a cost and must
survive Item Library changes. No stock or receiving columns.

### `calculation_inputs` — why rates are stored beside totals

`computeDocument()` reads **rates**, never stored totals, and inverting totals
back into rates is lossy. Reopening a PO therefore needs the rate inputs:
`{ vatPercent, discountType, discountTiming, discountValue }`. This is a
faithful copy of the existing invoice/quotation posture and invents no rule.

### Supplier snapshot

`supplier_name` is resolved from the **supplier row inside the same tenant
schema**, never from the request. A caller therefore cannot claim a name that
does not belong to the supplier id it sent. It is written on **create only**:
the update branch's `SET` list omits `po_number`, `supplier_id` and
`supplier_name`, so a later supplier rename cannot rewrite history.

---

## 4. Numbering behaviour

The PO joins the established authority. **No independent numbering engine was
built.** Reused unchanged: `formatDocumentNumber`, `nextAutomaticNumber`,
`findFreeSequence`, `parseTrailingSequence`, `resolvePrefix`, and the
`settings.document_prefixes.__auto_seq` cursor protocol.

| Rule | How it is met |
| --- | --- |
| Automatic numbers use the configured prefix | `settings.document_prefixes.purchase_order`, fallback `PO` |
| Manual numbers must be unique | unique constraint; collision surfaced, never replaced |
| Manual numbering must not advance the automatic sequence | cursor advanced only for automatic numbers |
| Automatic numbering skips occupied numbers | `findFreeSequence` skip-scan over ground-truth rows |
| Preview follows the canonical format | `formatDocumentNumber` → `{PREFIX}-{6 digits}` |
| Concurrent saves cannot duplicate | unique constraint rejects the loser; loser retries a fresh candidate |
| Invoice / Quotation / CPS numbering unchanged | those keys and generators are untouched |

The `purchase_order` key was added in three places: `DEFAULT_PREFIXES`, the
`settings` CHECK constraint in every schema (plus a backfill that only fills a
missing key and never overwrites a value), and the four exhaustive settings maps.

Bootstrapping matches the invoice and RFQ generators: with no stored cursor the
scan starts above the highest allocated number. The skip-scan is what makes a
fully occupied run safe, and that case is tested.

---

## 5. Status transition table

```
draft      -> draft | issued | cancelled
issued     -> issued | cancelled | closed
cancelled  -> cancelled                      (terminal)
closed     -> closed                         (terminal)
```

A self-transition is legal; re-saving without changing status is a normal
content edit.

- *"A cancelled PO must not be silently reactivated"* — `cancelled` has no edge
  to `draft` or `issued`.
- *"A closed PO must not be edited as an active draft"* — `closed` has no edge
  to `draft`.

Deliberately absent: `partially_received`, `received`, `partially_paid`,
`paid`. PO status is never derived from invoice payment rules and never from
goods received.

Enforced **twice**: in `src/domain/purchase-order/status.ts` (user-facing
refusal) and inside the save RPC (so a caller that bypasses the module still
cannot make an illegal transition).

---

## 6. Transactional save design

`save_purchase_order_with_items_transaction(p_entity_id, p_purchase_order_payload, p_items, p_mode)`
— `SECURITY DEFINER`, `SET search_path TO 'public'`. The invoice and quotation
save RPCs are **not** reused.

| Guarantee | Mechanism |
| --- | --- |
| Header and items committed atomically | one function body, one transaction |
| No partial header/item write can survive | any failure rolls the whole save back |
| Supplier exists and belongs to this tenant | same-schema existence probe plus the FK |
| Number uniqueness | unique constraint plus create-path retry |
| Legal transitions only | previous status read, then the transition table |
| Invalid amounts and quantities rejected | explicit range guards plus table CHECKs |
| Item order preserved | `sort_order` from array position |
| Historical supplier snapshot preserved | snapshot written on create, absent from the update `SET` |
| Stable identifier and number returned | `{ id, purchase_order, items_saved }` |
| Retry / concurrency safe | `withUniqueRetry`: manual surfaced, automatic regenerated |
| Permission enforced | `has_entity_permission(... 'purchase_order', 'create'|'edit')` |

Client-side, `savePurchaseOrder()`:

1. computes totals through `withPurchaseOrderTotals()` — a caller-supplied total
   is never trusted, so a header can never disagree with its own lines;
2. validates the draft;
3. update: reads the stored status and refuses an illegal transition **before**
   the transaction starts;
4. create: allocates the number (manual authoritative, or automatic with
   collision retry) and advances the cursor only for automatic numbers;
5. maps deliberate database refusals onto user-facing copy.

`po_number` and `supplier_id` are identity. The update branch does not list them
in its `SET` clause, and the service never sends a supplier name.

---

## 7. Tenant provisioning and security

- `purchase_orders` and `purchase_order_items` added to
  `_prov_get_template_tables()`, so new tenants receive them.
- `_prov_table_to_resource()`: both map to the dedicated **`purchase_order`**
  resource, so procurement access can be granted or withheld without touching
  any other directory.
- `_prov_seed_default_permissions()` now seeds `purchase_order` alongside the
  existing resources.
- `_perm_pair_is_canonical()` now accepts `purchase_order`, or role-template
  assignment would raise *"Non-canonical permission pair"*.
- `_prov_install_rls(schema, table, entity_id, 'purchase_order')` applies the
  canonical `_select` / `_insert` / `_update` / `_delete` policy set with
  `FORCE ROW LEVEL SECURITY`.
- `_prov_install_canonical_triggers()` applies `set_row_updated_at` and
  `stamp_row_ownership`.
- Grants to `anon`, `authenticated`, `service_role`.

`SECURITY DEFINER` protections are not weakened. No cross-tenant path exists:
every FK is intra-schema and the RPC resolves the schema from the entity id.

### Existing-tenant convergence

Every `entity_*` schema converges: missing tables cloned, FKs restored,
policies installed, triggers installed, grants applied, owner permissions
seeded. `_prov_clone_table` drops foreign keys, so the intra-schema FKs are
restored explicitly afterwards — the header before the item table, so the item
table's reference resolves.

A schema that cannot carry a PO (it has no `suppliers` table, or it does not
resolve to an entity row) is **skipped by name with a reason**, following the
documented incomplete-tenant skip policy. Any other error propagates and fails
the migration. Errors are never swallowed.

### All four redefined functions verified strictly additive

Each was mechanically diffed against its live predecessor
(`20261015120000_supplier_domain_and_party_links.sql`). The only differences are
the new PO entries:

| Function | Difference from live |
| --- | --- |
| `_prov_get_template_tables` | `+ 'purchase_orders', 'purchase_order_items'` |
| `_prov_table_to_resource` | `+ 2 WHEN` branches before `ELSE` |
| `_prov_seed_default_permissions` | `+ ('purchase_order')` |
| `_perm_pair_is_canonical` | `+ 'purchase_order'` |

All four bodies otherwise match the live definitions. The prefix CHECK was
reproduced with its **8 live keys** (`letter` is absent from the live
constraint) plus `purchase_order`. Unrelated prefix drift was **not** repaired.

---

## 8. Accounting and inventory isolation

A PO is a procurement commitment only. Nothing in this phase writes
`source_transactions`, `journal_entries`, `journal_lines`, `accounting_accounts`,
`accounting_periods`, `expenses`, `payments`, `receipts`, `invoices`,
`invoice_items`, or any stock table. No automatic accounts payable posting is
introduced.

The invoice save path dispatches `syncInvoiceAccountingEvent`; **the PO save path
deliberately does not**. Two tests enforce this: one asserts the runtime call
trace touches no forbidden table and no RPC other than the PO transaction; the
other asserts the service source names no accounting authority.

---

## 9. Verification results

### Commands run

| Command | Result |
| --- | --- |
| `bun run audit:load` | exit 0. **No finding in any `purchase-order` file.** |
| `bun run typecheck` | **exit 0**, clean, run after the final edit |
| `bun run test` (beyond the PO files) | 1282 tests, 1267 pass, 15 fail |
| PO-focused run | **52 tests, 52 pass, 0 fail** |
| `git diff --check` | clean |
| `git diff --stat` (my files) | 2 files, 10 insertions, 0 deletions |

`bun run build` was **not** run, per the permanent host RAM prohibition.

### The 15 suite failures are pre-existing — proven against a baseline

A detached `git worktree` at `HEAD` (untouched) was used as the baseline. It
reports **18 failures**, a strict superset of the 15 seen with my changes:

| | Baseline @ HEAD | With Phase C1 |
| --- | --- | --- |
| Failing tests | 18 | 15 |
| Tests total | 1128 | 1282 |

Every failure in my run appears in the baseline set: `cpsIndustry`,
`cpsLedger`, `cpsPdf`, four CPS view-contract tests, `invoiceAccountingIntegration`,
`paymentAccountingIntegration`, `remediationContract`, `sourceTransactionContract`,
`validateFlaggedCleanupImport`, and two theme-toggle tests. Their subjects —
`src/components/csr/CsrFormScreen.tsx`, CPS view CSS, the accounting RPCs — are
**not files I touched**, and several are unmodified in the working tree.

The one failure my changes *did* introduce was supplier test 59, now resolved.
**Phase C1 therefore introduces zero new failures.** The three baseline-only
failures are in files concurrently modified in this shared checkout by other
agents and are not part of this change.

---

## 10. Cloud push status

**No cloud operation was performed.** The migration exists in the local working
tree only and has **not** been applied to any database, local or remote. No
`sites_*`, no remote `psql`, no hosted migration push. Cloud migration success
is not claimed.

Applying it is a separate, authorised operation.

---

## 11. Pre-existing issues left untouched

Deliberately **not** fixed, to keep the diff scoped:

- **`letter` prefix drift.** `DEFAULT_PREFIXES` has a `letter: 'LTR'` key, but
  the live `check_document_prefixes_format` constraint pattern-checks only 8
  keys and omits `letter`. Repaired nowhere; reproduced faithfully.
- **`activity_events.entity_type` and `AuditEntityType` are closed sets** that
  exclude `purchase_order`. See the blocker below.
- **`bun run audit:load` findings**: 8 broad `select('*')` list queries and 4
  heavy limits in `item-library`, `reports`, `tax`, `ComplianceHub`,
  `NewTaxComputation`, `CsrFormPage`, `view-csr-actions`, `WaybillFormPage`.
  All pre-existing; none in files this phase touched.
- **52 oversized files** reported by the load audit, including `CsrFormPage`
  (957 lines) and `QuotationFormPage` (784).
- **15 pre-existing test failures** described in §9, owned by other work
  streams.

No concurrent work was modified, cleaned, or reverted.

---

## 12. Blockers requiring product approval

1. **Life-cycle audit is deferred.** The brief says to follow established audit
   standards, but `AuditEntityType` (`src/lib/audit.ts`) and the
   `activity_events.entity_type` CHECK are closed sets that do not include
   `purchase_order`. Wiring PO audit would mean editing a shared union type and
   an existing table's constraint in every schema. Deferred to the PO life-cycle
   phase. **Decision needed:** extend those allowlists when PO audit is wired,
   and confirm PO audit belongs to the document audit stream.

2. **Should content be frozen on a terminal PO?** This phase allows content
   edits on a `cancelled` or `closed` PO while forbidding any status change out
   of them. The brief's wording ("must not be edited **as an active draft**") was
   read as a status rule, and a content freeze was deliberately **not** invented,
   because the brief also says to avoid inventing irreversible behaviour.
   **Decision needed:** if a terminal PO must be fully immutable, that becomes a
   new rule in `status.ts` and a new guard in the save RPC.

3. **PO deletion is not implemented.** Archiving is available for both
   directions. A hard delete is not offered because `purchase_order_items`
   references the header without `ON DELETE CASCADE`, so deleting a PO with items
   would fail. **Decision needed:** whether a hard delete is required for drafts
   at all.

4. **`purchase_order` prefix row is now visible in Settings.** It appears as
   "Purchase Order" in the existing Document Prefixes section. This is a
   consequence of joining the numbering authority, not a PO page. **Confirm**
   this is acceptable ahead of the PO UI phase, or hide the row until then.

5. **Manual numbers on update are ignored.** The number is immutable identity,
   matching the invoice convention. **Confirm** that a PO number must never be
   corrected after creation, or the RPC's update branch needs to accept it.

---

## 13. Acceptance criteria

| Criterion | Status |
| --- | --- |
| PO header and item contracts exist | Met — `src/domain/purchase-order/types.ts` |
| Tenant-scoped PO tables exist | Met — migration, `tenant_master_template` + convergence |
| Supplier foreign keys enforced | Met — intra-schema FK, `NO ACTION` |
| Number uniqueness enforced | Met — `purchase_orders_po_number_key` |
| PO numbering follows existing rules | Met — shared primitives, `purchase_order` key |
| Procurement calculation contract explicit | Met — adapter over `computeDocument()` |
| Status transitions defined and enforced | Met — table in `status.ts` and in the RPC |
| Create/update persistence transactional | Met — single save RPC |
| New tenant provisioning includes PO tables | Met — `_prov_get_template_tables()` |
| Eligible existing tenants converged | Met — convergence block; incomplete schemas skipped by name |
| RLS and permissions follow standards | Met — canonical policies, grants, triggers, seeded resource |
| No accounting postings introduced | Met — asserted by two tests |
| No inventory movements introduced | Met — no stock or receiving tables |
| No PDF renderer modified | Met — neither renderer touched |
| No UI implementation introduced | Met — no route, page, form, nav or descriptor |
| Invoice, Quotation, CPS, Supplier behaviour preserved | Met — additive only; only test 59 narrowed, with 59b added |
| Typecheck passes | Met — exit 0 |
| Data-layer audit passes | Met — no finding in any PO file |
| Focused tests pass | Met — 52/52 |
| Git diff contains only intended changes | Met — 10 insertions in 2 tracked files, all additive |
| No build command executed | Met |

### Verified explicit non-goals

- No `client_id` in any PO table; no FK from a PO into `clients`.
- `client_supplier_links` is never read by the save authority; a dual-role
  business stays a supplier in the PO context.
- `unit_cost` never occupies a sales-price field.
- No `partially_received`, `received`, `partially_paid`, or `paid` status.
- No scoped-exclusion item was built: no PO page, list, detail, navigation,
  form descriptor, `SupplierPartySelector`, PDF, search, RFQ-to-PO conversion,
  goods receiving, supplier payments, inventory movement, unified Businesses
  directory, or commercial-party registry.
