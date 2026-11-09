# BOURXE — Commercial PDF Palette Isolation & Visual Fidelity: Independent Closeout Audit

**Commit audited:** `f094443a` — `fix(pdf): isolate intrinsic-palette templates from app-theme accent bleed; fix Architectural logo cramping` (HEAD, Mon Nov 9 2026 09:09:18 +0100, Bigdrops <jaiyewisdom@gmail.com>)
**Audit date:** 2026-11-09 (local)
**Audit type:** Independent, zero-code audit. No application code, SQL, tests, templates, preview assets, or configuration were modified. This report is the only file created by the audit.
**Verdict: PARTIAL.** The committed fix closes the confirmed amber-bleed defect on every Invoice/Quotation PDF route that exists in the repository, and it improves Architectural logo geometry. Visual acceptance remains OPEN. The commit alone does not deliver the previously claimed state in Executive and Heritage House (they still carry internal labels and unconditional signature furniture at HEAD); those corrections exist only as uncommitted working-tree edits. Several concrete defects and risks are recorded below, ordered by severity.

> Governing prior decision (unchanged): inspection of actual rendered output outranks claims in the previous implementation report. The previous report marked visual acceptance PASS in its summary while admitting in section 3/6.1 that actual PDFs were never inspected. That limitation is upheld here. Visual acceptance is **OPEN**.

---

## 1. Commit and working-tree scope

`git status --short` before investigation (captured 2026-11-09 ~11:5x, verbatim in `C:\Users\DELL\AppData\Local\Temp\opencode\git-status-before-audit.txt`):

- **Modified (pre-existing, uncommitted, NOT part of f094443a):** App-update suite (`ApkUpdatePlugin.java`, `AppShell.tsx`, `UpdateBanner.tsx`, `UpdateSheet.tsx`, `updateStateMachine.ts`, `useAppUpdate.ts`, `downloadFailure.ts`, design-lab screens), **all five regenerated template preview PNGs** (`architectural`, `executive`, `heritage`, `industry`, `landscape`), **`ExecutiveFormeDocument.tsx`, `HeritageHouseFormeDocument.tsx`, `IndustryFormeDocument.tsx`, `LandscapeFormeDocument.tsx`**, `CommercialTemplatePicker.tsx`, `TemplatePickerCarousel.tsx`, all five relevant PDF test files, plus untracked PO theme/experiment files.
- **Committed in f094443a (the audit target):** `src/domain/invoice/types.ts` (+12), `src/components/document-view/invoice/invoicePdfActions.ts` (+11/-), `src/domain/quotation/pdfDownloadHandler.ts` (+8/-), `src/components/pdf/forme/ArchitecturalFormeDocument.tsx` (228/-).
- **Working-tree times precede the commit for the Forme files** (Executive/Heritage 08:19, Industry 08:13, Landscape 06:59, previews 08:15) relative to Commit time 09:09; ArchitecturalFormeDocument.tsx was written 08:58 and committed at 09:09. The commit therefore captured Architectural only; Executive/Heritage/Industry/Landscape/previews/picker/tests are parallel uncommitted work by the same project, sitting in the same tree.
- **Consequence:** anything below that cites both a committed line and a "working tree" line is deliberate. The committed artifact and the artifact current code would render are different for Executive and Heritage House.

**Static verification of scope:** no application source files were modified by this audit (git status after investigation matches the before snapshot plus the single new `docs/Reports/…-independent-audit.md` entry). `bun run build`, `bun run typecheck`, `bun run lint`, and `bun run test` were **not** run. The HTML reference templates, `scripts/generate-commercial-template-previews.ts`, the preview PNGs, and all four committed files are byte-identical to before the audit.

## 2. Confirmed root cause (defect 1) — verified against the prior conclusion

The prior report's root-cause claim is **confirmed**, with one precision: it named one origin file but there are two independent localStorage-backed preset readers feeding the same contamination path.

1. `getPdfDesignPreset()` (`src/lib/pdfDesignPreset.ts:251`) reads `invoice_pdf_design_preset` / `quotation_pdf_design_preset` (`DESIGN_PRESET_KEYS`, lines 47-54) directly from `localStorage`. Saved JSON can carry `{ useCustomColors: true, accentColor: '<amber>' }` (amber is literally a `PDF_ACCENT_SWATCHES` member, `#f59e0b`, line 92; theme amber tokens are `#d97706`/`#f59e0b` in `src/styles/formTheme.css:154,307` and `src/lib/themePresets.ts` amber-terracotta).
2. `resolveCommercialDesignPreset()` (`src/domain/pdf/customization/commercial.ts:151-170`) layers the engine's saved settings on top via `resolveFull(...)` (`src/domain/pdf/customization/resolver.ts`) and **overwrites** `useCustomColors` with `settings.accentEnabled` (line 168), where a stored accent implies `accentEnabled` defaults true (`resolver.ts:90-92`). Either way, `useCustomColors: true` can reach the pipeline.
3. The single shared preset was attached to the document model regardless of active template (`invoicePdfActions.ts` pre-fix; `pdfDownloadHandler.ts:177`).
4. `adaptCommercialDocumentData()` (`src/components/pdf/industryAdapter.ts:514-524`) copied `useCustomColors`/`accentColor` into `design`; `resolveDesignTokens()` (`src/components/pdf/designTokens.ts:16-45`) returned non-null `accentColor`; the Forme `|| TEMPLATE_TOKEN` fallbacks never fired. Architectural (and the working-tree Executive/Heritage) were thus rendered with the saved amber.
5. Fonts flow the same way: `useCustomFonts` (persisted by `persistCommercialDesignPreset()`, `commercial.ts:102-116`) is **not** suppressed by the new guard.

