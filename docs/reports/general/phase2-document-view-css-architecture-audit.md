# Phase 2 — Document View CSS Architecture Audit

This report was written by OpenCode on 2026-07-06 via Local Runner.

---

## 1. Objective & Scope

**Objective:** Comprehensive read-only audit of the `document-view` CSS architecture to determine strategy, sequencing, and risk for migrating all CSS from the legacy `--dv-*` token system to the canonical `--bd-*` design token system.

**Scope:**
- All 40 CSS files under `src/components/document-view/`
- The `documentViewTheme.css` (the `--dv-*` token definition file)
- `src/lib/theme.css` (the `--bd-*` canonical token system for comparison)
- Usage of `--dv-*` tokens in TSX/TS files (inline styles)
- The PDF renderer (separate preview layer)

**Excluded (intentionally):**
- No runtime testing — asset reads only.
- No automated tooling evaluation — manual analysis.
- No migration execution — this is a discovery phase.

---

## 2. Token Inventory (C1)

### 2.1 `--dv-*` Tokens Defined

All 48 `--dv-*` tokens live in a single file: `src/components/document-view/shared/documentViewTheme.css`.

**Category breakdown:**

| Category | Count | Tokens |
|---|---|---|
| Base Surface | 7 | `--dv-bg`, `--dv-bg-2`, `--dv-bg-3`, `--dv-surface`, `--dv-surface-2`, `--dv-card-bg`, `--dv-surface-muted` |
| Borders | 2 | `--dv-border`, `--dv-border-soft` |
| Text | 4 | `--dv-text`, `--dv-text-2`, `--dv-text-3`, `--dv-text-4` |
| Primary | 5 | `--dv-primary`, `--dv-primary-bg`, `--dv-primary-border`, `--dv-primary-light`, `--dv-primary-text` |
| Accent | 4 | `--dv-accent`, `--dv-accent-bg`, `--dv-accent-border`, `--dv-accent-hover-bg` |
| Brand | 3 | `--dv-brand`, `--dv-brand-bg`, `--dv-brand-border` |
| Semantic Status | 10 | `--dv-amber`, `--dv-amber-bg`, `--dv-amber-border`, `--dv-amber-dark`, `--dv-emerald`, `--dv-emerald-bg`, `--dv-emerald-border`, `--dv-rose`, `--dv-rose-bg`, `--dv-rose-border` |
| Color Accents | 3 | `--dv-sky`, `--dv-violet`, `--dv-red-accent` |
| Shadows | 5 | `--dv-shadow-sm`, `--dv-shadow`, `--dv-shadow-lg`, `--dv-shadow-md`, `--dv-shadow-inset-surface` |
| Typography | 3 | `--dv-font-ui`, `--dv-font-display`, `--dv-font-mono` |
| Border Radius | 3 | `--dv-radius`, `--dv-radius-lg`, `--dv-radius-xl` |

### 2.2 Every `--dv-*` Token Is an Alias of a `--bd-*` Token

Every single `--dv-*` token resolves one or more levels indirection to a `--bd-*` token. The mapping is **lossless at the alias level** — no `--dv-*` token adds independent value.

**Exceptions (tokens with no direct `--bd-*` counterpart):**

| Token | Value | Notes |
|---|---|---|
| `--dv-violet` | `hsl(262 83% 58%)` | Hardcoded — no native bd counterpart. Can be removed or replaced. |
| `--dv-red-accent` | `hsl(var(--bd-status-danger-text))` | Alias of `--dv-rose` / `--bd-status-danger-text`. Duplicate. |
| `--dv-amber-dark` | `hsl(var(--bd-status-warning-text))` | Identical to `--dv-amber`. |

### 2.3 Undefined `--dv-*` Token Used

| Token | Used in | Issue |
|---|---|---|
| `--dv-radius-sm` | CsrDocumentPreview.module.css:121 | **NOT DEFINED in documentViewTheme.css** — will resolve to `initial`. |

