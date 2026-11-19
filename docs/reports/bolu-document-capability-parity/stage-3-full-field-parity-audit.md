# Stage 3 Discovery — Full Invoice & Quotation Field Parity & Recommendation Audit

**Date:** 2026-11-18 · **Type:** Read-only field-parity and capability-gap audit (no source, migration, test, or git changes were made) · **No database was contacted** · `bun run build` was not run · `git diff HEAD` is empty for every file this audit read.

## 1. Executive summary

Bolu's current capability is a **bounded create + bounded modify path**: it can author a **new invoice or quotation** (invoice family only for advance configuration), it can **modify five non-computed fields** (`client_name`, `notes`, `payment_terms`, `due_date`, `issue_date`) plus full line-item replacement, and it can **modify the Advance Invoice block** (`custom_fields.advance_invoice`). Preservation is strong: the modification RPC writes a fixed column list, and every other column is carried verbatim via full-row spread. Bolu has **no support at all** for:

- custom **header** rows (`custom_fields.header`),
- **additionalFields** chips (`custom_fields.additionalFields`), nor bottom (legacy),
- **extra named charges** on an existing document, calculation inputs, `columnConfig`, `notesTitle`/`termsTitle`, `mergeQtyUnit`, `showItemImages`,
- **PDF appearance** (`pdfOutput`, `pdfTemplateId`, bank details, tagline, balance due, amount-in-words, footer, compact/landscape layout),
- **signatory** (`signatoryId`) and signatory resolution with it,
- **attachments**,
- **quote validity date** distinct from `due_date` semantics (quotation supports modify `due_date` → `valid_until`; invoice has its own `due_date`),
- **terms** on an existing document (create-only),
- `invoice_title`/`quotation_title`, **po_number**, **project_id**, **work_duration** (invoice only), **status**,
- **`group_header` rows** creation/edit/removal,
- **per-item lineage/image** (`image_url`, `formula`, `show_install_rate`) authoring,
- **`install_rate_override`** as an explicit control,
- the **`operation_id`** of a modification (durable idempotency exists only on create).

The prompt (`api/bolu-chat.ts`) contains strong domain rules for commercial copy and totals, client resolution, and item authoring, but **zero guidance for any of the unsupported blocks above** — Bolu will not volunteer them, and the user cannot ask for them without falling outside the contract.

### Headline gaps (design-blocking for Stage 3)

| # | Gap | Severity |
|---|---|---|
| F3-01 | Quotation proposals accept `payment_terms` in payload but it is silently dropped — no quotation column, not mapped to `custom_fields.payment_terms` on create. No warning, no hint in the card. | High — silent data loss |
| F3-02 | Quotation proposals accept `work_duration` and it is likewise silently dropped (no quotation column; the quotation RPC write list does not include it). | High — silent data loss |
| F3-03 | Document **terms** (`terms`) cannot be modified on an existing document (invoice: create-only; quotation: create-only). User who says "change the terms" must get a clear "not supported" answer today, not silence or a rejected parse. | High |
| F3-04 | No authoring path for `custom_fields.header` / `additionalFields` (the visible label/value document rows) and no prompt rules for when Bolu should recommend them. | High — primary Stage 3 surface |
| F3-05 | No authoring path for `group_header` rows / group subtotals / `groupMeta` (`name`, `showSubtotal`). | High |
| F3-06 | Bolu never recalculates charges/percent rules on its own — by design (Good). But the modify path cannot touch `workmanship`/`transportation`/`shipping`/`discount`/`vat`/`wht` at all; a user who asks "remove the haulage" has no supported path. | Medium — needs explicit decision |
| F3-07 | Rich text (`notes`, `terms`): Bolu writes raw strings; normalization is applied at form/PDF render time, so plain text renders acceptably, but there are no formatting rules in the prompt and no rejection of unmatched HTML/script/style injection. | Medium |
| F3-08 | `status` is author-only at create (`unpaid` for invoice, `open` for quotation) and immutable for Bolu thereafter; a user cannot ask Bolu to mark a document paid/overdue. | Medium — scope decision |
| F3-09 | Nothing in the prompt recommends when to set `po_number`, `project_id`, `work_duration`, `due_date`, `payment_terms` on a *new* invoice — Bolu waits for the user to supply values rather than proposing them from context facts. | Medium — recommendation gap |
| F3-10 | `operation_id` idempotency exists for create only; a cross-instance replay of a modification creates a second write (in-process guard aside). | Low — documented limitation |

