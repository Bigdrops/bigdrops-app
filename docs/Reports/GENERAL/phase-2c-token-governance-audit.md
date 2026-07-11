# BIGDROPS Phase 2C Token Governance Audit Report

**This report was written by OpenCode on 2026-07-11 via Local Runner.**

---

## Executive Summary

| Metric | Value |
|---|---|
| Remaining active consumers | 58 occurrences |
| Unique consumer files | 20 |
| Unique consumer tokens | 14 |
| Mechanical Alias (Category 1) | 0 |
| Derived Semantic Token (Category 2) | 6 |
| Design Primitive (Category 3) | 8 |
| Dead Definition (Category 4) | 47 (40 theme + 7 local) |
| Leak Check | PASS — zero consumers outside `document-view/` |
| Orphan Check | 40 theme definitions + 7 local CSR definitions have zero consumers |

**Pre-audit baseline:** `git status` — clean working tree, branch `main` up to date with `origin/main`.

---

## Token Ledger

### Active Consumer Tokens (14 unique)

| Token | Definition Source | Consumer Files | Consumer Count | Classification | Recommended Action |
|---|---|---|---|---|---|
| `--dv-font-mono` | theme L67 | 15 files | 30 | Design Primitive | Retain |
| `--dv-font-ui` | theme L65 | 5 files | 5 | Design Primitive | Retain |
| `--dv-font-display` | theme L66 | 1 file | 1 | Design Primitive | Retain |
| `--dv-amber` | theme L42 | 1 file | 1 | Design Primitive | Retain |
| `--dv-emerald` | theme L47 | 1 file | 1 | Design Primitive | Retain |
| `--dv-sky` | theme L56 | 1 file | 1 | Design Primitive | Retain |
| `--dv-violet` | theme L57 | 2 files | 2 | Design Primitive | Retain |
| `--dv-red-accent` | theme L58 | 1 file | 1 | Design Primitive | Retain |
| `--dv-text-4` | theme L21 | 1 file | 1 | Derived Semantic | Retain |
| `--dv-csr-text-soft` | local `:root` | 1 file | 6 | Derived Semantic | Retain |
| `--dv-csr-surface-2` | local `:root` | 1 file | 1 | Derived Semantic | Retain |
| `--dv-csr-amber-dark` | local `:root` | 1 file | 1 | Derived Semantic | Retain |
| `--dv-csr-bg` | local `:root` | 1 file | 1 | Derived Semantic | Retain |
| `--dv-csr-amber-bg` | local `:root` | 1 file | 1 | Derived Semantic | Retain |

### Consumer File Breakdown

| File | Occurrences | Tokens Used |
|---|---|---|
| `csr/CsrDocumentPreview.css` | 12 | `--dv-csr-text-soft` ×6, `--dv-csr-surface-2`, `--dv-csr-amber-dark`, `--dv-csr-amber-bg`, `--dv-csr-bg`, `--dv-font-mono` ×2 |
| `shared/DocumentPreview.module.css` | 7 | `--dv-font-mono` ×7 |
| `csr/CsrSummaryStrip.module.css` | 7 | `--dv-font-mono`, `--dv-amber`, `--dv-emerald`, `--dv-sky`, `--dv-violet`, `--dv-red-accent`, `--dv-text-4` |
| `boq/BoqDocumentPreview.module.css` | 5 | `--dv-font-mono` ×5 |
| `quotation/QuotationDocumentPreview.css` | 5 | `--dv-font-mono` ×5 |
| `invoice/InvoicePaymentsSection.module.css` | 3 | `--dv-font-mono` ×3 |
| `rfq/RfqDocumentPreview.module.css` | 3 | `--dv-font-mono` ×3 |
| `csr/CsrDocumentPreview.module.css` | 2 | `--dv-font-mono` ×2 |
| `waybill/WaybillDocumentPreview.module.css` | 2 | `--dv-font-mono` ×2 |
| `waybill/WaybillSummaryStrip.module.css` | 2 | `--dv-font-mono`, `--dv-violet` |
| `boq/BoqSummaryStrip.module.css` | 1 | `--dv-font-mono` |
| `boq/BoqViewPage.module.css` | 1 | `--dv-font-ui` |
| `csr/CsrViewPage.module.css` | 1 | `--dv-font-ui` |
| `invoice/InvoiceMoneyStrip.module.css` | 1 | `--dv-font-mono` |
| `invoice/InvoiceWorkspace.module.css` | 1 | `--dv-font-mono` |
| `quotation/QuotationMoneyStrip.module.css` | 1 | `--dv-font-mono` |
| `rfq/RfqMoneyStrip.module.css` | 1 | `--dv-font-mono` |
| `rfq/RfqViewPage.module.css` | 1 | `--dv-font-ui` |
| `shared/DocumentHero.module.css` | 1 | `--dv-font-display` |
| `waybill/WaybillViewPage.module.css` | 1 | `--dv-font-ui` |

