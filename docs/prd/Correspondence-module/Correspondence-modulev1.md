# Product Requirements Document (PRD)
# BIGDROPS Official Letter & Correspondence Module
Version: 1.0
Status: Proposed
Date: 2026-07-10

---

# 1. Objective

Introduce a new **Official Letter** document family into BIGDROPS that enables businesses to create, manage, render, print and eventually send professional business correspondence while preserving BIGDROPS architectural standards.

This module is **not** a financial document.

It is a business correspondence document.

The implementation must integrate naturally with the existing BIGDROPS architecture without introducing duplicate rendering systems or violating established standards.

---

# 2. Goals

The module must allow users to:

- Create official business letters
- Save drafts
- Edit drafts
- Lock identity after save
- Duplicate letters
- Preview letters
- Print letters
- Export PDF
- Export HTML
- Export Plain Text
- Send later via email
- Archive correspondence
- Audit every lifecycle event

---

# 3. Non Goals (Phase 1)

Phase 1 MUST NOT include:

- Email delivery
- Email tracking
- Open tracking
- Read receipts
- Threading
- Inbox
- Replies
- Digital signatures
- DOCX export
- AI generation
- AI rewriting
- Collaboration

These belong to future phases.

---

# 4. Existing Standards

This module MUST conform to the following standards.

## Required

- AGENTS.md
- Prefix Engine Standard
- Save Orchestration Standard
- Lifecycle Ownership Standard
- Audit Trail Standard
- Document Transformation Standard
- Document Image Upload Policy

## Not Applicable

- Financial Calculations
- VAT Engine
- Document Columns
- JSON Import

---

# 5. New Document Family

New family:

Letter

Default Prefix:

LTR

Example:

```
LTR-000001
LTR-000002
LTR-000003
```

Letter numbering MUST use the existing Prefix Engine.

Hardcoded prefixes are forbidden.

---

# 6. Letter Lifecycle

Unlike financial documents, letters have a correspondence lifecycle.

States:

```
Draft

Approved

Sent (Future)

Archived

Cancelled
```

Future versions may add:

- Delivered
- Failed
- Recalled

---

# 7. Identity Rules

The existing Document Transformation Standard remains authoritative.

Letters MUST follow the Edit Law.

After save, the following become immutable:

- Letter Number
- Recipient
- Document Type

Changing identity requires duplication.

The Duplicate Law remains unchanged.

Revert does not apply.

---

# 8. Letter Structure

A Letter consists of:

```
Identity

Recipient

Sender

Subject

Reference Number

Date

Body

Attachments

Metadata

Status
```

There are no:

- Items
- Prices
- VAT
- Totals
- Discounts
- Payment status

---

# 9. Body Architecture

The body MUST NOT be stored as HTML.

The body MUST NOT be stored as PDF.

The body MUST NOT be stored as React Email JSX.

Instead the document stores structured content.

Example:

```
Heading

Paragraph

Paragraph

Bullet List

Quote

Divider

Image

Signature
```

Renderers transform these blocks into their respective output formats.

---

# 10. Renderer Architecture

Letters are renderer-agnostic.

The Letter Domain never knows whether output becomes PDF, HTML or plain text.

Architecture:

```
Letter Domain

↓

Renderer

↓

Output
```

Supported renderers:

```
PDF

React Email HTML

Plain Text

Print
```

Future renderers:

```
DOCX

Markdown

SMS

WhatsApp

Teams

Slack
```

---

# 11. React Email

React Email is adopted as the HTML renderer.

React Email is NOT the document model.

React Email is NOT the storage format.

React Email receives shaped data from the Letter Domain and renders HTML.

The domain never imports React Email.

---

# 12. PDF

Letters receive their own lightweight PDF renderer.

The existing Invoice/Quotation PDF engine MUST NOT be modified.

The existing Waybill renderer MUST NOT be modified.

Letter PDF remains isolated.

---

# 13. Delivery Layer

Rendering and delivery are separate concerns.

```
Letter

↓

Renderer

↓

Delivery
```

Future delivery providers:

- Resend
- SMTP
- Share API
- Download
- Browser Print

Delivery never owns rendering.

---

# 14. Form Design

The Letter Form should resemble professional correspondence rather than financial documents.

Sections:

## Header

- Letter Number
- Status
- Date
- Reference

## Recipient

- Existing Client
or
- Manual Recipient

Fields

- Company
- Contact Person
- Address
- Email

## Subject

Single-line text field

## Body

Rich block editor

Supported blocks:

- Heading
- Paragraph
- List
- Quote
- Divider
- Signature
- Image

## Attachments

Business documents only.

Shared upload policy applies.

---

# 15. View Page

The View Page mirrors financial documents.

Actions:

- Edit
- Duplicate
- Print
- Export PDF
- Export HTML
- Export Plain Text
- Archive

Future:

- Send Email

---

# 16. Templates

Templates are content presets.

Examples:

- Business Letter
- Offer Letter
- Employment Letter
- Warning Letter
- Internal Memo
- Appreciation Letter
- Invitation
- Notice
- Reference Letter

Templates populate content.

Templates never alter rendering.

---

# 17. AI Integration (Future)

AI is an assistant.

Never the author.

Workflow:

```
User writes

↓

Offline LLM

↓

Suggestions

↓

Diff Preview

↓

Accept

↓

Save
```

AI may assist with:

- Grammar
- Punctuation
- Tone
- Formality
- Readability

AI never modifies documents automatically.

Offline models such as Gemma are preferred for privacy.

---

# 18. Audit Trail

Required events:

- CREATE
- UPDATE
- DUPLICATE
- STATUS_CHANGE
- ARCHIVE

Future:

- SENT
- DELIVERY_FAILED
- OPENED

Audit Trail remains the single source of truth.

---

# 19. Prefix Engine

Letter MUST register with the existing Prefix Engine.

```
letter

↓

LTR
```

No independent numbering logic may exist.

---

# 20. Save Orchestration

Letters use the shared Save Orchestration architecture.

Responsibilities:

- Validation
- Payload generation
- Persistence
- Navigation
- Error handling

No custom save pipeline should be introduced.

---

# 21. Architecture

```
Letter Domain
│
├── Identity
├── Recipient
├── Sender
├── Subject
├── Body Blocks
├── Attachments
├── Lifecycle
├── Prefix Engine
├── Audit Trail
└── Save Strategy

                │

                ▼

        Rendering Layer

      ├── PDF
      ├── React Email
      ├── Plain Text
      └── Print

                │

                ▼

         Delivery Layer

      ├── Resend
      ├── SMTP
      ├── Browser Print
      ├── Download
      └── Share API
```

---

# 22. Acceptance Criteria

The implementation is complete when:

- Letter numbering uses the Prefix Engine.
- Save Orchestration is reused.
- Audit Trail records all lifecycle events.
- Identity follows the Edit Law.
- Duplicate follows the Duplicate Law.
- Revert is unavailable.
- React Email renders HTML.
- PDF rendering is isolated.
- Renderers remain independent of the domain.
- Delivery remains independent of rendering.
- Existing financial document modules remain completely unaffected.

---

# 23. Long-Term Vision

Official Letter becomes the first member of a future Correspondence ecosystem.

Potential future modules include:

- Internal Memo
- Circular
- Notice
- Meeting Minutes
- Employment Contracts
- HR Letters
- Purchase Cover Letters
- Legal Notices
- Customer Notifications

All future correspondence modules should reuse the same Letter Domain architecture while remaining renderer-agnostic and standards-compliant.