# Tax PRD Folder Alignment Audit — Continued Review

This report was written by Buffy on 2026-09-05 via Freebuff.

## Objective

Verify two findings from the Record-capture-v1.md review against the codebase and the Act text. Then audit every PRD-folder document that entered the index since the last reviewed update for evidenced-versus-asserted claims.

This task is read-only. No PRD file, reference file, or code file was edited.

## Baseline Git Status

Captured before this audit:

```
On branch main
Your branch is up to date with 'origin/main'.

Changes to be committed:
	new file:   docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Files-tax-monthly-v1.md
	modified:   docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Readme.md
	new file:   docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Record-capture-v1.md
	new file:   docs/prd/Taxation-Made-Easy-Engine-Smart-Activity-NRS-Compliance/Record-engagement-plan-v1.md
	new file:   .../Refrences/luca-v05-accounting-architecture-reference.md
	new file:   .../Refrences/openaccountants-openfisca-tax-reference.md
	new file:   .../Refrences/tax-foundation-pslmodels-balaka-openbooks-beancount-reference.md
	new file:   .../Refrences/taxbridge-nigeria-cit-reference.md
	new file:   .../Refrences/tekvwarho-proaudit-nigeria-tax-reference.md
	new file:   .../adaptive-uiux-alignment.md
	new file:   .../ai-integration.md
	new file:   .../multi-tenancy-alignment.md
	new file:   docs/prd/multi-tenancy/Readme.md
	new file:   docs/prd/multi-tenancy/Refrences/base.md
	modified:   docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md
	new file:   docs/reports/general/cit-readiness-audit-2026-09-05.md
	new file:   docs/reports/general/files-tax-monthly-prd-audit-2026-09-05.md
	new file:   docs/reports/general/invoice-to-quotation-revert-blocker.md
	new file:   docs/reports/general/invoice-to-quotation-revert-fix.md
	new file:   docs/reports/general/luca-vs-bigdrops-accounting-architecture-audit-2026-09-05.md
	new file:   docs/reports/general/openaccountants-openfisca-tax-architecture-audit-2026-09-05.md
	new file:   docs/reports/general/record-capture-prd-audit-2026-09-05.md
	new file:   docs/reports/general/tax-foundation-pslmodels-balaka-openbooks-beancount-audit-2026-09-05.md
	new file:   docs/reports/general/taxbridge-nigeria-cit-architecture-audit-2026-09-05.md
	new file:   docs/reports/general/tekvwarho-proaudit-nigeria-tax-architecture-audit-2026-09-05.md
	new file:   docs/reports/general/vat-filing-support-prd-update-2026-09-05.md
	new file:   docs/reports/multi-tenancy/entity-lifecycle-audit.md
	new file:   docs/reports/multi-tenancy/ownership-transfer-ui.md
	new file:   docs/reports/multi-tenancy/workspace-management-gaps-audit.md
	modified:   src/domain/tenant/tenantCreation.ts
	modified:   src/lib/tenant/contexts.tsx
	modified:   src/modules/invoices/services/invoiceConversionService.ts
	modified:   src/pages/settings/AdminSettingsSection.tsx
	modified:   src/pages/settings/CompanyManageSection.tsx
	modified:   src/pages/viewQuotationActions.ts
	new file:   supabase/migrations/20260905000000_revert_invoice_canonical_tenant_install.sql
	new file:   supabase/migrations/20260905010000_workspace_management_gaps.sql
	new file:   supabase/migrations/20260905020000_entity_lifecycle.sql
```

All listed changes are pre-existing staged work from other agents or earlier sessions. This audit did not modify, revert, stage, or unstage any of them.

## Scope

Documents audited in this task:

- `ai-integration.md`
- `Record-engagement-plan-v1.md`
- `multi-tenancy-alignment.md`
- `adaptive-uiux-alignment.md`
- All five files under `Refrences/`

Record-capture-v1.md content was reviewed in the previous session. This report re-verifies two specific claims from that review. It does not reproduce the full review.

## Step 1 — Reverse-VAT Derivation in the Canonical Engine: FAIL

### Finding

Record-capture-v1.md section 3.3 claims the plain-language flow derives the net/VAT split from a gross total, and the mapping must do so "using the authoritative calculation layer (`src/lib/Calculations.ts`)".

