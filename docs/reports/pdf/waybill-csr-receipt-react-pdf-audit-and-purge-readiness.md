# Waybill, CSR and Receipt — React-PDF Audit and Purge Readiness

**Date:** 2026-11-12
**Type:** Zero-code-change audit. No source, test, configuration, manifest or lockfile was modified. No build, typecheck, lint, audit:load or test command was run.
**Baseline:** branch `main`, `08d45ed0 ✨ feat(purchase-order): promote document view presentation layer`.
**Working-tree baseline:** 132 untracked files, all under `scratch/`; zero modified tracked files. This report is the only addition.
**Scope:** Waybill, CSR and Receipt PDF rendering; shared React-PDF infrastructure; remaining React-PDF consumers repository-wide; Forme migration and purge order.

---

## 1. Executive summary

Three documents still render PDFs with React-PDF 4.3.2. One of them — CSR — is already **hybrid**: two of its five templates render through Forme/PDFCN, three still render through React-PDF.

| Document | Engine today | Template count | Production entry points |
|---|---|---|---|
| Waybill | React-PDF only | 6 + 1 blank | `ViewWaybill`, `WaybillFormPage` (blank) |
| CSR | Hybrid (React-PDF + Forme) | 5 (3 React-PDF, 2 Forme) | `ViewCSR`, `CsrFormPage` |
| Receipt | React-PDF only | 1 | `ViewReceipt` |

Supporting facts established by this audit:

1. **The React-PDF surface is small in pages, large in files.** Only three routes produce these documents, but six Waybill templates plus three CSR templates plus one Receipt renderer total ~3,400 lines of layout code.
2. **All three documents already have engine-independent data models.** `WaybillRenderModel` (Zod-validated), `CsrRenderModel`, `CanonicalPreparedCsr` and `ReceiptPreviewData` exist outside React-PDF. Migration is therefore a layout port, not a data rewrite.
3. **The delivery layer is already engine-agnostic.** `src/lib/pdf/*` (asset, delivery, feedback, generator) contains exactly one React-PDF dependency: `DefaultPdfGenerator`. `downloadPdfFromElement` is the other React-PDF choke point and is shared by CSR, Waybill and RFQ.
4. **`@react-pdf/renderer` cannot be removed yet.** Besides the three target documents, it is still required by RFQ (`RfqPdfDocument` → `TableDocumentPdfDocument`), Project Documents (`ProjectDocumentPDF`) and the CSR blank/save path (`CsrFormPage`).
5. **One file is already dead:** `src/components/pdf/templateTableLayout.ts` has no importers.
6. **Seventeen of the nineteen `@fontsource/*` packages are declared but unused.** Only `@fontsource/inter` and `@fontsource/noto-sans` are imported (by `src/lib/pdfSharedFonts.ts`); `@fontsource-variable/inter` is a separate package imported by `src/main.tsx`. The rest, including all retired families, are dead dependencies.
7. **React-PDF's font chain is the main functional risk in a port.** Receipt and CSR rely on `registerPdfFonts()` and `resolvePdfFontFamily()`, which return Helvetica family names for built-in choices; Waybill relies on the same preset resolver plus Caveat woffs from `src/assets/pdf-fonts`.

---

## 2. Architecture shared by all three documents

### 2.1 Two rendering engines

| Engine | Entry | Renderer | Page implementation |
|---|---|---|---|
| React-PDF 4.3.2 | `pdf(element).toBlob()` | `@react-pdf/renderer` | React-PDF `Document`/`Page` |
| Forme 0.20.1 | `renderPdfcnToBytes` → `@formepdf/core` or `@formepdf/core/browser` | `src/components/pdf/pdfcn/primitives.tsx` wrapper | Forme `Document`/`Page` |

The Forme path is centralised in `src/components/pdf/pdfcn/adapter.ts`:

- `loadFormeRenderDocument()` selects `@formepdf/core/browser` in browser, else `@formepdf/core`.
- `ensureGlyphCoverageFonts()` registers Inter, Noto Sans (+Greek subset), Noto Sans currency and `Plus Jakarta Sans` symbol coverage before every render.
- `renderPdfcnToBytes`, `renderPdfcnToBlob`, `generatePdfcnPdf` are the only Forme render/deliver APIs.

### 2.2 Delivery and feedback (engine-independent)

`src/lib/pdf/` — `PdfAsset.ts`, `PdfDelivery.ts`, `CompositePdfDelivery.ts`, `WebPdfDelivery.ts`, `NativePdfDelivery.ts`, `FeedbackBus.ts`, `DefaultFeedbackBus.ts`, `PdfGenerator.ts`, `DefaultPdfGenerator.ts`, `types.ts`, `index.ts`.

Every path below, on both engines, converges on `CompositePdfDelivery(WebPdfDelivery, NativePdfDelivery)` and `DefaultFeedbackBus`. Nothing in this folder imports React-PDF except `DefaultPdfGenerator.ts:13`.

### 2.3 The two React-PDF choke points

| Choke point | Path | Used by |
|---|---|---|
| `pdf(element).toBlob()` via helper | `src/components/document-view/shared/downloadPdf.tsx:26` | `ViewCSR`, `ViewWaybill`, `ViewRfq` |
| Direct dynamic `import('@react-pdf/renderer')` | `ViewWaybill:422`, `ViewCSR:288`, `ViewReceipt:124`, `ViewRfq:309`, `CsrFormPage:3`, `ProjectDocumentView:81`, `ProjectDocumentCard:71` | share blobs, CSR form PDFs, project document export |
| `DefaultPdfGenerator` | `src/lib/pdf/DefaultPdfGenerator.ts:13` | `ViewReceipt` only |

### 2.4 Fonts

| Layer | Path | Engine |
|---|---|---|
| Preset + family resolution | `src/lib/pdfDesignPreset.ts` | Both (returns names; Helvetica names are React-PDF-specific) |
| React-PDF registration | `src/lib/pdfFontRegistry.ts:1` | React-PDF |
| Shared font sources | `src/lib/pdfSharedFonts.ts:1-6` (`@fontsource/inter`, `@fontsource/noto-sans`) | React-PDF |
| Fillable font sources | `src/lib/pdfFillableFonts.ts:1-2` (`src/assets/pdf-fonts/Caveat-*.woff`) | React-PDF |
| Customization bridge | `src/domain/pdf/customization/fontRegistry.ts` | Both |
| Forme registration | `src/components/pdf/forme/fonts.ts` (`public/fonts/*.ttf`) | Forme |
| Forme glyph fallback | `src/components/pdf/forme/glyphs.tsx` | Forme |

