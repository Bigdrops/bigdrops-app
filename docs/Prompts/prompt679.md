You are working on the BIGDROPS business platform.

Stack: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4 + Supabase + Vercel.
Runtime: Bun. Never use npm or yarn.

==================================================
BEFORE YOU BEGIN — READ AGENTS.md
==================================================

You have full file access. Immediately read AGENTS.md.

It contains:

- Skill loading protocol (with failsafe)
- Reporting protocol (save to docs/Reports/{domain}/)
- Report quality standards
- Hard architecture rules, no-touch zones, and business behaviour preservation rules
- Standards hierarchy (AGENTS.md > docs/STANDARD/* > module documentation)

All of these apply to this task. Do not ask for them to be repeated.

Immediately load the appropriate skills:

- Karpathy
- typescript-advanced-types
- frontend-design

Run:

`bun run audit:load`

before implementation.

---

# CONTEXT

Invoice normalization is complete.

The Document Transformation Standard is authoritative.

The Edit Law requires document identity to remain immutable after creation.

The Invoice module already contains the Domain invariant:

`src/domain/invoice/assertIdentityImmutable.ts`

However, the Invoice module is not yet fully aligned with the standard:

- the existing invariant no longer reflects the current Invoice identity contract
- the invariant is not invoked
- the edit UI currently allows client identity to be modified

This task completes Edit Law compliance.

Do not redesign the Invoice architecture.

---

# OBJECTIVE

Bring the Invoice module into full compliance with the Edit Law by:

1. Reconciling the existing `assertIdentityImmutable` invariant with the current Invoice identity contract.
2. Preventing identity mutation through the edit UI.
3. Invoking the existing invariant from one canonical enforcement point before persistence.

Do not create new validators.

Do not introduce new abstractions.

---

# SCOPE

Work only on the Invoice module.

Do not modify:

- Quotation
- Waybill
- CSR
- RFQ
- BOQ

Only make compatibility fixes outside Invoice if required for compilation.

---

# REQUIREMENTS

## 1. Reconcile the Existing Domain Invariant

Review:

- `docs/STANDARD/document-transformation-standard.md`
- `src/domain/invoice/assertIdentityImmutable.ts`

Update the existing invariant to match the current Invoice identity contract.

Do not duplicate logic.

Do not create a second identity validator.

If Invoice-specific identity differs from the generic Transformation Standard terminology, document the mapping.

---

## 2. Enforce Identity in the UI

Saved invoices must not allow identity mutation.

Ensure:

- client identity cannot be changed in edit mode
- client remains selectable during creation
- existing client information remains visible

Keep the user experience consistent with the rest of the application.

---

## 3. Wire the Canonical Enforcement Point

Identify the correct lifecycle boundary for identity validation.

Invoke the existing Domain invariant from exactly one canonical location.

The invariant must execute before persistence.

Do not invoke it from multiple locations.

---

## 4. Preserve Architectural Ownership

Maintain ownership boundaries.

Domain:

- identity rules
- immutable identity invariant

InvoiceFormPage:

- validation coordination
- save orchestration
- user feedback

Services:

- persistence

UI:

- presentation
- interaction

Do not move business rules into UI components or React hooks.

---

## 5. Preserve Existing Behaviour

Outside Edit Law enforcement, preserve:

- calculations
- validation
- duplicate
- revert
- conversion
- import
- attachments
- PDF generation
- audit behaviour
- navigation
- save pipeline

No behavioural regression is acceptable.

---

## 6. Preserve Audit Behaviour

Do not modify:

- audit events
- execution order
- payloads
- timing

Identity validation must occur before persistence and before any audit event that would otherwise commit an invalid mutation.

---

# CONSTRAINTS

- No Invoice redesign.
- No further normalization.
- No generic validation framework.
- No duplicate validation logic.
- Preserve backward compatibility.
- Preserve existing business behaviour.

---

# REQUIRED VERIFICATION

Run:

1. `bun run audit:load`
2. `bun run typecheck`
3. `bun run build`

Manually verify:

### Edit Law

- Saved client identity cannot change.
- Valid edits continue to succeed.

### Duplicate Law

- No regression.

### Revert Law

- No regression.

### Audit

Verify:

- Invoice creation
- Invoice update
- Duplicate
- Convert
- Revert

Confirm audit behaviour is unchanged.

---

# OUTPUT

Save the implementation report to:

`docs/Reports/invoice-quote/invoice-edit-law-compliance.md`

Include:

1. Executive Summary
2. Files Modified
3. Identity Contract Mapping
4. Canonical Enforcement Point
5. UI Changes
6. Domain Changes
7. Behaviour Verification
8. Transformation Standard Verification
9. Audit Verification
10. Risks
11. Deferred Work

---

# STOP CONDITION

Stop immediately after:

- updating the existing invariant
- enforcing identity immutability in the UI
- wiring the canonical enforcement point
- completing verification
- writing the implementation report

Do not begin:

- Quotation work
- additional Invoice normalization
- lifecycle redesign
- cross-document consolidation

---

# SUCCESS CRITERIA

Done when:

- The Invoice module fully complies with the Edit Law.
- The existing `assertIdentityImmutable` invariant reflects the current Invoice identity contract.
- Client identity cannot be modified after invoice creation.
- The invariant is invoked from one canonical enforcement point.
- Domain remains the authoritative owner of identity rules.
- No duplicate validation logic exists.
- Existing behaviour is preserved outside Edit Law enforcement.
- `bun run typecheck` passes.
- `bun run build` passes.
- Verification confirms no regressions.