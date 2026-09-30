# Cost & Pricing Sheet PRD 03 — Implementation Readiness and Roadmap

Status: Authoritative. Planning only. This document authorizes no implementation.
Date: 2026-09-29
Repository path: `docs/prd/cost-pricing-sheet/03-cost-pricing-sheet-implementation-readiness-roadmap.md`
Package: `docs/prd/cost-pricing-sheet/`. Sibling documents:
[01-cost-pricing-sheet-product-domain-architecture.md](01-cost-pricing-sheet-product-domain-architecture.md),
[02-cost-pricing-sheet-presentation-pdf-view-contract.md](02-cost-pricing-sheet-presentation-pdf-view-contract.md),
[waterfall-roadmap.html](waterfall-roadmap.html). Supersedes §§28–33 and §§35–38 of
`docs/prd/boq-architecture-prd.md`.
Authoritative scope: package index, ordered implementation phases, dependency graph,
migration ordering, shared-infrastructure preparation, backend/domain preparation,
transplant/view/PDF gates, verification requirements, risk register, standards delta,
acceptance criteria, non-goals, unresolved decisions.
Evidence basis: `docs/prd/boq-architecture-prd.md` (§§28–33, 35–38);
`docs/reports/cost-pricing-sheet/boq-quotation-compatibility-audit-2026-09-29.md` (§9 conflicts,
acceptance list); repository re-audit on 2026-09-29.
Skills used: writing-clearly-and-concisely
Documentation standard: ASD-STE100 Simplified Technical English

---

## 1. Package index

| File | Owns |
| :--- | :--- |
| `01-cost-pricing-sheet-product-domain-architecture.md` | Product identity, decisions D1–D19, calculation architecture, CP/SP, compatibility, columns, Sub Description, groups, import, photos, prefix, persistence, save, lineage, RFQ isolation, reuse map |
| `02-cost-pricing-sheet-presentation-pdf-view-contract.md` | V12 contract, form/backend boundary, view architecture, candidate evaluation, Forme contract, customization, view→PDF parity, FAB, responsive expectations, presentation gates |
| `03-cost-pricing-sheet-implementation-readiness-roadmap.md` (this file) | Phases, dependencies, migrations, gates, verification, risks, standards deltas, acceptance, non-goals, open questions |
| `waterfall-roadmap.html` | Animated visual companion to this file. Informative only; this file governs on conflict. |

Final decisions: D1–D18 (File 01 §3), including the shared-engine calculation
model (D16–D17) and the Forme renderer (D18).

Unresolved gates: View Page candidate selection (D19 open); five product scope
questions (§9 Q1–Q5); migration-track Forme readiness (§6.3).

Implementation readiness: **NOT READY**. Backend and domain work is fully
specified and may proceed in phase order. Presentation transplant, view
implementation, and PDF implementation are gated (§6).

---

## 2. Ordered implementation phases

Each phase ends in a verifiable state. Phases A–G complete before any
presentation phase begins. No phase starts until its dependencies are green.

### Phase A — Decisions and schema

1. Confirm the open items in §9.
2. Write **M1** (`boqs.boq_number` unique), with duplicate pre-check.
3. Push M1. The push must succeed.
4. Write **M2** (parity columns) with in-migration backfill from `cells`.
5. Push M2.
6. Write **M3** (row consolidation, row-type backfill, `groupMeta`, `columnConfig` seeding).
7. Push M3.
8. Run the standards updates in §8 as separate tasks.

### Phase B — Shared infrastructure extensions

9. Add optional `builtins` to `useInvoiceColumns`, `resolveFinancialColumns`, `getResetColumnConfigs`.
10. Add `hideFullDenyList` to `ColumnManager`.
11. Add `'cp'`/`'sp'` to `ImportFieldKey`.
12. Widen `generateImportPrompt` `documentType`; add the group-support flag.
13. Extract `src/lib/itemPhotoUpload.ts`; refactor `MobileItemCard` to call it.
14. Widen `DocumentTrailLink.type` with `'boq'`.
15. Regression guard: `columnVisibilityMode.test.js`, `jsonGroupImport.test.js`, `calculations.test.js` MUST pass.

### Phase C — Cost & Pricing Sheet domain