## 2. The exact contracts Bolu codes against

### 2.1 Creation — `BoluInvoiceCreatePayload` (src/lib/ai-assistant/bolu-operations.ts)

Items may carry: `description`, `quantity`, `unit_price`, `unit?`, `row_type?` (always `'standard'` from validator), `group_id?`, `group_name?`, `item_id?`, `install_rate?`, `install_rate_taxable?`, `vat_rate?`, `discount_rate?`, `sub_description?`, `make?`, `part_number?`, `condition?`.
Proposal may carry: `client_name` (required), `client_id?`, `items`, `issue_date?`, `due_date?`, `notes?`, `payment_terms?`, `terms?`, `title?`, `po_number?`, `project_id?`, `work_duration?`, `workmanship?`, `transportation?`, `shipping?`, `discount?`, `discount_type?`, `discount_timing?`, `wht?`, `wht_type?`, `global_vat_percent?` (default 7.5), `extra_charges?`.

### 2.2 Creation — executor write list (src/lib/ai-assistant/bolu-document-service.ts)

- Invoice `basePayload` → RPC create: `po_number`, `invoice_title`, `client_id`, `client_name`, `project_id`, `issue_date`, `due_date`, `status: 'unpaid'`, `document_type: 'invoice'`, `payment_terms`, `notes`, `terms`, `workmanship`, `transportation`, `shipping`, `discount`, `vat`, `wht`, `custom_fields: buildBoluCustomFields(proposal)`, `work_duration`, `subtotal`, `install_rate_total`, `total`, `amount_in_words`, `operation_id`, auto `invoice_number` (verified-prefix collision retry).
- `custom_fields` on create contains only: `created_via: 'bolu_assistant'`, `operation_id`, `extraCharges[]`, `chargeLabels: {}`, `calculationInputs {vatPercent, discountValue, whtValue, discountType, discountTiming, whtType}`, top-level `discountType`/`discountTiming`/`whtType`. **Nothing else is ever written.**
- Items → `save_invoice_with_items_transaction` INSERT columns: `description, sub_description, make, quantity, unit, unit_price, amount (=quantity×price domain-computed), vat_rate, install_rate, install_rate_taxable, show_install_rate, sort_order, formula, row_type, group_name, image_url, custom_data, discount_rate, install_rate_override, group_id, item_id, source_cps_id, source_cps_row_id, source_quotation_id, source_quotation_item_id`.
- Quotation `basePayload` → RPC create: `po_number`, `quotation_title`, `client_id`, `client_name`, `project_id`, `issue_date`, `valid_until` (`due_date` mapped), `status: 'open'`, `notes`, `terms`, `workmanship`, `transportation`, `shipping`, `discount`, `vat`, `wht`, `subtotal`, `install_rate_total`, `total`, `amount_in_words`, `custom_fields`, `operation_id`, auto `quotation_number`.
- **Quotation create never persists `payment_terms` or `work_duration`** (no column for either; and the executor never writes them into `custom_fields` either).

### 2.3 Modification — preservation snapshot (src/lib/ai-assistant/bolu-document-service.ts)

- Invoice `select`: `id, invoice_number, invoice_title, po_number, client_id, client_name, project_id, issue_date, due_date, status, document_type, payment_terms, notes, terms, workmanship, transportation, shipping, discount, vat, wht, custom_fields, work_duration, subtotal, install_rate_total, total, amount_in_words, archived_at`.
- Quotation `select`: `id, quotation_number, quotation_title, po_number, client_id, client_name, project_id, issue_date, valid_until, status, notes, terms, workmanship, transportation, shipping, discount, vat, wht, custom_fields, subtotal, install_rate_total, total, amount_in_words, archived_at`.
- Writable through modification (field path): invoice `client_name`, `notes`, `payment_terms`, `due_date`, `issue_date`; quotation `client_name`, `notes`, `payment_terms (→ custom_fields.payment_terms)`, `due_date (→ valid_until)`, `issue_date`. No other keys.
- Items modification: the whole item set is validated/merged/re-serialized via `matchBoluItems` + `mergeBoluItem` (persisted group headers, `image_url`, `formula`, lineage `source_*` columns, `show_install_rate`, `row_type`, `install_rate_override` survive verbatim), the document is recalculated with the **persisted** `calculationInputs`, then the RPC `p_mode='update'` replaces the set (or the fallback delete/insert restores on failure).
- RPC update write list (invoice): `po_number, invoice_title, client_name, project_id, issue_date, due_date, status, payment_terms, notes, terms, workmanship, transportation, shipping, discount, vat, wht, custom_fields, work_duration, subtotal, install_rate_total, total, amount_in_words` (no `invoice_number`, no `client_id`, no `document_type`, no `custom_payment_terms` — preserved).
- RPC update write list (quotation): same minus `payment_terms`, `work_duration`; `valid_until` in place of `due_date`; `status` COALESCE 'open'; `custom_fields` COALESCE(NULLIF(...,''),'{}').
- Advance Invoice (Stage 2): only `custom_fields.advance_invoice` is added/replaced/deleted; sibling keys untouched; the executor is force-locked to `documentFamily === 'invoice'`.