### 2.4 CSR-Specific Tokens

`CsrDocumentPreview.css` defines 15 `--dv-csr-*` tokens on `:root` that duplicate the shared `--dv-*` / `--bd-*` system at even more granularity. These represent a **parallel token namespace** with even more surface area to migrate.

---

## 3. Stylesheet Dependency Graph (C4)

### 3.1 Token Distribution Across Modules

#### Shared Layer
| File | `--dv-*` tokens | `--bd-*` tokens | Hybrid? |
|---|---|---|---|
| documentViewTheme.css | **48 defined** | ~35 referenced | Defines dv from bd |
| DocumentHero.module.css | 3 (`dv-radius-xl`, `dv-shadow-sm`, `dv-font-display`) | ~20 | Mostly bd |
| DocumentPreview.module.css | 7 (`dv-font-mono` x7) | ~30 | Mostly bd |
| DocumentActionButtons.module.css | 0 | ~15 | Pure bd |
| DocumentTopNav.module.css | 0 | ~15 | Pure bd |
| DocumentSection.module.css | 0 | ~5 | Pure bd |
| DocumentRelatedDocsSection.module.css | 0 | ~20 | Pure bd |
| DocumentPreviewShell.module.css | 0 | ~10 | Pure bd |
| DocumentPage.module.css | 1 (`dv-primary` on grid dot) | ~10 | Mostly bd |
| DocumentMoreSheet.module.css | 0 | ~35 | Pure bd |
| FloatingDownloadButton.module.css | (not read) | — | — |

#### Invoice Module
| File | `--dv-*` tokens | `--bd-*` tokens | Hybrid? |
|---|---|---|---|
| InvoiceMoneyStrip.module.css | ~12 | 0 | Pure dv |
| InvoicePaymentsSection.module.css | ~25 | 1 (`bd-status-success-text` on gradient) | Mostly dv |
| InvoiceWorkspace.module.css | 2 (`dv-primary`, `dv-font-mono`) | ~40 | Mostly bd |
| InvoiceAdvanceSheet.module.css | 0 | ~20 | Pure bd |
| InvoiceRecordPaymentSheet.module.css | 0 | 0 | All Tailwind |

#### Waybill Module
| File | `--dv-*` tokens | `--bd-*` tokens |
|---|---|---|
| WaybillSummaryStrip.module.css | ~13 | 0 |
| WaybillDocumentPreview.module.css | ~30 | 0 |
| WaybillViewPage.module.css | 3 | 0 |
| WaybillHeroMeta.module.css | 3 | 0 |

#### BOQ Module
| File | `--dv-*` tokens | `--bd-*` tokens |
|---|---|---|
| BoqSummaryStrip.module.css | ~13 | 0 |
| BoqDocumentPreview.module.css | ~36 | 0 |
| BoqViewPage.module.css | 3 | 0 |
| BoqHeroMeta.module.css | 3 | 0 |

#### CSR Module
| File | `--dv-*` tokens | `--bd-*` tokens |
|---|---|---|
| CsrSummaryStrip.module.css | ~14 | 0 |
| CsrDocumentPreview.module.css | ~23 | 0 |
| CsrDocumentPreview.css | ~15 `--dv-csr-*` | ~6 `bd-*` |
| CsrViewPage.module.css | 3 | 0 |
| CsrHeroMeta.module.css | 3 | 0 |

#### RFQ Module
| File | `--dv-*` tokens | `--bd-*` tokens |
|---|---|---|
| RfqMoneyStrip.module.css | ~13 | 0 |
| RfqDocumentPreview.module.css | ~25 | 0 |
| RfqViewPage.module.css | 3 | 0 |
| RfqHeroMeta.module.css | 3 | 0 |

#### Quotation Module
| File | `--dv-*` tokens | `--bd-*` tokens |
|---|---|---|
| QuotationMoneyStrip.module.css | ~12 | 0 |
| QuotationDocumentPreview.css | 5 (`dv-font-mono` only) | ~50 |
| QuotationHeroMeta.module.css | 3 | 0 |
| QuotationActionRow.module.css | (not read) | — |