16. Create `src/domain/boq/columns.ts` (`BOQ_BUILTIN_COLUMNS`, `BOQ_HIDE_FULL_DENY_LIST`).
17. Create `src/domain/boq/calculations.ts` (Cost & Pricing Sheet adapter per File 01 §4.2; delegates costing to `computeBoqTotals`).
18. Create `src/domain/boq/rows.ts`.
19. Rewire `src/domain/boq/types.ts` to the parity row contract.
20. Update `normalize.ts`: parity fields, `columnConfig`, `groupMeta`, legacy read.
21. Update `factories.ts`.
22. Extend `calculateBoqTotals.ts` with `margin_percent` and `BoqGroupTotals` (formulas unchanged).
23. Create `assertIdentityImmutable.ts`.
24. Prove RFQ isolation (File 01 §16 proof commands).

### Phase D — Save and orchestration

25. Create `useBoqSave.ts` with `withUniqueRetry` + `getNextBoqNumber`.
26. Create `BoqFormPage.tsx`.
27. Convert `NewBoq.tsx` and `EditBoq.tsx` to thin delegators.
28. Create `useBoqLineItems.ts`, `boqFormUtils.ts`, `boqFormTypes.ts`.
29. Wire the Save FAB via `FormFooter`.

### Phase E — Columns and groups on the form

30. Wire `ColumnManager` with `BOQ_BUILTIN_COLUMNS` and `BOQ_HIDE_FULL_DENY_LIST`.
31. Wire group operations and `groupMeta` persistence.
32. Wire shared-engine + costing totals into form state through the Cost & Pricing Sheet adapter.

### Phase F — JSON Import

33. Create `src/domain/boq/importAdapter.ts` and the Zod schema.
34. Create `BoqImportSheet.tsx`.
35. Verify Add-mode groups and Update-mode group rejection.

### Phase G — Photos, conversion, duplicate, audit, export

36. Wire `uploadItemPhoto` into the Cost & Pricing Sheet item card.
37. Rewrite `convertBOQToQuotation` (explicit row construction; SP→`unit_price`; CP omitted; client-field correction; column-config strip rule; unknown-column whitelist).
38. Rewrite `duplicateBOQRecord` (copy `boq_rows`; shed identity, lineage, client, project; fresh number; audit `CREATE`/`CREATED`).
39. Add `recordBoq*` emitters and `BOQ_TRACKED_FIELDS` (no migration needed — generic RPCs accept `'boq'`).
40. Fix `exportFetchers.ts` (`BOQS → 'boq_rows'`) and `exportCompilers.ts` (`boq_items → boq_rows`).
41. Static check: no `boq_items` string remains under `src/`.

### Phase H — V12 presentation transplant (LAST, gated)

42. Confirm every item of the V12 gate (§6.1) is green.
43. Transplant the approved V12 design into `BoqFormScreen.tsx` (and `BoqViewScreen.tsx` only after the view gate in §6.2 closes).
44. Replace V12 local state with production state and commands.
45. Verify responsive composition and photo placement.
46. M4 (legacy cleanup) only after production verification, under separate authorization.

---

## 3. Dependency graph

```text
Architecture contract (this package)
        ↓
Schema / persistence preparation (M1–M3)
        ↓
Shared infrastructure extensions (Phase B; Invoice/Quotation regression-guarded)
        ↓
Cost & Pricing Sheet domain model (Phase C: rows, columns, adapter, groups, identity)
        ↓
Cost & Pricing Sheet calculation adapter (Phase C/E: shared engine + costing delegation)
        ↓
Column / group / import / photo readiness (Phases E–F)
        ↓
Save / numbering / audit / lineage (Phases D, G)
        ↓
Cost & Pricing Sheet → Quotation conversion (Phase G; Quotation → Invoice boundary already verified)
        ↓
V12 form transplant (Phase H — gated, §6.1)
        ↓
View Page implementation (gated, §6.2)
        ↓
pdfcn Forme implementation (gated, §6.3)
        ↓
Export / duplicate / finishing integration (Phase G items + parity checks)
        ↓
Static verification / acceptance (§7)
```

Shared-system dependencies: prefix engine, column framework, import pipeline,
Cloudinary uploader, save orchestration, FAB components, audit RPCs, export
compilers, `table-document` (RFQ-owned, untouched). Cost & Pricing Sheet-owned work: Cost & Pricing Sheet domain
files, adapter, `BoqFormPage`, V12 transplant, Cost & Pricing Sheet Forme template, Cost & Pricing Sheet import
sheet, Cost & Pricing Sheet photo wiring. Implementation-ready now: Phases A–G. Gated: Phase H,
view implementation, Forme implementation.

---

