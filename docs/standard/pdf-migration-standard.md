# PDF Migration Standard

## Purpose

This standard defines the shared architecture rules for PDF generation and
PDF migration work.

It is renderer-neutral. It does not require all document families to use one
PDF engine.

A document family selects its renderer through its authoritative product
contract, PRD, or domain standard. That selection is document-specific.

Current approved examples:

- CPS uses Forme/pdfcn.
- Invoice and Quotation keep their existing approved renderer behavior until
  their own authoritative contracts change.

This standard does not migrate Invoice, Quotation, CPS, or any other document
family by itself.

## Renderer Selection Authority

Each document family must have one approved renderer authority.

The authority can be:

- a PRD;
- an active shared standard;
- a domain architecture document;
- a migration report that the project lead accepted as authoritative.

The shared PDF standard controls the architecture around the renderer. It does
not override a document family's approved renderer.

Different document families may use different rendering engines at the same
time. This is valid when each family follows this standard.

Examples of valid coexistence:

- Invoice can use the existing React-PDF pipeline.
- Quotation can use the existing React-PDF pipeline.
- CPS can use the approved Forme/pdfcn pipeline.

## Required Pipeline Shape

Each PDF pipeline must keep these boundaries:

```text
Canonical document or domain model
  -> prepared PDF data
  -> document-specific template
  -> approved renderer adapter
  -> PDF bytes or Blob
  -> approved delivery authority
  -> feedback, diagnostics, and audit where applicable
```

The names of the implementation modules can differ by document family. The
boundaries must remain.

Shared delivery modules such as `CompositePdfDelivery`, `WebPdfDelivery`,
`NativePdfDelivery`, and feedback bus implementations can be reused where they
fit the approved renderer. A document family may use a different approved
delivery adapter only when its contract documents that decision.

## Renderer Boundary Rules

PDF templates and renderer adapters must receive prepared data.

They must not:

- query Supabase;
- mutate database state;
- allocate document numbers;
- own lifecycle decisions;
- calculate prices, VAT, discounts, totals, profit, or margin;
- infer missing business data;
- repair invalid domain structure;
- perform document conversion.

Business values must come from the approved domain or calculation authority.

For financial documents, renderer code must not duplicate financial formulas.

## Prepared Data Rules

Prepared PDF data must be explicit.

It must contain all fields that the template needs to render the PDF. The
template must not fetch data to complete the document.

Prepared data must preserve:

- document identity;
- source document values;
- row order;
- group or section structure where the document supports it;
- canonical financial values;
- approved presentation preferences;
- safe diagnostics context where generation can fail.

Prepared data must not hide a business rule inside renderer-specific objects.

## Customization Boundary

PDF customization is presentation only.

Customization may change approved visual properties such as:

- template choice;
- font;
- accent color;
- orientation;
- image visibility;
- footer visibility;
- document-specific layout options.

Customization must not change:

- quantities;
- prices;
- totals;
- VAT;
- discounts;
- WHT;
- profit;
- margin;
- conversion mapping;
- persistence semantics;
- document numbering.

## Document Type Registry

When a shared registry exists, it must include each PDF-generating document
family that uses it.

A registry entry must identify the document family. It must not imply that all
families use the same renderer.

The registry must not force renderer-specific imports into unrelated document
domains.

## Migration Principles

A PDF migration must preserve the approved behavior of the document family.

The migration must preserve:

- public page APIs and navigation;
- filenames;
- download behavior;
- preview behavior;
- native delivery behavior where supported;
- diagnostics and feedback behavior;
- canonical business calculations;
- row and group semantics;
- approved template behavior unless the task explicitly changes it.

Renderer replacement is allowed only for the document family in scope. It must
not migrate other document families by side effect.

## Allowed Changes

A renderer migration may:

- add or replace a renderer adapter for the document family in scope;
- add a prepared PDF model;
- route download orchestration through an approved authority;
- add diagnostics at safe pipeline boundaries;
- add parity tests;
- update the document family's PDF contract;
- remove legacy renderer code for that document family after replacement is
  complete.

## Forbidden Changes

A renderer migration must not:

- change business calculations;
- move calculation logic into a renderer;
- query Supabase from a PDF template;
- change database schema unless the migration task explicitly requires it;
- change document numbering;
- change conversion behavior;
- rewrite unrelated document families;
- hide generation errors behind generic diagnostics only;
- weaken row, group, or financial correctness rules;
- change user-facing output outside the approved scope.

## Parity And Verification

Every PDF migration must verify the document family in scope.

The verification plan must include relevant checks for:

- prepared data completeness;
- calculation parity;
- document identity and filename;
- row order;
- group or section rendering;
- page size and orientation;
- pagination;
- headers and footers;
- optional images;
- customization boundaries;
- browser delivery;
- native delivery where applicable;
- diagnostic capture for generation failures.

For renderer changes, build success is not runtime proof. Browser/runtime
verification must match the renderer and deployment environment in scope.

## Completion Criteria

A document family is fully migrated when:

- the approved renderer authority is documented;
- prepared data is the renderer input;
- renderer code owns no business math and no Supabase query;
- the approved delivery path works;
- diagnostics preserve the real failure boundary;
- parity checks pass for the migrated family;
- unrelated document families are unchanged;
- the task report records the renderer, scope, verification, and limitations.
