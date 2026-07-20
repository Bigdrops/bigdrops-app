# Signatory Management System

## Status

Draft — not yet implemented.

## Problem

The receipt PDF currently accepts a single `signatoryName` / `signatoryRole` / `signatorySignatureUrl` tuple from the receipt row. There is no way to:

- Configure multiple signatories (e.g., prepared by + approved by)
- Select a default signatory per document type
- Share signatories across document modules (invoice, quotation, receipt, CSR)
- Override signatory per document instance

## Proposed Enhancement

### 1. Shared Signatory Resolver

A cross-module signatory resolver at `src/domain/signatory/` that stores signatory profiles (name, role, signature image URL). All document PDFs look up signatories through this resolver instead of reading fields directly from their row.

### 2. Default Signatory Selection

Each organization can set default signatories per document type (receipt → "Finance Manager", invoice → "Managing Director"). The resolver returns the default when no override exists.

### 3. Multiple Signatories per Document

PDF templates support rendering multiple signature blocks side by side or stacked (e.g., "Prepared By" + "Authorized By").

### 4. Document-Specific Override (Future Phase)

Allow overriding the signatory on a per-document basis from the UI (e.g., a dropdown on the document view page).

## Migration Strategy

1. Create `src/domain/signatory/` module with types, resolver, and default config.
2. Add a `signatories` database table or use Supabase auth users with a signatory flag.
3. Migrate all PDF components to use the resolver (receipt first, then invoice, quotation, CSR).
4. Backfill existing receipt signatory data by reading the current single signatory fields.
5. Remove old `signatory_name` / `signatory_role` / `signatory_signature_url` columns from document tables after migration (or keep as legacy fallback).

## Acceptance Criteria

- [ ] Signatory profiles can be created, edited, and deleted from settings UI.
- [ ] Each document type can have a default signatory assigned.
- [ ] Receipt PDF renders the correct signatory from the resolver.
- [ ] Invoice PDF renders the correct signatory from the resolver.
- [ ] Multiple signatories render correctly on the PDF (side by side).
- [ ] Document-specific override works from the view page.
- [ ] All existing receipt PDFs still render with their current signatory data after migration.
- [ ] No breaking changes to existing PDF generation.
- [ ] `bun run typecheck` passes.
- [ ] `bun run audit:load` passes.

## Files Likely Affected

- New: `src/domain/signatory/types.ts`
- New: `src/domain/signatory/resolver.ts`
- New: `src/domain/signatory/defaults.ts`
- New: database migration for signatories table
- Modified: `src/components/pdf-new/ReceiptPdf.tsx` (use resolver)
- Modified: other PDF components (invoice, quotation, CSR templates)
- Modified: settings UI pages for signatory config