## 4. Migration ordering (requirements only)

Four migrations. None created by this task. Each is a separately authorized
implementation task with a mandatory `supabase db push`.

**M1 — unique constraint on `boqs.boq_number`.** The prefix standard requires a
unique constraint; `withUniqueRetry` needs `23505`. `boqs` has no unique index
*(evidence)*. Scope: public template + every tenant schema. Pre-step: detect
and resolve duplicates and NULLs. Index:
`CREATE UNIQUE INDEX ... ON boqs (boq_number) WHERE boq_number IS NOT NULL`.

**M2 — `boq_rows` parity columns.** `boq_rows` has 13 columns;
`quotation_items` has 25. Add: `sub_description text`, `make text`,
`sp numeric`, `cp numeric`, `image_url text`, `group_id text`,
`group_name text`, `vat_rate numeric`, `discount_rate numeric`,
`install_rate numeric`, `install_rate_override boolean`,
`install_rate_taxable boolean`, `amount numeric`,
`custom_data jsonb NOT NULL DEFAULT '{}'`. `row_type` stays `text`; M3
backfills values. Scope: public template + all tenant schemas. Backfill within
M2: `sp`/`cp` from `cells`, `sub_description` from `cells->>'specification'`,
`make` from `cells->>'make_brand'`. Idempotent with `IF NOT EXISTS`.

**M3 — row store consolidation and row-type backfill.** For each Cost & Pricing Sheet with empty
`boq_rows` and non-empty `custom_fields.table_rows`, insert rows from JSONB;
rename `row_type` (`'section'`→`'group_header'`, `'item'`→`'standard'`); move
`section_title` to `group_name` + `description`; populate `groupMeta`; seed
`columnConfig` from `table_columns` using the canonical order. Transactional,
idempotent, with per-`boq_id` row-count verification.

**M4 — legacy cleanup (separate authorization).** Stop writing
`custom_fields.table_rows`; remove `table_columns` keys; drop
`boq_rows.section_title` after one release cycle; keep `cells jsonb` one cycle
as a read safety net, then drop. Destructive. Requires explicit authorization.

Migrations NOT required (verified): Cost & Pricing Sheet audit whitelist (`'boq'` already
permitted; both generic RPCs accept it); prefix settings entry (present);
`boq_rows` RLS (policies exist); tenant grants (granted); `source_boq_id`
(exists); new activity event type (covered); new audit RPC (covered).

---

## 5. Future implementation file map

All paths verified except those marked "to create".

To create: `src/pages/BoqFormPage.tsx`; `src/components/boq/BoqFormScreen.tsx`
(V12 transplant target); `src/components/boq/BoqViewScreen.tsx` (view target,
gated); `src/components/boq/useBoqLineItems.ts`; `boqFormUtils.ts`;
`boqFormTypes.ts`; `src/components/boq/BoqImportSheet.tsx`;
`src/domain/boq/columns.ts`; `src/domain/boq/rows.ts`;
`src/domain/boq/calculations.ts` (adapter); `src/domain/boq/importAdapter.ts`;
`src/domain/boq/schema.ts`; `src/domain/boq/assertIdentityImmutable.ts`;
`src/hooks/useBoqSave.ts`; `src/lib/itemPhotoUpload.ts`; M1–M4 migrations.

To modify: `NewBoq.tsx`, `EditBoq.tsx`, `ViewBoq.tsx` (placeholders → real);
`src/domain/boq/{types,normalize,factories,calculateBoqTotals}.ts`;
`src/pages/view-boq-actions.ts` (conversion + duplicate + audit);
`src/domain/invoice/types.ts` (`'boq'` union member); `useInvoiceColumns.tsx`;
`resolveFinancialColumns.ts`; `columns.ts` (`getResetColumnConfigs`);
`ColumnManager.tsx`; `import/types.ts`; `import/promptGenerator.ts`;
`MobileItemCard.tsx`; `src/lib/audit.ts` (`'boq'`, `BOQ_TRACKED_FIELDS`,
`recordBoq*`); `exportFetchers.ts`; `exportCompilers.ts`; `BoqList.tsx`
(verify); `templateRegistry.ts` (retire `BOQ_COLUMNS` after migration).

Decisions required before coding: `cells jsonb` retention (§9 Q4); WHT scope
(§9 Q1); V12 column-resolver survival (File 02 §2.2); `amount` in stage 1
(§9 Q2).

---

## 6. Gates

### 6.1 V12 plug-and-play gate (hard)

