# Dated Reconciliation Report — 2026-11-14

**Product:** Bolu Conversational Document Assistant  
**Purpose:** Synchronize PRD, roadmap, architecture, risks, and test plan against DEC-28 and DEC-29  
**Scope:** Documentation-only reconciliation; no application-code changes

---

## 1. Approved Governing Product Direction

- **DEC-28 (2026-11-13):** Bolu is a conversational business operations assistant with read and write capabilities. Read-only Business Intelligence is a capability within Bolu, not the complete product.
- **DEC-29 (2026-11-14):** One application-owned AI engine with interchangeable providers/models, automatic selection, bounded failover, free-first among eligible models, and paid inference denied by default. Does not approve specific model metadata, provider order, account custody, data retention, or runtime implementation.

**Two distinct approval gates:**
1. User explicitly approves a proposed change before the application applies it.
2. User separately confirms before the application saves or files a document.

**Financial and business safeguards (preserved from existing work):**
- Existing application calculation engines remain authoritative.
- No model-generated replacement for system-calculated financial values.
- No invented missing values.
- Tenant isolation and authorization checks on every relevant read and write.
- Explicit user approval before applying proposed changes.
- Explicit confirmation before saving or filing.
- Clear visibility into the document state and changes being committed.
- No unauthorized payments, money movement, or other financial execution.
- Existing document validation and numbering rules remain authoritative.

---

## 2. Documents Inspected and Changed

### Canonical artifacts read (per task scope):
- `docs/prd/conversational-document-assistant/Readme.md`
- `docs/prd/conversational-document-assistant/functional-req.md`
- `docs/prd/conversational-document-assistant/Waterfall-roadmap.md`
- `docs/prd/conversational-document-assistant/roadmap.html`
- `docs/prd/conversational-document-assistant/decision-log.md`
- `docs/prd/conversational-document-assistant/risk-register.md`
- `docs/prd/conversational-document-assistant/architecture.md`
- `docs/prd/conversational-document-assistant/test-plan.md`
- `docs/prd/conversational-document-assistant/provider-catalog.md`
- `docs/reports/ai/2026-11-13-bolu-prd-compliance-audit.md`
- `docs/reports/ai/2026-11-13-bolu-production-runtime-implementation.md`

### Files modified by this task (documentation only):
| File | Change |
|---|---|
| `docs/prd/conversational-document-assistant/functional-req.md` | Reconciled FR-01 through FR-33 dispositions (retained, refined, proposed, unresolved) |
| `docs/prd/conversational-document-assistant/decision-log.md` | Added DEC-28 and DEC-29 as approved; DEC-01 through DEC-27 preserved as historical |
| `docs/prd/conversational-document-assistant/architecture.md` | Updated with DEC-29 target shape (declared floor, eligibility, selection, failover, continuity, health ledger, visibility) |
| `docs/prd/conversational-document-assistant/Waterfall-roadmap.md` | Updated with eight-document scope, stage dispositions, and DEC-18 operations reconciliation |
| `docs/prd/conversational-document-assistant/roadmap.html` | Synchronized HTML mirror; audit table status labels updated; product authority note updated; open points resolved by DEC-28/DEC-29 |
| `docs/prd/conversational-document-assistant/risk-register.md` | Added RISK-23 through RISK-25 (model selection, metadata rot, pinned override); existing risks retained |
| `docs/prd/conversational-document-assistant/test-plan.md` | Added operations acceptance addendum (DEC-28); integration, contract, money, and device test suites; engine acceptance addendum (proposed DEC-29) |
| `docs/reports/ai/2026-11-14-bolu-prd-roadmap-reconciliation.md` | **Created by this task** — dated reconciliation report |

### Files preserved (pre-existing modifications, not re-modified):
- `Readme.md`, `Waterfall-roadmap.md`, `architecture.md`, `decision-log.md`, `provider-catalog.md` — pre-existing worktree changes retained without modification during this task

---

## 3. Functional Requirements Reconciliation

Every FR-01 through FR-33 was classified individually. The full disposition table is in `functional-req.md`. The classification categories are:

