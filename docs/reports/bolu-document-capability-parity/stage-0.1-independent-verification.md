# Stage 0.1 — Independent Verification Audit (Read-Only)

**Date:** 2026-11-18 · **Type:** Independent read-only verification · **Authorization:** audit-and-report only. No implementation changes authorized or made.

**Overall verdict: FAIL** — three of six criteria verified (2, 4, 6), one partially verified with a real channel gap (3), two fail: Criterion 1 (E3 retains an explicit `item_id` that is unsafe under the actual schema/RPC contract) and Criterion 5 (harness does not model the PostgreSQL uuid/FK/NOT NULL constraints, which is why the E3 defect is invisible to the suite). Stage 0 remains Partially completed. Scratch-tenant verification should NOT be relied on until the E3 defect is closed (see §Blocking findings; a scratch-tenant diff is the right check after that fix, but not before — it will abort modification writes today, loudly, not corrupt silently).

No source, test, migration, documentation or Git state was modified by this audit. The only attributable artifact is this report.

---

## 1. Explicit identity uniqueness and zero-candidate behavior — **FAIL**

### 1A. Unique explicit identity — PASS (with scope limit)
- `src/lib/ai-assistant/bolu-document-service.ts` (`matchBoluItems`, Pass 1): an explicit `item_id` matches the *single* unmatched candidate carrying it (`String(c?.item_id).trim() === wanted`), selecting that row regardless of payload order or description. Harness test E1 (`bolu-modify-integrity.test.js:1260ish`) confirms the CAT-B row is matched and retains its image/partNo/lineage/quantity.
- Limits: matching is by trimmed string equality only; `item_id` is never validated as UUID or checked against the catalog here.

### 1B. Duplicated explicit identity — PASS
- Pass 1 collects *all* unmatched candidates equal to `wanted`; when `candidates.length !== 1` the row is abstained, nothing is matched and a warning (`"could not be uniquely resolved (N candidates)"`) is recorded. `used` is not updated; the abstained row never reaches Pass 2 (`abstain` set, matcher line ~350). No candidate's metadata is transferred. Test E2 verifies two rows both carrying `CAT-X` produce a fresh row with no image/lineage/partNo. Correct.

### 1C. Zero-candidate explicit identity (E3) — **FAIL**
Actual chain, end to end:
- Validator (`bolu-operations.ts`): `optionalString` accepts any trimmed non-empty string; `item_id` is never validated for UUID format or catalog existence.
- `mergeBoluItem` (~L415): fresh-row path, `base.item_id = pick(item.item_id, current?.item_id) ?? null` → retains the incoming value.
- `serializeBoluItem` (~L400s): passes `item_id` to `toDbItem`, which forwards it unvalidated (`src/domain/invoice/factories.ts` : `item_id: item.item_id ?? null`).
- Tenant RPC insert (installer migration, invoice item INSERT ~L225; quotation ~L2286): `NULLIF(v_item->>'item_id', '')::uuid`.
- Schema: `invoice_items.item_id uuid` and `quotation_items.item_id uuid`, both under `FOREIGN KEY … REFERENCES item_catalog(id)` (base migration `20260520090003_invoices.sql:89`, `20260520090002_quotations.sql:90`).

Consequences under the real contract:
1. Non-UUID value (e.g. the seeded `'CAT-UNKNOWN'`): `NULLIF(…)::uuid` → PostgreSQL `invalid input syntax for type uuid` → **the entire composite RPC aborts** → the user's requested modification is not saved. Not corruption, but a hard failure whose test result (success, warnings present) could never occur in production.
2. Valid-UUID value referencing a non-existent catalog row: FK violation → same abort.
3. Valid-UUID value referencing an existing but unrelated catalog item: **inserts successfully with a wrong catalog link** — silently. Nothing warns; the fresh row's `item_id` is the only provenance-ish fact retained, and it points to the wrong item.

This does **not** forge `source_*` lineage or row identity: all `source_*`, `image_url`, `custom_data`, `group_id/name`, `install_rate_override`, `formula`, `show_install_rate`, VAT/discount/install rates are all nulled on fresh rows (`mergeBoluItem`, `current = null`). So the defect is "potentially failing save or silently mis-linking the catalog", not "manufacturing provenance".

**Cannot ship as-is.** At minimum: reject non-UUID `item_id` in validation, and do not persist an explicit `item_id` on an unverifiable fresh row (or resolve/verify it, or warn). That is a remediation decision; this audit implements nothing.

**Evidence the harness hides it:** harness `NUL()` (`bolu-modify-integrity.test.js:NUL`) performs only empty-string→null normalization; it never casts to uuid, never checks `item_catalog`, so E3 passes with an impossible input. See Criterion 5.