**Precision added by this audit:** the defect was not exclusively the invoice action path. The quotation path had the identical call, and `ViewQuotation.tsx` calls `persistCommercialDesignPreset('quotation', customization)` (line 119) while `InvoiceOverlays.tsx` calls it for `'invoice'` (line 184), so **the shared keys are actively (re)written with `useCustomColors: true` whenever a user toggles the accent switch on, even while an intrinsic-palette template is selected**. The guard at the two PDF build sites neutralizes the effect downstream, but the stale/promoted values keep living in storage.

**Confirmed vs possible secondary causes.** Confirmed root cause: unfiltered shared `useCustomColors` crossing the template boundary at payload assembly. Possible secondary causes (unverified, not needed to explain the defect): `normalizeHexColor` accepts 3/4/8-digit inputs only in 6-digit form (mismatched stored values silently fall back), and `useCustomFonts: true` is persisted on every save even if the user never changed fonts (`commercial.ts:111-112`).

## 3. Fix assessment — what the commit does and does not close

The commit adds `isIntrinsicPaletteTemplate()` (`src/domain/invoice/types.ts:107-117`, set = `{architectural, executive, heritage}` at lines 113) and guards both PDF payload builders:

- Invoice: `src/components/document-view/invoice/invoicePdfActions.ts:207-214` — resolves `targetTemplateId` (normalized, line 44) and forces `useCustomColors: false` before attaching the preset to the model.
- Quotation: `src/domain/quotation/pdfDownloadHandler.ts:39-46` — now declares `templateId` first, then forces `useCustomColors: false`.

**Assessment (source-level, confirmed):**
- With `useCustomColors: false`, `resolveDesignTokens()` returns `accentColor: null` (and all color tokens null), so the intrinsic fallbacks activate. The defect this commit targeted is closed on those two call sites.
- `isIntrinsicPaletteTemplate()` is applied **after** `normalizeInvoicePdfTemplateId()` in both builders, so legacy stored ids (`architectural-frame`, `heritage-house`) resolve correctly before the guard. The helper itself does not normalize (`'Architectural'`, `'heritage-house'` passed directly returns `false`) — safe today, brittle for future direct callers.
- PO path carries **no** design preset at all (`preparePurchaseOrderDocument.ts:325` sets only `{ name: templateId }`), so `design.useCustomColors` is `false` and intrinsic palettes hold regardless of the guard. Verified separately below.
- PDFCN registry loads only `Industry` renderers (`src/components/pdf/pdfcn/commercial.ts`), so no intrinsic template flows through the PDFCN render path.

**Assessment (defects in or around the fix):**

| ID | Severity | Defect |
|----|----------|--------|
| D-01 | High | The fix is a **point-of-use filter**, not a correction of the shared preset or of `resolveCommercialDesignPreset()`. Any present/future call site that builds a `CommercialDocumentData` model without calling the guard re-opens the bleed. There is no test or lint protecting "all constructions of `template: { designPreset }`" — today the only constructors are the two guarded builders and the preview-PNG fixture. |
| D-02 | High | Committed Executive and Heritage House still render internal template labels and unconditional signature furniture (see §6.4, §7). The Architectural cleanup shipped in-commit; equivalent Executive/Heritage cleanup exists only as **uncommitted working-tree edits**. f094443a does not stand alone for the stated "all three templates" objective. |
| D-03 | Medium | Custom-accent override is not a supported path for intrinsic templates, contrary to the persisted UX (the customize panel still offers the accent toggle and `persistCommercialDesignPreset()` happily writes `useCustomColors: true` to the shared key). Selecting Architectural/Executive/Heritage and enabling accent yields a **silent no-op** in the PDF. Either the toggle must be disabled in UI for these templates, or the guard authors an explicit documented override. This audit records the restriction as deliberate, per the resolved conflict; the report's "Explicit custom accent overrides continue working when enabled" claim is false end-to-end (it is true component-locally in tests only). |
| D-04 | Medium | `useCustomFonts: true` from a stale save flows unchanged into intrinsic-palette templates (guard touches colors only). Fonts, not palette, remain user-overridable — acceptable product decision, but undocumented and untested as such. |
| D-05 | Low | `copperLight` is `tokens.accentColor || ARCHITECTURAL_TOKENS.copperLight` (`ArchitecturalFormeDocument.tsx:109`); working-tree `goldLight` (`ExecutiveFormeDocument.tsx:111`) and `_bronzeLight` (`HeritageHouseFormeDocument.tsx:107`, unused, underscore-prefixed) repeat the pattern. When a custom accent does apply, the light tone collapses to the same hex — the HTML two-tone hierarchy disappears. Latent only (unreachable under the default guard), but wrong if the override restriction is ever relaxed. |
| D-06 | Low | Logo aspect ratio still not preserved (§6.3). Signature-name fallbacks still render label-like strings (§7.4). ❖ divider renders as `?` (§6.6). All present at HEAD. |

## 4. Rendering-path map (Invoice / Quotation / PO, all verified)