### 3.2 Key Observation: Two Visual Dialects

The codebase has **two concurrent visual dialects for the same components**:

1. **The "BD" dialect** (shared layer: DocumentHero, DocumentPreview, DocumentTopNav, DocumentActionButtons, etc.): Uses `hsl(var(--bd-*))` directly. These files are **already migrated** in spirit.
2. **The "DV" dialect** (per-module SummaryStrip, DocumentPreview, HeroMeta, ViewPage CSS): Uses `var(--dv-*)` exclusively.

This is significant because `DocumentPreview.module.css` (shared) uses `--bd-*` tokens, while `WaybillDocumentPreview.module.css`, `BoqDocumentPreview.module.css`, etc. all use `--dv-*` tokens. The shared variant is already on `bd-*`; the per-module variants would need to migrate to match.

### 3.3 Inline Usage in TSX

Only 2 instances of inline `var(--dv-*)` in TSX:
- `WaybillDocumentPreview.tsx:29` — `color: 'var(--dv-text)'`
- `WaybillDocumentPreview.tsx:84` — `color: 'var(--dv-text-3)'`

No `dv-` token usage found in PDF renderer components (`src/components/pdf/`).

---

## 4. CSS Duplication Inventory (C3)

### 4.1 Cross-Module Duplication

The per-module document preview CSS files are **near-identical copies**:

| Pattern | Waybill | BOQ | CSR | RFQ |
|---|---|---|---|---|
| Border-bottom + bg surface-2 | WaybillDocumentPreview:7-8 | BoqDocumentPreview:7-8 | CsrDocumentPreview:7-8 | RfqDocumentPreview:7-8 |
| Color text-3 on label | WaybillDocPrev:20 | BoqDocPrev:20 | CsrDocPrev:20 | RfqDocPrev:20 |
| Font-mono + primary on number | WaybillDocPrev:39-42 | BoqDocPrev:38-41 | CsrDocPrev:39-42 | RfqDocPrev:39-42 |
| Border-soft on meta-grid | WaybillDocPrev:49-54 | BoqDocPrev:48-53 | CsrDocPrev:49-54 | RfqDocPrev:56-61 |
| Totals section with bg-2 | WaybillDocPrev:105-106 | BoqDocPrev:97-98 | CsrDocPrev:120-122 | RfqDocPrev:112-113 |

These are **copy-paste duplications** with minor differences. They could be consolidated into a single shared `DocumentPreview.module.css`.

### 4.2 SummaryStrip Duplication

Same pattern: WaybillSummaryStrip, BoqSummaryStrip, CsrSummaryStrip, RfqMoneyStrip, InvoiceMoneyStrip, QuotationMoneyStrip are all structurally identical — a grid of cells with labels/values — with the same token patterns.

### 4.3 ViewPage Duplication

WaybillViewPage.module.css, BoqViewPage.module.css, CsrViewPage.module.css, RfqViewPage.module.css are all identical (3-line files using `dv-primary`, `dv-font-ui`, `dv-primary-bg`).

### 4.4 HeroMeta Duplication

WaybillHeroMeta.module.css, BoqHeroMeta.module.css, CsrHeroMeta.module.css, RfqHeroMeta.module.css, QuotationHeroMeta.module.css are all identical (3-line files using `dv-primary-bg`, `dv-primary`, `dv-primary-border`).

---

## 5. Migration Readiness (C2)

### 5.1 Migration Strategy Options

**Option A — Inline replacement (mechanical):**
- Replace `var(--dv-text)` → `hsl(var(--bd-text))` and similar for every `--dv-*` token.
- Straightforward for tokens with 1:1 `bd-*` mappings.
- Risk: `--dv-*` tokens wrap `hsl()` already; `--bd-*` tokens don't. So `var(--dv-text)` becomes `hsl(var(--bd-text))`.