The transplant MUST NOT begin until every item is green: authoritative row
model live with M3 pushed; `boq_rows` written with legacy read working; CP/SP
semantics live with deny list enforced and adapter outputs defined; shared +
costing values both produced in form state with `Calculations.ts` untouched;
tax/discount/install columns with `hide_display` defaults and row overrides;
`ColumnManager` at full parity; groups (create, rename, subtotal toggle,
delete, membership, ordering, persistence); import contract (Add groups,
Update `row_number`, overwrite confirm, custom columns); photo lifecycle
(upload → `secure_url` → `image_url` → reload → replace → remove); M1 pushed
with retry-wrapped create; `BoqFormPage` + save strategy with validation;
conversion mapping implemented; lineage (`type: 'boq'`, `source_boq_id`
written, no observer); duplicate semantics; audit emitters live; prepared-data
contracts (`prepareBoqViewData`, no renderer calculation); M1–M3 pushed with M4
scheduled; §8 updates scheduled; RFQ isolation proven.

### 6.2 View implementation gate (hard, UNRESOLVED)

File 02 §4.1 owns this gate. It closes only on recorded human acceptance of
one candidate plus extraction of its structural contract. No view
implementation begins before then.

### 6.3 Forme PDF gate (hard)

Cost & Pricing Sheet PDF implementation begins only when: the migration track provides the
pdfcn foundation and a proven reference commercial-template path; the rich-text
port, browser/Vite proof, and density/weight resolutions from the POC gap list
are closed or explicitly scoped; `prepareBoqViewData` is implemented; and the
File 02 §5.4 rendering rules are acknowledged in the implementation plan.
Cost & Pricing Sheet PDF work MUST NOT begin as a React-PDF template. No legacy Cost & Pricing Sheet PDF path
exists to fall back to.

---

## 7. Verification requirements

Static verification only (hardware policy; no build, typecheck, lint, tests,
`audit:load`, or database commands in documentation tasks):

- `git diff --check` passes.
- `git status` shows only intended PRD package files.
- Zero application source files changed. Zero migrations created. Zero
  standards modified. Zero candidate HTML files modified.
- Internal relative links between the three PRD files resolve.
- `waterfall-roadmap.html` is standalone with no missing local assets.
- The old monolithic PRD no longer competes as an authority (relocation stub
  only — see §10).

Implementation-time verification (for future tasks, not this one): regression
guard (`columnVisibilityMode`, `jsonGroupImport`, `calculations` tests) after
each shared edit; RFQ isolation grep proof; `boq_items` absence check;
per-`boq_id` row-count verification around M3; V12 gate item proofs.

---

## 8. Standards delta (future updates, not performed here)

No standard is edited by this task. Required updates, each a separate
explicitly authorized task:

- `json-import-standard.md`: replace the Invoice/Quotation-only group module
  list with a capability flag; add Cost & Pricing Sheet (§1, §6, §9).
- `document-column-standard.md`: add Cost & Pricing Sheet to covered modules; note per-document
  built-in sets (`sp` instead of `unit_price`, plus `cp`); add the Cost & Pricing Sheet
  hide-full deny rule; add the optional `builtins` parameter (§2, §4.1, §4.3,
  §5.4, §11).
- `audit-trail-standard.md`: add Cost & Pricing Sheet rows to the §6 coverage matrix (CREATE,
  UPDATE, STATUS_CHANGE, LINK, DUPLICATE, ARCHIVE); note `'boq'` already
  permitted.
- `document-transformation-standard.md`: confirm Cost & Pricing Sheet identity (`boq_number` +
  client + lineage); list Cost & Pricing Sheet under the Duplicate Law with CP/SP preserved and
  lineage/client shed; widen the trail `type` union with `'boq'`.
- `fab-standard.md`: no Cost & Pricing Sheet update required; v1.1 already covers document
  modules generically.
- Code (not a standard): `DocumentTrailLink.type` gains `'boq'`.

Standards applicability: 15 files read. 1 conforming as-is
(`pdf-customization-extension-standard.md`); 9 applicable with implementation
missing; 3 stale needing documentation updates (import, column, audit-trail);
the import group clauses genuinely conflict (recorded above); 3 not applicable
(receipt, commit-workflow, commercial-party placeholder per AGENTS.md §6).

---

## 9. Unresolved decisions

Only questions that repository evidence and D1–D18 cannot settle. Defaults
apply if unanswered.

