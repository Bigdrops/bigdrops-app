# 🚦 Prerequisites & Readiness Gates — PDF Rendering Migration

- **Status:** APPROVED READINESS SPECIFICATION & FROZEN DOCUMENTATION BASELINE (Ready for M1 Planning)
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Owner:** BIGDROPS Engineering
- **Purpose:** Compulsory gates that all agents and developers must verify before starting implementation.

---

## 1. Diagnostic Baseline Sign-Off

Before any template implementation begins in Forme, the following investigation reports must be approved as the diagnostic baseline:

- [x] **Investigation 1: Industry Template & Character Corruption Report**  
  File: [`docs/reports/2026-10-30-forme-invoice-quotation-industry-template-investigation.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/reports/2026-10-30-forme-invoice-quotation-industry-template-investigation.md)  
  *Diagnostic Evidence:* Observed reproduction of double-prime (`″`) corruption into digits `23`, `33`, `43` in `SASQUO-000428.pdf`. WinAnsi modulo-256 truncation identified as a **technically plausible suspected cause** requiring empirical tracing during font pipeline setup.

- [x] **Investigation 2: Natural Pagination Root Cause Report**  
  File: [`docs/reports/2026-10-30-industry-invoice-quotation-natural-pagination-investigation.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/reports/2026-10-30-industry-invoice-quotation-natural-pagination-investigation.md)  
  *Diagnostic Evidence:* 113.73 pt coupled closing block (`wrap={false}`) breaking to Page 2 in `SASQUO-000427` despite 75.25 pt free space on Page 1, 58 pt make column width inflation, defensive 48 pt footer padding.  
  *(Note: Specific measurements are observed empirical evidence on the reproduction document, not universal physical constants).*

---

## 2. Mandatory Verification Gates

| Gate ID | Verification Item | Target Standard | Verification Method | Status |
| :--- | :--- | :--- | :--- | :--- |
| **G-01** | **Git Working Tree State** | Working directory clean or only contains documented CSR / report files. No collisions. | `git status` | [x] PASSED |
| **G-02** | **AGENTS.md Understanding** | Review execution rules, safe edit rules, and forbidden commands. | Read `AGENTS.md` | [x] PASSED |
| **G-03** | **Skills Loaded** | Load skills from `docs/PROJECTSKILLINDEX.md` (`pdf-rendering-correctness`, `react-pdf`). | Skill review | [x] PASSED |
| **G-04** | **Engine Dependencies** | Verify `@formepdf/react` (v0.20.1) and `@formepdf/core` (v0.20.1) installed in `package.json`. Confirm `@react-pdf/renderer` (v4.3.2) remains installed for legacy templates. | Inspect `package.json` | [x] VERIFIED IN REPO |
| **G-05** | **Binary Font Assets & Packaging** | Evaluate static TrueType (`.ttf`) font files in `public/fonts/`. Check offline mobile export reliability. Retain binary bundle as fallback. | Empirical asset check | [ ] PENDING M1 VERIFICATION |
| **G-06** | **Reference Corpus & Test Suite** | Confirm test files exist in `docs/templates/ref-invquo/`: `SASQUO-000427 (1).pdf`, `SASQUO-000428.pdf`, `SASQUO-430 (1).pdf`. | File system check | [x] PASSED |
| **G-07** | **Static Typecheck Baseline** | Run `bun run audit:load` followed by `bun run typecheck`. Baseline must pass before code modifications. | Shell command execution | [ ] IMPLEMENTATION GATE |

---

## 3. Strict Execution Ordering Gate: Natural Pagination First (Gate 1)

> [!CRITICAL]
> **GATE 1 REQUIREMENT: NATURAL PAGINATION MUST PRECEDE COMPACTION**  
> Developers and autonomous agents are strictly forbidden from implementing Compact Mode or Force 1 Page Mode until Natural Pagination (Normal Mode) has passed all acceptance criteria across the complete **Gate 1 Representative Document Suite**:
> 1. Short documents with few line items.
> 2. The original 13-item `SASQUO-000427` quotation (verified to fit naturally on 1 page).
> 3. Documents with long and wrapping descriptions.
> 4. Documents with large totals and multi-account bank details.
> 5. Documents with notes and commercial terms.
> 6. Documents with attachments and signatures.
> 7. Multi-page documents with different content distributions.
> 
> Ordinary table rows must stay intact where possible, and oversized rows must be handled safely to prevent clipping or silent content loss.  
> Compaction must never be used to mask or compensate for fundamentally broken natural pagination.

The required execution sequence is:
1. Implement and verify **Natural Pagination (Normal Mode)** across the Gate 1 suite.
2. Only after Gate 1 sign-off, begin implementation of **Compact Mode** and **Force 1 Page Mode**.

---

## 4. Pre-Production Approval Gate

> [!IMPORTANT]
> **NEW TEMPLATES MUST BE APPROVED BEFORE MIGRATION**  
> Production document traffic must not be cut over to Forme on an existing document family until:
> 1. New Forme Invoice and Quotation templates have been built and tested in isolation.
> 2. Visual and mathematical regression tests pass 100% against legacy output.
> 3. User preview parity is confirmed.

---

## 5. Non-Negotiable Operational Rules

1. **DO NOT run `bun run build`:** The build command is permanently excluded due to host memory constraints.
2. **DO NOT remove `@react-pdf/renderer`:** Legacy templates must remain operational until all document families are migrated and certified.
3. **DO NOT alter business logic:** Tax rates, totals, discounts, document numbering, and Supabase schemas must not be changed.
4. **Preserve pre-existing work:** Uncommitted files outside the immediate migration scope must be preserved.
