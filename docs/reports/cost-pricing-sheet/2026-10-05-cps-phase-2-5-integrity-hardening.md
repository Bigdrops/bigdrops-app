# CPS Lineage, Authority & Audit Integrity Hardening — Phase 2.5

**Date:** 2026-10-05
**Scope:** Phase 2.5 of the CPS downstream-feedback architecture
**Predecessors (unchanged, still live):**

- Phase 1 — [CPS audit foundation & view history](./2026-10-05-cps-audit-foundation-and-view-history.md)
- Phase 2 — [CPS row lineage & authority handoff](./2026-10-05-cps-row-lineage-and-authority-handoff.md)

Phase 2 proved the chain

```
CPS row X  ->  Quotation item Y  ->  Invoice item Z
```

and the authority handoff

```
CPS -> Quotation             authority = Quotation
Quotation -> Invoice         authority = Invoice   (Quotation authority ends)
```

but it left four integrity gaps that must be closed **before** any automatic
downstream → CPS feedback is allowed:

1. Invoice lineage was written **after** the invoice save transaction (a
   two-write window that could silently drop ancestry).
2. Nothing stopped the same Quotation from minting a **second competing
   Invoice** on a retry.
3. CPS audit metadata was hidden inside `audit_logs.changes` under a reserved
   `_cps` key, and there was no correlation/chain identity or causal
   parent-event linkage for downstream lifecycle events.
4. Reverting an Invoice to a Quotation **dropped row lineage**.

Phase 2.5 closes all four. **No Phase 3 feedback is implemented.** No SP,
description, image, or any other downstream field is written back to a Cost &
Pricing Sheet. CPS calculations, Instant Markup, Forme PDF, prefix/numbering,
import, columns, photos, group semantics and commercial conversion pricing are
untouched.

---

## 0. What changed, at a glance

| Workstream | Gap | Change |
|---|---|---|
| 1 — Transactional lineage | lineage stamped after the save | the four lineage columns now move **inside** `save_invoice_with_items_transaction`; post-write stamp deleted from the success path |
| 2 — Conversion idempotency | retry could create INV-B | `invoices.source_quotation_id` + **UNIQUE partial index**; persisted gate consulted before any write; race path re-resolves the winner |
| 3 — Conversion chain id | one CPS → many Quotations was indistinguishable | `conversion_chain_id` on `quotations` **and** `invoices`, generated at conversion, carried through |
| 4 — Parent/causal linkage | `parentEventId` was typed but unpersisted | `audit_logs.metadata` is the durable home for `chainId` + `parentEventId` |
| 5 — Audit metadata promotion | payload hidden in `changes._cps` | new `record_cps_audit_event` RPC writes `audit_logs.metadata`; reader falls back to legacy `_cps` |
| 6 — Authority hardening | authority row resolution was implicit | `persistChainAuthority` / `readChainAuthority` resolve the chain's authority row explicitly and report failure |
| 7 — Revert lineage | revert reset lineage | `revert_invoice_to_quotation_transaction` carries `source_cps_id`, `conversion_chain_id` and the four item lineage columns; authority returns to the reverted Quotation |
| 8 — Audit events | no chain/retry/revert events | `CONVERSION_RETRY`, `REVERTED_TO_QUOTATION`, chain-aware `CONVERTED_TO_INVOICE` / `CONVERTED_TO_QUOTATION` |
| 9 — Activity history | chain was invisible | collapsible chain-id disclosure (never primary content) |
| 10 — Legacy data | — | **no** heuristic backfill; legacy rows stay lineage-null / chain-null |
| 11 — Phase 3 | — | still strictly disabled |

---

## 1. Schema changes

### 1.1 Migration `20261005140000_cps_chain_and_audit_metadata.sql`

[`supabase/migrations/20261005140000_cps_chain_and_audit_metadata.sql`](../../../supabase/migrations/20261005140000_cps_chain_and_audit_metadata.sql)

A single guarded `DO` loop over `public`, `tenant_master_template` and every
existing `entity_%` tenant schema (11 entity schemas on the linked project).
Every step is idempotent and re-runnable; there is **no data rewrite and no
function change**. Future tenants inherit the shape from
`tenant_master_template`.

| column | type | meaning |
|---|---|---|
| `audit_logs.metadata` | `jsonb NOT NULL DEFAULT '{}'::jsonb` | first-class structured audit metadata |
| `quotations.conversion_chain_id` | `uuid` | stable id for one CPS → Quotation conversion |
| `invoices.conversion_chain_id` | `uuid` | the same chain id, carried onto the Invoice |
| `invoices.source_quotation_id` | `uuid` | the Quotation this Invoice was converted from |

Indexes:

| index | definition | purpose |
|---|---|---|
| `quotations_conversion_chain_idx` | partial on `conversion_chain_id WHERE NOT NULL` | chain → quotation lookup |
| `invoices_conversion_chain_idx` | partial on `conversion_chain_id WHERE NOT NULL` | chain → invoice lookup |
| `invoices_source_quotation_uniq` | **UNIQUE** partial on `source_quotation_id WHERE NOT NULL` | **database-level idempotency guard** |