No such function exists. The claim is inaccurate as written. It implies reuse of an existing capability that has not been shown to exist.

### Evidence

`src/lib/Calculations.ts` (769 lines) exports exactly three functions:

- `calculateDocument(input)` — line 141. Forward direction only.
- `normalizeDocumentInput(raw)` — line 601.
- `computeDocument(raw)` — line 767.

The forward direction is: net line price and rate in, per-row VAT out (`lineVatBase.times(effectiveVatRate).dividedBy(100)`, line 388). The file contains no function that accepts a VAT-inclusive gross amount and returns the net amount and VAT amount. No helper, internal or exported, performs the reverse split. The file comment (lines 11-29) states the business rules; none covers gross-to-net derivation.

A whole-file read confirms the export list. A codebase-wide search for `vatInclusive`, `grossToNet`, `splitVat`, `reverseVat`, `deriveVat`, and `vatFromGross` returned no match in `src/`.

### Consequence

Section 3.3's reuse claim requires new engine work, not reuse. If the PRD is revised later, this must be stated explicitly: the authoritative layer must be extended with a reverse (gross-to-net/VAT) function, or the PRD must source that derivation elsewhere.

## Step 2 — NTAA Section 22(4) Small-Business Claim: UNVERIFIED

### Finding

Record-capture-v1.md section 6, Open Decision 6, states "NTAA §22(4) exempts a small business from the monthly VAT return rule."

The file `NRS-docs/NIGERIA-TAX-ADMINISTRATION-ACT-2025.md` does not exist in this repository. The claim cannot currently be verified from any primary text present in this repository.

### Evidence

- `NRS-docs/` contains exactly: `Cable-Ngn-tax-act-2025-v2.md`, `NIGERIA-TAX-ACT-2025.json`, `NIGERIA-TAX-ACT-2025.md`, and `OBLIGATION-LOOKUP-INDEX.md`.
- A repository-wide filename search for `ntaa` and `Tax-Administration` returned no file.
- The only occurrence of the phrase "21st day of the following month" in any repository file is inside `Files-tax-monthly-v1.md` line 44, which cites NTAA §22(1) and gazette page A 278. That file is a PRD, not an Act text.
- No file in the repository contains NTAA section 22 text. No gazette page, markdown line, or subsection (4) quotation can be given.

The claim is marked UNVERIFIED, with the specific reason: source file absent.

### Lookup-Index Contradiction

`NRS-docs/OBLIGATION-LOOKUP-INDEX.md` is unchanged since the previous session. It still records (lines 52, 80) that "small business" is NOT DEFINED in the Nigeria Tax Act, 2025 and that only "small company" exists (section 202). The lookup index has not been updated to reflect any NTAA-based "small business" definition.

This PRD Open Decision 6 contradicts that index in two ways:

1. The index states the term "small business" does not occur in the NTA text and no NTAA-based classification can be established while the NTAA is absent.
2. The reconciliation report `docs/reports/invoice-quote/nrs-obligation-reconciliation-2026-09-04.md` recorded the V1.2 action: "Do not introduce a 'small business' classification without a primary NTAA source."

Open Decision 6 asserts an NTAA rule while citing no NTAA source in the repository. The same assertion appears in `Files-tax-monthly-v1.md` Open Decision 7, which predates this session's documents.

Note: `Files-tax-monthly-v1.md` section 3 line 44 states the day-21 VAT return is "Confirmed from primary text — NTAA §22(1)". This is a separate over-claim, examined in Step 4.

## Step 3 — Evidence Versus Assertion, Per Document

Classification standard: EVIDENCED means the claim cites a file, line, migration, code path, or Act section that exists and was verified. ASSERTED means the claim is stated as fact or intent with no such citation.

### 3a. ai-integration.md

