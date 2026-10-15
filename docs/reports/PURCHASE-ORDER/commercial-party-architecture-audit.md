# Commercial Party Architecture — Audit Report

This report was written by Buffy on 2026-10-15 via Freebuff Desktop.

Skills used: supabase-postgres-best-practices, supabase, karpathy
Documentation standard: ASD-STE100 Simplified Technical English

Skill selection: `docs/PROJECTSKILLINDEX.md` was read to locate candidate skills. Three were loaded and applied.

- `supabase-postgres-best-practices` — RLS, schema design, indexing, and migration rules.
- `supabase` — migration workflow, exposed-schema RLS rules, and `SECURITY DEFINER` warnings.
- `karpathy` — simplicity-first and surgical-change discipline. This report changed no code.

No skill for multi-tenancy, domain modeling, or systematic debugging is registered in the index under those names. No other skill was loaded.

---

## Objective

Determine the correct Commercial Party Architecture for BOURXE.

A product requirement is now clear: one business entity can act as both a client and a supplier. These two roles must not create conflicting identities or mix financial transactions.

The preferred product direction is:

- One commercial identity.
- Multiple business roles.
- Independent document and financial semantics.

This is a design preference. It is not permission to force a shared-table migration.

The report must find the safest architecture that the repository evidence supports.

## Scope

The client authority, every `client_id` consumer, supplier and vendor precedents, the accounting boundary, tenant provisioning, RLS, grants, foreign keys, document snapshots, search, and provisioning migration risk.

Invoice, Quotation, RFQ, CPS, Project, Waybill, Receipt, and Expense relationships are inspected as evidence.

This is an investigation. No application code, schema, migration, test, or configuration file changed.

## Files changed

| File | Change |
|---|---|
| `docs/reports/PURCHASE-ORDER/commercial-party-architecture-audit.md` | Created |

No other file changed. No migration created. No test changed.

## Changes made

One audit report. No source change.

## Verification result

```
Verification:
- git status before work: 7 modified, 5 untracked (Phase 3 search work + prior PURCHASE-ORDER audit)
- git status after work: identical, plus this report only
- bun run audit:load: not run (forbidden — zero-code audit)
- bun run typecheck: not run (forbidden — zero-code audit)
- bun run lint: not run (forbidden — zero-code audit)
- bun run build: skipped due to hardware policy
- supabase db push: not applicable — no SQL changed
```

## Supabase push status

Not applicable. No SQL changed.

---

# 1. Executive Verdict

**Verdict: Linked Role Directories (Option B).**

Keep `clients` as the authoritative client-role directory. Add an independent `suppliers` directory with its own stable ID. Link records that represent the same business through an explicit, human-confirmed link. Do not merge parties by name.

Confidence: **high** for Option B as the immediate phase.

- The change is additive. No existing `client_id` value changes.
- Accounting is already isolated. It uses `counterparty_type` text, not `client_id`. See §9.
- Only four real `client_id` foreign keys exist. Two document tables carry `client_id` with no foreign key at all. See §3.

Confidence: **medium** on whether the shared registry (Option C) is ever needed. Option B can evolve into Option C additively. The evolution path is documented in §14. It needs product approval before it starts. See §16.

Prerequisites for Option B:

1. A `suppliers` table in `tenant_master_template`, plus provisioning registration and an existing-tenant backfill. See §10.
2. An explicit party-link concept. A link is a decision made by a user, not an inference from a name.
3. A supplier picker that does not read the `clients` table. See §12.

The decisive evidence:

| Question | Answer | Evidence |
|---|---|---|
| Does accounting reference `client_id`? | No | `counterparty_type` / `counterparty_name` text only |
| Do all client-linked tables have a `client_id` foreign key? | No | `invoices` and `csrs` have none |
| Is `clients.name` unique? | No | Index is non-unique |
| Is there any supplier authority today? | No | Zero supplier tables, columns, or components |
| Is there a party-agnostic reference precedent? | Yes | `letters.recipient_id` |

---

# 2. Current Client Domain Map

## 2.1 Table definition

| Item | Value | Evidence |
|---|---|---|
| Canonical template | `tenant_master_template.clients` | `supabase/migrations/20260915194332_tenant_template_seed.sql:35` |
| Original definition | `public.clients` | `supabase/migrations/20260520090000_core_tables.sql:87` |
| Primary key | `id uuid` default `gen_random_uuid()` | `20260520090000_core_tables.sql:147` |

Columns:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Not null, primary key. Stable identity. |
| `name` | text | Not null. Not unique. |
| `address` | text | Not null. Single free-text field. `address2` exists only in the form, not the table. |
| `phone` | text | Nullable. |
| `email` | text | Nullable. |
| `category` | text | Nullable. Form values: Residential, Commercial, Industrial, Government, NGO, Other. |
| `notes` | text | Nullable. |
| `city` | text | Nullable. |
| `state` | text | Nullable. |
| `contact_person` | text | Nullable. |
| `archived_at` | timestamptz | Nullable. Present but unused by the list query. |

Indexes: `idx_clients_name` and `idx_clients_archived_at`, both non-unique btree (`20260520090000_core_tables.sql:156-157`; template `:1149-1150`).

There is **no unique constraint** on `name`, `phone`, or `email`. Duplicate client names are allowed today.

## 2.2 Tenant ownership

Client identity is not carried on the row. The tenant owns the row through the schema.

- Each entity has a private Postgres schema named `entity_<workspace_slug>_<entity_slug>` (`supabase/migrations/20260717000000_entity_provisioning_engine.sql:194`, `_prov_get_schema_name`).
- Provisioning clones each template table into that schema (`_prov_clone_table`, `:224`).
- RLS is installed per table by `_prov_install_rls` (`:309`). Policies use `has_entity_permission(entity_id, auth.uid(), resource, action)`.
- The application never queries `clients` without a schema-scoped client. `useEntity()` returns `tenantClient`, which is bound to the schema (`src/lib/tenant/contexts.tsx`).
- `tenantClient.schemaName` stays null until provisioning is `ready` **and** the PostgREST exposure probe passes. Every data path fails closed before that.

