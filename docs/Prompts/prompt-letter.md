--

PRD — Official Letter & Correspondence Architecture Investigation

Status

Investigation & Architecture Design (No Immediate Feature Implementation)


---

1. Objective

Investigate the feasibility of introducing a new Correspondence Document Family into BIGDROPS.

The investigation must determine how Official Letters can integrate into the existing document ecosystem while maintaining strict conformity with existing platform standards and minimizing architectural duplication.

This phase prioritizes architectural correctness over implementation.


---

2. Background

BIGDROPS currently provides a mature financial document architecture consisting of:

Invoice

Quotation

Waybill

CSR

BOQ

RFQ


These document families conform to established platform standards including:

Prefix Engine

Save Orchestration

Lifecycle Ownership

Audit Trail

Document Columns

PDF Customization Extension

Document Transformation Standard


Official Letter introduces a fundamentally different document category.

Unlike financial documents, correspondence has no pricing engine, VAT, payment lifecycle, or financial transformation semantics.

The objective is therefore integration, not duplication.


---

3. Existing Standards Review (Mandatory)

Before proposing any implementation, review and document how Official Letter interacts with:

AGENTS.md

Prefix Engine Settings Standard

Document Save Orchestration

Lifecycle Ownership Standard

Audit Trail Standard

PDF Customization Extension Standard

Document Column Standard

Document Transformation Standard


For each standard, explicitly classify:

Fully Applicable

Partially Applicable

Not Applicable


Every classification must include justification.


---

4. Upstream Library Investigation

The investigation MUST evaluate existing libraries before introducing custom architecture.

React Email

Repository:

https://github.com/resend/react-email

Determine:

Can React Email become the canonical HTML renderer?

Can existing branding assets be reused?

Can templates share design tokens with existing PDFs?

What constraints does React Email impose?

What functionality already exists upstream that BIGDROPS must not duplicate?



---

pdfx

Repository:

https://github.com/akii09/pdfx

Determine:

Whether pdfx should replace, extend, or remain independent of the existing PDF pipeline.

Compatibility with current renderer separation.

Migration cost.

Benefits over the current implementation.


If migration is not justified, explicitly recommend retaining the current architecture.


---

5. Architectural Questions

The investigation must answer the following.

A

Should Official Letter become:

a new document module


OR

the first implementation of a broader Correspondence architecture?



---

B

Can React Email become another rendering target alongside PDF?

Instead of

Letter

↓

PDF

Can BIGDROPS evolve toward

Document

↓

Renderer

├── PDF

├── HTML Email

├── Plain Text

├── Print

without violating existing ownership boundaries?


---

C

Can the existing PDF Customization Extension Standard evolve into a more general Document Rendering Extension Standard?

Document the advantages and risks.


---

6. Standards Conformance Matrix

Produce a matrix similar to:

Standard	Status	Notes

Prefix Engine	Applicable	Letter receives canonical numbering through resolvePrefix()
Save Orchestration	Applicable	Reuse unchanged
Lifecycle Ownership	Applicable	Reuse unchanged
Audit Trail	Applicable	Extend with correspondence events if required
PDF Extension	Partial	Investigate renderer abstraction
Transformation Laws	Not Applicable	Financial-only standard


Every decision must cite the corresponding standard.


---

7. Prefix Engine

Determine whether Official Letter should participate in the existing prefix engine.

Requirements:

register through DEFAULT_PREFIXES

resolve via resolvePrefix()

participate in document numbering settings

never hardcode document prefixes


The investigation should recommend an appropriate prefix but MUST preserve the canonical numbering architecture.


---

8. Audit Trail

Determine whether additional audit events are required.

Examples:

SENT

DELIVERY_FAILED

OPENED (future)

REPLIED (future)


If existing events are sufficient, justify why.


---

9. Transformation Analysis

Official Letter SHALL be evaluated against the Document Transformation Standard.

The investigation must explicitly determine whether:

Edit Law applies

Duplicate Law applies

Revert Law applies


If any law is excluded, document the business reasoning and architectural implications.

No assumptions are permitted.


---

10. Deliverables

Produce:

1. Architecture Investigation Report


2. Standards Conformance Matrix


3. React Email Evaluation


4. pdfx Evaluation


5. Rendering Architecture Recommendation


6. Correspondence Architecture Proposal


7. Risk Assessment


8. Migration Strategy (if applicable)




---

11. Explicit Non-Goals

This phase MUST NOT:

Implement Official Letter

Introduce new database schema

Create React components

Modify rendering code

Introduce new standards

Replace existing PDF architecture


Implementation decisions are deferred until the investigation establishes the correct architectural direction.


---

Why I structured it this way

This PRD matches the philosophy in your AGENTS.md:

Audit first before implementation.

Reuse upstream libraries before building custom solutions.

Conform to existing standards rather than creating parallel architectures.

Minimize architectural risk by treating React Email as a renderer candidate, not as the foundation of a new subsystem.