| # | Path | Entry → Payload → Adapter → Renderer | Amber reachable? | Evidence |
|---|------|--------------------------------------|------------------|----------|
| 1 | Invoice download | `useInvoiceActions.ts:85,286` → `downloadInvoicePdfDocument` → `buildInvoicePdfPayload` (`invoicePdfActions.ts:29`) → guard L207-214 → `adaptCommercialDocumentData` (`industryAdapter.ts:514-524`) → `generatePdfAsset` (`components/pdf/index.ts:147-194`) → Forme Architectural/Executive/Heritage | **No** (useCustomColors forced false) | Read |
| 2 | Invoice preview/share overlay | `InvoiceOverlays.tsx:213` → `getInvoicePdfBlob` → same builder & guard | **No** | Read |
| 3 | Quotation download | `ViewQuotation.tsx:55` → `handleDownloadQuotationPdf` → `buildQuotationPdfPayload` (`pdfDownloadHandler.ts:29`) with guard L39-46 | **No** | Read |
| 4 | Quotation preview | `ViewQuotation.tsx:153` → `getQuotationPdfBlob` → same guarded builder | **No** | Read |
| 5 | Purchase Order download | `PurchaseOrderDetail.tsx:191-208` → `preparePurchaseOrderDocument(po, {settings})` → `generatePurchaseOrderPdf({ model, templateId: custom_fields?.pdfTemplateId || 'industry' })` → Forme architectural/executive/heritage via `resolveCommercialPdfRoute` (`components/pdf/index.ts:93-106`) | **No** (model carries no `template.designPreset`; `design.useCustomColors = false`, `accentColor = INDUSTRY_DEFAULT_ACCENT #7D8A88`, gated null by `resolveDesignTokens`) | Read |
| 6 | In-app live preview of these templates | Not found. DesignLab has no commercial-PDF live render (`src/lib/designLabPreviews.ts`: onboarding/dashboard/CSR/PO-view experiments only); no `PDFViewer`/`usePDF` usage in `src` | N/A | grep |
| 7 | Email / share document | `documentEmailHtml.ts` is an HTML string template unrelated to the Forme commercial docs; public viewer (`PublicDocumentViewer.tsx`) consumes stored blobs | **No** | grep |
| 8 | Template picker | `CommercialTemplatePicker.tsx` imports static PNGs from `src/assets/template-previews/*.png`; picker does not render the components at runtime | **No** (fixture built with `useCustomColors: false`) | Read |
| 9 | Preview generation | `scripts/generate-commercial-template-previews.ts` renders production Forme components with a fictional fixture (Sample Motors Ltd) via `renderPdfcnToBytes` + mupdf, writes `src/assets/template-previews/*.png` | **No** (fixture forces `useCustomColors: false`, lines 186-199) | Read |
| 10 | PDFCN industry definitions | `src/components/pdf/pdfcn/commercial.ts` — industry only | N/A | Read |
| 11 | CPS / CSR / Waybill pipelines | Independent presets (`waybill`, `csr`, `cps_sheets`) and renderers; no intrinsic-palette templates share them | N/A | Read |

**No unguarded route was found.** The remaining exposure is future code that constructs `template: { designPreset }` without the guard, or any relaxation of `useCustomColors` gating in `resolveDesignTokens`/`industryAdapter`.

## 5. Preset and theme propagation analysis

Storage keys and shapes:
- `invoice_pdf_design_preset` / `quotation_pdf_design_preset` — `PdfDesignPreset` (`useCustomColors`, `useCustomFonts`, `accentColor`, `textColor`, `mutedColor`, `borderColor`, `surfaceColor`, fonts…), normalized by `sanitizePdfDesignPreset()` (`src/lib/pdfDesignPreset.ts:228-249`); `accentColor` must match `#rrggbb`; unknown → per-type default.
- `bigdrops_pdf_customization_invoice` / `bigdrops_pdf_customization_quotation` — engine `PdfCustomizationSettings { version: 1, accentColor?, accentEnabled?, documentFont?, inkFont?, inkColour? }`, read in `loadEngineSettings()` (`commercial.ts:33-42`), written by `usePdfCustomization.set…` (`hooks.ts:98-131`) and by `persistCommercialDesignPreset()` which also bridges accent into the preset key (`commercial.ts:102-116`).
- Bridge logic: `resolveCommercialDesignPreset()` (`commercial.ts:151-170`) = base preset + engine accent/font, `useCustomColors = settings.accentEnabled` (forced, line 168), legacy `useCustomFonts = true` if no saved preset (`hasSavedPdfDesignPreset`, lines 165-167). Then the f094443a guards force `useCustomColors: false` for intrinsic templates **after** this bridge, so engine state cannot leak in via this path either.
- `CommercialTemplatePicker` `value` normalization (`industry-forme` → `industry`, line 119) is presentation-only; the guard uses the normalized id, not the raw picker value.
- Amber reaches a PDF if and only if all four hold: (a) shared key persisted `useCustomColors:true` (or engine `accentEnabled` true), (b) builder forgets the guard, (c) template route resolves to an intrinsic Forme doc, (d) Forme fallback is `tokens.accentColor || intrinsic` (it is). Post-fix, (b) fails on both existing invoice/quotation builders.

## 6. Template-by-template findings

### 6.1 Intrinsic palette comparison (Forme tokens vs HTML reference)