---

## Leak Check

**Result: PASS**

Zero `var(--dv-*)` consumers found outside `src/components/document-view/`. All 58 occurrences across 20 files are contained within the document-view boundary.

Verified via `rg "var\(--dv-" src/ -l | rg -v "document-view"` — no output.

---

## Orphan Check

### Orphaned Theme Definitions (40 tokens in `documentViewTheme.css`)

These tokens are defined in `documentViewTheme.css` `:root` but have **zero consumers** anywhere in the repository:

| Token | Line | Definition |
|---|---|---|
| `--dv-bg` | L5 | `hsl(var(--bd-surface))` |
| `--dv-bg-2` | L6 | `hsl(var(--bd-surface-muted))` |
| `--dv-bg-3` | L7 | `hsl(var(--bd-surface-muted) / 0.8)` |
| `--dv-surface` | L8 | `hsl(var(--bd-card-bg))` |
| `--dv-surface-2` | L9 | `hsl(var(--bd-surface-muted))` |
| `--dv-card-bg` | L10 | `hsl(var(--bd-card-bg))` |
| `--dv-surface-muted` | L11 | `hsl(var(--bd-surface-muted))` |
| `--dv-border` | L14 | `hsl(var(--bd-border))` |
| `--dv-border-soft` | L15 | `hsl(var(--bd-border) / 0.5)` |
| `--dv-text` | L18 | `hsl(var(--bd-text))` |
| `--dv-text-2` | L19 | `hsl(var(--bd-text-muted))` |
| `--dv-text-3` | L20 | `hsl(var(--bd-text-muted) / 0.8)` |
| `--dv-primary` | L24 | `hsl(var(--bd-fab-bg))` |
| `--dv-primary-bg` | L25 | `hsl(var(--bd-fab-bg) / 0.1)` |
| `--dv-primary-border` | L26 | `hsl(var(--bd-fab-bg) / 0.2)` |
| `--dv-primary-light` | L27 | `hsl(var(--bd-fab-bg) / 0.8)` |
| `--dv-primary-text` | L28 | `hsl(var(--bd-fab-text))` |
| `--dv-accent` | L31 | `hsl(var(--bd-accent))` |
| `--dv-accent-bg` | L32 | `hsl(var(--bd-accent) / 0.08)` |
| `--dv-accent-border` | L33 | `hsl(var(--bd-accent) / 0.35)` |
| `--dv-accent-hover-bg` | L34 | `hsl(var(--bd-accent) / 0.15)` |
| `--dv-brand` | L37 | `hsl(var(--bd-brand))` |
| `--dv-brand-bg` | L38 | `hsl(var(--bd-brand) / 0.1)` |
| `--dv-brand-border` | L39 | `hsl(var(--bd-brand) / 0.2)` |
| `--dv-amber-bg` | L43 | `hsl(var(--bd-status-warning-bg))` |
| `--dv-amber-border` | L44 | `hsl(var(--bd-status-warning-border))` |
| `--dv-amber-dark` | L45 | `hsl(var(--bd-status-warning-text))` |
| `--dv-emerald-bg` | L48 | `hsl(var(--bd-status-success-text) / 0.1)` |
| `--dv-emerald-border` | L49 | `hsl(var(--bd-status-success-text) / 0.2)` |
| `--dv-rose` | L51 | `hsl(var(--bd-status-danger-text))` |
| `--dv-rose-bg` | L52 | `hsl(var(--bd-status-danger-text) / 0.1)` |
| `--dv-rose-border` | L53 | `hsl(var(--bd-status-danger-text) / 0.2)` |
| `--dv-shadow-md` | L61 | `var(--bd-shadow-md)` |
| `--dv-shadow-inset-surface` | L62 | `var(--bd-shadow-sm)` |
| `--dv-shadow-sm` | L70 | `var(--bd-shadow-sm)` |
| `--dv-shadow` | L71 | `var(--bd-shadow)` |
| `--dv-shadow-lg` | L72 | `var(--bd-shadow-lg)` |
| `--dv-radius` | L75 | `var(--bd-radius-md)` |
| `--dv-radius-lg` | L76 | `var(--bd-radius-lg)` |
| `--dv-radius-xl` | L77 | `var(--bd-radius-xl)` |