## 2.3 Runtime client authority

| Concern | File | Behaviour |
|---|---|---|
| Record type | `src/domain/clientWorkspace.ts` | `ClientRecord` interface |
| Picker | `src/components/ClientSelector.tsx` | Reads `clients` at `:74`. Can create a client inline. Props are `clientId` / `clientName`. |
| Create form | `src/components/client/ClientForm.tsx` | Fields: name, contact_person, category, email, phone, address, address2, city, state |
| Create page | `src/pages/AddClient.tsx` | Inserts into `clients` |
| Edit page | `src/pages/EditClient.tsx` | Updates `clients` by `id` |
| List page | `src/pages/Clients.tsx` | `select('id, name, phone, city, state, category')`. Local cache with 10-minute TTL. |
| Detail page | `src/pages/ClientDetail.tsx` | Loads the client and every `client_id`-scoped document |
| Workspace components | `src/components/client/workspace/*` | Identity bar, contact section, money strip, history |
| Nav | `src/components/layout/navData.ts:35,184,191` | A `clients` tab and `/clients` route |
| Export | `src/pages/Clients.tsx` | `ContextualExportDropdown domain="CLIENTS"` |

## 2.4 Client lifecycle behaviour

| Operation | Current behaviour | Evidence |
|---|---|---|
| Create | Direct insert into `clients` | `AddClient.tsx` |
| Edit | Direct update by `id` | `EditClient.tsx` |
| Delete | Hard delete. Cascades are not guarded at the app layer. | `Clients.tsx` `handleDelete` |
| Archive | **Stub.** Shows "Archiving is not available in this version." | `Clients.tsx` action sheet |
| Merge | **Stub.** Shows "Merging clients is not available in this version." | `Clients.tsx` action sheet |
| Uniqueness | Not enforced | No unique index |

Two consequences matter for this audit:

1. Deleting a client is currently unguarded. `receipts.client_id` has `ON DELETE RESTRICT`, so the database blocks that one case. `invoices.client_id` and `csrs.client_id` have no foreign key, so a delete silently orphans those references.
2. Archive and merge are not implemented. Any new supplier lifecycle should not assume they exist.

---

# 3. Client Dependency Inventory

## 3.1 Database consumers

Nine tables carry a client name. Six carry a `client_id`. Only four have a real foreign key.

| Table | `client_id` | `client_name` | Foreign key | Evidence |
|---|---|---|---|---|
| `projects` | Yes | Yes | **Yes** | `20260520090001_projects.sql:75` |
| `quotations` | Yes | Yes | **Yes** | `20260520090002_quotations.sql:182` |
| `invoices` | Yes | Yes | **No** | `20260520090003_invoices.sql:118,151` |
| `csrs` | Yes | Yes | **No** | `20260520090004_csrs.sql:82,107` |
| `waybills` | Yes | Yes | **Yes** | `20260520090004_csrs.sql:109` |
| `receipts` | Yes | Yes | **Yes** (`ON DELETE RESTRICT`) | `20260706000000_create_receipts.sql:53-54` |
| `wht_receipts` | No | Yes | — | template `:347` |
| `boqs` (now `cps_sheets`) | No | Yes | — | template `:646` |
| `rfqs` | No | Yes | — | template `:717` |

## 3.2 Ranked migration sensitivity

| Rank | Consumer | Sensitivity | Reason |
|---|---|---|---|
| 1 | `receipts.client_id` FK | **High** | `ON DELETE RESTRICT`. Receipt snapshots are immutable (`docs/standard/receipt-standard.md`). A receipt proves payment. Its party must never be repointed. |
| 2 | `quotations.client_id` FK | **High** | Quotation conversion and identity-immutability rules read this. |
| 3 | `projects.client_id` FK | **High** | Project documents and reports join on it. |
| 4 | `waybills.client_id` FK | **Medium-High** | Waybill delivery party. |
| 5 | `invoices.client_id` | **Medium** | No FK. The value is a plain uuid. Migration would not hit a constraint, but ~60 TypeScript sites read it. |
| 6 | `csrs.client_id` | **Medium** | No FK. CSR offline sync caches it. |
| 7 | `client_name` snapshots | **Low** | Historical text. The transformation standard requires snapshots to stay frozen. Do not rewrite them. |
| 8 | `search_documents` `client_id` parameter | **Medium** | The search contract filters by `client_id`. A shared registry must keep this meaning. |
| 9 | `PersistedClient`/`clientId` in TypeScript | **Medium** | See §3.3. |
| 10 | `letters.recipient_id` | **Low** | Already party-agnostic. Not `client_id`. |

## 3.3 Application consumers

Roughly sixty files under `src/` reference `client_id` or `clientId`. Grouped by concern:

| Concern | Representative files |
|---|---|
| Domain types | `src/domain/invoice/types.ts`, `src/domain/quotation/types.ts`, `src/domain/waybill/*`, `src/domain/receipt/types.ts`, `src/domain/projects.ts`, `src/domain/correspondence/types.ts` |
| Normalisation | `src/domain/invoice/normalize.ts`, `src/domain/quotation/normalize.ts` |
| Identity guards | `src/domain/invoice/assertIdentityImmutable.ts`, `src/domain/quotation/assertIdentityImmutable.ts`, `src/domain/receipt/assertReceiptImmutable.ts` |
| Save strategies | `src/hooks/useInvoiceSave.ts`, `src/hooks/useQuotationSave.ts`, `src/hooks/useCpsSave.ts`, `src/hooks/useLetterSave.ts` |
| Project linking | `src/components/document/ProjectLinkDialog.tsx`, `src/hooks/useProjectDocumentFetch.ts` |
| Forms | `src/components/document/FormHeader.tsx`, `src/components/document/SharedDocumentForm.tsx`, `src/components/waybill/WaybillForm.tsx`, `src/components/csr/CsrFormScreen.tsx` |
| Accounting | `src/modules/invoices/services/invoiceAccountingService.ts`, `paymentAccountingService.ts` |
| Search | `src/domain/search/types.ts`, `src/hooks/useDocumentSearch.ts`, `src/components/client/workspace/ClientDocumentSearch.tsx` |
| Native cache | `src/lib/native/invoiceCache.ts`, `quotationOffline.ts`, `csrOffline.ts` |