**Architectural** (HTML `commercial-architectural-frame.html` → Forme `ARCHITECTURAL_TOKENS`, `ArchitecturalFormeDocument.tsx:18-32`):
- Charcoal `#1e2427` ✓ = HTML `--ch:#1e2427`. Copper `#a4663f` ✓ = `--cu:#a4663f`. Copper light `#c08a5f` ✓ = `--cu2:#c08a5f`. Sand `#e3d7c3` ✓. Ivory `#f6f0e4` ✓.
- `ivoryPanel: #ede4d3` vs HTML panels `#efe5d5`/`#f2e9da`/`#f4ecdd` (e.g. L150, L149) — **mismatch** (one consolidated value used where HTML uses three).
- `mutedText: #8c8275` vs HTML `--mute:#6f6b61` — **mismatch**.
- `ink: #1e2427` vs HTML `--ink:#25292a` — **mismatch** (Forme reuses charcoal).
- `grayText: #60584f` vs HTML body text `#4c4942`/`#4f4c45` — **mismatch**.
- `rule: #d9cdbb` / `lightRule: #e8ded0` vs HTML sand-based rules — close analogs, not identical.
- Paper background: HTML page fill is `--paper:#fdfaf3` inside a `#d9d2c4` page; Forme paints the page `#f6f0e4` (ivory) edge-to-edge — presentation-level difference.

**Executive** (HTML `commercial-executive.html` → Forme `EXECUTIVE_TOKENS`, `ExecutiveFormeDocument.tsx:18-33`):
- Forest `#173a2c` ✓ = `--forest:#173A2C`. Forest dark `#0f281e` ✓ = `--forest-deep:#0F281E`. Gold `#a9854f` ✓ = `--gold:#A9854F`. Gold light `#d8c39c` ✓ = `--gold-light:#D8C39C`. Paper `#fcf9f2` ✓ = `--paper:#FCF9F2`. Ivory panel `#f6f0e2` ✓ = `--ivory:#F6F0E2`.
- `ink: #1c201d` vs HTML `--ink:#1D2A22` — **mismatch**.
- `mutedText: #7e8881` vs HTML `--muted:#76776A` — **mismatch**.
- `rule: #dfd5c2` vs HTML `--rule:#D9CFBA` — **mismatch**.
- `goldPale: #efe6d5` vs HTML `--ivory-deep:#EFE5D1` — **mismatch** (near).

**Heritage House** (HTML `commercial-heritage-house.html` → Forme `HERITAGE_TOKENS`, `HeritageHouseFormeDocument.tsx:18-30`):
- Burgundy `#5c1a26` ✓, burgundyDeep `#451119` ✓, bronze `#9a7b45` ✓, bronzeLight `#c6aa76` ✓, paper `#f8f2e3` ✓, ivory `#f2e9d4` ✓, white `#fffdf7` ✓, ink `#251e17` ✓, muted `#7b6e5c` ✓, rule `#d9cbac` ✓ — **all 10 tokens match the HTML reference exactly.**

**Amber absence:** with the f094443a guards, the preview PNGs and the fixture render no amber in the three Forme docs (visually confirmed, §8). `#f59e0b`/`#d97706` do not appear in any of the three components' fallback token sets. The only amber in the repository is Landscape's intrinsic `#b84a14` and the (guarded-out) custom accent path.

### 6.2 HTML-to-Forme layout comparison (major mismatches; Forme is an adaptation, not a 1:1 clone — flagged, not "fixed" here)

- **Footer order:** all three HTML references place `[logo + company] ……… [Page x of y] ……… [doc ref]` (`.fr-foot` L209-218, `.lux-footer` L134-139, `<footer class=fr-foot>` L357/L298/L357). The Forme trio render `[Page x of y] … [doc number] … [logo + company]` (`ArchitecturalFormeDocument.tsx:171-186`; `ExecutiveFormeDocument.tsx:173-187`; `HeritageHouseFormeDocument.tsx:172-186`). Order is inverted relative to the reference **and** to Industry (`IndustryFormeDocument.tsx:117-136`: logo+company left, page center, number right — matching the reference).
- **Footer margin:** page `margin.bottom` is `20pt` (compact 16) in all three (`ArchitecturalFormeDocument.tsx:131`, `ExecutiveFormeDocument.tsx:133-134`, `HeritageHouseFormeDocument.tsx:129-130`) vs Industry's `8pt` (compact 6, `IndustryFormeDocument.tsx:103`). The Fixed footer + 20pt bottom margin reads as excessive bottom whitespace on short documents; combined with reversed footer order this is the "footer displacement" to flag.
- **Masthead (Executive):** HTML uses a left-aligned brand row — logo 11 mm at left, serif wordmark, subscription line, and right-aligned `Document no.` block (L209-ish, `<header class=lux-top>` with `.lux-brand`/`.lux-brandsub`/`.lux-docmark`). Working-tree Forme renders a **centered symmetrical masthead** (logo 34×34 centered above `SAMPLE MOTORS…`, centered title). Structural departure from the reference.
- **Masthead (Architectural):** reference `.fr-hd` is a two-column header (logo+name left, `fr-hd-doc` right) — Forme keeps a close two-card analog; geometry is broadly aligned.
- **Masthead (Heritage):** reference `.hh-seal` monogram in a double-outlined 12 mm box; Forme implements uploaded-logo-else-monogram fallback (a compatible enhancement; monogram letter from `companySealLetter`).
- **Fonts:** HTML references call for serif/display faces (Georgia/Didot/Playfair-class for Executive and Heritage; geometric for Architectural). Forme docs run `isFormeSupportedFamily(tokens.bodyFont) ? tokens.bodyFont : 'Inter'` (e.g. `ArchitecturalFormeDocument.tsx:106-107`) with `Inter`/`Archivo Black` only registered (`components/pdf/index.ts:139-145`) — the display serifs of the references are not reproduced.
- **Document identity copy:** HTML running heads use neutral `INVOICE · INV-…`; Forme mastheads are aligned on this. No leaked internal labels remain in the Architectural render; Executive/Heritage at HEAD still leak (§6.4).
- **Signature furniture:** see §7.
- **Attachments heading:** HTML has no dedicated "attachments"/"drawings" block; Forme prints `ATTACHMENTS & PROJECT DRAWINGS` (`ArchitecturalFormeDocument.tsx:553`) — design-level copy, not internal metadata, but an addition vs the reference.
- **Totals/ledger heading:** HTML `.fr-sum-h > Financial summary / Naira (₦)` vs Forme `FINANCIAL LEDGER STATEMENT` — copy-level mismatch.