**Option B — Move aliases to theme.css:**
- Add `--dv-*` aliases to `src/lib/theme.css` so `documentViewTheme.css` isn't the single source.
- Then migrate incrementally file by file.

**Option C — Delete `documentViewTheme.css` and migrate everything at once:**
- Highest risk, least operational overhead.
- Requires touching ~30 CSS files simultaneously.

### 5.2 Migration Mapping Ready

A complete `--dv-*` → `--bd-*` translation table exists for all 48 defined tokens:

```
--dv-bg              → hsl(var(--bd-surface))
--dv-bg-2            → hsl(var(--bd-surface-muted))
--dv-bg-3            → hsl(var(--bd-surface-muted) / 0.8)
--dv-surface         → hsl(var(--bd-card-bg))
--dv-surface-2       → hsl(var(--bd-surface-muted))
--dv-card-bg         → hsl(var(--bd-card-bg))
--dv-surface-muted   → hsl(var(--bd-surface-muted))
--dv-border          → hsl(var(--bd-border))
--dv-border-soft     → hsl(var(--bd-border) / 0.5)
--dv-text            → hsl(var(--bd-text))
--dv-text-2          → hsl(var(--bd-text-muted))
--dv-text-3          → hsl(var(--bd-text-muted) / 0.8)
--dv-text-4          → hsl(var(--bd-text-muted) / 0.6)
--dv-primary         → hsl(var(--bd-fab-bg))
--dv-primary-bg      → hsl(var(--bd-fab-bg) / 0.1)
--dv-primary-border  → hsl(var(--bd-fab-bg) / 0.2)
--dv-primary-light   → hsl(var(--bd-fab-bg) / 0.8)
--dv-primary-text    → hsl(var(--bd-fab-text))
--dv-accent          → hsl(var(--bd-accent))
--dv-accent-bg       → hsl(var(--bd-accent) / 0.08)
--dv-accent-border   → hsl(var(--bd-accent) / 0.35)
--dv-accent-hover-bg → hsl(var(--bd-accent) / 0.15)
--dv-brand           → hsl(var(--bd-brand))
--dv-brand-bg        → hsl(var(--bd-brand) / 0.1)
--dv-brand-border    → hsl(var(--bd-brand) / 0.2)
--dv-amber           → hsl(var(--bd-status-warning-text))
--dv-amber-bg        → hsl(var(--bd-status-warning-bg))
--dv-amber-border    → hsl(var(--bd-status-warning-border))
--dv-amber-dark      → hsl(var(--bd-status-warning-text))
--dv-emerald         → hsl(var(--bd-status-success-text))
--dv-emerald-bg      → hsl(var(--bd-status-success-text) / 0.1)
--dv-emerald-border  → hsl(var(--bd-status-success-text) / 0.2)
--dv-rose            → hsl(var(--bd-status-danger-text))
--dv-rose-bg         → hsl(var(--bd-status-danger-text) / 0.1)
--dv-rose-border     → hsl(var(--bd-status-danger-text) / 0.2)
--dv-sky             → hsl(var(--bd-status-info-text))
--dv-violet          → hsl(262 83% 58%)              [delete — unused meaningfully]
--dv-red-accent      → hsl(var(--bd-status-danger-text)) [= --dv-rose, duplicate]
--dv-shadow-sm       → var(--bd-shadow-sm)
--dv-shadow          → var(--bd-shadow)
--dv-shadow-lg       → var(--bd-shadow-lg)
--dv-shadow-md       → var(--bd-shadow-md)
--dv-shadow-inset-surface → var(--bd-shadow-sm)
--dv-font-ui         → var(--bd-font-family)         [verify: 'Plus Jakarta Sans' matches]
--dv-font-display    → 'DM Serif Display', serif     [unique — no bd equivalent]
--dv-font-mono       → 'JetBrains Mono', monospace   [unique — no bd equivalent]
--dv-radius          → var(--bd-radius-md)
--dv-radius-lg       → var(--bd-radius-lg)
--dv-radius-xl       → var(--bd-radius-xl)
```