### 2.4 Prompt (`api/bolu-chat.ts`) — the recommendation/authoring surface

Present: structured-JSON envelope format for `create-document` / `modify-document` (+ now `advance-invoice-config` from Stage 2), `client_id` resolution rule, items authoring rules, `payment_terms` and `terms` supported fields listed, `extra_charges`, group item authoring constraints via the validator, "never compute totals", "ask one question", client ambiguity handling, no invented specs, typography rules.
Absent: `po_number`, `project_id`, `work_duration`, `due_date`/`valid_until`, `global_vat_percent`, `discount_type/timing`, `wht_type`, `extra_charges` recommendation triggers, `group_header` authoring, custom header/additional fields, `pdfOutput`/`signatoryId`/`attachments`, `notesTitle`/`termsTitle`, shell/template awareness, and *any* directive for when Bolu should **proactively suggest** a field.

## 3. Complete field parity matrix

Legend for the four status columns: **Create** = Bolu can author on a new document · **Modify** = Bolu can add/edit/clear on an existing document · **Preserve** = survives unrelated edits (verified against the RPC write list + full-row spread) · **Guidance** = `api/bolu-chat.ts` guidance on when/why to populate it · ✅ = supported/possible · ⚠️ = partial · ❌ = not supported · — = not applicable.

### 3.1 `invoices` (tenant schema)

| Column | Create | Modify | Preserve | Guidance | Notes |
|---|---|---|---|---|---|
| id | auto | — | ✅ | — | system identity |
| invoice_number | auto only | ❌ | ✅ | — | auto from verified prefix; user-chosen manual numbers not supported (Bolu cannot request a specific number) |
| invoice_title | ✅ | ❌ | ✅ | ❌ | RPC-update writes `invoice_title` but nothing exposes it to Bolu |
| po_number | ✅ | ❌ | ✅ | ❌ | never recommended or requested by Bolu |
| client_id | ✅ (verified only) | ❌ | ✅ | ✅ | verified via gate picker; **never** invented |
| client_name | ✅ | ✅ | ✅ | ✅ | stale-guard enforced |
| issue_date | ✅ | ✅ | ✅ | ✅ | when user supplies a txn date, set issue_date |
| due_date | ✅ (defaults +30d) | ✅ | ✅ | ⚠️ | guidance silent; form prompts for it |
| status | ✅ fixed `unpaid` | ❌ | ✅ | ❌ | Bolu cannot mark paid/void/overdue |
| document_type | ✅ fixed `invoice` | ❌ | ✅ | ❌ | never switchable |
| payment_terms | ✅ | ✅ | ✅ | ✅ | plain string; `Custom`/`custom_payment_terms` path unreachable |
| custom_payment_terms | ❌ | ❌ | ✅ | ❌ | dead via Bolu; form-only |
| notes | ✅ (rich-text-safe string) | ✅ | ✅ | ❌ | TipTap HTML subset or plain text |
| terms | ✅ | **❌** | ✅ | ❌ | **gap F3-03** |
| workmanship / transportation / shipping | ✅ (fixed charges, untaxed) | ❌ | ✅ | ✅ | kept separate from items/charges (guidance exists for this split) |
| discount / vat / wht | ✅ (percent or value rule via `discount`, `vat`, `wht`) | ❌ | ✅ | ⚠️ | guidance never states when to apply discount/VAT/WHT rates; model defaults silent (7.5% VAT) |
| subtotal / discount / vat / wht / install_rate_total / amount_in_words / total | app-computed | recomputed on item edits; verbatim otherwise | ✅ | ✅ (never compute) | no parallel engine allowed |
| work_duration | ✅ | ❌ | ✅ | ❌ | invoice only; quotation drops it (F3-02) |
| project_id | ✅ (pass-through to RPC) | ❌ | ✅ | ❌ | **not verified** against the tenant's projects at the executor (F3-11) |
| source_quotation_id / conversion_chain_id | system | system | ✅ | ❌ | conversion lineage never proposed |
| custom_fields | ✅ partial (see 3.4) | ✅ advance only (Stage 2) | ✅ (sibling keys preserved) | ⚠️ advance only | **major gap** |
| operation_id | ✅ auto | ❌ | ✅ | ❌ | create-only idempotency |
| created_at / updated_at | system | system | ✅ | — | — |
| archived_at | ❌ | ❌ (reads `is('archived_at', null)`) | ✅ | — | cannot be authored nor cleared |

