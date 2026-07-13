# docs/PRD/Pdf-print-prd/PDF-Migration-Standard-v1.md

# PDF Migration Standard

## Purpose

This document defines the mandatory migration procedure for every remaining PDF document family after the successful Invoice/Quotation reference implementation.

The objective is to ensure every migration is predictable, low-risk, and behavior-preserving.

---

# Migration Principles

Every migration MUST:

- Preserve existing public APIs.
- Preserve rendering output.
- Preserve filenames.
- Preserve download behavior.
- Preserve preview behavior.
- Preserve business calculations.
- Preserve template structure.
- Preserve print layout.

Only orchestration may change.

---

# Migration Pattern

Legacy Flow

Document

↓

react-pdf

↓

Blob

↓

download helper

↓

Native/Web

New Flow

Document

↓

DefaultPdfGenerator

↓

PdfAsset

↓

CompositePdfDelivery

↓

Platform Delivery

Feedback is emitted through FeedbackBus.

---

# Allowed Changes

✔ Replace orchestration.

✔ Remove duplicated orchestration.

✔ Inject PdfGenerator.

✔ Inject PdfDelivery.

✔ Inject FeedbackBus.

✔ Use dependency injection.

---

# Forbidden Changes

✘ Template redesign

✘ Business logic

✘ Calculations

✘ Preview models

✘ Render styling

✘ PDF filenames

✘ Native storage behavior

✘ Download UX

✘ Database logic

---

# Verification Checklist

Every migration must verify:

□ Web download

□ Native save

□ Native share

□ Preview

□ Filename

□ Print layout

□ Calculations

□ Typecheck passes

---

# Completion Criteria

A document family is considered migrated only when:

- legacy orchestration removed
- new infrastructure used
- output unchanged
- callers unchanged
- remaining document families unaffected