## 3.4 Is `client_id` identity only, or does it carry sales meaning?

It is **mixed**, and the mix is the core finding.

| Aspect | Verdict |
|---|---|
| Identity reference | Yes. `client_id` identifies the sales-side counterparty. |
| Sales-specific meaning | **Partly.** The *name* `client_id` and the *form label* "Client" are sales language. The column points at the `clients` table, which holds no accounting state. |
| Accounting meaning | **None.** No ledger, journal, or source transaction references `client_id`. See §9. |

Conclusion: `client_id` is a **party-role reference with sales-facing naming**, not an accounting key. The naming is the coupling. The data is not.

---

# 4. Supplier and Vendor Precedent Map

## 4.1 Genuine identity references

**None exist.** There is no foreign key to any supplier or vendor entity, because no such entity exists.

## 4.2 Real vendor identity (free text, but semantically a supplier)

| Location | Meaning | Evidence |
|---|---|---|
| `rfqs.vendor_name`, `rfqs.vendor_contact` | The supplier the RFQ is addressed to | `src/domain/rfq/types.ts` (`Rfq.vendor_name`, `Rfq.vendor_contact`); template `:712-722` |
| `expenses.vendor_name` | The payee on a money-out record | `supabase/migrations/20260914100000_expense_money_out.sql:21` |
| `source_transactions.counterparty_name` where `counterparty_type = 'vendor'` | The payee on the accounting boundary | `src/modules/accounting/expenseService.ts:172-173` |
| `tax_input_entries.vendor_name` | The vendor on an input-VAT record | template `:554` |

RFQ is the only place where a *document* carries a supplier-facing party field. It is still free text.

## 4.3 Free text that is NOT reliable supplier evidence

| Location | Why it is not supplier identity | Evidence |
|---|---|---|
| `boqs.vendor_name` | **Repurposed.** It stores a *client* name on legacy rows. | `src/domain/cps/normalize.ts:71-74` reads `vendor_name` as a fallback for `client_name`, and `vendor_contact` as a fallback for `project_name`. |
| `cps_sheets.show_vendor_identity` | A presentation flag inherited from BOQ. It does not name a supplier. | template `:646` region; `normalizeDbCps` |
| `project_documents.from_party`, `to_party` | Free-text party labels on an ad-hoc project record. Not identified. | template `:148-149` |
| `letters.recipient_name` | Free text. `letters.recipient_id` is an untyped uuid with no FK. | template `:621-622` |

**Rule:** never build supplier records from `boqs.vendor_name`. The audit that preceded this one reached the same conclusion.

## 4.4 Party-agnostic precedent that already exists

`letters` uses `recipient_id uuid` plus `recipient_name text`. The column is named for a **role-neutral recipient**, not for a client. This is the closest existing precedent for a party-neutral reference, and it is worth citing in the design.

## 4.5 Search authority

The search platform already understands a vendor party.

| Fact | Evidence |
|---|---|
| `MatchSource` includes `'vendor'` | `src/domain/search/types.ts:31` |
| RFQ branch matches `vendor_name` and reports `match_source = 'vendor'` at rank 500 | `supabase/migrations/20261014160000_document_search_phase3.sql:469,484` |
| Matching is by **text**, not by id. Matching a party by comparing a name would "invent a" relationship, and the migration comments say so. | `20261014160000_document_search_phase3.sql:26-29` |

`DocumentType` is `quotation | invoice | rfq | cps | csr | waybill | receipt` (`src/domain/search/types.ts:13-20`). There is no supplier or purchase-order type.

---

# 5. Three-Option Architecture Comparison

## Option A — Independent directories

`clients` and `suppliers` have no shared identity.

## Option B — Linked role directories

`clients` stays authoritative for the sales role. A new `suppliers` directory holds supplier-role records. An explicit link records that a client record and a supplier record are the same business.

## Option C — Shared party registry

A `commercial_parties` table owns identity. `party_roles` records which roles a party plays. Client-specific and supplier-specific details attach to roles.

## Comparison

| Criterion | Option A | Option B | Option C |
|---|---|---|---|
| Backward compatibility | **Best.** Zero change to existing data. | **Good.** Additive. Existing `client_id` values untouched. | **Weak.** Requires a party identity for every client and a rewrite of four FKs and the search contract. |
| Implementation complexity | **Lowest.** One table, one picker. | **Low-Medium.** One table, one link table, one picker, one linking UI. | **Highest.** Two new tables, a backfill that adopts existing client UUIDs, provisioning changes, and a compatibility layer. |
| Tenant isolation | Same as today. Provisioned like any table. | Same as today. | Same, but two more provisioned tables and a cross-table FK inside the tenant schema. |
| Duplication | **High.** A dual-role business exists twice. Contacts diverge. | **Low-Medium.** Contact data is per-role, with a link for reconciliation. Shared fields can be read through the link. | **Lowest.** One contact record per business. |
| Extensibility | Weak. A third role adds a third directory with no relationship. | **Good.** A third role follows the same pattern and can link too. | **Best.** New roles are rows, not tables. |
| UI impact | Small. A separate Suppliers area. | **Small-Medium.** A Suppliers area plus a "link to existing client" action and a role badge. | **Large.** A unified Businesses directory or a compatibility facade over two role views. |
| Accounting safety | Safe. Supplier payables never touch client receivables. | **Safe.** Supplier payables never touch client receivables. The link is a business fact, not an accounting join. | Safe **if** accounting keeps using `counterparty_type` and never joins through the shared party id. Risk exists if a future developer "simplifies" by joining on party id. |
| Migration risk | None. | **Low.** Additive. No FK rewrite. | **Medium-High.** Identity adoption for existing clients is irreversible if done wrong. |
| Satisfies "one commercial identity" | **No.** | **Partly.** One business, two records, one explicit link. | **Yes.** |