### 6.3 Architectural logo: aspect ratio and spacing

- Commit changed container `34×34pt, padding 2 → 40×40pt, padding 5`, row gap `8 → 12` (`ArchitecturalFormeDocument.tsx:195-200`). Fill ratio now 30/40 = **75%** (HTML reference is 10 mm / 12.4 mm = **80.64%**; the pre-fix 30/34 = 88.2%). The commit message's "75% matching reference" overstates fidelity; 75% is *closer to* the reference, not equal.
- **Aspect ratio is not preserved.** The `<Image>` is hard-pinned to `width: 30, height: 30`; Forme's `ImageProps`/`Style` expose no `objectFit`/contain behavior (`node_modules/@formepdf/react/dist/types.d.ts:135-144`, no fit property anywhere in the style type). Any non-square uploaded logo is stretched into a square. The HTML reference marks thumbnail slots with `object-fit: contain` (`.fr-thumb img`, L125) for precisely this case.
- Footer logo `13×13` (`ArchitecturalFormeDocument.tsx:180`) has the same fixed-square constraint.
- Net: spacing fix is real and directionally correct; logo fidelity for non-square uploads is unresolved and architecturally blocked at the Forme `<Image>` boundary (no contain-fit). Any implementation task must either size the container from the intrinsic image aspect (needs image-dimension probing upstream of the renderer) or document the square-crop constraint.

### 6.4 Internal template names / document-control labels (customer-facing leakage)

**At HEAD (committed f094443a):**
- Architectural: **clean.** `ARCHITECTURAL SPECIFICATION SHEET` removed; `Standard commercial drawing…` removed; `DOCUMENT CONTROL` stamp removed; `ORIGINAL` stamp removed; `ENGAGEMENT…`-type strings not present.
- Executive (HEAD lines): `'EXECUTIVE COMMERCIAL FOLIO'` (L148, repeating fixed header), `'ENGAGEMENT & REFERENCE PARTICULARS'` (L268), `'Executive commercial engagement terms apply.'` (L283, rendered when no custom header fields — an invented customer-facing clause), plus working tree adds `EXECUTIVE DIRECT SETTLEMENT` / `Please remit in accordance with contract schedule.` (L512-515) as a fallback panel when no bank details/procurement — invented copy.
- Heritage (HEAD lines): `'HERITAGE HOUSE · FORMAL STATIONERY'` (L148), `'BOURXE'` wordmark (L225 — app brand rendered inside a customer PDF — note: after the brand rename, "BOUXRE" in the Executive HTML specimen, same class of defect), signature-block comment `SIGNATURES & DOCUMENT CONTROL STAMP` (L542), `'DOCUMENT CONTROL'` cell (L580), `'VERIFIED'` stamp box (L587).
- Working tree removes these Executive/Heritage strings (verified in `git diff HEAD`) but is **uncommitted**; they are live in any binary built from HEAD.

**Committed invariants hold only for Architectural.** No internal names remain in Architectural output.

### 6.5 Signature behavior and procurement signatories

- Architectural (commit): signature section strictly data-conditional (`ArchitecturalFormeDocument.tsx:564-620`). Non-procurement path renders only when `data.signature && (imageUrl || name)`; procurement path only when `isProcurement && procurementSignatories && (requisitioner || authorizer)` exists; per-signatory blocks render only when the corresponding signatory object exists.
- Executive/Heritage at HEAD: **unconditional** signature blocks with empty furniture (`git show HEAD:...` — Executive "8. SIGNATURES"; Heritage "7. SIGNATURES & DOCUMENT CONTROL STAMP"). Working tree converts both to conditional (mirrors the Architectural commit). Also uncommitted.
- Procurement signatories are inspected separately: they flow from `preparePurchaseOrderDocument.ts:309` (`options.signatories ?? po.procurementSignatories ?? custom_fields.signatories`) with **no name validation**; the Forme docs fall back to `'Authorised Requisitioner'` / `'Authorised By'` when `name` is falsy inside a truthy signatory object (`ArchitecturalFormeDocument.tsx:576,593`). Whether a truthy-but-nameless signatory can be persisted is a data-contract question this audit could not settle (no schema/DB constraint found enforcing it) — recorded as unresolved.
- Procurement-vs-issuer signature separation is respected (procurement blocks render requisitioner/authorizer; non-procurement renders issuer), matching the PO pipeline rules.
- Quotation path passes no procurement signatories; invoice path aliases into `resolveDocumentSignatory` (unchanged behavior).