| Claim | Class | Citation if evidenced | Note if asserted |
|---|---|---|---|
| The AI layer is "advisory and additive — it never computes financial values and never supplies statutory rules from model memory" (header and section 10, rules 1-2) | ASSERTED | — | Intent only. No enforcement mechanism exists: no guardrail in code, no type boundary, no review gate. `src/services/ai/` does not exist. Nothing in the application can currently violate or enforce the rule. |
| "Totals, VAT, WHT, tax payable, and rates are produced only by the authoritative calculation engine (`src/lib/Calculations.ts`, `computeDocument()`)" (section 10, rule 2) | EVIDENCED | `src/lib/Calculations.ts` exports `computeDocument` at line 767 and is the documented calculation source of truth (AGENTS.md). | The engine exists. The AI-side enforcement of the rule does not, because no AI code exists. |
| The nine use cases (sections 2.1-2.9): dashboard assistant, global search, document summaries, document generation, smart suggestions, compliance/WHT analysis, email drafts, PDF content enhancement, analytics narration | ASSERTED | — | All nine are speculative. No `src/services/ai/` directory exists. No `aiChat`, `aiChatStream`, `draftEmail`, `generateInvoiceItems`, `narrateAnalytics`, or `analyzeWhtStatus` symbol exists in `src/`. A prior audit already recorded this: `docs/Reports/ui-ux/facelift-prd-audit-reconciliation-report.md` line 162 states "No `src/services/ai/` directory". |
| Integration-point files named in section 8 exist | EVIDENCED | `DashboardOverview.tsx`, `KpiGrid.tsx`, `GlobalSearch.tsx`, `ComplianceHub.tsx`, `NewInvoice.tsx`, `NewQuotation.tsx`, `Reports.tsx`, `DocumentTopNav.tsx`, `DocumentActionButtons.tsx` all exist under `src/`. | The host surfaces exist. No AI feature is wired into any of them. |
| Gateway evaluation: free-llm-gateway chosen over LLM-Hub (section 0) | ASSERTED | — | No inspection record. No commit hash, audit date, or backing report exists for either third-party project anywhere in the repository. |
| Provider rate limits and estimated usage (section 5) | ASSERTED | — | No source. Values such as "Groq 30 RPM" are stated without citation. |
| "NTAA 2025 is absent from NRS-docs/; the WHT remittance deadline and rate table are not sourced" (section 10, rule 4) | EVIDENCED | Directory listing of `NRS-docs/`; consistent with `OBLIGATION-LOOKUP-INDEX.md` notes 4-6. | Stated correctly. |
| Guardrail rules "bind every AI feature" (section 10) | ASSERTED | — | Declared binding, but no mechanism (code, gate, or boundary) enforces them. They are specification text only. |

### 3b. Record-engagement-plan-v1.md

| Claim | Class | Citation if evidenced | Note if asserted |
|---|---|---|---|
| Status: "planning artifact. It does not implement anything" (section 1) | EVIDENCED | Self-declared Draft status; consistent with no engagement code existing in `src/`. | Honest classification. |
| Product principle preserved from Openai-ux-contribution.md section 21 and bigdrops-tax-ux-vision-v1.md section 2 (section 3) | EVIDENCED | Openai-ux-contribution.md line 769: "21. RECOMMENDED PRODUCT PRINCIPLE". bigdrops-tax-ux-vision-v1.md line 28: "## 2. The product principle". | Source sections exist and match the cited subject. |
| Activity taxonomy "capture surface today": `payments` table linked to invoice; money-out does not exist; `tax_input_entries` and `wht_receipts` consumed by Compliance Hub panels (section 6) | EVIDENCED | Migration `20260520090003_invoices.sql`; `paymentService.ts` passes `invoice_id` at lines 62, 87, 181, 362; `VatInputsPanel.tsx` and Compliance Hub exist. Consistent with the record-capture and files-tax audit reports. | Cross-checked in code during this audit. |
| Three evidence classes: Confirmed / Strongly indicated / Suggested (section 7) | ASSERTED | — | Conceptual definitions of new behavior. No existing trigger, data source, or code hook implements them. |
| Intervention levels L0-L3 target existing surfaces (dashboard, KPI registry, notification center, banners) | EVIDENCED | `src/config/kpiCards.ts`, `src/components/notifications/NotificationBell.tsx` + `NotificationDrawer.tsx` + `NotificationItem.tsx`, `src/hooks/useNotifications.ts` all exist. | Substrate confirmed. |
| Intervention lifecycle mechanics: prompt, snooze, defer, re-prompt, escalate, persist, enforce (sections 8-9) | ASSERTED | — | New behavior. Nothing in `src/` implements these semantics. No table, state model, or scheduler exists. |
| L4 gate "already in v1.1": send/transmit-time compliance validation | EVIDENCED | Technical-plan-v1.1.md carries forward v1.0 section 6.6 unchanged (v1.1 section 0.3). v1.0 section 6.6 disables "Send to NRS" until every required field is filled. | The literal text lives in v1.0 and is carried forward by v1.1's carry-forward rule, not restated in v1.1. "In v1.1" is a mild simplification. |
| Narrow enforcement-gate policy: three justified gates, four never-gated actions (sections 9, 12) | ASSERTED | — | Defined precisely enough to be buildable as a policy spec (named gates, named exclusions, explicit rejection of "record everything"). But most gates reference unbuilt features: Files.tax SUPPORTED state and the record-capture surface do not exist yet. Only the send gate anchor exists. |
| Prioritization: eight ranking factors plus decision table (section 13) | ASSERTED | — | The decision table is precise (High = Confirmed AND material OR tax-impacting to L2/L3). Weighting is explicitly qualitative with no arbitrary weights; weighted scoring is deferred. Directional but deliberately bounded. |
| Record completeness is a product metric, "never a financial-health score" (section 14) | ASSERTED | — | Defined precisely: countable confirmed events, strong signals excluded from counts, suggestions excluded, never presented as a percentage of truth. Buildable once capture and evidence data exist. The prohibition is unambiguous. |
| MVP infrastructure: notification center, push channel, KPI registry exist; push has a wiring gap (section 18, 20) | EVIDENCED | `sendPushForNotification.ts` line 43 invokes edge function `send-push`; `supabase/functions/` contains only `dispatch-push-notifications` and `postgrest-schema-exposure`. Same finding as Files-tax audit open decision 5. | Wiring gap confirmed in code during this audit. |
| Dependency table: Record-capture is "Exists (PRD). Not yet implemented."; email and scheduling "do not exist" (section 20) | EVIDENCED | Consistent with record-capture and files-tax audit reports. | Honest statuses. |