`resolvePdfFontFamily` maps `Inter` → Helvetica variants when no shared config is registered, so React-PDF output depends on registration order; Forme output depends on `ensureGlyphCoverageFonts()`.

---

## 3. Waybill

### 3.1 Current renderer

**React-PDF only.** No Forme implementation exists.

| Role | Path |
|---|---|
| Dispatcher | `src/components/waybill/WaybillPDF.tsx` |
| Templates | `src/components/waybill/EvergreenTemplate.tsx` (707 lines, default), `ClassicTemplate.tsx` (605), `SlateTemplate.tsx` (640), `PremiumTemplate.tsx` (666), `ThermalTemplate.tsx` (574), `MinimalTemplate.tsx` (542) |
| Blank template | `src/components/waybill/blankWaybillTemplate.tsx` (308) + `src/components/waybill/waybillMinimalStyles.ts` (259) |
| Preset types | `src/components/waybill/waybillUtils.ts` (`WaybillPdfTemplateId`) |
| Render contract / engine | `src/domain/waybill/renderContract.ts`, `src/domain/waybill/engine/{assembly,normalizeBlank,index}.ts`, `src/domain/waybill/engine/resolvers/*` |
| Customization | `src/domain/pdf/customization/waybill.ts` |
| Production page | `src/pages/ViewWaybill.tsx` (602) |
| Blank generation page | `src/pages/WaybillFormPage.tsx:125` |

Entry-point routes: `src/components/app/AppShell.tsx:377` (`/waybills/:id`), `:376` (`/waybills/:id/edit`).

`WaybillPDF` validates with `safeValidateRenderModel(model)` and returns `null` on failure — a failed validation silently yields no PDF.

### 3.2 Rendering flow

1. `ViewWaybill` loads the waybill and settings (`useSettings`, `useEntity`) and maps the DB row through `mapDbWaybill` / `parseWaybillCustomFields` (`waybillUtils.ts`).
2. It resolves the print column set: standard columns filtered by saved `columnVisibility`, `qtyLabel` when quantity and unit are both visible, then saved `customColumns` (`WAYBILL_COLUMN_LIMIT = 4`).
3. `buildWaybillRenderModel({ waybill, columns, company })` (`src/domain/waybill/engine/assembly.ts:10`) produces the Zod-validated model. Resolvers: branding, header, parties, logistics, notes, signatures, columns, rows.
4. Design preset: `getPdfDesignPreset('waybill')` bridged through `bridgeToDesignPreset(basePreset, customization)` from the shared customization engine (`usePdfCustomization` with `WAYBILL_CAPABILITIES` / `WAYBILL_POLICY` / `WAYBILL_TEMPLATE_DEFAULTS`).
5. `WaybillPDF` selects a template by `template` prop, default `'evergreen'`.

Paths and their differences:

| Path | Implementation | Difference |
|---|---|---|
| Preview (in-app) | `src/components/document-view/waybill/WaybillDocumentPreview.tsx` with CSS modules | HTML/CSS re-implementation; **not** the PDF renderer. Uses `richTextToPlainText`. |
| Download | `ViewWaybill` → `downloadPdfFromElement({ element: <WaybillPDF/>, subdirectory: 'waybill' })` | React-PDF `toBlob` → `exportPdfToDevice`; on native, open-then-share fallback |
| Share | `DocumentShareSheet` → `waybillSharePayload.getPdfBlob()` → `pdf(<WaybillPDF/>).toBlob()` | Same renderer, separate code path; no `exportPdfToDevice` |
| Print | none | No `window.print` path for waybills (only Purchase Order has one) |
| Blank template | `WaybillFormPage` → `downloadBlankWaybillTemplate(...)` | Separate React-PDF document, fixed Minimal layout, no render-model validation |

Template selection is persisted twice: `localStorage['WAYBILL_TEMPLATE_KEY']` and per-document `custom_fields.pdfTemplateId` (`buildWaybillCustomFields`). The DB value wins when the customize sheet is closed.

### 3.3 Functional requirements

`WaybillRenderModel` blocks (`renderContract.ts`):

- `branding`: name, tagline, logo, address, city, state, phone, email, website, `customInfo[]`.
- `header`: type (`internal`/`external`), waybillNumber, date, time, poNumber.
- `parties`: client name/address/phone/email/cityState, senderName, receiverName.
- `logistics`: vehiclePlate, driverName, deliveryMode, deliveryLocation, purpose.
- `notes`: rich-text-derived plain string.
- `signatures`: `sender` and `receiver`, each `{ url, width: 110, height: 42 }` or null.
- `footer`: waybillNumber, companyName.
- `pagination`: `repeatTableHeader`, `keepSignatureTogether`, `keepNotesTogether` (declared policy, consumed ad hoc by templates).
- `table`: `columns[{key,label}]`, `rows[{cells: Record<string,string>}]`.

Layout characteristics:

- All seven documents use `size="A4"`, portrait. No landscape variant.
- Fixed headers and footers (`<View fixed>` in Evergreen at lines 448 and 695); table header row is `fixed` (line 573) so it repeats.
- Signature image normalization (110×42) is enforced by the contract, then scaled per template.
- Logo images come from `model.branding.logo` (remote URL).
- `ThermalTemplate` is not a thermal printer page size: it is A4 with a two-up row of 295 pt receipt cards (`ThermalTemplate.tsx:20-40`), cream page `#f7f3ea` and card `#fffdf8`. `Minimal` and `Thermal` use `waybillMinimalStyles`/local `StyleSheet`.
- Customization: document font, handwriting font, handwriting colour; accent colour explicitly unsupported (`WAYBILL_CAPABILITIES.accentColor: false`). Ink colour reaches templates through `preset.fillableColor`.
- Six template choices in `WaybillTemplateSelector`: evergreen, minimal, thermal, classic, premium, slate.

### 3.4 Forme migration requirements

Reusable without change:

- `WaybillRenderModel` + `safeValidateRenderModel` — keep exactly as the renderer contract.
- `buildWaybillRenderModel` and all resolvers — no React-PDF imports (`notes.ts` uses `core/richText` only).
- `src/lib/pdf/*` delivery and feedback.
- `src/components/pdf/pdfcn/primitives.tsx`, `forme/fonts.ts`, `forme/glyphs.tsx`, `pdfcn/adapter.ts`.
- `waybillUtils` parsing/normalization (DB shape, signatures, custom fields).
- `WaybillDocumentPreview` (HTML) — unaffected.

Must be recreated:

- Six Forme template documents (`WaybillPdfTemplateId` → `*FormeDocument.tsx`), plus a dispatcher equivalent to `WaybillPDF`.
- The blank template (single-page contract comment in `blankWaybillTemplate.tsx:3-5`: signatures and footer must not spill to page two). Forme pagination must be verified against that contract.
- Fixed header/footer repetition and repeated table header on page breaks.
- Two-up receipt card layout for Thermal (absolute positioning inside an A4 page).
- Signature image scaling and missing-image behaviour.
- Per-template typography that currently comes from React-PDF `StyleSheet` (letterSpacing, lineHeight, textTransform).

Document-specific components to add:

- A Waybill Forme dispatcher that mirrors the `template` prop and the `WaybillPDF` null-on-invalid behaviour (or replaces it with an explicit error — a behaviour decision, not an audit decision).
- A Forme renderer for `WaybillMinimalContent` / blank data that does not depend on `waybillMinimalStyles.ts`.

Risks:

- **Six visual ports** is the largest layout workload of the three documents; each template is a distinct design.
- Thermal's cream palette and pseudo-perforation edges are drawing effects with no Forme equivalent helper yet.
- `pagination` flags are declared but not uniformly honoured today; a port can silently improve or regress page breaks.
- Blank waybill is generated from a form page, outside the render-model pipeline — easy to miss in a migration checklist.
- Signature URLs are remote; Forme image fetching and failure modes differ from React-PDF.

Dependencies on other modules: settings/company identity (`useSettings`), Supabase waybill rows (`mapDbWaybill`), customization engine, native export (`src/lib/native/pdfexport`), share sheet.

### 3.5 Removal requirements

Deletable after Waybill migration:

- `src/components/waybill/{Evergreen,Classic,Slate,Premium,Thermal,Minimal}Template.tsx`
- `src/components/waybill/WaybillPDF.tsx`
- `src/components/waybill/blankWaybillTemplate.tsx`
- `src/components/waybill/waybillMinimalStyles.ts` (only importer is `blankWaybillTemplate.tsx:9`)

Must remain:

- `waybillUtils.ts`, `WaybillSignatures.tsx`, `WaybillForm.tsx`, `WaybillFormOverlay.tsx`, `WaybillGatewayOverlay.tsx`, `WaybillImportSheet.tsx`, `WaybillTemplateSelector.tsx` (presentation only).
- Everything under `src/domain/waybill/`.

Can Waybill fully detach from React-PDF? **Yes.** Its only React-PDF touchpoints are the six templates, the dispatcher, the blank template and the three call sites in `ViewWaybill` (`downloadPdfFromElement`, `getPdfBlob`) plus `WaybillFormPage:125`.

---

## 4. CSR (Customer Service Report)

### 4.1 Current renderer

**Hybrid.**

| Template id | Label | Renderer | Path |
|---|---|---|---|
| `8` (default) | Industry | React-PDF | `src/components/csr/preview-templates/IndustryCsr.tsx` (501) |
| `3` | Zinc Light | React-PDF | `src/components/csr/preview-templates/Zinc.tsx` |
| `6` | Minimal | React-PDF | `src/components/csr/preview-templates/Minimal.tsx` |
| `csr-blueprint-landscape` (+ `.html` alias) | Landscape Blueprint | Forme/PDFCN | `src/components/pdf/pdfcn/csr/CsrLandscapeBlueprintTemplate.tsx` |
| `csr-reference-portrait` (+ `.html` alias) | Portrait Reference | Forme/PDFCN | `src/components/pdf/pdfcn/csr/CsrPortraitReferenceTemplate.tsx` |

| Role | Path |
|---|---|
| React-PDF template registry | `src/components/csr/preview-templates/index.tsx` (`getCsrPdfDocument`, `Template3/6/8`) |
| React-PDF shared parts | `preview-templates/components.tsx`, `ClientNotesBlock.tsx`, `layoutModel.ts`, `types.ts`, `utils.ts` |
| PDFCN/Forme registry | `src/components/pdf/pdfcn/csr/index.ts` (`isPdfcnCsrTemplate`, `csrLandscapeBlueprintDefinition`, `csrPortraitReferenceDefinition`, `registerAllCsrPdfcnTemplates`) |
| PDFCN preparation | `src/domain/pdf/resolver/csr/prepareCsrDocument.ts`, `csrPreparedContract.ts` |
| PDFCN materials/layout | `pdfcn/csr/csrMaterialsSchedule.tsx`, `csrPortraitMaterials.tsx`, `csrPortraitMaterialsLayout.ts`, `csrPortraitFonts.ts`, `blueprintSections.tsx`, `blueprintTitleBlock.tsx`, `csrPdfcnUtils.tsx` |
| Model | `src/domain/csr/csrRenderModel.ts` (`buildCsrRenderModel`), `src/components/csr/csrUtils.ts` (`buildCsrPreviewData:241`, `getCsrBranding`) |
| Production pages | `src/pages/ViewCSR.tsx` (561), `src/pages/CsrFormPage.tsx` (968) |
| Customization | `src/domain/pdf/customization/csr.ts` |
| Picker | `src/components/csr/CsrTemplateCarousel.tsx`, options in `src/components/csr/CSRPreviewContent.js:141` |

Entry routes: `AppShell.tsx:329` (`/csr/:id`); form pages `src/pages/NewCSR.tsx`, `src/pages/EditCSR.tsx`, `CsrFormPage.tsx`.

### 4.2 Rendering flow

1. `ViewCSR` loads the CSR, signatories and client, then `buildCsrPreviewData(csr, { signatories, client })` → `CsrRenderModel`; branding via `getCsrBranding(settings)`. Default template `'8'` from `getStoredTemplate()`.
2. Download branches on `isPdfcnCsrTemplate(template)`:
   - **Forme branch**: `generateCsrPdfcnPdf({ rawDocument: {...csr, ...previewData}, templateId, filename, deliver: true, options: { serviceProvider: { name, subtitle, address, contact, logoUrl } } })` → `resolvePdfcnDocument` → `renderPdfcnToBytes` → delivery.
   - **React-PDF branch**: `downloadPdfFromElement({ element: getCsrPdfDocument({ csr, comments, branding, template, designPreset }), subdirectory: 'csr' })`.