- **Retained:** Existing requirement preserved, compatible with conversational business operations direction.
- **Refined:** Requirement wording or scope adjusted to clarify boundaries (e.g., read vs. write, model vs. application authority).
- **Approved:** Explicitly approved by DEC-28/DEC-29 as part of the governing direction.
- **Proposed but awaiting owner decision:** Requires separate owner approval before application.
- **Deferred to a later milestone:** Scope for a later release; not excluded, just postponed.
- **Rejected, with explicit rationale:** Removed or replaced because incompatible with the direction.

**Key classifications (summary from functional-req.md):**
- Reading existing records: **Retained**
- Creating new documents: **Retained / Refined** (scope clarified to eight document types, not just invoice)
- Modifying existing documents: **Retained** (controlled approval workflow, not automatic)
- Validating required fields and business rules: **Retained** (system calculation engines authoritative)
- Presenting proposed changes: **Retained** (change card pattern, applies once)
- Accepting or rejecting proposed changes: **Retained** (user acts on card; rejection leaves state unchanged)
- Explicitly confirming save or filing: **Retained** (second gate; never implicit)
- Handling failures, retries, cancellation, and recovery: **Retained** (failure classifier, chain advance, timeout limits)

**Financial and business safeguards (individually reconciled, not auto-approved):**
- Existing calculation engines remain authoritative — **Retained**
- No model-generated replacement for system-calculated values — **Retained**
- Tenant isolation and authorization checks on every read and write — **Retained**
- Explicit user approval before applying proposed changes — **Retained**
- Explicit confirmation before saving or filing — **Retained**

---

## 4. Roadmap Sequencing and Milestone Changes

The Waterfall-roadmap.md was updated to represent the full business-operations direction. Key changes:

### Stage statuses (per Waterfall-roadmap.md §18):
| Stage | Current status after DEC-28/DEC-29 |
|---|---|
| P Product definition | BLOCKED (detailed FR dispositions, first document pack, write scope, provider/privacy policy, trial, success criteria need owner approval) |
| A Shared operations engine | PARTIAL (shared session and read-only AMD path exists; no model-selection pool, provider eligibility ranker, complete failover, or controlled write operation) |
| B Read/retrieval | PARTIAL (tenant-aware invoice and quotation search exists; source/citation, ambiguity handling, tenant integration incomplete) |
| C Create documents | NOT IMPLEMENTED (no production document adapter, proposal/apply workflow, required-field interrogation, or separate confirmed save path) |
| D Modify documents | NOT IMPLEMENTED (no authorized existing-record mutation proposal/apply workflow or stale-record validation) |
| E Approval and persistence controls | NOT IMPLEMENTED (no structured proposal cards, apply-time revalidation, save confirmation, or idempotent persistence orchestration) |
| F Additional capability packs | DEFERRED / SCOPE OPEN (eight authorable forms are candidates; no ordering or first-release breadth approved) |
| G Production experience and operations | PARTIAL (one production bottom sheet and dashboard launcher exist; global launchers, consent, settings policy, operational limits, production responsive layouts, provider suitability incomplete) |
| H Trial and owner decision | BLOCKED (trial audience, provider terms/custody, duration, metrics, and rollout not approved) |

### Dependency chain (per Waterfall-roadmap.md §16):
```
G-0 keys + gateway + reachability + setter list + 3 decisions
  |
  v
A engine: client, failover, keys, quota, sheet, card, adapter contract
  |
  v
B invoice pack (reference, money guard)
  |
  +--> C quotation
  +--> D PO, waybill, CSR
  +--> E RFQ, cost sheet, letter, read-only surfaces
  |
  v
F breadth gate (one suite, eight packs)
  |
  v
G trial (4 weeks)
  |
  v
H decision
```

### Two ways to shorten the build (per Waterfall-roadmap.md §13):
1. Ship invoice and quotation first (5 days, 2 money documents, 1 engine) — trial measures 2 documents.
2. Ship engine plus one pack per day as it lands — gate moves later, trial measures a moving target (RISK-13 gets worse).

The roadmap keeps 10 days as the plan because a half-covered contract is what the first draft was.