The uniqueness is partial, so every non-converted Invoice (`source_quotation_id`
NULL) stays valid, and a tenant can keep any number of hand-authored invoices
without a source quotation.

`COMMENT ON COLUMN` is applied to every schema so the contract travels with the
database.

### 1.2 Migration `20261005150000_tenant_rpc_cps_lineage_metadata.sql`

[`supabase/migrations/20261005150000_tenant_rpc_cps_lineage_metadata.sql`](../../../supabase/migrations/20261005150000_tenant_rpc_cps_lineage_metadata.sql)

Regenerates `public._prov_install_tenant_rpcs()` — the single tenant-RPC
installer — so every existing **and future** tenant schema installs the
updated RPCs.

The installer body is generated from the authoritative text in
[`20260902120000_provisioning_engine_repair.sql`](../../../supabase/migrations/20260902120000_provisioning_engine_repair.sql)
by a one-off, reproducible generator,
[`scripts/gen-cps-phase25-tenant-rpcs.cjs`](../../../scripts/gen-cps-phase25-tenant-rpcs.cjs).
The generator fails loudly (`ANCHOR MISSING` / `ANCHOR NOT UNIQUE`) rather than
editing the wrong block, so every RPC body other than the edited ones stays
byte-identical.

Edits to the installer:

1. **`save_invoice_with_items_transaction`** (block 1) — the `invoice_items`
   `INSERT` column list gains `source_cps_id`, `source_cps_row_id`,
   `source_quotation_id`, `source_quotation_item_id`, with `$22..$25`
   placeholders and four `NULLIF(v_item->>'…', '')::uuid` `USING` arguments
   **in the same statement**. Lineage is therefore committed by the invoice
   save transaction itself; lineage-null rows remain valid.
2. **`record_cps_audit_event`** (block 28, new) — a dedicated CPS audit writer
   that stores the structured payload in `audit_logs.metadata`.
3. **`revert_invoice_to_quotation_transaction`** (block 27) — carries
   `source_cps_id`, `conversion_chain_id` onto the reverted Quotation and the
   four lineage columns onto its items.

Then a **guarded backfill** loops the entity schemas through the installer.

### 1.3 Why `record_audit_log` was **not** modified

The instinctive design — "add `p_metadata jsonb` to `record_audit_log`" — is
unsafe here:

- `record_csr_created`, `record_csr_linked` and `record_csr_status_changed` in
  schemas `jig` and `lomo` depend on the **exact 11-argument** signature, so
  `DROP FUNCTION …` fails on those dependents; and
- adding a **defaulted 12th parameter** would make the existing 11-argument
  calls ambiguous.

The dependency failure is exactly what the first push attempt reported:

```
ERROR: cannot drop function record_audit_log(...) because other objects depend on it
```

The safe design is a **new, dedicated** writer. `record_audit_log` keeps its
11-argument signature, byte-identical, in every schema. New CPS events go
through `record_cps_audit_event`, which writes `'[]'::jsonb` to `changes` and the
payload to `metadata`. A CPS event is meaningful through its payload, so unlike
`record_audit_log` an empty `metadata` object is the only reason to skip — a
CPS event with no field diff is still recorded.

### 1.4 Backfill completeness guard

The backfill only touches **fully provisioned** schemas:

```sql
AND to_regclass(format('%I.activity_events',  n.nspname)) IS NOT NULL
AND to_regclass(format('%I.audit_logs',       n.nspname)) IS NOT NULL
AND to_regclass(format('%I.invoices',         n.nspname)) IS NOT NULL
AND to_regclass(format('%I.invoice_items',    n.nspname)) IS NOT NULL
AND to_regclass(format('%I.quotations',       n.nspname)) IS NOT NULL
AND to_regclass(format('%I.quotation_items',  n.nspname)) IS NOT NULL
```

The installer creates functions whose `RETURN` types are tenant tables, so
running it against a partially provisioned schema (e.g. `entity_bigdrops-main_agam`,
which has no `activity_events` yet) would abort the migration with

```
ERROR: type "entity_bigdrops-main_agam.activity_events" does not exist (SQLSTATE 42704)
```

The guard skips incomplete schemas; they converge the next time they are
provisioned. The migration ends with `NOTIFY pgrst, 'reload schema';` so
PostgREST picks up the new RPCs immediately.

---

## 2. Workstream 1 — transactional Invoice lineage

**Before.** `save_invoice_with_items_transaction` wrote `invoice_items` through a
fixed column list that did not include the four lineage columns. Phase 2
compensated by re-stamping lineage *after* the RPC returned
(`applyInvoiceItemLineage`). That is a two-write window: a failure between the
two writes silently lost ancestry, and a concurrent edit could interleave.

**After.** The four lineage columns are written **inside** the same `INSERT` as
the item rows, in the same transaction. The compensation is gone:

- `useInvoiceSave.afterSave` no longer calls a lineage stamp; the
  `applyInvoiceItemLineage` import is removed.
- `convertQuotationToInvoice` no longer stamps lineage after its write.
- The remaining helper is renamed `applyInvoiceItemLineage` →
  **`repairInvoiceItemLineage`**, carries a prominent
  `COMPATIBILITY / REPAIR ONLY` doc block, and is called from **no** production
  path. It exists only to repair rows a pre-2.5 tenant RPC already wrote
  without lineage, and it keys on the row's stable `(invoice_id, sort_order)`
  pair — never on position in a mutable UI array, never on description.

Both invoice write paths persist lineage atomically:

- **RPC path** (`entityId` present) → composite
  `save_invoice_with_items_transaction`;
- **fallback path** (no `entityId`) → `invoices` insert followed by an
  `invoice_items` insert of the **same serialized rows**, each already carrying
  its lineage.

There is exactly **one** authoritative lineage path.

Guarantees preserved (acceptance criteria 1, 3, 4, 5, 30):

- existing invoice save behaviour and commercial fields are unchanged apart
  from lineage persistence;
- lineage-null invoice rows remain valid (all four expressions are
  `NULLIF`-guarded);
- invoice-added rows stay lineage-null;
- Quotation-derived rows preserve lineage atomically;
- the successful transactional path needs no post-write stamp.

---

## 3. Workstream 2 — true conversion idempotency

### 3.1 The invariant

```
ONE QUOTATION CONVERSION  ->  AT MOST ONE ACTIVE INVOICE
```

Enforced in three independent places, **not** by UI state:

1. **Persisted document-level link.** `invoices.source_quotation_id` is written
   in the same insert as the Invoice (`source_quotation_id: id`).
2. **Database backstop.** `CREATE UNIQUE INDEX invoices_source_quotation_uniq
   … WHERE source_quotation_id IS NOT NULL`. A concurrent second insert is
   rejected by the database, not by a check-then-act race.
3. **Persisted gate before any write.** `resolveConvertedInvoice(tenantClient,
   id, latestQuotation)` runs **before** numbering or any write work:

   - consults the Quotation's persisted authority pointer
     (`resolveActiveFeedbackAuthority`) and loads that Invoice, then
   - falls back to `invoices.source_quotation_id = quotationId`.

   It never matches on description, position, or document number.

```ts
const existingInvoice = await resolveConvertedInvoice(tenantClient, id, latestQuotation)
if (existingInvoice) {
  await recordConversionRetry({ tenantClient, quotation, quotationRow: latestQuotation, existingInvoice })
  return existingInvoice
}
```

### 3.2 Race path

If the RPC (or the fallback insert) returns an error, the conversion
**re-resolves** instead of throwing blindly:

```ts
const raced = await resolveConvertedInvoice(tenantClient, id, latestQuotation)
if (raced) { await recordConversionRetry({ …, existingInvoice: raced }); return raced }
throw new Error(error.message || 'Failed to create invoice')
```

So the second of two concurrent clicks returns the winner — it never mints
INV-B. The result is a **deterministic** outcome:

- **First** conversion `QTN-X → INV-A` returns INV-A.
- **Retry** returns/reuses INV-A and records a `CONVERSION_RETRY` audit event.
- A **second competing Invoice cannot become authority**, because it cannot
  exist — and even if a legacy row predated the index, `persistChainAuthority`
  targets the chain's stored authority row (below), never "the newest invoice".

This satisfies acceptance criteria 6, 7, 8, 24.

---

## 4. Workstream 3 — explicit conversion chain id

One CPS document may be converted more than once:

```
CPS document
  |-- chain A -> QTN-A -> INV-A
  `-- chain B -> QTN-B -> INV-B