### 3.2 `quotations`

| Column | Create | Modify | Preserve | Guidance | Notes |
|---|---|---|---|---|---|
| id | auto | — | ✅ | — | — |
| quotation_number | auto only | ❌ | ✅ | — | same |
| quotation_title | ✅ | ❌ | ✅ | ❌ | never modifiable |
| po_number | ✅ | ❌ | ✅ | ❌ | same |
| client_id | ✅ | ❌ | ✅ | ✅ | — |
| client_name | ✅ | ✅ | ✅ | ✅ | — |
| issue_date | ✅ | ✅ | ✅ | ⚠️ | — |
| valid_until | ✅ (defaults +30d) | ✅ (via `due_date`) | ✅ | ❌ | Bolu's `due_date` spelling maps to it; the card/copy may surface it as "Valid until" |
| status | ✅ fixed `open` | ❌ | ✅ | ❌ | cannot move to accepted/declined/expired |
| notes | ✅ | ✅ | ✅ | ❌ | — |
| terms | ✅ | **❌** | ✅ | ❌ | same gap F3-03 |
| workmanship / transportation / shipping | ✅ (untaxed) | ❌ | ✅ | ✅ | same |
| discount / vat / wht | ✅ | ❌ | ✅ | ⚠️ | same |
| subtotal / install_rate_total / total / amount_in_words | app-computed | app-computed | ✅ | ✅ (never compute) | — |
| work_duration | ⚠️ payload accepted → **silently dropped** | ❌ | n/a (no column) | ❌ | **F3-02** |
| payment_terms | ⚠️ payload accepted → **silently dropped** (create never maps to `custom_fields.payment_terms`) | ✅ (via `custom_fields.payment_terms` today — only through modification path; and it must pre-exist to stale-check against) | ✅ | ✅ (support listed) | **F3-01** |
| custom_fields | ✅ partial (same 6-key seed as invoice) | ✅ advance (invoice-only lock — the executor is family-locked to invoice; **advance configuration cannot be authored on a quotation by design**) | ✅ | ⚠️ | — |
| operation_id | ✅ auto | ❌ | ✅ | ❌ | — |
| archived_at / created_at / updated_at | — | — | ✅ | — | — |
| source_quotation_id | ❌ (not a quotation column) | ❌ | — | — | conversion chain lives on invoice only |

### 3.3 `invoice_items` / `quotation_items` (columns, both families)

| Column | Create | Modify | Preserve | Guidance | Notes |
|---|---|---|---|---|---|
| description | ✅ | ✅ | — | ✅ | matchBoluItems requires description on all new rows; absence → rejected |
| sub_description | ✅ | ✅ | — | ✅-ish | rich sub-description supported |
| make | ✅ | ✅ | — | ✅ | presumed from spec rules |
| quantity | ✅ | ✅ | — | ✅ | must be > 0 |
| unit | ✅ | ✅ | — | ✅ | default '' |
| unit_price | ✅ | ✅ | — | ✅ | ≥ 0 |
| amount | app | app | — | ✅ (never compute) | quantity × price, domain-computed |
| vat_rate | ✅ | ✅ | — | ❌ | per-row override authorable |
| discount_rate | ✅ | ✅ | — | ❌ | per-row override authorable |
| install_rate | ✅ | ✅ | — | ❌ | per-row install rate |
| install_rate_taxable | ✅ | ✅ | — | ❌ | — |
| show_install_rate | ❌ (always false on create) | ⚠️ merge preserves | ✅ | ❌ | form can set it; Bolu cannot |
| install_rate_override | ⚠️ flips to true automatically when `install_rate` is set | ⚠️ auto | ✅ | ❌ | explicit tri-state control unavailable |
| formula | ❌ | ⚠️ preserved; never set nor changed | ✅ | ❌ | not authorable (no column semantics for Bolu) |
| image_url | ❌ | ⚠️ preserved | ✅ | ❌ | resolveCanonicalItemImageUrl never resolves for Bolu items (no image input in proposals) |
| row_type | ⚠️ `standard` only | ✅ preserved when persisted is `group_header` | — | ❌ | **Bolu cannot author, promote, demote or delete `group_header` rows** (validator forces `standard`; mergeRefuses to downgrade) |
| group_id | ✅ (valid token) | ✅ | — | ❌ | group identity authorable only on name echo |
| group_name | ✅ (string) | ✅ | — | ❌ | tied to group_id; no group subtotals |
| sort_order | ✅ (input order, 0-based) | ✅ (input order) | — | — | index-derived, never client-specified |
| item_id | ✅ (validated active) | ✅ | — | ✅ | fail-closed discard with warnings (E3 family) |
| source_cps_id / source_cps_row_id / source_quotation_id / source_quotation_item_id | system | system (preserved) | ✅ | — | full lineage never proposed, never mutated |
| custom_data | ✅ `{partNo, condition}` keys only | ✅ merge keeps unknown keys verbatim | — | ✅-ish | partNo/condition authorable; other keys invisible to Bolu |
| created_at / updated_at | system | system | ✅ | — | — |