3. Share branches the same way inside `csrSharePayload.getPdfBlob()` (`ViewCSR.tsx:264-291`): PDFCN resolve/render, else `pdf(element).toBlob()`.
4. `CsrFormPage` has two PDF paths, both **hard-coded to template `'3'` (Zinc) and React-PDF**, with `designPreset: {} as any`:
   - `:436` blank CSR download;
   - `:573` field-mode auto-download after save (inside `if (isField)`).
5. Template selection: `CsrTemplateCarousel` fed by `CSR_TEMPLATE_OPTIONS`; persisted in `localStorage['csr_view_template']`, plus `csr_custom_font_stash` and `csr_custom_color_stash`.

Preview paths:

| Surface | Implementation |
|---|---|
| In-app CSR preview | `CsrDocumentPreview.tsx` (HTML + `CsrDocumentPreview.css`), mounted at `ViewCSR.tsx:552` |
| Legacy preview panel | `CSRPreviewPanel.tsx` (HTML inline styles/CSS vars; consumes `CSR_TEMPLATE_OPTIONS`, `resolvePdfWebFontFamily`) |
| Theme experiment | `src/pages/CsrThemeExperiment.tsx`, `src/components/csr-theme/csr-theme-preview.tsx` |

None of these are PDF-derived, so preview and PDF can drift independently.

### 4.3 Functional requirements

`CsrRenderModel` (`csrRenderModel.ts:13-90`):

- Identity: `csr_number`, `date`, `status`.
- Client: `client_name`, `address`, `po_number`, `show_po`.
- Call info: `call_type`, `callTypeDisplay`, `service_basis`, `serviceBasisDisplay`, `system_down`, `systemDownDisplay`.
- Equipment: type, location, make, model(+label), serial(+label), capacity, engine no(+label).
- Narrative: `problem_reported`, `service_rendered`, `defects_found`, `engineer_remarks`, `customer_feedback` (+ duplicate display aliases).
- Operational readings: `voltage`, `frequency`, `battery`, `temperature`, `pressure`, `hours` — keys aligned to `CSR_READING_FIELDS`.
- Service window: start/end date and time.
- Acknowledgement: name, title, role, show flag.
- Technician: name, role, signature URL, show-line flag, `technicianSignatory`.
- Materials: `materialsRows`, `materialsText`.
- Display controls: `showOperationalReadings`, `layoutDensity` (`comfortable | compact | tight`).

PDFCN preparation adds a stricter contract (`csrPreparedContract.ts`): `readings`, `narratives`, `materials[]`, `signatories`, service-provider block, plus layout metadata. `prepareCsrDocument.ts` is shared by both PDFCN templates; the landscape variant computes adaptive material columns, the portrait variant distributes materials across columns.

Layout constraints:

- React-PDF templates: A4 portrait (`IndustryCsr.tsx:307`, `Minimal.tsx:466`, `Zinc.tsx:204`), `Helvetica` base with `fillableBold` for handwriting fields.
- PDFCN landscape blueprint: `841.89 × 595.28` landscape, CAD-style frame, title block, BOM schedule.
- PDFCN portrait reference: A4 portrait, black masthead, amber docket bar, materials schedule.
- No images beyond logo and signature URL; no per-CSR photographs in the renderers.
- Density (`layoutDensity`) affects the React-PDF templates; the PDFCN templates derive their own spacing.

Customization:

- `CSR_CAPABILITIES` / `CSR_POLICY`: font, handwriting font, handwriting colour; no accent colour.
- `CSR_TEMPLATE_DEFAULTS` (`ViewCSR.tsx:60-66`) per template id: font/colour pairs.
- **Parity gap observed:** `designPreset` (resolved font and ink colour) is passed to the React-PDF templates only. The PDFCN branch receives `serviceProvider` branding but no font/ink options, so the two Forme CSR templates do not honour user customization today.

### 4.4 Forme migration requirements

Reusable without change:

- `prepareCsrDocument` / `validateCsrDocument` / `CanonicalPreparedCsr` — already the Forme-side contract.
- PDFCN CSR primitives, materials schedule components, `csrPdfcnUtils` (`BrandLogo`, `SignatureStage`, reading fields, formatting), `blueprintSections`/`blueprintTitleBlock`.
- `pdfcn/adapter.ts`, `forme/fonts.ts`, `glyphs.tsx`, `src/lib/pdf/*`.
- PDFCN template registration pattern (`registerPdfcnTemplate`, aliases).
- `CsrRenderModel` and `buildCsrPreviewData` — must stay, because the HTML previews, the picker and the share payload use them.

Must be recreated (three React-PDF templates):

- Zinc (`3`), Minimal (`6`) and Industry (`8`) as PDFCN template definitions with ids that survive stored preferences. Recommended: register new ids and map `'3' → zinc`, `'6' → minimal`, `'8' → industry` in `getStoredTemplate()` and `CSRPreviewContent` so saved `localStorage` values keep working. The PDFCN registry already demonstrates the alias technique.
- Their section ordering, table styling and sign-off blocks, matching the current A4 portrait output.
- The `layoutDensity` and `showOperationalReadings` behaviours, which exist only in the React-PDF templates today.

Document-specific components to add:

- Any layout primitive missing from `pdfcn/primitives.tsx` for these three designs (bordered field grids, dense material tables, dual sign-off stages). `SignatureStage` and the portrait materials layout cover most of it.
- Customization parity: pass resolved font/ink into the new definitions (or deliberately declare CSR React-PDF templates as the last customization-aware ones and migrate the renderers with that gap recorded).

Risks:

- **Highest semantic risk of the three documents**: readings, narratives, materials and sign-off all appear in fixed slots; a port can drop a field silently. `CsrRenderModel` has display aliases (`modelLabel`/`serialLabel`, `defectsFound`/`defects_found`) that templates use inconsistently.
- `CsrFormPage` hard-codes template `'3'`; removing `getCsrPdfDocument` requires updating those two call sites and deciding whether blank CSRs should follow the user's template.
- The PDFCN branch ignores customization; a naive migration that routes `'3'/'6'/'8'` to PDFCN today would visibly lose font/ink settings for existing users.
- The default template (`'8'`) is the most-used path, so Industry must be migrated with the most visual care.
- Landscape blueprint is the only landscape document in this audit; its page size is declared in page points, not A4 shorthand.

