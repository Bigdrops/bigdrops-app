# Lifecycle Ownership Standard

> **Status:** Prescriptive
>
> This standard defines the canonical ownership boundaries for the lifecycle of all business documents in BIGDROPS.
>
> It defines **where responsibilities belong**, not **how they are implemented**.
>
> This standard complements:
>
> - `docs/standard/document-transformation-standard.md` (business behaviour)
> - `docs/standard/prefix-engine-settings-standard.md`
> - Other document standards
>
> It applies to:
>
> - Invoice
> - Quotation
> - Waybill
> - CSR
> - RFQ
> - BOQ
> - Future document modules

---

# 1. Purpose

Every lifecycle stage must have **one clear owner**.

A lifecycle stage may collaborate with other layers, but it must have a single canonical owner responsible for its execution.

This standard exists to prevent:

- duplicated orchestration
- mixed responsibilities
- business logic leaking into UI
- inconsistent document architectures

---

# 2. Architectural Principles

## 2.1 Single Ownership

Every lifecycle stage MUST have exactly one canonical owner.

Ownership MUST be explicit.

Shared ownership is only permitted where explicitly defined by this standard.

---

## 2.2 Business Rules Remain in the Domain

Business rules MUST NOT live inside:

- Pages
- Forms
- Components
- React hooks

Business rules belong to the Domain layer.

---

## 2.3 UI Owns Presentation

Rendering components are responsible only for presentation.

Rendering components MUST NOT own:

- persistence
- business rules
- audit
- conversion
- revert
- document numbering

---

## 2.4 Pages Coordinate

Pages coordinate workflows.

Pages orchestrate lifecycle execution.

Pages MUST NOT become repositories of business logic.

---

## 2.5 State Owns Editing

Editable document state belongs to the form state owner.

The state owner is responsible for:

- mutable document state
- field updates
- item updates
- group updates
- derived UI state
- local editing behaviour

The state owner MUST NOT:

- access databases
- perform persistence
- execute audit events
- perform routing
- own business rules

---

# 3. Canonical Lifecycle Ownership

| Lifecycle Stage | Canonical Owner |
|-----------------|-----------------|
| Init | Page |
| Load | Page |
| Hydrate | Domain |
| Edit | Form State |
| Compute | Domain |
| Validate | Domain |
| Persist | Page + Service |
| Export | Action |
| Convert | Domain + Service |
| Revert | Domain + Service |

---

# 4. Lifecycle Stage Definitions

## 4.1 Init

Responsible for:

- determining lifecycle mode
- initialization
- default values
- prefill coordination
- document numbering requests

Canonical owner:

**Page**

---

## 4.2 Load

Responsible for:

- loading persisted data
- coordinating asynchronous resources
- loading reference data

Canonical owner:

**Page**

---

## 4.3 Hydrate

Responsible for transforming persistence models into editable form state.

Examples:

- normalization
- adapters
- mapping
- defaults

Canonical owner:

**Domain**

---

## 4.4 Edit

Responsible for mutable document state.

Includes:

- items
- groups
- attachments
- custom fields
- document fields
- layout state
- derived UI state

Canonical owner:

**Form State**

---

## 4.5 Compute

Responsible for business calculations.

Examples:

- totals
- VAT
- discounts
- subtotals
- financial calculations

Canonical owner:

**Domain**

Financial calculations MUST remain centralized.

---

## 4.6 Validate

Responsible for enforcing business invariants.

Examples:

- identity rules
- document constraints
- lifecycle constraints
- business validation

Canonical owner:

**Domain**

UI validation may improve user experience but MUST NOT replace domain validation.

---

## 4.7 Persist

Responsible for:

- insert
- update
- delete
- retries
- transactions
- orchestration

Canonical owner:

**Page + Service**

Persistence coordinates external systems.

It does not own business rules.

---

## 4.8 Export

Responsible for:

- PDF
- CSV
- sharing
- printing

Canonical owner:

**Action**

Export prepares output.

It MUST NOT compute business values.

---

## 4.9 Convert

Responsible for changing document type.

Examples:

- quotation → invoice

Canonical owner:

**Domain + Service**

The Domain defines transformation rules.

The Service coordinates persistence.

---

## 4.10 Revert

Responsible for invoice correction workflows.

Examples:

- invoice → quotation

Canonical owner:

**Domain + Service**

Business behaviour MUST follow:

`docs/standard/document-transformation-standard.md`

---

# 5. Layer Responsibilities

## Page

Responsible for:

- orchestration
- lifecycle coordination
- routing
- navigation
- persistence coordination
- loading coordination

Must NOT own:

- calculations
- validation rules
- document transformations

---

## Form State

Responsible for:

- editable state
- handlers
- mutations
- derived UI state

Must NOT own:

- routing
- persistence
- audit
- Supabase
- business rules

---

## Domain

Responsible for:

- business rules
- calculations
- normalization
- validation
- transformations
- lifecycle invariants

Must remain the authoritative source of business behaviour.

---

## Service

Responsible for:

- persistence
- external APIs
- transactions
- storage

Services implement persistence.

They do not define business policy.

---

## Actions

Responsible for executable workflows.

Examples:

- export
- print
- share

Actions coordinate operations.

They do not own business rules.

---

## Rendering Components

Responsible only for presentation.

Rendering components MUST remain stateless wherever practical.

They MUST NOT perform:

- persistence
- business calculations
- audit
- conversion
- revert
- lifecycle orchestration

---

# 6. Ownership Anti-Patterns

The following are prohibited:

- Business rules inside UI components
- Financial calculations inside pages
- Persistence inside rendering components
- Duplicate lifecycle orchestration
- Multiple owners for the same lifecycle stage
- Domain logic inside presentation components

---

# 7. Relationship to the Document Transformation Standard

The Lifecycle Ownership Standard defines:

> **Where responsibilities belong.**

The Document Transformation Standard defines:

> **How documents must behave.**

Both standards are mandatory.

Neither replaces the other.

---

# 8. Compliance

Every document module MUST conform to this standard.

Architectural changes MUST preserve the ownership boundaries defined here unless this standard is explicitly updated.

New document modules MUST adopt these ownership boundaries unless a documented exception is approved.

---

# 9. Final Principle

Business behaviour and architectural ownership are separate concerns.

The **Document Transformation Standard** defines the rules users experience.

The **Lifecycle Ownership Standard** defines where those rules are implemented.

A well-structured document module has one clear owner for every lifecycle stage, one authoritative source for every business rule, and one predictable execution path for every lifecycle operation.
# Standards Hierarchy

This standard governs architectural ownership only.

Business behaviour is governed by:

docs/standard/document-transformation-standard.md

If an ownership decision conflicts with the Document Transformation Standard, the Document Transformation Standard SHALL take precedence.

Refactoring may relocate code.

It MUST NOT change business behaviour.