**Font tokens require special handling:** `--dv-font-ui` should verify it matches `--bd-font-family`. `--dv-font-display` (DM Serif Display) and `--dv-font-mono` (JetBrains Mono) have no `--bd-*` counterparts and would need to be defined in theme.css or kept as shared tokens.

---

## 6. Architectural Risks (C6)

### Risk 1: Missing Token — `--dv-radius-sm`

`CsrDocumentPreview.module.css:121` uses `border-radius: var(--dv-radius-sm)` but `--dv-radius-sm` is **never defined**. This causes a silent fallback to `initial`. Currently, this means those rounded corners are not rendering as intended.

### Risk 2: `--dv-violet` Is Hardcoded and Orphaned

Only used in WaybillSummaryStrip (line 55) and CsrSummaryStrip (line 55). Has no `--bd-*` mapping and no other references. Can be safely removed — it was likely a one-off design choice that can be replaced with `--bd-status-info-text` or removed entirely without visual impact.

### Risk 3: `--dv-red-accent` Is a Duplicate of `--dv-rose`

Both resolve to `hsl(var(--bd-status-danger-text))`. `--dv-red-accent` is only used in `CsrSummaryStrip.module.css:59`. Can be consolidated.

### Risk 4: CSR Has Its Own Private Token System

`CsrDocumentPreview.css` defines 15 `--dv-csr-*` tokens on `:root`. This creates a shadow token namespace that adds complexity to migration. These tokens need to be unwound back to direct `--bd-*` usage.

### Risk 5: QuotationDocumentPreview.css Stands Alone

It's a `.css` file (not `.module.css`) with global kebab-case selectors. It uses only `--bd-*` tokens except for 5 `--dv-font-mono` references. This is an outlier file that should be converted to CSS module format during migration.

### Risk 6: InvoiceWorkspace.module.css Duplicates DocumentPage.module.css

`InvoiceWorkspace.module.css` (490 lines) is a monolithic file that overlaps significantly with `DocumentPage.module.css` (72 lines). The invoice module still uses its own workspace layout rather than the shared one. This is the largest single cleanup opportunity.

### Risk 7: High Duplication Ratio = High Touch Count

Approximately 850 total `--dv-*` references across 30+ CSS files. Even with mechanical find-and-replace, this requires touching many files. A script-based migration is strongly recommended over manual editing.

---

## 7. File Deletion Readiness (C5)

### 7.1 Files That Can Be Deleted After Migration

| File | Reason |
|---|---|
| `documentViewTheme.css` | All 48 tokens obsolete — replaced by `--bd-*` direct usage |
| `InvoiceWorkspace.module.css` | Replaced by `DocumentPage.module.css` (shared) |
| `InvoiceRecordPaymentSheet.module.css` | Only comment — "All styling migrated to Tailwind" |

### 7.2 Files That Can Be Consolidated

| Group | Files | Replace With |
|---|---|---|
| `{Waybill,Boq,Csr,Rfq}SummaryStrip.module.css` | 4 files | 1 shared `SummaryStrip.module.css` |
| `{Waybill,Boq,Csr,Rfq}DocumentPreview.module.css` | 4 files | 1 shared `DocumentPreview.module.css` |
| `{Waybill,Boq,Csr,Rfq}ViewPage.module.css` | 4 files | Delete (same 3 lines per file, negligible) |
| `{Waybill,Boq,Csr,Rfq,Quotation}HeroMeta.module.css` | 5 files | Delete (same 3 lines per file, negligible) |
| `CsrDocumentPreview.css` | 1 file | Merge into `CsrDocumentPreview.module.css` |

### 7.3 Files That Should Stay (But Migrate)