Dependencies on other modules: signatories table, clients table, settings/branding, offline CSR creation (`src/lib/native/csrOffline.ts`, `csrSync.ts`), project link dialog, share sheet.

### 4.5 Removal requirements

Deletable after migrating `'3'`, `'6'`, `'8'`:

- `src/components/csr/preview-templates/IndustryCsr.tsx`, `Zinc.tsx`, `Minimal.tsx`
- `src/components/csr/preview-templates/index.tsx`, `components.tsx`, `ClientNotesBlock.tsx` (if unused by remaining previews), `types.ts` where not shared with `csrUtils`
- The React-PDF branches in `ViewCSR` (`:288-290`, `:298-321`), `CsrFormPage` (`:3`, `:436`, `:573`)
- `registerPdfFillableFonts()` call at `preview-templates/index.tsx:7` (the last load-time registration outside `pdfFontRegistry` consumers)

Must remain:

- PDFCN CSR templates and their helpers.
- `CSRPreviewContent.js` (options + variant mapping), `CsrTemplateCarousel.tsx`, `CSRPreviewPanel.tsx`, `CsrDocumentPreview.tsx`, `csrUtils.ts`, `csrRenderModel.ts`.
- `src/lib/native/csrOffline.ts`, `csrSync.ts`, `src/pages/view-csr-actions.ts`.

Can CSR fully detach from React-PDF? **Yes, and it is closest to that state** — half the templates already render through Forme and the Forme-side data contract exists.

---

## 5. Receipt

### 5.1 Current renderer

**React-PDF only.**

| Role | Path |
|---|---|
| Renderer | `src/components/pdf/ReceiptPdf.tsx` (286) |
| Model builder | `src/domain/receipt/previewModel.ts` (`ReceiptPreviewData:3-47`, `buildReceiptPreviewData:98`) |
| Types / repository | `src/domain/receipt/types.ts`, `receiptRepository.ts`, `assertReceiptImmutable.ts`, `receiptNumber.ts`, `snapshotBuilder.ts` |
| Production page | `src/pages/ViewReceipt.tsx` (218) |
| Generator | `src/lib/pdf/DefaultPdfGenerator.ts` |
| Fonts | `src/lib/pdfFontRegistry.ts` (`registerPdfFonts`) |
| Currency text | `src/components/pdf/pdfCurrency.tsx` |

Entry route: `AppShell.tsx:387` (`/receipts/:id`). Receipt listing: `src/pages/Receipts.tsx`.

### 5.2 Rendering flow

1. `ViewReceipt` loads `receipts` row by id, then `buildReceiptPreviewData(receipt)`.
2. `getPdfDesignPreset('receipt')` supplies the preset (defaults: Helvetica path, accent `#14b8a6`, surface `#f8fafc`).
3. Download: `registerPdfFonts()` → `new DefaultPdfGenerator(() => <ReceiptPdf model designPreset />)` → `generate()` (React-PDF `toBlob`) → `CompositePdfDelivery`.
4. Share: `receiptSharePayload.getPdfBlob()` → `pdf(<ReceiptPdf .../>).toBlob()` (`ViewReceipt.tsx:123-126`).
5. No template selection, no customize sheet, no print path. Preview is a set of HTML summary cards inside `ViewReceipt` — not a PDF preview.

Download and share therefore use the same renderer through different call sites; the only behavioural difference is delivery vs. share transport.

### 5.3 Functional requirements

`ReceiptPreviewData`:

- Company: name, address, email, phone, logo URL.
- Client: name, address, city, state, phone, email.
- Payment: amount, date, method, reference, cash amount, WHT amount, currency code.
- Invoice: number, total, subtotal, VAT, WHT, discount.
- Project: name, code (optional block).
- Bank: name, account number, account name (optional block).
- Signatory: name, role, signature URL.
- Status: `active | voided`; computed `amountInWords`.
- `createdAt` is carried but not printed.

Layout:

- A4 portrait, padding 30, base font size 10 (`ReceiptPdf.tsx:66`, `styles.page`).
- Header (company block + 60×60 logo), centred title `PAYMENT RECEIPT`, three-column meta, divider, client block, payment box, invoice reference, project, bank, void note, fixed four-line `TERMS` constant, signature row, footer.
- **No pagination behaviour**: a single `Page` with no `wrap`; long content overflows rather than flowing. Amount-in-words and optional blocks are the growth points.
- Currency amounts use `PdfCurrencyText` (React-PDF `Text` with glyph fallback) for the main amount only; the invoice reference block prints raw `toLocaleString()` numbers with no currency symbol or code — an inconsistency in the current renderer, recorded here rather than changed.
- Signature renders only if `signatorySignatureUrl` exists; otherwise the block shows a rule and labels.
- `TERMS` is a hardcoded English constant; the footer repeats "computer-generated receipt" already stated in the terms list.

### 5.4 Forme migration requirements

Reusable:

- `ReceiptPreviewData` + `buildReceiptPreviewData` unchanged.
- `src/lib/pdf/*` delivery, feedback; `DefaultPdfGenerator` call site can be replaced by the Forme render helper.
- `pdfcn/primitives.tsx`, `forme/fonts.ts`, `glyphs.tsx` (important: the currency glyph and `amountInWords` text need coverage fonts), `pdfcn/adapter.ts`.

Must be recreated:

- One A4 portrait Forme document reproducing the current section order and spacing.
- The currency glyph handling currently provided by `PdfCurrencyText` (Forme equivalent: `glyphRuns` from `forme/glyphs.tsx`).
- Preset-driven typography/colour: `resolvePdfFontFamily` produces Helvetica names; a Forme port must map preset choices to Forme families via `ensureFormeFontFamily`, with `Helvetica` mapped to Inter or the approved equivalent.
- Pagination decision: either keep single-page overflow behaviour for parity, or add page wrapping deliberately. This is a product decision, not a mechanical port.

Risks:

