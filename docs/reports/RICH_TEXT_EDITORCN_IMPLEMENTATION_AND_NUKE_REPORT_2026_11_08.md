# RichText to EditorCN Migration and Legacy Nuke Report

This report was written by Antigravity on 2026-11-08 via Local Runner.

---

## 1. Objective

Replace the legacy TipTap rich-text editor architecture with a unified, shadcn-native editor following the `editorcn` paradigm (`src/components/ui/editor.tsx`). Migrate all active consumers (Invoices, Quotations, Waybills, and Correspondence), preserve existing commercial HTML and PDF rendering contracts, add focused regression testing, and completely delete ("NUKE") the obsolete legacy component and redundant dependencies.

---

## 2. Scope

- **New Primary Implementation:** `src/components/ui/editor.tsx`
- **Legacy Component Nuked:** `src/components/RichTextEditor.tsx` (Deleted)
- **Consumers Migrated:**
  - `src/components/document/FormNotesTerms.tsx` (Invoice and Quotation notes/terms)
  - `src/components/waybill/WaybillForm.tsx` (Waybill notes/terms)
  - `src/components/correspondence/LetterBodyEditor.tsx` (Correspondence letters)
- **Commercial & PDF Contracts Preserved:**
  - `src/components/pdf/core/richText.ts`
  - `src/components/pdf/core/pdfRichText.ts`
  - `src/components/pdf/forme/formeRichText.tsx`
  - `src/lib/commercialRichText.ts`
  - `src/lib/richText.tsx`
  - `src/domain/invoice/projections/contentProjection.ts`
- **Test Infrastructure Extended:**
  - `src/tests/pdf/richTextPipeline.test.js`
- **Package & Lockfile Configuration:**
  - `package.json`
  - `bun.lock`

---

## 3. Skills Used

- `shadcn`
- `react-dev`
- `typescript-advanced-types`
- `pdf-rendering-correctness`
- `tailwind-css-patterns`

---

## 4. Documentation Standard

This report conforms to ASD-STE100 Simplified Technical English and the project reporting standard specified in `.claude/agent-instructions/documentation.md`.

---

## 5. Changes Made

### A. Primary Component Implementation (`src/components/ui/editor.tsx`)
Created a unified, theme-aware rich text editor based on TipTap v3 and shadcn design primitives:
- **Extensions:** `StarterKit.configure()` with heading levels restricted to 1, 2, and 3; strikethrough, code, blockquote, and horizontal rules disabled. Integrates `@tiptap/extension-placeholder` for native non-overlay placeholder text.
- **Compact Toolbar:**
  - Radix `DropdownMenu` for text styles: Paragraph, Heading 1, Heading 2, Heading 3. Dynamically reflects active block type.
  - Radix `Tooltip` on all buttons to show keyboard shortcuts and tool names.
  - Marks: Bold (`Bold`), Italic (`Italic`), Underline (`UnderlineIcon`).
  - Lists: Bullet List (`List`), Numbered List (`ListOrdered`).
  - Actions: Clear Formatting (`Eraser`), Undo (`Undo`), Redo (`Redo`).
  - Focus retention: All toolbar buttons use `onMouseDown={(e) => { e.preventDefault(); ... }}` to prevent stealing focus from the ProseMirror selection.
- **Canvas & Typography:**
  - Styled with Tailwind utilities matching Bourxe design tokens: `bg-white dark:bg-zinc-950`, `border-zinc-200 dark:border-zinc-800`, `min-h-[140px]`.
  - Proportional heading sizes (`h1: text-2xl`, `h2: text-xl`, `h3: text-lg`).
  - Embedded TipTap placeholder styling via CSS selector `[&_.is-editor-empty:first-child::before]` without DOM overlay hacks.
- **Value Synchronization & Contract:**
  - Controlled input/output: `value?: string | null`, `onChange: (html: string) => void`.
  - Emits normalized HTML via `normalizeRichTextHtml(editor.getHTML())`.
  - Prevents cursor jumps by only updating content when `!editor.isFocused` and incoming normalized HTML differs from current content.

### B. Consumer Migration
1. **Invoice & Quotation (`src/components/document/FormNotesTerms.tsx`):**
   - Replaced `lazy(() => import('@/components/RichTextEditor'))` with `lazy(() => import('@/components/ui/editor'))`.
   - Preserved `Suspense` fallback with `EditorLoadingState`.
   - Retained exact field callbacks for `invoice.notes` and `invoice.terms`.
2. **Waybill (`src/components/waybill/WaybillForm.tsx`):**
   - Replaced lazy import to target `@/components/ui/editor`.
   - Preserved dynamic `Suspense` fallbacks for `waybill.notes` and `terms`.