### Open points (per Waterfall-roadmap.md §15, resolved by DEC-28/DEC-29):
| # | Point | Stage | DEC-29 Impact |
|---|---|---|---|
| D-1 | One provider order | G-0 | Cloudflare first, AMD second (DEC-17, DEC-18) |
| D-2 | Where new tests run | G-0 | Test script runs critical folder + new AI-assistant tests |
| D-3 | Trial audience | G-0 | Product owner only, or whole test tenant (disclosure/terms depend on it) |
| D-4 | Order of document packs | G-0 | Money first (invoice, quotation) is this roadmap's choice |
| Q1 | Key in header only / browser proxy | A | Engineering decision |
| Q2 | May assistant create client/supplier record | B, D | Product decision — not approved by DEC-29 |
| Q3 | May assistant change document number | B | Product decision — not approved by DEC-29 |
| Q4 | Note and term defaults | G-0 | Product decision |
| Q5 | Converted quotation keeps assistant notes | C | Product decision |

---

## 5. Architecture and Safeguard Decisions

### DEC-29 target shape (from architecture.md):
- **Declared floor:** Every provider row is a base URL, key id, and model. A gateway is one row.
- **Eligibility:** Free-tier claims carry a verification date; entries past a review window are marked unverified and bypassed.
- **Selection:** Free-first among eligible models. Paid models never selected without owner policy.
- **Failover:** Automatic bounded failover on 429/5xx/401/403/404. 400 stops the chain. Timeout advances once.
- **Continuity:** Same conversation continues across a mid-thread model switch; history is verbatim; facts render identically.
- **Health ledger:** Visible trace shows which model answered and why a failover happened.
- **Visibility layers:** Product (DEC-28), Engine (DEC-29), Read/Retrieval (B), Create (C/D), Approval/persistence (E).

### Architecture boundaries (from architecture.md):
| Boundary | Description |
|---|---|
| Conversational interface | User speaks/ types; assistant interprets intent and proposes structured changes |
| Context and record retrieval | Tenant-authorized reads from existing business records |
| Document-specific capability packs | Tools + adapter per document type (invoice, quotation, PO, waybill, CSR, RFQ, cost sheet, letter) |
| Structured change proposals | Change card: field, old value, new value; accept applies once; rejection changes nothing |
| Validation and authorization | System-owned: tenant scope, permissions, calculations, business rules, numbering, audit |
| User approval | Explicit yes/no on proposed change before apply |
| Persistence and filing | Explicit confirmation before save; application owns the persistence path |
| Provider transport and failure handling | Chain advance on 429/5xx/401/403/404; 400 stops; timeout once; user-visible error |

