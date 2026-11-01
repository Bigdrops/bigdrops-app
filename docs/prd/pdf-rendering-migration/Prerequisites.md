# 🚦 Prerequisites & Readiness Gates — PDF Rendering Migration

- **Status:** AUTHORITATIVE READINESS GATES & PRE-IMPLEMENTATION CHECKLISTS
- **Writing Standard:** ASD-STE100 Simplified Technical English
- **Owner:** BOUXRE Engineering & Architecture
- **Purpose:** Compulsory gates that all agents and developers must verify before starting software implementation.

---

## 1. Diagnostic & Architecture Baseline Sign-Off

Before any template or infrastructure implementation begins in Forme, the following foundational reports must be approved as the technical baseline:

- [x] **Baseline 1: Industry Template & Character Corruption Investigation**  
  File: [`docs/reports/2026-10-30-forme-invoice-quotation-industry-template-investigation.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/reports/2026-10-30-forme-invoice-quotation-industry-template-investigation.md)  
  *Evidence:* Observed reproduction of double-prime (`″`) corruption into digits `23`, `33`, `43` in `SASQUO-000428.pdf`.

- [x] **Baseline 2: Natural Pagination Root Cause Investigation**  
  File: [`docs/reports/2026-10-30-industry-invoice-quotation-natural-pagination-investigation.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/reports/2026-10-30-industry-invoice-quotation-natural-pagination-investigation.md)  
  *Evidence:* Indivisible 113.73 pt closing block breaking to Page 2 in `SASQUO-000427` despite 75.25 pt free space on Page 1; narrow 58 pt make column width; defensive 48 pt footer padding.

- [x] **Baseline 3: M1A PDF Architecture Contracts & Responsibility Definition**  
  File: [`docs/reports/pdf/m1a-pdf-architecture-contracts-and-responsibility-definition.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/reports/pdf/m1a-pdf-architecture-contracts-and-responsibility-definition.md)  
  *Evidence:* Formally established boundaries across Domain Preparation, Master Resolver, Customization Engine, Presentation Layer, Forme Engine, and Composite Delivery.

- [x] **Baseline 4: M1B Shared Font and Image Asset Infrastructure Specification**  
  File: [`docs/reports/pdf/m1b-shared-font-and-image-asset-infrastructure-specification.md`](file:///c:/Users/DELL/Desktop/bigdrops-app/docs/reports/pdf/m1b-shared-font-and-image-asset-infrastructure-specification.md)  
  *Evidence:* TrueType SFNT stream requirement; WOFF rejection by Forme; variable font exclusion; confirmed PDFKit hex serialization root cause for $2'' \to 23$; browser CORS reality; Text Preservation Rule.

---

## 2. Mandatory Verification Gates

| Gate ID | Verification Item | Target Standard | Verification Method | Status |
| :--- | :--- | :--- | :--- | :--- |
| **G-01** | **Git Working Tree State** | Working directory clean or only contains documented CSR / report files. No collisions. | `git status` | [x] PASSED |
| **G-02** | **AGENTS.md Understanding** | Review execution rules, safe edit rules, and hardware limits. | Read `AGENTS.md` | [x] PASSED |
| **G-03** | **Skills Loaded** | Load skills from `docs/PROJECTSKILLINDEX.md` (`pdf-rendering-correctness`, etc.). | Skill review | [x] PASSED |
| **G-04** | **Engine Dependencies** | Verify `@formepdf/react` (v0.20.1) and `@formepdf/core` (v0.20.1) installed in `package.json`. Confirm `@react-pdf/renderer` (v4.5.1) remains pinned for legacy templates. | Inspect `package.json` | [x] VERIFIED IN REPO |
| **G-05** | **Static Font Assets & Sourcing** | Procure static TrueType (`.ttf`) binaries for the four consolidated families: `Inter` (Regular, Bold), `Archivo Black` (Regular — verified in `public/fonts/`), `Caveat` (Regular, Bold), and `Noto Sans` (Regular). Retired fonts (`Patrick Hand`, `Handlee`, `Kalam`, `Reenie Beanie`, `Sue Ellen Francisco`) are excluded from procurement. Verify OFL licenses. | File system, cmap & license audit | [ ] PENDING M1B.1 EXECUTION |
| **G-06** | **Reference Corpus & Test Suite** | Confirm test files exist in `docs/templates/ref-invquo/`: `SASQUO-000427 (1).pdf`, `SASQUO-000428.pdf`, `SASQUO-430 (1).pdf`. | File system check | [x] PASSED |
| **G-07** | **Static Typecheck Baseline** | Run `bun run audit:load` followed by `bun run typecheck`. Baseline must pass before code modifications. | Shell command execution | [ ] IMPLEMENTATION GATE |
| **G-08** | **PO Canonical Preparation Contract** | Implement `preparePurchaseOrderDocument.ts` in `src/domain/pdf/resolver/commercial/` to resolve the PO canonical data preparation gap. | Code implementation | [ ] PENDING M1C EXECUTION |
| **G-09** | **Dual-Runtime Font Resolution** | Update `src/components/pdf/forme/fonts.ts` to resolve filesystem paths (`public/fonts/*.ttf`) in Bun CLI tests and public URLs (`/fonts/*.ttf`) in browser/Capacitor. | Code implementation | [ ] PENDING M1B.2 EXECUTION |
| **G-10** | **CORS-Aware Non-Throwing Media** | Implement `mediaResolver.ts` returning base64 data URIs on fetch success, and graceful null on CORS/network failure. | Code implementation | [ ] PENDING M1B.3 EXECUTION |

### 2.1 Gate G-05 Consolidated Four-Family Asset Inventory

Before Milestone M1B font implementation can be signed off, the following static TrueType (`.ttf`) files must be procured and placed into `public/fonts/`:

1. **Commercial & System Workhorse:**
   - `Inter-Regular.ttf` & `Inter-Bold.ttf` (v4.0 static release; must contain Naira `₦` and primes `′`, `″`).
2. **Display Typography:**
   - `ArchivoBlack-Regular.ttf` (✅ already verified in `public/fonts/ArchivoBlack-Regular.ttf`, 90,988 bytes).
3. **Sole Handwriting-Style Font (CSR & Waybill):**
   - `Caveat-Regular.ttf` & `Caveat-Bold.ttf` (replaces all historical handwriting choices).
4. **Global Currency & Special Character Fallback:**
   - `NotoSans-Regular.ttf` (static fallback for non-Latin currency and symbol defense-in-depth).

> [!NOTE]
> **RETIRED FONTS REMOVAL CONFIRMED**  
> `Patrick Hand`, `Handlee`, `Kalam`, `Reenie Beanie`, and `Sue Ellen Francisco` have been retired from production typography and their obsolete assets removed from `src/assets/pdf-fonts/`. No additional handwriting font binaries are required.


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
> 2. Supplier-facing PO template is integrated into the shared commercial infrastructure.
> 3. Visual and mathematical regression tests pass 100% against legacy output.
> 4. User preview parity is confirmed.

---

## 5. Non-Negotiable Operational Rules

1. **DO NOT run `bun run build`:** The build command is permanently excluded due to host memory constraints.
2. **DO NOT remove `@react-pdf/renderer`:** Legacy templates must remain operational until all eight document families are migrated and certified.
3. **DO NOT alter business logic:** Tax rates, totals, discounts, document numbering, and Supabase schemas must not be changed.
4. **Preserve pre-existing work:** Uncommitted files outside the immediate migration scope must be preserved.
5. **No silent content sanitization:** Text entered by users must not be altered, stripped, or rewritten by automated sanitizers.
