# 📘 JSON Import Improvement Roadmap

**Project:** BIGDROPS Business Platform  
**Scope:** All JSON import modules + Open in AI feature  
**Status:** Planning → In Progress → Done  
**Last Updated:** 2026-06-14  

---

# 🧭 North Star

Every AI-assisted import across the platform must:

- Return only what exists in the source document — no inference, no guessing  
- Groups are valid output, but only when explicitly present in the source or explicitly requested  
- Never auto-infer structure from spacing, indentation, or visual layout  
- Return `null` for absent fields — never placeholders or guesses  
- Never assign identifier values unless explicitly labeled as that identifier type  
- Each document type is semantically isolated (no cross-document reasoning reuse)  
- Produce JSON that passes validation on first paste, every time  

---

# 📊 Current State Summary (from audit)

| Module | Prompt Type | Parser | Validation | Status |
|---|---|---|---|---|
| Invoice | Shared dynamic | Shared | Zod (shared) | Needs discipline rules |
| Quotation | Shared dynamic | Shared | Zod (shared) | Needs discipline rules |
| Waybill | Hardcoded inline | Shared | Zod (shared) | **FULL REWRITE REQUIRED** |
| RFQ | Hardcoded inline | Inline | Manual | Needs tightening |
| CSR | Hardcoded constant | Inline | Manual | Needs tightening |
| Compliance Hub | 3 hardcoded prompts | Custom | Zod (custom) | Needs discipline rules |
| Project Document | 4 hardcoded prompts | Inline JSON.parse() | Manual | Needs full rewrite |
| Item Library | None | Inline | Manual | No UI — skip |
| BOQ | — | — | — | No import — skip |
| Reports | — | — | — | No import — skip |

---

# 🔐 Open in AI — Current State

- `openInAI.ts` supports Gemini, ChatGPT, Claude (UI only exposes Gemini)
- Deep link flow via `?q=ENCODED_PROMPT`
- Android OS intercept opens native apps with prompt pre-filled
- No silent clipboard fallback
- No unified multi-provider UX

---

# 🚀 Phase 0 — Open in AI (All Modules)

## Goal

Enable all AI providers + ensure fail-safe prompt access.

## Tasks

- [ ] Replace Gemini-only button with `OpenInAIDropdown`
- [ ] Expose: Gemini / ChatGPT / Claude
- [ ] On click: `navigator.clipboard.writeText(prompt)` BEFORE opening link (silent fallback)
- [ ] Show toast: “Opened in {AI_PROVIDER}”
- [ ] Ensure all modules use shared `JsonImportLayout.tsx`

## Applies to

Invoice, Quotation, Waybill, RFQ, CSR, Compliance Hub

## Completion Signal

- Native AI apps open correctly on Android  
- If deep link fails → clipboard already contains prompt  
- No extra user interaction required  

---

# 🧱 Phase 1 — Waybill (CRITICAL REWRITE)

## 🚨 Core Architectural Constraint — External/Internal Isolation Rule

External Waybill and Internal Waybill are fully isolated systems.

They must NOT:
- Share prompts
- Share adapters
- Share schemas
- Share interpretation logic
- Share entity-role inference rules
- Share numbering assumptions

---

## 🧠 Required Separation Architecture

### Prompts
- `externalWaybillPrompt.ts`
- `internalWaybillPrompt.ts`

### Adapters
- `externalWaybillImportAdapter.ts`
- `internalWaybillImportAdapter.ts`

### Schemas
- `externalWaybillSchema.ts`
- `internalWaybillSchema.ts`

---

## ⚠️ Mandatory Prompt Isolation Statement

Each prompt must include:

> “This document type is isolated. Do not reuse interpretation logic from other document types, including internal or external variants.”

---

## Current Problems

- External/Internal share parser logic
- Missing fields in prompt vs UI schema mismatch
- Dead fields still referenced (signature, notes variants)
- No strict schema alignment with UI

---

## Tasks

- [ ] Audit all Waybill fields (header + items)
- [ ] Fully separate External vs Internal logic
- [ ] Rewrite both prompts independently
- [ ] Add zero-inference rules
- [ ] Remove dead fields
- [ ] Extract adapters into domain layer
- [ ] Create separate Zod schemas per variant
- [ ] Test real-world documents for both flows

## Completion Signal

- External and Internal Waybills produce different outputs when semantics differ  
- No field leakage between systems  
- No shared inference behavior  

---

# 📄 Phase 2 — Invoice

## Current Issues

- AI infers groups from indentation
- Weak group control logic
- Missing strict null enforcement

## Tasks

- [ ] Add controlled group rule (only explicit headers)
- [ ] Add null enforcement rule
- [ ] Ensure shared pipeline applies correctly
- [ ] Test structured invoices

## Completion Signal

No auto-generated groups unless explicitly defined in source.

---

# 📄 Phase 3 — Quotation

## Tasks

- [ ] Confirm shared fix applies
- [ ] Add independent test cases

## Completion Signal

Flat structure unless explicit grouping exists.

---

# 🧾 Phase 4 — Compliance Hub

## Tasks

- [ ] Add zero-inference rules to all 3 contracts
- [ ] Ensure WHT linking unaffected
- [ ] Test all contract types

## Completion Signal

Only real fields populated, no inference.

---

# 📦 Phase 5 — RFQ

## Tasks

- [ ] Rewrite prompt with strict rules
- [ ] Decide on Zod migration
- [ ] Optional adapter refactor
- [ ] Test 3-field schema compliance

---

# 🧾 Phase 6 — CSR

## Tasks

- [ ] Rewrite CSR prompt
- [ ] Rename parsing function
- [ ] Add Zod validation (recommended)
- [ ] Test single-record correctness

---

# 🏗 Phase 7 — Project Documents (CRITICAL)

## Core Problems

- Role confusion (`from_party` vs `to_party`)
- Identifier collision (`po_number` incorrectly filled)
- Redundant financial fields (`subtotal`, `total`)
- Weak schema validation

---

## 🔐 PO Identifier Lock Rule

`po_number` must ONLY be filled when explicitly labeled:

Valid sources:
- PO Number
- Purchase Order Number
- P.O No
- Voucher Number (treated as PO-equivalent ONLY in Project context)

Invalid sources:
- Document Number
- Reference Number
- Invoice Number
- Serial Number
- Unlabeled numeric identifiers

Otherwise:
- `po_number = null`

---

## Tasks (7a — Import)

- [ ] Inject company identity into all prompts
- [ ] Add PO identifier lock rule
- [ ] Remove subtotal/total extraction
- [ ] Add zero-inference rules
- [ ] Create Zod schemas per sub-type
- [ ] Test party correctness + identifier blocking

---

## Tasks (7b — PDF)

- [ ] Audit PDF rendering separately
- [ ] Fix layout + formatting issues
- [ ] Improve field presentation

---

## Completion Signal

- Correct party role assignment always  
- No document-number pollution into PO fields  
- Clean schema outputs  

---

# 📜 Global Prompt Discipline Rules

```text
1. Only extract data explicitly present in source document
2. Missing fields → null (never infer)
3. Groups allowed only if explicitly present in source
4. No structural reordering or renaming
5. Output must be valid JSON only
6. Uncertain values → null
7. No cross-document inference allowed


---

📌 System-Wide Constraint Summary

Waybill External/Internal = fully isolated systems

Project Documents = strict identifier locking

Invoice/Quotation = controlled grouping only

All modules = zero inference by default

AI must never fill gaps



---

📅 Execution Order

Phase 0 → Phase 1 → Phase 2+3 → Phase 4 → Phase 5 → Phase 6 → Phase 7a → Phase 7b


---