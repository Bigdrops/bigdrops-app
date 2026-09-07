# 🚦 PREREQUISITES — PDF RENDERING MIGRATION

> **Status:** ⛔ PENDING
> **Owner:** BIGDROPS
> **Purpose:** Absolute requirements that must be verified *before* Phase 0 (Architecture Audit) begins.

## 📋 CRITICAL GATES
- [ ] **Environment:** `git status` is clean. No pending changes from other agents.
- [ ] **AGENTS.md:** Read and understood.
- [ ] **Skills:** Loaded pdfcndev agent skills from `docs/PROJECTSKILLINDEX.md`.
- [ ] **Dependency Audit:** Confirmed `@react-pdf/renderer` is pinned in `package.json`.
- [ ] **Standards Factoring:** [CRITICAL] All current `docs/standard/` files used by the React renderer (e.g., `Commercial Party Architecture`, `document-column-standard`, etc.) have been audited and mapped to see if pdfcn can replicate them or if they need adaptation. **They must not be deleted yet.**
- [ ] **Baseline:** `bun run typecheck` passes on the *current* codebase.

## 🚫 NON-NEGOTIABLE
- **DO NOT run `bun run build`** (per PRD §18, host resource constraints).
- **DO NOT remove `@react-pdf/renderer`** until Phase 4 is fully validated.
- **DO NOT change business logic** (tax, totals, numbering).

## ✅ DEFINITION OF READY (Phase 0 starts only when ALL above are ✅)
- [ ] All gates above are ticked.)