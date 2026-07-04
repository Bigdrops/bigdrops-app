
You are working on the BIGDROPS business platform.
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
BEFORE YOU BEGIN — READ AGENTS.md
==================================================
You have full file access. Immediately read AGENTS.md.
It contains:

· Skill loading protocol (with failsafe)
· Reporting protocol (save to docs/Reports/{domain}/)
· Report quality standards (identity, evidence, ownership tables, transformation standard compliance, risks, deferred work, build verification)
· Hard architecture rules, no-touch zones, and business behaviour preservation rules
· Standards hierarchy (AGENTS.md > docs/STANDARD/* > module docs)

All of these apply to this task. Do not ask for them to be repeated.

Required skills:
- Karpathy
- supabase-postgres-best-practices

==================================================
CONTEXT
==================================================

The Financial Operations PRD at `docs/PRD/financial-operations-prd.md` has been rewritten as a Business Architecture Specification (v2). Two architects (dorime and rector) have reviewed it and identified ten specific refinements to elevate it from an implementation description to a long‑lived platform architecture specification. These refinements do not change the architecture — they clarify ownership, add missing conceptual models, and improve the document’s structure so it can guide development for years.

This is a documentation‑only task. Do not modify any production code.

==================================================
OBJECTIVE
==================================================

Apply ten precise architectural refinements to `docs/PRD/financial-operations-prd.md`, producing v3.0 — the canonical Financial Operations Platform Architecture Specification.

==================================================
SCOPE
==================================================

Modify only `docs/PRD/financial-operations-prd.md`. You may read any source file referenced in the PRD to verify claims, but do not change source code, migrations, or standards.

==================================================
REQUIREMENTS — TEN REFINEMENTS
==================================================

Apply each refinement exactly as described. Preserve all existing correct content; only add, reorder, or clarify.

### Refinement 1 — Financial Source of Truth Hierarchy
- **Where:** Insert immediately after §2 (Architecture Philosophy), before the current §3 (Financial Obligation Model). Renumber subsequent sections.
- **What to add:**

```

3. Financial Source of Truth Hierarchy

The financial platform has a single ownership chain.

Calculation Engine
↓
Financial Obligation (Invoice)
↓
Settlement (Payments)
↓
Financial State (Derived)
↓
Consumers (Compliance, Reports, Dashboards, Exports, Future Accounting)

Upstream domains never consume downstream state.
Downstream domains never overwrite upstream truth.
Financial truth flows in one direction.

```

### Refinement 2 — Financial State as its own domain
- **Where:** Split the current "Financial Status Model" (§9 in v2) into two sections:
  1. **Financial State** — owns settled amount, outstanding, balance, payment percentage, overpayment, payment state (derivation logic)
  2. **Financial Status** — the output labels (unpaid, partially_paid, paid, overpaid, written_off, closed)
- Keep the dual-derivation discussion and the OVERDUE note in Financial State. Financial Status should only list the statuses and their conditions.

### Refinement 3 — WHT five-stage evidence model
- **Where:** Replace the three-layer model in §6 (WHT Architecture) with a five-stage pipeline:
```

Expected → Deducted → Recorded → Certificate Received → Verified

```
- Map each stage to the existing tables/columns:
  - Expected: `invoices.wht`, `invoices.wht_rate`, `invoices.wht_type`
  - Deducted: `payments.wht_amount`
  - Recorded: `payments` row (audit event)
  - Certificate Received: `wht_receipts` (status ≥ received)
  - Verified: `wht_receipts` (status = verified)
- Mark which stages are fully implemented, partially implemented, or not implemented.

### Refinement 4 — VAT lifecycle
- **Where:** Expand §7 (VAT Architecture) into a lifecycle model:
```

VAT Calculated → VAT Collected → VAT Input → VAT Liability → VAT Filing → Evidence

```
- For each stage, note current status:
  - Calculated: ✅ Calculation Engine
  - Collected: ⚠️ embedded in grand total, not tracked separately
  - Input: ✅ `tax_input_entries` table
  - Liability: ❌ not computed
  - Filing: ❌ not implemented
  - Evidence: ❌ not implemented

### Refinement 5 — Financial Consumers section
- **Where:** New section immediately after Financial State (after the split from Refinement 2).
- **Content:**
```

Financial Consumers

Everything below Financial State is a consumer. Consumers read derived financial data; they never compute it independently.

· Compliance — reads WHT/VAT state for evidence tracking
· Reports — reads projections for display
· Dashboard — reads summary metrics
· Analytics — future consumer
· PDF Exports — dumb renderers
· Future Accounting — external module consuming clean events

Consumers must not:

· Query raw payment or invoice tables for financial values
· Recalculate balances, taxes, or totals
· Write financial state back to authoritative tables

```

### Refinement 6 — Move Data Flow Authority Map earlier
- **Where:** Relocate the current Data Flow Authority Map (currently §15) to immediately after Calculation Engine (§4 after renumbering). It should appear before Financial Obligation Model.

### Refinement 7 — Rename "Implementation Roadmap" to "Architecture Evolution Roadmap"
- **Where:** §16 heading and any internal references.
- **Why:** The document is now a platform architecture specification; "roadmap" describes the evolution of the architecture, not a task list.

### Refinement 8 — Rephrase dual-derivation statement
- **Where:** In the Financial State section (refined from §9.2).
- **Current wording:** "One should be authoritative; currently neither is."
- **Replace with:**
  > The SQL projection and TypeScript projection are intended to represent identical business rules. Maintaining behavioral equivalence between both implementations is mandatory until a single authoritative derivation strategy is adopted.

### Refinement 9 — Business Ownership Matrix
- **Where:** Add a new section before the current file‑oriented Ownership Matrix.
- **Content:** A table with two columns: Business Concept | Owner.
  - Prices → Calculation Engine
  - VAT → Calculation Engine
  - WHT → Calculation Engine
  - Invoice Total → Calculation Engine
  - Financial Obligation → Invoice Domain
  - Settlement → Payment Domain
  - Financial State → Financial State Domain
  - Compliance Evidence → Compliance Domain
  - Operational Reports → Reporting Domain
  - Audit History → Audit Domain

### Refinement 10 — Overall tone shift
- Throughout the document, ensure the architectural model is described first, and the current implementation is presented as one realization of that model. Where sections currently start with "Currently…" or describe code structure before the concept, restructure to lead with the concept, then note the current state. Do not alter any technical claims — only reorder sentences for clarity.

==================================================
CONSTRAINTS
==================================================

- Do not change any technical claim unless it contradicts source‑code evidence. If you find a contradiction, flag it in the report but do not resolve it.
- Preserve all existing correct content — this is additive refinement, not replacement.
- Do not modify any file other than the PRD.
- Keep the document under 800 lines if possible. If it grows beyond that, note it but do not truncate.

==================================================
PRESERVE EXISTING BUSINESS BEHAVIOUR
==================================================

The document must continue to accurately reflect the implemented architecture. Do not invent features or claim implementation where none exists.

==================================================
REQUIRED VERIFICATION
==================================================

- After editing, re‑read the entire PRD to ensure no contradictions were introduced.
- Verify that every new claim (e.g., five-stage WHT, VAT lifecycle stages) is consistent with the source code. If a claim cannot be verified, mark it as aspirational.

==================================================
OUTPUT
==================================================

1. Update `docs/PRD/financial-operations-prd.md` with all ten refinements applied.
2. Produce a brief report at `docs/Reports/FinancialOperations/prd-v3-refinements-report.md` containing:
   - List of refinements applied with a one‑line confirmation each.
   - Any sections where you could not fully verify a claim (with evidence).
   - Verification status: did all existing claims remain consistent after edits?

==================================================
STOP CONDITION
==================================================

Stop after the updated PRD and report are saved. Do not generate implementation prompts or modify code.

==================================================
SUCCESS CRITERIA
==================================================

Done when:
- All ten refinements are applied and consistent.
- The PRD reads as a platform architecture specification, not an implementation report.
- The ownership hierarchy, financial consumers, and lifecycle models are explicit.
- No production code was changed.
```

