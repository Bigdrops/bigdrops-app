# RichText to EditorCN Pre-Migration Audit Report

This report was written by Antigravity on 2026-11-08 via Local Runner.

---

## 1. Executive Summary

This report documents the static pre-migration audit for replacing the legacy TipTap rich-text editor in the BOURXE platform with a unified, shadcn-native editor (`editorcn` paradigm) targeting `src/components/ui/editor.tsx`.

The audit was conducted under a strict **ZERO-CODE-CHANGE** mandate. No source files, configurations, lockfiles, or packages were altered. No build, typecheck, lint, or test commands were executed.

### Key Audit Findings
1. **Repository Reality vs. External Bloat:** The repository contains **no external editor stylesheets** (`style.css`), no bespoke mention or embed extensions, and no multi-group toolbars. The legacy implementation is completely isolated inside a single 154-line component (`src/components/RichTextEditor.tsx`).
2. **Consumer Footprint:** Exactly three direct consumers load `RichTextEditor.tsx`:
   - `src/components/document/FormNotesTerms.tsx` (Invoices and Quotations, lazy-loaded)
   - `src/components/waybill/WaybillForm.tsx` (Waybill notes and terms, lazy-loaded)
   - `src/components/correspondence/LetterBodyEditor.tsx` (Correspondence letters, eager-loaded)
3. **Downstream Contracts are Locked:** Commercial document persistence, PDF compilation (`@formepdf/react` and `@react-pdf/renderer`), and AI JSON imports rely on a strict HTML tag whitelist (`<p>`, `<strong>`, `<em>`, `<u>`, `<h1>`-`<h3>`, `<ul>`, `<ol>`, `<li>`) governed by `normalizeRichTextHtml()` in `src/components/pdf/core/richText.ts`. The new `editorcn` component must emit exactly this format.
4. **Strikethrough Incompatibility:** While TipTap supports strikethrough (`<s>`), neither PDF renderer (`pdfRichText.ts` nor `formeRichText.tsx`) supports strikethrough. The strikethrough control should either be omitted from `editorcn` or downstream PDF renderers must be extended.
5. **Correspondence Strip-Down:** `LetterBodyEditor.tsx` intentionally strips all HTML formatting to plain text upon change (`htmlToText()`). Rich styling is not currently persisted for letters.

---

## 2. Audit Scope and Methodology

### Scope
- Every editor implementation, toolbar, and extension in `src/components/`.
- Every direct and indirect consumer in pages, forms, and sheets.
- HTML normalization, sanitization, and projection pipelines.
- Forme PDF and React-PDF rich-text compilation pipelines.
- AI JSON import validation and normalization pipelines.
- TipTap packages in `package.json` and `bun.lock`.
- Existing regression test coverage for rich text and PDF pipelines.

### Methodology
- Static code analysis using regex pattern matching and Abstract Syntax Tree inspection.
- Caller hierarchy tracing from consumer components down to persistence hooks and database schemas.
- Contract inspection of `normalizeRichTextHtml()`, `commercialRichTextToHtml()`, and `parseRichText()`.
- Pre-audit and post-audit `git status` verification.

---

## 3. Phase 1: Legacy Editor Inventory