## Why Option C is not automatically best

Option C is the cleanest end state. Three pieces of evidence make it *not* the safest first step:

1. **Nothing forces it.** Accounting does not join to `clients`. Only four FKs exist, and two document tables have no FK at all. The pressure that usually forces a registry is absent.
2. **`client_id` is a contract.** The search RPC takes `p_client_id`. ~60 TypeScript files read `clientId`. A shared registry must preserve the meaning of every one of them, or add a compatibility layer.
3. **Identity adoption is irreversible.** To keep existing clients stable under Option C, the registry must adopt the existing `clients.id` values. That is a one-way migration. If it is wrong, recovery is hard.

Option C remains the correct **long-term target**. It should start only when a real cross-role requirement appears, for example a combined statement or a single contact book. §14 gives the evolution path.

## Why Option A fails the requirement

Option A is the smallest change. It fails the clarified product requirement. A client that is also a supplier becomes two unrelated rows with no link. Contacts diverge. Payment details duplicate. The same business appears twice in search. The requirement is explicit: one commercial identity. Option A does not deliver it.

## Verdict

**Option B.** It is additive, it keeps every existing `client_id` stable, it satisfies the dual-role requirement through explicit linking, and it keeps procurement and sales accounts separate. It also evolves into Option C without a rewrite.

---

# 6. Recommended Party Contract

Conceptual contract only. No SQL.

## 6.1 Stable identity

- Every party record has a generated uuid that never changes.
- A **client party** is a row in `clients`.
- A **supplier party** is a row in `suppliers`.
- Display names are attributes. They are not identity. Renaming a party never changes its id.

## 6.2 Client role

The existing `clients` contract is unchanged: name, contact person, phone, email, address, city, state, category, notes, and `archived_at`.

## 6.3 Supplier role

A supplier record carries the supplier-specific fields:

- name
- contact person
- phone
- email
- address, city, state
- notes
- `archived_at`

Supplier-specific fields that are role-specific and must **not** sit on the client record:

- supplier bank or payment details, if added later
- supplier terms, if added later

## 6.4 Role-specific details

Role-specific data stays on the role record. It is not copied to the other role. This prevents one role's edits from silently changing the other role's documents.

## 6.5 Shared contacts

A link between a client record and a supplier record expresses "same business". The link is:

- optional — a party may play one role only
- explicit — a user creates it; the system never infers it
- one-to-one per business — a client links to at most one supplier and the reverse
- non-destructive — linking changes no document and no name snapshot

Contact reconciliation is a **read** concern. A UI may show both roles' contacts side by side and offer to copy a changed value. It must not force shared storage.

## 6.6 Historical snapshots

Every document keeps its own frozen party snapshot (`client_name`, and later `supplier_name`). Snapshots are never rewritten when a party record changes. This follows `docs/standard/document-transformation-standard.md` and `docs/standard/receipt-standard.md`.

## 6.7 Lifecycle and archive

- Create: client via `clients`; supplier via `suppliers`.
- Edit: within a role only.
- Archive: per role. Archiving the supplier role must not archive the client role. `archived_at` is already the universal convention.
- Delete: per role, with the same guard rules as clients. Supplier deletion must respect future purchase-order references.
- Role transition: a business that starts as a supplier and later becomes a client creates a client record and links it. No identity is merged.

---

# 7. Dual-Role Scenarios

| Scenario | Behaviour under Option B |
|---|---|
| Existing client becomes supplier | Create a `suppliers` row. Link it to the client row. No document changes. |
| Existing supplier becomes client | Create a `clients` row. Link it to the supplier row. |
| New business starts as both | Create both rows, then link them in one guided flow. |
| Business stops acting as supplier | Archive the supplier row. The client row stays active. |
| Business stops acting as client | Archive the client row. The supplier row stays active. |
| One role archived, the other active | Supported. Archive is per role. Search and pickers filter `archived_at IS NULL` per directory. |
| Company contact changes | Edit the role that changed. If both roles should change, the UI offers to copy the value to the linked record. |
| Supplier payment details differ from client details | Payment details are role-specific fields. There is no shared payment field, so no conflict exists. |
| Same business, different billing and delivery addresses | Address is a per-role attribute. A supplier address and a client billing address are independent. |
| Two businesses with identical or similar names | Allowed. No name uniqueness exists today, and none is added. Identity is the id, not the name. |
| Historical documents keep their snapshots | Always. Linking and renaming never touch `client_name`, and later never touch `supplier_name`. |

---

# 8. Document Reference Strategy

## 8.1 Existing client references stay valid

Option B changes no `client_id` value and adds no constraint. Every existing reference keeps its meaning:

| Reference | Status under Option B |
|---|---|
| `projects.client_id` → `clients(id)` | Unchanged |
| `quotations.client_id` → `clients(id)` | Unchanged |
| `waybills.client_id` → `clients(id)` | Unchanged |
| `receipts.client_id` → `clients(id)` | Unchanged |
| `invoices.client_id` (no FK) | Unchanged |
| `csrs.client_id` (no FK) | Unchanged |
| `client_name` snapshots on nine tables | Unchanged |
| `search_documents(p_client_id)` | Unchanged meaning: sales-side party filter |