- Single-page overflow means very long receipts may already clip; a Forme port with `wrap` would change output. Parity must be decided before implementation.
- `TERMS` text and duplicate footer line are hardcoded; porting them verbatim preserves the duplication.
- Amount-in-words is long-form text (e.g. "One Million Two Hundred Thousand Naira and Fifty Kobo") and uses no special glyphs, but the payment amount uses the currency glyph font.
- No PDF preview exists, so visual acceptance must come from rendered PDFs.

Dependencies with other modules: `useSettings` (logo/company), `useEntity` (tenant client), receipts immutability/snapshot rules, share sheet, native export.

### 5.5 Removal requirements

Deletable after migration:

- `src/components/pdf/ReceiptPdf.tsx`
- The React-PDF branches in `ViewReceipt` (`:59-64` generator, `:123-126` share blob)
- `registerPdfFonts()` call in `ViewReceipt.tsx:59` (last consumer besides CSR previews)

Must remain:

- `src/domain/receipt/*` (numbers, immutability, snapshots, repository).
- `src/components/pdf/pdfCurrency.tsx` **only** while RFQ and Project Documents still use it; Receipt is its third consumer, not its only one.
- `src/lib/pdf/*` (engine-agnostic).

Can Receipt fully detach from React-PDF? **Yes, and it is the smallest complete migration** — one file, one template, one page, no template persistence.

---

## 6. Shared React-PDF infrastructure

| Component | Path | React-PDF dependency | Consumers | Fate |
|---|---|---|---|---|
| Preset / family resolver | `src/lib/pdfDesignPreset.ts` | none (returns Helvetica names) | Waybill, CSR, Receipt, CPS, Invoice overlays, Forme Industry, UI controls | **Keep**, but the Helvetica branch needs an engine-neutral replacement before React-PDF removal |
| Shared font source data | `src/lib/pdfSharedFonts.ts` | data only (`@fontsource` woff) | `pdfFontRegistry`, preset resolver | Remove with React-PDF; Forme has `public/fonts` |
| Fillable font sources | `src/lib/pdfFillableFonts.ts` | woff assets | `pdfFontRegistry`, preset resolver, CSR previews | Remove with React-PDF |
| Font registration | `src/lib/pdfFontRegistry.ts` | `Font` | Receipt, CSR previews, `domain/pdf/customization/fontRegistry` | Remove last (shared) |
| Currency text | `src/components/pdf/pdfCurrency.tsx` | `Text` | Receipt, RFQ, Project Documents | Replace with Forme glyph runs when all three migrate |
| Download helper | `src/components/document-view/shared/downloadPdf.tsx` | dynamic `pdf()` | CSR, Waybill, RFQ | Replace with an engine-neutral helper; blocked by RFQ |
| Generator | `src/lib/pdf/DefaultPdfGenerator.ts` | dynamic `pdf()` | Receipt | Deprecate/delete |
| Delivery layer | `src/lib/pdf/{PdfAsset,PdfDelivery,CompositePdfDelivery,WebPdfDelivery,NativePdfDelivery,FeedbackBus,DefaultFeedbackBus,PdfGenerator,types,index}.ts` | none | All documents | **Keep as is** |
| Rich text helpers | `src/components/pdf/core/{richText,description,displayValue,safeText}.ts` | none | Invoice, quotation, waybill engine, editor, save hooks | **Keep** |
| Commercial data adapter | `src/components/pdf/industryAdapter.ts` | none | All Forme commercial docs, `designTokens`, engine | **Keep** |
| Commercial engine | `src/components/pdf/engine/*` | none | Forme commercial docs | **Keep** |
| Design tokens | `src/components/pdf/designTokens.ts` | none | Forme commercial docs | **Keep** |
| Table helpers | `src/components/pdf/table.ts` | none | Forme commercial, exports from `pdf/index.ts` | **Keep** |
| Template table layout | `src/components/pdf/templateTableLayout.ts` | none | **No importers found** | **Unused — potentially removable** |
| PDFCN primitives | `src/components/pdf/pdfcn/primitives.tsx` | none | Forme commercial + CSR | **Keep** |
| PDFCN adapter | `src/components/pdf/pdfcn/adapter.ts` | none | Forme commercial + CSR | **Keep** |
| Forme documents | `src/components/pdf/forme/*` | none | Invoice, quotation, PO, CPS | **Keep** |

Evidence that Forme's commercial stack is already React-PDF-free: `src/components/pdf/index.ts`, `forme/*`, `pdfcn/*`, `engine/*`, `core/*`, `designTokens.ts`, `industryAdapter.ts` import nothing from `@react-pdf`.

---

## 7. Global React-PDF consumer inventory

Every repository import of `@react-pdf/renderer` (source, tests, scripts) is listed. `src/tests` contains no React-PDF imports; `scripts/` contains none. `docs/` POC material is documentation, not a consumer.