| Item | Repository Path | Responsibility | Direct Imports | Active Consumers | Category | Eventual Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Legacy Editor** | `src/components/RichTextEditor.tsx` | TipTap instance, custom button toolbar, input/output syncing | `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `lucide-react`, `@/lib/utils`, `@/components/pdf/core/richText` | `FormNotesTerms.tsx`, `WaybillForm.tsx`, `LetterBodyEditor.tsx` | Editor-specific component | **REPLACE** by `src/components/ui/editor.tsx`, then **NUKE** |
| **Letter Adapter** | `src/components/correspondence/LetterBodyEditor.tsx` | Bridges TipTap HTML to plain text for letter body | `@/components/RichTextEditor`, `@/domain/correspondence/letter/types` | `src/pages/LetterFormPage.tsx` | Consumer adapter | **MIGRATE** to consume `editor.tsx` |
| **Stylesheets** | N/A | None exist in the repository | N/A | None | N/A | **CONFIRMED ABSENT** (No legacy CSS files to nuke) |

### Discovered Implementation Details in `RichTextEditor.tsx`
- **Extensions Registered:**
  - `StarterKit.configure({ strike: false, bulletList: { keepMarks: true, keepAttributes: false }, orderedList: { keepMarks: true, keepAttributes: false } })`
  - `Underline` (`@tiptap/extension-underline`)
- **Formatting Buttons:** Bold, Italic, Underline, Bullet List, Numbered List, Clear Formatting.
- **Placeholder Implementation:** Absolute-positioned overlay `div` conditioned on `editor.isEmpty`.
- **Value Synchronization:** `useEffect` synchronizes `value` into `editor.commands.setContent()` only when `!editor.isFocused` and content differs.
- **Output Emission:** Emits `normalizeRichTextHtml(editor.getHTML())` on every `onUpdate`.

---

## 4. Phase 2: Consumer and Data-Flow Matrix

```
[FormNotesTerms.tsx]  (Invoice/Quotation)  -->  lazy(RichTextEditor)  -->  updateInvoice('notes'/'terms')  -->  useInvoiceSave / useQuotationSave
[WaybillForm.tsx]     (Waybill)            -->  lazy(RichTextEditor)  -->  updateWaybill('notes'/'terms')  -->  Waybill state / Supabase
[LetterFormPage.tsx]  (Correspondence)    -->  LetterBodyEditor      -->  htmlToText()                    -->  useLetterSave (Plain Text Blocks)
[JSON Import Sheet]   (AI / JSON)          -->  commercialRichText    -->  normalizeImportedRichTextField  -->  importAdapter -> FormNotesTerms
```

| Consumer | Exact File Path | Loading Mechanism | Value Input Contract | Change Callback Contract | Persistence Hook / Target | HTML Normalization Location | Lazy Loading Requirement |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Invoice Notes & Terms** | `src/components/document/FormNotesTerms.tsx` | `lazy(() => import('@/components/RichTextEditor'))` | `invoice.notes?: string \| null`, `invoice.terms?: string \| null` | `(value: string) => updateInvoice('notes' \| 'terms', value)` | `src/hooks/useInvoiceSave.ts` -> Supabase `invoices` table | `RichTextEditor.tsx` (onUpdate) and `useInvoiceSave.ts` (on save) | **CRITICAL: PRESERVE** (Prevents bundling TipTap into initial page load) |
| **Quotation Notes & Terms** | `src/components/document/FormNotesTerms.tsx` | `lazy(() => import('@/components/RichTextEditor'))` | `invoice.notes?: string \| null`, `invoice.terms?: string \| null` | `(value: string) => updateInvoice('notes' \| 'terms', value)` | `src/hooks/useQuotationSave.ts` -> Supabase `quotations` table | `RichTextEditor.tsx` (onUpdate) and `useQuotationSave.ts` (on save) | **CRITICAL: PRESERVE** |
| **Waybill Notes & Terms** | `src/components/waybill/WaybillForm.tsx` | `lazy(() => import('@/components/RichTextEditor'))` | `waybill.notes ?? ''`, `terms: string` | `(v) => updateWaybill('notes', v)`, `(v) => setTerms(v)` | `updateWaybill` / Waybill save action -> Supabase `waybills` table | `RichTextEditor.tsx` (onUpdate) | **CRITICAL: PRESERVE** |
| **Correspondence Letter** | `src/components/correspondence/LetterBodyEditor.tsx` | Eager static import | `value: string` (plain text with `\n`) | `(v: string) => update("bodyText", v)` (plain text) | `src/hooks/useLetterSave.ts` -> Supabase `letters` table | `htmlToText()` strips all HTML tags to text | Optional (page is dedicated) |

---

## 5. Phase 3: Commercial HTML Contract Audit

### Normalization Behavior (`src/components/pdf/core/richText.ts`)
The canonical normalization function is `normalizeRichTextHtml(value: unknown): string`.

1. **Accepted Inputs:**
   - Null or undefined (returns `''`).
   - Empty or whitespace string (returns `''`).
   - Plain text string (converts double newlines to `<p>`, single newlines to `<br />`).
   - HTML string with supported or unsupported markup.
   - Structured JSON rich-text block array (`CommercialRichTextBlock[]`).
2. **Supported Markup Whitelist:**
   - Paragraphs: `<p>...</p>`
   - Headings: `<h1>`, `<h2>`, `<h3>` (Levels 4 to 6 are clamped down to `<h3>`).
   - Lists: `<ul><li>...</li></ul>` and `<ol><li>...</li></ol>`.
   - Inline Marks: `<strong>`, `<em>`, `<u>`.
3. **Disallowed Markup & Sanitization:**
   - `<script>` and `<style>` blocks and their inner contents are completely deleted.
   - Event handlers (`onclick=`, `onload=`) and `javascript:` URLs are stripped.
   - Inline `style="..."` attributes and class names are stripped.
   - Non-whitelisted tags (`<div>`, `<span>`, `<table>`, `<blockquote>`, `<iframe>`) have their tags stripped while preserving inner text.
   - HTML entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`) are decoded during parsing and re-escaped cleanly without double-escaping.
