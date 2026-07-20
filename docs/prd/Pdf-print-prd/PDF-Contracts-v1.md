# PDF Contracts v1

Status: Approved Design Contract
Version: 1.0

---

# Purpose

This document defines the stable interfaces that every PDF implementation
must follow during and after the migration.

This is a contract document.

Implementations may change.

Contracts may not.

---

# Core Principles

The PDF subsystem is divided into four layers.

Document Layer
↓

Generation Layer
↓

Delivery Layer
↓

Feedback Layer

Each layer has exactly one responsibility.

---

# Layer Responsibilities

## Document Layer

Responsible for:

- collecting document data
- building preview models
- selecting templates
- document-specific calculations

Must NEVER:

- save files
- download files
- open files
- share files
- emit native feedback
- detect platform

---

## Generation Layer

Responsible for:

- font registration
- rendering React PDF
- producing Blob
- producing metadata

Output:

PdfAsset

Must NEVER:

- save
- download
- open
- share
- emit UI

---

## Delivery Layer

Responsible for:

- browser download
- native filesystem
- open document
- share document
- print
- future email

Input:

PdfAsset

Output:

DeliveryResult

Must NEVER:

- know Invoice
- know CSR
- know Waybill
- know Quotation

It operates only on PdfAsset.

---

## Feedback Layer

Responsible for:

- loading
- success
- warning
- failure
- informational feedback

Must NEVER:

- create files
- save files
- render PDFs

---

# Canonical Types

## PdfAsset

Represents a generated PDF.

Required fields:

- blob
- filename
- mimeType
- sizeBytes
- documentType
- metadata

Blob ownership belongs to PdfAsset.

The Blob must never be regenerated downstream.

---

## PdfGenerationRequest

Contains everything needed to generate.

Includes:

- template
- preview model
- filename
- document type
- generation options

No platform information.

---

## DeliveryRequest

Contains:

- PdfAsset
- strategy

Strategies:

- download
- save
- open
- save-open
- share
- print

---

## DeliveryResult

Contains:

- success
- uri
- path
- platform
- method
- error

---

# Allowed Dependencies

Document
    ↓
Generation
    ↓
Delivery
    ↓
Feedback

Never upwards.

Never sideways.

Examples

Invoice
↓

PdfGenerator

↓

PdfDelivery

Correct.

PdfDelivery

↓

Invoice

Forbidden.

---

# Platform Rules

Generation must be platform-agnostic.

Delivery owns platform detection.

Only Delivery may call:

- Capacitor
- Filesystem
- FileOpener
- Share

No other layer may.

---

# Blob Rules

Blob is generated exactly once.

Forbidden:

Blob
↓

Blob

↓

Blob

↓

Blob

No duplicate rendering.

No second toBlob().

No second PDF render.

---

# Template Rules

Templates remain presentation only.

Templates may not:

- save
- download
- share
- import Capacitor
- emit feedback

---

# Preview Model Rules

Preview builders remain unchanged.

Migration must never rewrite:

- invoice calculations
- quotation calculations
- CSR calculations
- waybill calculations

Only orchestration changes.

---

# Error Rules

Generation errors

↓

Delivery never runs.

Delivery errors

↓

Generation result preserved.

Feedback errors

↓

Never affect generation or delivery.

---

# Extension Rules

New document types require only:

1. Preview builder

2. Template

3. PdfGenerationRequest

No delivery changes.

No feedback changes.

---

# Acceptance Criteria

After migration:

✓ One generation pipeline

✓ One delivery pipeline

✓ One feedback pipeline

✓ One Blob generation

✓ One platform abstraction

✓ Zero duplicated download logic

✓ Zero document-specific delivery code

✓ Existing templates preserved

✓ Existing calculations preserved

✓ Existing preview models preserved

✓ Future document types plug into the same contracts

without modifying infrastructure.