## 8.2 Supplier PO references

A future Supplier PO references the **supplier role**:

- `supplier_id` → `suppliers(id)`
- `supplier_name` — a frozen snapshot, mirroring `client_name`
- No `client_id` on a Supplier PO.

## 8.3 A linked dual-role party must not leak

The link is metadata. It must never be used to resolve a document party. Concretely:

- A Supplier PO resolves its party from `supplier_id` only. It never follows the link to a client.
- An Invoice resolves its party from `client_id` only. It never follows the link to a supplier.
- `search_documents` continues to skip supplier documents under a client scope, following the Phase 3 precedent for RFQ and CPS, which carry `AND p_client_id IS NULL` branches.

This is what keeps a dual-role party from making a Supplier PO appear as a sales document.

---

# 9. Accounting Isolation

## 9.1 The decisive finding

The accounting boundary does **not** reference `client_id`. It uses a typed free-text counterparty.

| Element | Definition | Evidence |
|---|---|---|
| `source_transactions.counterparty_type` | text, nullable | `supabase/migrations/20260906103000_source_transactions.sql:35` |
| `source_transactions.counterparty_name` | text, nullable | `:36` |

Values in use:

| Writer | `counterparty_type` | `counterparty_name` | Evidence |
|---|---|---|---|
| Invoice posting | `'customer'` | `invoice.client_name` | `src/modules/invoices/services/invoiceAccountingService.ts:111-112` |
| Payment posting | `'customer'` | client name fallback | `src/modules/invoices/services/paymentAccountingService.ts:131-132,221` |
| Expense posting | `'vendor'` | `expense.vendor_name` | `src/modules/accounting/expenseService.ts:172-173` |

## 9.2 Receivables and payables are already separate

| Side | Source | Counterparty type |
|---|---|---|
| Accounts receivable | Invoices and payments | `customer` |
| Money out | Expenses | `vendor` |

The two sides share a table but are distinguished by `counterparty_type`. No shared party identity is used or required.

## 9.3 Risk under each option

| Option | Risk of mixing receivables and payables |
|---|---|
| A | None. Separate identities. |
| B | **None.** Same as today. The link is not read by accounting. |
| C | Low, **with one caveat.** Accounting must keep using `counterparty_type`. If a future change joins source transactions through the shared party id and drops the type filter, receivables and payables could mix. |

## 9.4 No new accounting engine

This report designs no accounting. It records one rule:

> `counterparty_type` is the accounting role. It is independent of the party directory. A dual-role party produces two source transactions with two types. They never net against each other.

## 9.5 Related isolation facts

- `payments` references `invoice_id` only. It has no `client_id`. (`20260520090003_invoices.sql:77`)
- `receipts.client_id` is a snapshot copy on an immutable document. It is evidence, not a ledger join.
- Client-scoped reports read `client_name` from invoice rows (`src/components/reports/ReceivablesSection.tsx:73,87`). They do not join accounting tables to `clients`.

---

# 10. Tenant / RLS Impact

## 10.1 Mechanics that any new table must follow

| Step | Function | Evidence |
|---|---|---|
| Table list | `_prov_get_template_tables()` — a hardcoded `text[]` | `supabase/migrations/20260927162405_item_library_tier_c_stage2b_reconciliation.sql:1249` |
| Resource map | `_prov_table_to_resource()` | `:1280` |
| Schema creation | `_prov_create_schema()` — scoped `GRANT` | `20260717000000_entity_provisioning_engine.sql:207` |
| Table clone | `_prov_clone_table()` — from `tenant_master_template` | `:224` |
| FK re-add | `_prov_readd_foreign_keys()` — re-points to the target schema | `:260` |
| RLS | `_prov_install_rls()` — four policies, one resource string | `:309` |
| Triggers | `_prov_install_canonical_triggers()` | `provision_entity`, `20260927162405:1409` |
| Permissions | `_prov_seed_default_permissions()` | `20260914100000_expense_money_out.sql:207` |
| Orchestration | `provision_entity()` | `20260927162405:1352` |

The template list holds 49 tables. A new table is **not** cloned until it is added to the list. This is the primary provisioning risk.

## 10.2 Requirements per option

| Item | Option A | Option B | Option C |
|---|---|---|---|
| New template tables | `suppliers` | `suppliers`, party link | `commercial_parties`, `party_roles`, `suppliers` |
| `_prov_get_template_tables()` | +1 | +2 | +3 |
| `_prov_table_to_resource()` | +1 (`supplier`) | +2 | +3 |
| Permission resource | `supplier` | `supplier` (+ link resource or reuse `supplier`) | `supplier`, `client` retained |
| Existing-tenant backfill | 1 table | 2 tables | 3 tables + identity adoption |
| New FK inside tenant schema | None | link → `clients` and → `suppliers` | roles → parties, plus role details |
| Provisioning order risk | Low | **Medium** — the link FK requires both target tables to exist before FK re-add | High |
| Cross-tenant risk | None | None | None, if the party tables are per-schema |

## 10.3 Backfill pattern to reuse

The expenses module is the current template for an additive table:

- clone if the table is missing (`to_regclass`)
- install RLS if the policy is missing
- install the module trigger
- grant DML to `anon, authenticated, service_role`
- seed the resource permission for each workspace owner
- skip a schema by name with a warning if it cannot resolve; abort on unknown errors

Evidence: `supabase/migrations/20260914100000_expense_money_out.sql` §5.

## 10.4 Tenant boundary rule

A party link must never cross a tenant. Because tables live inside `entity_*` schemas, an intra-schema FK is physically tenant-scoped. The link table must be cloned into every `entity_*` schema, exactly like `clients`. No cross-schema party reference may be introduced.