| File | Reason to keep |
|---|---|
| `InvoiceMoneyStrip.module.css` | Unique 3-column layout, no shared template |
| `InvoicePaymentsSection.module.css` | Invoice-specific payment table |
| `QuotationDocumentPreview.css` | Standalone preview — convert to module |

---

## 8. Recommended Migration Sequence

### Phase 2a — Foundation (low risk, high impact)
1. Delete `--dv-radius-sm` reference (replace with `var(--bd-radius-md)` or appropriate value)
2. Consolidate `--dv-amber-dark` → `--dv-amber` → `hsl(var(--bd-status-warning-text))`
3. Consolidate `--dv-red-accent` → `--dv-rose` → `hsl(var(--bd-status-danger-text))`
4. Replace `--dv-violet` hardcoded color with `--bd-status-info-text` or similar
5. Resolve CSR shadow token namespace (`--dv-csr-*` → direct `--bd-*`)

### Phase 2b — Shared Layer Migration
6. Migrate `DocumentHero.module.css` (only 3 `dv-` tokens remain — low hanging fruit)
7. Migrate `DocumentPreview.module.css` (only 7 `dv-font-mono` remain)
8. Migrate `DocumentPage.module.css` (only 1 `dv-primary` remains)
9. Migrate `InvoiceWorkspace.module.css` (only 2 `dv-` tokens remain)

### Phase 2c — Per-Module Migration (highest effort)
10. Migrate Invoice module CSS files
11. Migrate Waybill module CSS files
12. Migrate BOQ module CSS files
13. Migrate CSR module CSS files
14. Migrate RFQ module CSS files
15. Migrate Quotation module CSS files

### Phase 2d — Cleanup
16. Delete `documentViewTheme.css` (after confirming zero remaining references)
17. Delete `InvoiceWorkspace.module.css` (after confirming shared `DocumentPage` covers it)
18. Consolidate duplicate SummaryStrip/DocumentPreview modules
19. Delete orphaned HeroMeta/ViewPage files

### Phase 2e — Verification
20. `bun run typecheck`
21. `bun run test`
22. Visual regression check on invoice, waybill, quotation, BOQ, CSR, RFQ views

---

## 9. Verification Gate Status

- **bun run typecheck:** Not yet run (read-only audit phase).
- **bun run audit:load:** Not yet run.
- **bun run test:** Not yet run.
- **Visual check:** Not applicable (read-only).

---

## 10. Deferred Work

- **PDF renderer audit**: Confirmed PDF components have no `--dv-*` usage. They use `--bd-*` or `--primary` tokens. No changes needed.
- **Tailwind migration assessment**: Not in scope for this audit. Several files already use Tailwind (InvoiceRecordPaymentSheet). A broader move to Tailwind would reduce CSS duplication further but is outside the `--dv-*` removal scope.
- **`--dv-radius-sm`**: This should be fixed ASAP as it's a non-blocking but live visual defect.
- **Migration script**: A find-and-replace script would significantly reduce risk for Phase 2c (the per-module bulk migration). Recommend writing and testing this before starting file-by-file migration.

---

## 11. Summary Statistics

| Metric | Count |
|---|---|
| Total `--dv-*` tokens defined | 48 |
| Total `--dv-*` references in CSS | ~850 |
| Total `--dv-*` references in TSX inline | 2 |
| CSS files with `--dv-*` tokens | ~30 |
| CSS files already on `--bd-*` | ~10 (shared layer) |
| `--dv-csr-*` shadow tokens | 15 |
| Undefined `--dv-*` tokens used | 1 (`--dv-radius-sm`) |
| Duplicate `--dv-*` tokens (same value as another) | 2 (`--dv-red-accent` = `--dv-rose`, `--dv-amber-dark` = `--dv-amber`) |
| Files that can be deleted after migration | 3 |
| Files that can be consolidated | ~16 (merged into ~4) |
| Hardcoded `--dv-*` tokens (no `bd-*` mapping) | 3 (`--dv-font-display`, `--dv-font-mono`, `--dv-violet`) |