---

## 2. Ambiguous candidate consumption and cross-row reuse — **PASS**

Traced mechanically:
- **Pass 1 abstention consumes nothing:** the ambiguous row is added to `abstain`; the ambiguous candidates are not added to `used`; nothing is transferred.
- **Pass 2 ties abstain too:** for any incoming row, all unmatched candidates ≥ floor are ranked; a tie at the top ⇒ `top.length > 1` ⇒ abstain + warning, no consumption. The absence of positional tie-breaking (removed vs Stage 0 baseline) eliminates order dependence for ties; `payload = [salt, salt]` yields both rows fresh regardless of order.
- **Reuse by later rows is possible only through unique matches:** candidate `R` left unmatched by row *i*'s ambiguity remains available for row *j (> i)* — but *j* matches `R` only if `R` alone reaches the top qualifying score ≥ 10 (unique), or via Pass 1 unique identity. That reuse transfers `R`'s metadata to a row whose identity equals `R` with conclusive-match evidence; it is the designed behavior, not contamination. In the canonical reorder-duplicates payload, both rows iterate independently over the same two candidates, tie again, and both abstain (A-sequence verified in tests A/D).
- **Explicit identity can never consume an ambiguously-involved candidate silently:** Pass 1 runs before Pass 2 and requires exact uniqueness, so a candidate in an ambiguous *similarity* state is still uniquely selectable *only if* the incoming row supplies a unique matching `item_id` — that is a valid unique-evidence match.
- **Order dependence:** none observed for contamation purposes; only for consumption timing (earlier unique rows consume first, which is correct). Residual: an abstaining row can occupy a position such that a later row re-shapes the candidate pool, but all surviving matches are still unique.

No defect. Noted nuance: Pass 1 completes before Pass 2 — an explicit match is authoritative for its row, so a later similarity scan sees the reduced pool. Working as designed.

---

## 3. End-to-end warning propagation — **PARTIALLY VERIFIED**

Machine-level tracing (all in `persistDocumentModification`, shared by `persistInvoiceModification`/`persistQuotationModification`):

| Return branch | warnings attached | notes |
|---|---|---|
| success | yes (`~L1255-1261`, spread) | attach whenever produced |
| RPC error (`~L1205`) | yes | carries merge warnings |
| items replace error → restore path (`~L1219-1225`) | yes | carries merge warnings |
| `updateError` (`~L1231`) | yes | carries merge warnings |
| `itemsFetchError` (`~L1147-1150`) | **no** | at that point `matchBoluItems` has not run; `warnings` provably empty. Inconsistent spread, zero behavioral impact. |
| `catch` (`~L1259-1264`) | yes | includes any match-stage warnings |
| early validation/gate/stale/target-not-found (`~L1061-1089`) | spread present or provably-empty | none produce warnings |
| items-recreated-fresh (no floor) & ties | yes | dedicated `matchWarnings` (`~L1153-1156`, `[..., ...matchWarnings]`) |

Every abstention and every floor miss emits a concrete `Item N:`-indexed warning. No warnings on all-clean matches (test E1 asserts `result.warnings === undefined`). Callers in scope do not drop warnings: `useBoluThread.confirmGate2Save` (`src/lib/ai-assistant/hooks/useBoluThread.ts:594-672`) reads only `documentNumber`/`documentId`/`error` and constructs messages itself — **it never reads `result.warnings`**.

**Consequence:** warnings are a machine channel on the internal result object. They are returned to any embedding caller that chooses to observe them, but in the shipped Bolu flow they are **not surfaced to the user** — the Gate-2 success toast/thread message cannot mention that a line was recreated or that persisted lineage was lost. This is a real gap, though the mandate correctly scopes UI work out; by the mandate's own rule, an internal `warnings` field must not be described as user-visible protection. Logged as non-blocking but material.

---

## 4. Complete metadata and unknown custom_data protection — **PASS**

Fresh-row (abstain/below-floor/zero-candidate) construction: `mergeBoluItem` starts from `{}`; every identity/provenance/financial field takes an incoming-explicit or neutral default:

- `source_cps_id`, `source_cps_row_id`, `source_quotation_id`, `source_quotation_item_id` → `null`.
- `item_id` → incoming value or `null` (see §1C; only incoming-explicit values ride, subject to §1C risk).
- `image_url` → `null`; `custom_data` → only `partNo`/`condition` keys present in the incoming item under explicit override; arbitrary unknown keys of the unmatched persisted row are **not** inherited (verified in merge `~L438`: `parseCustomData(current?.custom_data)` only when `current` exists).
- `install_rate_override` → false unless incoming explicitly sets `install_rate`; `formula`/`show_install_rate` → defaults; `group_id/group_name` → from incoming or null; VAT/discount/install rates → from incoming or null; `install_rate_taxable`, etc.
- `row_type`: persisted `group_header` survives (`standard` forced by validator cannot downgrade) — retained by design.