3. **Correspondence (`src/components/correspondence/LetterBodyEditor.tsx`):**
   - Switched import to `@/components/ui/editor`.
   - Preserved `textToHtml()` line wrapping and `htmlToText()` tag stripping to maintain the plain-text persistence contract of `LetterBody`.

### C. The Nuke (Legacy Cleanup)
1. Deleted `src/components/RichTextEditor.tsx`.
2. Verified zero remaining references to `RichTextEditor` in `src/`.
3. Removed redundant direct dependencies via Bun:
   - `@tiptap/extension-strike`
   - `@tiptap/extension-underline`
   *(Both extensions are already bundled and managed directly by `@tiptap/starter-kit@3.26.0`)*.
4. Added required dependency via Bun:
   - `@tiptap/extension-placeholder@^3.33.0`.
5. Updated `bun.lock` consistently.

---

## 6. Verification Results

### A. Test Execution
Executed the rich-text test suite using the Node/Bun test runner:
```bash
node --experimental-loader ./src/tests/resolve-alias.js --test src/tests/pdf/richTextPipeline.test.js
```
**Results:**
- `✔ neutral rich-text pipeline preserves only the supported formatting and strips unsafe markup`
- `✔ Industry adapter keeps notes and terms on the shared rich-text pipeline instead of flattening them early`
- `✔ Commercial template routes notes and terms through the shared rich-text PDF renderer`
- `✔ neutral rich-text pipeline preserves plain-text newlines and multi-line paragraphs`
- `✔ neutral rich-text pipeline preserves mathematical comparisons and special symbols without dropping content`
- `✔ F-05: rich-text pipeline preserves already-escaped entities without double-escaping and remains idempotent`
- `✔ F-14: literal HTML-like tag names in plain text are preserved and do not cause word loss or runaway formatting`
- `✔ rich-text security boundary: malformed tags, XSS payloads, and script/style contents`
- `✔ editorcn generated markup (H1-H3, bold, italic, underline, lists, linebreaks) normalizes cleanly` (New)
- `✔ editorcn unsupported markup exclusion: strikethrough, tables, and raw containers are stripped cleanly` (New)
- `✔ Letter multiline conversion preserves lines and paragraph boundaries cleanly` (New)

**Summary:** 11 passed, 0 failed, duration 290ms.

### B. TypeScript Compilation (`bun run typecheck`)
- `src/components/ui/editor.tsx`: Zero type errors.
- `src/components/document/FormNotesTerms.tsx`: Zero type errors.
- `src/components/waybill/WaybillForm.tsx`: Zero type errors.
- `src/components/correspondence/LetterBodyEditor.tsx`: Zero type errors.
- `src/tests/pdf/richTextPipeline.test.js`: Zero type errors.
- *Pre-existing failure documented:* Unrelated syntax errors exist in uncommitted file `src/components/pdf/forme/IndustrialFormeDocument.tsx` (lines 672, 678). No errors introduced by rich-text changes.

### C. Git Diff Scope
- `package.json`: Updated TipTap dependencies (+`@tiptap/extension-placeholder`, -`@tiptap/extension-strike`, -`@tiptap/extension-underline`).
- `bun.lock`: Updated to reflect package changes.
- `src/components/ui/editor.tsx`: New component.
- `src/components/RichTextEditor.tsx`: Deleted.
- `src/components/document/FormNotesTerms.tsx`: Rewired to `@/components/ui/editor`.
- `src/components/waybill/WaybillForm.tsx`: Rewired to `@/components/ui/editor`.
- `src/components/correspondence/LetterBodyEditor.tsx`: Rewired to `@/components/ui/editor`.
- `src/tests/pdf/richTextPipeline.test.js`: +3 test cases.

---

## 7. Supabase Push Status

**N/A** — No SQL schemas, database migrations, or Supabase queries were modified.

---

## 8. Risks and Limitations

1. **Strikethrough Exclusion:** Strikethrough was deliberately omitted from the editor toolbar because neither Forme PDF nor React-PDF supports strikethrough rendering. Any legacy content containing `<s>` tags will have the tags stripped by `normalizeRichTextHtml()` while preserving the underlying text.
2. **Letter Rich Text:** `LetterBodyEditor` continues to strip HTML formatting on save. If formatted correspondence is required in the future, a domain-level TipTap-to-JSON serializer must be implemented.

---

## 9. Deferred Work

- Upgrading the `LetterBody` domain model to persist inline formatting marks (bold, italic, lists) for official letters.
- Adding strikethrough support to the Forme PDF and React-PDF compilation engines if business requirements demand strikethrough text in commercial PDFs.