**Q1 — Is WHT deferred beyond stage 1, or excluded permanently?** WHT exists on
Quotation and in the shared engine. Cost & Pricing Sheet has no WHT field. Product scope call.
Default: defer beyond stage 1.

**Q2 — Should Cost & Pricing Sheet expose an `amount` column in stage 1?** Quotation has
`amount` as a non-removable built-in. V12 shows no per-row `amount`. Product
call. Default: include `amount` for parity, defined as `quantity × sp`.

**Q3 — Is `boqs.client_name` the conversion client, or is `vendor_name`?**
`boqs` holds both. Current code prefers `vendor_name`. File 01 argues
`client_name`. The repository documents no Cost & Pricing Sheet party roles. Default:
`client_name`, falling back to `vendor_name`.

**Q4 — Does Cost & Pricing Sheet keep `cells jsonb` after M4?** M4 proposes dropping it after a
release cycle. Operational risk-tolerance call. Default: drop after one clean
release cycle.

**Q5 — Which V12 proof points must a reviewer sign off before Phase H?**
Approval process, not architecture. Default: the project lead approves the §6.1
gate in writing.

**Q6 — Which View Page candidate is the presentation direction?** Four
candidates (V1–V4) exist with no recorded acceptance. Human visual decision
required per File 02 §4.1. No default. The package stays NOT READY until this
closes.

---

## 10. Retirement of the monolithic PRD

`docs/prd/boq-architecture-prd.md` is superseded by this package. It MUST NOT
remain a competing authority. The repository-safe retirement is a short
relocation stub pointing to `docs/prd/cost-pricing-sheet/`. Section-to-file mapping:

| Superseded section | New home |
| :--- | :--- |
| §1 Executive summary | 03 §1 + File 02/01 detail |
| §2 Product intent | 01 §1 |
| §3 Domain identity | 01 §2 |
| §4 Product decisions (D1–D15) | 01 §3 (D16–D19 added) |
| §5 Current state | 01 (re-audited where live paths matter); demolition report stays evidence |
| §6 Target architecture | 01 (layer diagram + ownership) |
| §7 Compatibility contract | 01 §6 |
| §8 Lineage model | 01 §15 |
| §9 Price ownership | 01 §5 |
| §10 Commercial calculation | 01 §4 (superseded and resolved) |
| §11 Columns | 01 §7.1–§7.4 |
| §12 Field semantics | 01 §7.5 |
| §13 Sub Description | 01 §8 |
| §14 Groups | 01 §9 |
| §15 JSON Import | 01 §10 |
| §16 Photos | 01 §11 |
| §17 Prefix engine | 01 §12 |
| §18 Persistence | 01 §13 |
| §19 Save lifecycle | 01 §14 |
| §20 Conversion mapping | 01 §20 (full header/item/config mapping, whitelist, classification) |
| §21 Quotation→Invoice boundary | 01 §15 + §2 Phase G (verified snapshot; drift item in §5/§8) |
| §22 Duplicate | 01 §21 + §2 Phase G item 38 |
| §23 Lineage and audit | 01 §§15, 22 + §4 (migration verdict) |
| §24 FAB | 02 §§3–4, 7 |
| §25 PDF/view/customization | 02 §§3, 5–6 (pipeline superseded by Forme) |
| §26 Export | 01 §23 (defect + fix + verification preserved) |
| §27 RFQ isolation | 01 §16 |
| §28 Migrations | 03 §4 |
| §29 Reuse map | 01 §17 |
| §30 Standards matrix | 03 §8 |
| §31 Standards deltas | 03 §8 |
| §32 File map | 03 §5 |
| §33 Phase sequence | 03 §§2–3 |
| §34 V12 gate | 02 §2 + 03 §6.1 |
| §35 Risks | 03 §11 (register below) |
| §36 Non-goals | 03 §12 |
| §37 Questions Q1–Q5 | 03 §9 (Q6 added) |
| §38 Acceptance | 03 §13 + Files 01 §19, 02 §9 |

No section was dropped. Duplicated material was merged with the normative
requirement fully represented.

---

## 11. Risk register