### 3c. Alignment Documents

#### multi-tenancy-alignment.md

| Claim | Class | Citation if evidenced | Note if asserted |
|---|---|---|---|
| Authority document `docs/prd/multi-tenancy/multi-tenancy-prd-v2.1.md` | EVIDENCED | File exists at that path. | |
| Supporting document `docs/prd/multi-tenancy/erp-frontend-prd-v1.5.md` | EVIDENCED | File exists at that path. | |
| Tenancy constraints sourced to v2.1 sections 2, 3.1, 3.3, 8A | EVIDENCED | Section citations given against an existing document. | |
| Record-capture "extends `tax_input_entries`, an entity-scoped table" (section 3) | ASSERTED | — | Mis-stated. Migration `20260520090009_tax.sql` scopes the table by `settings_id integer NOT NULL`. Record-capture-v1.md section 3.2 itself says "Tenant | settings_id | Same scoping as `tax_input_entries` today." Multi-tenancy reports list `tax_input_entries` as a public-schema read that must be tenant-scoped (e.g. `docs/reports/multi-tenancy/final-reconciliation-blueprint.md` line 338). |
| Per-document "Aligned" verdicts | ASSERTED | — | No visible comparison for most rows. The document records constraint tables and verdicts but not the comparison steps. The ai-integration row is honest: "Aligned — verify at implementation". |
| No conflict found | ASSERTED | — | No actual conflict is recorded anywhere in the document. Whether a comparison was performed cannot be determined from the text. |

#### adaptive-uiux-alignment.md

| Claim | Class | Citation if evidenced | Note if asserted |
|---|---|---|---|
| Authority document `docs/prd/Adaptive Mobile-First UIUX Facelift PRD/00-index.md` with chapters 01-22 | EVIDENCED | Directory listing confirms `00-index.md` and chapter files 01 through 22 exist, including `05-navigation-shell.md`, `13-ai-integration.md`, and `21-surfaces-and-overlays.md`. | |
| UIUX constraints sourced to Facelift chapters (03-06, 05, 21, 12, 11) | EVIDENCED | Cited chapter files exist. | |
| Per-document "Aligned" verdicts, e.g. ai-integration "Assistant bottom sheet, top-bar search, and inline suggestions match the Facelift interaction patterns" | ASSERTED | — | No visible comparison. The ai-integration features cited do not exist in code, so an alignment verdict about them is about specification text, not implementation. |
| No conflict found | ASSERTED | — | Same as multi-tenancy-alignment.md: no comparison steps are shown. |

### 3d. Refrences/ Folder