### 3.4 `custom_fields` keys (both families; created as **text** on invoice, **jsonb** on quotation)

| Key | Create | Modify | Preserve | Guidance | Notes |
|---|---|---|---|---|---|
| created_via: `'bolu_assistant'` | ✅ auto | ✅ | ✅ | — | inert marker used by forms/views to show co-creation |
| operation_id | ✅ auto | ❌ | ✅ | — | **create-only idempotency** |
| extraCharges `[{label, value, withTax}]` | ✅ (untaxed/taxed custom named charges) | ❌ | ✅ | ✅ (keep separate from items) | authorable at create only |
| chargeLabels `{}` | ✅ always empty | ❌ | ✅ | ❌ | label overrides (Rigging/Haulage) never authored by Bolu |
| calculationInputs `{vatPercent, discountValue, whtValue, discountType, discountTiming, whtType}` | ✅ subset (vatPercent ≥ others) | ❌ (recomputed only on item edits via persisted cf) | ✅ | ❌ | Bolu cannot change VAT %, discount, WHT rate after create |
| discountType / discountTiming / whtType | ✅ | ❌ | ✅ | ❌ | — |
| **header** `[{label, value}]` ("headerFields" in form state) | ❌ | ❌ | ✅ | ❌ | **Stage 3 gap F3-04**; form: label+value rows shown on PDF preview rows (`Client`, `PO Number`, `Title` + custom) |
| **additionalFields** `[{label, value, text?}]` | ❌ | ❌ | ✅ | ❌ | **Stage 3 gap F3-04**; PDF chips "Site: Ikeja depot"; legacy `bottom` migration on read |
| attachments `[{label, url, name?}]` | ❌ | ❌ | ✅ | ❌ | — |
| pdfOutput `{showBankDetails, bankAccountId, showFooter, showTagline, showBalanceDue, showAmountInWords, compact, landscapeLayout?}` | ❌ | ❌ | ✅ | ❌ | every key; Bolu invisible to them |
| pdfTemplateId | ❌ | ❌ | ✅ | ❌ | ten templates; unsignaled |
| signatoryId | ❌ | ❌ | ✅ | ❌ | cannot assign/change signatory |
| columnConfig `[{key, label, type, visible, visibilityMode, includeInTotal, formula?}]` | ❌ | ❌ | ✅ | ❌ | full table structure locked to form |
| groupMeta `{gN: {name, showSubtotal}}` | ❌ | ❌ | ✅ | ❌ | owned by form's group header flow |
| notesTitle / termsTitle | ❌ | ❌ | ✅ | ❌ | headings locked ("Remarks"/"Contract terms" only surfaced if set) |
| mergeQtyUnit / showItemImages | ❌ | ❌ | ✅ | ❌ | — |
| advance_invoice | ⚠️ five fields only (Stage 2, invoice-only) | ✅ same | ✅ | ✅ | Stage 2 complete for those five keys; fixed-`%` clamped amount preview shown |
| payment_terms (quotation) | name collision; virtual `custom_fields.payment_terms` | ✅ (quotation only, pre-existing cf required for stale-guard compare) | ✅ | ✅ | invoice writes the column; quotation the cf key |
| conversionTrail | ❌ | ❌ | ✅ | ❌ | conversion lineage system-owned |
| conversion/other unknown keys | n/a | n/a | ✅ verbatim merge | — | sibling preservation is the whole contract |