| ID | Risk | Impact | Likelihood | Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| R1 | No unique constraint on `boqs.boq_number` | Duplicate numbers | High without M1 | M1 before any create path |
| R2 | M3 backfill corrupts rows | Data loss | Medium | Transaction; per-`boq_id` count verification |
| R3 | Split-brain stores diverge in transition | Inconsistent saves | Medium | Single-writer rule; legacy read only |
| R4 | Shared column extension regresses Invoice/Quotation | Cross-document breakage | Medium | Optional params, unchanged defaults, regression tests |
| R5 | Two totals disagree on screen | Wrong displayed totals | Medium | Fixed engine/adapter split; tax base = `sp` |
| R6 | `hide_full` on a locked field breaks costing | Wrong cost/profit | Medium | `BOQ_HIDE_FULL_DENY_LIST` |
| R7 | Conversion writes unknown columns | Insert failure | High today | Explicit row whitelist |
| R8 | Conversion loses groups | Structural loss | High today | Quotation row vocabulary |
| R9 | Duplicate copies parent only | Total item loss | **Certain today** | Rewrite per Phase G |
| R10 | RFQ regression | RFQ breaks | Medium | Isolation proof; no `table-document` edits |
| R11 | Stale standards mislead a future agent | Wrong implementation | High | §8 list; package states where it overrides |
| R12 | Export queries a nonexistent table | Export fails | **Certain today** | Phase G fix |
| R13 | V12 transplant begins before the gate | Architecture invented in presentation | High | §6.1 hard gate |
| R14 | Cost & Pricing Sheet leaks into Tax/Compliance Hub | Scope creep | Low | File 01 §4.7 prohibitions |
| R15 | CP leaks into a Quotation | Identity breach (I6) | Medium | Column strip rule; conversion test |
| R16 | Lineage misread as sync | Unauthorized live sync | Medium | Snapshot prohibitions (File 01 §15) |
| R17 | Wrong conversion client | Wrong customer on quotes | Medium | §9 Q3; client-field correction |
| R18 | Concurrent agent edits collide | File collision | Ongoing | Phase scope; baseline discipline |
| R19 | Unsigned Cloudinary preset | No per-tenant isolation | Accepted | Matches existing behavior; do not extend |
| R20 | Cloudinary orphans on remove | Storage growth | Accepted | No delete path today; out of scope |
| R21 | Premature `TableDocumentType` narrowing | RFQ breaks | Low | Narrow only with zero Cost & Pricing Sheet callers |
| R22 | Ambiguity during backfill window | Two stores persist | Medium | Single writer; scheduled M4 |
| R23 | Forme migration track slips | Cost & Pricing Sheet PDF blocked | Medium | §6.3 gate; Cost & Pricing Sheet PDF never starts on React-PDF |
| R24 | View selection stalls | Package stays NOT READY | Medium | §9 Q6; time-box the human review |

---

## 12. Explicit non-goals

This package does not authorize or describe: application code; migrations;
`docs/standard/**` edits; V12 HTML edits; `claude-version.html` edits; build,
typecheck, lint, test, `audit:load`, or database commands; RFQ reconstruction;
Quotation or Invoice redesign; stage-1 WHT or amount-in-words; Tax/Compliance
Hub membership; live synchronization; new financial formulas; Cost & Pricing Sheet-only column,
import, group, photo, or numbering engines; `table-document` deletion or forced
RFQ migration; a second Cloudinary account or preset; a stage-1 Cost & Pricing Sheet revert
workflow; a new View candidate as implementation.

---

## 13. Package-level acceptance criteria

The package is accepted when a future implementation agent answers yes to every
item, plus File 01 §25 and File 02 §9:

- [ ] One authoritative source exists for each architectural concern (§1).
- [ ] No valid prior decision was silently lost (§10 maps every section).
- [ ] `src/lib/Calculations.ts` is the shared engine; the adapter duplicates no formula.
- [ ] `calcTotals()`/`resolveRowVat()` have no new callers.
- [ ] SP→`unit_price` is explicit; CP is Cost & Pricing Sheet-only; no Quotation CP field exists.
- [ ] Invoice/Quotation calculation behavior is protected (optional params, regression guard).
- [ ] Forme is the recorded renderer; Takumi is not presented as an option; no second engine exists.
- [ ] The migration PRD is referenced without wholesale duplication.
- [ ] View candidates V1–V4 are audited; selection is recorded only with explicit evidence, else UNRESOLVED.
- [ ] V12 stays behind the §6.1 gate.
- [ ] `waterfall-roadmap.html` visualizes this file's waterfall with gates, blockers, and readiness states.
- [ ] Migrations are documented, not created. Standards updates are documented, not performed.
- [ ] Zero production files, standards, migrations, or candidate HTML changed in this task.
- [ ] `git diff --check` passes.