**Provenance retained vs preserved:** abstention discards provenance deliberately (never claims preservation), matching the `// persisted identity … treated as new` warnings. Nothing from an unmatched persisted row is revived. The only residual provenance hole is §1C's explicit `item_id`.

---

## 5. Test suite and PostgreSQL fidelity audit — **FAIL**

**Tests exercise production paths end-to-end** (via `persistInvoiceModification`/`persistQuotationModification` from `bolu-document-service.ts`): matcher, merger, RPC emulation, restore, gates — all inline, no mocked matcher. A–F are real behavioral tests with before/after store diffs.

**Custom_data jsonb cast is faithful now:** `parseItemsCustomData` validates all `p_items` custom_data *before any store mutation* and returns a cast-like error (`invalid input syntax for type json`), so the RPC aborts with nothing written; F1 asserts error + untouched store, F2 asserts valid JSON persists. Good.

**But the harness does not model PostgreSQL uuid/FK/NOT NULL behavior**, and this materially changes conclusions:
mapping vs `invoice_items` insert (`~L225`) / `quotation_items` (~L2286):

| column | SQL behavior | harness behavior | verdict |
|---|---|---|---|
| `item_id` | `NULLIF(v->>'item_id','')::uuid` cast + FK → catalog | `NUL()` passes string through, no validation | **divergent — E3 invisible** |
| `source_*` (×4) | `NULLIF(…,'')::uuid` cast | `NUL()`, no validation | divergent |
| `row_type` | NOT NULL constraint → violation aborts RPC | `v.row_type ?? 'standard'`, no constraint | divergent (unreachable via serializer) |
| quotation `custom_fields` | `COALESCE(NULLIF(p->>'custom_fields',''),'{}')::jsonb` (empty string → `{}`; malformed string → error) | `p.custom_fields === undefined/'' ? {} : p.custom_fields`, stores raw string, no cast check | divergent |
| NOT NULL `quantity`/`unit_price` (if any) | aborts | none | divergent (unreachable) |
| `install_rate_override`/`formula`/`install_rate_taxable`/`show_install_rate` | `(…)::boolean` casts | values pass through | OK |
| invoice `custom_fields` (text) | text pass-through, no cast | pass-through | OK |
| RPC permission gate `has_entity_permission(p_sid, auth.uid(), family, 'edit')` | enforced in both update branches | not emulated; service pre-checks separately | divergent (untested twice) |
| Fallback restore `.update()` | PostgREST partial UPDATE only provided keys | partial keys | OK |
| Transactional rollback on cast failure | implicit PL/pgSQL tx | nothing mutated since validation precedes mutation | faithful (for the validated item path only) |

**Net:** the harness can still pass while the real RPC aborts (see E3). The suite is a strong functional check for the preservation logic, a weak check for PG type/constraint behavior, and asserts nothing about `has_entity_permission`.

**Command results (executed in this audit):**
- `bun test src/tests/ai-assistant/bolu-modify-integrity.test.js` → **exit 0** → `25 pass / 0 fail / Ran 25 tests`.
- `bun run typecheck` → **exit 0** → `tsc --noEmit` clean.

---

## 6. Git diff and attribution boundary audit — **PASS**

`git status --porcelain=v1` at delivery:
```
 M .workbuddy-ai/memory/2026-11-18.md            (pre-existing, untouched)
 M src/lib/ai-assistant/bolu-document-service.ts (Stage 0 + 0.1)
 M src/lib/ai-assistant/bolu-operations.ts       (Stage 0 tri-state only; no 0.1 change)
?? docs/reports/bolu-document-capability-parity/  (pre-existing prior audits + this report)
?? docs/reports/bolu-modification-integrity/      (Stage 0 report)
?? docs/reports/bolu-persistence-integrity/*      (pre-existing, untouched)
?? src/tests/ai-assistant/bolu-modify-integrity.test.js   (Stage 0.1 test suite)
```
Attribution separation is clear from the diffs: creation paths (`persistInvoiceCreation`/`persistQuotationCreation`) byte-unchanged modulo the serializer-compatible merge; Gate 1/Gate 2 state transitions unchanged; `calculateDocument` and all financial formulas unchanged; no Advance Invoice fields read/written/re-derived; no SQL/migration changes; no UI changes. Stage 0 changes = tri-state validator + preservation snapshot/merge/hydration; Stage 0.1 changes = explicit-identity/floor/abstention logic + warnings + adversarial tests + harness strict cast. Scratch files (`.baseline-check`) are not present. No staged entries. HEAD unchanged at `295f98e4`.