### 3.5 API/contract-shape gaps (for Stage 3 wiring)

- `BoluInvoiceItemInput.row_type` includes `'group_header'` as an assignable type — but `validateInvoiceItems` **forces `standard`**. The union type lies to readers; there is no group-header validation path.
- `BoluInvoiceItemInput` has no `image_url`, `formula`, `show_install_rate` — these exist only via merge/preserve; an authoring schema for them would need a new validator branch.
- `BoluInvoiceCreatePayload.items` carries no budget for `custom_data.other` keys; unknown part/condition survives only on modification.
- Modification proposal (`BoluInvoiceModifyPayload`) does **not** include `terms`, `po_number`, `title`, `project_id`, `work_duration`, `global_vat_percent`, `extra_charges` — the union is disjoint; Stage 3 has to grow it.
- `advance_invoice` is intentionally a separate operation type; Stage 3 blueprint keeps it untouched.
- `custom_payment_terms` is in the DB schema but **unreachable** from Bolu by construction: the create payload maps it only on the form path (`payment_terms === 'Custom' ? custom_payment_terms : payment_terms`) — Bolu has no `Custom` sentinel at all.

## 4. Rich-text format check (`notes` / `terms`)

**What the form stores.** The invoice/quotation editor (`src/components/ui/editor.tsx`, TipTap StarterKit) emits a **normalized HTML subset**: `h1|h2|h3`, `p`, `ul|ol`, `li`, `strong`, `em`, `u`, `<br>`. `normalizeRichTextHtml` (src/components/pdf/core/richText.ts) is applied on every update and on render: it accepts the subset, drops unknown tags (skills), and emits `<p>`-wrapped blocks; if parsing fails it falls back to **paragraphs with `<br />`** from plain text. Plain text with `\n\n` splits renders identically.

**Array input is also legal.** `parseRichText` accepts a `CommercialRichTextBlock[]` array (paragraph/heading/ordered_list|unordered_list with `CommercialRichTextRun[]` children, `runs: {text, bold?, italic?, underline?}`) and canonicalizes it to the same HTML subset. So Bolu could emit:

```json
[{"type":"paragraph","children":[{"text":"See winch access."}]},
 {"type":"unordered_list","items":[[{"text":"Rate locked"}],[{"text":"PAYG 30 days"}]]}]
```

and have it render as formatted rich text — without inventing a parallel format.

**Implications for Bolu (Stage 3 must bake these rules in):**

1. Plain single-line strings are safe everywhere (PDF, form read-back).
2. Multi-line plain text is safe — the render parser splits `\n\n` into `<p>` and each line gets `<br />`.
3. Raw HTML from the model is **not** guaranteed: unmatched tags, `script`, `style`, `a[href]` are stripped or ignored unpredictably; never instruct the model to emit arbitrary HTML. Emit either plain text or the array contract above via a serializer in the application layer (application-owned, not model-owned).
4. The form read-back uses `setContent(normalized)` without cursor jump; a partial invalid block simply fails to parse → fallback plain text; no corruption, but no structure either.
5. `notesTitle`/`termsTitle` gate the browser print preview section titles; unauthored documents show hard-coded fallback labels.

**Cleanup rule proposal for Stage 3:** when Bolu writes notes/terms, the validator should normalize to strict `<p>` blocks or the array contract, never pass raw model HTML. The current create/modify path writes the payload string as-is (BoluInvoiceCreatePayload.notes is a free string) — Stage 3 should normalize in `serializeBoluItem`-equivalent for notes.

## 5. Custom header fields & group headers — the exact contracts

### 5.1 `custom_fields.header` (the "headerFields" rows)

Form state: `customFields: Array<{ id?: string; label?: string; value?: string; [key: string]: unknown }>` (same `InvoiceFieldEntry`).
Persisted: `header: customFields.filter(f => f.label && f.value)` — **entries need both non-empty**; empty-labeled or empty-valued ones are dropped silently on save.
Consumed by: quotation & invoice preview models (`buildQuotationPreviewModel`, invoice equivalent) as **PDF detail rows** after `Client`, `PO Number`, `Title`. Rendering is `{ label, value }` stringified, filter requires non-empty value.
Shape for Stage 3 (suggested TypeScript):