### 6.6 Executive / Heritage divider glyph renders as "?"

`ExecutiveFormeDocument.tsx:221` and `HeritageHouseFormeDocument.tsx:250` render literal `❖` (U+2756) as the diamond separator. PDF `FontRegistry`/`ensureFormeFontFamily` registers `Inter`, `Archivo Black`, `Caveat`, `Noto Sans`, `PT Serif` (`components/pdf/index.ts:139-145`); none covers U+2756. The generated preview PNGs (both files, both templates) visibly render the separator as **`?`**. Confirmed visually. At HEAD and in working tree.

### 6.7 Preview PNGs and the picker

- Picker uses the exact committed/working-tree PNG files (`CommercialTemplatePicker.tsx:3-10,45-110`, copies in carousel are `object-contain`/`max-h` — no canvas re-render).
- PNGs were regenerated 2026-11-09 08:15 — **after** the working-tree Forme edits began (Industry 08:13) but **before** Executive/Heritage Forme edits (08:19) and the committed Architectural edit (08:58). They cannot be attested to f094443a content; because the preview fixture sets no logo/signature/custom fields, logo/signature corrections are invisible in them anyway.
- Working-tree previews (viewed): intrinsic palette confirmed; `❖` renders as `?`; Executive page shows **no logo** (fixture) and the now-removed `EXECUTIVE COMMERCIAL FOLIO` is absent; blank bottom half with footer anchored; Industry preview rendered sparsely with a very empty mid-page (layout density concern, unrelated to palette).
- The PNGs differ from the committed copies; if the working tree were reset, the picker would show pre-fix thumbnails. Regeneration needs to happen **after** the current Forme edits settle, by whoever lands the next fix — with mupdf available (it is, per the script).

### 6.8 What was visually verified vs blocked

Actual rasterized PDF pages **were** inspected in this audit: the three preview PNGs (`architectural.png`, `executive.png`, `heritage.png`), which are genuine mupdf rasterizations of the production Forme components (documented pipeline, deterministic fictional fixture, first page). Additionally `industry.png` was inspected as the Industry baseline. Compared against the three HTML references **source-to-source** (HTML not renderable in the session — the in-app browser refuses `file://` URLs; no other inspectable rasterization of the three HTML files exists in-repo; `qa-renders/` contains only landscape/portrait industry-class renders and `ref-invquo/` contains customer-style sample PDFs of a different family — none named architectural/executive/heritage).

Not visually verified: (a) any PDF generated by the running app (no app-generated architectural/executive/heritage sample exists, and this audit generated none — see constraints); (b) non-square uploaded logos; (c) signature-furniture behavior live; (d) multi-page output; (e) HTML references rendered pixel-comparisons. **Visual acceptance is OPEN.**

## 7. Footer comparison vs Industry (displacement and spacing)

| Property | Industry (reference behavior) | Architectural / Executive / Heritage |
|---|---|---|
| Fixed footer | yes (`Fixed position="footer"`) | yes |
| Page `margin.bottom` | `8pt` / `6pt compact` | `20pt` / `16pt compact` — **+12pt extra bottom spacing** |
| Footer row order | logo+company · centered page · right doc no. | left page · center doc no. · right logo+company — **inverted vs Industry and vs the HTML references** |
| Footer border/accent | accentColor 1pt top rule | `copperLight`/`goldLight`/`rule` top rule — consistent in spirit |
| Auxiliary lines | tagline + extraText, centered | same set — hierarchy fine |
| Industry internal note | none | trio adds no internal labels in footers (HEAD or WT) |

Result: the three templates' footers sit **lower in a 20pt bottom margin** with reversed slot order. Not data-loss, but a visible hierarchy regression relative to the reference direction and the Industry baseline; combined with §6.2 it is the strongest layout deviation in the set.

## 8. Industry template (for comparison/context)

`IndustryFormeDocument.tsx` gates **all** of `accentColor/textColor/mutedColor/borderColor/surfaceColor` and both fonts behind `useCustomColors`/`useCustomFonts` (lines 70-74), honors `tokens` when enabled, defaults to `#7D8A88`, paints a sparse layout with the widest empty mid-page in the preview set, and already renders the reference-order footer with an 8pt bottom margin. Industry is the only intrinsic-ish template that *intentionally* accepts the amber override — the guard correctly leaves it unaffected (palette decision owner: customizable-by-design).

## 9. Defect register (classified)

**Critical — none proven (no data-loss or secret leak).**

**High**
- **H-1** Committed-vs-working-tree split: HEAD still ships Executive/Heritage internal labels + unconditional signature furniture; their cleanup is uncommitted (`ExecutiveFormeDocument.tsx`, `HeritageHouseFormeDocument.tsx` WT diff). Any HEAD build regresses the "all three templates" claim.
- **H-2** Point-of-use guarding only (§3 D-01): stale `useCustomColors:true` persists in both shared keys and is re-written by the customize UI for intrinsic templates (silent no-op, D-03). Two pre-existing call sites happen to be guarded; no structural guarantee exists.
- **H-3** Visual acceptance not established (§6.8). Preview PNGs (the only rendered evidence) predate the committed Architectural changes and the Executive/Heritage WT changes; fixture covers no logo/signature path.