## 10.5 RLS and grants

RLS comes from `_prov_install_rls` with the resource string. No bespoke policy is needed. Grants come from `_prov_create_schema` plus the backfill `GRANT` statement. Neither needs to change for a new table.

## 10.6 Search

The search authority needs no change in Option B, because it does not reference suppliers. A later Supplier PO phase adds a type. The client-scope filter must keep skipping supplier documents, following the RFQ and CPS precedent.

---

# 11. Identity and Duplicate Policy

## 11.1 What exists today

| Control | Status | Evidence |
|---|---|---|
| Name uniqueness | **None** | Non-unique btree index |
| Tax or registration identifiers | **None** | No such column anywhere |
| Phone uniqueness | **None** | No unique index |
| Email uniqueness | **None** | No unique index |
| Duplicate prevention | **None** | No uniqueness check in `AddClient.tsx` or `ClientSelector.tsx` |
| Archive | **Stub** | `Clients.tsx` |
| Merge | **Stub** | `Clients.tsx` |

## 11.2 Policy for the new architecture

1. **Name is not identity.** Never link or merge parties by name. The search migration already states that matching a party by name text "would invent a" relationship (`20261014160000_document_search_phase3.sql:29`).
2. **Links are explicit.** A user creates a link. The system may *suggest* a link when names are similar, but it must require confirmation.
3. **One link per business.** A client links to at most one supplier, and a supplier to at most one client. Enforce this with a unique constraint on each side of the link.
4. **Collision handling.** If two supplier records represent one business, do not auto-merge. Mark one as a duplicate candidate and require a user decision. The merge capability does not exist yet, so the first phase only records the link.
5. **Historical integrity.** Linking, archiving, and renaming never rewrite `client_name` or `supplier_name` snapshots.
6. **Archive before delete.** Prefer archive. A supplier that is referenced by a future purchase order must be blocked from deletion, following the `receipts.client_id` `ON DELETE RESTRICT` precedent.

---

# 12. UI Integration Options

## 12.1 Smallest safe UI change (Option B first phase)

| Element | Description |
|---|---|
| Suppliers entry | A new directory beside Clients, reusing `ModuleShell` and `ModuleRowCard`, the same pattern as `src/pages/Clients.tsx`. |
| Supplier picker | A `SupplierSelector` modelled on `src/components/ClientSelector.tsx` but reading `suppliers`. |
| Role badge | A small badge on the client and supplier detail pages when the party has a link. |
| Add Supplier Role | A client detail action that creates a supplier record and links it. |
| Add Client Role | A supplier detail action that creates a client record and links it. |
| Separate contact editing | Each role edits its own fields. |

## 12.2 Longer-term unified experience (later, needs approval)

| Element | Description |
|---|---|
| Unified Businesses directory | One list showing every party, filtered by role. |
| Role filter chips | Client / Supplier / Both. |
| Shared contact editing | Edit a field once and push the value to the linked role. |

## 12.3 Recommendation

Start with §12.1. It matches existing conventions, reuses `ModuleShell`, and does not touch document forms. Do not build a unified directory in the first phase. A unified directory is a UI facade over two directories, and it can be added later without changing data.

## 12.4 Navigation

`src/components/layout/navData.ts` currently has a `clients` tab and a `/clients` path (`:35,184,191,236`). A `suppliers` tab follows the same pattern. No adapter is required, because `Clients` is bespoke and is not in `adapterRegistry` (`src/config/moduleAdapters.ts:768`).

---

# 13. Risks and Mitigations

## High

| Risk | Why it matters | Mitigation |
|---|---|---|
| Reusing `client_id` for a supplier | Corrupts the client ledger and every client-scoped report | Never store a supplier id in a `client_id` column. Add `supplier_id`. |
| Auto-creating suppliers from free-text names | Creates wrong and duplicate parties. `boqs.vendor_name` was repurposed and would import client names. | Never backfill from text. `boqs.vendor_name` is forbidden as a source. RFQ promotion is a separate, approved task. |
| Linking by name | Merges two different legal entities | Require explicit user confirmation. Never auto-link. |
| Missing `_prov_get_template_tables()` update | New tenants silently do not get the table | Update the array in the same migration. Verify `tenant_master_template` and one `entity_*` schema. |

## Medium

| Risk | Why it matters | Mitigation |
|---|---|---|
| Link FK ordering in provisioning | `_prov_readd_foreign_keys` only re-adds an FK when the referenced table exists in the target schema | Both `clients` and `suppliers` must be in the template list. `clients` already is. |
| `receipts.client_id` immutability | A receipt is proof of payment | Never repoint a receipt party. Leave the FK alone. |
| Accounting drift in a future shared registry | A join through a shared party id could mix receivables and payables | Keep `counterparty_type` as the accounting role. Record the rule in the standard. |
| `client_id` naming coupling | ~60 TypeScript files and the search contract use client language | Do not rename. Add a supplier concept beside it. |
| Existing-tenant backfill failure | Some schemas are structurally incomplete | Reuse the expenses backfill pattern: skip by name with a reason, abort on unknown errors. |
| No delete guard on `invoices.client_id` / `csrs.client_id` | A client delete can orphan documents today | Out of scope for this audit. Record as a pre-existing defect. |

## Low

| Risk | Why it matters | Mitigation |
|---|---|---|
| `archived_at` unused by the client list | Archive is a stub | Do not depend on archive until it is implemented. |
| Merge not implemented | Duplicate parties cannot be consolidated | Link first. Merge later. |
| Prefix and audit-event drift | Pre-existing inconsistencies | Not affected by this phase. |

---

# 14. Recommended Implementation Sequence

Minimal and backward compatible.

**Phase 0 — Decide (no code)**

Approve Option B, the linking policy, and the UI scope. See §16.