| Claim | Class | Citation if evidenced | Note if asserted |
|---|---|---|---|
| Each of the five reference files is labeled "REFERENCE ONLY — NOT STATUTORY AUTHORITY" | EVIDENCED for four files; ASSERTED for the fifth | Banner found in openaccountants, tax-foundation, taxbridge, and tekvwarho files. | `luca-v05-accounting-architecture-reference.md` has no such banner. A whole-file search found zero occurrences of the label. It carries equivalent prose: "reference material only. It is not a specification" and a Status line "Luca is a reference architecture only." The Readme.md claim that each document is labeled so is slightly overstated for luca-v05. |
| TaxBridge claim: "a wrong ₦100M/20%-band model" | EVIDENCED | `docs/reports/GENERAL/taxbridge-nigeria-cit-architecture-audit-2026-09-05.md` documents a read-only source inspection of a shallow clone. It cites `packages/contracts/src/cit.ts` with threshold `100_000_000`, three coexisting implementations, the 20% band in two of them, and a step-by-step calculation trace (report sections 1, 3, 4, 7). | The claim is checked against the actual TaxBridge project through the recorded audit. The audit report, not the reference file, is the evidence layer. |
| Luca architecture patterns: double-entry journal, periods, Decimal.js, hash chain | EVIDENCED | Backing report `luca-vs-bigdrops-accounting-architecture-audit-2026-09-05.md` exists. | |
| OpenAccountants / OpenFisca patterns with inspected commits | EVIDENCED | Reference lists inspected commits (`91c376e`, `0e4be15`); backing report `openaccountants-openfisca-tax-architecture-audit-2026-09-05.md` exists. | |
| Tax Foundation / PSLmodels / Balaka / OpenBooks / Beancount patterns | EVIDENCED | Reference lists inspected commits; backing report `tax-foundation-pslmodels-balaka-openbooks-beancount-audit-2026-09-05.md` exists. | |
| TekVwarho values "must NOT be used": ₦25M/20% bands, 3% TET | EVIDENCED | Backing report `tekvwarho-proaudit-nigeria-tax-architecture-audit-2026-09-05.md` exists. | |
| Canonical Nigerian statutory values (₦50M / ₦250M / professional-services exclusion, sections 56, 59, 57, 202) | EVIDENCED | Match `NRS-docs/NIGERIA-TAX-ACT-2025.md` and the VERIFIED rows of `OBLIGATION-LOOKUP-INDEX.md`. | |
| Unresolved values flagged as unresolved (VAT registration threshold, WHT rates, filing deadlines) | EVIDENCED | Statuses match the lookup index: WHT table and deadlines remain NOT IN NRS-DOCS; NTAA absent. | The files do not silently assert these values. They mark them unverified, which is correct behavior. |

## Step 4 — Contradiction Check Against Already-Verified Findings

Baseline established facts (from `nrs-obligation-reconciliation-2026-09-04.md`, `OBLIGATION-LOOKUP-INDEX.md`, and the files-tax and cit-readiness audits):

- The NTAA 2025 text is absent from the repository. NTAA-dependent values stay open.
- "Small business" is not defined in the Nigeria Tax Act, 2025. Only "small company" exists (section 202, ₦50M).
- The WHT rate table and the WHT remittance day are NOT IN NRS-DOCS and unresolved.
- The VAT return due day is delegated to the NTAA 2025; the 21st appears nowhere in the NTA text.
- Section 155(4) VAT remittance at day 14 is verified for withholding agents only.
- `Technical-plan.md` section 8.3's ₦100M figure is a recorded PRD-side mismatch.

| Newer document claim | Baseline finding | Verdict |
|---|---|---|
| Record-capture OD6 / Files-tax OD7: "NTAA §22(4) exempts a small business from the monthly VAT return rule" | Lookup index: "small business" NOT DEFINED; reconciliation: do not introduce the classification without primary NTAA text | CONTRADICTED / UNVERIFIED. Both PRDs phrase this as an open decision, which softens the conflict, but they assert an NTAA rule with no NTAA source in the repository. |
| Files-tax section 3: VAT return deadline day 21 "Confirmed from primary text — NTAA §22(1), gazette A 278" | Lookup index still lists the VAT return day as NOT IN NRS-DOCS; reconciliation marks it unresolved pending NTAA | STATUS CONFLICT. The word "Confirmed" implies resolution the repository index still records as open. The corroborating NTAA conversion is external and uncommitted, per the files-tax audit report itself. The value 21 itself matches the Technical-plan default; no numeric contradiction exists. |
| No WHT rate, deadline, or threshold numeric contradiction found in the newer documents | Lookup index VERIFIED rows | PASS. The reference files consistently cite ₦50M and reject ₦100M and ₦25M/20% bands, matching the recorded mismatch findings. ai-integration and engagement plan correctly state the WHT items stay unresolved. |
| ai-integration rule 4 and engagement plan sections 17, 20: statutory deadlines governed by NRS-docs; no new values invented | Lookup index | PASS. Consistent. |