4. **Idempotence:**
   `normalizeRichTextHtml(normalizeRichTextHtml(html)) === normalizeRichTextHtml(html)`.
5. **Persistence Safeguard:**
   In `useInvoiceSave.ts` and `useQuotationSave.ts`, if an existing document is edited without modifying notes or terms (`invoice.notes === initialInvoiceSnapshot?.notes`), the database value is NOT re-normalized. This prevents unintended markup shifts when saving unrelated invoice fields.

### JSON Import Contracts (`src/domain/import/normalize.ts` & `src/lib/commercialRichText.ts`)
When AI imports or structured JSON files are ingested:
1. `normalizeImportedRichTextField` accepts null, legacy text string, or `CommercialRichTextBlock[]`.
2. Valid structured blocks:
   - `type: 'paragraph'`, `children: Array<{ text: string, bold?: boolean, italic?: boolean, underline?: boolean }>`
   - `type: 'heading'`, `text: string`, `level?: 1 | 2 | 3`
   - `type: 'ordered_list' | 'unordered_list'`, `items: Array<Array<{ text: string, ... }>>`
3. `commercialRichTextToHtml()` serializes these blocks directly into the exact HTML format expected by TipTap and `normalizeRichTextHtml()`.
4. **Result:** The new `editorcn` component is completely compatible with JSON import data without requiring any adapter changes.

---

## 6. Phase 4: PDF Compatibility Audit

PDF compilation operates across two separate rendering engines:
1. **Forme PDF:** `src/components/pdf/forme/formeRichText.tsx` (`renderFormeRichText`) using `@formepdf/react`.
2. **React-PDF:** `src/components/pdf/core/pdfRichText.ts` (`renderPdfRichText`) using `@react-pdf/renderer`.

### Element Support Matrix

