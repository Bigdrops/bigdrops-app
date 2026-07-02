Read Agents.md 1st

# ✅ BIGDROPS — Invoice + Quotation Full Parity + Ownership Audit (READ-ONLY)

You are working on the BIGDROPS business platform.  
Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.  
Runtime: Bun. Never use npm or yarn.

---

# CONTEXT

An Invoice architecture audit already exists for:

- `NewInvoice.tsx`
- `EditInvoice.tsx`
- `SharedDocumentForm.tsx`
- Invoice domain layer
- Financial + column systems
@docs/Task/Reports/invoice-form-architecture-audit.md
That audit established internal Invoice structure but did NOT fully evaluate Quotation parity or cross-module ownership boundaries.

Known shared systems:

- View page structure (Invoice, Quotation, CSR, Waybill)
- Form system (Invoice, Quotation, Waybill via SharedDocumentForm)
- PDF/template system (Invoice-heavy, also used by Quotation)

This audit is strictly READ-ONLY and evidence-based.

No redesigns. No abstractions. No refactoring.

---

# OBJECTIVE

Determine whether Invoice and Quotation are structurally identical or divergent at the orchestration level by:

1. Mapping real ownership boundaries (as implemented)
2. Comparing Invoice vs Quotation behavior
3. Identifying hidden divergences
4. Validating parity with evidence

---

# SCOPE

## Invoice

- NewInvoice.tsx
- EditInvoice.tsx
- View page (if present)
- SharedDocumentForm usage
- Invoice domain layer usage

## Quotation

- NewQuotation.tsx
- EditQuotation.tsx
- View page
- Quotation domain layer usage
- Save/load orchestration
- Validation logic
- Column system usage
- PDF/template pipeline usage
- SharedDocumentForm usage

---

# TASK 0 — OWNERSHIP BOUNDARY MAPPING (CRITICAL FIRST STEP)

Before any comparison, independently analyze BOTH Invoice and Quotation and produce a real implementation-based ownership map.

Do NOT idealize. Do NOT redesign.

## For EACH module (Invoice AND Quotation), document:

---

## A. Page Layer (New/Edit/View)

- What state is defined here?
- What side effects exist here?
- What orchestration logic exists here?
- What persistence logic exists here?
- What navigation logic exists here?

---

## B. Hook Layer (if applicable)

- What state is managed in hooks?
- What logic is centralized?
- What logic is duplicated across pages?
- Are hooks true controllers or thin wrappers?

---

## C. SharedDocumentForm Layer

- Does it strictly render UI or also orchestrate logic?
- What props represent state vs behavior?
- Does it control business flow or just display?

---

## D. Domain Layer

- What is pure business logic?
- What is transformation logic?
- What UI concerns are leaking in?

---

## E. Persistence Layer

- Where are DB reads performed?
- Where are DB writes performed?
- Is persistence centralized or scattered?

---

## OUTPUT REQUIREMENT

Produce a complete ownership map for BOTH Invoice and Quotation BEFORE continuing.

---

# TASK 1 — QUOTATION ARCHITECTURE INVENTORY

Document Quotation as implemented:

- Entry points
- State structure
- Orchestration flow
- Domain usage
- Persistence logic
- Validation
- Column handling
- PDF/template usage
- Navigation behavior

---

# TASK 2 — STRUCTURAL BREAKDOWN (QUOTATION)

Analyze:

- NewQuotation.tsx
- EditQuotation.tsx

Classify each section as:

- Same as Invoice
- Similar to Invoice (with exact differences)
- Quotation-specific logic

Do NOT generalize. Be explicit.

---

# TASK 3 — INVOICE VS QUOTATION COMPARISON

Compare directly:

- Form orchestration
- State ownership
- Save/load logic
- Validation logic
- Column system behavior
- Domain function usage
- Persistence strategy

For each classify:

- Identical
- Similar (with exact differences)
- Different (explicitly described)

---

# TASK 4 — VIEW + PDF PIPELINE COMPARISON

Inspect ONLY:

- View page structure
- PDF generation flow
- Template usage

Compare Invoice vs Quotation.

No deep rendering analysis.

---

# TASK 5 — END-TO-END LIFECYCLE COMPARISON

Compare actual implemented flows:

- Initialization / load
- Editing flow
- Validation
- Computation
- Save
- Navigation

Highlight differences only.

---

# TASK 6 — SHARED SYSTEM VALIDATION

Answer strictly:

1. Are Invoice and Quotation orchestration systems structurally identical today?
2. If not, what exact differences exist?

No suggestions. No redesign. No refactor planning.

---

# OUTPUT FORMAT

1. Executive Summary  
2. Invoice Ownership Map  
3. Quotation Ownership Map  
4. Quotation Architecture Inventory  
5. Quotation Breakdown (New vs Edit)  
6. Invoice vs Quotation Comparison Matrix  
7. View + PDF Comparison  
8. Lifecycle Comparison  
9. Divergence List (explicit only)  
10. Final Parity Verdict (Yes / No / Partial)  
11. Evidence Summary  
12. Files Inspected  

---

# STOP CONDITION

Stop immediately after analysis.

Do NOT propose refactors.  
Do NOT design new architecture.  
Do NOT suggest abstractions.

---

# SUCCESS CRITERIA

Done when:

- Ownership boundaries are explicitly mapped for BOTH modules
- Invoice vs Quotation parity is proven or disproven with evidence
- All divergences are explicitly identified
- No assumptions or architectural redesigns are introduced