## Step 5 — Nothing Resolved

This task produced a classification only. No audited document was edited, including Record-capture-v1.md. `Refrences/` was not restructured. No decision was made on whether ai-integration.md or Record-engagement-plan-v1.md should be kept, revised, or removed.

## Verification

- `bun run audit:load`: passed (exit 0). Existing warnings present: 25 oversized files, 6 broad selects, 1 component fetch, 3 heavy limits. No new warning was introduced.
- `bun run typecheck`: not run. The project lead instructed: do not run typecheck for this task.
- `bun run build`: not run, per project hardware policy (AGENTS.md).
- `git status`: unchanged from the baseline captured above. All pre-existing staged changes remain intact. This task created only this report file.

## Counts

Total substantive claims classified across the audited documents: 37.

- EVIDENCED: 22
- ASSERTED: 15

Breakdown per document:

| Document | EVIDENCED | ASSERTED | Total |
|---|---|---|---|
| ai-integration.md | 3 | 5 | 8 |
| Record-engagement-plan-v1.md | 7 | 5 | 12 |
| multi-tenancy-alignment.md | 3 | 2 | 5 |
| adaptive-uiux-alignment.md | 2 | 2 | 4 |
| Refrences/ (five files) | 7 | 1 | 8 |

## UNVERIFIED and CONTRADICTED Items

One-line list:

1. UNVERIFIED — NTAA §22(4) small-business exemption (Record-capture OD6 / Files-tax OD7): the NTAA 2025 text is absent from the repository, so no section 22 text can be quoted.
2. CONTRADICTED — Record-capture §3.3 claims net/VAT reverse derivation "using `src/lib/Calculations.ts`": no gross-to-net/VAT function exists in that file; this is new engine work, not reuse.
3. CONTRADICTED (status) — Files-tax §3 calls the day-21 VAT return "Confirmed from primary text" while `OBLIGATION-LOOKUP-INDEX.md` still lists it NOT IN NRS-DOCS and the NTAA conversion is uncommitted.
4. CONTRADICTED — multi-tenancy-alignment.md calls `tax_input_entries` "an entity-scoped table": the migration scopes it by `settings_id`, and Record-capture-v1.md itself describes `settings_id` scoping.
5. CONTRADICTED — the "small business" term in Record-capture OD6 / Files-tax OD7 versus the lookup index NOT DEFINED row (unchanged since the last session).
6. CONTRADICTED (minor) — Readme.md states every Refrences file "is labeled REFERENCE ONLY — NOT STATUTORY AUTHORITY"; luca-v05 carries no such label.

## Risks or Limitations

- The NTAA 2025 text is absent. Every NTAA-dependent claim in this report is classified UNVERIFIED by design.
- Evidence for the third-party reference audits rests on recorded inspection reports of external shallow clones. Those reports exist in this repository; the external repositories do not.
- `bun run typecheck` was not run. Type safety of the working tree was not re-verified for this documentation-only task.

## Deferred Work

- Commit the NTAA 2025 conversion to `NRS-docs/` so NTAA §22 citations resolve inside the repository.
- If Record-capture-v1.md is revised, correct section 3.3 to state that a reverse gross-to-net/VAT derivation is new engine work in `src/lib/Calculations.ts`.
- Reconcile the lookup index, Files-tax-monthly-v1.md section 3, and the two NTAA open decisions when the NTAA text lands.
- Correct the multi-tenancy-alignment.md description of `tax_input_entries` scoping, or record the scoping change if the staged entity-lifecycle migration alters it.
- Add the standard banner to luca-v05-accounting-architecture-reference.md, or amend the Readme.md claim about labels.

## Skills Used

NONE

## Documentation Standard

ASD-STE100 Simplified Technical English