**Phase 1 — Supplier domain foundation**

- Add `suppliers` to `tenant_master_template`.
- Add `suppliers` to `_prov_get_template_tables()` and map it to a `supplier` resource in `_prov_table_to_resource()`.
- Seed the `supplier` permission resource.
- Backfill every `entity_*` schema, following the expenses pattern.
- Add a `SupplierSelector` and a Suppliers directory.
- Add `src/domain/supplier/types.ts`.

**Phase 2 — Party links**

- Add an intra-schema link table: one client, one supplier, unique on each side.
- Provision and backfill it like any table.
- Add the link and unlink actions, and the role badge.
- Add a link resource or fold it under the `supplier` resource.

**Phase 3 — Supplier PO (separate task)**

This phase is out of scope here. It is named only to show where the supplier authority is consumed.

**Phase 4 — Optional evolution to Option C (needs approval)**

If a real cross-role requirement appears:

- Introduce `commercial_parties` additively.
- Adopt existing `clients.id` values as party ids, so no document reference changes.
- Make the link table a party-role table.
- Keep all client and supplier document references and the search contract unchanged.

## Rollback and recovery

| Phase | Rollback |
|---|---|
| 1 | Drop `suppliers` and its provisioning entries. No other table references it, so recovery is clean. |
| 2 | Drop the link table. Client and supplier rows remain valid. |
| 4 | **Hard.** Identity adoption is one-way. Take a schema dump and a migration plan before starting. |

---

# 15. File Impact Forecast

No file below was created or modified by this audit.

## New files (when the plan is approved)

| File | Purpose |
|---|---|
| `supabase/migrations/<ts>_suppliers_domain.sql` | `suppliers` table, provisioning, RLS, backfill |
| `supabase/migrations/<ts>_party_links.sql` | Link table, provisioning, backfill |
| `src/domain/supplier/types.ts` | Supplier and link types |
| `src/domain/supplier/contracts.ts` | Supplier persistence contract |
| `src/components/supplier/SupplierSelector.tsx` | Supplier party picker |
| `src/components/supplier/SupplierForm.tsx` | Supplier create/edit form |
| `src/pages/Suppliers.tsx` | Supplier directory |
| `src/pages/AddSupplier.tsx`, `src/pages/EditSupplier.tsx` | Thin delegators |
| `src/pages/SupplierDetail.tsx` | Supplier detail |
| `src/tests/critical/supplierDomain.test.js` | Structural and policy tests |

## Modified files

| File | Change |
|---|---|
| `supabase/migrations/<ts>_suppliers_domain.sql` | Re-defines `_prov_get_template_tables()`, `_prov_table_to_resource()`, `_prov_seed_default_permissions()` — additive |
| `src/components/layout/navData.ts` | Add a Suppliers entry |
| `src/components/app/AppShell.tsx` | Add supplier routes |
| `src/pages/ClientDetail.tsx` | Add "Add Supplier Role" and a role badge |

## Protected files — do not touch

| File | Reason |
|---|---|
| `src/lib/Calculations.ts` | Financial source of truth |
| All existing migrations | New work is additive only |
| `receipts.client_id` and its FK | Immutable evidence |
| `client_name` snapshots | Historical integrity |
| `src/components/document/SharedDocumentForm.tsx` | Form refactor is out of scope |
| `src/components/rfq/*` | RFQ is not modified in this phase |
| Accounting tables and services | No accounting change |

---

# 16. Open Product Decisions

## 16.1 Decisions that need user approval

| # | Decision | Why it needs approval |
|---|---|---|
| 1 | Adopt Option B as the architecture. | It defines the whole procurement direction. |
| 2 | Approve explicit party linking (one business, two linked records). | It is a product policy about identity. |
| 3 | Choose separate directories or a unified Businesses directory for phase 1. | It changes the UI scope. |
| 4 | Decide whether a supplier may store bank or payment details now or later. | It adds fields and possibly sensitive data. |
| 5 | Decide whether suppliers get their own permission resource, or reuse `client`. | It changes RLS and the settings UI. |
| 6 | Decide whether to ever migrate `client_id` values (Option C). | Irreversible if done wrong. |
| 7 | Decide whether RFQ should later reference the supplier authority. | It changes the RFQ form, which this phase protects. |

## 16.2 Questions resolvable from repository evidence

| # | Question | Answer |
|---|---|---|
| 1 | Does accounting reference `client_id`? | No. It uses `counterparty_type`. |
| 2 | Do all client-linked tables have an FK? | No. `invoices` and `csrs` have none. |
| 3 | Is client name unique? | No. |
| 4 | Is there a supplier authority? | No. |
| 5 | Can a new table be provisioned? | Yes, by updating the template list and the resource map. |
| 6 | Does search understand a vendor? | Yes. `MatchSource` has `'vendor'`; RFQ matches by name text. |
| 7 | Is archive implemented for clients? | No. It is a stub. |
| 8 | Is merge implemented? | No. It is a stub. |
| 9 | Is there a party-agnostic reference precedent? | Yes. `letters.recipient_id`. |
| 10 | Is `boqs.vendor_name` a safe supplier source? | No. It was repurposed to hold a client name. |

---

# 17. Evidence Index

Every claim in this report traces to a verified source.