```ts
export interface BoluHeaderField {
  label: string            // required, non-empty after trim
  value: string            // required, non-empty after trim
}
// update this same contract for `additionalFields` (identical shape)
```

Boundary rules the validator must enforce for Stage 3 (from form behavior):
- label ≤ ~80 chars, value ≤ ~2000 chars (no schema today — guidance, not hard limit);
- unique-ish labels preferred (header rows are display-only; duplicates confuse reading);
- both trimmed; rows with one side empty are **never** written;
- `header` is metadata, not line items; cannot express money/columns.

### 5.2 `custom_fields.additionalFields` (PDF chips)

Same `InvoiceFieldEntry` shape, same contract, consumed by **every PDF template** as wrap-grid chips (`label: value`, e.g. `Site: Ikeja depot`). Form also migrates legacy `bottom` into `additionalFields` on read. A Stage 3 authoring path should accept an array directly, apply `filterPopulatedAdditionalFields`-equivalent on the way in, and **replace or merge** — the stage-0 preserved-block contract applies.

### 5.3 `row_type: 'group_header'` and `groupMeta`

Item rows for groups:

```ts
{
  row_type: 'group_header',
  description: 'Phase 1 rigging',   // display text; required non-empty in practice
  group_id: 'quo_group_<ts>_<rand>', // canonicalized at save by normalizeQuotationGrouping
  group_name: 'Phase 1',             // authoritative display name
  sort_order: 0,
  quantity: 1, unit_price: 0, unit: '',  // stubbed for the DB NOT NULL columns
  vat_rate: null, discount_rate: null, install_rate: null,
  custom_data: {},
}
```

`customMeta` sibling:

```ts
groupMeta: { [group_id: string]: { name: string; showSubtotal: boolean } }
```

Rules: a group header row must appear **before** its member rows in the array; members of a group carry the same `group_id`; `showSubtotal: true` yields a subtotal computed row; groups never nest; removing a group header without removing members orphans them.

Bolu today: **cannot author any of this.** The validator forces `row_type === 'standard'`; the form's `addGroup` flow is hard-wired to the UI. Stage 3's group support must land as typed validator rules with explicit `group_header` intent or as a separate operation (`add-group-section`) — see blueprint.

## 6. Prompt/Recommendation guidance audit

What the prompt teaches well: structured envelopes, totals never computed, percent/VAT/WHT semantics (implicitly via domain defaults), "keep extra charges separate", client resolution, no invented specs, concise plain language, typography.
What it does not teach at all:

- when and why to request `po_number`, `project_id`, `work_duration`, `due_date`/`valid_until`, `payment_terms` on a **new** document — the model is told they exist but not that context facts (client history, project references, prior documents) could suggest them, so it never proposes them;
- when to split a total into `extra_charges` vs line items (the rule is implied by "keep custom named charges separate" but no numeric guidance);
- the rich-text array contract for notes/terms — model has to guess; today it emits free strings;
- existence of header/additional/PDF/signatory surfaces at all — a fully user-requested "add an account-number row on the PDF" would produce nothing usable;
- what "raise a Proforma Invoice", "mark it overdue", "attach a spec" map to — the honest answer must be "not supported", which is nowhere codified;
- clamping behaviour for fixed advance amounts (UI will show it, but the model is never told it happens).

Every unsupported field in Section 3 is **also** unguided. That is the loop this audit closes: for each unsupported field, Stage 3 must instruct the model either (a) how to author/recommend it, or (b) to say explicitly that it cannot.

## 7. Stage 3 implementation blueprint

### Stage 3a — Scope & safety fixes (no new capability)
1. **Reject or map `payment_terms`/`work_duration` on quotation proposals**; do not silently drop (either executor-side strip with warning, or map `payment_terms → custom_fields.payment_terms` on create with the same payload the modification path writes). Verify via targeted test.
2. **Make the validator's row_type union honest** (narrow to `'standard'`).
3. **Prompt: add negatives** — a "when asked for X, respond 'not supported' or ask" table so Bolu never swallows an out-of-contract request silently.
4. **Commercial rich-text rule**: instruct plain text or array contract for `notes`/`terms`; add validator normalization of `notes`/`terms` through the application normalizer, never raw HTML from the model.
5. **`project_id` verification**: before persisting, check the project exists and belongs to the same tenant entity → same discard-with-warning pattern as `item_id`, never a silent 23503.