| Element | HTML Tag | Forme PDF Support | React-PDF Support | Proposed `editorcn` Generation | Legacy Support Required |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Paragraph** | `<p>` | Yes (`Text`) | Yes (`Text`) | Yes | Yes |
| **Line Break** | `<br />` | Yes (`\n`) | Yes (`\n`) | Yes (Shift+Enter) | Yes |
| **Heading 1-3** | `<h1>`, `<h2>`, `<h3>` | Yes (`fontWeight: 700`, margin spacing) | Yes (`Helvetica-Bold`, margin spacing) | Yes (Dropdown) | Yes |
| **Heading 4-6** | `<h4>`, `<h5>`, `<h6>` | Clamped to H3 by normalizer | Clamped to H3 by normalizer | No (Restricted to H1-H3) | Yes (In `parseRichText`) |
| **Bullet List** | `<ul><li>` | Yes (Bullet `•` + row view) | Yes (Bullet `•` + row view) | Yes | Yes |
| **Ordered List** | `<ol><li>` | Yes (Index `1.` + row view) | Yes (Index `1.` + row view) | Yes | Yes |
| **Bold** | `<strong>`, `<b>` | Yes (`fontWeight: 700`) | Yes (`Helvetica-Bold`) | Yes | Yes |
| **Italic** | `<em>`, `<i>` | Yes (`fontStyle: 'italic'`) | Yes (`fontStyle: 'italic'`) | Yes | Yes |
| **Underline** | `<u>` | Yes (`textDecoration: 'underline'`) | Yes (`textDecoration: 'underline'`) | Yes | Yes |
| **Strikethrough** | `<s>`, `<del>`, `<strike>` | **NO** (Ignored, renders plain text) | **NO** (Ignored, renders plain text) | **RECOMMENDED: EXCLUDE** | Optional |
| **Tables** | `<table>` | **NO** (Stripped by parser) | **NO** (Stripped by parser) | **NO** (Do not include) | No |
| **Embeds / Media** | `<iframe>`, `<img>` | **NO** (Stripped by parser) | **NO** (Stripped by parser) | **NO** (Do not include) | No |

### Critical PDF Findings
- **Strikethrough Risk:** The user prompt proposed Strikethrough for `editorcn`. However, neither PDF engine supports `textDecoration: 'line-through'`. If a user strikes through text in invoice notes, the PDF will display it as plain text without any line through it.
  *Recommendation:* Omit Strikethrough from the toolbar in `src/components/ui/editor.tsx` to maintain WYSIWYG parity with generated PDFs.
- **Heading Restraint:** Restricting the editor toolbar to H1, H2, and H3 aligns with both `commercialRichText.ts` and `normalizeRichTextHtml()`. `parseRichText()` in `richText.ts` must retain parsing logic for legacy H4-H6 tags.

---

## 7. Phase 5: Letter Conversion Audit

### Current Workflow in `src/components/correspondence/LetterBodyEditor.tsx`
1. **Initial Load:** `LetterFormPage` passes `fields.bodyText` (plain string) to `LetterBodyEditor`.
2. **Text to HTML:** `textToHtml(value)` wraps lines into paragraphs:
   ```ts
   text.split('\n').map((l) => (l ? `<p>${l}</p>` : '<p><br></p>')).join('')
   ```
3. **Editor Editing:** User types and formats text in `RichTextEditor`.
4. **HTML to Text on Update:** When the editor updates, `LetterBodyEditor` immediately strips all tags:
   ```ts
   function htmlToText(html: string): string {
     const el = document.createElement('div')
     el.innerHTML = html
     return el.textContent || el.innerText || ''
   }
   ```
5. **Persistence:** `useLetterSave.ts` runs `bodyBlocksFromText()`, which splits by `\n` into `{ type: 'paragraph', text: line }`.

### Data-Loss Analysis
- **Current Behavior:** Any rich text styling (bold, italic, lists) created in `LetterBodyEditor` is discarded upon keystroke. The user only gets plain text paragraphs.
- **Impact of Migrating to `editorcn`:** Replacing the underlying editor with `editorcn` will not break letter persistence, but it will continue to discard formatting unless `LetterBodyEditor.tsx` is upgraded with a TipTap-to-JSON serializer.
- **Migration Recommendation:** During editorcn migration, maintain the existing `htmlToText` / `textToHtml` bridge to avoid modifying letter domain persistence rules.

---

## 8. Phase 6: TipTap and Package Dependency Audit

### Installed TipTap Packages in `package.json`
```json
{
  "@tiptap/extension-strike": "^3.20.1",
  "@tiptap/extension-underline": "^3.20.1",
  "@tiptap/pm": "^3.20.1",
  "@tiptap/react": "^3.20.1",
  "@tiptap/starter-kit": "^3.20.1"
}
```

### Actual Resolved Versions in `bun.lock`
All TipTap packages resolve to **v3.26.0**.