**Medium**
- **M-1** Logo aspect ratio not preserved; no contain-fit exists in the Forme Image primitive (§6.3).
- **M-2** Footer slot order inverted vs HTML references and Industry; bottom margin 20pt vs 8pt (§7).
- **M-3** `❖` renders as `?` in Executive/Heritage (§6.6); preview PNGs corroborate.
- **M-4** Executive HEAD leaks invented customer-facing copy: `ENGAGEMENT & REFERENCE PARTICULARS` conditionals and `Executive commercial engagement terms apply.` placeholder; working tree adds `EXECUTIVE DIRECT SETTLEMENT`/`Please remit…` filler when no bank details (§6.4). Heritage HEAD leaks `HERITAGE HOUSE · FORMAL STATIONERY`, `BOURXE`, `DOCUMENT CONTROL`/`VERIFIED` stamps.
- **M-5** Two-tone accent collapse when custom override is enabled (`copperLight`/`goldLight` = accentColor) (§3 D-05).
- **M-6** Two-tone grammar mismatch HTML-vs-Forme for Architectural neutrals (ivoryPanel/mutedText/ink/grayText) and Executive (ink/muted/rule/goldPale) (§6.1); Heritage exact.

**Low**
- **L-1** `isIntrinsicPaletteTemplate()` does not normalize/trim; callers rely on prior normalization (§3).
- **L-2** Procurement signatory name fallbacks render label-like strings when object exists but `name` is empty; persistence contract unverified (§7.5 / §6.5).
- **L-3** Preview provenance unverifiable; picker thumbnails will regress if WT is discarded; regenerate deterministically post-fix (§6.7).
- **L-4** Layout/copy adaptations from HTML (ledger heading, `FINANCIAL LEDGER STATEMENT`, `ATTACHMENTS & PROJECT DRAWINGS`, attachments heading absent from reference) (§6.2).
- **L-5** `_bronzeLight` dead constant (WT Heritage); `goldPale` remains hard-coded under a custom accent (WT Executive).
- **L-6** Executive masthead architecture diverged from HTML `.lux-top` left-brand/right-docmark layout to centered (WT) — deliberate-looking but unattested and unreviewed vs reference (§6.2).

## 10. Exact files and functions requiring correction (next implementation task)

Not fixes — scoping pointers only:

1. `src/domain/pdf/customization/commercial.ts` — `resolveCommercialDesignPreset()`: make the preset itself palette-aware (accept template id) or drop intrinsic-palette accent at the bridge boundary instead of at each call site; correct the silent no-op UX (disable accent toggle for intrinsic templates or honor an explicit documented override).
2. `src/components/document-view/shared/DocumentCustomizeCard.tsx` and the two save handlers (`InvoiceOverlays.tsx` L184, `ViewQuotation.tsx` L119): suppress/disable the accent toggle for intrinsic templates; persisted `useCustomColors:true` currently remains visible to both readers.
3. `src/components/pdf/forme/ExecutiveFormeDocument.tsx` and `HeritageHouseFormeDocument.tsx` — land the WT changes (label removal, conditional signatures) deliberately; then regenerate `src/assets/template-previews/*.png` (script: `scripts/generate-commercial-template-previews.ts`) in the same change; extend fixture to include a logo + signature so the picker shows the true renderer.
4. `src/components/pdf/designTokens.ts` — consider template-identity awareness, or `adaptCommercialDocumentData()` — single choke point; in either case remove the two-call-site dependency.
5. `src/components/pdf/index.ts` / `industryAdapter.ts` — if a single guard is retained, route it here; today PO proves the pipeline can run with `design` all-null — document that as the intended invariant.
6. `src/components/document-view/invoice/useInvoiceActions.ts` / `OfficePdfPreview`-class consumers — none currently unguarded; add a test that greps built payloads for intrinsic templates with `useCustomColors:true` regression.
7. `ExecutiveFormeDocument.tsx` L221, `HeritageHouseFormeDocument.tsx` L250 — replace `❖` with a registered glyph or omit the separator.
8. `ArchitecturalFormeDocument.tsx` L202-204 (logo `Image`) — contain-fit strategy at the Forme layer or documented square-crop contract; container/padding/gap values (40/40/5, gap 12) to be re-checked against rendered output with a real non-square logo.
9. Footer order/margin in the three Forme docs — align to Industry-order reference (`logo+company | page | doc no.`) and reconsider `margin.bottom` 20→8/6 to match Industry (`IndustryFormeDocument.tsx:103`, `117-136`).
10. `invoice/types.ts` `isIntrinsicPaletteTemplate` — trim/lowercase inputs, or normalize inside the helper.
11. Tests: the palette-isolation test suite (`formeArchitecturalTemplate.test.ts` etc.) is WT-only; land it with the WT Forme changes so the COMMIT covers both; add a serialized-tree assertion for absence of the removed labels ('EXECUTIVE COMMERCIAL FOLIO', 'BOURXE', 'DOCUMENT CONTROL', 'VERIFIED').

## 11. Acceptance matrix