---

## E. Findings register

### Blocking
- **B-1 (Criterion 1C / 5):** Explicit `item_id` on an unmatched (fresh) row is retained unverified into the composite RPC `NULLIF(…)::uuid` + FK `REFERENCES item_catalog(id)` — non-UUID inputs abort the write entirely; arbitrary valid UUIDs either FK-abort or silently link the wrong catalog item. Invisible to the harness (NUL() does no uuid/FK checking).
- **B-2 (Criterion 5):** Harness omits uuid casts, FK existence, NOT NULL enforcement and the RPC permission gate; conclusions drawn from test passes must not be extrapolated to hosted RPCs.

### Non-blocking
observations
- **N-1:** Warnings are machine-only; `useBoluThread.confirmGate2Save` never reads them — the user is never told a line was recreated or that lineage was lost (UI out of authorized scope).
- **N-2:** `itemsFetchError` return omits the warnings spread (warnings provably empty there; spread inconsistency only).
- **N-3 (criterion 1A):** `item_id` string match is trimmed equality; no cross-case/normalization. Adequate; documented.
- **N-4 (criterion 2):** Pass 1 completes before Pass 2 — a correct but intentional order; documented for reviewers.
- **N-5:** `itemsFetchError` also lacks the spread while every other error path carries it — cosmetic inconsistency.
- **N-6:** Group header preservation relies on validator forcing `row_type='standard'`; a model-emitted `group_header` cannot be authored. (Stage 0 property, unchanged.)
- **N-7:** Quotation `custom_fields` cast divergence noted in §5.

---

## F. Direct answers to the mandated questions

1. **Is E3 retaining an explicit `item_id` safe under the schema and RPC contract?** No. It is a catalog reference (`uuid`, FK to `item_catalog(id)`), not a row-id and not lineage; the RPC casts `NULLIF(v->>'item_id','')::uuid` and enforces the FK. Retention either aborts the modification (non-UUID/FK miss) or wrongly links an existing catalog row. It never fabricates `source_*` lineage.
2. **Can an ambiguous candidate be reused by a later incoming row?** Only via a unique match (unique explicit identity, or unique unmatched row at floor). Never by position; both ties abstain.
3. **Can warnings be lost before the final result?** No — every post-merge return branch spreads them; the pre-match `itemsFetchError` branch is the sole exception and is provably empty there. They *are* lost before reaching the user (see N-1).
4. **Does the implementation preserve provenance, or merely prevent incorrect provenance transfer?** Merely prevent incorrect transfer. Abstention/fresh recreation discards the persisted row's provenance wholesale (by design, and flagged as loss in warnings); nothing unrelated is preserved except as documented (e.g. `group_header` status).
5. **Does the harness accurately represent the relevant PostgreSQL cast and rollback behavior?** Only for the `custom_data` jsonb item cast (now faithful: validation-before-mutation, error, untouched store). It does not model uuid casts, FK existence, NOT NULL constraints, or `has_entity_permission`; quotation `custom_fields` cast is divergent. PG permission-gate and rollback semantics are asserted by reading the installer source only.

---

## G. Checks performed / unavailable / risks

**Performed:** full Stage 0/0.1 diff inspection; SQL (installer + base migrations) side-by-side with serializer/payload/harness; matcher/merger/warnings path tracing; targeted grep for creation/gate/calculation/Advance-invoice references; executed the two mandated commands (both exit 0, outputs above); baseline-failure re-verification against pristine HEAD (established earlier; re-checked via `.baseline-check` then removed — not present in working tree).

**Not performed / unavailable:** PostgreSQL execution (no Docker/psql/hosted access); browser/UI verification; hosted tenant diff; real composite-RPC execution; FK enforcement on live catalog; `has_entity_permission('edit')` on live tenant. No viewport claims.

**Cannot rule out:** hosted RPC drift (installer migration may not be applied on production tenants); tenant-local function overrides; catalog grants differences.

**Recommended next authorized action:** (1) remediate B-1/B-2 (guard explicit `item_id`: UUID validation + reject or resolve-verify before persistence, or drop unverified `item_id` on fresh rows — with a warning; add uuid/FK/NOT NULL/gate fidelity to the harness), (2) re-run the suite + typecheck, (3) only then scratch-tenant before/after diff of a populated document, (4) keep Stage 0 at Partially completed until that evidence exists. This audit authorizes none of those steps itself.
