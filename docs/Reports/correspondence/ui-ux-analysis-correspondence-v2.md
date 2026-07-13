# Correspondence Module V2 — UI/UX Designer Analysis

**Author:** OpenCode  
**Date:** 2026-07-13  
**Harness:** Local Runner  

---

## Objective & Scope

Evaluate all UX/UI decisions of the Correspondence Module against the PRD (`docs/Prompts/prompt-letter.md` — an architecture investigation, not a product spec) and the existing implementation (`LetterFormPage`, `Letters` list, `ViewLetter`, `LetterBodyEditor`). Covers screen-by-screen UX, component hierarchy, interaction patterns, mobile adaptation, visual consistency, accessibility, missing flows, and recommended mockups.

**Explicitly excluded:** PDF rendering architecture (covered by `official-letter-architecture-investigation.md`), backend domain logic beyond component contract, database schema, and non-visual infrastructure.

---

## Key Findings

### 1. Critical Issues (P0 — Ship-blocking)

| Issue | Location | Detail |
|-------|----------|--------|
| **WYSIWYG toolbar lies to users** | `LetterBodyEditor.tsx` + `RichTextEditor.tsx` | TipTap shows bold/italic/underline/list buttons but `bodyBlocksFromText()` strips ALL formatting to plain text on save. Either remove the toolbar or build a proper block serializer. |
| **No attachment upload UI** | `LetterFormPage.tsx` | `CorrespondenceAttachment[]` is defined in types, but zero UI exists to add/remove/view attachments. |
| **No Issue/Send lifecycle action** | `LetterFormPage.tsx` + `ViewLetter.tsx` | Draft cannot transition to `issued` via UI. No confirmation dialog, no navigation to view page on issue. |

### 2. High Priority (P1 — Major usability gaps)