| Criterion | Status | Evidence |
|---|---|---|
| Intrinsic-palette templates cannot inherit amber from stale localStorage via invoice path | **PASS** | Guard L211-213 `invoicePdfActions.ts`; `resolveDesignTokens` gate; preview PNGs |
| Same via quotation path | **PASS** | Guard L39-46 `pdfDownloadHandler.ts` |
| Same via PO path | **PASS** (stronger: no preset embedded at all) | `preparePurchaseOrderDocument.ts:325`; `PurchaseOrderDetail.tsx:198-201` |
| Same via preview/overlay paths | **PASS** | Both overlays call the same guarded builders |
| Same via PDFCN path | **PASS (N/A coverage)** | Only Industry registered, `pdfcn/commercial.ts` |
| Preview picker free of amber | **PASS** (fixture-true), but thumbnails stale | `CommercialTemplatePicker.tsx`; PNGs viewed; provenance §6.7 |
| Amber absent in actual rendered pages | **PARTIAL PASS** (previews inspected) | Rendered PNGs; no app-generated sample; §6.8 |
| "All three templates isolated" at committed HEAD | **FAIL** for Executive/Heritage internal labels & signatures | §6.4, §6.5; only WT fixes them |
| Architectural internal labels removed | **PASS** | HEAD render, component source |
| Architectural logo cramping fixed (spacing/padding) | **PASS (directionally)** | 34→40/padding 5/gap 12, commit diff |
| Architectural logo aspect-ratio preserved | **FAIL** | Fixed 30×30 square; no objectFit in Forme Image |
| HTML reference palette matched (all three) | **PARTIAL** — Heritage exact, Architectural/Executive close with token mismatches | §6.1 |
| HTML reference footer hierarchy matched | **FAIL** (inverted order, +12pt bottom margin vs Industry) | §7 |
| Signature furniture only when signature data present | **PASS (WT)** / **FAIL (HEAD for Executive/Heritage)** / PASS Architectural (commit) | §6.5 |
| Procurement signatories conditional | **PARTIAL** | Structural gates OK; name-fallback leak risk L-2; persistence contract unverified |
| No internal metadata/template-name leakage | **FAIL at HEAD** (Exec/Heritage); **PASS Architectural**; **PASS WT** (uncommitted) | §6.4 |
| Previews regenerated from correct Forme implementation | **NOT VERIFIED / STALE** | Provenance unverifiable; timestamps; §6.7 |
| Visual acceptance (actual PDF pages inspected vs HTML refs) | **OPEN / NOT MET** | §6.8; prior report's PASS stands withdrawn |
| Commit hygiene (scoped diff, no unrelated edits) | **PASS** | 4 files; pre-existing WT preserved (before/after status) |
| Typecheck/lint/build hygiene | **NOT RE-RUN** (per constraints); prior record partially pre-existing-errors | Commit message |

## 12. Facts vs assumptions

**Facts (read/verified):** every file path, line number and diff hunk cited above; five preview PNGs viewed; HTML references read at source level; git history/status captured before and after; Forme type surface (`ImageProps`/`Style` without objectFit) from the installed package.

**Assumptions / inferences (marked):** (a) mupdf pipeline inside `scripts/generate-commercial-template-previews.ts` is the authoritative originator of those PNGs (script read, assets exist, no contradictory evidence — but provenance not independently attested); (b) HTML references are the intended visual authority for their Forme counterparts (per task brief, treated as such); (c) that the working-tree edits to Executive/Heritage are intended to ship alongside f094443a (they are uncommitted; shipping order unknown); (d) that the "amber" defect users reported was the `#f59e0b`/`#d97706` saved accent (test fixtures and theme tokens corroborate); (e) Forme `Fixed position="footer"` semantics (renders at page-bottom margin area) consistent with previews showing footers pinned low on all pages.

## 13. Explicitly unresolved questions

1. Can a truthy `procurementSignatories.requisitioner/authorizer` (or non-procurement `signature`) object be persisted with an empty/missing `name`/`title`? If yes, label-like fallbacks ship in customer output (M risk). Requires data-contract verification or a name-presence gate.
2. What is the intended product behavior for the accent toggle on intrinsic templates (disabled vs honored override)? Current silent no-op is neither.
3. Are the Executive centered masthead and the Heritage monogram-seal evolution deliberate replacements of the HTML left-brand/right-docmark direction — i.e., does HTML remain the authority, or has the Forme direction superseded it? Decision undocumented.
4. Should the shared `useCustomColors:true` be actively deleted from the three shared preset keys on first intrinsic-template render (migration), or tolerated as inert storage?
5. Do the Executive/Heritage working-tree edits + regenerated PNGs land in the next commit, and are the five dirty tests (TS2698 pre-existing) to be repaired as part of it?
6. Which rendered artifact will close visual acceptance — CI-generated rasterized pages from the fixture (extend the existing script) or manual app verification? Today neither exists in the repo.

## 14. Bottom line

f094443a correctly diagnoses and structurally fixes the amber bleed on every rendering route that exists. It does not — by itself — deliver the promised all-three-template outcome: Executive and Heritage House still leak internal labels and render unconditional signature furniture at HEAD; their cleanup is uncommitted. The Architectural logo got real breathing room but cannot preserve uploaded-logo aspect ratio on the Forme Image primitive. The footers of the three templates are inverted relative to both the HTML references and Industry, with a larger bottom margin. The only rendered-page evidence in the repo is a stale, fixture-limited preview set in which a real glyph defect (`❖` → `?`) is plainly visible. Visual acceptance must remain **OPEN** until a deterministic rasterized render of all three templates (with logo and signature present) is inspected against the HTML references and the D-defects above are either fixed or formally waived.