### Stage 3b — Custom document rows
6. New proposal operation `document-rows` (or an extension of create/modify payloads — recommend a dedicated modify-style operation) supporting exactly two typed intents:
   - `upsert-header-field { label, value }` on invoice or quotation,
   - `upsert-additional-field { label, value }` on invoice or quotation,
   - validated label/value presence, label uniqueness in the row set, and preservation of sibling keys (existing `header`/`additionalFields` arrays are merge-read and written back verbatim elsewhere).
7. **Remove** intent with explicit row identity (label match), never table-wipe.
8. Prompt guidance on *when* to recommend: bank/PO/reference rows on proforma/invoice footer, site/delivery chips on the PDF, project references, retention clauses in terms.

### Stage 3c — Groups & subtotals
9. `add-group-section { name, showSubtotal?, members: [item ids] }` and `rename-group`, `collapse/ungroup` operations on existing documents; group rows authorable at create via `row_type: 'group_header'` when the item payload carries a `group_name` on each member (application generates `group_id`).
10. `groupMeta.showSubtotal` authoring and `show_install_rate`/`show_install_rate` semantics documented to the model.

### Stage 3d — PDF & presentation authoring
11. `pdf-output` operation: `{ templateId?, showBankDetails?, bankAccountId?, showTagline?, showFooter?, showBalanceDue?, showAmountInWords?, compact?, landscapeLayout? }` — merge-onto-persisted, never replace blindly. Requires the `pdfTemplateId` allowlist at the validator.
12. `notesTitle`/`termsTitle`, `chargeLabels`, `mergeQtyUnit`, `showItemImages`, `signatoryId` (verified signatory resolution — same pattern as client resolution).

### Stage 3e — Quotation void / payment_terms map + recommendation guidance
13. Quotation create: persist payload.payment_terms into `custom_fields.payment_terms` (or reject with warning).
14. Prompt: when to recommend structured fields on reads ("for a proforma to Sasol, recommend the advance block + account-number row").

**Not in Stage 3** (carry-forward PROPOSED list): tenant item_id FK restoration (F1/F3 lineage note), crosstab/search indexes, server-side Gate 2 executor for advance, CPS/quotation parity beyond these rows, deployment of any of the above to production.

## 8. Finding register

| ID | Area | Severity | Summary |
|---|---|---|---|
| F3-01 | quotation payment_terms | High | silently dropped on create; interaction with modification path works only when a quotation cf pre-exists |
| F3-02 | quotation work_duration | High | silently dropped; quotations have no such column |
| F3-03 | terms modify | High | cannot modify `terms` on an existing document of either family |
| F3-04 | header/additional | High | no authoring path, no validation, no prompt guidance |
| F3-05 | group headers | High | validator forces `standard`; row_type union lies |
| F3-06 | commercial charges modify | Medium | workmanship/transportation/shipping/discount/vat/wht untouchable by Bolu |
| F3-07 | rich text | Medium | no format rules; raw HTML not guaranteed |
| F3-08 | status | Medium | unpaid/open only, never movable by Bolu |
| F3-09 | recommendation guidance | Medium | prompt never suggests missing-new-document fields from context |
| F3-10 | operation_id | Low | create-only idempotency |
| F3-11 | project_id | Medium | no tenant-project verification at the executor; 23503s are possible |
| F3-12 | `payment_terms === 'Custom'` path | Medium | dead via Bolu; custom_payment_terms unreachable |
| F3-13 | BoluInvoiceItemInput.row_type | Low | dishonest union member (`group_header`) never validated as such |
| F3-14 | `chargeLabels` empty object | Low | Bolu's create always writes `chargeLabels: {}` — label overrides from any future create-time path remain unsupported; harmless on create, misleading in merges |
| F3-15 | invoice RPC `custom_fields = $18` | Low | the invoice update RPC writes the raw payload `custom_fields` string without the quotation's `COALESCE(NULLIF(...,''),'{}')` guard; only a non-JSON value would corrupt it (executor always stringifies safely) |

## 9. Verification of this audit

- All claims sourced from repository files listed in §1 (no other observation).
- `git status --porcelain=v1` and `git diff` after this audit: only this report is added; no source, migration, test or `.env` file was touched; no database was contacted; `bun run build` not run.
- Stage 1/2 source behaviour verified in-tree at HEAD `1d7d6d75` plus current working tree for Stage 2 (the working tree contains the Stage 2 modifications reviewed here — see `docs/reports/bolu-document-capability-parity/stage-2-advance-invoice-wiring.md`).