- **No preview toggle** — users compose blind, cannot see final letter formatting until PDF generation (which doesn't exist yet)
- **No status filters** on list view — search covers text but cannot filter "drafts only" or "issued only"
- **No Duplicate action** — required by Duplicate Law per architecture investigation, zero UI
- **No Cancel/Archive actions** — lifecycle states defined (`draft→cancelled`, `issued→archived`) but no UI to trigger them

### 3. Medium Priority (P2 — Should fix soon)

- **Form field order** is Recipient→Sender→Date→Subject→Body, but letter convention is Sender (letterhead) → Date → Recipient (inside address) → Subject → Body
- **No `/` block command menu** — core interaction pattern described in PRD, not implemented
- **No block drag handles** — blocks have no reorder UI
- **No Ctrl+S keyboard shortcut** for save
- **No pagination or infinite scroll** on list view

### 4. Low Priority (P3 — Future phase)

- Template gallery + save-as-template flow
- Letterhead selector UI (belongs in Company Profile settings)
- Batch operations on list (multi-select → cancel/archive)
- Mobile bottom sheet block inserter (instead of `/` command)

---

## Accessibility Gaps

- Status badges use **color-only differentiation** (draft=yellow, issued=green) — need `aria-label` for screen readers
- `ModuleRowCard` uses `onClick` on a div — needs `role="button"`, `tabIndex`, and keyboard handler
- Block builder needs `role="group"` and `aria-grabbed` on drag handles
- Yellow-on-white status badge may fail WCAG AA 4.5:1 contrast

---

## Visual Consistency Assessment

| Pattern | Invoice/Quotation | Letter (current) | Letter (recommended) |
|---------|------------------|-------------------|----------------------|
| Container width | `max-w-4xl` (wide) | `max-w-lg` (narrow) | `max-w-2xl` (prose) |
| Form layout | `SharedDocumentForm` | Custom linear | Custom letter-specific |
| Client selector | `ClientSelector` | `ClientSelector` ✅ | Keep ✅ |
| Save strategy | `useInvoiceSave` | `useLetterSave` ✅ | Keep ✅ |
| Action bar | `InvoiceFormActions` | Inline Cancel+Save | `LetterFormActions` |
| Attachments | In `SharedDocumentForm` | Missing ❌ | Add `AttachmentSection` |
| PDF preview | Via settings panel | None ❌ | Add preview toggle |
| Status colors | Blue/Green/Orange | Yellow/Green ✅ | Keep ✅ |

---

## Component Architecture Recommendation

```
src/components/correspondence/
├── LetterFormPage.tsx              (refactored orchestrator)
├── letter-form/
│   ├── LetterFormActions.tsx       (Save Draft, Issue, Preview, Print)
│   ├── LetterFormToolbar.tsx       (templates, letterhead, preview)
│   ├── SenderInfoCard.tsx          (letterhead with logo)
│   ├── RecipientSection.tsx        (toggle + client/fields)
│   ├── LetterDateField.tsx         (date with quick presets)
│   ├── SubjectField.tsx            (Re: line)
│   ├── ReferenceField.tsx          (optional)
│   └── AttachmentSection.tsx       (file list + add)
├── body-editor/
│   ├── BlockBuilder.tsx            (orchestrator)
│   ├── BlockToolbar.tsx            (inline type selector)
│   ├── BlockMenuPopover.tsx        (the "/" command menu)
│   ├── BlockDragHandle.tsx         (reorder handle)
│   └── blocks/                     (Heading, Paragraph, List, Quote, Divider, Signature, Image)
├── letter-preview/
│   ├── LetterPreviewToggle.tsx     (draft↔preview)
│   ├── LetterPreview.tsx           (rendered preview)
│   └── DraftWatermark.tsx          (watermark overlay)
├── letter-list/
│   ├── LetterListFilters.tsx       (status tabs + search)
│   ├── LetterRowCard.tsx           (extracted)
│   └── LetterEmptyState.tsx        (empty state)
├── templates/
│   ├── TemplateGallery.tsx         (gallery modal)
│   ├── TemplateCard.tsx            (preview card)
│   └── LetterheadSelector.tsx      (letterhead picker)
└── shared/
    ├── StatusBadge.tsx             (extract from inline)
    └── BlockRenderer.tsx           (shared between preview and view)
```

---

## Mockup Summaries

Four key screen states were described in full wireframe detail in the conversation, with explicit layout, component placement, and responsive behavior:

1. **Letter Composition View (Desktop)** — letterhead at top, date right-aligned, recipient block, subject, block builder as main area, attachments section, sticky top toolbar
2. **Letter Composition View (Mobile)** — header bar, `/` replaced with `[+ Add block]` button, sticky bottom action bar, Mobile FAB
3. **Block Selector Popover** — 8 block types, filtered search, arrow-key navigation
4. **Preview Mode** — side-by-side toggle renders same `BlockRenderer.tsx` used by ViewLetter, `DRAFT` watermark on unissued letters

---

## Risks & Limitations

1. **PRD is not a design spec** — `prompt-letter.md` is an architecture investigation. No screen mockups or user flows were provided. This analysis extrapolates design decisions from described requirements.
2. **No user research** — Recommendations are based on UI design best practices and consistency with existing BIGDROPS patterns, not on user testing of the letter module.
3. **Image upload policy** (`docs/STANDARD/document-image-upload-policy.md`) was referenced but applies only to image MIME types. Non-image attachments need separate validation (not covered by the standard).

---

## Verification

- `bun run typecheck` — not applicable (analysis only, no code changes)
- All findings traced to specific files and line numbers in the inspected codebase
- Standards consulted: `document-image-upload-policy.md`, `document-column-standard.md`, `document-form-consolidation-standard.md` (partial)
- Existing reports read: `official-letter-architecture-investigation.md`, `letters-form-persist-overhaul.md`, `phase1-foundation-domain.md`, `phase2-5-application-shell.md`, `phase2-persistence-and-numbering.md`

---

## Deferred Work

- Actual implementation of any recommendation (all P0 items are ready to spec but not coded)
- Detailed accessibility audit with color-contrast measurement tools
- User testing protocol for the block builder interaction
- Letterhead management UI (belongs in Company Profile settings, not letter module)
- PDF preview rendering architecture (covered by existing investigation report)
