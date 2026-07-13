# PDF Architecture v1
**Status:** Proposed Architecture
**Version:** 1.0
**Owner:** BIGDROPS Platform
**Last Updated:** 2026-07-13

---

# 1. Purpose

This document defines the canonical architecture for PDF generation and delivery across the BIGDROPS platform.

It replaces organically-grown PDF workflows with a unified architecture while preserving every existing document renderer and business model.

This document is intentionally architecture-focused.

It does **not** specify implementation details.

---

# 2. Goals

The architecture must provide:

- One PDF generation contract.
- One PDF delivery contract.
- One Blob creation pipeline.
- One native file handling pipeline.
- One web download pipeline.
- One feedback pipeline.
- Zero duplicated delivery logic.
- Zero duplicated Blob generation logic.
- Platform-independent document generation.
- Backward compatibility throughout migration.

---

# 3. Non Goals

This project is NOT intended to:

- Rewrite document templates.
- Rewrite preview model builders.
- Change document layouts.
- Change financial calculations.
- Change rendering libraries.
- Replace React PDF.
- Replace existing business logic.

Only orchestration changes.

---

# 4. Current Problems

The current architecture evolved over time.

As a result:

- Invoice uses one pipeline.
- Quotation uses another.
- CSR uses another.
- Waybill uses another.
- Receipt uses another.
- BOQ/RFQ use another.
- Blank Waybill has its own implementation.

This causes:

- duplicated Blob generation
- duplicated downloads
- duplicated native save logic
- inconsistent Android behaviour
- inconsistent user feedback
- inconsistent future extensibility

---

# 5. Design Principles

## Principle 1

Business logic must never know how PDFs are delivered.

---

## Principle 2

Delivery must never know how PDFs were generated.

---

## Principle 3

Templates remain completely independent.

---

## Principle 4

Documents own their own data.

---

## Principle 5

Infrastructure owns delivery.

---

## Principle 6

Blob generation occurs exactly once.

Nowhere else in the repository should call

pdf(...).toBlob()

outside the infrastructure layer.

---

# 6. High-Level Architecture

```
View Page

↓

Domain Actions

↓

Preview Model Builder

↓

PDF Generator

↓

PdfAsset

↓

PDF Delivery

↓

Platform
```

---

# 7. System Responsibilities

## View Pages

Responsible for:

- user interaction
- loading state
- confirmation dialogs

Never responsible for:

- Blob generation
- filesystem
- downloads
- sharing
- Android intents

---

## Domain Layer

Responsible for:

- document assembly
- financial calculations
- formatting
- preview models
- renderer selection

Never responsible for:

- downloads
- Android APIs
- filesystem
- share sheets

---

## PDF Generator

Responsible for:

- font registration
- renderer selection
- Blob creation
- PDF metadata
- filename creation

Never responsible for:

- downloads
- Android
- Web APIs

Output:

PdfAsset

---

## PDF Delivery

Responsible for:

- web download
- native save
- native open
- share
- print
- email
- filesystem
- feedback events

Never responsible for:

- rendering
- templates
- business logic

---

# 8. Canonical Object

Every document must eventually produce:

```ts
PdfAsset
```

The asset represents a finished PDF.

It does not know anything about invoices, quotations or CSR.

Conceptually it contains:

- filename
- Blob
- metadata
- size
- mime type

Nothing platform specific.

---

# 9. PDF Generator

The generator is the only infrastructure allowed to create PDF blobs.

Responsibilities:

- register fonts
- build renderer
- create Blob
- create PdfAsset

The generator never downloads.

The generator never saves files.

The generator never opens Android intents.

---

# 10. PDF Delivery

Delivery accepts only PdfAsset.

It owns every platform difference.

Supported delivery modes include:

- download
- save
- open
- share
- preview
- print
- email

Platform handling belongs exclusively here.

---

# 11. Feedback

Feedback is delivery infrastructure.

Generation does not emit UI events.

Delivery emits events such as:

- download started
- save completed
- file opened
- share opened
- error

This ensures consistent UX.

---

# 12. Current State Mapping

Current:

Invoice

↓

pdf-new

↓

downloadBlob()

Future:

Invoice

↓

PdfGenerator

↓

PdfDelivery

---

Current:

CSR

↓

downloadPdfFromElement()

↓

exportPdfToDevice()

Future:

CSR

↓

PdfGenerator

↓

PdfDelivery

---

Current:

Waybill

↓

downloadPdfFromElement()

Future:

Waybill

↓

PdfGenerator

↓

PdfDelivery

---

Current:

Receipt

↓

downloadPdfFromElement()

Future:

Receipt

↓

PdfGenerator

↓

PdfDelivery

---

All document types ultimately converge into identical infrastructure.

---

# 13. Repository Rules

The following should eventually exist only once:

- Blob generation
- Web download
- Native save
- Native open
- Native share
- Print
- Email
- Feedback emission

No duplicate implementations.

---

# 14. Migration Strategy

Migration must preserve behaviour.

No big-bang rewrite.

Recommended phases:

Phase 1

Create infrastructure.

No behavioural changes.

---

Phase 2

Move Invoice.

---

Phase 3

Move Quotation.

---

Phase 4

Move Receipt.

---

Phase 5

Move CSR.

---

Phase 6

Move Waybill.

---

Phase 7

Move BOQ.

---

Phase 8

Move RFQ.

---

Phase 9

Move Project Documents.

---

Phase 10

Remove legacy orchestration.

---

# 15. Deprecation Policy

Old APIs become wrappers first.

Nothing breaks.

Once every caller has migrated:

- wrappers removed
- duplicate logic removed
- dead code deleted

---

# 16. Future Extensions

The architecture intentionally supports future additions including:

- watermarking
- digital signatures
- password protection
- cloud export
- OneDrive
- Google Drive
- Dropbox
- email attachment
- audit logging
- PDF versioning
- background generation
- batch generation
- queue processing
- offline export

without changing document templates.

---

# 17. Acceptance Criteria

Architecture is considered complete when:

✓ Every document generates through one generator.

✓ Every document delivers through one delivery pipeline.

✓ Blob generation exists in one location.

✓ Native save exists in one location.

✓ Native open exists in one location.

✓ Share exists in one location.

✓ Print exists in one location.

✓ Feedback exists in one location.

✓ Platform-specific code exists only inside delivery.

✓ Domain code contains zero filesystem logic.

✓ View pages contain zero download logic.

✓ New document types require only:

- preview model
- renderer

Everything else is inherited automatically.

---

# 18. Long-Term Vision

The PDF subsystem should behave like a platform service rather than a collection of document-specific implementations.

Document modules become responsible only for describing what a document is.

Infrastructure becomes responsible for deciding how that document is generated, delivered, opened, shared, printed and exported.

This separation minimizes duplication, simplifies maintenance, and ensures every document automatically benefits from future platform capabilities without additional implementation work.