### Dependency Relationship Analysis
- `@tiptap/starter-kit@3.26.0` directly includes:
  - `@tiptap/core`
  - `@tiptap/extension-bold`
  - `@tiptap/extension-italic`
  - `@tiptap/extension-underline`
  - `@tiptap/extension-strike`
  - `@tiptap/extension-heading`
  - `@tiptap/extension-bullet-list`
  - `@tiptap/extension-ordered-list`
  - `@tiptap/extension-paragraph`
  - `@tiptap/extension-history`
  - `@tiptap/extension-dropcursor`
  - `@tiptap/extension-gapcursor`
  - `@tiptap/pm`
- **Redundant Direct Dependencies:**
  - `@tiptap/extension-strike` is already bundled inside `@tiptap/starter-kit`.
  - `@tiptap/extension-underline` is already bundled inside `@tiptap/starter-kit`.
- **Missing Direct Dependencies for `editorcn`:**
  - `@tiptap/extension-placeholder`: Currently missing. The legacy editor used a manual DOM overlay. For `editorcn`, installing `@tiptap/extension-placeholder` is recommended, or an empty CSS selector pattern (`.is-editor-empty::before`) must be used.

### Target Dependency Set for Migration
```bash
# Minimal required set:
@tiptap/react
@tiptap/starter-kit
@tiptap/pm
@tiptap/extension-placeholder (to be added during migration)
```

---

## 9. Phase 7: Final Nuke Inventory

| File / Package | Status | Action During Migration | Action After Migration Complete |
| :--- | :--- | :--- | :--- |
| `src/components/RichTextEditor.tsx` | Obsolete Component | Adapter or direct replacement | **NUKE / DELETE** |
| `src/components/ui/editor.tsx` | New Target | Implement shadcn-native TipTap editor | **RETAIN** as single shared editor |
| `src/components/document/FormNotesTerms.tsx` | Active Consumer | Point lazy import to `src/components/ui/editor.tsx` | **RETAIN** (Preserve lazy loading) |
| `src/components/waybill/WaybillForm.tsx` | Active Consumer | Point lazy import to `src/components/ui/editor.tsx` | **RETAIN** (Preserve lazy loading) |
| `src/components/correspondence/LetterBodyEditor.tsx` | Active Consumer | Point import to `src/components/ui/editor.tsx` | **RETAIN** (Preserve contract) |
| `src/pages/LetterFormPage.tsx` | Active Consumer | Verify form behavior | **RETAIN** |
| `src/components/pdf/core/richText.ts` | Shared Contract | Ensure output format matches parser | **RETAIN** (Do not touch) |
| `src/components/pdf/core/pdfRichText.ts` | PDF Renderer | Retain React-PDF compilation | **RETAIN** (Do not touch) |
| `src/components/pdf/forme/formeRichText.tsx` | PDF Renderer | Retain Forme compilation | **RETAIN** (Do not touch) |
| `src/lib/commercialRichText.ts` | Import Contract | Retain structured block contract | **RETAIN** (Do not touch) |
| `src/lib/richText.tsx` | Sanitizer / Viewer | Retain DOMPurify rendering | **RETAIN** (Do not touch) |
| `@tiptap/extension-strike` in `package.json` | Redundant Package | Retain until verified | **NUKE / REMOVE** via Bun |
| `@tiptap/extension-underline` in `package.json` | Redundant Package | Retain until verified | **NUKE / REMOVE** via Bun |

---

## 10. Migration Risks & Mitigations

| Risk | Severity | Description | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Cursor Position Jump on Keystroke** | High | In controlled React TipTap components, calling `setContent()` on every parent state update causes the cursor to jump to the end of the text. | In `editor.tsx`, synchronize external `value` only when `!editor.isFocused` and `editor.getHTML() !== normalizedValue`. |
| **PDF Visual Mismatch (Strikethrough)** | Medium | User applies strikethrough in editor, but invoice PDF renders normal text. | Omit Strikethrough from the toolbar in `src/components/ui/editor.tsx`. |
| **Bundle Bloat / Initial Load Degradation** | High | Invoices, quotes, and waybills are high-traffic routes. Loading TipTap eagerly degrades page load. | Preserve `lazy(() => import('@/components/ui/editor'))` with `Suspense` fallback in `FormNotesTerms` and `WaybillForm`. |
| **Mobile Keyboard Overlap** | Medium | Tall, multi-row toolbars push the active input field below the mobile keyboard on Android/Capacitor. | Use a compact, single-row toolbar with a unified Heading dropdown and Radix Popovers. |
| **Double Normalization Mutation** | Low | Saving an invoice re-normalizes notes, potentially changing whitespace or entities. | Verify against `useInvoiceSave.ts` snapshot check (`invoice.notes !== initialInvoiceSnapshot?.notes`). |