### Orphaned Local CSR Definitions (7 tokens in `CsrDocumentPreview.css`)

These tokens are defined in the local `:root` block of `CsrDocumentPreview.css` but have **zero consumers** in that file or elsewhere:

| Token | Line | Definition |
|---|---|---|
| `--dv-csr-text-faint` | L3 | `hsl(var(--bd-text-muted) / 0.5)` |
| `--dv-csr-border` | L4 | `hsl(var(--bd-border))` |
| `--dv-csr-border-soft` | L5 | `hsl(var(--bd-border) / 0.65)` |
| `--dv-csr-bg-2` | L7 | `hsl(var(--bd-surface-muted) / 0.85)` |
| `--dv-csr-primary` | L8 | `hsl(var(--bd-brand))` |
| `--dv-csr-surface` | L9 | `hsl(var(--bd-surface))` |
| `--dv-csr-amber` | L11 | `hsl(var(--bd-status-warning-text))` |

---

## Final Governance Recommendation

**documentViewTheme.css CANNOT be safely reduced at this time.**

### Evidence

1. **49 total definitions, 40 orphaned** — 82% of theme definitions have zero consumers. These are strong candidates for removal.

2. **However, 9 theme tokens ARE actively consumed** (36 occurrences across 17 files): `--dv-font-mono`, `--dv-font-ui`, `--dv-font-display`, `--dv-amber`, `--dv-emerald`, `--dv-sky`, `--dv-violet`, `--dv-red-accent`, `--dv-text-4`. The font tokens alone account for 36 of 58 consumer occurrences (62%).

3. **The 40 orphaned definitions are safe to delete** — they are pure aliases with no active consumers. Deleting them would reduce the file from 78 to ~38 lines (a 51% reduction).

4. **The 9 active tokens cannot be migrated to raw `--bd-*`** because:
   - Font tokens (`--dv-font-mono`, `--dv-font-ui`, `--dv-font-display`) have no `--bd-*` equivalent
   - Status colors (`--dv-amber`, `--dv-emerald`, `--dv-sky`, `--dv-red-accent`) wrap `--bd-status-*` in `hsl()` — bare `--bd-status-*` tokens are raw HSL channels, invalid for direct CSS use
   - `--dv-violet` has no `--bd-*` counterpart at all
   - `--dv-text-4` is an opacity wrapper with no `--bd-*` equivalent

5. **The 7 local CSR orphans are safe to delete** from `CsrDocumentPreview.css` `:root` — zero consumers.

### Recommended Next Steps (not in scope for this audit)

- **Phase 3A**: Delete the 40 orphaned theme definitions from `documentViewTheme.css`
- **Phase 3B**: Delete the 7 orphaned local CSR definitions from `CsrDocumentPreview.css` `:root`
- **Phase 3C**: The 9 active theme tokens (3 fonts + 6 status/accent colors) are **permanent design primitives** — they should remain as-is until the design system introduces native font and status color tokens

---

## Post-Audit Verification

**`git status` executed after report generation:**

```
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

**Result: PASS** — zero source code files modified. Only the governance report was written.