```

`CpsAuditMeta.rootId` is the CPS **document** id — correct as provenance, too
broad as the causal root of a specific downstream chain. Phase 2.5 adds a
dedicated persisted chain identity.

**Domain helpers** — [`src/domain/cps/lineage.ts`](../../../src/domain/cps/lineage.ts):

| export | role |
|---|---|
| `ConversionChainId` | branded-ish string type |
| `newConversionChainId()` | mints a new id via `crypto.randomUUID()` (RFC 4122 v4 fallback only when no CSPRNG exists) |
| `normalizeChainId(value)` | reads a persisted chain id, or `null` — never guesses |
| `ChainAuthorityTarget` | `{ authorityRowId, stage, documentId }` for a chain |

**Persistence path:**

- `mapCpsToQuotation` emits `conversion_chain_id: newConversionChainId()` on the
  converted quotation payload, and returns it as `lineage.chainId`.
- `convertCpsToQuotation` seeds authority + the audit event with that chain id.
- `convertQuotationToInvoice` reads the chain id from the Quotation
  (`latestQuotation.conversion_chain_id`, falling back to a freshly minted id
  only for a legacy quotation that has none) and writes it to
  `invoices.conversion_chain_id` **in the same insert** as `source_quotation_id`.
- `persistChainAuthority` also sets `conversion_chain_id` on the authority row
  when known, healing a legacy quotation that lacked one.

A chain id is **never derived from a document number** and **never inferred**.
`source_cps_id` is never overloaded with chain identity. Two Quotations from
one CPS receive different chain ids (each conversion mints its own). This
satisfies acceptance criteria 9–14, 20.

---

## 5. Workstreams 4 & 5 — audit metadata promotion + causal linkage

### 5.1 New write path

[`src/domain/cps/audit.ts`](../../../src/domain/cps/audit.ts):

```ts
const { error } = await tenantClient.rpc('record_cps_audit_event', {
  p_entity_id: input.recordId,
  p_entity_label: input.entityLabel ?? null,
  p_action: action,
  p_metadata: meta,          // ← structured payload
  p_actor_id: actor.id,
  p_actor_label: actor.label,
  p_source: 'web',
  p_scope_type: 'app',
})
if (error) throw new Error(error.message || 'CPS audit write failed.')
```

The RPC stores `'[]'::jsonb` in `changes` and `p_metadata` in `metadata`. New CPS
events therefore **no longer** hide their payload inside `changes` under `_cps`.
The same authoritative payload never lives in two locations.

### 5.2 Read path and legacy compatibility

`useAuditTrail.AUDIT_LOG_SELECT` now includes `metadata`:

```
'id, entity_type, entity_id, entity_label, action, actor_id, actor_label, source, scope_type, created_at, changes, metadata, reason'
```

[`src/domain/audit/auditFormatters.ts`](../../../src/domain/audit/auditFormatters.ts):
`extractCpsAuditMeta(row)` reads `row.metadata` **first**; only if it is absent
does it fall back to the legacy `changes` entry whose `field === CPS_AUDIT_META_KEY`
(`'_cps'`). Both paths funnel through `normalizeCpsAuditMeta`, so historical rows
render exactly as before. `CPS_AUDIT_META_KEY` is **retained for legacy reads
only** and is never written again.

No destructive rewrite is performed: legacy `_cps` rows keep their payload
where it is (acceptance criterion 17).

### 5.3 Payload shape

`CpsAuditMeta` now carries, in `audit_logs.metadata`:

| field | meaning |
|---|---|
| `event` | CPS lifecycle event type |
| `actorType` | `'user'` \| `'system'` |
| `rootId` | **CPS document provenance** (the CPS document id) |
| `chainId` | the conversion chain this event belongs to (`null` when not chained) |
| `parentEventId` | causal parent event — **operational from Phase 2.5**, persisted in metadata |
| `sourceContext` | originating surface |
| `related` | related document `{ type, id, number }` |
| `summary` / `detail` | human sentence / detail |
| `changes` | structured field-change groups |

No business calculation is put into audit metadata.

### 5.4 Parent/causal linkage is now operational

Phase 3 will need:

```
Event A  user changes INV-A item unit_price
Event B  system updates CPS row SP        (B.parentEventId = A.id; A and B share chainId)
```

**Event B is not implemented.** But `chainId` and `parentEventId` are now
persisted and retrievable on every event, and `buildCpsAuditMeta` accepts
`chainId`. When Phase 3 starts, the causal chain can be written without another
schema change. This satisfies acceptance criteria 15, 16, 18, 19.

---

## 6. Workstream 6 — authority model hardening

Authority still lives on the CPS-derived Quotation (the Phase 2 model, preserved
as instructed). The hardening is in **how the authority row is resolved**.

[`src/domain/cps/lineageStore.ts`](../../../src/domain/cps/lineageStore.ts)
replaces `persistFeedbackAuthority` with:

```ts
persistChainAuthority(tenantClient, { chainId, quotationId, authorityRowId?, stage, documentId })
  -> { ok, error?, authorityRowId, previous }