| Claim | Evidence |
|---|---|
| `clients` definition | `supabase/migrations/20260520090000_core_tables.sql:87`; template `20260915194332_tenant_template_seed.sql:35` |
| `clients` primary key | `20260520090000_core_tables.sql:147` |
| `clients` indexes (non-unique) | `20260520090000_core_tables.sql:156-157` |
| `clients` RLS and policies | `20260520090000_core_tables.sql:168,179-184` |
| `projects.client_id` FK | `20260520090001_projects.sql:75` |
| `quotations.client_id` FK | `20260520090002_quotations.sql:182` |
| `invoices` has no `client_id` FK | `20260520090003_invoices.sql:118,151` (only pkey and `project_id`) |
| `csrs` has no `client_id` FK | `20260520090004_csrs.sql:82,107,108` |
| `waybills.client_id` FK | `20260520090004_csrs.sql:109` |
| `receipts.client_id` FK `ON DELETE RESTRICT` | `20260706000000_create_receipts.sql:53-54` |
| `payments` has no `client_id` | `20260520090003_invoices.sql:77` |
| Nine tables carry `client_name` | template `:119,171,241,347,371,448,597,646,717` |
| `wht_receipts.client_name` | template `:347` |
| `boqs`/`cps_sheets` client name only | template `:646` |
| `rfqs` client name and vendor text only | template `:712-722` |
| Client picker reads `clients` | `src/components/ClientSelector.tsx:74` |
| Client list query and cache | `src/pages/Clients.tsx` |
| Client create/update | `src/pages/AddClient.tsx`, `src/pages/EditClient.tsx` |
| Client detail document queries | `src/pages/ClientDetail.tsx` (`eq('client_id', id)`) |
| Archive and merge are stubs | `src/pages/Clients.tsx` action sheet |
| Client form fields | `src/components/client/ClientForm.tsx` |
| Client record type | `src/domain/clientWorkspace.ts` |
| Client nav entries | `src/components/layout/navData.ts:35,184,191,236` |
| `source_transactions` counterparty | `20260906103000_source_transactions.sql:35-36` |
| Invoice posting uses `customer` | `src/modules/invoices/services/invoiceAccountingService.ts:111-112` |
| Payment posting uses `customer` | `src/modules/invoices/services/paymentAccountingService.ts:131-132` |
| Expense posting uses `vendor` | `src/modules/accounting/expenseService.ts:172-173` |
| `expenses.vendor_name` | `20260914100000_expense_money_out.sql:21` |
| `tax_input_entries.vendor_name` | template `:554` |
| RFQ vendor identity | `src/domain/rfq/types.ts` |
| BOQ vendor repurposed | `src/domain/cps/normalize.ts:71-74` |
| `project_documents.from_party`/`to_party` | template `:148-149` |
| `letters.recipient_id` party-agnostic | template `:621-622` |
| No supplier files | `find src -iname "*supplier*"` returns nothing; zero supplier/vendor tables in `supabase/migrations/` |
| `_prov_get_template_tables()` (49 tables) | `20260927162405_item_library_tier_c_stage2b_reconciliation.sql:1249` |
| `_prov_table_to_resource()` | `20260927162405:1280` |
| `_prov_create_schema()` | `20260717000000_entity_provisioning_engine.sql:207` |
| `_prov_clone_table()` | `:224` |
| `_prov_readd_foreign_keys()` | `:260` |
| `_prov_install_rls()` | `:309` |
| `provision_entity()` | `20260927162405:1352` |
| Additive backfill pattern | `20260914100000_expense_money_out.sql` §5 |
| Permission resource list | `20260826000000_boq_rfq_schema_and_aggregate_permission_fix.sql:91`; `20260915220000_role_assignments_and_template_management.sql:97` |
| `entity_permissions` table | `20260714000000_multi_tenancy_core.sql:42` |
| Tenant client binding and exposure gate | `src/lib/tenant/contexts.tsx` |
| Search `DocumentType` union | `src/domain/search/types.ts:13-20` |
| Search `MatchSource` includes `vendor` | `src/domain/search/types.ts:24-31` |
| RFQ vendor match rank 500 | `20261014160000_document_search_phase3.sql:469,484` |
| Party-by-name matching is unsafe | `20261014160000_document_search_phase3.sql:26-29` |
| List adapter registry | `src/config/moduleAdapters.ts:768` |
| Party standard is a placeholder | `docs/standard/Commercial Party Architecture Standard.md` — content is "coming soon" |
| Lifecycle ownership rules | `docs/standard/lifecycle-ownership-standard.md` §3 |
| Snapshot rule | `docs/standard/document-transformation-standard.md`; `docs/standard/receipt-standard.md` |
| BOQ→CPS rename | `supabase/migrations/20261001081028_rename_boq_to_cps.sql` |

---

## Risks or limitations

- This audit is static inspection only. No query ran against the live database. Column lists come from migration DDL cross-checked against TypeScript types.
- `bun run typecheck`, `bun run lint`, `bun run audit:load`, and `bun run build` were not run. The task forbids the first three, and the fourth is excluded by hardware policy.
- Line numbers are accurate as of this audit and will drift.
- The TypeScript consumer count (~60 files) is a file-level approximation. Exhaustive per-line mapping was not performed.
- The `docs/standard/Commercial Party Architecture Standard.md` is a placeholder. This report does not treat it as authoritative (`.claude/agent-instructions/agent-system.md`). It does not update it.
- Provincial hosting was not inspected. The report relies on the migration-based provisioning model only.

## Deferred work

- Implement client archive and merge, or remove the stubs. Both are currently non-functional.
- Add a delete guard for `invoices.client_id` and `csrs.client_id`. They have no FK today, so a client delete can orphan documents.
- Decide whether to promote distinct RFQ `vendor_name` values into `suppliers`. This is explicitly forbidden until product approval.
- Decide whether RFQ should later reference the supplier authority.
- Extend `docs/standard/Commercial Party Architecture Standard.md` from placeholder to normative.
- Record the accounting rule that `counterparty_type` is the accounting role and is independent of any party directory.
- Reconcile the pre-existing prefix key drift between `DEFAULT_PREFIXES` (`cps_sheets`) and the database CHECK constraint (`boq`).
- Reconcile the pre-existing audit `event_type` drift. The transformation standard names `DUPLICATE`, `CONVERT`, and `REVERT`; the CHECK constraint does not include them.