---

## 11. Missing Test Coverage

1. **Editor Component Unit Tests:** There are currently **no automated tests** for `RichTextEditor.tsx`, `FormNotesTerms.tsx`, or `WaybillForm.tsx`.
2. **Letter HTML-to-Text Pipeline Tests:** `LetterBodyEditor.tsx` has no automated tests verifying that multiline letters preserve linebreaks across save and reload.
3. **Existing Safeguard Test:** `src/tests/pdf/richTextPipeline.test.js` is active and provides robust coverage for `normalizeRichTextHtml()`, entity handling, and tag stripping.

*Pre-Migration Test Recommendation:* Add a test in `src/tests/pdf/richTextPipeline.test.js` verifying that the exact HTML structure produced by the new `editorcn` configuration passes all normalization assertions without loss.

---

## 12. Recommended Linear Implementation Sequence

1. **Prerequisite Dependency Addition:**
   Install `@tiptap/extension-placeholder` using Bun:
   ```bash
   bun add @tiptap/extension-placeholder
   ```
2. **Implement `src/components/ui/editor.tsx`:**
   Build the shadcn-native TipTap editor:
   - Use Tailwind utility classes matching `bg-bd-surface`, `border-bd-border`, `text-bd-text`.
   - Implement compact toolbar: Style Dropdown (Paragraph, H1, H2, H3), Marks (Bold, Italic, Underline), Lists (Bullet, Numbered), Actions (Clear Formatting).
   - Use Radix `DropdownMenu` and `Tooltip`.
   - Apply `normalizeRichTextHtml` on emit.
3. **Consumer Integration (Phase 1 — Invoices & Quotations):**
   Update `src/components/document/FormNotesTerms.tsx` to lazy-load `src/components/ui/editor.tsx`. Test interactive editing and verify PDF generation.
4. **Consumer Integration (Phase 2 — Waybill):**
   Update `src/components/waybill/WaybillForm.tsx` to lazy-load `src/components/ui/editor.tsx`.
5. **Consumer Integration (Phase 3 — Letters):**
   Update `src/components/correspondence/LetterBodyEditor.tsx` to import `src/components/ui/editor.tsx`.
6. **Verification Gate:**
   - Verify all invoice and quotation notes/terms render cleanly on web cards and PDFs.
   - Run `bun run audit:load`.
   - Run critical tests via `bun run test`.
7. **Legacy Deletion & Cleanup (The Nuke):**
   - Delete `src/components/RichTextEditor.tsx`.
   - Remove redundant `@tiptap/extension-underline` and `@tiptap/extension-strike` from `package.json` using Bun.
   - Run `git status` to verify clean state.

---

## 13. Explicit Zero-Code-Change Verification

### Pre-Audit Git Status
Prior to this audit, the working tree had existing uncommitted modifications from unrelated tasks (SEO PRD, template previews, app update gate, etc.). No changes existed for rich text editor files.

### Post-Audit Verification Checklist
- [x] Zero application source files were altered in `src/`.
- [x] `package.json` was not modified.
- [x] `bun.lock` was not modified.
- [x] No dependencies were installed or deleted.
- [x] No build, typecheck, lint, or test commands were executed (respecting the 4GB host RAM limit).
- [x] Exactly one report was created: `docs/reports/RICH_TEXT_EDITORCN_PRE_MIGRATION_AUDIT_2026_11_08.md`.

---
*End of Report.*