readChainAuthority(tenantClient, { chainId?, quotationId? })
```

Authority-row resolution is **explicit and deterministic**:

1. `authorityRowId`, when the caller already knows it (e.g. the Invoice's
   `source_quotation_id` during a revert); else
2. the row with `conversion_chain_id = chainId AND feedback_authority IS NOT NULL`;
   else
3. the caller's `quotationId`.

Never from edit recency, never from document status, never from
"the newest document".

`persistChainAuthority` reads the previous state first and returns it, so the
caller can audit the **before/after** transition. The write is idempotent —
writing the same stage/document pair again converges on the same state, so a
retried conversion cannot produce contradictory authority.

### Invariants

| state | authority | authority_document_id |
|---|---|---|
| after CPS → Quotation | `quotation` | QTN-X |
| after QTN-X → INV-A | `invoice` | INV-A |
| later QTN-X edits | `invoice` | INV-A — **regained authority is impossible** |
| retry conversion | `invoice` | INV-A — **not switched to another Invoice** |
| after INV-A → QTN-X revert | `quotation` (same chain) | the reverted Quotation |

Authority state is consistent with the chain id, because the same chain id is
what selects the authority row.

### Failure behaviour (documented precisely)

`persistChainAuthority` **reports** failures; it never silently claims a
successful handoff:

- returns `{ ok: false, error, authorityRowId, previous }` when the authority
  row cannot be resolved or the update errors;
- `convertCpsToQuotation` / `convertQuotationToInvoice` log the error and carry
  on (the conversion succeeded; a failed authority write must not roll back a
  created document);
- the `CONVERTED_TO_INVOICE` audit event is marked
  `actorType: authority.ok ? 'user' : 'system'` and its detail **appends
  `(authority write failed: …)`** so the failure is durably visible in the
  chain's CPS history instead of being swallowed.

This satisfies acceptance criteria 21, 22, 23, 24.

---

## 7. Workstream 7 — revert Invoice → Quotation lineage rule

### 7.1 Normative rule

> A revert is **not** a lineage reset. An Invoice that descended from a
> CPS-derived Quotation, when reverted back to a Quotation, preserves the same
> CPS ancestry and the same conversion chain, and authority returns to the
> reverted Quotation **within the same chain**.

### 7.2 Implementation

**Server** — installer block 27,
`revert_invoice_to_quotation_transaction` inserts `source_cps_id` and
`conversion_chain_id` on the reverted quotation and the four lineage columns on
its items.

**Client** — [`src/modules/invoices/services/invoiceConversionService.ts`](../../../src/modules/invoices/services/invoiceConversionService.ts)
`revertInvoiceToQuotationService`:

1. reads `source_quotation_id` and `conversion_chain_id` off the Invoice
   **before** it is deleted;
2. resolves `source_cps_id` from the **chain owner** quotation (the Invoice's
   `source_quotation_id`) rather than from any heuristic;
3. sets `source_cps_id` and `conversion_chain_id` on the reverted quotation
   payload and the four lineage columns on its items;
4. nulls `source_quotation_id` / `source_quotation_item_id` on `quotation_items`
   rows — a quotation item must not claim to descend from a quotation;
5. calls `handAuthorityBackToRevertedQuotation`, which emits
   `REVERTED_TO_QUOTATION` and persists authority stage `quotation` on the
   chain's **existing** authority row (`authorityRowId` = the Invoice's
   `source_quotation_id`).

Authority after revert is explicit and auditable — never guessed from
timestamps. Historical rows with no stored link stay `NULL`: there is **no
heuristic reconstruction** (no description matching, no sort-order matching, no
similarity scoring).

This satisfies acceptance criteria 25–29.

---

## 8. Workstream 8 — audit events

`CpsAuditEventType` gains two members:

| event | meaning | action |
|---|---|---|
| `CONVERSION_RETRY` | a conversion request resolved to an Invoice that already exists for this chain | `CONVERT` |
| `REVERTED_TO_QUOTATION` | a derived Invoice was reverted; authority returned to the Quotation stage | `CONVERT` |

Existing chain events are now chain-aware:

- **`CONVERTED_TO_QUOTATION`** (CPS → Quotation) — detail appends
  `"Conversion chain created."`; carries `chainId`.
- **`CONVERTED_TO_INVOICE`** (Quotation → Invoice) — carries `chainId` and the
  `authorityTransitionSummary(QTN, INV)` sentence
  (`"Feedback authority moved from QTN-000432 to INV-000201."`), plus the
  failure annotation when the authority write failed.
- **`LINEAGE_WARNING`** — carries `chainId`.

Every event exposes: CPS source, chain id, source document, target document,
actor, timestamp, authority before/after, and `parentEventId` where applicable.
Events are emitted **per document transition, not per row** — one event per
conversion, retry, revert or integrity problem. This satisfies acceptance
criterion 8.

---

## 9. Workstream 9 — CPS Activity History

Extend only, no redesign.
[`src/components/cps/CpsActivityHistory.tsx`](../../../src/components/cps/CpsActivityHistory.tsx)
renders the chain id behind a disclosure:

```tsx
{entry.chainId ? (
  <details className="cps-ah-chain">
    <summary>Conversion chain</summary>
    <span className="cps-ah-chain-id">{entry.chainId}</span>
  </details>
) : null}
```

Supporting rules in
[`src/components/cps/cps-activity-history.css`](../../../src/components/cps/cps-activity-history.css)
(`.cps-ah-chain`, `.cps-ah-chain summary`, `.cps-ah-chain-id` — muted, small,
monospace, wrapping).

Readable examples produced by the Phase 2.5 events:

```
Converted to Quotation            QTN-000432    … Conversion chain created.
Quotation converted to Invoice    INV-000201    … Feedback authority moved from QTN-000432 to INV-000201.
Invoice reverted to Quotation     QTN-000499    … Feedback authority returned to Quotation.
```

The chain id is **never primary content**; it appears only inside the collapsed
`details` block for debug context.

---

## 10. Workstream 10 — legacy data

**No heuristic backfill.**

- Historical quotations/invoices have no `conversion_chain_id` and no
  `source_quotation_id`. They stay `NULL` ("chain unavailable").
- Historical `audit_logs` rows keep their payload inside `changes._cps`; the
  formatter reads it as a fallback.
- Historical Invoice item rows with `NULL` lineage stay valid and untouched.
- No fuzzy/document-similarity backfill was applied.

Deterministic document-level chain backfill would be possible from explicit
persisted source ids, but it is **not** applied here; it would be documented
separately before any application.

---

## 11. Workstream 11 — Phase 3 remains disabled

**Strictly forbidden and not implemented:**

- Quotation/Invoice `unit_price` → CPS `sp`
- Quotation/Invoice `description` → CPS `description`
- Quotation/Invoice `image_url` → CPS `image_url`
- automatic upstream deletion
- automatic CPS row creation

This is enforced by a test that reads every Phase 2.5 source file and asserts
it contains none of `syncToCps`, `applyDownstreamFeedback`, `pushToCps`,
`feedbackToCps`, `updateCpsFrom(Invoice|Quotation)`, no update of `cps_rows`, and
no update of `cps_sheets` that writes a commercial field (`sp`, `cp`,
`image_url`, `specification`, `description`).

Acceptance criteria 33, 34, 35, 36 hold.

---

## 12. Files changed

**Migrations (pushed via `supabase db push --linked`):**

- [`supabase/migrations/20261005140000_cps_chain_and_audit_metadata.sql`](../../../supabase/migrations/20261005140000_cps_chain_and_audit_metadata.sql) *(new)*
- [`supabase/migrations/20261005150000_tenant_rpc_cps_lineage_metadata.sql`](../../../supabase/migrations/20261005150000_tenant_rpc_cps_lineage_metadata.sql)

**Generator:**

- [`scripts/gen-cps-phase25-tenant-rpcs.cjs`](../../../scripts/gen-cps-phase25-tenant-rpcs.cjs)

**Domain / data layer:**

- [`src/domain/cps/lineage.ts`](../../../src/domain/cps/lineage.ts) — chain helpers
- [`src/domain/cps/lineageStore.ts`](../../../src/domain/cps/lineageStore.ts) — `repairInvoiceItemLineage` (repair-only), `persistChainAuthority`, `readChainAuthority`
- [`src/domain/cps/conversion.ts`](../../../src/domain/cps/conversion.ts) — `conversion_chain_id` + `lineage.chainId`
- [`src/domain/cps/audit.ts`](../../../src/domain/cps/audit.ts) — `record_cps_audit_event` RPC
- [`src/domain/cps/auditDiff.ts`](../../../src/domain/cps/auditDiff.ts) — `chainId`, new events
- [`src/domain/audit/auditTypes.ts`](../../../src/domain/audit/auditTypes.ts) — new event types + `chainId`
- [`src/domain/audit/auditFormatters.ts`](../../../src/domain/audit/auditFormatters.ts) — metadata-first read + legacy fallback
- [`src/domain/invoice/types.ts`](../../../src/domain/invoice/types.ts) — `source_quotation_id`, `conversion_chain_id`
- [`src/hooks/useAuditTrail.ts`](../../../src/hooks/useAuditTrail.ts) — `metadata` in select
- [`src/hooks/useInvoiceSave.ts`](../../../src/hooks/useInvoiceSave.ts) — post-write stamp removed

**Flows:**

- [`src/pages/view-quotation-actions.ts`](../../../src/pages/view-quotation-actions.ts) — idempotency gate, `resolveConvertedInvoice`, `recordConversionRetry`, chain carry, authority handoff
- [`src/pages/view-cps-actions.ts`](../../../src/pages/view-cps-actions.ts) — chain seed + chain-aware audit
- [`src/modules/invoices/services/invoiceConversionService.ts`](../../../src/modules/invoices/services/invoiceConversionService.ts) — revert lineage/chain preservation + authority return
- [`src/modules/invoices/services/invoiceLifecycleService.ts`](../../../src/modules/invoices/services/invoiceLifecycleService.ts) — duplicate clears chain/source

**UI:**

- [`src/components/cps/CpsActivityHistory.tsx`](../../../src/components/cps/CpsActivityHistory.tsx)
- [`src/components/cps/cps-activity-history.css`](../../../src/components/cps/cps-activity-history.css)

**Tests:**

- [`src/tests/critical/cpsChainIntegrity.test.js`](../../../src/tests/critical/cpsChainIntegrity.test.js) *(new)*
- [`src/tests/critical/cpsRowLineageAuthority.test.js`](../../../src/tests/critical/cpsRowLineageAuthority.test.js)

---

## 13. Tests

### 13.1 New focused suite — `cpsChainIntegrity.test.js`

**26 tests, 26 pass.** Covers every required verification category:

| Category | Coverage |
|---|---|
| Chain id | mints a UUID, two conversions from one CPS get different ids, id is not derived from a document number, `normalizeChainId` never guesses, `mapCpsToQuotation` emits/returns it |
| Transactional lineage | installer writes all four columns inside the single `invoice_items` insert, tail of the same statement, no post-write stamp |
| Idempotency | `resolveConvertedInvoice` consults only stored links (authority pointer → `source_quotation_id`), no description/position/number matching; unique index asserted in the schema migration; `CONVERSION_RETRY` emitted |
| Audit | installer adds `record_cps_audit_event` and keeps `record_audit_log`'s exact 11-arg signature; client writes through the metadata RPC and no longer writes `_cps`; reader selects `metadata` and keeps the fallback; `parentEventId` + `chainId` persisted and promoted |
| Revert | installer carries `source_cps_id` / `conversion_chain_id` / `source_cps_row_id`; service reads the stored link before deletion, hands authority back with `authorityRowId`, nulls quotation-item ancestry, no heuristics |
| Duplicate | a duplicated invoice clears `source_quotation_id` and `conversion_chain_id` |
| Installer | future tenants inherit; only fully provisioned schemas are backfilled (`to_regclass` guard); `NOTIFY pgrst` |
| Generator | stays reproducible and guarded (`ANCHOR MISSING` / `ANCHOR NOT UNIQUE`) |
| No Phase 3 | no feedback helper, no `cps_rows` rewrite, no CPS commercial-field write in any Phase 2.5 file |

### 13.2 Updated suite — `cpsRowLineageAuthority.test.js`

**48 tests, 48 pass.** The fake tenant client gained `select`/`not`/`limit`
support and an `authorityResponder`; `persistChainAuthority` tests were added, and
the assertions that Phase 2 used a post-write stamp were replaced with
assertions that it does **not**.

### 13.3 Directly affected existing suites (all green)

| suite | result |
|---|---|
| `cpsAuditFoundation.test.js` | 22 pass / 0 fail |
| `cpsRowLineageAuthority.test.js` | 48 pass / 0 fail |
| `cpsConversion.test.js` | 14 pass / 0 fail |
| `cpsSaveSerialization.test.js` | 5 pass / 0 fail |
| `cpsRowOperations.test.js` | 23 pass / 0 fail |

---

## 14. Verification

All verification ran on the hardened tree. **`bun run build` was NOT executed**
(permanently banned on the 4 GB RAM host; acceptance criterion 42).

### 14.1 Static / policy checks

| check | command | result |
|---|---|---|
| Type check | `bun run typecheck` (`tsc --noEmit`) | **exit 0**, clean |
| Load/audit policy | `bun run audit:load` (`node scripts/check-load-risk.cjs`) | **exit 0** (867 files scanned; only pre-existing warnings, none in Phase 2.5 files) |
| Whitespace | `git diff --check` | **exit 0** |
| Scope | `git status --short` | 19 modified + 1 new test file; no stray artifacts |

### 14.2 Full test suite

`bun run test` → **738 tests, 725 pass, 13 fail**.

The 13 failures are **exactly** the pre-existing baseline failures (verified: the
baseline before Phase 2.5 was 709/696/13, and Phase 2.5 added +29 passing
tests — 26 in `cpsChainIntegrity` and 3 in `cpsRowLineageAuthority` — with
**no new failures**):

- 4 env-less `import.meta.env` integration tests — `invoiceAccountingIntegration`,
  `paymentAccountingIntegration`, `remediationContract`, `sourceTransactionContract`;
- 3 `.tsx`/`.woff` alias-loader failures — `cpsIndustry`, `cpsLedger`, `cpsPdf`;
- 5 stale `cpsViewProductionRedesign` assertions;
- 1 item-library `validateFlaggedCleanupImport` assertion.

None of these touch Phase 2.5 code paths.

### 14.3 Hosted database verification

Both migrations are applied on the linked project:

```
Local            | Remote           | Time (UTC)
`20261005140000` | `20261005140000` | `2026-10-05 14:00:00`
`20261005150000` | `20261005150000` | `2026-10-05 15:00:00`
```

Live probes (`supabase db query --linked`):

| probe | expected | actual |
|---|---|---|
| `record_cps_audit_event` in `entity_%` | 11 | **11** |
| `audit_logs.metadata` in `entity_%` | 11 | **11** |
| `invoices_source_quotation_uniq` in `entity_%` | 11 | **11** |
| `conversion_chain_id` columns in `entity_%` | 22 (11 × quotations + invoices) | **22** |
| `save_invoice_with_items_transaction` prosrc contains `source_quotation_item_id` | 11 | **11** |
| `revert_invoice_to_quotation_transaction` prosrc contains `conversion_chain_id` | 11 | **11** |
| `public._prov_install_tenant_rpcs` prosrc contains `record_cps_audit_event` | 1 | **1** |
| `record_audit_log` arg count (spot-check `…-adel`) | 11 | **11** |

`tenant_master_template`:

- `audit_logs.metadata` present, `conversion_chain_id` on `quotations` **and**
  `invoices`, `source_quotation_id` on `invoices`;
- indexes `invoices_source_quotation_uniq`, `quotations_conversion_chain_idx`,
  `invoices_conversion_chain_idx` present;
- it carries **no** tenant RPCs by design — RPCs are installed per tenant by
  `_prov_install_tenant_rpcs`, which now installs `record_cps_audit_event` for
  every future tenant.

No manual SQL was run against the hosted database; every change went through
`supabase db push --linked`.

---

## 15. Acceptance criteria

| # | Criterion | Where |
|---|---|---|
| 1 | `save_invoice_with_items_transaction` persists all lineage columns | installer block 1; probe 11/11 |
| 2 | Tenant RPC installer updated | migration `…150000` |
| 3 | Future tenants inherit the correct RPC | installer + template |
| 4 | Successful save needs no compensating stamp | `useInvoiceSave`; test |
| 5 | Existing Invoice pricing behaviour unchanged | RPC commercial args untouched |
| 6 | Quotation → Invoice conversion is retry-safe | gate + unique index + race path |
| 7 | Second competing Invoice cannot replace authority | `invoices_source_quotation_uniq` |
| 8 | Existing converted Invoice resolvable deterministically | `resolveConvertedInvoice` |
| 9 | Conversion chain id exists | `conversion_chain_id` on quotations + invoices |
| 10 | Chain id persisted on the chain | conversion payload + authority write |
| 11 | Quotation carries the chain id | `mapCpsToQuotation` |
| 12 | Invoice carries the same chain id | conversion insert |
| 13 | Multiple Quotations from one CPS differ | one mint per conversion |
| 14 | Chain id is not inferred | `normalizeChainId` never guesses |
| 15 | Audit metadata has a proper persisted location | `audit_logs.metadata` |
| 16 | New audit events write that metadata | `record_cps_audit_event` |
| 17 | Legacy `_cps` entries still render | `extractCpsAuditMeta` fallback |
| 18 | `parentEventId` persists | metadata payload |
| 19 | correlation/chain id persists | metadata payload |
| 20 | CPS document provenance separately identifiable | `rootId` vs `chainId` |
| 21 | Authority = Quotation after CPS conversion | `convertCpsToQuotation` |
| 22 | Authority = Invoice after conversion | `recordInvoiceAuthorityHandoff` |
| 23 | Old Quotation edits cannot regain authority | authority row pinned by chain |
| 24 | Conversion retry cannot contradict authority | idempotent `persistChainAuthority` |
| 25 | Revert behaviour explicit and implemented | §7 |
| 26 | Revert preserves CPS row lineage | block 27 + service |
| 27 | Revert preserves conversion chain | block 27 + service |
| 28 | Revert authority transition auditable | `REVERTED_TO_QUOTATION` |
| 29 | No heuristic row matching | resolver/test guards |
| 30 | Legacy lineage-null rows remain valid | `NULLIF`-guarded |
| 31 | Phase 1 audit intact | legacy fallback + unchanged events |
| 32 | Phase 2 lineage intact | `cpsRowLineageAuthority` / `cpsConversion` green |
| 33–35 | No SP / description / image feedback | §11, test guard |
| 36 | CPS calculations untouched | no change to calculation modules |
| 37 | `bun run typecheck` passes | exit 0 |
| 38 | `bun run audit:load` passes | exit 0 |
| 39 | Focused tests pass | 26/26 + 48/48 + affected suites |
| 40 | `git diff --check` passes | exit 0 |
| 41 | `git status` confirms exact scope | 19 modified + 1 new test |
| 42 | `bun run build` NOT executed | §14 |
| 43 | Implementation report written | this document |

---

## 16. Remaining Phase 3 prerequisites

Phase 2.5 ends when the integrity guarantees are strong enough to **begin**
Phase 3. The remaining work before any automatic downstream → CPS feedback:

1. **Define the field-feedback contract** — which downstream fields may write
   back (SP, description, image), precedence when several documents in a chain
   disagree, and the conflict-resolution rule.
2. **Emit `parentEventId`.** The column is persisted and readable, but no event
   yet sets it. Phase 3's first automatic event must link to the user-caused
   parent event; `buildCpsAuditMeta` already accepts it.
3. **Authorise feedback by authority stage.** A write-back must assert
   `feedback_authority === 'invoice'` (and stage consistency with the chain id)
   before mutating a CPS row; the resolution helpers exist, the enforcement
   does not.
4. **Wire the transactional write-back.** Any CPS mutation triggered by a
   downstream save must commit in the same transaction as that save (the same
   discipline Workstream 1 applied to lineage) to avoid a second two-write
   window.
5. **Decide the reversal/deletion contract.** What happens to CPS feedback when
   the Invoice is reverted, deleted or duplicated — the revert/duplicate paths
   now clear or hand back lineage; the feedback semantics are still undefined.
6. **Legacy-data policy.** Decide whether document-level chain backfill from
   explicitly persisted source ids is worth applying; it is intentionally not
   applied today.