| # | Consumer | Classification | Blocking? |
|---|---|---|---|
| 1 | `src/components/waybill/WaybillPDF.tsx` | WAYBILL-ONLY | Yes — Waybill |
| 2 | `src/components/waybill/EvergreenTemplate.tsx` | WAYBILL-ONLY | Yes — Waybill |
| 3 | `src/components/waybill/ClassicTemplate.tsx` | WAYBILL-ONLY | Yes — Waybill |
| 4 | `src/components/waybill/SlateTemplate.tsx` | WAYBILL-ONLY | Yes — Waybill |
| 5 | `src/components/waybill/PremiumTemplate.tsx` | WAYBILL-ONLY | Yes — Waybill |
| 6 | `src/components/waybill/ThermalTemplate.tsx` | WAYBILL-ONLY | Yes — Waybill |
| 7 | `src/components/waybill/MinimalTemplate.tsx` | WAYBILL-ONLY | Yes — Waybill |
| 8 | `src/components/waybill/blankWaybillTemplate.tsx` | WAYBILL-ONLY | Yes — Waybill (form page) |
| 9 | `src/components/waybill/waybillMinimalStyles.ts` | WAYBILL-ONLY | Yes — blank template only |
| 10 | `src/pages/ViewWaybill.tsx` | WAYBILL-ONLY | Yes — download + share |
| 11 | `src/pages/WaybillFormPage.tsx` (dynamic import at `:125`) | WAYBILL-ONLY | Yes — blank generation |
| 12 | `src/components/csr/preview-templates/index.tsx` | CSR-ONLY | Yes — CSR |
| 13 | `src/components/csr/preview-templates/IndustryCsr.tsx` | CSR-ONLY | Yes — CSR default |
| 14 | `src/components/csr/preview-templates/Zinc.tsx` | CSR-ONLY | Yes — CSR |
| 15 | `src/components/csr/preview-templates/Minimal.tsx` | CSR-ONLY | Yes — CSR |
| 16 | `src/components/csr/preview-templates/components.tsx` | CSR-ONLY | Yes — CSR |
| 17 | `src/components/csr/preview-templates/ClientNotesBlock.tsx` | CSR-ONLY | Yes — CSR |
| 18 | `src/pages/ViewCSR.tsx` | CSR-ONLY | Yes — CSR |
| 19 | `src/pages/CsrFormPage.tsx` | CSR-ONLY | Yes — blank/save |
| 20 | `src/components/pdf/ReceiptPdf.tsx` | RECEIPT-ONLY | Yes — Receipt |
| 21 | `src/pages/ViewReceipt.tsx` | RECEIPT-ONLY | Yes — Receipt |
| 22 | `src/components/pdf/pdfCurrency.tsx` | SHARED-BY-TARGET-DOCUMENTS | Yes — Receipt + RFQ + Project docs |
| 23 | `src/lib/pdfFontRegistry.ts` | SHARED-BY-TARGET-DOCUMENTS | Yes — Receipt + CSR (+ Waybill via customization bridge) |
| 24 | `src/components/document-view/shared/downloadPdf.tsx` | SHARED-BY-TARGET-DOCUMENTS | Yes — CSR + Waybill + RFQ |
| 25 | `src/lib/pdf/DefaultPdfGenerator.ts` | RECEIPT-ONLY | Yes — Receipt |
| 26 | `src/components/rfq/RfqPdfDocument.tsx` | SHARED-WITH-OTHER-PRODUCTION-MODULES | Yes — blocks package removal |
| 27 | `src/components/table-document/TableDocumentPdfDocument.tsx` | SHARED-WITH-OTHER-PRODUCTION-MODULES | Yes — blocks package removal |
| 28 | `src/pages/ViewRfq.tsx` | SHARED-WITH-OTHER-PRODUCTION-MODULES | Yes — blocks package removal |
| 29 | `src/components/project/ProjectDocumentPDF.tsx` | SHARED-WITH-OTHER-PRODUCTION-MODULES | Yes — blocks package removal |
| 30 | `src/pages/ProjectDocumentView.tsx` | SHARED-WITH-OTHER-PRODUCTION-MODULES | Yes — blocks package removal |
| 31 | `src/components/project/ProjectDocumentCard.tsx` | SHARED-WITH-OTHER-PRODUCTION-MODULES | Yes — blocks package removal |
| 32 | `src/lib/pdfSharedFonts.ts` (data) | SHARED-BY-TARGET-DOCUMENTS | Remove last |
| 33 | `src/lib/pdfFillableFonts.ts` (data) | SHARED-BY-TARGET-DOCUMENTS | Remove last |
| 34 | `src/domain/pdf/customization/fontRegistry.ts` | SHARED-BY-TARGET-DOCUMENTS | Remove last |
| 35 | `src/domain/pdf/customization/waybill.ts` / `csr.ts` | SHARED-BY-TARGET-DOCUMENTS | Keep (engine-neutral preset bridges) |
| 36 | `src/lib/pdfDesignPreset.ts` | SHARED-WITH-OTHER-PRODUCTION-MODULES | Keep; Helvetica branch needs rework |
| 37 | `src/components/pdf/templateTableLayout.ts` | UNUSED / POTENTIALLY REMOVABLE | None found — no imports anywhere |
| 38 | `temp-build/*.woff`, `temp-build/{index,csrUtils}.js` | UNUSED / POTENTIALLY REMOVABLE | 42 tracked files, no importers; only `eslint.config.js:15` and two audit docs mention the folder |
| 39 | 17 unused `@fontsource/*` packages (of 19 declared) | UNUSED / POTENTIALLY REMOVABLE | Declared in `package.json`, not imported |
| 40 | `docs/reports/pdf/poc/**` (incl. `inter-var.ttf`) | UNKNOWN / REQUIRES FURTHER INVESTIGATION | Documentation assets, not built |

### 7.1 Indirect / dynamic loading checks

- `ViewCSR` and `ViewWaybill` load React-PDF dynamically inside `getPdfBlob`. A static import grep alone would have missed these; they are included above.
- `ViewReceipt` loads it indirectly through `DefaultPdfGenerator`, which is dynamically imported only at call time.
- `WaybillFormPage` loads `blankWaybillTemplate` dynamically, which then imports React-PDF statically.
- `pdfCurrency.tsx` is imported by RFQ and Project Documents, so Receipt is not its only user.
- `pdfFontRegistry` is reached from `domain/pdf/customization/fontRegistry`, which is imported at module scope by `WaybillPDF.tsx`, so **importing the Waybill dispatcher registers React-PDF fonts today**. Any migration must remove that module-scope side effect.

### 7.2 Dependency inventory

`package.json`:

- `"@react-pdf/renderer": "^4.3.2"` (line 63).
- `bun.lock` resolves 13 `@react-pdf/*` packages: `fns`, `font`, `image`, `layout`, `pdfkit`, `primitives`, `reconciler`, `render`, `renderer`, `stylesheet`, `svg`, `textkit`, `types`.
- `@fontsource/*` declared: 19 packages. Imported: `@fontsource/inter`, `@fontsource/noto-sans` (`src/lib/pdfSharedFonts.ts:1-6`), plus `@fontsource-variable/inter` in `src/main.tsx:6`. Unused: caveat, cormorant-garamond, dejavu-sans, handlee, kalam, lato, montserrat, open-sans, orbitron, patrick-hand, poppins, raleway, reenie-beanie, roboto, roboto-condensed, source-sans-pro, sue-ellen-francisco.
- `pdf-lib`, `mupdf`, `mupdf-js`, `pdfjs-dist`, `takumi-pdf`, `pdf-parse` are unrelated to React-PDF rendering; the Forme test suites use `pdf-lib`/`mupdf`/`pdfjs-dist` for verification only (`src/tests/pdf/forme*`).
- No lockfile or manifest may be changed by this audit; these are findings, not actions.

### 7.3 Can `@react-pdf/renderer` be removed?

**Not today.** Minimum blockers, in order of dependency safety:

1. Receipt (`ReceiptPdf.tsx`, `ViewReceipt.tsx`) — smallest.
2. Waybill (8 files + `ViewWaybill` + `WaybillFormPage`).
3. CSR legacy templates + `CsrFormPage` + `ViewCSR` fallback.
4. RFQ (`RfqPdfDocument` → `TableDocumentPdfDocument` → `ViewRfq`).
5. Project Documents (`ProjectDocumentPDF`, `ProjectDocumentView`, `ProjectDocumentCard`).
6. Shared helpers: `pdfCurrency.tsx`, `downloadPdfFromElement`, `pdfFontRegistry`, `pdfSharedFonts`, `pdfFillableFonts`, `DefaultPdfGenerator`, and the Helvetica branch of `pdfDesignPreset.ts`.

Only after all six is `@react-pdf/renderer` and its 12 sibling packages removable.

---

## 8. Proposed migration and purge order

Order is chosen by dependency safety and blast radius, not by document convenience.

**Step 0 — Prerequisites (no code change required by this audit; listed for planning)**

- Decide the Forme font mapping for preset families, including the Helvetica fallback. Without it, a ported Receipt or Waybill silently changes typeface.
- Decide the Forme equivalent of `PdfCurrencyText` (currency glyph) and of the glyph-fallback behaviour for amounts and engineering units.
- Decide the pagination policy for Receipt and blank Waybill before porting.
- Decide whether the PDFCN CSR templates must honour customization, or whether that gap is accepted.

**Step 1 — Receipt (lowest risk)**

- Add a Forme Receipt document; keep `ReceiptPreviewData` and `src/domain/receipt/*` untouched.
- Replace `DefaultPdfGenerator` + `registerPdfFonts` call sites in `ViewReceipt` with the Forme render/delivery path.
- Delete `ReceiptPdf.tsx`; `DefaultPdfGenerator` and `pdfFontRegistry` remain for CSR.
- Visual acceptance from rendered PDFs, single page, voided and non-voided, with and without logo/signature, long amount-in-words.

**Step 2 — Waybill**

- Port templates in this order: Evergreen (default), Classic, Slate, Minimal, Premium, Thermal.
- Keep `WaybillRenderModel`, validation and `pagination` semantics; verify fixed header/footer and repeated table header.
- Port the blank template last; verify the single-page contract and the form-page entry.
- Update `ViewWaybill` download and share to one engine; delete the six templates, dispatcher, blank template and `waybillMinimalStyles.ts`.
- Watch the module-scope `registerPdfCustomizationFillableFonts()` in `WaybillPDF.tsx` — it must not survive as a side effect.

**Step 3 — CSR**

- Register the three missing PDFCN templates (`zinc`, `minimal`, `industry`) using `prepareCsrDocument`.
- Preserve stored ids via alias mapping in `getStoredTemplate()` and the PDFCN registry.
- Close the customization parity gap deliberately (fonts and ink colour).
- Repoint `ViewCSR` (download + share) and `CsrFormPage` (blank + save auto-download) to the new definitions; delete `preview-templates/*` React-PDF files.
- Verify readings, narratives, materials, dual sign-off, density modes, landscape blueprint and portrait reference.

**Step 4 — Shared infrastructure**

- Replace `pdfCurrency.tsx` usage in RFQ and Project Documents (or migrate those documents first).
- Replace `downloadPdfFromElement` with an engine-neutral helper; retarget `ViewRfq`.
- Delete `pdfFontRegistry.ts`, `pdfSharedFonts.ts`, `pdfFillableFonts.ts`, `src/assets/pdf-fonts/*` (after confirming Forme uses `public/fonts/Caveat-*.ttf`), `DefaultPdfGenerator.ts`.
- Split `pdfDesignPreset.ts`: keep preset storage/sanitisation; move family resolution to an engine-aware module.
- Remove `templateTableLayout.ts` (no importers), `temp-build/`, the 17 unused `@fontsource/*` dependencies (of 19 declared), and finally `@react-pdf/renderer`.

**Step 5 — Optional / follow-up**

- Project Documents and RFQ are the last external consumers. If they are migrated too, `@react-pdf/renderer` disappears entirely.

Safety notes:

- Removing `pdfCurrency.tsx`, `downloadPdfFromElement` or `pdfFontRegistry` before Steps 1–3 breaks remaining consumers at runtime, not at compile time, because most call sites are dynamic imports.
- `src/lib/pdf/*` must not be deleted with React-PDF; it is the engine-neutral delivery layer.

---

## 9. Risks not resolved by this audit

1. **No PDF is generated by this audit**, so no claim is made about the current visual output of any of the nine renderers.
2. **Previews are HTML, PDFs are separate implementations** for all three documents. Preview parity is not evidence of PDF parity.
3. **Thermal Waybill uses cream surfaces** (`#f7f3ea`, `#fffdf8`) while other templates are white. Whether the migration should preserve or neutralise them is a product decision.
4. **`CsrFormPage` ignores the user's template** and always renders Zinc for blank and field-mode downloads; a migration that changes this is a product change.
5. **Receipt has no pagination and duplicates its footer disclaimer**; a mechanical port preserves both, a "fix" changes output.
6. **Retired families remain in type lists** (`src/lib/pdfDesignPreset.ts`, `src/domain/pdf/customization/resolver.ts`) and are normalised to Inter/Caveat. Migration must not resurrect them by reading old stored values directly.
7. **`registerPdfCustomizationFillableFonts()` runs at import time in `WaybillPDF.tsx`**, so tests or previews that import the dispatcher currently register React-PDF fonts as a side effect.
8. **Unverified:** Android/Capacitor build output and any native print/share integration that might reference React-PDF assets. Not inspected; not needed for this audit's scope.
9. **Unverified:** whether `docs/reports/pdf/poc/` assets are consumed by any script outside `src/` (none found by targeted search).

---

## 10. Verification statement

- Read-only inspection only: `git status`, `git log`, `git ls-files`, `find`, `grep`, `wc`, file reads.
- Baseline `git status --porcelain --untracked-files=all`: 132 entries, all `scratch/`; zero tracked modifications.
- No `bun run build`, `typecheck`, `audit:load`, lint, tests, installs, fixers, formatting or dependency changes.
- No source, test, manifest, lockfile, template registration or preference was modified.
- This report is the only file added by the audit; post-audit `git status` is recorded in the session and matches the baseline plus this report.