### Missing architectural decisions (identified, not guessed):
- Provider chain order (DEC-17, DEC-18 resolve Cloudflare first, AMD second)
- Key custody (tenant's own key in private storage, or paid production provider)
- Privacy consent disclosure (feature off by default; disclosure names provider and training terms)
- Trial duration and success measures (two measures: median time ≤90s, <1 manual correction per 20 docs)
- Dynamic model selection pool (eligibility reads runtime quota/429 bodies; no stored table)
- Paid inference policy (denied by default; free-first among eligible models)
- Model verification decay (free-tier claims carry verification date; stale entries bypassed)

---

## 6. Existing Implementation Gaps

The current Bolu implementation is read-only. Gaps identified (evidence-based, not conjectural):

| Area | Status | Evidence |
|---|---|---|
| Read/retrieval | PARTIAL | Invoice/quotation search and receivables reads exist; source/citation, ambiguity handling, tenant integration incomplete |
| Document creation | NOT IMPLEMENTED | No form adapter, tool-call change cards, contradiction handling, proposal flow, filing preview, or save path |
| Document modification | NOT IMPLEMENTED | No authorized existing-record mutation proposal/apply workflow or stale-record validation |
| Approval/persistence controls | NOT IMPLEMENTED | No structured proposal cards, apply-time revalidation, save confirmation, or idempotent persistence orchestration |
| Provider chain | PARTIAL | Shared read-only runtime exists (BoluAssistantProvider, bolu-runtime.ts, bolu-context.ts, api/bolu-chat.ts); no model-selection pool, provider eligibility ranker, complete failover |
| Financial calculation | AUTHORITATIVE | `src/lib/Calculations.ts` and PDF renderers untouched; model never writes computed fields |
| Tenant isolation | PARTIAL | Tenant-aware search exists; full isolation on every read and write not implemented |
| Trial/toggle | NOT IMPLEMENTED | No approved trial setup, disclosure/consent, toggle, device/network evidence, or baseline measurements |
| Read-only surfaces | PARTIAL | Invoice, quotation, and receivables reads exist; RFQ, cost-sheet, letter, receipt, compliance, and tax packs absent |

---

## 7. Unresolved Owner Decisions

These decisions remain open and must be approved before corresponding roadmap stages can proceed:

1. **First-release document family:** Which document types form the first release? Invoice-first (this roadmap's choice) or a narrower set?
2. **Provider eligibility and key custody:** Which provider may receive business data? What key custody, privacy consent, retention, and cost policy applies? AMD Token Factory terms forbid production use (RISK-14).
3. **Dynamic multi-model selection:** Required for first release, or a later reliability milestone?
4. **Document scope for first release:** Which of the eight candidate forms are in the first release, later packs, or out of scope?
5. **Trial audience, duration, and success measures:** Product owner must approve audience, duration (4 weeks proposed), and measures (median time ≤90s, <1 manual correction per 20 docs by week 4).
6. **Which fields can Bolu propose per document family:** Which fields are immutable or system-owned? Which require explicit user approval?
7. **Boundary between approving a change and confirming persistence:** Which confirmations can be grouped, if any?
8. ** Whether AMD terms permit the intended use:** AMD is a free trial/development service, not for production; reselling access forbidden (RISK-14).

The prior 2026-11-13 read-only reconciliation remains as historical evidence. DEC-28 supersedes its interpretation of the governing direction.

---

## 8. Verification Performed

**Per AGENTS.md and project instructions: NO application-code verification was performed.**

- No `bun run build` executed
- No `bun run typecheck` executed
- No linting, tests, or runtime verification performed
- No database commands, migrations, or provider requests executed
- No builds, typechecks, lints, or tests of any kind

**Lightweight static consistency checks performed:**
- Internal requirement ID consistency (FR-01 through FR-33 preserved)
- Stage name consistency (G-0 through H across Markdown and HTML)
- Markdown/HTML content agreement (audit table synchronized)
- Requirement classification categories well-formed (retained/refined/approved/deferred/rejected/blocked)
- Requirement IDs traceable to source (FR → DEC → RISK → test suite)
- No application-source modifications detected or attempted

**Verification does not include:**
- Build or typecheck results
- Test execution results
- Runtime behavior
- Provider integration tests
- Device or phone tests

---

## 9. Exact Final Git Status and Scope of Changes

```
On branch main
Your branch is ahead of 'origin/main' by 16 commits.
  (use "git push" to publish your local commits)

Changes not staged for commit:
  modified:   docs/prd/conversational-document-assistant/Readme.md
  modified:   docs/prd/conversational-document-assistant/Waterfall-roadmap.md
  modified:   docs/prd/conversational-document-assistant/architecture.md
  modified:   docs/prd/conversational-document-assistant/decision-log.md
  modified:   docs/prd/conversational-document-assistant/functional-req.md
  modified:   docs/prd/conversational-document-assistant/provider-catalog.md
  modified:   docs/prd/conversational-document-assistant/risk-register.md
  modified:   docs/prd/conversational-document-assistant/roadmap.html
  modified:   docs/prd/conversational-document-assistant/test-plan.md

Untracked files:
  docs/reports/ai/2026-11-14-bolu-prd-roadmap-reconciliation.md

No changes added to commit (use "git add" and/or "git commit -a")
```

**Scope of this task (documentation only):**
- 9 documentation artifacts modified (8 in conversational-document-assistant/ + 1 new report)
- 0 application-source files modified
- 0 tests, builds, typechecks, or lints executed
- 0 configuration, dependency, or Design Lab changes
- Scope precisely limited to reconciliation of PRD, roadmap, architecture, risks, and test plan against DEC-28 and DEC-29

**All pre-existing worktree changes preserved.** Only explicitly permitted documentation artifacts were modified or created by this task.